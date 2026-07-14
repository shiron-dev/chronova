package api

import (
	"net/http"
	"strings"

	"github.com/shiron-dev/chronova/backend/internal/store"
)

func (s *server) listProjects(w http.ResponseWriter, _ *http.Request) {
	projects, err := s.store.ListProjects()
	if err != nil {
		writeStoreError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"projects": projects})
}

func (s *server) getProject(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r)
	if !ok {
		writeValidation(w, "invalid id")
		return
	}
	p, err := s.store.GetProject(id)
	if err != nil {
		writeStoreError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, p)
}

type createProjectRequest struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Color       string `json:"color"`
	Icon        string `json:"icon"`
}

func (s *server) createProject(w http.ResponseWriter, r *http.Request) {
	var req createProjectRequest
	if err := decodeJSON(r, &req); err != nil {
		writeValidation(w, "invalid JSON body: "+err.Error())
		return
	}
	req.Name = strings.TrimSpace(req.Name)
	if req.Name == "" {
		writeValidation(w, "name is required")
		return
	}
	p, err := s.store.CreateProject(store.CreateProjectInput{
		Name: req.Name, Description: req.Description, Color: req.Color, Icon: req.Icon,
	})
	if err != nil {
		writeStoreError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, p)
}

type updateProjectRequest struct {
	Name        *string `json:"name"`
	Description *string `json:"description"`
	Color       *string `json:"color"`
	Icon        *string `json:"icon"`
}

func (s *server) updateProject(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r)
	if !ok {
		writeValidation(w, "invalid id")
		return
	}
	var req updateProjectRequest
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
	p, err := s.store.UpdateProject(id, store.UpdateProjectInput{
		Name: req.Name, Description: req.Description, Color: req.Color, Icon: req.Icon,
	})
	if err != nil {
		writeStoreError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, p)
}

func (s *server) deleteProject(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r)
	if !ok {
		writeValidation(w, "invalid id")
		return
	}
	if err := s.store.DeleteProject(id); err != nil {
		writeStoreError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
