'use client'

import { Menu, MenuButton, MenuItems, MenuItem } from '@headlessui/react'
import { clsx } from 'clsx/lite'
import { motion, AnimatePresence } from 'motion/react'
import { useParams } from 'next/navigation'
import { useCallback, useRef, useState } from 'react'

const buttonBase =
  'inline-flex items-center justify-center text-sm/7 font-medium text-taupe-800 hover:text-taupe-900 dark:text-taupe-300 dark:hover:text-taupe-200 cursor-pointer'

const menuPanelSpring = { type: 'spring' as const, duration: 0.25, bounce: 0 }

const menuPanelVariants = {
  initial: {
    opacity: 0,
    y: -4,
    filter: 'blur(4px)',
    transition: menuPanelSpring,
  },
  open: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: menuPanelSpring,
  },
  exit: {
    opacity: 0,
    y: -4,
    filter: 'blur(4px)',
    transition: menuPanelSpring,
  },
}

export function PromptActions() {
  const { slug } = useParams<{ slug: string }>()
  const [copied, setCopied] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const mdUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/animations/${slug}.md`

  const implementPrompt = `You are given a task to integrate a React Native animation into your codebase.
Please verify your project has the following setup:
- React Native with Expo
- react-native-reanimated
- react-native-gesture-handler
- TypeScript

If any of these are missing, provide instructions on how to install them via npx expo install.

Read the animation source and implementation guide from: ${mdUrl}

Then:
1. Install all required dependencies listed in the guide
2. Copy each file into your project at the paths specified
3. Follow the usage example to integrate the animation into your app
4. Review the "Common Pitfalls" section and verify your implementation avoids each one`

  const explainPrompt = `I want to understand how this React Native animation works. Read the full implementation and guide from: ${mdUrl}

Then explain:
1. The overall animation architecture — what techniques and libraries are used and why
2. How the gesture handling and animation values flow through the components
3. Key implementation details that make the animation feel polished
4. The common pitfalls listed and why each one matters

Focus on building my mental model of the animation system, not just describing the code line by line.`

  const openInChatGPT = useCallback(() => {
    window.open(`https://chatgpt.com/?q=${encodeURIComponent(explainPrompt)}`, '_blank')
  }, [explainPrompt])

  const openInClaude = useCallback(() => {
    window.open(`https://claude.ai/new?q=${encodeURIComponent(explainPrompt)}`, '_blank')
  }, [explainPrompt])

  const copyPrompt = useCallback(async () => {
    if (copied) return
    try {
      await navigator.clipboard.writeText(implementPrompt)
      setCopied(true)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => setCopied(false), 2000)
    } catch {
      // Silently fail — clipboard not available
    }
  }, [copied, implementPrompt])

  return (
    <div
      className="inline-flex items-stretch border-shadow rounded-lg bg-taupe-50 dark:bg-taupe-50/[0.02]"
    >
      <motion.button
        type="button"
        onClick={copyPrompt}
        layout
        transition={{ type: 'spring', duration: 0.4, bounce: 0.1 }}
        className={clsx(
          buttonBase,
          'relative gap-1.5 rounded-l-lg px-3 py-1 border-r border-taupe-950/10 dark:border-taupe-50/15 overflow-hidden',
        )}
      >
        <span className="relative size-4 shrink-0">
          <span
            className="absolute inset-0 flex items-center justify-center transition-[opacity,scale,filter] duration-300 [transition-timing-function:cubic-bezier(0.2,0,0,1)]"
            style={{
              opacity: copied ? 0 : 1,
              scale: copied ? '0.25' : '1',
              filter: copied ? 'blur(4px)' : 'blur(0px)',
            }}
          >
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none">
              <path d="M19.0001 18.75C20.5189 18.75 21.7501 17.5188 21.7501 16V4C21.7501 2.48122 20.5189 1.25 19.0001 1.25H9.00012C7.48134 1.25 6.25012 2.48122 6.25012 4V16C6.25012 17.5188 7.48134 18.75 9.00012 18.75H19.0001Z" fill="currentColor" />
              <path d="M2.25012 19.75V6.25C2.25012 5.69772 2.69784 5.25 3.25012 5.25C3.80241 5.25 4.25012 5.69772 4.25012 6.25V19.75C4.25012 20.3023 4.69784 20.75 5.25012 20.75H16.7501C17.3024 20.75 17.7501 21.1977 17.7501 21.75C17.7501 22.3023 17.3024 22.75 16.7501 22.75H5.25012C3.59327 22.75 2.25012 21.4069 2.25012 19.75Z" fill="currentColor" />
            </svg>
          </span>
          <span
            className="absolute inset-0 flex items-center justify-center transition-[opacity,scale,filter] duration-300 [transition-timing-function:cubic-bezier(0.2,0,0,1)]"
            style={{
              opacity: copied ? 1 : 0,
              scale: copied ? '1' : '0.25',
              filter: copied ? 'blur(0px)' : 'blur(4px)',
            }}
          >
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none">
              <path fillRule="evenodd" clipRule="evenodd" d="M20.1757 5.26268C20.5828 5.63587 20.6103 6.26844 20.2372 6.67556L9.23715 18.6756C9.05285 18.8766 8.79441 18.9937 8.52172 18.9996C8.24903 19.0055 7.98576 18.8998 7.79289 18.7069L3.29289 14.2069C2.90237 13.8164 2.90237 13.1832 3.29289 12.7927C3.68342 12.4022 4.31658 12.4022 4.70711 12.7927L8.46859 16.5542L18.7628 5.32411C19.136 4.91699 19.7686 4.88948 20.1757 5.26268Z" fill="currentColor" />
            </svg>
          </span>
        </span>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={copied ? 'copied' : 'copy'}
            initial={{ opacity: 0, y: 8, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
            transition={{ type: 'spring', duration: 0.35, bounce: 0 }}
          >
            {copied ? 'Copied!' : 'Copy prompt'}
          </motion.span>
        </AnimatePresence>
      </motion.button>

      <Menu as="div" className="relative flex">
        {({ open }) => (
          <>
            <MenuButton
              className={clsx(
                buttonBase,
                'rounded-r-lg px-2 focus:outline-none',
              )}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 16 16"
                fill="currentColor"
                className="size-4"
              >
                <path
                  fillRule="evenodd"
                  d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z"
                  clipRule="evenodd"
                />
              </svg>
            </MenuButton>

            <AnimatePresence>
              {open && (
                <MenuItems
                  static
                  as={motion.div}
                  anchor="bottom end"
                  variants={menuPanelVariants}
                  initial="initial"
                  animate="open"
                  exit="exit"
                  className="border-shadow z-50 mt-2 w-52 rounded-lg bg-taupe-50/80 backdrop-blur-lg p-1 focus:outline-none dark:bg-taupe-50/[0.02]"
                >
          <MenuItem>
            <a
              href={`/api/animations/${slug}/md`}
              target="_blank"
              className="group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-taupe-700 focus:outline-none data-[focus]:bg-taupe-100 dark:text-taupe-300 dark:data-[focus]:bg-taupe-50/5"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 208 128" fill="currentColor" className="size-4">
                <rect width="198" height="118" x="5" y="5" ry="10" stroke="currentColor" strokeWidth="10" fill="none"/>
                <path d="M30 98V30h20l20 25 20-25h20v68H90V59L70 84 50 59v39zm125 0l-30-33h20V30h20v35h20z"/>
              </svg>
              View as markdown
            </a>
          </MenuItem>
          <MenuItem>
            <button
              onClick={openInChatGPT}
              className="group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-taupe-700 focus:outline-none data-[focus]:bg-taupe-100 dark:text-taupe-300 dark:data-[focus]:bg-taupe-50/5 cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-4">
                <path d="M10.8312 2.25C8.55502 2.25 6.72848 4.05765 6.72848 6.26471V11.6721L8.5033 12.717L8.50289 7.03256C8.50287 6.82597 8.61397 6.63534 8.79373 6.53351L13.8559 3.66586C13.8788 3.65291 13.9017 3.64014 13.9247 3.62756C13.1733 2.78424 12.0673 2.25 10.8312 2.25Z" />
                <path d="M20.3539 9.45169C20.7288 8.39044 20.649 7.18338 20.0322 6.13514C18.9022 4.21475 16.3899 3.54874 14.4214 4.66389L9.65002 7.36677L9.65016 9.25194L14.6484 6.52949C14.8224 6.4347 15.033 6.43646 15.2054 6.53413L20.2676 9.40178C20.2966 9.41818 20.3253 9.43483 20.3539 9.45169Z" />
                <path d="M9.65026 10.5581L9.65047 13.3923L11.9529 14.7478L14.4088 13.4101L14.4558 10.67L12.0476 9.25228L9.65026 10.5581Z" />
                <path d="M13.222 8.61259L18.1365 11.5058C18.3116 11.6088 18.4191 11.7968 18.4191 12V17.7353C18.4191 17.7628 18.4188 17.7902 18.4184 17.8175C19.5522 17.6046 20.584 16.9282 21.2022 15.8776C22.3284 13.9638 21.6646 11.5115 19.7022 10.3998L14.9173 7.68922L13.222 8.61259Z" />
                <path d="M15.5916 11.3387L15.4949 16.9767C15.4915 17.1798 15.3809 17.3658 15.2042 17.4659L10.142 20.3336C10.1196 20.3463 10.0971 20.3588 10.0746 20.3711C10.8259 21.2152 11.9325 21.75 13.1692 21.75C15.4454 21.75 17.2719 19.9424 17.2719 17.7353V12.3279L15.5916 11.3387Z" />
                <path d="M14.3862 14.7286L9.35164 17.4709C9.17762 17.5657 8.96699 17.5639 8.79457 17.4662L3.73237 14.5986C3.70272 14.5818 3.67331 14.5648 3.64412 14.5475C3.26908 15.6088 3.34884 16.816 3.9657 17.8643C5.09571 19.7847 7.60799 20.4507 9.57655 19.3355L14.3536 16.6294L14.3862 14.7286Z" />
                <path d="M10.7785 15.3875L8.8055 14.226C8.79258 14.219 8.77995 14.2116 8.76765 14.2037L5.86393 12.4942C5.68885 12.3912 5.58136 12.2032 5.58136 12V6.26471C5.58136 6.23734 5.58158 6.21003 5.58201 6.18277C4.44805 6.39557 3.41608 7.072 2.79778 8.12278C1.67163 10.0366 2.3354 12.4889 4.29779 13.6006L9.08274 16.3111L10.7785 15.3875Z" />
              </svg>
              Open in ChatGPT
            </button>
          </MenuItem>
          <MenuItem>
            <button
              onClick={openInClaude}
              className="group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-taupe-700 focus:outline-none data-[focus]:bg-taupe-100 dark:text-taupe-300 dark:data-[focus]:bg-taupe-50/5 cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-4">
                <path d="M21.9233 14.4301L22 14L21.6291 13.4965L20.9428 13.065C20.9428 13.065 19.4289 12.8889 18.2831 12.8889C16.8124 12.8889 15.7782 12.8006 15.2699 12.7432L15.202 12.6527L21.6291 11.1704L21.9233 10.5254L21.8667 10.2086L21.1651 9.83519L15.8356 10.8875L15.7677 10.7857C16.458 9.31683 18.0195 7.56458 19.0605 6.16902L19.3547 5.18458L18.7323 4.23409H17.8384C17.8384 4.23409 16.5145 5.28642 14.0252 8.70365L13.6857 9.05443H13.5273L14.5796 3.13651L14.1949 2.54811L13.6857 2.3218L13.086 2.70652L12.7692 3.46465L12.2034 9.65414H12.0676L11.8074 8.70365C11.8074 8.70365 9.53297 4.44909 8.7638 2.4142L8.39441 2.12448L7.5 2L7.23552 2.12448L6.61986 2.92846L6.85888 4.04389L9.85751 9.31683L9.71264 9.43272L4.98293 5.82568L4.07755 5.76049L3.53432 6.33994L3.67194 7.16564L4.01236 7.60747L9.79232 11.5042L10.0054 11.7186L9.9083 11.8278L2.45561 11.2539L2.03906 11.5195L2 11.8278L2.45561 12.4076L2.93889 12.52L9.86375 12.7891L9.94141 12.918L9.86375 13.1002C9.56079 13.2482 5.73332 15.2667 4.38587 16.3764L4.1657 16.5701L4.09524 17.2042L4.51797 17.5917L5.47792 17.4508L10.762 13.9897L10.8149 14.1747C10.8149 14.1747 9.4146 15.7423 6.49952 19.6437L6.44668 20.2426L7.03674 20.5068L7.35379 20.4099L8.7805 18.8775L11.8101 14.7559H11.9598L11.8101 15.3548C11.7889 15.4887 11.2376 18.7543 10.7092 20.9736L11.0086 21.6341L11.5 22L12.1183 21.775L12.3561 21.458L12.9197 15.4253L13.0518 15.3548C13.0518 15.3548 14.6899 18.1466 16.3016 20.3923L16.8388 20.4804L17.3672 20.3043L17.5257 20.0048L17.42 19.1065L15.0862 15.6542V15.4957H15.2095L19.3752 18.8687H19.6394L19.9036 18.5077L19.8067 18.0321L15.1391 13.7079V13.5846L20.8811 14.9585L21.9233 14.4301Z" />
              </svg>
              Open in Claude
            </button>
          </MenuItem>
        </MenuItems>
              )}
            </AnimatePresence>
          </>
        )}
      </Menu>
    </div>
  )
}
