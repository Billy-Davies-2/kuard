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
package sitedata

import (
	"fmt"
	"io/fs"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/kubernetes-up-and-running/kuard/pkg/route"
)

var debug bool
var debugRootDir string

func SetConfig(d bool, drd string) {
	debug = d
	debugRootDir = drd
}

// We place this file in pkg/sitedata so we cannot use .. in patterns (forbidden).
// Create a mirror directory under this package at build time? Instead embed from root using go:embed in root-level package? Simpler: we traverse real disk when debug, and for embedded we duplicate minimal assets via go:embed by referencing relative path from module root using an internal package.

func GetStaticHandler(prefix string) http.Handler {
	prefix = strings.TrimPrefix(prefix, "/")
	baseDir := "sitedata" // relative to working directory
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		seg := filepath.Base(prefix) // built or static
		dir := filepath.Join(baseDir, seg)
		if debug {
			dir = filepath.Join(debugRootDir, prefix)
		}
		http.StripPrefix("/"+prefix+"/", http.FileServer(http.Dir(dir))).ServeHTTP(w, r)
	})
}

func AddRoutes(r route.Router, prefix string) {
	r.GET(prefix+"/*filepath", GetStaticHandler(prefix))
}

func LoadFilesInDir(dir string) (map[string]string, error) {
	dirData := map[string]string{}
	if debug {
		fullDir := filepath.Join(debugRootDir, dir)
		files, err := os.ReadDir(fullDir)
		if err != nil {
			return dirData, fmt.Errorf("error reading dir %s: %w", debugRootDir, err)
		}
		for _, file := range files {
			data, err := os.ReadFile(filepath.Join(fullDir, file.Name()))
			if err != nil {
				return dirData, fmt.Errorf("error loading %s: %w", file.Name(), err)
			}
			// convert fs.DirEntry to FileInfo not needed; use Name directly
			if file.Type().IsRegular() || (file.Type() == fs.ModeSymlink) {
				dirData[file.Name()] = string(data)
			}
		}
	} else {
		// Production: read from disk (sitedata/templates)
		templDir := filepath.Join("sitedata", dir)
		entries, err := os.ReadDir(templDir)
		if err != nil {
			return dirData, fmt.Errorf("could not read templates dir: %w", err)
		}
		for _, e := range entries {
			if e.IsDir() {
				continue
			}
			b, err := os.ReadFile(filepath.Join(templDir, e.Name()))
			if err != nil {
				return dirData, fmt.Errorf("error loading template %s: %w", e.Name(), err)
			}
			dirData[e.Name()] = string(b)
		}
	}
	return dirData, nil
}
