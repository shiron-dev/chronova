package api

import (
	"net/http"
	"strings"

	"github.com/shiron-dev/chronova/backend/internal/model"
	"github.com/shiron-dev/chronova/backend/internal/store"
)

func (s *server) listMembers(w http.ResponseWriter, _ *http.Request) {
	members, err := s.store.ListMembers()
	if err != nil {
		writeStoreError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"members": members})
}

type createMemberRequest struct {
	Name        string           `json:"name"`
	Type        model.MemberType `json:"type"`
	AvatarColor string           `json:"avatar_color"`
}

func (s *server) createMember(w http.ResponseWriter, r *http.Request) {
	var req createMemberRequest
	if err := decodeJSON(r, &req); err != nil {
		writeValidation(w, "invalid JSON body: "+err.Error())
		return
	}
	req.Name = strings.TrimSpace(req.Name)
	if req.Name == "" {
		writeValidation(w, "name is required")
		return
	}
	if !model.ValidMemberType(req.Type) {
		writeValidation(w, `type must be "human" or "agent"`)
		return
	}
	m, err := s.store.CreateMember(store.CreateMemberInput{
		Name: req.Name, Type: req.Type, AvatarColor: req.AvatarColor,
	})
	if err != nil {
		writeStoreError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, m)
}

type updateMemberRequest struct {
	Name        *string           `json:"name"`
	Type        *model.MemberType `json:"type"`
	AvatarColor *string           `json:"avatar_color"`
}

func (s *server) updateMember(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r)
	if !ok {
		writeValidation(w, "invalid id")
		return
	}
	var req updateMemberRequest
	if err := decodeJSON(r, &req); err != nil {
		writeValidation(w, "invalid JSON body: "+err.Error())
		return
	}
	if req.Name != nil {
		trimmed := strings.TrimSpace(*req.Name)
		if trimmed == "" {
			writeValidation(w, "name must not be empty")
			return
		}
		req.Name = &trimmed
	}
	if req.Type != nil && !model.ValidMemberType(*req.Type) {
		writeValidation(w, `type must be "human" or "agent"`)
		return
	}
	m, err := s.store.UpdateMember(id, store.UpdateMemberInput{
		Name: req.Name, Type: req.Type, AvatarColor: req.AvatarColor,
	})
	if err != nil {
		writeStoreError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, m)
}

func (s *server) deleteMember(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r)
	if !ok {
		writeValidation(w, "invalid id")
		return
	}
	if err := s.store.DeleteMember(id); err != nil {
		writeStoreError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
