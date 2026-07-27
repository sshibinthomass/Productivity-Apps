CREATE TABLE analytics_link_clicks (
  site_id TEXT NOT NULL,
  block_id TEXT NOT NULL,
  click_count INTEGER NOT NULL DEFAULT 0 CHECK(click_count >= 0),
  PRIMARY KEY (site_id, block_id)
);
