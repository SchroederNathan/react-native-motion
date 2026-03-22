import Dither from '@/components/effects/dither'
import { AnnouncementBadge } from '@/components/elements/announcement-badge'
import { Main } from '@/components/elements/main'
import {
  AnimationSearchProvider,
  AnimationSearchInput,
  FilteredAnimationsGrid,
} from '@/components/sections/searchable-animations-grid'
import { Hero } from '@/components/sections/hero'
import { getAllAnimationMetas } from '@/lib/animations'

export default async function Page() {
  const animations = await getAllAnimationMetas()
  return (
    <AnimationSearchProvider>
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
            <AnimationSearchInput className="min-w-xs" />
          }
        />
      </Main>

      <div className="relative">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-screen -translate-y-72" style={{ opacity: 0.1 }}>
          <Dither
            waveColor={[0.9, 0.9, 0.9]}
            disableAnimation={false}
            enableMouseInteraction={true}
            mouseRadius={0.1}
            colorNum={3}
            pixelSize={6}
            waveAmplitude={0}
            waveFrequency={2.5}
            waveSpeed={0.03}
          />
        </div>
        <FilteredAnimationsGrid animations={animations} />
      </div>
    </AnimationSearchProvider>
  )
}
