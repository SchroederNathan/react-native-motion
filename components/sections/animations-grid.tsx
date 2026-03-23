'use client'

import { Container } from '@/components/elements/container'
import { AnimationCard } from '@/components/elements/animation-card'
import type { AnimationMeta } from '@/lib/animations'

export function AnimationsGrid({ animations, animate = true }: { animations: AnimationMeta[]; animate?: boolean }) {
  return (
    <section className="py-16">
      <Container>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {animations.map((animation, i) => (
            <div
              key={animation.slug}
              className={animate ? 'blur-fade-in' : undefined}
              style={animate ? { animationDelay: `${500 + i * 100}ms` } : undefined}
            >
              <AnimationCard animation={animation} index={i} />
            </div>
          ))}
        </div>
      </Container>
    </section>
  )
}
