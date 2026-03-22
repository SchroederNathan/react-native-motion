import { Container } from '@/components/elements/container'

export default function AnimationsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <main>
      <Container>
        <article className="py-16">
          {children}
        </article>
      </Container>
    </main>
  )
}
