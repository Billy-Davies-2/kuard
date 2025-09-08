package app

import (
	"net/http"
	"strings"

	"github.com/kubernetes-up-and-running/kuard/pkg/route"
)

// route represents a registered route.
type srvRoute struct {
	method  string
	pattern string // e.g. /foo/bar/*filepath or /foo/:id
	handler http.Handler
}

// SimpleRouter provides a tiny subset of httprouter features using net/http only.
// Supported:
//   - GET/POST/PUT routes
//   - Wildcard suffix *name (captures remainder in URL Path without leading slash)
//   - No parameter extraction for :name segments yet (not currently needed by existing handlers)
//   - Trailing slash normalization left to caller
type SimpleRouter struct {
	routes []srvRoute
}

func NewSimpleRouter() *SimpleRouter { return &SimpleRouter{routes: []srvRoute{}} }

func (sr *SimpleRouter) handle(method, pattern string, h http.Handler) {
	sr.routes = append(sr.routes, srvRoute{method: method, pattern: pattern, handler: h})
}

// Convenience methods.
var _ route.Router = (*SimpleRouter)(nil)

func (sr *SimpleRouter) GET(pattern string, h http.Handler)  { sr.handle(http.MethodGet, pattern, h) }
func (sr *SimpleRouter) POST(pattern string, h http.Handler) { sr.handle(http.MethodPost, pattern, h) }
func (sr *SimpleRouter) PUT(pattern string, h http.Handler)  { sr.handle(http.MethodPut, pattern, h) }
func (sr *SimpleRouter) DELETE(pattern string, h http.Handler) {
	sr.handle(http.MethodDelete, pattern, h)
}

// ServeHTTP implements http.Handler.
func (sr *SimpleRouter) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Path
	method := r.Method
	for _, rt := range sr.routes {
		if rt.method != method {
			continue
		}
		if matchPattern(rt.pattern, path) {
			// Inject wildcard capture as request context if needed later.
			rt.handler.ServeHTTP(w, r)
			return
		}
	}
	http.NotFound(w, r)
}

// matchPattern matches a very small subset of patterns with optional final wildcard.
func matchPattern(pattern, path string) bool {
	if pattern == path {
		return true
	}
	// Wildcard support: pattern ending with /*name
	if strings.Contains(pattern, "*") {
		base := pattern
		if i := strings.Index(pattern, "*"); i >= 0 {
			// keep slash before * so /foo/*bar matches /foo/ and deeper
			base = pattern[:i]
		}
		if strings.HasPrefix(path, base) {
			return true
		}
	}
	return false
}
