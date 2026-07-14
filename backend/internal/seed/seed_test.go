package seed_test

import (
	"path/filepath"
	"testing"

	"github.com/shiron-dev/chronova/backend/internal/model"
	"github.com/shiron-dev/chronova/backend/internal/seed"
	"github.com/shiron-dev/chronova/backend/internal/store"
)

func newStore(t *testing.T) *store.Store {
	t.Helper()
	s, err := store.Open(filepath.Join(t.TempDir(), "seed.db"))
	if err != nil {
		t.Fatalf("open store: %v", err)
	}
	t.Cleanup(func() { s.Close() })
	return s
}

func TestSeedPopulatesExpectedData(t *testing.T) {
	s := newStore(t)
	seeded, err := seed.Run(s)
	if err != nil {
		t.Fatalf("seed: %v", err)
	}
	if !seeded {
		t.Fatal("first seed returned false, want true")
	}

	members, err := s.ListMembers()
	if err != nil {
		t.Fatalf("list members: %v", err)
	}
	humans, agents := 0, 0
	for _, m := range members {
		switch m.Type {
		case model.MemberHuman:
			humans++
		case model.MemberAgent:
			agents++
		}
	}
	if humans != 3 || agents != 3 {
		t.Errorf("members = %d humans / %d agents, want 3/3", humans, agents)
	}

	projects, err := s.ListProjects()
	if err != nil {
		t.Fatalf("list projects: %v", err)
	}
	if len(projects) != 3 {
		t.Errorf("projects = %d, want 3", len(projects))
	}

	tasks, err := s.ListTasks(store.TaskFilter{})
	if err != nil {
		t.Fatalf("list tasks: %v", err)
	}
	if len(tasks) != 16 {
		t.Errorf("tasks = %d, want 16", len(tasks))
	}
}

func TestSeedIsIdempotent(t *testing.T) {
	s := newStore(t)
	if _, err := seed.Run(s); err != nil {
		t.Fatalf("seed 1: %v", err)
	}

	// 2回目はメンバーが存在するため no-op
	seeded, err := seed.Run(s)
	if err != nil {
		t.Fatalf("seed 2: %v", err)
	}
	if seeded {
		t.Error("second seed returned true, want false (no-op)")
	}

	members, _ := s.ListMembers()
	tasks, _ := s.ListTasks(store.TaskFilter{})
	if len(members) != 6 {
		t.Errorf("members after re-seed = %d, want 6", len(members))
	}
	if len(tasks) != 16 {
		t.Errorf("tasks after re-seed = %d, want 16", len(tasks))
	}
}
