import type { MDXComponents } from 'mdx/types'
import { VideoDemo } from '@/components/elements/video-demo'

export function useMDXComponents(): MDXComponents {
  return {
    VideoDemo,
    h1: ({ children }) => (
      <h1 className="text-4xl/10 tracking-tight font-medium text-taupe-950 dark:text-taupe-50 mt-8 mb-4 text-wrap-balance">
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-2xl/8 tracking-tight font-medium text-taupe-950 dark:text-taupe-50 mt-8 mb-3 text-wrap-balance">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-lg/7 tracking-tight font-medium text-taupe-950 dark:text-taupe-50 mt-6 mb-2">
        {children}
      </h3>
    ),
    p: ({ children }) => (
      <p className="text-base/7 text-taupe-700 dark:text-taupe-300 mb-4 text-wrap-pretty">
        {children}
      </p>
    ),
    a: ({ children, href }) => (
      <a
        href={href}
        className="text-taupe-950 dark:text-taupe-50 underline decoration-taupe-400/40 underline-offset-2 hover:decoration-taupe-400"
      >
        {children}
      </a>
    ),
    ul: ({ children }) => (
      <ul className="list-disc pl-6 mb-4 space-y-1 text-taupe-700 dark:text-taupe-300">
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className="list-decimal pl-6 mb-4 space-y-1 text-taupe-700 dark:text-taupe-300">
        {children}
      </ol>
    ),
    li: ({ children }) => (
      <li className="text-base/7">{children}</li>
    ),
    code: ({ children }) => (
      <code className="rounded-md bg-taupe-950/5 px-1.5 py-0.5 text-sm font-mono text-taupe-800 dark:bg-taupe-50/10 dark:text-taupe-200">
        {children}
      </code>
    ),
    pre: ({ children }) => (
      <pre className="overflow-x-auto rounded-xl bg-taupe-900 dark:bg-taupe-900 p-4 text-sm text-taupe-100 mb-4">
        {children}
      </pre>
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-l-2 border-taupe-300 dark:border-taupe-700 pl-4 my-4 text-taupe-600 dark:text-taupe-400 italic">
        {children}
      </blockquote>
    ),
    hr: () => (
      <hr className="my-8 border-taupe-200 dark:border-taupe-800" />
    ),
    table: ({ children }) => (
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm text-left text-taupe-700 dark:text-taupe-300">
          {children}
        </table>
      </div>
    ),
    th: ({ children }) => (
      <th className="px-3 py-2 font-medium text-taupe-950 dark:text-taupe-50 border-b border-taupe-200 dark:border-taupe-800">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="px-3 py-2 border-b border-taupe-200/50 dark:border-taupe-800/50">
        {children}
      </td>
    ),
  }
}
