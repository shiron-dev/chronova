package store

import (
	"database/sql"
	"errors"
	"fmt"
	"strings"

	"github.com/shiron-dev/chronova/backend/internal/model"
)

// queryer is satisfied by both *sql.DB and *sql.Tx.
type queryer interface {
	Query(query string, args ...any) (*sql.Rows, error)
	QueryRow(query string, args ...any) *sql.Row
	Exec(query string, args ...any) (sql.Result, error)
}

const taskSelect = `
	SELECT t.id, t.number, t.title, t.description, t.status, t.priority, t.due_date,
	       t.project_id, p.name, p.color, p.icon,
	       t.sort_order, t.created_at, t.updated_at
	  FROM tasks t LEFT JOIN projects p ON p.id = t.project_id`

func scanTask(row interface{ Scan(...any) error }, prefix string) (model.Task, error) {
	var (
		t         model.Task
		dueDate   sql.NullString
		projID    sql.NullInt64
		projName  sql.NullString
		projColor sql.NullString
		projIcon  sql.NullString
	)
	err := row.Scan(&t.ID, &t.Number, &t.Title, &t.Description, &t.Status, &t.Priority, &dueDate,
		&projID, &projName, &projColor, &projIcon,
		&t.SortOrder, &t.CreatedAt, &t.UpdatedAt)
	if err != nil {
		return t, err
	}
	if dueDate.Valid {
		t.DueDate = &dueDate.String
	}
	if projID.Valid {
		t.Project = &model.ProjectRef{
			ID: projID.Int64, Name: projName.String, Color: projColor.String, Icon: projIcon.String,
		}
	}
	t.Identifier = fmt.Sprintf("%s-%d", prefix, t.Number)
	t.Assignees = []model.AssigneeRef{}
	return t, nil
}

func taskPrefix(q queryer) (string, error) {
	var prefix string
	err := q.QueryRow("SELECT task_prefix FROM workspace WHERE id = 1").Scan(&prefix)
	return prefix, err
}

// loadAssignees fills Assignees for every task in the slice with one IN query.
func loadAssignees(q queryer, tasks []model.Task) error {
	if len(tasks) == 0 {
		return nil
	}
	byID := make(map[int64]*model.Task, len(tasks))
	placeholders := make([]string, 0, len(tasks))
	args := make([]any, 0, len(tasks))
	for i := range tasks {
		byID[tasks[i].ID] = &tasks[i]
		placeholders = append(placeholders, "?")
		args = append(args, tasks[i].ID)
	}
	rows, err := q.Query(`
		SELECT ta.task_id, m.id, m.name, m.type, m.avatar_color
		  FROM task_assignees ta JOIN members m ON m.id = ta.member_id
		 WHERE ta.task_id IN (`+strings.Join(placeholders, ",")+`)
		 ORDER BY m.id`, args...)
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
		var taskID int64
		var a model.AssigneeRef
		if err := rows.Scan(&taskID, &a.ID, &a.Name, &a.Type, &a.AvatarColor); err != nil {
			return err
		}
		if t, ok := byID[taskID]; ok {
			t.Assignees = append(t.Assignees, a)
		}
	}
	return rows.Err()
}

type TaskFilter struct {
	ProjectID  *int64
	Statuses   []model.Status
	AssigneeID *int64
	Query      string
}

func (s *Store) ListTasks(f TaskFilter) ([]model.Task, error) {
	prefix, err := taskPrefix(s.db)
	if err != nil {
		return nil, err
	}
	where := []string{"1=1"}
	args := []any{}
	if f.ProjectID != nil {
		where = append(where, "t.project_id = ?")
		args = append(args, *f.ProjectID)
	}
	if len(f.Statuses) > 0 {
		ph := make([]string, len(f.Statuses))
		for i, st := range f.Statuses {
			ph[i] = "?"
			args = append(args, st)
		}
		where = append(where, "t.status IN ("+strings.Join(ph, ",")+")")
	}
	if f.AssigneeID != nil {
		where = append(where, "EXISTS (SELECT 1 FROM task_assignees ta WHERE ta.task_id = t.id AND ta.member_id = ?)")
		args = append(args, *f.AssigneeID)
	}
	if f.Query != "" {
		where = append(where, "t.title LIKE ? ESCAPE '\\'")
		escaped := strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`).Replace(f.Query)
		args = append(args, "%"+escaped+"%")
	}
	rows, err := s.db.Query(taskSelect+" WHERE "+strings.Join(where, " AND ")+" ORDER BY t.status, t.sort_order, t.id", args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	tasks := []model.Task{}
	for rows.Next() {
		t, err := scanTask(rows, prefix)
		if err != nil {
			return nil, err
		}
		tasks = append(tasks, t)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if err := loadAssignees(s.db, tasks); err != nil {
		return nil, err
	}
	return tasks, nil
}

func getTask(q queryer, id int64) (model.Task, error) {
	prefix, err := taskPrefix(q)
	if err != nil {
		return model.Task{}, err
	}
	t, err := scanTask(q.QueryRow(taskSelect+" WHERE t.id = ?", id), prefix)
	if errors.Is(err, sql.ErrNoRows) {
		return t, ErrNotFound
	}
	if err != nil {
		return t, err
	}
	tasks := []model.Task{t}
	if err := loadAssignees(q, tasks); err != nil {
		return t, err
	}
	return tasks[0], nil
}

func (s *Store) GetTask(id int64) (model.Task, error) {
	return getTask(s.db, id)
}

func maxRank(q queryer, status model.Status) (int64, error) {
	var max int64
	err := q.QueryRow("SELECT COALESCE(MAX(sort_order), 0) FROM tasks WHERE status = ?", status).Scan(&max)
	return max, err
}

func projectExists(q queryer, id int64) error {
	var one int
	err := q.QueryRow("SELECT 1 FROM projects WHERE id = ?", id).Scan(&one)
	if errors.Is(err, sql.ErrNoRows) {
		return validationf("project %d does not exist", id)
	}
	return err
}

// replaceAssignees swaps the full assignee set of a task, validating that
// every member exists.
func replaceAssignees(q queryer, taskID int64, memberIDs []int64) error {
	for _, id := range memberIDs {
		var one int
		err := q.QueryRow("SELECT 1 FROM members WHERE id = ?", id).Scan(&one)
		if errors.Is(err, sql.ErrNoRows) {
			return validationf("member %d does not exist", id)
		}
		if err != nil {
			return err
		}
	}
	if _, err := q.Exec("DELETE FROM task_assignees WHERE task_id = ?", taskID); err != nil {
		return err
	}
	seen := map[int64]bool{}
	for _, id := range memberIDs {
		if seen[id] {
			continue
		}
		seen[id] = true
		if _, err := q.Exec("INSERT INTO task_assignees (task_id, member_id) VALUES (?, ?)", taskID, id); err != nil {
			return err
		}
	}
	return nil
}

type CreateTaskInput struct {
	Title       string
	Description string
	Status      model.Status
	Priority    model.Priority
	DueDate     *string
	ProjectID   *int64
	AssigneeIDs []int64
}

// CreateTask assigns the next workspace task number and appends the task to
// the bottom of its status column, all in one transaction.
func (s *Store) CreateTask(in CreateTaskInput) (model.Task, error) {
	var created model.Task
	err := s.inTx(func(tx *sql.Tx) error {
		if in.ProjectID != nil {
			if err := projectExists(tx, *in.ProjectID); err != nil {
				return err
			}
		}
		var number int64
		err := tx.QueryRow(
			"UPDATE workspace SET next_task_number = next_task_number + 1 WHERE id = 1 RETURNING next_task_number - 1",
		).Scan(&number)
		if err != nil {
			return fmt.Errorf("allocate task number: %w", err)
		}
		max, err := maxRank(tx, in.Status)
		if err != nil {
			return err
		}
		ts := now()
		res, err := tx.Exec(`
			INSERT INTO tasks (number, title, description, status, priority, due_date, project_id, sort_order, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			number, in.Title, in.Description, in.Status, in.Priority, in.DueDate, in.ProjectID, max+rankStep, ts, ts,
		)
		if err != nil {
			return err
		}
		id, err := res.LastInsertId()
		if err != nil {
			return err
		}
		if len(in.AssigneeIDs) > 0 {
			if err := replaceAssignees(tx, id, in.AssigneeIDs); err != nil {
				return err
			}
		}
		created, err = getTask(tx, id)
		return err
	})
	return created, err
}

type UpdateTaskInput struct {
	Title       *string
	Description *string
	Status      *model.Status
	Priority    *model.Priority
	DueDate     model.Optional[string]
	ProjectID   model.Optional[int64]
	AssigneeIDs *[]int64
}

// UpdateTask applies a partial update. A plain status change appends the
// task to the bottom of its new column (explicit positioning is MoveTask's job).
func (s *Store) UpdateTask(id int64, in UpdateTaskInput) (model.Task, error) {
	var updated model.Task
	err := s.inTx(func(tx *sql.Tx) error {
		cur, err := getTask(tx, id)
		if err != nil {
			return err
		}
		title, desc, status, prio := cur.Title, cur.Description, cur.Status, cur.Priority
		sortOrder := cur.SortOrder
		dueDate := cur.DueDate
		var projectID *int64
		if cur.Project != nil {
			projectID = &cur.Project.ID
		}
		if in.Title != nil {
			title = *in.Title
		}
		if in.Description != nil {
			desc = *in.Description
		}
		if in.Priority != nil {
			prio = *in.Priority
		}
		if in.Status != nil && *in.Status != status {
			status = *in.Status
			max, err := maxRank(tx, status)
			if err != nil {
				return err
			}
			sortOrder = max + rankStep
		}
		if in.DueDate.Set {
			dueDate = in.DueDate.Value
		}
		if in.ProjectID.Set {
			if in.ProjectID.Value != nil {
				if err := projectExists(tx, *in.ProjectID.Value); err != nil {
					return err
				}
			}
			projectID = in.ProjectID.Value
		}
		_, err = tx.Exec(`
			UPDATE tasks SET title = ?, description = ?, status = ?, priority = ?, due_date = ?,
			                 project_id = ?, sort_order = ?, updated_at = ?
			 WHERE id = ?`,
			title, desc, status, prio, dueDate, projectID, sortOrder, now(), id,
		)
		if err != nil {
			return err
		}
		if in.AssigneeIDs != nil {
			if err := replaceAssignees(tx, id, *in.AssigneeIDs); err != nil {
				return err
			}
		}
		updated, err = getTask(tx, id)
		return err
	})
	return updated, err
}

func (s *Store) DeleteTask(id int64) error {
	res, err := s.db.Exec("DELETE FROM tasks WHERE id = ?", id)
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
