import { describe, expect, it, vi } from 'vitest'
import {
  createJsonFilename,
  downloadJson,
} from './downloadJson.js'

describe('createJsonFilename', () => {
  it('uses zero-padded local datetime components', () => {
    const localDate = new Date(2026, 6, 26, 4, 5, 9)

    expect(createJsonFilename(localDate)).toBe(
      'formatted-2026-07-26-040509.json',
    )
  })
})

function createDownloadHarness({ click = vi.fn() } = {}) {
  const anchor = { click, remove: vi.fn(), style: {} }
  const documentRef = {
    body: { append: vi.fn() },
    createElement: vi.fn(() => anchor),
  }
  const urlApi = {
    createObjectURL: vi.fn(() => 'blob:json-download'),
    revokeObjectURL: vi.fn(),
  }
  const blobs = []

  class FakeBlob {
    constructor(parts, options) {
      this.parts = parts
      this.type = options.type
      blobs.push(this)
    }
  }

  return {
    anchor,
    blobs,
    documentRef,
    urlApi,
    BlobCtor: FakeBlob,
  }
}

describe('downloadJson', () => {
  it('downloads application/json and cleans up the temporary URL', () => {
    const harness = createDownloadHarness()
    const text = '{\n  "ready": true\n}'

    const filename = downloadJson(text, {
      date: new Date(2026, 6, 26, 14, 35, 9),
      documentRef: harness.documentRef,
      urlApi: harness.urlApi,
      BlobCtor: harness.BlobCtor,
    })

    expect(filename).toBe('formatted-2026-07-26-143509.json')
    expect(harness.blobs[0]).toMatchObject({
      parts: [text],
      type: 'application/json',
    })
    expect(harness.anchor).toMatchObject({
      href: 'blob:json-download',
      download: filename,
    })
    expect(harness.anchor.style.display).toBe('none')
    expect(harness.documentRef.body.append).toHaveBeenCalledWith(
      harness.anchor,
    )
    expect(harness.anchor.click).toHaveBeenCalledOnce()
    expect(harness.anchor.remove).toHaveBeenCalledOnce()
    expect(harness.urlApi.revokeObjectURL).toHaveBeenCalledWith(
      'blob:json-download',
    )
  })

  it('cleans up the temporary URL when the browser click fails', () => {
    const click = vi.fn(() => {
      throw new Error('Download blocked')
    })
    const harness = createDownloadHarness({ click })

    expect(() =>
      downloadJson('{"ready":true}', {
        documentRef: harness.documentRef,
        urlApi: harness.urlApi,
        BlobCtor: harness.BlobCtor,
      }),
    ).toThrow('Download blocked')
    expect(harness.anchor.remove).toHaveBeenCalledOnce()
    expect(harness.urlApi.revokeObjectURL).toHaveBeenCalledWith(
      'blob:json-download',
    )
  })
})
