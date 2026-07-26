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
