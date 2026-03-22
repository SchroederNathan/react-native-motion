import { clsx } from 'clsx/lite'
import { type ComponentProps, type ReactNode } from 'react'

export function NavbarLink({
  children,
  href,
  className,
  ...props
}: { href: string } & Omit<ComponentProps<'a'>, 'href'>) {
  return (
    <a
      href={href}
      className={clsx(
        'group inline-flex items-center justify-between gap-2 text-3xl/10 font-medium text-taupe-950 lg:text-sm/7 dark:text-taupe-50',
        className,
      )}
      {...props}
    >
      {children}
      <span className="inline-flex p-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150 lg:hidden" aria-hidden="true">
        <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
        </svg>
      </span>
    </a>
  )
}

export function NavbarLogo({ className, href, ...props }: { href: string } & Omit<ComponentProps<'a'>, 'href'>) {
  return <a href={href} {...props} className={clsx('relative inline-flex items-stretch after:absolute after:inset-0 after:-inset-y-2 after:-inset-x-2 after:content-[""]', className)} />
}

export function Navbar({
  links,
  logo,
  actions,
  className,
  ...props
}: {
  logo: ReactNode
  actions: ReactNode
  links?: ReactNode
} & ComponentProps<'header'>) {

  return (
    <header className={clsx('blur-fade-in sticky top-0 z-10 bg-taupe-100 dark:bg-taupe-950', className)} {...props}>
      <style>{`:root { --scroll-padding-top: 5.25rem }`}</style>
      <nav>
        <div className="mx-auto flex h-(--scroll-padding-top) max-w-7xl items-center gap-4 px-6 lg:px-10">
          <div className="flex flex-1 items-center gap-12">
            <div className="flex items-center">{logo}</div>
            <div className="flex gap-8 max-lg:hidden">{links}</div>
          </div>
          <div className="flex shrink-0 items-center gap-4">{actions}</div>

        </div>

      </nav>
    </header>
  )
}
