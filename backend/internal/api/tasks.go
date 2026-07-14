package api

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/shiron-dev/chronova/backend/internal/model"
	"github.com/shiron-dev/chronova/backend/internal/store"
)

func validDate(s string) bool {
	_, err := time.Parse("2006-01-02", s)
	return err == nil
}

func (s *server) listTasks(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	filter := store.TaskFilter{Query: strings.TrimSpace(q.Get("q"))}

	if v := q.Get("project_id"); v != "" {
		id, err := strconv.ParseInt(v, 10, 64)
		if err != nil {
			writeValidation(w, "project_id must be an integer")
			return
		}
		filter.ProjectID = &id
	}
	if v := q.Get("assignee_id"); v != "" {
		id, err := strconv.ParseInt(v, 10, 64)
		if err != nil {
			writeValidation(w, "assignee_id must be an integer")
			return
		}
		filter.AssigneeID = &id
	}
	for _, v := range q["status"] {
		st := model.Status(v)
		if !model.ValidStatus(st) {
			writeValidation(w, "invalid status: "+v)
			return
		}
		filter.Statuses = append(filter.Statuses, st)
	}

	tasks, err := s.store.ListTasks(filter)
	if err != nil {
		writeStoreError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"tasks": tasks})
}

func (s *server) getTask(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r)
	if !ok {
		writeValidation(w, "invalid id")
		return
	}
	t, err := s.store.GetTask(id)
	if err != nil {
		writeStoreError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, t)
}

type createTaskRequest struct {
	Title       string          `json:"title"`
	Description string          `json:"description"`
	Status      *model.Status   `json:"status"`
	Priority    *model.Priority `json:"priority"`
	DueDate     *string         `json:"due_date"`
	ProjectID   *int64          `json:"project_id"`
	AssigneeIDs []int64         `json:"assignee_ids"`
}

func (s *server) createTask(w http.ResponseWriter, r *http.Request) {
	var req createTaskRequest
	if err := decodeJSON(r, &req); err != nil {
		writeValidation(w, "invalid JSON body: "+err.Error())
		return
	}
	req.Title = strings.TrimSpace(req.Title)
	if req.Title == "" {
		writeValidation(w, "title is required")
		return
	}
	in := store.CreateTaskInput{
		Title:       req.Title,
		Description: req.Description,
		Status:      model.StatusTodo,
		Priority:    model.PriorityNone,
		DueDate:     req.DueDate,
		ProjectID:   req.ProjectID,
		AssigneeIDs: req.AssigneeIDs,
	}
	if req.Status != nil {
		if !model.ValidStatus(*req.Status) {
			writeValidation(w, "invalid status: "+string(*req.Status))
			return
		}
		in.Status = *req.Status
	}
	if req.Priority != nil {
		if !model.ValidPriority(*req.Priority) {
			writeValidation(w, "invalid priority: "+string(*req.Priority))
			return
		}
		in.Priority = *req.Priority
	}
	if req.DueDate != nil && !validDate(*req.DueDate) {
		writeValidation(w, "due_date must be formatted as YYYY-MM-DD")
		return
	}
	t, err := s.store.CreateTask(in)
	if err != nil {
		writeStoreError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, t)
}

type updateTaskRequest struct {
	Title       *string                `json:"title"`
	Description *string                `json:"description"`
	Status      *model.Status          `json:"status"`
	Priority    *model.Priority        `json:"priority"`
	DueDate     model.Optional[string] `json:"due_date"`
	ProjectID   model.Optional[int64]  `json:"project_id"`
	AssigneeIDs *[]int64               `json:"assignee_ids"`
}

func (s *server) updateTask(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r)
	if !ok {
		writeValidation(w, "invalid id")
		return
	}
	var req updateTaskRequest
	if err := decodeJSON(r, &req); err != nil {
		writeValidation(w, "invalid JSON body: "+err.Error())
		return
	}
	if req.Title != nil {
		trimmed := strings.TrimSpace(*req.Title)
		if trimmed == "" {
			writeValidation(w, "title must not be empty")
			return
		}
		req.Title = &trimmed
	}
	if req.Status != nil && !model.ValidStatus(*req.Status) {
		writeValidation(w, "invalid status: "+string(*req.Status))
		return
	}
	if req.Priority != nil && !model.ValidPriority(*req.Priority) {
		writeValidation(w, "invalid priority: "+string(*req.Priority))
		return
	}
	if req.DueDate.Set && req.DueDate.Value != nil && !validDate(*req.DueDate.Value) {
		writeValidation(w, "due_date must be formatted as YYYY-MM-DD")
		return
	}
	t, err := s.store.UpdateTask(id, store.UpdateTaskInput{
		Title:       req.Title,
		Description: req.Description,
		Status:      req.Status,
		Priority:    req.Priority,
		DueDate:     req.DueDate,
		ProjectID:   req.ProjectID,
		AssigneeIDs: req.AssigneeIDs,
	})
	if err != nil {
		writeStoreError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, t)
}

type moveTaskRequest struct {
	Status  model.Status `json:"status"`
	AfterID *int64       `json:"after_id"`
}

func (s *server) moveTask(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r)
	if !ok {
		writeValidation(w, "invalid id")
		return
	}
	var req moveTaskRequest
	if err := decodeJSON(r, &req); err != nil {
		writeValidation(w, "invalid JSON body: "+err.Error())
		return
	}
	if !model.ValidStatus(req.Status) {
		writeValidation(w, "invalid status: "+string(req.Status))
		return
	}
	t, err := s.store.MoveTask(id, req.Status, req.AfterID)
	if err != nil {
		writeStoreError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, t)
}

func (s *server) deleteTask(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r)
	if !ok {
		writeValidation(w, "invalid id")
		return
	}
	if err := s.store.DeleteTask(id); err != nil {
		writeStoreError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
