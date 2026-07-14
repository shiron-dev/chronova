CREATE TABLE workspace (
  id               INTEGER PRIMARY KEY CHECK (id = 1),
  name             TEXT NOT NULL,
  task_prefix      TEXT NOT NULL DEFAULT 'CHR',
  next_task_number INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE members (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT NOT NULL,
  type         TEXT NOT NULL CHECK (type IN ('human','agent')),
  avatar_color TEXT NOT NULL DEFAULT '#6E79D6',
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);

CREATE TABLE projects (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  color       TEXT NOT NULL DEFAULT '#5E6AD2',
  icon        TEXT NOT NULL DEFAULT 'box',
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE TABLE tasks (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  number      INTEGER NOT NULL UNIQUE,
  title       TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'todo'
              CHECK (status IN ('backlog','todo','in_progress','done','canceled')),
  priority    TEXT NOT NULL DEFAULT 'none'
              CHECK (priority IN ('none','low','medium','high','urgent')),
  due_date    TEXT,
  project_id  INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  sort_order  INTEGER NOT NULL,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE TABLE task_assignees (
  task_id   INTEGER NOT NULL REFERENCES tasks(id)   ON DELETE CASCADE,
  member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, member_id)
);

CREATE INDEX idx_tasks_status_order ON tasks(status, sort_order);
CREATE INDEX idx_tasks_project      ON tasks(project_id);
CREATE INDEX idx_assignees_member   ON task_assignees(member_id);

INSERT INTO workspace (id, name, task_prefix, next_task_number) VALUES (1, 'Chronova', 'CHR', 1);
