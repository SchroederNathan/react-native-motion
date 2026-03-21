import { AnnouncementBadge } from '@/components/elements/announcement-badge'
import { ButtonLink, PlainButtonLink } from '@/components/elements/button'
import { Main } from '@/components/elements/main'
import { SearchInput } from '@/components/elements/search-input'
import { Hero } from '@/components/sections/hero'
import { Navbar, NavbarLogo } from '@/components/sections/navbar'

export default function Page() {
  return (
    <>
      <Navbar
        id="navbar"
        logo={
          <NavbarLogo href="#">
            <span className="sr-only">Raect Native Motion</span>
            <img
              alt=""
              src="/logo.svg"
              className="h-4 w-auto invert dark:invert-0"
            />

          </NavbarLogo>
        }

        actions={
          <>
            <PlainButtonLink href="https://github.com/SchroederNathan/react-native-motion" className="max-sm:hidden">
              GitHub
            </PlainButtonLink>
            <ButtonLink href="https://ko-fi.com/nathanschroeder">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-4">
                <path d="M19.75 15V13C19.75 12.4477 19.3023 12 18.75 12H16.75C16.1977 12 15.75 11.5523 15.75 11C15.75 10.4477 16.1977 10 16.75 10H18.75C20.4069 10 21.75 11.3431 21.75 13V15C21.75 16.6569 20.4069 18 18.75 18H16.75C16.1977 18 15.75 17.5523 15.75 17C15.75 16.4477 16.1977 16 16.75 16H18.75C19.3023 16 19.75 15.5523 19.75 15Z" />
                <path d="M5 5.25V3.25C5 2.69772 5.44772 2.25 6 2.25C6.55228 2.25 7 2.69772 7 3.25V5.25C7 5.80228 6.55228 6.25 6 6.25C5.44772 6.25 5 5.80228 5 5.25ZM9 5.25V3.25C9 2.69772 9.44772 2.25 10 2.25C10.5523 2.25 11 2.69772 11 3.25V5.25C11 5.80228 10.5523 6.25 10 6.25C9.44772 6.25 9 5.80228 9 5.25ZM13 5.25V3.25C13 2.69772 13.4477 2.25 14 2.25C14.5523 2.25 15 2.69772 15 3.25V5.25C15 5.80228 14.5523 6.25 14 6.25C13.4477 6.25 13 5.80228 13 5.25Z" />
                <path d="M14 21.75C16.0711 21.75 17.75 20.0711 17.75 18V10C17.75 9.0335 16.9665 8.25 16 8.25H4C3.0335 8.25 2.25 9.0335 2.25 10V18C2.25 20.0711 3.92893 21.75 6 21.75H14Z" />
              </svg>
              Buy me a coffee
            </ButtonLink>
          </>
        }
      />

      <Main>
        <Hero
          id="hero"
          eyebrow={
            <AnnouncementBadge
              href="#"
              text="Introducing React Native Motion v1.0"
              badgeText="New"
            />
          }
          headline={
            <>
              <span className="inline-block blur-fade-in" style={{ animationDelay: '100ms' }}>React</span>{' '}
              <span className="inline-block blur-fade-in" style={{ animationDelay: '150ms' }}>Native</span>{' '}
              <span className="inline-block blur-fade-in font-redaction italic" style={{ animationDelay: '200ms' }}>Motion</span>
            </>
          }
          subheadline={
            <p>
              Beautiful animations for React Native and Expo. <br />
              Built for you or your agent to ship.
            </p>
          }
          cta={
            <SearchInput className="min-w-xs" />
          }
        />
      </Main>
    </>
  )
}
