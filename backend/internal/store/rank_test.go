package store

import (
	"errors"
	"fmt"
	"testing"

	"github.com/shiron-dev/chronova/backend/internal/model"
)

// columnTitles は指定ステータスのタスクタイトルを sort_order 昇順で返す。
func columnTitles(t *testing.T, s *Store, status model.Status) []string {
	t.Helper()
	tasks, err := s.ListTasks(TaskFilter{Statuses: []model.Status{status}})
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	out := []string{}
	for _, task := range tasks {
		out = append(out, task.Title)
	}
	return out
}

func eqStrings(a, b []string) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}

func TestCreateAppendsToColumnBottom(t *testing.T) {
	s := newStore(t)
	a := mustCreateTask(t, s, CreateTaskInput{Title: "A", Status: model.StatusTodo})
	b := mustCreateTask(t, s, CreateTaskInput{Title: "B", Status: model.StatusTodo})
	c := mustCreateTask(t, s, CreateTaskInput{Title: "C", Status: model.StatusTodo})
	if !(a.SortOrder < b.SortOrder && b.SortOrder < c.SortOrder) {
		t.Errorf("orders not increasing: %d, %d, %d", a.SortOrder, b.SortOrder, c.SortOrder)
	}
	if a.SortOrder != rankStep {
		t.Errorf("first sort_order = %d, want %d", a.SortOrder, rankStep)
	}
}

func TestMoveMidpoint(t *testing.T) {
	s := newStore(t)
	a := mustCreateTask(t, s, CreateTaskInput{Title: "A", Status: model.StatusTodo})
	mustCreateTask(t, s, CreateTaskInput{Title: "B", Status: model.StatusTodo})
	c := mustCreateTask(t, s, CreateTaskInput{Title: "C", Status: model.StatusTodo})

	// C を A の直後へ → A, C, B
	moved, err := s.MoveTask(c.ID, model.StatusTodo, &a.ID)
	if err != nil {
		t.Fatalf("move: %v", err)
	}
	if moved.SortOrder <= a.SortOrder {
		t.Errorf("moved rank %d should exceed anchor %d", moved.SortOrder, a.SortOrder)
	}
	if got := columnTitles(t, s, model.StatusTodo); !eqStrings(got, []string{"A", "C", "B"}) {
		t.Errorf("order = %v, want [A C B]", got)
	}
}

func TestMoveToTop(t *testing.T) {
	s := newStore(t)
	mustCreateTask(t, s, CreateTaskInput{Title: "A", Status: model.StatusTodo})
	b := mustCreateTask(t, s, CreateTaskInput{Title: "B", Status: model.StatusTodo})

	moved, err := s.MoveTask(b.ID, model.StatusTodo, nil)
	if err != nil {
		t.Fatalf("move: %v", err)
	}
	// 先頭移動は現在の最小(A=1024)未満になるはず
	if moved.SortOrder >= rankStep {
		t.Errorf("top move rank = %d, want < %d", moved.SortOrder, rankStep)
	}
	if got := columnTitles(t, s, model.StatusTodo); !eqStrings(got, []string{"B", "A"}) {
		t.Errorf("order = %v, want [B A]", got)
	}
}

func TestMoveCrossColumn(t *testing.T) {
	s := newStore(t)
	a := mustCreateTask(t, s, CreateTaskInput{Title: "A", Status: model.StatusTodo})
	mustCreateTask(t, s, CreateTaskInput{Title: "B", Status: model.StatusTodo})

	moved, err := s.MoveTask(a.ID, model.StatusInProgress, nil)
	if err != nil {
		t.Fatalf("move: %v", err)
	}
	if moved.Status != model.StatusInProgress {
		t.Errorf("status = %s, want in_progress", moved.Status)
	}
	if got := columnTitles(t, s, model.StatusTodo); !eqStrings(got, []string{"B"}) {
		t.Errorf("source column = %v, want [B]", got)
	}
	if got := columnTitles(t, s, model.StatusInProgress); !eqStrings(got, []string{"A"}) {
		t.Errorf("target column = %v, want [A]", got)
	}
}

func TestMoveValidation(t *testing.T) {
	s := newStore(t)
	a := mustCreateTask(t, s, CreateTaskInput{Title: "A", Status: model.StatusTodo})
	b := mustCreateTask(t, s, CreateTaskInput{Title: "B", Status: model.StatusInProgress})

	// アンカーが別カラムにある
	if _, err := s.MoveTask(a.ID, model.StatusTodo, &b.ID); !isValidation(err) {
		t.Errorf("anchor in other column: err = %v, want ValidationError", err)
	}
	// アンカーが自分自身
	if _, err := s.MoveTask(a.ID, model.StatusTodo, &a.ID); !isValidation(err) {
		t.Errorf("anchor is self: err = %v, want ValidationError", err)
	}
	// アンカーが存在しない
	missing := int64(9999)
	if _, err := s.MoveTask(a.ID, model.StatusTodo, &missing); !isValidation(err) {
		t.Errorf("missing anchor: err = %v, want ValidationError", err)
	}
	// 移動対象が存在しない
	if _, err := s.MoveTask(9999, model.StatusTodo, nil); !errors.Is(err, ErrNotFound) {
		t.Errorf("missing task: err = %v, want ErrNotFound", err)
	}
}

func TestMoveForcesRebalance(t *testing.T) {
	s := newStore(t)
	mustCreateTask(t, s, CreateTaskInput{Title: "top", Status: model.StatusTodo})
	mustCreateTask(t, s, CreateTaskInput{Title: "bottom", Status: model.StatusTodo})

	tasks, _ := s.ListTasks(TaskFilter{Statuses: []model.Status{model.StatusTodo}})
	topID := tasks[0].ID
	want := []string{"top"}
	// top の直後へ繰返し挿入すると 1024 のギャップが枯渇し、内部でリバランスが走る
	for i := 0; i < 15; i++ {
		task := mustCreateTask(t, s, CreateTaskInput{Title: fmt.Sprintf("w%d", i), Status: model.StatusTodo})
		if _, err := s.MoveTask(task.ID, model.StatusTodo, &topID); err != nil {
			t.Fatalf("move w%d: %v", i, err)
		}
		want = append(want[:1], append([]string{task.Title}, want[1:]...)...)
	}
	want = append(want, "bottom")

	if got := columnTitles(t, s, model.StatusTodo); !eqStrings(got, want) {
		t.Fatalf("order after rebalance:\n got %v\nwant %v", got, want)
	}

	// リバランス後もランクは厳密増加かつ一意
	final, _ := s.ListTasks(TaskFilter{Statuses: []model.Status{model.StatusTodo}})
	for i := 1; i < len(final); i++ {
		if final[i].SortOrder <= final[i-1].SortOrder {
			t.Fatalf("sort_order not strictly increasing at %d: %d <= %d",
				i, final[i].SortOrder, final[i-1].SortOrder)
		}
	}
}

func TestStatusChangeAppendsToBottom(t *testing.T) {
	s := newStore(t)
	existing := mustCreateTask(t, s, CreateTaskInput{Title: "既存", Status: model.StatusInProgress})
	task := mustCreateTask(t, s, CreateTaskInput{Title: "移動", Status: model.StatusTodo})

	st := model.StatusInProgress
	got, err := s.UpdateTask(task.ID, UpdateTaskInput{Status: &st})
	if err != nil {
		t.Fatalf("update: %v", err)
	}
	if got.SortOrder <= existing.SortOrder {
		t.Errorf("status change should append below existing: got %d, existing %d",
			got.SortOrder, existing.SortOrder)
	}
}
