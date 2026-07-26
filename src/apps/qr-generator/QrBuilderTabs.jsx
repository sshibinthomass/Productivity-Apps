import { useRef } from 'react'

const TABS = [
  {
    id: 'build',
    number: '01',
    eyebrow: 'Content and details',
    label: 'Build QR',
  },
  {
    id: 'design',
    number: '02',
    eyebrow: 'Make it yours',
    label: 'Design',
  },
]

export default function QrBuilderTabs({ activeTab, onChange }) {
  const tabRefs = useRef([])

  const activate = (index, moveFocus = false) => {
    const nextTab = TABS[index]
    onChange(nextTab.id)
    if (moveFocus) {
      tabRefs.current[index]?.focus()
    }
  }

  const handleKeyDown = (event, index) => {
    let nextIndex = null

    if (event.key === 'ArrowRight') {
      nextIndex = (index + 1) % TABS.length
    } else if (event.key === 'ArrowLeft') {
      nextIndex = (index - 1 + TABS.length) % TABS.length
    } else if (event.key === 'Home') {
      nextIndex = 0
    } else if (event.key === 'End') {
      nextIndex = TABS.length - 1
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      activate(index)
      return
    }

    if (nextIndex !== null) {
      event.preventDefault()
      activate(nextIndex, true)
    }
  }

  return (
    <div
      aria-label="QR builder sections"
      className="qr-builder-tabs"
      role="tablist"
    >
      {TABS.map((tab, index) => {
        const selected = activeTab === tab.id

        return (
          <button
            aria-controls={`qr-panel-${tab.id}`}
            aria-selected={selected}
            className="qr-builder-tab"
            id={`qr-tab-${tab.id}`}
            key={tab.id}
            onClick={() => activate(index)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            ref={(node) => {
              tabRefs.current[index] = node
            }}
            role="tab"
            tabIndex={selected ? 0 : -1}
            type="button"
          >
            <span aria-hidden="true" className="qr-builder-tab__number">
              {tab.number}
            </span>
            <span className="qr-builder-tab__copy">
              <small>{tab.eyebrow}</small>
              <strong>{tab.label}</strong>
            </span>
          </button>
        )
      })}
    </div>
  )
}
