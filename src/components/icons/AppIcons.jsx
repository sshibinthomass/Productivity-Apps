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
