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

package main

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/spf13/pflag"
	"github.com/spf13/viper"

	"github.com/kubernetes-up-and-running/kuard/pkg/app"
	"github.com/kubernetes-up-and-running/kuard/pkg/version"
)

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	application := app.NewApp()
	v := viper.GetViper()
	application.BindConfig(v, pflag.CommandLine)
	pflag.Parse()

	slog.Info("starting kuard", "version", version.VERSION)
	slog.Warn("this server may expose sensitive and secret information; be careful")

	dumpConfig(v)
	application.LoadConfig(v)

	server := application.BuildServer()
	go func() {
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("http server error", "error", err)
		}
	}()
	slog.Info("serving http", "addr", server.Addr)

	<-ctx.Done()
	slog.Info("shutdown signal received")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := server.Shutdown(shutdownCtx); err != nil {
		slog.Error("graceful shutdown failed", "error", err)
		_ = server.Close()
	}
	slog.Info("server exited")
	os.Exit(0)
}

func dumpConfig(v *viper.Viper) {
	b, err := json.MarshalIndent(v.AllSettings(), "", "  ")
	if err != nil {
		slog.Error("could not dump config", "error", err)
		return
	}
	slog.Info("config dump", "config", string(b))
}
