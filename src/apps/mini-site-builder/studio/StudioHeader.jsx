import { Link } from 'react-router'

const SAVE_LABELS = {
  saved: 'Saved',
  unsaved: 'Unsaved changes',
  saving: 'Saving…',
  error: 'Save failed',
}

export default function StudioHeader({
  name,
  status,
  onRetry,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}) {
  return (
    <header className="mini-studio__header">
      <div>
        <Link to="/mini-sites" className="mini-studio__back">
          ← Sites
        </Link>
        <span aria-hidden="true">/</span>
        <strong>{name}</strong>
      </div>
      <div className="mini-studio__history">
        <button
          type="button"
          className="mini-studio__icon-button"
          onClick={onUndo}
          disabled={!canUndo}
          aria-label="Undo"
        >
          ↶
        </button>
        <button
          type="button"
          className="mini-studio__icon-button"
          onClick={onRedo}
          disabled={!canRedo}
          aria-label="Redo"
        >
          ↷
        </button>
        <span
          className={`mini-studio__save mini-studio__save--${status}`}
          aria-live="polite"
        >
          {SAVE_LABELS[status]}
        </span>
        {status === 'error' && (
          <button type="button" className="text-button" onClick={onRetry}>
            Retry save
          </button>
        )}
      </div>
    </header>
  )
}
