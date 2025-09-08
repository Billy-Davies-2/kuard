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

package memqserver

import (
	"io"
	"net/http"

	"github.com/kubernetes-up-and-running/kuard/pkg/apiutils"
	"github.com/kubernetes-up-and-running/kuard/pkg/route"
)

type Server struct {
	nb *natsBackend // required NATS backend
}

func NewServer() *Server {
	s := &Server{nb: newNATSBackend()}
	return s
}

func (s *Server) AddRoutes(router route.Router, base string) {
	router.GET(base+"/stats", http.HandlerFunc(s.GetStats))
	router.PUT(base+"/queues", http.HandlerFunc(s.CreateQueue))       // ?queue=name
	router.DELETE(base+"/queues", http.HandlerFunc(s.DeleteQueue))    // ?queue=name
	router.POST(base+"/queues/drain", http.HandlerFunc(s.DrainQueue)) // ?queue=name
	router.POST(base+"/queues/dequeue", http.HandlerFunc(s.Dequeue))  // ?queue=name
	router.POST(base+"/queues/enqueue", http.HandlerFunc(s.Enqueue))  // ?queue=name
}

func getQueueParam(r *http.Request) string { return r.URL.Query().Get("queue") }

func (s *Server) CreateQueue(w http.ResponseWriter, r *http.Request) {
	qName := getQueueParam(r)
	if qName == "" {
		http.Error(w, ErrEmptyName.Error(), http.StatusBadRequest)
		return
	}
	err := s.nb.CreateQueue(qName)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
	}
}

func (s *Server) DeleteQueue(w http.ResponseWriter, r *http.Request) {
	qName := getQueueParam(r)
	if qName == "" {
		http.Error(w, ErrEmptyName.Error(), http.StatusBadRequest)
		return
	}
	err := s.nb.DeleteQueue(qName)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
	}
}

func (s *Server) DrainQueue(w http.ResponseWriter, r *http.Request) {
	qName := getQueueParam(r)
	if qName == "" {
		http.Error(w, ErrEmptyName.Error(), http.StatusBadRequest)
		return
	}
	err := s.nb.DrainQueue(qName)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
	}
}

func (s *Server) Enqueue(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	qName := getQueueParam(r)
	if qName == "" {
		http.Error(w, ErrEmptyName.Error(), http.StatusBadRequest)
		return
	}
	msg, err := s.nb.PutMessage(qName, string(body))
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	apiutils.ServeJSON(w, msg)
}

func (s *Server) Dequeue(w http.ResponseWriter, r *http.Request) {
	qName := getQueueParam(r)
	if qName == "" {
		http.Error(w, ErrEmptyName.Error(), http.StatusBadRequest)
		return
	}
	m, err := s.nb.GetMessage(qName)
	if err == ErrEmptyQueue {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	apiutils.ServeJSON(w, &m)
}

func (s *Server) GetStats(w http.ResponseWriter, r *http.Request) {
	stats := s.nb.Stats()
	apiutils.ServeJSON(w, &stats)
}
