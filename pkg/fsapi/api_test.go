package fsapi

import (
	"encoding/json"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
)

func TestHandleListTempDir(t *testing.T) {
	dir := t.TempDir()
	if err := os.WriteFile(filepath.Join(dir, "file.txt"), []byte("data"), 0o644); err != nil {
		t.Fatalf("write: %v", err)
	}
	a := New()
	rr := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/fsapi?path="+dir, nil)
	a.handleList(rr, req)
	if rr.Code != 200 {
		t.Fatalf("expected 200 got %d", rr.Code)
	}
	var payload map[string]any
	if err := json.Unmarshal(rr.Body.Bytes(), &payload); err != nil {
		t.Fatalf("json: %v", err)
	}
	if payload["cwd"].(string) != dir {
		t.Fatalf("cwd mismatch")
	}
}
