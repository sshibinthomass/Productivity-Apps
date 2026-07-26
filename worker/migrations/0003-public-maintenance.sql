CREATE TABLE maintenance_cursors (
  name TEXT PRIMARY KEY,
  phase TEXT NOT NULL,
  cursor TEXT,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE public_event_rate_limits (
  key_hash TEXT PRIMARY KEY CHECK(length(key_hash) = 64),
  window_started_at TEXT NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 1 CHECK(attempt_count >= 0),
  expires_at TEXT NOT NULL
);

CREATE INDEX public_event_rate_limits_expires_at_idx ON public_event_rate_limits (expires_at);
