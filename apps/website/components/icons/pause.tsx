export function PauseIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M3.25 5C3.25 4.0335 4.0335 3.25 5 3.25H9C9.9665 3.25 10.75 4.0335 10.75 5V19C10.75 19.9665 9.9665 20.75 9 20.75H5C4.0335 20.75 3.25 19.9665 3.25 19V5Z"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M13.25 5C13.25 4.0335 14.0335 3.25 15 3.25H19C19.9665 3.25 20.75 4.0335 20.75 5V19C20.75 19.9665 19.9665 20.75 19 20.75H15C14.0335 20.75 13.25 19.9665 13.25 19V5Z"
      />
    </svg>
  )
}
