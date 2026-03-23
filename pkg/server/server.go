package server

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"sync"

	"github.com/ai-guru-global/resolve-agent/pkg/config"
	"google.golang.org/grpc"
	"google.golang.org/grpc/health"
	healthpb "google.golang.org/grpc/health/grpc_health_v1"
	"google.golang.org/grpc/reflection"
)

// Server is the main platform services server.
type Server struct {
	cfg        *config.Config
	logger     *slog.Logger
	httpServer *http.Server
	grpcServer *grpc.Server
}

// New creates a new Server instance.
func New(cfg *config.Config, logger *slog.Logger) (*Server, error) {
	s := &Server{
		cfg:    cfg,
		logger: logger,
	}

	// Initialize gRPC server
	s.grpcServer = grpc.NewServer()

	// Register health check
	healthSrv := health.NewServer()
	healthpb.RegisterHealthServer(s.grpcServer, healthSrv)

	// Enable reflection for debugging
	reflection.Register(s.grpcServer)

	// Initialize HTTP server with REST API
	mux := http.NewServeMux()
	s.registerHTTPRoutes(mux)
	s.httpServer = &http.Server{
		Handler: mux,
	}

	return s, nil
}

// Run starts both HTTP and gRPC servers and blocks until context is cancelled.
func (s *Server) Run(ctx context.Context) error {
	var wg sync.WaitGroup
	errCh := make(chan error, 2)

	// Start gRPC server
	wg.Add(1)
	go func() {
		defer wg.Done()
		lis, err := net.Listen("tcp", s.cfg.Server.GRPCAddr)
		if err != nil {
			errCh <- fmt.Errorf("gRPC listen: %w", err)
			return
		}
		s.logger.Info("gRPC server listening", "addr", s.cfg.Server.GRPCAddr)
		if err := s.grpcServer.Serve(lis); err != nil {
			errCh <- fmt.Errorf("gRPC serve: %w", err)
		}
	}()

	// Start HTTP server
	wg.Add(1)
	go func() {
		defer wg.Done()
		lis, err := net.Listen("tcp", s.cfg.Server.HTTPAddr)
		if err != nil {
			errCh <- fmt.Errorf("HTTP listen: %w", err)
			return
		}
		s.logger.Info("HTTP server listening", "addr", s.cfg.Server.HTTPAddr)
		if err := s.httpServer.Serve(lis); err != nil && !errors.Is(err, http.ErrServerClosed) {
			errCh <- fmt.Errorf("HTTP serve: %w", err)
		}
	}()

	// Wait for shutdown
	select {
	case <-ctx.Done():
		s.logger.Info("Shutting down servers...")
		s.grpcServer.GracefulStop()
		if err := s.httpServer.Shutdown(context.Background()); err != nil {
			s.logger.Error("HTTP shutdown error", "error", err)
		}
	case err := <-errCh:
		return err
	}

	wg.Wait()
	return nil
}
