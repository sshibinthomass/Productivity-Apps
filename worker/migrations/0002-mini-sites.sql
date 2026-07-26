CREATE TABLE mini_sites (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL COLLATE NOCASE UNIQUE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'published')),
  template_id TEXT NOT NULL DEFAULT 'link-bio',
  draft_json TEXT NOT NULL CHECK(json_valid(draft_json)),
  draft_revision INTEGER NOT NULL DEFAULT 1 CHECK(draft_revision >= 1),
  published_revision INTEGER NOT NULL DEFAULT 0 CHECK(published_revision >= 0),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  published_at TEXT
);

CREATE INDEX mini_sites_owner_id_idx ON mini_sites (owner_id);
CREATE INDEX mini_sites_owner_updated_at_idx ON mini_sites (owner_id, updated_at DESC);

CREATE TRIGGER mini_sites_limit_before_insert
BEFORE INSERT ON mini_sites
WHEN (
  SELECT COUNT(*)
  FROM mini_sites
  WHERE owner_id = NEW.owner_id
) >= 5
BEGIN
  SELECT RAISE(ABORT, 'site_limit');
END;

CREATE TABLE published_sites (
  slug TEXT PRIMARY KEY COLLATE NOCASE,
  site_id TEXT NOT NULL UNIQUE,
  snapshot_json TEXT NOT NULL CHECK(json_valid(snapshot_json)),
  title TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  social_image_url TEXT,
  revision INTEGER NOT NULL CHECK(revision >= 1),
  published_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE site_assets (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  object_key TEXT NOT NULL UNIQUE,
  content_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL CHECK(size_bytes >= 0),
  is_published INTEGER NOT NULL DEFAULT 0 CHECK(is_published IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX site_assets_site_id_idx ON site_assets (site_id);
CREATE INDEX site_assets_owner_id_idx ON site_assets (owner_id);

CREATE TABLE analytics_summary (
  site_id TEXT PRIMARY KEY,
  view_count INTEGER NOT NULL DEFAULT 0 CHECK(view_count >= 0),
  click_count INTEGER NOT NULL DEFAULT 0 CHECK(click_count >= 0),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE analytics_days (
  site_id TEXT NOT NULL,
  day TEXT NOT NULL,
  view_count INTEGER NOT NULL DEFAULT 0 CHECK(view_count >= 0),
  click_count INTEGER NOT NULL DEFAULT 0 CHECK(click_count >= 0),
  PRIMARY KEY (site_id, day)
);

CREATE TABLE analytics_events (
  receipt_id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK(event_type IN ('view', 'click')),
  block_id TEXT,
  occurred_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  expires_at TEXT NOT NULL
);

CREATE INDEX analytics_events_expires_at_idx ON analytics_events (expires_at);

CREATE TABLE auth_rate_limits (
  key_hash TEXT PRIMARY KEY CHECK(length(key_hash) = 64),
  window_started_at TEXT NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 1 CHECK(attempt_count >= 0),
  expires_at TEXT NOT NULL
);

CREATE INDEX auth_rate_limits_expires_at_idx ON auth_rate_limits (expires_at);

CREATE TABLE user_consents (
  user_id TEXT PRIMARY KEY,
  terms_version TEXT NOT NULL DEFAULT '2026-07-26',
  privacy_version TEXT NOT NULL DEFAULT '2026-07-26',
  accepted_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
