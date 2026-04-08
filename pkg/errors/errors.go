// Package errors provides unified error types, error codes, and error wrapping
// utilities for the ResolveAgent platform. All services should use these error
// types to ensure consistent error reporting across the system.
package errors

import (
	"errors"
	"fmt"
	"net/http"
)

// Standard sentinel errors for common cases.
var (
	ErrNotFound        = errors.New("not found")
	ErrAlreadyExists   = errors.New("already exists")
	ErrInvalidArgument = errors.New("invalid argument")
	ErrUnauthorized    = errors.New("unauthorized")
	ErrForbidden       = errors.New("forbidden")
	ErrInternal        = errors.New("internal error")
	ErrUnavailable     = errors.New("service unavailable")
	ErrTimeout         = errors.New("operation timed out")
	ErrConflict        = errors.New("conflict")
	ErrRateLimited     = errors.New("rate limited")
)

// Code represents a machine-readable error code.
type Code string

const (
	CodeNotFound        Code = "NOT_FOUND"
	CodeAlreadyExists   Code = "ALREADY_EXISTS"
	CodeInvalidArgument Code = "INVALID_ARGUMENT"
	CodeUnauthorized    Code = "UNAUTHORIZED"
	CodeForbidden       Code = "FORBIDDEN"
	CodeInternal        Code = "INTERNAL"
	CodeUnavailable     Code = "UNAVAILABLE"
	CodeTimeout         Code = "TIMEOUT"
	CodeConflict        Code = "CONFLICT"
	CodeRateLimited     Code = "RATE_LIMITED"
)

// Error is a structured error with a code, message, and optional cause.
type Error struct {
	Code    Code   `json:"code"`
	Message string `json:"message"`
	Cause   error  `json:"-"`
}

// Error implements the error interface.
func (e *Error) Error() string {
	if e.Cause != nil {
		return fmt.Sprintf("[%s] %s: %v", e.Code, e.Message, e.Cause)
	}
	return fmt.Sprintf("[%s] %s", e.Code, e.Message)
}

// Unwrap returns the underlying cause for errors.Is / errors.As chains.
func (e *Error) Unwrap() error {
	return e.Cause
}

// New creates a new Error with the given code and message.
func New(code Code, message string) *Error {
	return &Error{Code: code, Message: message}
}

// Wrap wraps an existing error with a code and contextual message.
func Wrap(code Code, message string, cause error) *Error {
	return &Error{Code: code, Message: message, Cause: cause}
}

// Newf creates a new Error with a formatted message.
func Newf(code Code, format string, args ...any) *Error {
	return &Error{Code: code, Message: fmt.Sprintf(format, args...)}
}

// Wrapf wraps an existing error with a formatted contextual message.
func Wrapf(code Code, cause error, format string, args ...any) *Error {
	return &Error{Code: code, Message: fmt.Sprintf(format, args...), Cause: cause}
}

// Convenience constructors for common error types.

func NotFound(entity, id string) *Error {
	return Newf(CodeNotFound, "%s %q not found", entity, id)
}

func AlreadyExists(entity, id string) *Error {
	return Newf(CodeAlreadyExists, "%s %q already exists", entity, id)
}

func InvalidArgument(field, reason string) *Error {
	return Newf(CodeInvalidArgument, "invalid %s: %s", field, reason)
}

// HTTPStatus maps an error Code to an HTTP status code.
func HTTPStatus(err error) int {
	var e *Error
	if errors.As(err, &e) {
		switch e.Code {
		case CodeNotFound:
			return http.StatusNotFound
		case CodeAlreadyExists:
			return http.StatusConflict
		case CodeInvalidArgument:
			return http.StatusBadRequest
		case CodeUnauthorized:
			return http.StatusUnauthorized
		case CodeForbidden:
			return http.StatusForbidden
		case CodeUnavailable:
			return http.StatusServiceUnavailable
		case CodeTimeout:
			return http.StatusGatewayTimeout
		case CodeConflict:
			return http.StatusConflict
		case CodeRateLimited:
			return http.StatusTooManyRequests
		}
	}
	return http.StatusInternalServerError
}

// Re-export standard library helpers for convenience.
var (
	Is   = errors.Is
	As   = errors.As
	New_ = errors.New //nolint:revive // intentional alias
	Join = errors.Join
)
