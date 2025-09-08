package debugprobe

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestProbeFailNext(t *testing.T) {
	p := New()
	// configure fail next 2
	cfg := ProbeConfig{FailNext: 2}
	buf, _ := json.Marshal(cfg)
	w := httptest.NewRecorder()
	p.APIPut(w, httptest.NewRequest(http.MethodPut, "/ready/api", bytes.NewReader(buf)))
	if w.Code != 200 {
		t.Fatalf("put %d", w.Code)
	}
	// first call fails
	r1 := httptest.NewRecorder()
	p.Handle(r1, httptest.NewRequest(http.MethodGet, "/ready", nil))
	if r1.Code == 200 {
		t.Fatalf("expected failure 1")
	}
	// second call fails
	r2 := httptest.NewRecorder()
	p.Handle(r2, httptest.NewRequest(http.MethodGet, "/ready", nil))
	if r2.Code == 200 {
		t.Fatalf("expected failure 2")
	}
	// third call succeeds
	r3 := httptest.NewRecorder()
	p.Handle(r3, httptest.NewRequest(http.MethodGet, "/ready", nil))
	if r3.Code != 200 {
		t.Fatalf("expected success after decrement, got %d", r3.Code)
	}
}
