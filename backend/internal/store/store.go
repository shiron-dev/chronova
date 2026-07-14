// Package store owns the SQLite database: schema, transactions, and all
// domain logic that must be consistent (task numbering, rank math).
package store

import (
	"database/sql"
	"errors"
	"fmt"
	"net/url"
	"time"

	_ "modernc.org/sqlite"
)

// ErrNotFound is returned when the referenced row does not exist.
var ErrNotFound = errors.New("not found")

// ValidationError describes client input the store refuses to persist
// (bad enum value, dangling reference, …). Handlers map it to HTTP 400.
type ValidationError struct{ Msg string }

func (e *ValidationError) Error() string { return e.Msg }

func validationf(format string, args ...any) error {
	return &ValidationError{Msg: fmt.Sprintf(format, args...)}
}

type Store struct {
	db *sql.DB
}

// Open opens (creating if needed) the SQLite database at path and runs
// pending migrations. Use ":memory:" for an in-memory database.
func Open(path string) (*Store, error) {
	dsn := "file:" + url.PathEscape(path) + "?_pragma=foreign_keys(1)&_pragma=busy_timeout(5000)&_pragma=journal_mode(WAL)"
	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, fmt.Errorf("open sqlite: %w", err)
	}
	// Single writer connection: eliminates SQLITE_BUSY at this app's scale.
	db.SetMaxOpenConns(1)
	if err := migrate(db); err != nil {
		db.Close()
		return nil, err
	}
	return &Store{db: db}, nil
}

func (s *Store) Close() error { return s.db.Close() }

func now() string { return time.Now().UTC().Format(time.RFC3339) }

// inTx runs fn inside a transaction, committing on nil error.
func (s *Store) inTx(fn func(tx *sql.Tx) error) error {
	tx, err := s.db.Begin()
	if err != nil {
		return err
	}
	if err := fn(tx); err != nil {
		tx.Rollback()
		return err
	}
	return tx.Commit()
}
