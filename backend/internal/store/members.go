package store

import (
	"database/sql"
	"errors"

	"github.com/shiron-dev/chronova/backend/internal/model"
)

func (s *Store) Workspace() (model.Workspace, error) {
	var w model.Workspace
	err := s.db.QueryRow("SELECT name, task_prefix FROM workspace WHERE id = 1").
		Scan(&w.Name, &w.TaskPrefix)
	return w, err
}

const memberCols = "id, name, type, avatar_color, created_at, updated_at"

func scanMember(row interface{ Scan(...any) error }) (model.Member, error) {
	var m model.Member
	err := row.Scan(&m.ID, &m.Name, &m.Type, &m.AvatarColor, &m.CreatedAt, &m.UpdatedAt)
	return m, err
}

func (s *Store) ListMembers() ([]model.Member, error) {
	rows, err := s.db.Query("SELECT " + memberCols + " FROM members ORDER BY id")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	members := []model.Member{}
	for rows.Next() {
		m, err := scanMember(rows)
		if err != nil {
			return nil, err
		}
		members = append(members, m)
	}
	return members, rows.Err()
}

func (s *Store) GetMember(id int64) (model.Member, error) {
	m, err := scanMember(s.db.QueryRow("SELECT "+memberCols+" FROM members WHERE id = ?", id))
	if errors.Is(err, sql.ErrNoRows) {
		return m, ErrNotFound
	}
	return m, err
}

func (s *Store) CountMembers() (int64, error) {
	var n int64
	err := s.db.QueryRow("SELECT COUNT(*) FROM members").Scan(&n)
	return n, err
}

type CreateMemberInput struct {
	Name        string
	Type        model.MemberType
	AvatarColor string
}

func (s *Store) CreateMember(in CreateMemberInput) (model.Member, error) {
	if in.AvatarColor == "" {
		in.AvatarColor = "#6E79D6"
	}
	ts := now()
	res, err := s.db.Exec(
		"INSERT INTO members (name, type, avatar_color, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
		in.Name, in.Type, in.AvatarColor, ts, ts,
	)
	if err != nil {
		return model.Member{}, err
	}
	id, err := res.LastInsertId()
	if err != nil {
		return model.Member{}, err
	}
	return s.GetMember(id)
}

type UpdateMemberInput struct {
	Name        *string
	Type        *model.MemberType
	AvatarColor *string
}

func (s *Store) UpdateMember(id int64, in UpdateMemberInput) (model.Member, error) {
	m, err := s.GetMember(id)
	if err != nil {
		return model.Member{}, err
	}
	if in.Name != nil {
		m.Name = *in.Name
	}
	if in.Type != nil {
		m.Type = *in.Type
	}
	if in.AvatarColor != nil {
		m.AvatarColor = *in.AvatarColor
	}
	_, err = s.db.Exec(
		"UPDATE members SET name = ?, type = ?, avatar_color = ?, updated_at = ? WHERE id = ?",
		m.Name, m.Type, m.AvatarColor, now(), id,
	)
	if err != nil {
		return model.Member{}, err
	}
	return s.GetMember(id)
}

func (s *Store) DeleteMember(id int64) error {
	res, err := s.db.Exec("DELETE FROM members WHERE id = ?", id)
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
