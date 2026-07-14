package store

import (
	"database/sql"
	"errors"

	"github.com/shiron-dev/chronova/backend/internal/model"
)

// rankStep is the gap left between adjacent tasks so future inserts can
// take the integer midpoint without renumbering.
const rankStep int64 = 1024

// MoveTask places the task into the given status column directly after
// afterID (nil = top of the column). Rank math and any needed rebalance
// happen server-side in one transaction.
func (s *Store) MoveTask(id int64, status model.Status, afterID *int64) (model.Task, error) {
	var moved model.Task
	err := s.inTx(func(tx *sql.Tx) error {
		if _, err := getTask(tx, id); err != nil {
			return err
		}
		newRank, err := computeRank(tx, id, status, afterID)
		if err != nil {
			return err
		}
		if _, err := tx.Exec(
			"UPDATE tasks SET status = ?, sort_order = ?, updated_at = ? WHERE id = ?",
			status, newRank, now(), id,
		); err != nil {
			return err
		}
		moved, err = getTask(tx, id)
		return err
	})
	return moved, err
}

func computeRank(tx *sql.Tx, id int64, status model.Status, afterID *int64) (int64, error) {
	if afterID == nil {
		// Top of column: below the current minimum (excluding the moving task).
		var first sql.NullInt64
		err := tx.QueryRow(
			"SELECT MIN(sort_order) FROM tasks WHERE status = ? AND id != ?", status, id,
		).Scan(&first)
		if err != nil {
			return 0, err
		}
		if !first.Valid {
			return rankStep, nil
		}
		return first.Int64 - rankStep, nil
	}

	if *afterID == id {
		return 0, validationf("after_id must not be the task itself")
	}
	prev, err := afterRank(tx, *afterID, status)
	if err != nil {
		return 0, err
	}
	next, err := nextRank(tx, id, status, prev)
	if err != nil {
		return 0, err
	}
	if !next.Valid {
		return prev + rankStep, nil
	}
	if next.Int64-prev >= 2 {
		return (prev + next.Int64) / 2, nil
	}

	// Gap exhausted: renumber the whole column (excluding the moving task)
	// to multiples of rankStep, then retry the midpoint.
	if err := rebalance(tx, status, id); err != nil {
		return 0, err
	}
	prev, err = afterRank(tx, *afterID, status)
	if err != nil {
		return 0, err
	}
	next, err = nextRank(tx, id, status, prev)
	if err != nil {
		return 0, err
	}
	if !next.Valid {
		return prev + rankStep, nil
	}
	return (prev + next.Int64) / 2, nil
}

// afterRank returns the sort_order of the anchor task, verifying it lives
// in the target column.
func afterRank(tx *sql.Tx, afterID int64, status model.Status) (int64, error) {
	var afterStatus model.Status
	var rank int64
	err := tx.QueryRow("SELECT status, sort_order FROM tasks WHERE id = ?", afterID).
		Scan(&afterStatus, &rank)
	if errors.Is(err, sql.ErrNoRows) {
		return 0, validationf("after_id task %d does not exist", afterID)
	}
	if err != nil {
		return 0, err
	}
	if afterStatus != status {
		return 0, validationf("after_id task %d is not in status %q", afterID, status)
	}
	return rank, nil
}

// nextRank returns the smallest sort_order strictly greater than prev in the
// column, ignoring the moving task itself.
func nextRank(tx *sql.Tx, id int64, status model.Status, prev int64) (sql.NullInt64, error) {
	var next sql.NullInt64
	err := tx.QueryRow(
		"SELECT MIN(sort_order) FROM tasks WHERE status = ? AND sort_order > ? AND id != ?",
		status, prev, id,
	).Scan(&next)
	return next, err
}

func rebalance(tx *sql.Tx, status model.Status, excludeID int64) error {
	rows, err := tx.Query(
		"SELECT id FROM tasks WHERE status = ? AND id != ? ORDER BY sort_order, id",
		status, excludeID,
	)
	if err != nil {
		return err
	}
	ids := []int64{}
	for rows.Next() {
		var tid int64
		if err := rows.Scan(&tid); err != nil {
			rows.Close()
			return err
		}
		ids = append(ids, tid)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return err
	}
	for i, tid := range ids {
		if _, err := tx.Exec("UPDATE tasks SET sort_order = ? WHERE id = ?", rankStep*int64(i+1), tid); err != nil {
			return err
		}
	}
	return nil
}
