import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import QrBuilderTabs from './QrBuilderTabs.jsx'

function TabsHarness() {
  const [activeTab, setActiveTab] = useState('build')
  return <QrBuilderTabs activeTab={activeTab} onChange={setActiveTab} />
}

describe('QrBuilderTabs', () => {
  it('exposes a controlled two-tab interface and activates Design by click', () => {
    render(<TabsHarness />)

    const tablist = screen.getByRole('tablist', {
      name: 'QR builder sections',
    })
    const buildTab = screen.getByRole('tab', { name: /Build QR/ })
    const designTab = screen.getByRole('tab', { name: /Design/ })

    expect(tablist.contains(buildTab)).toBe(true)
    expect(buildTab.getAttribute('aria-selected')).toBe('true')
    expect(buildTab.getAttribute('aria-controls')).toBe('qr-panel-build')
    expect(buildTab.tabIndex).toBe(0)
    expect(designTab.getAttribute('aria-selected')).toBe('false')
    expect(designTab.getAttribute('aria-controls')).toBe('qr-panel-design')
    expect(designTab.tabIndex).toBe(-1)

    fireEvent.click(designTab)

    expect(designTab.getAttribute('aria-selected')).toBe('true')
    expect(designTab.tabIndex).toBe(0)
    expect(buildTab.getAttribute('aria-selected')).toBe('false')
    expect(buildTab.tabIndex).toBe(-1)
  })

  it('selects and focuses tabs with arrow, Home, and End keys', () => {
    render(<TabsHarness />)
    const buildTab = screen.getByRole('tab', { name: /Build QR/ })
    const designTab = screen.getByRole('tab', { name: /Design/ })

    buildTab.focus()
    fireEvent.keyDown(buildTab, { key: 'ArrowRight' })
    expect(document.activeElement).toBe(designTab)
    expect(designTab.getAttribute('aria-selected')).toBe('true')

    fireEvent.keyDown(designTab, { key: 'ArrowRight' })
    expect(document.activeElement).toBe(buildTab)
    expect(buildTab.getAttribute('aria-selected')).toBe('true')

    fireEvent.keyDown(buildTab, { key: 'ArrowLeft' })
    expect(document.activeElement).toBe(designTab)
    expect(designTab.getAttribute('aria-selected')).toBe('true')

    fireEvent.keyDown(designTab, { key: 'Home' })
    expect(document.activeElement).toBe(buildTab)
    expect(buildTab.getAttribute('aria-selected')).toBe('true')

    fireEvent.keyDown(buildTab, { key: 'End' })
    expect(document.activeElement).toBe(designTab)
    expect(designTab.getAttribute('aria-selected')).toBe('true')
  })

  it.each(['Enter', ' '])('activates a focused tab with %s', (key) => {
    render(<TabsHarness />)
    const designTab = screen.getByRole('tab', { name: /Design/ })

    designTab.focus()
    fireEvent.keyDown(designTab, { key })

    expect(designTab.getAttribute('aria-selected')).toBe('true')
  })
})
