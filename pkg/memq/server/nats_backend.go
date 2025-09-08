package memqserver

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"log/slog"
	"os"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/kubernetes-up-and-running/kuard/pkg/memq"
	"github.com/nats-io/nats.go"
)

// natsBackend implements queue semantics on top of NATS JetStream.
// Each queue maps to a JetStream Stream with subject memq.<name>.
// Dequeue uses a pull consumer created per call (simple but fine for demo scale).
type qStats struct {
	enq     int64
	deq     int64
	drained int64
}

type natsBackend struct {
	nc *nats.Conn
	js nats.JetStreamContext

	mu     sync.RWMutex
	queues map[string]*qStats // local tracking for stats (stream metadata supplies depth)
}

func newNATSBackend() *natsBackend {
	url := os.Getenv("NATS_URL")
	if url == "" {
		url = nats.DefaultURL
	}
	nc, err := nats.Connect(url, nats.Name("kuard-memq"))
	if err != nil {
		slog.Error("nats connect failed; queue API unavailable", "error", err)
		return nil
	}
	js, err := nc.JetStream()
	if err != nil {
		slog.Error("jetstream init failed; queue API unavailable", "error", err)
		_ = nc.Drain()
		return nil
	}
	slog.Info("memq using NATS JetStream backend", "url", url)
	return &natsBackend{nc: nc, js: js, queues: map[string]*qStats{}}
}

// Error constants (previously in broker.go)
var (
	ErrEmptyQueue   = errors.New("empty queue")
	ErrNotExist     = errors.New("does not exist")
	ErrAlreadyExist = errors.New("already exists")
	ErrEmptyName    = errors.New("empty name")
)

func newStats() *memq.Stats {
	return &memq.Stats{Kind: "stats", Queues: []memq.Stat{}}
}

func newMessage(body string) (*memq.Message, error) {
	id, err := uuid()
	if err != nil {
		return nil, err
	}
	return &memq.Message{Kind: "message", ID: id, Body: body, Created: time.Now()}, nil
}

func uuid() (string, error) {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

func (nb *natsBackend) streamName(q string) string { return "MEMQ_" + strings.ToUpper(q) }
func (nb *natsBackend) subject(q string) string    { return "memq." + q }

func (nb *natsBackend) CreateQueue(name string) error {
	if name == "" {
		return ErrEmptyName
	}
	nb.mu.Lock()
	defer nb.mu.Unlock()
	if _, ok := nb.queues[name]; ok {
		return ErrAlreadyExist
	}
	_, err := nb.js.AddStream(&nats.StreamConfig{
		Name:     nb.streamName(name),
		Subjects: []string{nb.subject(name)},
		// MaxMsgsPerSubject -1 means unlimited; keep demo simple.
	})
	if err != nil {
		if errors.Is(err, nats.ErrStreamNameAlreadyInUse) {
			// Stream already exists (maybe created externally) – register locally then signal duplicate.
			nb.queues[name] = &qStats{}
			return ErrAlreadyExist
		}
		return err
	}
	nb.queues[name] = &qStats{}
	return nil
}

func (nb *natsBackend) DeleteQueue(name string) error {
	if name == "" {
		return ErrEmptyName
	}
	nb.mu.Lock()
	defer nb.mu.Unlock()
	if _, ok := nb.queues[name]; !ok {
		return ErrNotExist
	}
	if err := nb.js.DeleteStream(nb.streamName(name)); err != nil {
		return err
	}
	delete(nb.queues, name)
	return nil
}

func (nb *natsBackend) DrainQueue(name string) error {
	nb.mu.RLock()
	qs, ok := nb.queues[name]
	nb.mu.RUnlock()
	if !ok {
		return ErrNotExist
	}
	// Get depth before purge for drained accounting.
	info, err := nb.js.StreamInfo(nb.streamName(name))
	if err == nil {
		atomic.AddInt64(&qs.drained, int64(info.State.Msgs))
	}
	// Purge stream content (faster than delete+recreate and preserves configuration / consumers).
	if err := nb.js.PurgeStream(nb.streamName(name)); err != nil {
		return err
	}
	return nil
}

func (nb *natsBackend) PutMessage(queue, body string) (*memq.Message, error) {
	nb.mu.RLock()
	qs, ok := nb.queues[queue]
	nb.mu.RUnlock()
	if !ok {
		return nil, ErrNotExist
	}
	if _, err := nb.js.Publish(nb.subject(queue), []byte(body)); err != nil {
		return nil, err
	}
	atomic.AddInt64(&qs.enq, 1)
	// Construct message metadata placeholder (IDs not tracked identically to in-memory version)
	return newMessage(body)
}

func (nb *natsBackend) GetMessage(queue string) (*memq.Message, error) {
	nb.mu.RLock()
	qs, ok := nb.queues[queue]
	nb.mu.RUnlock()
	if !ok {
		return nil, ErrNotExist
	}
	durable := "MEMQ_CONS_" + strings.ToUpper(queue)
	sub, err := nb.js.PullSubscribe(nb.subject(queue), durable, nats.BindStream(nb.streamName(queue)))
	if err != nil {
		if !errors.Is(err, nats.ErrConsumerNotFound) {
			slog.Error("pull subscribe failed", "queue", queue, "error", err)
			return nil, err
		}
		sub, err = nb.js.PullSubscribe(nb.subject(queue), durable)
		if err != nil {
			return nil, err
		}
	}
	ctx, cancel := context.WithTimeout(context.Background(), 500*time.Millisecond)
	defer cancel()
	msgs, err := sub.Fetch(1, nats.Context(ctx))
	if err != nil {
		if errors.Is(err, context.DeadlineExceeded) || strings.Contains(err.Error(), "no messages") {
			return nil, ErrEmptyQueue
		}
		return nil, err
	}
	if len(msgs) == 0 {
		return nil, ErrEmptyQueue
	}
	m := msgs[0]
	body := string(m.Data)
	_ = m.Ack()
	atomic.AddInt64(&qs.deq, 1)
	msg, _ := newMessage(body)
	return msg, nil
}

func (nb *natsBackend) Stats() *memq.Stats {
	s := newStats()
	nb.mu.RLock()
	defer nb.mu.RUnlock()
	for q, qs := range nb.queues {
		info, err := nb.js.StreamInfo(nb.streamName(q))
		if err != nil {
			continue
		}
		depth := int64(info.State.Msgs)
		s.Queues = append(s.Queues, memq.Stat{
			Name:     q,
			Depth:    depth,
			Enqueued: atomic.LoadInt64(&qs.enq),
			Dequeued: atomic.LoadInt64(&qs.deq),
			Drained:  atomic.LoadInt64(&qs.drained),
		})
	}
	return s
}

// Close releases the NATS connection (best-effort).
func (nb *natsBackend) Close() {
	if nb == nil || nb.nc == nil {
		return
	}
	_ = nb.nc.Drain()
}
