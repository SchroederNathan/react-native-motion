import { clsx } from 'clsx/lite'
import type { ComponentProps, ReactNode } from 'react'
import { Container } from '../elements/container'
import { Heading } from '../elements/heading'
import { Text } from '../elements/text'

export function Hero({
  eyebrow,
  headline,
  subheadline,
  cta,
  demo,
  footer,
  className,
  ...props
}: {
  eyebrow?: ReactNode
  headline: ReactNode
  subheadline: ReactNode
  cta?: ReactNode
  demo?: ReactNode
  footer?: ReactNode
} & ComponentProps<'section'>) {
  return (
    <section className={clsx('pt-16 sm:py-16', className)} {...props}>
      <Container className="flex flex-col gap-16 ">
        <div className="flex flex-col sm:items-center gap-32 ">
          <div className="flex flex-col items-start sm:items-center gap-6">
            <div className="blur-fade-in" style={{ animationDelay: '0ms' }}>{eyebrow}</div>
            <Heading className="max-w-5xl text-start sm:text-center font-medium">{headline}</Heading>
            <Text size="lg" className="blur-fade-in flex max-w-3xl flex-col gap-4 text-start sm:text-center" style={{ animationDelay: '300ms' }}>
              {subheadline}
            </Text>
            <div
              className="blur-fade-in w-full sm:w-auto mt-5 sm:mt-0"
              style={{ animationDelay: '400ms' }}
            >
              {cta}
            </div>
          </div>
          {demo}
        </div>
        {footer}
      </Container>
    </section>
  )
}
