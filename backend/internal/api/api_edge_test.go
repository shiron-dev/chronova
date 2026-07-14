package api_test

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"testing"

	"github.com/shiron-dev/chronova/backend/internal/model"
)

// raw sends a request with an arbitrary string body and returns status + raw bytes.
func (c *client) raw(method, path, body string) (int, []byte, http.Header) {
	c.t.Helper()
	var reader io.Reader
	if body != "" {
		reader = strings.NewReader(body)
	}
	req, err := http.NewRequest(method, c.srv.URL+"/api/v1"+path, reader)
	if err != nil {
		c.t.Fatalf("new request: %v", err)
	}
	if body != "" {
		req.Header.Set("Content-Type", "application/json")
	}
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		c.t.Fatalf("%s %s: %v", method, path, err)
	}
	defer res.Body.Close()
	data, _ := io.ReadAll(res.Body)
	return res.StatusCode, data, res.Header
}

func TestCORSPreflight(t *testing.T) {
	c := newClient(t)
	status, _, header := c.raw(http.MethodOptions, "/tasks", "")
	if status != http.StatusNoContent {
		t.Errorf("OPTIONS status = %d, want 204", status)
	}
	if header.Get("Access-Control-Allow-Origin") != "*" {
		t.Errorf("missing CORS origin header: %v", header.Get("Access-Control-Allow-Origin"))
	}
	if !strings.Contains(header.Get("Access-Control-Allow-Methods"), "PATCH") {
		t.Errorf("CORS methods = %q, want to include PATCH", header.Get("Access-Control-Allow-Methods"))
	}
}

func TestMalformedJSONBody(t *testing.T) {
	c := newClient(t)
	status, body, _ := c.raw(http.MethodPost, "/tasks", "{not valid json")
	if status != http.StatusBadRequest {
		t.Errorf("status = %d, want 400; body: %s", status, body)
	}
	var env struct {
		Error struct {
			Code string `json:"code"`
		} `json:"error"`
	}
	if err := json.Unmarshal(body, &env); err != nil {
		t.Fatalf("decode error envelope: %v", err)
	}
	if env.Error.Code != "validation" {
		t.Errorf("error code = %q, want validation", env.Error.Code)
	}
}

func TestUnknownFieldsRejected(t *testing.T) {
	c := newClient(t)
	// DisallowUnknownFields により未知フィールドは400
	status, body, _ := c.raw(http.MethodPost, "/tasks", `{"title":"x","bogus":true}`)
	if status != http.StatusBadRequest {
		t.Errorf("status = %d, want 400; body: %s", status, body)
	}
}

func TestUnknownRouteAndMethod(t *testing.T) {
	c := newClient(t)
	if status, _, _ := c.raw(http.MethodGet, "/nope", ""); status != http.StatusNotFound {
		t.Errorf("unknown route status = %d, want 404", status)
	}
	// /workspace は GET のみ → POST は 405
	if status, _, _ := c.raw(http.MethodPost, "/workspace", ""); status != http.StatusMethodNotAllowed {
		t.Errorf("wrong method status = %d, want 405", status)
	}
}

func TestEmptyCollectionsSerializeAsArray(t *testing.T) {
	c := newClient(t)
	for _, path := range []string{"/members", "/projects", "/tasks"} {
		_, body, _ := c.raw(http.MethodGet, path, "")
		s := string(body)
		if strings.Contains(s, "null") {
			t.Errorf("GET %s contains null: %s", path, s)
		}
		if !strings.Contains(s, "[]") {
			t.Errorf("GET %s should contain empty array: %s", path, s)
		}
	}
}

func TestContentTypeIsJSONUTF8(t *testing.T) {
	c := newClient(t)
	_, _, header := c.raw(http.MethodGet, "/health", "")
	if ct := header.Get("Content-Type"); ct != "application/json; charset=utf-8" {
		t.Errorf("Content-Type = %q", ct)
	}
}

func TestQuerySpecialCharsViaAPI(t *testing.T) {
	c := newClient(t)
	c.createTask(map[string]any{"title": "50% 割引"})
	c.createTask(map[string]any{"title": "50 割引"})
	// URLエンコードした '%' (%25) がリテラル一致する
	tasks := c.listTasks("?q=%25")
	if len(tasks) != 1 || tasks[0].Title != "50% 割引" {
		t.Errorf("q=%%25 matched %d tasks", len(tasks))
	}
}

func TestMultipleAssigneesRoundTrip(t *testing.T) {
	c := newClient(t)
	m1 := c.createMember("A", model.MemberHuman)
	m2 := c.createMember("B", model.MemberAgent)
	m3 := c.createMember("C", model.MemberHuman)
	task := c.createTask(map[string]any{
		"title":        "multi",
		"assignee_ids": []int64{m3.ID, m1.ID, m2.ID},
	})
	if len(task.Assignees) != 3 {
		t.Fatalf("assignees = %d, want 3", len(task.Assignees))
	}
	// member id 昇順で安定して返る
	want := []int64{m1.ID, m2.ID, m3.ID}
	for i, a := range task.Assignees {
		if a.ID != want[i] {
			t.Errorf("assignee[%d] id = %d, want %d", i, a.ID, want[i])
		}
	}
}

func TestMoveTopOfColumnRebalanceViaAPI(t *testing.T) {
	c := newClient(t)
	c.createTask(map[string]any{"title": "anchor", "status": "todo"})
	tasks := c.listTasks("?status=todo")
	anchorID := tasks[0].ID

	// anchor の直後へ繰り返し挿入してギャップを枯渇させ、リバランス経路を通す
	var last string
	for i := 0; i < 14; i++ {
		task := c.createTask(map[string]any{"title": fmt.Sprintf("m%d", i), "status": "todo"})
		var moved model.Task
		c.do("POST", fmt.Sprintf("/tasks/%d/move", task.ID),
			map[string]any{"status": "todo", "after_id": anchorID}, http.StatusOK, &moved)
		last = task.Title
	}
	final := c.listTasks("?status=todo")
	// anchor が先頭、最後に挿入したものがその直後
	if final[0].Title != "anchor" || final[1].Title != last {
		t.Errorf("order head = [%s %s], want [anchor %s]", final[0].Title, final[1].Title, last)
	}
	for i := 1; i < len(final); i++ {
		if final[i].SortOrder <= final[i-1].SortOrder {
			t.Fatalf("sort_order not increasing at %d", i)
		}
	}
}
