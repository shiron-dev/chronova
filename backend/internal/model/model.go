// Package model defines the domain types shared by the store and API layers.
package model

import (
	"encoding/json"
	"fmt"
)

type MemberType string

const (
	MemberHuman MemberType = "human"
	MemberAgent MemberType = "agent"
)

func ValidMemberType(t MemberType) bool {
	return t == MemberHuman || t == MemberAgent
}

type Status string

const (
	StatusBacklog    Status = "backlog"
	StatusTodo       Status = "todo"
	StatusInProgress Status = "in_progress"
	StatusDone       Status = "done"
	StatusCanceled   Status = "canceled"
)

// StatusOrder is the canonical display order of the workflow.
var StatusOrder = []Status{StatusBacklog, StatusTodo, StatusInProgress, StatusDone, StatusCanceled}

func ValidStatus(s Status) bool {
	for _, v := range StatusOrder {
		if s == v {
			return true
		}
	}
	return false
}

type Priority string

const (
	PriorityNone   Priority = "none"
	PriorityLow    Priority = "low"
	PriorityMedium Priority = "medium"
	PriorityHigh   Priority = "high"
	PriorityUrgent Priority = "urgent"
)

func ValidPriority(p Priority) bool {
	switch p {
	case PriorityNone, PriorityLow, PriorityMedium, PriorityHigh, PriorityUrgent:
		return true
	}
	return false
}

type Workspace struct {
	Name       string `json:"name"`
	TaskPrefix string `json:"task_prefix"`
}

type Member struct {
	ID          int64      `json:"id"`
	Name        string     `json:"name"`
	Type        MemberType `json:"type"`
	AvatarColor string     `json:"avatar_color"`
	CreatedAt   string     `json:"created_at"`
	UpdatedAt   string     `json:"updated_at"`
}

type Project struct {
	ID          int64  `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Color       string `json:"color"`
	Icon        string `json:"icon"`
	TaskCount   int64  `json:"task_count"`
	CreatedAt   string `json:"created_at"`
	UpdatedAt   string `json:"updated_at"`
}

// ProjectRef is the compact project shape embedded in task responses.
type ProjectRef struct {
	ID    int64  `json:"id"`
	Name  string `json:"name"`
	Color string `json:"color"`
	Icon  string `json:"icon"`
}

// AssigneeRef is the compact member shape embedded in task responses.
type AssigneeRef struct {
	ID          int64      `json:"id"`
	Name        string     `json:"name"`
	Type        MemberType `json:"type"`
	AvatarColor string     `json:"avatar_color"`
}

type Task struct {
	ID          int64         `json:"id"`
	Number      int64         `json:"number"`
	Identifier  string        `json:"identifier"`
	Title       string        `json:"title"`
	Description string        `json:"description"`
	Status      Status        `json:"status"`
	Priority    Priority      `json:"priority"`
	DueDate     *string       `json:"due_date"`
	Project     *ProjectRef   `json:"project"`
	Assignees   []AssigneeRef `json:"assignees"`
	SortOrder   int64         `json:"sort_order"`
	CreatedAt   string        `json:"created_at"`
	UpdatedAt   string        `json:"updated_at"`
}

// Optional distinguishes "field absent" from "field explicitly null" in
// PATCH bodies. Absent → Set == false; present (value or null) → Set == true.
type Optional[T any] struct {
	Set   bool
	Value *T
}

func (o *Optional[T]) UnmarshalJSON(b []byte) error {
	o.Set = true
	if string(b) == "null" {
		o.Value = nil
		return nil
	}
	var v T
	if err := json.Unmarshal(b, &v); err != nil {
		return fmt.Errorf("optional: %w", err)
	}
	o.Value = &v
	return nil
}
