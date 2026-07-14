package api_test

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"testing"

	"github.com/shiron-dev/chronova/backend/internal/api"
	"github.com/shiron-dev/chronova/backend/internal/model"
	"github.com/shiron-dev/chronova/backend/internal/store"
)

type client struct {
	t   *testing.T
	srv *httptest.Server
}

func newClient(t *testing.T) *client {
	t.Helper()
	st, err := store.Open(filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatalf("open store: %v", err)
	}
	t.Cleanup(func() { st.Close() })
	srv := httptest.NewServer(api.NewRouter(st))
	t.Cleanup(srv.Close)
	return &client{t: t, srv: srv}
}

// do performs a request and decodes the JSON response into out (if non-nil),
// asserting the expected status code.
func (c *client) do(method, path string, body any, wantStatus int, out any) {
	c.t.Helper()
	var reader io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			c.t.Fatalf("marshal body: %v", err)
		}
		reader = bytes.NewReader(b)
	}
	req, err := http.NewRequest(method, c.srv.URL+"/api/v1"+path, reader)
	if err != nil {
		c.t.Fatalf("new request: %v", err)
	}
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		c.t.Fatalf("%s %s: %v", method, path, err)
	}
	defer res.Body.Close()
	data, err := io.ReadAll(res.Body)
	if err != nil {
		c.t.Fatalf("read body: %v", err)
	}
	if res.StatusCode != wantStatus {
		c.t.Fatalf("%s %s: status = %d, want %d; body: %s", method, path, res.StatusCode, wantStatus, data)
	}
	if out != nil {
		if err := json.Unmarshal(data, out); err != nil {
			c.t.Fatalf("%s %s: decode response %q: %v", method, path, data, err)
		}
	}
}

func (c *client) createMember(name string, typ model.MemberType) model.Member {
	c.t.Helper()
	var m model.Member
	c.do("POST", "/members", map[string]any{"name": name, "type": typ}, http.StatusCreated, &m)
	return m
}

func (c *client) createProject(name string) model.Project {
	c.t.Helper()
	var p model.Project
	c.do("POST", "/projects", map[string]any{"name": name}, http.StatusCreated, &p)
	return p
}

func (c *client) createTask(body map[string]any) model.Task {
	c.t.Helper()
	var task model.Task
	c.do("POST", "/tasks", body, http.StatusCreated, &task)
	return task
}

func (c *client) listTasks(query string) []model.Task {
	c.t.Helper()
	var res struct {
		Tasks []model.Task `json:"tasks"`
	}
	c.do("GET", "/tasks"+query, nil, http.StatusOK, &res)
	return res.Tasks
}

func TestHealthAndWorkspace(t *testing.T) {
	c := newClient(t)
	var health map[string]string
	c.do("GET", "/health", nil, http.StatusOK, &health)
	if health["status"] != "ok" {
		t.Errorf("health = %v", health)
	}
	var ws model.Workspace
	c.do("GET", "/workspace", nil, http.StatusOK, &ws)
	if ws.TaskPrefix != "CHR" || ws.Name != "Chronova" {
		t.Errorf("workspace = %+v", ws)
	}
}

func TestMemberCRUD(t *testing.T) {
	c := newClient(t)
	m := c.createMember("佐藤 花子", model.MemberHuman)
	if m.ID == 0 || m.Type != model.MemberHuman || m.AvatarColor == "" {
		t.Fatalf("created member = %+v", m)
	}
	agent := c.createMember("コードレビューBot", model.MemberAgent)
	if agent.Type != model.MemberAgent {
		t.Fatalf("agent member = %+v", agent)
	}

	var updated model.Member
	c.do("PATCH", fmt.Sprintf("/members/%d", m.ID), map[string]any{"name": "佐藤 華子"}, http.StatusOK, &updated)
	if updated.Name != "佐藤 華子" || updated.Type != model.MemberHuman {
		t.Errorf("updated member = %+v", updated)
	}

	var list struct {
		Members []model.Member `json:"members"`
	}
	c.do("GET", "/members", nil, http.StatusOK, &list)
	if len(list.Members) != 2 {
		t.Fatalf("members = %d, want 2", len(list.Members))
	}

	c.do("DELETE", fmt.Sprintf("/members/%d", agent.ID), nil, http.StatusNoContent, nil)
	c.do("DELETE", fmt.Sprintf("/members/%d", agent.ID), nil, http.StatusNotFound, nil)

	// Validation
	c.do("POST", "/members", map[string]any{"name": "", "type": "human"}, http.StatusBadRequest, nil)
	c.do("POST", "/members", map[string]any{"name": "x", "type": "robot"}, http.StatusBadRequest, nil)
}

func TestProjectCRUD(t *testing.T) {
	c := newClient(t)
	p := c.createProject("ウェブサイトリニューアル")
	if p.Color == "" || p.Icon == "" {
		t.Fatalf("project defaults missing: %+v", p)
	}

	c.createTask(map[string]any{"title": "T1", "project_id": p.ID})
	c.createTask(map[string]any{"title": "T2", "project_id": p.ID, "status": "done"})

	var got model.Project
	c.do("GET", fmt.Sprintf("/projects/%d", p.ID), nil, http.StatusOK, &got)
	if got.TaskCount != 1 { // done tasks are not counted as open
		t.Errorf("task_count = %d, want 1", got.TaskCount)
	}

	var updated model.Project
	c.do("PATCH", fmt.Sprintf("/projects/%d", p.ID), map[string]any{"color": "#ff0000"}, http.StatusOK, &updated)
	if updated.Color != "#ff0000" || updated.Name != p.Name {
		t.Errorf("updated project = %+v", updated)
	}

	// Deleting the project orphans its tasks instead of deleting them.
	c.do("DELETE", fmt.Sprintf("/projects/%d", p.ID), nil, http.StatusNoContent, nil)
	tasks := c.listTasks("")
	if len(tasks) != 2 {
		t.Fatalf("tasks after project delete = %d, want 2", len(tasks))
	}
	for _, task := range tasks {
		if task.Project != nil {
			t.Errorf("task %s still references deleted project", task.Identifier)
		}
	}

	c.do("GET", "/projects/9999", nil, http.StatusNotFound, nil)
}

func TestTaskCreateDefaultsAndNumbering(t *testing.T) {
	c := newClient(t)
	t1 := c.createTask(map[string]any{"title": "最初のタスク"})
	t2 := c.createTask(map[string]any{"title": "次のタスク"})
	if t1.Number != 1 || t2.Number != 2 {
		t.Errorf("numbers = %d, %d; want 1, 2", t1.Number, t2.Number)
	}
	if t1.Identifier != "CHR-1" || t2.Identifier != "CHR-2" {
		t.Errorf("identifiers = %s, %s", t1.Identifier, t2.Identifier)
	}
	if t1.Status != model.StatusTodo || t1.Priority != model.PriorityNone {
		t.Errorf("defaults = %s/%s", t1.Status, t1.Priority)
	}
	if t2.SortOrder <= t1.SortOrder {
		t.Errorf("t2 should sort after t1: %d <= %d", t2.SortOrder, t1.SortOrder)
	}

	// Validation
	c.do("POST", "/tasks", map[string]any{"title": "  "}, http.StatusBadRequest, nil)
	c.do("POST", "/tasks", map[string]any{"title": "x", "status": "bogus"}, http.StatusBadRequest, nil)
	c.do("POST", "/tasks", map[string]any{"title": "x", "priority": "asap"}, http.StatusBadRequest, nil)
	c.do("POST", "/tasks", map[string]any{"title": "x", "due_date": "2026/07/14"}, http.StatusBadRequest, nil)
	c.do("POST", "/tasks", map[string]any{"title": "x", "project_id": 424242}, http.StatusBadRequest, nil)
	c.do("POST", "/tasks", map[string]any{"title": "x", "assignee_ids": []int64{424242}}, http.StatusBadRequest, nil)
}

func TestTaskPatchAndAssignees(t *testing.T) {
	c := newClient(t)
	human := c.createMember("田中 太郎", model.MemberHuman)
	agent := c.createMember("リサーチAgent", model.MemberAgent)
	p := c.createProject("モバイルアプリ")

	task := c.createTask(map[string]any{
		"title": "通知基盤", "due_date": "2026-08-01",
		"project_id": p.ID, "assignee_ids": []int64{human.ID},
	})
	if len(task.Assignees) != 1 || task.Assignees[0].ID != human.ID {
		t.Fatalf("assignees = %+v", task.Assignees)
	}

	// Partial update: only priority — everything else must survive.
	var got model.Task
	c.do("PATCH", fmt.Sprintf("/tasks/%d", task.ID), map[string]any{"priority": "urgent"}, http.StatusOK, &got)
	if got.Priority != model.PriorityUrgent || got.Title != "通知基盤" || got.DueDate == nil || got.Project == nil {
		t.Errorf("after priority patch = %+v", got)
	}

	// Replace assignee set entirely.
	c.do("PATCH", fmt.Sprintf("/tasks/%d", task.ID), map[string]any{"assignee_ids": []int64{agent.ID}}, http.StatusOK, &got)
	if len(got.Assignees) != 1 || got.Assignees[0].ID != agent.ID || got.Assignees[0].Type != model.MemberAgent {
		t.Errorf("assignees after replace = %+v", got.Assignees)
	}

	// Explicit nulls clear nullable fields.
	c.do("PATCH", fmt.Sprintf("/tasks/%d", task.ID),
		map[string]any{"due_date": nil, "project_id": nil}, http.StatusOK, &got)
	if got.DueDate != nil || got.Project != nil {
		t.Errorf("nullable fields not cleared: %+v", got)
	}

	// Status-only change appends to the bottom of the new column.
	other := c.createTask(map[string]any{"title": "既存の進行中", "status": "in_progress"})
	c.do("PATCH", fmt.Sprintf("/tasks/%d", task.ID), map[string]any{"status": "in_progress"}, http.StatusOK, &got)
	if got.Status != model.StatusInProgress || got.SortOrder <= other.SortOrder {
		t.Errorf("status change should append to bottom: got %d, other %d", got.SortOrder, other.SortOrder)
	}

	// Deleting a member cleans up its assignments.
	c.do("PATCH", fmt.Sprintf("/tasks/%d", task.ID), map[string]any{"assignee_ids": []int64{agent.ID}}, http.StatusOK, &got)
	c.do("DELETE", fmt.Sprintf("/members/%d", agent.ID), nil, http.StatusNoContent, nil)
	c.do("GET", fmt.Sprintf("/tasks/%d", task.ID), nil, http.StatusOK, &got)
	if len(got.Assignees) != 0 {
		t.Errorf("assignees after member delete = %+v", got.Assignees)
	}

	c.do("PATCH", "/tasks/9999", map[string]any{"title": "x"}, http.StatusNotFound, nil)
	c.do("GET", "/tasks/9999", nil, http.StatusNotFound, nil)
}

func TestTaskListFilters(t *testing.T) {
	c := newClient(t)
	human := c.createMember("佐藤", model.MemberHuman)
	p1 := c.createProject("P1")
	p2 := c.createProject("P2")

	c.createTask(map[string]any{"title": "リニューアル対応", "project_id": p1.ID, "status": "todo", "assignee_ids": []int64{human.ID}})
	c.createTask(map[string]any{"title": "調査タスク", "project_id": p1.ID, "status": "done"})
	c.createTask(map[string]any{"title": "別プロジェクトの作業", "project_id": p2.ID, "status": "todo"})

	if got := len(c.listTasks("?project_id=" + fmt.Sprint(p1.ID))); got != 2 {
		t.Errorf("project filter = %d, want 2", got)
	}
	if got := len(c.listTasks("?status=todo")); got != 2 {
		t.Errorf("status filter = %d, want 2", got)
	}
	if got := len(c.listTasks("?status=todo&status=done")); got != 3 {
		t.Errorf("multi status filter = %d, want 3", got)
	}
	if got := len(c.listTasks("?assignee_id=" + fmt.Sprint(human.ID))); got != 1 {
		t.Errorf("assignee filter = %d, want 1", got)
	}
	if got := len(c.listTasks("?q=" + "%E8%AA%BF%E6%9F%BB")); got != 1 { // 調査
		t.Errorf("q filter = %d, want 1", got)
	}
	if got := len(c.listTasks("?project_id=" + fmt.Sprint(p1.ID) + "&status=todo")); got != 1 {
		t.Errorf("combined filter = %d, want 1", got)
	}
	c.do("GET", "/tasks?status=bogus", nil, http.StatusBadRequest, nil)
	c.do("GET", "/tasks?project_id=abc", nil, http.StatusBadRequest, nil)
}

// titlesInStatus returns task titles in the given column in sort order.
func titlesInStatus(tasks []model.Task, status model.Status) []string {
	titles := []string{}
	for _, t := range tasks {
		if t.Status == status {
			titles = append(titles, t.Title)
		}
	}
	return titles
}

func equalStrings(a, b []string) bool {
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

func TestMoveSemantics(t *testing.T) {
	c := newClient(t)
	a := c.createTask(map[string]any{"title": "A", "status": "todo"})
	b := c.createTask(map[string]any{"title": "B", "status": "todo"})
	d := c.createTask(map[string]any{"title": "C", "status": "todo"})
	_ = b

	// Reorder within a column: move C after A → A, C, B
	var moved model.Task
	c.do("POST", fmt.Sprintf("/tasks/%d/move", d.ID),
		map[string]any{"status": "todo", "after_id": a.ID}, http.StatusOK, &moved)
	if got := titlesInStatus(c.listTasks(""), model.StatusTodo); !equalStrings(got, []string{"A", "C", "B"}) {
		t.Fatalf("after move-within: %v", got)
	}

	// Move to top: after_id null → C, A, B... move B to top
	c.do("POST", fmt.Sprintf("/tasks/%d/move", b.ID),
		map[string]any{"status": "todo", "after_id": nil}, http.StatusOK, &moved)
	if got := titlesInStatus(c.listTasks(""), model.StatusTodo); !equalStrings(got, []string{"B", "A", "C"}) {
		t.Fatalf("after move-to-top: %v", got)
	}

	// Cross-column move into an empty column.
	c.do("POST", fmt.Sprintf("/tasks/%d/move", a.ID),
		map[string]any{"status": "in_progress", "after_id": nil}, http.StatusOK, &moved)
	if moved.Status != model.StatusInProgress {
		t.Fatalf("cross-column status = %s", moved.Status)
	}
	if got := titlesInStatus(c.listTasks(""), model.StatusTodo); !equalStrings(got, []string{"B", "C"}) {
		t.Fatalf("source column after cross move: %v", got)
	}

	// Cross-column move after an anchor in the target column.
	c.do("POST", fmt.Sprintf("/tasks/%d/move", d.ID),
		map[string]any{"status": "in_progress", "after_id": a.ID}, http.StatusOK, &moved)
	if got := titlesInStatus(c.listTasks(""), model.StatusInProgress); !equalStrings(got, []string{"A", "C"}) {
		t.Fatalf("target column after cross move: %v", got)
	}

	// Validation: anchor in a different column / missing / self.
	c.do("POST", fmt.Sprintf("/tasks/%d/move", b.ID),
		map[string]any{"status": "todo", "after_id": a.ID}, http.StatusBadRequest, nil)
	c.do("POST", fmt.Sprintf("/tasks/%d/move", b.ID),
		map[string]any{"status": "todo", "after_id": 9999}, http.StatusBadRequest, nil)
	c.do("POST", fmt.Sprintf("/tasks/%d/move", b.ID),
		map[string]any{"status": "todo", "after_id": b.ID}, http.StatusBadRequest, nil)
	c.do("POST", "/tasks/9999/move", map[string]any{"status": "todo"}, http.StatusNotFound, nil)
}

func TestMoveRebalance(t *testing.T) {
	c := newClient(t)
	c.createTask(map[string]any{"title": "top", "status": "todo"})
	c.createTask(map[string]any{"title": "bottom", "status": "todo"})

	// Repeatedly wedge tasks directly after "top". Each insert halves the gap,
	// so ~11 inserts exhaust the 1024 step and force at least one rebalance.
	tasks := c.listTasks("?status=todo")
	topID := tasks[0].ID
	want := []string{"top"}
	for i := 0; i < 15; i++ {
		task := c.createTask(map[string]any{"title": fmt.Sprintf("wedge-%d", i), "status": "todo"})
		var moved model.Task
		c.do("POST", fmt.Sprintf("/tasks/%d/move", task.ID),
			map[string]any{"status": "todo", "after_id": topID}, http.StatusOK, &moved)
		// Latest wedge lands directly after top, pushing earlier wedges down.
		want = append(want[:1], append([]string{task.Title}, want[1:]...)...)
	}
	want = append(want, "bottom")

	got := titlesInStatus(c.listTasks(""), model.StatusTodo)
	if !equalStrings(got, want) {
		t.Fatalf("order after rebalance:\n got %v\nwant %v", got, want)
	}

	// Ranks must be strictly increasing and unique after rebalances.
	final := c.listTasks("?status=todo")
	for i := 1; i < len(final); i++ {
		if final[i].SortOrder <= final[i-1].SortOrder {
			t.Fatalf("sort_order not strictly increasing at %d: %d <= %d",
				i, final[i].SortOrder, final[i-1].SortOrder)
		}
	}
}

func TestTaskDelete(t *testing.T) {
	c := newClient(t)
	task := c.createTask(map[string]any{"title": "消すタスク"})
	c.do("DELETE", fmt.Sprintf("/tasks/%d", task.ID), nil, http.StatusNoContent, nil)
	c.do("DELETE", fmt.Sprintf("/tasks/%d", task.ID), nil, http.StatusNotFound, nil)
	if got := len(c.listTasks("")); got != 0 {
		t.Errorf("tasks after delete = %d, want 0", got)
	}
}
