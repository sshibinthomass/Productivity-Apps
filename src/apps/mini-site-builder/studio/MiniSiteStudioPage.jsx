import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../../../auth/authContext.js'
import { useMiniSiteRepository } from '../data/repositoryContext.js'
import {
  createBlock,
  duplicateBlock,
  moveBlock,
  removeBlock,
  updateBlock,
} from '../model/miniSiteModel.js'
import { MiniSiteRenderer } from '../renderer/MiniSiteRenderer.jsx'
import '../MiniSiteBuilder.css'
import BlockList from './BlockList.jsx'
import ContentPanel from './ContentPanel.jsx'
import StudioHeader from './StudioHeader.jsx'
import { useDraftAutosave } from './useDraftAutosave.js'

const HISTORY_LIMIT = 50

function historyReducer(state, action) {
  switch (action.type) {
    case 'change':
      if (action.draft === state.present) return state
      return {
        past: [...state.past, state.present].slice(-HISTORY_LIMIT),
        present: action.draft,
        future: [],
      }
    case 'undo':
      if (state.past.length === 0) return state
      return {
        past: state.past.slice(0, -1),
        present: state.past.at(-1),
        future: [state.present, ...state.future],
      }
    case 'redo':
      if (state.future.length === 0) return state
      return {
        past: [...state.past, state.present].slice(-HISTORY_LIMIT),
        present: state.future[0],
        future: state.future.slice(1),
      }
    default:
      return state
  }
}

function SectionPlaceholder({ section }) {
  return (
    <div className="mini-studio__section-placeholder">
      <span>Coming next</span>
      <h2>{section}</h2>
      <p>
        This workspace is ready for {section.toLowerCase()} controls.
      </p>
    </div>
  )
}

function StudioWorkspace({ initialDraft, repository, siteId, uid }) {
  const [history, dispatch] = useReducer(historyReducer, {
    past: [],
    present: initialDraft,
    future: [],
  })
  const [selectedId, setSelectedId] = useState(
    initialDraft.blocks[0]?.id ?? null,
  )
  const [section, setSection] = useState('Content')
  const [mobileView, setMobileView] = useState('Edit')
  const [addOpen, setAddOpen] = useState(false)

  const save = useCallback(
    (draft, expectedRevision) =>
      repository.saveDraft(uid, siteId, draft, expectedRevision),
    [repository, siteId, uid],
  )
  const autosave = useDraftAutosave({
    draft: history.present,
    revision: initialDraft.draftRevision,
    save,
  })

  useEffect(() => {
    const warnBeforeLeave = (event) => {
      if (!['unsaved', 'saving', 'error'].includes(autosave.status)) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warnBeforeLeave)
    return () => window.removeEventListener('beforeunload', warnBeforeLeave)
  }, [autosave.status])

  const blocks = history.present.blocks
  const selectedBlock = useMemo(
    () => blocks.find(({ id }) => id === selectedId) ?? null,
    [blocks, selectedId],
  )
  const selectedIndex = blocks.findIndex(({ id }) => id === selectedId)

  const changeDraft = useCallback(
    (patch) => {
      dispatch({
        type: 'change',
        draft: { ...history.present, ...patch },
      })
    },
    [history.present],
  )
  const changeBlocks = useCallback(
    (nextBlocks) => changeDraft({ blocks: nextBlocks }),
    [changeDraft],
  )

  const addBlock = (type) => {
    const block = createBlock(type)
    changeBlocks([...blocks, block])
    setSelectedId(block.id)
    setAddOpen(false)
  }

  const duplicateSelected = () => {
    const nextBlocks = duplicateBlock(blocks, selectedId)
    const copy = nextBlocks[selectedIndex + 1]
    changeBlocks(nextBlocks)
    if (copy?.id !== selectedId) setSelectedId(copy.id)
  }

  const deleteSelected = () => {
    const nextBlocks = removeBlock(blocks, selectedId)
    changeBlocks(nextBlocks)
    setSelectedId(
      nextBlocks[Math.min(selectedIndex, nextBlocks.length - 1)]?.id ?? null,
    )
  }

  return (
    <div className={`mini-studio mini-studio--${mobileView.toLowerCase()}`}>
      <StudioHeader
        name={history.present.name}
        status={autosave.status}
        onRetry={autosave.retry}
        canUndo={history.past.length > 0}
        canRedo={history.future.length > 0}
        onUndo={() => dispatch({ type: 'undo' })}
        onRedo={() => dispatch({ type: 'redo' })}
      />

      <div className="mini-studio__mobile-tabs" role="tablist">
        {['Edit', 'Preview'].map((view) => (
          <button
            key={view}
            type="button"
            role="tab"
            aria-selected={mobileView === view}
            onClick={() => setMobileView(view)}
          >
            {view}
          </button>
        ))}
      </div>

      <div className="mini-studio__workspace">
        <aside className="mini-studio__rail" aria-label="Studio sections">
          {['Content', 'Design', 'Settings', 'Analytics'].map(
            (item, index) => (
              <button
                key={item}
                type="button"
                role="tab"
                aria-selected={section === item}
                className={section === item ? 'is-active' : ''}
                onClick={() => setSection(item)}
              >
                <span aria-hidden="true">
                  {String(index + 1).padStart(2, '0')}
                </span>
                {item}
              </button>
            ),
          )}
        </aside>

        <div className="mini-studio__editor">
          {section === 'Content' ? (
            <>
              <BlockList
                blocks={blocks}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onAdd={addBlock}
                addOpen={addOpen}
                onToggleAdd={() => setAddOpen((open) => !open)}
              />
              <ContentPanel
                block={selectedBlock}
                blockIndex={selectedIndex}
                blockCount={blocks.length}
                onContentChange={(content) =>
                  changeBlocks(
                    updateBlock(blocks, selectedId, { content }),
                  )
                }
                onMove={(direction) =>
                  changeBlocks(moveBlock(blocks, selectedId, direction))
                }
                onToggleVisibility={() =>
                  changeBlocks(
                    updateBlock(blocks, selectedId, {
                      visible: selectedBlock.visible === false,
                    }),
                  )
                }
                onDuplicate={duplicateSelected}
                onDelete={deleteSelected}
              />
            </>
          ) : (
            <SectionPlaceholder section={section} />
          )}
        </div>

        <section className="mini-studio__preview" aria-label="Live preview">
          <div className="mini-studio__preview-heading">
            <div>
              <span>Public canvas</span>
              <h2>Live preview</h2>
            </div>
            <span className="mini-studio__live-dot">Live</span>
          </div>
          <div className="mini-studio__phone">
            <div className="mini-studio__phone-bar" aria-hidden="true" />
            <MiniSiteRenderer site={history.present} mode="preview" />
          </div>
        </section>
      </div>
    </div>
  )
}

export default function MiniSiteStudioPage() {
  const { siteId } = useParams()
  const { user } = useAuth()
  const repository = useMiniSiteRepository()
  const [loadState, setLoadState] = useState({
    status: 'loading',
    draft: null,
    error: null,
    attempt: 0,
  })

  useEffect(() => {
    let active = true
    repository
      .getDraft(user.uid, siteId)
      .then((draft) => {
        if (active) {
          setLoadState((state) => ({
            ...state,
            status: 'ready',
            draft,
            error: null,
          }))
        }
      })
      .catch((error) => {
        if (active) {
          setLoadState((state) => ({
            ...state,
            status: 'error',
            error,
          }))
        }
      })

    return () => {
      active = false
    }
  }, [loadState.attempt, repository, siteId, user.uid])

  if (loadState.status === 'loading') {
    return <div className="mini-studio__state">Opening studio…</div>
  }

  if (loadState.status === 'error') {
    return (
      <div className="mini-studio__state">
        <p role="alert">
          {loadState.error?.message ?? 'The studio could not be opened.'}
        </p>
        <button
          type="button"
          className="button button-primary"
          onClick={() =>
            setLoadState((state) => ({
              ...state,
              status: 'loading',
              error: null,
              attempt: state.attempt + 1,
            }))
          }
        >
          Try again
        </button>
      </div>
    )
  }

  return (
    <StudioWorkspace
      key={`${siteId}-${loadState.attempt}`}
      initialDraft={loadState.draft}
      repository={repository}
      siteId={siteId}
      uid={user.uid}
    />
  )
}
