package api

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"

	"github.com/shiron-dev/chronova/backend/internal/store"
)

type errorBody struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

type errorEnvelope struct {
	Error errorBody `json:"error"`
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if v != nil {
		if err := json.NewEncoder(w).Encode(v); err != nil {
			log.Printf("api: encode response: %v", err)
		}
	}
}

func writeError(w http.ResponseWriter, status int, code, message string) {
	writeJSON(w, status, errorEnvelope{Error: errorBody{Code: code, Message: message}})
}

func writeValidation(w http.ResponseWriter, message string) {
	writeError(w, http.StatusBadRequest, "validation", message)
}

// writeStoreError maps store error kinds onto the HTTP error envelope.
func writeStoreError(w http.ResponseWriter, err error) {
	var ve *store.ValidationError
	switch {
	case errors.Is(err, store.ErrNotFound):
		writeError(w, http.StatusNotFound, "not_found", "resource not found")
	case errors.As(err, &ve):
		writeValidation(w, ve.Msg)
	default:
		log.Printf("api: internal error: %v", err)
		writeError(w, http.StatusInternalServerError, "internal", "internal server error")
	}
}

// decodeJSON strictly decodes the request body into v.
func decodeJSON(r *http.Request, v any) error {
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	return dec.Decode(v)
}
