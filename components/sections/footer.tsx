export function Footer() {
  return (
    <footer className="bg-taupe-100 dark:bg-taupe-950">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-8 lg:px-10">
        <p className="text-sm/6 text-taupe-500 dark:text-taupe-400">
          Made by{' '}
          <a
            href="https://nathanschroeder.dev"
            className="text-taupe-700 hover:text-taupe-900 dark:text-taupe-300 dark:hover:text-taupe-100"
          >
            Nathan
          </a>
        </p>
        <a
          href="https://x.com/nater02"
          className="text-taupe-400 hover:text-taupe-600 dark:text-taupe-500 dark:hover:text-taupe-300"
          aria-label="X"
        >
          <svg fill="currentColor" viewBox="0 0 24 24" className="size-5">
            <path d="M13.6823 10.6218L20.2391 3H18.6854L12.9921 9.61788L8.44486 3H3.2002L10.0765 13.0074L3.2002 21H4.75404L10.7663 14.0113L15.5685 21H20.8131L13.6819 10.6218H13.6823ZM11.5541 13.0956L10.8574 12.0991L5.31391 4.16971H7.70053L12.1742 10.5689L12.8709 11.5655L18.6861 19.8835H16.2995L11.5541 13.096V13.0956Z" />
          </svg>
        </a>
      </div>
    </footer>
  )
}
