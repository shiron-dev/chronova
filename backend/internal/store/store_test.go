package store

import (
	"errors"
	"path/filepath"
	"testing"

	"github.com/shiron-dev/chronova/backend/internal/model"
)

func newStore(t *testing.T) *Store {
	t.Helper()
	s, err := Open(filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatalf("open store: %v", err)
	}
	t.Cleanup(func() { s.Close() })
	return s
}

func mustCreateTask(t *testing.T, s *Store, in CreateTaskInput) model.Task {
	t.Helper()
	if in.Status == "" {
		in.Status = model.StatusTodo
	}
	if in.Priority == "" {
		in.Priority = model.PriorityNone
	}
	task, err := s.CreateTask(in)
	if err != nil {
		t.Fatalf("create task %q: %v", in.Title, err)
	}
	return task
}

func mustCreateMember(t *testing.T, s *Store, name string, typ model.MemberType) model.Member {
	t.Helper()
	m, err := s.CreateMember(CreateMemberInput{Name: name, Type: typ})
	if err != nil {
		t.Fatalf("create member %q: %v", name, err)
	}
	return m
}

func TestOpenRunsMigrations(t *testing.T) {
	s := newStore(t)
	var version int
	if err := s.db.QueryRow("PRAGMA user_version").Scan(&version); err != nil {
		t.Fatalf("read user_version: %v", err)
	}
	if version != 1 {
		t.Errorf("user_version = %d, want 1", version)
	}
	ws, err := s.Workspace()
	if err != nil {
		t.Fatalf("workspace: %v", err)
	}
	if ws.TaskPrefix != "CHR" {
		t.Errorf("task_prefix = %q, want CHR", ws.TaskPrefix)
	}
}

func TestReopenIsIdempotent(t *testing.T) {
	path := filepath.Join(t.TempDir(), "reopen.db")
	s1, err := Open(path)
	if err != nil {
		t.Fatalf("open 1: %v", err)
	}
	if _, err := s1.CreateMember(CreateMemberInput{Name: "田中", Type: model.MemberHuman}); err != nil {
		t.Fatalf("create member: %v", err)
	}
	s1.Close()

	// 同じDBを開き直しても再マイグレーションで失敗せず、データも保持される
	s2, err := Open(path)
	if err != nil {
		t.Fatalf("reopen: %v", err)
	}
	defer s2.Close()
	members, err := s2.ListMembers()
	if err != nil {
		t.Fatalf("list members: %v", err)
	}
	if len(members) != 1 || members[0].Name != "田中" {
		t.Errorf("members after reopen = %+v", members)
	}
	var version int
	if err := s2.db.QueryRow("PRAGMA user_version").Scan(&version); err != nil {
		t.Fatalf("read user_version: %v", err)
	}
	if version != 1 {
		t.Errorf("user_version after reopen = %d, want 1", version)
	}
}

func TestTaskNumberingSequence(t *testing.T) {
	s := newStore(t)
	seen := map[int64]bool{}
	for i := 1; i <= 5; i++ {
		task := mustCreateTask(t, s, CreateTaskInput{Title: "T"})
		if int(task.Number) != i {
			t.Errorf("task %d number = %d, want %d", i, task.Number, i)
		}
		if seen[task.Number] {
			t.Errorf("duplicate number %d", task.Number)
		}
		seen[task.Number] = true
	}
}

func TestCascadeDeleteTaskRemovesAssignees(t *testing.T) {
	s := newStore(t)
	m := mustCreateMember(t, s, "佐藤", model.MemberHuman)
	task := mustCreateTask(t, s, CreateTaskInput{Title: "x", AssigneeIDs: []int64{m.ID}})
	if err := s.DeleteTask(task.ID); err != nil {
		t.Fatalf("delete task: %v", err)
	}
	var n int
	if err := s.db.QueryRow("SELECT COUNT(*) FROM task_assignees WHERE task_id = ?", task.ID).Scan(&n); err != nil {
		t.Fatalf("count assignees: %v", err)
	}
	if n != 0 {
		t.Errorf("task_assignees rows after delete = %d, want 0", n)
	}
}

func TestCascadeDeleteMemberUnassigns(t *testing.T) {
	s := newStore(t)
	m1 := mustCreateMember(t, s, "A", model.MemberHuman)
	m2 := mustCreateMember(t, s, "B", model.MemberAgent)
	task := mustCreateTask(t, s, CreateTaskInput{Title: "x", AssigneeIDs: []int64{m1.ID, m2.ID}})
	if err := s.DeleteMember(m1.ID); err != nil {
		t.Fatalf("delete member: %v", err)
	}
	got, err := s.GetTask(task.ID)
	if err != nil {
		t.Fatalf("get task: %v", err)
	}
	if len(got.Assignees) != 1 || got.Assignees[0].ID != m2.ID {
		t.Errorf("assignees after member delete = %+v", got.Assignees)
	}
}

func TestDeleteProjectOrphansTasks(t *testing.T) {
	s := newStore(t)
	p, err := s.CreateProject(CreateProjectInput{Name: "P"})
	if err != nil {
		t.Fatalf("create project: %v", err)
	}
	task := mustCreateTask(t, s, CreateTaskInput{Title: "x", ProjectID: &p.ID})
	if err := s.DeleteProject(p.ID); err != nil {
		t.Fatalf("delete project: %v", err)
	}
	got, err := s.GetTask(task.ID)
	if err != nil {
		t.Fatalf("get task: %v", err)
	}
	if got.Project != nil {
		t.Errorf("task project after delete = %+v, want nil", got.Project)
	}
}

func TestListTasksFiltersAreANDed(t *testing.T) {
	s := newStore(t)
	m := mustCreateMember(t, s, "担当", model.MemberHuman)
	p1, _ := s.CreateProject(CreateProjectInput{Name: "P1"})
	p2, _ := s.CreateProject(CreateProjectInput{Name: "P2"})

	mustCreateTask(t, s, CreateTaskInput{Title: "a", Status: model.StatusTodo, ProjectID: &p1.ID, AssigneeIDs: []int64{m.ID}})
	mustCreateTask(t, s, CreateTaskInput{Title: "b", Status: model.StatusDone, ProjectID: &p1.ID})
	mustCreateTask(t, s, CreateTaskInput{Title: "c", Status: model.StatusTodo, ProjectID: &p2.ID})

	cases := []struct {
		name   string
		filter TaskFilter
		want   int
	}{
		{"project only", TaskFilter{ProjectID: &p1.ID}, 2},
		{"status only", TaskFilter{Statuses: []model.Status{model.StatusTodo}}, 2},
		{"multi status", TaskFilter{Statuses: []model.Status{model.StatusTodo, model.StatusDone}}, 3},
		{"assignee only", TaskFilter{AssigneeID: &m.ID}, 1},
		{"project AND status", TaskFilter{ProjectID: &p1.ID, Statuses: []model.Status{model.StatusTodo}}, 1},
		{"project AND assignee", TaskFilter{ProjectID: &p2.ID, AssigneeID: &m.ID}, 0},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			tasks, err := s.ListTasks(tc.filter)
			if err != nil {
				t.Fatalf("list: %v", err)
			}
			if len(tasks) != tc.want {
				t.Errorf("got %d tasks, want %d", len(tasks), tc.want)
			}
		})
	}
}

func TestQueryLikeEscaping(t *testing.T) {
	s := newStore(t)
	mustCreateTask(t, s, CreateTaskInput{Title: "50% 割引"})
	mustCreateTask(t, s, CreateTaskInput{Title: "50 割引"})
	mustCreateTask(t, s, CreateTaskInput{Title: "a_b 記法"})
	mustCreateTask(t, s, CreateTaskInput{Title: "axb 記法"})

	// '%' はワイルドカードでなくリテラルとして扱われる
	pct, err := s.ListTasks(TaskFilter{Query: "%"})
	if err != nil {
		t.Fatalf("list %%: %v", err)
	}
	if len(pct) != 1 || pct[0].Title != "50% 割引" {
		t.Errorf("query '%%' matched %d: %+v", len(pct), titles(pct))
	}

	// '_' も同様にリテラル(単一文字ワイルドカードにならない)
	us, err := s.ListTasks(TaskFilter{Query: "_"})
	if err != nil {
		t.Fatalf("list _: %v", err)
	}
	if len(us) != 1 || us[0].Title != "a_b 記法" {
		t.Errorf("query '_' matched %d: %+v", len(us), titles(us))
	}
}

func TestAssigneeOrderStable(t *testing.T) {
	s := newStore(t)
	m1 := mustCreateMember(t, s, "1", model.MemberHuman)
	m2 := mustCreateMember(t, s, "2", model.MemberHuman)
	m3 := mustCreateMember(t, s, "3", model.MemberHuman)
	// 逆順で割り当てても member id 昇順で返る
	task := mustCreateTask(t, s, CreateTaskInput{Title: "x", AssigneeIDs: []int64{m3.ID, m1.ID, m2.ID}})
	got := []int64{}
	for _, a := range task.Assignees {
		got = append(got, a.ID)
	}
	want := []int64{m1.ID, m2.ID, m3.ID}
	if len(got) != 3 || got[0] != want[0] || got[1] != want[1] || got[2] != want[2] {
		t.Errorf("assignee order = %v, want %v", got, want)
	}
}

func TestReplaceAssigneesDedups(t *testing.T) {
	s := newStore(t)
	m1 := mustCreateMember(t, s, "1", model.MemberHuman)
	m2 := mustCreateMember(t, s, "2", model.MemberHuman)
	task := mustCreateTask(t, s, CreateTaskInput{Title: "x"})
	ids := []int64{m1.ID, m1.ID, m2.ID}
	got, err := s.UpdateTask(task.ID, UpdateTaskInput{AssigneeIDs: &ids})
	if err != nil {
		t.Fatalf("update: %v", err)
	}
	if len(got.Assignees) != 2 {
		t.Errorf("assignees after dedup = %d, want 2", len(got.Assignees))
	}
}

func TestValidationErrors(t *testing.T) {
	s := newStore(t)
	bad := int64(9999)
	if _, err := s.CreateTask(CreateTaskInput{Title: "x", Status: model.StatusTodo, Priority: model.PriorityNone, ProjectID: &bad}); !isValidation(err) {
		t.Errorf("create with bad project: err = %v, want ValidationError", err)
	}
	if _, err := s.CreateTask(CreateTaskInput{Title: "x", Status: model.StatusTodo, Priority: model.PriorityNone, AssigneeIDs: []int64{bad}}); !isValidation(err) {
		t.Errorf("create with bad assignee: err = %v, want ValidationError", err)
	}
	if _, err := s.GetTask(9999); !errors.Is(err, ErrNotFound) {
		t.Errorf("get missing: err = %v, want ErrNotFound", err)
	}
}

func isValidation(err error) bool {
	var ve *ValidationError
	return errors.As(err, &ve)
}

func titles(tasks []model.Task) []string {
	out := []string{}
	for _, t := range tasks {
		out = append(out, t.Title)
	}
	return out
}
