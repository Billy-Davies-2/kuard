/*
Copyright 2017 The KUAR Authors

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

	http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
package app

import (
	"encoding/json"
	"log/slog"
	"net"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/kubernetes-up-and-running/kuard/pkg/debugprobe"
	"github.com/kubernetes-up-and-running/kuard/pkg/dnsapi"
	"github.com/kubernetes-up-and-running/kuard/pkg/env"
	"github.com/kubernetes-up-and-running/kuard/pkg/fsapi"
	"github.com/kubernetes-up-and-running/kuard/pkg/htmlutils"
	"github.com/kubernetes-up-and-running/kuard/pkg/keygen"
	"github.com/kubernetes-up-and-running/kuard/pkg/memory"
	memqserver "github.com/kubernetes-up-and-running/kuard/pkg/memq/server"
	"github.com/kubernetes-up-and-running/kuard/pkg/sitedata"
	"github.com/kubernetes-up-and-running/kuard/pkg/version"

	"github.com/felixge/httpsnoop"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

func init() {
	prometheus.MustRegister(requestDuration)
}

var requestDuration = prometheus.NewHistogramVec(prometheus.HistogramOpts{
	Name:    "request_duration_seconds",
	Help:    "Time serving HTTP request",
	Buckets: prometheus.DefBuckets,
}, []string{"method", "route", "status_code"})

func promMiddleware(h http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		m := httpsnoop.CaptureMetrics(h, w, r)
		requestDuration.WithLabelValues(r.Method, r.URL.Path, strconv.Itoa(m.Code)).Observe(m.Duration.Seconds())
	})
}

func loggingMiddleware(handler http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		slog.Info("request", "remote", r.RemoteAddr, "method", r.Method, "url", r.URL.String())
		handler.ServeHTTP(w, r)
	})
}

type pageContext struct {
	URLBase      string   `json:"urlBase"`
	Hostname     string   `json:"hostname"`
	Addrs        []string `json:"addrs"`
	Version      string   `json:"version"`
	VersionColor string   `json:"versionColor"`
	RequestDump  string   `json:"requestDump"`
	RequestProto string   `json:"requestProto"`
	RequestAddr  string   `json:"requestAddr"`
}

type App struct {
	c Config

	m     *memory.MemoryAPI
	live  *debugprobe.Probe
	ready *debugprobe.Probe
	env   *env.Env
	dns   *dnsapi.DNSAPI
	kg    *keygen.KeyGen
	mq    *memqserver.Server

	r *SimpleRouter
}

// BuildServer builds an *http.Server with middleware applied.
func (k *App) BuildServer() *http.Server {
	handler := promMiddleware(loggingMiddleware(k.r))
	return &http.Server{Addr: k.c.ServeAddr, Handler: handler}
}

func (k *App) getPageContext(r *http.Request, urlBase string) *pageContext {
	c := &pageContext{}
	c.URLBase = urlBase
	c.Hostname, _ = os.Hostname()

	addrs, _ := net.InterfaceAddrs()
	c.Addrs = []string{}
	for _, addr := range addrs {
		// check the address type and if it is not a loopback
		if ipnet, ok := addr.(*net.IPNet); ok && !ipnet.IP.IsLoopback() {
			if ipnet.IP.To4() != nil {
				c.Addrs = append(c.Addrs, ipnet.IP.String())
			}
		}
	}

	c.Version = version.VERSION
	c.VersionColor = htmlutils.ColorFromString(version.VERSION)
	reqDump, _ := httputil.DumpRequest(r, false)
	c.RequestDump = strings.TrimSpace(string(reqDump))
	c.RequestProto = r.Proto
	c.RequestAddr = r.RemoteAddr

	return c
}

// legacy root template removed

// Exists reports whether the named file or directory exists.
func fileExists(name string) bool {
	if _, err := os.Stat(name); err != nil {
		if os.IsNotExist(err) {
			return false
		}
	}
	return true
}

func (k *App) Run() {
	r := promMiddleware(loggingMiddleware(k.r))

	certFile := filepath.Join(k.c.TLSDir, "kuard.crt")
	keyFile := filepath.Join(k.c.TLSDir, "kuard.key")
	if fileExists(certFile) && fileExists(keyFile) {
		go func() {
			slog.Info("serving https", "addr", k.c.TLSAddr)
			if err := http.ListenAndServeTLS(k.c.TLSAddr, certFile, keyFile, r); err != nil {
				slog.Error("https server error", "error", err)
			}
		}()
	} else {
		slog.Warn("tls certs not found; skipping https")
	}

	slog.Info("serving http", "addr", k.c.ServeAddr)
	if err := http.ListenAndServe(k.c.ServeAddr, r); err != nil {
		slog.Error("http server error", "error", err)
	}
}

func NewApp() *App {
	k := &App{r: NewSimpleRouter()}

	// Init all of the subcomponents

	router := k.r
	k.m = memory.New()
	k.live = debugprobe.New()
	k.ready = debugprobe.New()
	k.env = env.New()
	k.dns = dnsapi.New()
	k.kg = keygen.New()
	k.mq = memqserver.NewServer()
	fsa := fsapi.New()

	// Add handlers
	for _, prefix := range []string{"", "/a", "/b", "/c"} {
		if prefix != "" { // variant redirects only for non-root
			pr := prefix
			router.GET(prefix+"/", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				http.Redirect(w, r, "/?variant="+strings.TrimPrefix(pr, "/"), http.StatusTemporaryRedirect)
			}))
			router.GET(prefix+"/-/*path", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				http.Redirect(w, r, "/?variant="+strings.TrimPrefix(pr, "/"), http.StatusTemporaryRedirect)
			}))
		}

		// JSON page info (modern UI uses this)
		router.GET(prefix+"/pageinfo", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ctx := k.getPageContext(r, prefix)
			w.Header().Set("Content-Type", "application/json")
			if err := json.NewEncoder(w).Encode(ctx); err != nil {
				slog.Error("encode pageinfo", "error", err)
				w.WriteHeader(http.StatusInternalServerError)
			}
		}))

		router.GET(prefix+"/metrics", promhttp.Handler())

		// Add the static files
		sitedata.AddRoutes(router, prefix+"/built")
		sitedata.AddRoutes(router, prefix+"/static")

		// Legacy raw file serving remains for direct download.
		router.GET(prefix+"/fs/*filepath", http.StripPrefix(prefix+"/fs", http.FileServer(http.Dir("/"))))
		// JSON metadata API for enhanced UI.
		fsa.AddRoutes(router, prefix+"/fsapi")

		k.m.AddRoutes(router, prefix+"/mem")
		k.live.AddRoutes(router, prefix+"/healthy")
		k.ready.AddRoutes(router, prefix+"/ready")
		k.env.AddRoutes(router, prefix+"/env")
		k.dns.AddRoutes(router, prefix+"/dns")
		k.kg.AddRoutes(router, prefix+"/keygen")
		k.mq.AddRoutes(router, prefix+"/memq/server")
	}

	// Mount Next.js UI at root
	nextDev := os.Getenv("NEXT_DEV")
	if nextDev != "" {
		proxy := httputil.NewSingleHostReverseProxy(&url.URL{Scheme: "http", Host: "localhost:8081"})
		proxyHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { proxy.ServeHTTP(w, r) })
		// Explicit common asset paths
		k.r.GET("/_next/*filepath", proxyHandler)
		k.r.GET("/favicon.ico", proxyHandler)
		k.r.GET("/robots.txt", proxyHandler)
		k.r.GET("/manifest.json", proxyHandler)
		// Catch-all UI (keep last so API routes above win)
		k.r.GET("/", proxyHandler)
		k.r.GET("/*filepath", proxyHandler)
	} else {
		// Production: serve pre-exported static site if available
		if _, err := os.Stat("web/out"); err == nil {
			fs := http.FileServer(http.Dir("web/out"))
			k.r.GET("/", fs)
			k.r.GET("/*filepath", fs)
		} else if _, err := os.Stat("web/.next"); err == nil {
			// Fallback: serve built assets (not full SSR)
			k.r.GET("/_next/*filepath", http.FileServer(http.Dir("web")))
			// Index fallback
			k.r.GET("/", http.FileServer(http.Dir("web")))
			k.r.GET("/*filepath", http.FileServer(http.Dir("web")))
		}
	}

	return k
}
