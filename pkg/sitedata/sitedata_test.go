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
	"io/fs"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
)

func TestLoadFilesInDirDebug(t *testing.T) {
	tmp := t.TempDir()
	// create a fake templates dir
	sub := filepath.Join(tmp, "templates")
	if err := os.MkdirAll(sub, 0o755); err != nil {
		t.Fatalf("mkdir: %v", err)
	}
	if err := os.WriteFile(filepath.Join(sub, "index.html"), []byte("<html></html>"), 0o644); err != nil {
		t.Fatalf("write: %v", err)
	}
	SetConfig(true, tmp)
	files, err := LoadFilesInDir("templates")
	if err != nil {
		t.Fatalf("LoadFilesInDir: %v", err)
	}
	if len(files) != 1 || files["index.html"] == "" {
		t.Fatalf("expected index.html content")
	}
}

func TestStaticHandlerServes(t *testing.T) {
	// discover module root (walk up until go.mod)
	root, err := os.Getwd()
	if err != nil {
		t.Fatalf("pwd: %v", err)
	}
	for i := 0; i < 6; i++ { // safety limit
		if _, err := os.Stat(filepath.Join(root, "go.mod")); err == nil {
			break
		}
		parent := filepath.Dir(root)
		if parent == root {
			break
		}
		root = parent
	}
	if _, err := os.Stat(filepath.Join(root, "go.mod")); err != nil {
		t.Fatalf("could not locate module root from test: %v", err)
	}
	SetConfig(true, root) // debug mode uses debugRootDir directly
	h := GetStaticHandler("sitedata/static")
	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/sitedata/static/css/styles.css", nil)
	h.ServeHTTP(rr, req)
	if rr.Code != 200 {
		t.Fatalf("expected 200 got %d", rr.Code)
	}
}

func TestLoadFilesInDirProdMissing(t *testing.T) {
	SetConfig(false, "")
	_, err := LoadFilesInDir("no-such-dir")
	if err == nil {
		t.Fatalf("expected error for missing dir")
	}
	if !os.IsNotExist(err) && !hasPathError(err) {
		t.Logf("non not-exist error: %v", err)
	}
}

func hasPathError(err error) bool {
	_, ok := err.(*fs.PathError)
	return ok
}
