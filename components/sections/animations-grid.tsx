'use client'

import { Container } from '@/components/elements/container'
import { AnimationCard } from '@/components/elements/animation-card'
import type { AnimationMeta } from '@/lib/animations'

export function AnimationsGrid({ animations }: { animations: AnimationMeta[] }) {
  return (
    <section className="py-16">
      <Container>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {animations.map((animation, i) => (
            <div
              key={animation.slug}
              className="blur-fade-in"
              style={{ animationDelay: `${500 + i * 100}ms` }}
            >
              <AnimationCard animation={animation} index={i} />
            </div>
          ))}
        </div>
      </Container>
    </section>
  )
}
