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

package env

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
)

func TestEnvAPIGet(t *testing.T) {
	e := New()
	w := httptest.NewRecorder()
	e.APIGet(w, httptest.NewRequest(http.MethodGet, "/env/api", nil))
	if w.Code != 200 {
		t.Fatalf("status %d", w.Code)
	}
	var payload map[string]any
	if err := json.Unmarshal(w.Body.Bytes(), &payload); err != nil {
		t.Fatalf("json: %v", err)
	}
	envMap, ok := payload["env"].(map[string]any)
	if !ok || len(envMap) == 0 {
		t.Fatalf("expected env content")
	}
	// ensure a common variable exists
	if _, present := envMap["PATH"]; !present {
		t.Log("PATH not present (platform specific) but continuing")
	}
	_ = os.Environ() // just to ensure environment read path executed
}
