package store

import (
	"database/sql"
	"errors"

	"github.com/shiron-dev/chronova/backend/internal/model"
)

const projectCols = "p.id, p.name, p.description, p.color, p.icon, p.created_at, p.updated_at"

func scanProject(row interface{ Scan(...any) error }, withCount bool) (model.Project, error) {
	var p model.Project
	dest := []any{&p.ID, &p.Name, &p.Description, &p.Color, &p.Icon, &p.CreatedAt, &p.UpdatedAt}
	if withCount {
		dest = append(dest, &p.TaskCount)
	}
	err := row.Scan(dest...)
	return p, err
}

// ListProjects returns all projects with their open (not done/canceled) task count.
func (s *Store) ListProjects() ([]model.Project, error) {
	rows, err := s.db.Query(`
		SELECT ` + projectCols + `,
		       (SELECT COUNT(*) FROM tasks t
		         WHERE t.project_id = p.id AND t.status NOT IN ('done','canceled')) AS task_count
		  FROM projects p ORDER BY p.id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	projects := []model.Project{}
	for rows.Next() {
		p, err := scanProject(rows, true)
		if err != nil {
			return nil, err
		}
		projects = append(projects, p)
	}
	return projects, rows.Err()
}

func (s *Store) GetProject(id int64) (model.Project, error) {
	p, err := scanProject(s.db.QueryRow(`
		SELECT `+projectCols+`,
		       (SELECT COUNT(*) FROM tasks t
		         WHERE t.project_id = p.id AND t.status NOT IN ('done','canceled')) AS task_count
		  FROM projects p WHERE p.id = ?`, id), true)
	if errors.Is(err, sql.ErrNoRows) {
		return p, ErrNotFound
	}
	return p, err
}

type CreateProjectInput struct {
	Name        string
	Description string
	Color       string
	Icon        string
}

func (s *Store) CreateProject(in CreateProjectInput) (model.Project, error) {
	if in.Color == "" {
		in.Color = "#5E6AD2"
	}
	if in.Icon == "" {
		in.Icon = "box"
	}
	ts := now()
	res, err := s.db.Exec(
		"INSERT INTO projects (name, description, color, icon, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
		in.Name, in.Description, in.Color, in.Icon, ts, ts,
	)
	if err != nil {
		return model.Project{}, err
	}
	id, err := res.LastInsertId()
	if err != nil {
		return model.Project{}, err
	}
	return s.GetProject(id)
}

type UpdateProjectInput struct {
	Name        *string
	Description *string
	Color       *string
	Icon        *string
}

func (s *Store) UpdateProject(id int64, in UpdateProjectInput) (model.Project, error) {
	p, err := s.GetProject(id)
	if err != nil {
		return model.Project{}, err
	}
	if in.Name != nil {
		p.Name = *in.Name
	}
	if in.Description != nil {
		p.Description = *in.Description
	}
	if in.Color != nil {
		p.Color = *in.Color
	}
	if in.Icon != nil {
		p.Icon = *in.Icon
	}
	_, err = s.db.Exec(
		"UPDATE projects SET name = ?, description = ?, color = ?, icon = ?, updated_at = ? WHERE id = ?",
		p.Name, p.Description, p.Color, p.Icon, now(), id,
	)
	if err != nil {
		return model.Project{}, err
	}
	return s.GetProject(id)
}

// DeleteProject removes the project; its tasks are orphaned (project_id → NULL).
func (s *Store) DeleteProject(id int64) error {
	res, err := s.db.Exec("DELETE FROM projects WHERE id = ?", id)
	if err != nil {
		return err
	}
	n, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if n == 0 {
		return ErrNotFound
	}
	return nil
}
