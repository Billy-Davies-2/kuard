package app

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestAppBasicEndpoints(t *testing.T) {
	a := NewApp()
	// Minimal config defaults
	a.c.ServeAddr = "127.0.0.1:0"
	srv := httptest.NewServer(promMiddleware(loggingMiddleware(a.r)))
	defer srv.Close()

	endpoints := []string{"/mem/api", "/env/api", "/ready", "/healthy", "/pageinfo"}
	for _, ep := range endpoints {
		resp, err := http.Get(srv.URL + ep)
		if err != nil {
			t.Fatalf("GET %s: %v", ep, err)
		}
		if resp.StatusCode != 200 {
			t.Fatalf("%s status %d", ep, resp.StatusCode)
		}
	}
	// Check pageinfo JSON
	resp, _ := http.Get(srv.URL + "/pageinfo")
	var pi map[string]any
	json.NewDecoder(resp.Body).Decode(&pi)
	if pi["hostname"] == "" {
		t.Fatalf("expected hostname in pageinfo")
	}
}
