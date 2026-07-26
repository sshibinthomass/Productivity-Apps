function IconFrame({ children, size = 24 }) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height={size}
      viewBox="0 0 24 24"
      width={size}
    >
      {children}
    </svg>
  )
}

export function TextIcon({ size = 24 }) {
  return (
    <IconFrame size={size}>
      <path
        d="M5 6h14M8 10h8M6 14h12M9 18h6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </IconFrame>
  )
}

export function TimerIcon({ size = 24 }) {
  return (
    <IconFrame size={size}>
      <path
        d="M9 3h6m-3 3a7 7 0 1 1-4.95 2.05M12 9v4l2.5 1.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </IconFrame>
  )
}

export function NotesIcon({ size = 24 }) {
  return (
    <IconFrame size={size}>
      <path
        d="M6 3.75h9.5L19 7.25v13H6v-16.5Zm9 0v4h4M9 11h7m-7 4h7"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </IconFrame>
  )
}

export function JsonIcon({ size = 24 }) {
  return (
    <IconFrame size={size}>
      <path
        d="M9 4.5H7.75A1.75 1.75 0 0 0 6 6.25V9c0 1.15-.55 2-1.5 2.35v1.3C5.45 13 6 13.85 6 15v2.75a1.75 1.75 0 0 0 1.75 1.75H9M15 4.5h1.25A1.75 1.75 0 0 1 18 6.25V9c0 1.15.55 2 1.5 2.35v1.3C18.55 13 18 13.85 18 15v2.75a1.75 1.75 0 0 1-1.75 1.75H15"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <circle cx="9.5" cy="12" fill="currentColor" r="0.8" />
      <circle cx="12" cy="12" fill="currentColor" r="0.8" />
      <circle cx="14.5" cy="12" fill="currentColor" r="0.8" />
    </IconFrame>
  )
}

export function CompareIcon({ size = 24 }) {
  return (
    <IconFrame size={size}>
      <path
        d="M4.5 6h6M4.5 10h4M13.5 14h6M15.5 18h4M11 7.5l2-2 2 2M13 5.5v5M13 16.5l-2 2-2-2M11 18.5v-5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </IconFrame>
  )
}

export function QrIcon({ size = 24 }) {
  return (
    <IconFrame size={size}>
      <path
        d="M4 4h6v6H4V4Zm2 2v2h2V6H6Zm8-2h6v6h-6V4Zm2 2v2h2V6h-2ZM4 14h6v6H4v-6Zm2 2v2h2v-2H6Zm8-2h2v2h-2v-2Zm4 0h2v4h-2v-4Zm-4 4h4v2h-4v-2Z"
        fill="currentColor"
      />
    </IconFrame>
  )
}
