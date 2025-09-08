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

package keygen

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestKeygenConfigAndHistory(t *testing.T) {
	kg := New()
	// enable workload with small count
	cfg := Config{Enable: true, NumToGen: 2, TimeToRun: 0}
	body, _ := json.Marshal(cfg)
	w := httptest.NewRecorder()
	kg.APIPut(w, httptest.NewRequest(http.MethodPut, "/keygen", bytes.NewReader(body)))
	if w.Code != 200 {
		t.Fatalf("put status %d", w.Code)
	}
	// allow workload to run
	time.Sleep(150 * time.Millisecond)
	w2 := httptest.NewRecorder()
	kg.APIGet(w2, httptest.NewRequest(http.MethodGet, "/keygen", nil))
	if w2.Code != 200 {
		t.Fatalf("get status %d", w2.Code)
	}
}
