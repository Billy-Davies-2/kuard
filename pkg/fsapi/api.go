package fsapi

import (
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/kubernetes-up-and-running/kuard/pkg/route"
)

type Entry struct {
	Name    string    `json:"name"`
	Path    string    `json:"path"`
	Size    int64     `json:"size"`
	Mode    string    `json:"mode"`
	IsDir   bool      `json:"isDir"`
	ModTime time.Time `json:"modTime"`
	Symlink bool      `json:"symlink"`
	Target  string    `json:"target,omitempty"`
	Err     string    `json:"err,omitempty"`
}

type API struct{}

func New() *API { return &API{} }

func (a *API) AddRoutes(r route.Router, base string) {
	// Support both /fsapi and /fsapi/ plus wildcard for SPA convenience.
	r.GET(base, http.HandlerFunc(a.handleList))
	r.GET(base+"/", http.HandlerFunc(a.handleList))
	r.GET(base+"/*filepath", http.HandlerFunc(a.handleList))
}

func (a *API) handleList(w http.ResponseWriter, r *http.Request) {
	p := r.URL.Query().Get("path")
	if p == "" {
		p = "/"
	}
	abs := filepath.Clean(p)

	// Optional query params for pagination & filtering.
	q := strings.TrimSpace(r.URL.Query().Get("q"))
	limitStr := r.URL.Query().Get("limit")
	offsetStr := r.URL.Query().Get("offset")
	limit := 200
	if limitStr != "" {
		if v, err := strconv.Atoi(limitStr); err == nil && v > 0 && v <= 5000 { // sane cap
			limit = v
		}
	}
	offset := 0
	if offsetStr != "" {
		if v, err := strconv.Atoi(offsetStr); err == nil && v >= 0 {
			offset = v
		}
	}
	list, err := os.ReadDir(abs)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}
	entries := make([]Entry, 0, len(list))
	for _, de := range list {
		info, err := de.Info()
		if err != nil {
			entries = append(entries, Entry{Name: de.Name(), Path: filepath.Join(abs, de.Name()), Err: err.Error()})
			continue
		}
		e := Entry{Name: de.Name(), Path: filepath.Join(abs, de.Name()), Size: info.Size(), Mode: info.Mode().String(), IsDir: de.IsDir(), ModTime: info.ModTime()}
		if info.Mode()&os.ModeSymlink != 0 {
			if target, err := os.Readlink(filepath.Join(abs, de.Name())); err == nil {
				e.Symlink, e.Target = true, target
			}
		}
		entries = append(entries, e)
	}

	// Filter by substring (case-insensitive) if q provided.
	if q != "" {
		mq := strings.ToLower(q)
		filtered := make([]Entry, 0, len(entries))
		for _, e := range entries {
			if strings.Contains(strings.ToLower(e.Name), mq) {
				filtered = append(filtered, e)
			}
		}
		entries = filtered
	}

	// Sort directories first then name (case-insensitive)
	sort.Slice(entries, func(i, j int) bool {
		if entries[i].IsDir != entries[j].IsDir {
			return entries[i].IsDir
		}
		return strings.ToLower(entries[i].Name) < strings.ToLower(entries[j].Name)
	})

	total := len(entries)
	end := offset + limit
	if offset > total {
		offset = total
	}
	if end > total {
		end = total
	}
	page := entries[offset:end]
	hasMore := end < total

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{
		"cwd":      abs,
		"entries":  page,
		"total":    total,
		"returned": len(page),
		"offset":   offset,
		"limit":    limit,
		"hasMore":  hasMore,
		"q":        q,
	})
}
