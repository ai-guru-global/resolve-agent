package server

import (
	"github.com/ai-guru-global/resolve-agent/pkg/errors"
)

// mapPythonErrorCode translates a Python runtime error_code string into
// the corresponding Go errors.Code. Unknown codes default to CodeInternal.
func mapPythonErrorCode(pythonCode string) errors.Code {
	switch pythonCode {
	case "INVALID_ARGUMENT":
		return errors.CodeInvalidArgument
	case "NOT_FOUND":
		return errors.CodeNotFound
	case "FORBIDDEN":
		return errors.CodeForbidden
	case "TIMEOUT":
		return errors.CodeTimeout
	case "UNAVAILABLE":
		return errors.CodeUnavailable
	case "RATE_LIMITED":
		return errors.CodeRateLimited
	case "ALREADY_EXISTS":
		return errors.CodeAlreadyExists
	case "UNAUTHORIZED":
		return errors.CodeUnauthorized
	case "CONFLICT":
		return errors.CodeConflict
	default:
		return errors.CodeInternal
	}
}
