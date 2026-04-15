package registry

import (
	"context"
	"fmt"
	"sync"
	"time"
)

// TrafficCapture represents a traffic capture session.
type TrafficCapture struct {
	ID            string            `json:"id"`
	Name          string            `json:"name"`
	SourceType    string            `json:"source_type"` // "ebpf", "tcpdump", "otel", "proxy"
	TargetService string            `json:"target_service"`
	StartTime     time.Time         `json:"start_time"`
	EndTime       time.Time         `json:"end_time"`
	Status        string            `json:"status"` // "pending", "capturing", "completed", "failed"
	Config        map[string]any    `json:"config"`
	Summary       map[string]any    `json:"summary"`
	Labels        map[string]string `json:"labels,omitempty"`
	CreatedAt     time.Time         `json:"created_at"`
	UpdatedAt     time.Time         `json:"updated_at"`
}

// TrafficRecord represents a single captured traffic record.
type TrafficRecord struct {
	ID            string         `json:"id"`
	CaptureID     string         `json:"capture_id"`
	SourceService string         `json:"source_service"`
	DestService   string         `json:"dest_service"`
	Protocol      string         `json:"protocol"` // "HTTP", "gRPC", "TCP"
	Method        string         `json:"method"`
	Path          string         `json:"path"`
	StatusCode    int            `json:"status_code"`
	LatencyMs     int            `json:"latency_ms"`
	RequestSize   int            `json:"request_size"`
	ResponseSize  int            `json:"response_size"`
	TraceID       string         `json:"trace_id"`
	SpanID        string         `json:"span_id"`
	Timestamp     time.Time      `json:"timestamp"`
	Metadata      map[string]any `json:"metadata"`
}

// TrafficCaptureRegistry manages traffic captures and their records.
type TrafficCaptureRegistry interface {
	Create(ctx context.Context, capture *TrafficCapture) error
	Get(ctx context.Context, id string) (*TrafficCapture, error)
	List(ctx context.Context, opts ListOptions) ([]*TrafficCapture, int, error)
	Update(ctx context.Context, capture *TrafficCapture) error
	Delete(ctx context.Context, id string) error
	AddRecords(ctx context.Context, records []*TrafficRecord) error
	ListRecords(ctx context.Context, captureID string, opts ListOptions) ([]*TrafficRecord, int, error)
	GetRecordsByService(ctx context.Context, captureID string, serviceName string) ([]*TrafficRecord, error)
}

// InMemoryTrafficCaptureRegistry is an in-memory implementation for development.
type InMemoryTrafficCaptureRegistry struct {
	mu       sync.RWMutex
	captures map[string]*TrafficCapture
	records  map[string]*TrafficRecord
}

// NewInMemoryTrafficCaptureRegistry creates a new in-memory traffic capture registry.
func NewInMemoryTrafficCaptureRegistry() *InMemoryTrafficCaptureRegistry {
	return &InMemoryTrafficCaptureRegistry{
		captures: make(map[string]*TrafficCapture),
		records:  make(map[string]*TrafficRecord),
	}
}

func (r *InMemoryTrafficCaptureRegistry) Create(_ context.Context, capture *TrafficCapture) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.captures[capture.ID]; exists {
		return fmt.Errorf("traffic capture %s already exists", capture.ID)
	}

	now := time.Now()
	capture.CreatedAt = now
	capture.UpdatedAt = now
	if capture.Status == "" {
		capture.Status = "pending"
	}
	r.captures[capture.ID] = capture
	return nil
}

func (r *InMemoryTrafficCaptureRegistry) Get(_ context.Context, id string) (*TrafficCapture, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	capture, ok := r.captures[id]
	if !ok {
		return nil, fmt.Errorf("traffic capture %s not found", id)
	}
	return capture, nil
}

func (r *InMemoryTrafficCaptureRegistry) List(_ context.Context, opts ListOptions) ([]*TrafficCapture, int, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	limit := opts.Limit
	if limit <= 0 {
		limit = 100
	}
	offset := opts.Offset

	var captures []*TrafficCapture
	for _, c := range r.captures {
		if len(opts.Filter) > 0 {
			match := true
			for key, value := range opts.Filter {
				switch key {
				case "status":
					if c.Status != value {
						match = false
					}
				case "source_type":
					if c.SourceType != value {
						match = false
					}
				}
			}
			if !match {
				continue
			}
		}
		captures = append(captures, c)
	}

	total := len(captures)
	if offset >= total {
		return []*TrafficCapture{}, total, nil
	}
	end := offset + limit
	if end > total {
		end = total
	}
	return captures[offset:end], total, nil
}

func (r *InMemoryTrafficCaptureRegistry) Update(_ context.Context, capture *TrafficCapture) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.captures[capture.ID]; !exists {
		return fmt.Errorf("traffic capture %s not found", capture.ID)
	}
	capture.UpdatedAt = time.Now()
	r.captures[capture.ID] = capture
	return nil
}

func (r *InMemoryTrafficCaptureRegistry) Delete(_ context.Context, id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	for rid, rec := range r.records {
		if rec.CaptureID == id {
			delete(r.records, rid)
		}
	}
	delete(r.captures, id)
	return nil
}

func (r *InMemoryTrafficCaptureRegistry) AddRecords(_ context.Context, records []*TrafficRecord) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	for _, rec := range records {
		r.records[rec.ID] = rec
	}
	return nil
}

func (r *InMemoryTrafficCaptureRegistry) ListRecords(_ context.Context, captureID string, opts ListOptions) ([]*TrafficRecord, int, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	limit := opts.Limit
	if limit <= 0 {
		limit = 100
	}
	offset := opts.Offset

	var records []*TrafficRecord
	for _, rec := range r.records {
		if rec.CaptureID == captureID {
			records = append(records, rec)
		}
	}

	total := len(records)
	if offset >= total {
		return []*TrafficRecord{}, total, nil
	}
	end := offset + limit
	if end > total {
		end = total
	}
	return records[offset:end], total, nil
}

func (r *InMemoryTrafficCaptureRegistry) GetRecordsByService(_ context.Context, captureID string, serviceName string) ([]*TrafficRecord, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	var records []*TrafficRecord
	for _, rec := range r.records {
		if rec.CaptureID == captureID && (rec.SourceService == serviceName || rec.DestService == serviceName) {
			records = append(records, rec)
		}
	}
	return records, nil
}
