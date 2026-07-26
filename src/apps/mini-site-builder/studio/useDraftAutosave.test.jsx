import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useDraftAutosave } from './useDraftAutosave.js'

describe('useDraftAutosave', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('does not save the initial draft', () => {
    const save = vi.fn()
    renderHook(() =>
      useDraftAutosave({
        draft: { name: 'Initial' },
        revision: 2,
        save,
        delay: 700,
      }),
    )

    act(() => vi.advanceTimersByTime(1_000))

    expect(save).not.toHaveBeenCalled()
  })

  it('debounces changes and saves using the newest revision', async () => {
    const save = vi
      .fn()
      .mockResolvedValueOnce({ draftRevision: 3 })
      .mockResolvedValueOnce({ draftRevision: 4 })
    const { result, rerender } = renderHook(
      ({ draft }) =>
        useDraftAutosave({
          draft,
          revision: 2,
          save,
          delay: 700,
        }),
      { initialProps: { draft: { name: 'Initial' } } },
    )

    rerender({ draft: { name: 'First' } })
    expect(result.current.status).toBe('unsaved')
    act(() => vi.advanceTimersByTime(500))
    rerender({ draft: { name: 'Newest' } })
    act(() => vi.advanceTimersByTime(699))
    expect(save).not.toHaveBeenCalled()
    await act(() => vi.advanceTimersByTimeAsync(1))

    expect(save).toHaveBeenCalledWith({ name: 'Newest' }, 2)
    expect(result.current.status).toBe('saved')

    rerender({ draft: { name: 'Again' } })
    await act(() => vi.advanceTimersByTimeAsync(700))
    expect(save).toHaveBeenLastCalledWith({ name: 'Again' }, 3)
  })

  it('keeps a newer change unsaved when an older request resolves', async () => {
    let resolveSave
    const save = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveSave = resolve
        }),
    )
    const { result, rerender } = renderHook(
      ({ draft }) =>
        useDraftAutosave({ draft, revision: 0, save, delay: 700 }),
      { initialProps: { draft: { name: 'Initial' } } },
    )

    rerender({ draft: { name: 'First' } })
    act(() => vi.advanceTimersByTime(700))
    await act(async () => {
      await Promise.resolve()
    })
    rerender({ draft: { name: 'Second' } })
    await act(async () => resolveSave({ draftRevision: 1 }))

    expect(result.current.status).toBe('unsaved')
  })

  it('exposes a retry after a failed save', async () => {
    const save = vi
      .fn()
      .mockRejectedValueOnce(new Error('Offline'))
      .mockResolvedValueOnce({ draftRevision: 1 })
    const { result, rerender } = renderHook(
      ({ draft }) =>
        useDraftAutosave({ draft, revision: 0, save, delay: 700 }),
      { initialProps: { draft: { name: 'Initial' } } },
    )

    rerender({ draft: { name: 'Changed' } })
    await act(() => vi.advanceTimersByTimeAsync(700))

    expect(result.current.status).toBe('error')
    expect(result.current.error.message).toBe('Offline')

    await act(() => result.current.retry())
    expect(result.current.status).toBe('saved')
  })

  it('cleans up pending timers on unmount', () => {
    const save = vi.fn()
    const { rerender, unmount } = renderHook(
      ({ draft }) =>
        useDraftAutosave({ draft, revision: 0, save, delay: 700 }),
      { initialProps: { draft: { name: 'Initial' } } },
    )

    rerender({ draft: { name: 'Changed' } })
    unmount()
    act(() => vi.advanceTimersByTime(700))

    expect(save).not.toHaveBeenCalled()
  })

  it('continues saving after the Strict Mode development remount', async () => {
    const save = vi.fn().mockResolvedValue({ draftRevision: 1 })
    const { rerender } = renderHook(
      ({ draft }) =>
        useDraftAutosave({ draft, revision: 0, save, delay: 700 }),
      {
        initialProps: { draft: { name: 'Initial' } },
        reactStrictMode: true,
      },
    )

    rerender({ draft: { name: 'Changed' } })
    await act(() => vi.advanceTimersByTimeAsync(700))

    expect(save).toHaveBeenCalledWith({ name: 'Changed' }, 0)
  })
})
