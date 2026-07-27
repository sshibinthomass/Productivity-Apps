-- Per-owner media quota. This trigger runs in the same D1 write that records
-- the asset, so concurrent uploads and duplicate operations cannot overbook it.
CREATE TRIGGER site_assets_quota_before_insert
BEFORE INSERT ON site_assets
WHEN (
  (SELECT COUNT(*) FROM site_assets WHERE owner_id = NEW.owner_id) >= 100
  OR
  (SELECT COALESCE(SUM(size_bytes), 0) FROM site_assets WHERE owner_id = NEW.owner_id) + NEW.size_bytes > 52428800
)
BEGIN
  SELECT RAISE(ABORT, 'asset_quota_exceeded');
END;
