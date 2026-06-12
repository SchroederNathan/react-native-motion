'use client'

import { createContext, useContext, useRef, useState, useMemo, type ReactNode } from 'react'
import { SearchInput } from '@/components/elements/search-input'
import { AnimationsGrid } from '@/components/sections/animations-grid'
import { Container } from '@/components/elements/container'
import type { AnimationMeta } from '@/lib/animations'

const SearchContext = createContext<{
  query: string
  setQuery: (q: string) => void
}>({ query: '', setQuery: () => {} })

export function AnimationSearchProvider({
  children,
}: {
  children: ReactNode
}) {
  const [query, setQuery] = useState('')
  return (
    <SearchContext.Provider value={{ query, setQuery }}>
      {children}
    </SearchContext.Provider>
  )
}

export function AnimationSearchInput({ className }: { className?: string }) {
  const { query, setQuery } = useContext(SearchContext)
  return (
    <SearchInput
      className={className}
      value={query}
      onChange={(e) => setQuery(e.target.value)}
    />
  )
}

export function FilteredAnimationsGrid({ animations }: { animations: AnimationMeta[] }) {
  const { query } = useContext(SearchContext)
  const hasSearched = useRef(false)
  if (query) hasSearched.current = true

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    if (!q) return animations
    return animations.filter((a) => {
      const haystack = [a.title, a.description, ...(a.tags ?? [])].filter(Boolean).join(' ').toLowerCase()
      return q.split(/\s+/).every((word) => haystack.includes(word))
    })
  }, [query, animations])

  return (
    <>
      <AnimationsGrid animations={filtered} animate={!hasSearched.current} />
      {filtered.length === 0 && (
        <Container>
          <p className="pb-16 text-center text-sm text-taupe-500">
            No animations found for &ldquo;{query}&rdquo;
          </p>
        </Container>
      )}
    </>
  )
}
