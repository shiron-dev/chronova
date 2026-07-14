// Package api exposes the store over a JSON REST API under /api/v1.
package api

import (
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"

	"github.com/shiron-dev/chronova/backend/internal/store"
)

type server struct {
	store *store.Store
}

// NewRouter builds the HTTP handler serving the full API.
func NewRouter(st *store.Store) http.Handler {
	s := &server{store: st}
	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(cors)

	r.Route("/api/v1", func(r chi.Router) {
		r.Get("/health", s.health)
		r.Get("/workspace", s.getWorkspace)

		r.Route("/members", func(r chi.Router) {
			r.Get("/", s.listMembers)
			r.Post("/", s.createMember)
			r.Patch("/{id}", s.updateMember)
			r.Delete("/{id}", s.deleteMember)
		})

		r.Route("/projects", func(r chi.Router) {
			r.Get("/", s.listProjects)
			r.Post("/", s.createProject)
			r.Get("/{id}", s.getProject)
			r.Patch("/{id}", s.updateProject)
			r.Delete("/{id}", s.deleteProject)
		})

		r.Route("/tasks", func(r chi.Router) {
			r.Get("/", s.listTasks)
			r.Post("/", s.createTask)
			r.Get("/{id}", s.getTask)
			r.Patch("/{id}", s.updateTask)
			r.Delete("/{id}", s.deleteTask)
			r.Post("/{id}/move", s.moveTask)
		})
	})
	return r
}

// cors is deliberately permissive: the API is meant to be directly callable
// by external agents, and dev traffic goes through the Vite proxy anyway.
func cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (s *server) health(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *server) getWorkspace(w http.ResponseWriter, _ *http.Request) {
	ws, err := s.store.Workspace()
	if err != nil {
		writeStoreError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, ws)
}

// pathID parses the {id} URL parameter.
func pathID(r *http.Request) (int64, bool) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	return id, err == nil && id > 0
}
