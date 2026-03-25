'use client'

import {
  Children,
  isValidElement,
  useState,
  type ReactNode,
  type ReactElement,
} from 'react'
import { FileIcon } from './file-icon'

interface FileEntry {
  name: string
  path: string
  element: ReactElement
}

interface TreeFolder {
  name: string
  files: FileEntry[]
}

function buildTree(files: FileEntry[]): { root: FileEntry[]; folders: TreeFolder[] } {
  const root: FileEntry[] = []
  const folderMap = new Map<string, FileEntry[]>()

  for (const file of files) {
    const slashIndex = file.path.lastIndexOf('/')
    if (slashIndex === -1) {
      root.push(file)
    } else {
      const folder = file.path.substring(0, slashIndex)
      if (!folderMap.has(folder)) {
        folderMap.set(folder, [])
      }
      folderMap.get(folder)!.push(file)
    }
  }

  const folders: TreeFolder[] = Array.from(folderMap.entries()).map(
    ([name, files]) => ({ name, files })
  )

  return { root, folders }
}

function SidebarFile({
  file,
  isActive,
  onClick,
  indent,
}: {
  file: FileEntry
  isActive: boolean
  onClick: () => void
  indent?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] transition-colors ${
        indent ? 'pl-7' : ''
      } ${
        isActive
          ? 'bg-taupe-300/50 dark:bg-taupe-500/20 text-taupe-950 dark:text-taupe-50'
          : 'text-taupe-600 dark:text-taupe-400 hover:bg-taupe-200/50 dark:hover:bg-taupe-500/10 hover:text-taupe-900 dark:hover:text-taupe-200'
      }`}
    >
      <FileIcon
        filename={file.name}
        className="shrink-0 text-taupe-400 dark:text-taupe-500"
      />
      <span className="truncate">{file.name}</span>
    </button>
  )
}

function SidebarFolder({
  folder,
  activeIndex,
  files,
  onSelect,
}: {
  folder: TreeFolder
  activeIndex: number
  files: FileEntry[]
  onSelect: (index: number) => void
}) {
  const [expanded, setExpanded] = useState(true)

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] text-taupe-600 dark:text-taupe-400 hover:bg-taupe-200/50 dark:hover:bg-taupe-500/10 hover:text-taupe-900 dark:hover:text-taupe-200 transition-colors"
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          className={`shrink-0 text-taupe-400 dark:text-taupe-500 transition-transform duration-150 ${
            expanded ? 'rotate-90' : ''
          }`}
        >
          <path
            d="M3.5 2L7 5L3.5 8"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <FileIcon
          filename=""
          isFolder
          className="shrink-0 text-taupe-400 dark:text-taupe-500"
        />
        <span className="truncate">{folder.name}</span>
      </button>
      {expanded &&
        folder.files.map((file) => {
          const globalIndex = files.indexOf(file)
          return (
            <SidebarFile
              key={file.path}
              file={file}
              isActive={globalIndex === activeIndex}
              onClick={() => onSelect(globalIndex)}
              indent
            />
          )
        })}
    </div>
  )
}

export function CodePreviewer({ children }: { children: ReactNode }) {
  const [activeIndex, setActiveIndex] = useState(0)

  const files: FileEntry[] = []
  Children.forEach(children, (child) => {
    if (isValidElement(child) && (child.props as any).title) {
      const path = (child.props as any).title as string
      const name = path.includes('/') ? path.substring(path.lastIndexOf('/') + 1) : path
      files.push({ name, path, element: child as ReactElement })
    }
  })

  if (files.length === 0) {
    return <div>{children}</div>
  }

  const { root, folders } = buildTree(files)

  const activeFile = files[activeIndex]

  return (
    <div className="mb-6 rounded-xl overflow-hidden inset-ring-1 inset-ring-taupe-950/10 dark:inset-ring-taupe-50/10 bg-taupe-50 dark:bg-taupe-50/[0.02]">
      {/* Mobile: horizontal tab bar */}
      <div className="flex lg:hidden overflow-x-auto border-b border-taupe-200/60 dark:border-taupe-50/10 bg-taupe-100/50 dark:bg-taupe-50/5">
        {files.map((file, i) => (
          <button
            key={file.path}
            type="button"
            onClick={() => setActiveIndex(i)}
            className={`flex shrink-0 items-center gap-1.5 px-3 py-2 text-[13px] border-b-2 transition-colors ${
              i === activeIndex
                ? 'border-taupe-950 dark:border-taupe-50 text-taupe-950 dark:text-taupe-50'
                : 'border-transparent text-taupe-500 dark:text-taupe-400 hover:text-taupe-700 dark:hover:text-taupe-200'
            }`}
          >
            <FileIcon
              filename={file.name}
              className="shrink-0 text-taupe-400 dark:text-taupe-500"
            />
            {file.name}
          </button>
        ))}
      </div>

      <div className="flex">
        {/* Desktop: sidebar file tree */}
        <div className="hidden lg:block w-56 shrink-0 border-r border-taupe-200/60 dark:border-taupe-50/10 bg-taupe-100/30 dark:bg-taupe-50/[0.03] py-2">
          {folders.map((folder) => (
            <SidebarFolder
              key={folder.name}
              folder={folder}
              activeIndex={activeIndex}
              files={files}
              onSelect={setActiveIndex}
            />
          ))}
          {root.map((file) => {
            const globalIndex = files.indexOf(file)
            return (
              <SidebarFile
                key={file.path}
                file={file}
                isActive={globalIndex === activeIndex}
                onClick={() => setActiveIndex(globalIndex)}
              />
            )
          })}
        </div>

        {/* Code display */}
        <div className="relative flex-1 min-w-0">
          <div key={activeFile.path} className="[&>pre]:!rounded-none [&>pre]:!mb-0 [&>pre]:!ring-0 [&>pre]:!inset-ring-0 [&>pre]:border-0 [&>pre]:!bg-transparent">
            {activeFile.element}
          </div>
        </div>
      </div>
    </div>
  )
}
