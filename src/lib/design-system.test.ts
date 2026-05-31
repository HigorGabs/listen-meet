import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const projectRoot = process.cwd()

const activeIconFiles = [
  'src/app/page.tsx',
  'src/components/AdvancedAudioRecorder.tsx',
  'src/components/AudioSetupModal.tsx',
  'src/components/MeetingsList.tsx',
  'src/components/SessionReadinessPanel.tsx',
  'src/components/StudioCommandRail.tsx',
  'src/components/ui/dialog.tsx',
  'src/components/ui/dropdown-menu.tsx',
  'src/components/ui/select.tsx',
]

function readProjectFile(path: string) {
  return readFileSync(join(projectRoot, path), 'utf8')
}

function listFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(directory, entry.name)
    if (entry.isDirectory()) return listFiles(fullPath)
    return fullPath
  })
}

describe('Google visual system', () => {
  it('uses Roboto as the app font and loads Google Material Symbols', () => {
    const layoutSource = readProjectFile('src/app/layout.tsx')
    const globalCssSource = readProjectFile('src/app/globals.css')

    expect(layoutSource).toContain('Roboto')
    expect(layoutSource).toContain('--font-roboto')
    expect(layoutSource).toContain('fonts.googleapis.com/css2?family=Material+Symbols+Rounded')
    expect(layoutSource).toContain('display=block')
    expect(layoutSource).not.toContain('Geist')
    expect(globalCssSource).toContain('--font-sans: var(--font-roboto)')
    expect(globalCssSource).toContain('.material-symbols-rounded')
  })

  it('uses Material Symbols instead of lucide in active app surfaces', () => {
    for (const path of activeIconFiles) {
      const source = readProjectFile(path)

      expect(source, path).not.toContain('lucide-react')
    }
  })

  it('does not keep copied source artifacts inside src', () => {
    const copiedSources = listFiles(join(projectRoot, 'src'))
      .filter((path) => / \d+\.(tsx?|jsx?)$/.test(path))

    expect(copiedSources).toEqual([])
  })

  it('uses theme-aware status tokens instead of dark-only text classes', () => {
    const pageSource = readProjectFile('src/app/page.tsx')

    expect(pageSource).not.toMatch(/text-(amber|cyan|emerald)-100/)
    expect(pageSource).toContain('var(--studio-warning-text)')
    expect(pageSource).toContain('var(--studio-info-text)')
    expect(pageSource).toContain('var(--studio-success-text)')
    expect(pageSource).toContain('role="status"')
    expect(pageSource).toContain('aria-live="polite"')
  })
})
