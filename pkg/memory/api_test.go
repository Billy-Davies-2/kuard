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

package memory

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"
)

func TestMemoryAPIAllocAndClear(t *testing.T) {
	m := New()
	r := httptest.NewRequest(http.MethodPost, "/mem/api/alloc?size=1024", nil)
	w := httptest.NewRecorder()
	m.APIAlloc(w, r)
	if len(m.leaks) != 1 || len(m.leaks[0]) != 1024 {
		t.Fatalf("allocation failed")
	}
	cw := httptest.NewRecorder()
	m.APIClear(cw, httptest.NewRequest(http.MethodPost, "/mem/api/clear", nil))
	if m.leaks != nil {
		t.Fatalf("expected leaks cleared")
	}
}

func TestMemoryAPIGet(t *testing.T) {
	m := New()
	w := httptest.NewRecorder()
	m.APIGet(w, httptest.NewRequest(http.MethodGet, "/mem/api", nil))
	if w.Code != 200 {
		t.Fatalf("expected 200 got %d", w.Code)
	}
	var body map[string]any
	if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
		t.Fatalf("json: %v", err)
	}
	if _, ok := body["memStats"]; !ok {
		t.Fatalf("missing memStats")
	}
}

func FuzzMemoryAlloc(f *testing.F) {
	f.Add("128")
	f.Add("0")
	f.Add("-10")
	f.Fuzz(func(t *testing.T, size string) {
		m := New()
		// Sanitize extremely large or negative values to avoid OOM/panics.
		if v, err := strconv.ParseInt(size, 10, 64); err == nil {
			if v < 0 || v > 1<<20 { // cap at 1MB in fuzz to stay safe
				return
			}
		}
		req := httptest.NewRequest(http.MethodPost, "/mem/api/alloc?size="+size, nil)
		w := httptest.NewRecorder()
		m.APIAlloc(w, req)
	})
}
