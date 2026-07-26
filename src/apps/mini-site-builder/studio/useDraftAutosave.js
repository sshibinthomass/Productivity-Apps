import { useCallback, useEffect, useRef, useState } from 'react'

export function useDraftAutosave({
  draft,
  revision,
  save,
  delay = 700,
  enabled = true,
}) {
  const [savedDraft, setSavedDraft] = useState(draft)
  const [savedRevision, setSavedRevision] = useState(revision)
  const revisionRef = useRef(revision)
  const mountedRef = useRef(true)
  const queueRef = useRef(Promise.resolve())
  const requestSequenceRef = useRef(0)
  const [phase, setPhase] = useState({ status: 'saved', error: null })

  const performSave = useCallback(
    async (targetDraft) => {
      if (!enabled || !mountedRef.current) return

      const requestId = requestSequenceRef.current + 1
      requestSequenceRef.current = requestId
      setPhase({ status: 'saving', error: null })

      const request = queueRef.current
        .catch(() => undefined)
        .then(async () => {
          try {
            const result = await save(targetDraft, revisionRef.current)
            if (!mountedRef.current) return
            const nextRevision =
              result?.draftRevision ?? revisionRef.current + 1
            revisionRef.current = nextRevision
            setSavedDraft(targetDraft)
            setSavedRevision(nextRevision)
            if (requestId === requestSequenceRef.current) {
              setPhase({ status: 'saved', error: null })
            }
          } catch (error) {
            if (
              mountedRef.current &&
              requestId === requestSequenceRef.current
            ) {
              setPhase({ status: 'error', error })
            }
            throw error
          }
        })
      queueRef.current = request
      try {
        await request
      } catch {
        // The visible error state is set above. Keeping the queue rejected lets
        // the next request explicitly recover through the catch at its head.
      }
    },
    [enabled, save],
  )

  useEffect(() => {
    if (!enabled || draft === savedDraft) {
      return undefined
    }

    const timer = window.setTimeout(() => {
      void performSave(draft)
    }, delay)

    return () => window.clearTimeout(timer)
  }, [delay, draft, enabled, performSave, savedDraft])

  useEffect(
    () => () => {
      mountedRef.current = false
    },
    [],
  )

  const retry = useCallback(
    () => performSave(draft),
    [draft, performSave],
  )

  const markSavedRevision = useCallback((nextRevision, nextDraft) => {
    revisionRef.current = nextRevision
    setSavedRevision(nextRevision)
    if (nextDraft) {
      setSavedDraft(nextDraft)
    }
    setPhase({ status: 'saved', error: null })
  }, [])

  const hasPendingChanges = draft !== savedDraft
  const status =
    phase.status === 'saved' && hasPendingChanges ? 'unsaved' : phase.status

  return {
    status,
    error: phase.error,
    retry,
    markSavedRevision,
    revision: savedRevision,
  }
}
