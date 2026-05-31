# Studio Operacional Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Redesenhar a interface do Listen Meet como um studio operacional profissional sem quebrar gravação, configuração de IA, transcrição ou histórico.

**Architecture:** A mudança é visual e comportamental de UI, preservando APIs e hooks existentes. O plano introduz testes React com Vitest/jsdom, protege contratos de componentes e depois refatora `page.tsx`, `AdvancedAudioRecorder`, `AudioLevelMeter` e `MeetingsList` em ciclos RED/GREEN.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS v4, shadcn/Radix primitives, Vitest, Testing Library, jsdom.

---

## File Structure

- Modify `package.json` and `package-lock.json`: add React testing dependencies.
- Create `vitest.config.ts`: configure jsdom, setup file and `@/` alias.
- Create `src/test/setup.ts`: install jest-dom matchers and test cleanup.
- Create `src/components/AudioLevelMeter.test.tsx`: protect accessible meter semantics.
- Create `src/components/AdvancedAudioRecorder.test.tsx`: protect recorder states and primary actions.
- Create `src/components/MeetingsList.test.tsx`: protect empty and populated history.
- Create `src/components/AudioSetupModal.test.tsx`: protect the auxiliary audio routing guide.
- Create `src/app/page.test.tsx`: protect AI configuration source/model controls.
- Modify `src/components/AudioLevelMeter.tsx`: studio-style stable meter.
- Modify `src/components/AdvancedAudioRecorder.tsx`: studio recorder console.
- Modify `src/components/MeetingsList.tsx`: dense operational history.
- Modify `src/components/AudioSetupModal.tsx`: studio-style audio routing guide.
- Modify `src/app/page.tsx`: studio app shell and configuration screen.
- Modify `src/app/globals.css`: global studio palette, background and motion utilities.
- Optionally modify `README.md`: short note only if visual behavior changes need documentation.

---

## Task 1: React Test Harness

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `vitest.config.ts`
- Create: `src/test/setup.ts`

- [x] **Step 1: Install test dependencies**

Run:

```bash
npm install -D @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

Expected: packages install and `package-lock.json` updates.

- [x] **Step 2: Create Vitest config**

Create `vitest.config.ts`:

```ts
import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

- [x] **Step 3: Create setup file**

Create `src/test/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()
})
```

- [x] **Step 4: Verify current tests still pass**

Run:

```bash
npm run test
```

Expected: existing non-React tests pass.

---

## Task 2: RED Tests For Studio Contracts

**Files:**
- Create: `src/components/AudioLevelMeter.test.tsx`
- Create: `src/components/AdvancedAudioRecorder.test.tsx`
- Create: `src/components/MeetingsList.test.tsx`
- Create: `src/app/page.test.tsx`

- [x] **Step 1: Add AudioLevelMeter failing test**

Create `src/components/AudioLevelMeter.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AudioLevelMeter } from './AudioLevelMeter'

describe('AudioLevelMeter', () => {
  it('renders a stable studio meter with accessible level semantics', () => {
    render(<AudioLevelMeter level={48.6} isActive />)

    const meter = screen.getByRole('meter', { name: /nível de áudio/i })
    expect(meter).toHaveAttribute('aria-valuenow', '49')
    expect(meter).toHaveAttribute('data-state', 'active')
    expect(screen.getAllByTestId('audio-meter-bar')).toHaveLength(24)
    expect(screen.getByText('49%')).toBeInTheDocument()
  })
})
```

- [x] **Step 2: Add AdvancedAudioRecorder failing tests**

Create `src/components/AdvancedAudioRecorder.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AdvancedAudioRecorder } from './AdvancedAudioRecorder'
import { useAdvancedAudioRecorder } from '@/hooks/useAdvancedAudioRecorder'

vi.mock('@/hooks/useAdvancedAudioRecorder')

const mockUseAdvancedAudioRecorder = vi.mocked(useAdvancedAudioRecorder)

function baseRecorderState(overrides = {}) {
  return {
    isRecording: false,
    isPaused: false,
    duration: 0,
    startRecording: vi.fn(),
    stopRecording: vi.fn(),
    pauseRecording: vi.fn(),
    resumeRecording: vi.fn(),
    audioDevices: [],
    selectedDeviceId: 'default',
    setSelectedDeviceId: vi.fn(),
    refreshDevices: vi.fn(),
    audioLevel: 0,
    isMonitoring: false,
    startMonitoring: vi.fn(),
    stopMonitoring: vi.fn(),
    handleFileUpload: vi.fn(),
    recordingData: null,
    error: null,
    clearError: vi.fn(),
    ...overrides,
  }
}

describe('AdvancedAudioRecorder', () => {
  beforeEach(() => {
    mockUseAdvancedAudioRecorder.mockReturnValue(baseRecorderState())
  })

  it('renders the studio recorder idle state', () => {
    render(<AdvancedAudioRecorder />)

    expect(screen.getByText('Studio de gravação')).toBeInTheDocument()
    expect(screen.getByText('00:00')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /iniciar gravação/i })).toBeEnabled()
    expect(screen.getByRole('button', { name: /testar áudio/i })).toBeEnabled()
    expect(screen.getByText(/upload secundário/i)).toBeInTheDocument()
  })

  it('renders recording controls when capture is active', () => {
    mockUseAdvancedAudioRecorder.mockReturnValue(baseRecorderState({
      isRecording: true,
      duration: 125,
      audioLevel: 64,
      isMonitoring: true,
    }))

    render(<AdvancedAudioRecorder />)

    expect(screen.getByText('02:05')).toBeInTheDocument()
    expect(screen.getByText('Gravando')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /pausar/i })).toBeEnabled()
    expect(screen.getByRole('button', { name: /parar/i })).toBeEnabled()
  })
})
```

- [x] **Step 3: Add MeetingsList failing tests**

Create `src/components/MeetingsList.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MeetingsList } from './MeetingsList'
import { MeetingStorage } from '@/utils/storage'

vi.mock('@/utils/storage', async () => {
  const actual = await vi.importActual<typeof import('@/utils/storage')>('@/utils/storage')
  return {
    ...actual,
    MeetingStorage: {
      getAllMeetings: vi.fn(),
      deleteMeeting: vi.fn(),
      downloadMeetingTxt: vi.fn(),
    },
  }
})

const mockMeetingStorage = vi.mocked(MeetingStorage)

const meeting = {
  id: 'meeting-1',
  title: 'Reunião de Produto',
  date: new Date().toISOString(),
  duration: 245,
  filename: 'reuniao.txt',
  summary: {
    title: 'Reunião de Produto',
    overview: 'Discussão sobre prioridades do trimestre.',
    summary: 'Time definiu prioridades e próximos passos.',
    keyPoints: ['Priorizar onboarding'],
    actionItems: ['Higor revisar backlog'],
    participants: ['Higor', 'Ana'],
    topics: ['Produto'],
  },
}

describe('MeetingsList', () => {
  beforeEach(() => {
    mockMeetingStorage.getAllMeetings.mockReturnValue([])
  })

  it('renders a studio empty state with a recording action', () => {
    render(<MeetingsList onNewRecording={vi.fn()} />)

    expect(screen.getByText('Nenhuma reunião no console')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /gravar nova reunião/i })).toBeInTheDocument()
  })

  it('renders operational history metrics and expands meeting details', async () => {
    mockMeetingStorage.getAllMeetings.mockReturnValue([meeting])

    render(<MeetingsList onNewRecording={vi.fn()} />)

    expect(screen.getByText('Console de reuniões')).toBeInTheDocument()
    expect(screen.getByText('Reunião de Produto')).toBeInTheDocument()
    expect(screen.getByText('1 sessão')).toBeInTheDocument()

    await userEvent.click(screen.getByText('Reunião de Produto'))

    expect(screen.getByText('Priorizar onboarding')).toBeInTheDocument()
    expect(screen.getByText('Higor revisar backlog')).toBeInTheDocument()
  })
})
```

- [x] **Step 4: Add page failing test**

Create `src/app/page.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Home from './page'

vi.mock('@/components/AdvancedAudioRecorder', () => ({
  AdvancedAudioRecorder: () => <div>Studio de gravação mockado</div>,
}))

vi.mock('@/components/MeetingsList', () => ({
  MeetingsList: () => <div>Console de reuniões mockado</div>,
}))

const providersResponse = {
  providers: [
    {
      id: 'gemini',
      name: 'Google Gemini',
      apiKeyLabel: 'Google Gemini API Key',
      serverEnvVar: 'GEMINI_API_KEY',
      supportsAudioProcessing: true,
      requiresApiKeyForModels: true,
      configured: true,
      defaultModel: 'gemini-flash-latest',
    },
  ],
}

const modelsResponse = {
  provider: 'gemini',
  configuredByServer: true,
  defaultModel: 'gemini-flash-latest',
  models: [
    {
      id: 'gemini-flash-latest',
      name: 'Gemini Flash Latest',
      provider: 'gemini',
      recommended: true,
    },
  ],
}

describe('Home page studio shell', () => {
  beforeEach(() => {
    sessionStorage.clear()
    localStorage.clear()
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => providersResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => modelsResponse,
      }))
  })

  it('shows active provider, model and key source in the studio header', async () => {
    render(<Home />)

    await waitFor(() => {
      expect(screen.getByText(/Google Gemini/i)).toBeInTheDocument()
      expect(screen.getByText(/Gemini Flash Latest/i)).toBeInTheDocument()
      expect(screen.getByText(/variável do servidor/i)).toBeInTheDocument()
    })

    expect(screen.getByText('Studio de gravação mockado')).toBeInTheDocument()
  })

  it('opens the AI configuration panel with explicit key source controls', async () => {
    render(<Home />)

    await userEvent.click(await screen.findByRole('button', { name: /configurações/i }))

    expect(screen.getByText('Configurar IA')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /servidor/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /minha chave/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /listar modelos ativos/i })).toBeInTheDocument()
  })
})
```

- [x] **Step 5: Run RED suite**

Run:

```bash
npm run test
```

Expected: tests fail because the studio UI contracts are not implemented yet. The failure must be about missing labels/roles/text, not setup errors.

---

## Task 3: GREEN AudioLevelMeter

**Files:**
- Modify: `src/components/AudioLevelMeter.tsx`

- [x] **Step 1: Implement accessible studio meter**

Replace meter internals with 24 stable bars, `role="meter"`, `aria-valuenow`, `data-state`, fixed dimensions and no layout-shifting animation.

- [x] **Step 2: Run focused test**

Run:

```bash
npm run test -- src/components/AudioLevelMeter.test.tsx
```

Expected: AudioLevelMeter test passes.

---

## Task 4: GREEN AdvancedAudioRecorder

**Files:**
- Modify: `src/components/AdvancedAudioRecorder.tsx`

- [x] **Step 1: Redesign idle and recording states**

Implement the studio console with:

- title `Studio de gravação`;
- prominent timer;
- status label;
- primary start/test controls;
- pause/continue/stop controls during recording;
- secondary upload zone with text `Upload secundário`;
- existing file input and upload behavior.

- [x] **Step 2: Run focused test**

Run:

```bash
npm run test -- src/components/AdvancedAudioRecorder.test.tsx
```

Expected: AdvancedAudioRecorder tests pass.

---

## Task 5: GREEN MeetingsList

**Files:**
- Modify: `src/components/MeetingsList.tsx`

- [x] **Step 1: Redesign empty and populated history**

Implement:

- empty title `Nenhuma reunião no console`;
- populated title `Console de reuniões`;
- metric text `${count} sessão` or `${count} sessões`;
- dense list rows;
- expansion still shows key points and actions.

- [x] **Step 2: Run focused test**

Run:

```bash
npm run test -- src/components/MeetingsList.test.tsx
```

Expected: MeetingsList tests pass.

---

## Task 6: GREEN Page Shell And Config

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/globals.css`

- [x] **Step 1: Redesign app shell**

Implement studio background, compact header, active provider/model/source status, tabs and settings screen using existing state and handlers.

- [x] **Step 2: Run focused test**

Run:

```bash
npm run test -- src/app/page.test.tsx
```

Expected: page shell tests pass.

---

## Task 7: GREEN Audio Setup Modal

**Files:**
- Create: `src/components/AudioSetupModal.test.tsx`
- Modify: `src/components/AudioSetupModal.tsx`

- [x] **Step 1: Add modal failing test**

Create `src/components/AudioSetupModal.test.tsx` with assertions for the new title `Guia de captura`, macOS/Windows tabs, routing instructions, privacy notice and close action.

- [x] **Step 2: Redesign modal**

Implement a dark, dense, studio-style modal that preserves all external links and tab behavior.

- [x] **Step 3: Run focused test**

Run:

```bash
npm run test -- src/components/AudioSetupModal.test.tsx
```

Expected: AudioSetupModal tests pass.

---

## Task 8: Full Regression And Browser Verification

**Files:**
- No required file changes unless validation exposes issues.

- [x] **Step 1: Run full automated regression**

Run:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Expected: all pass.

- [x] **Step 2: Validate API model listing still works**

Run:

```bash
curl -s -X POST http://localhost:3000/api/models \
  -H 'Content-Type: application/json' \
  -d '{"provider":"gemini"}'
```

Expected: response includes `models` and `gemini-flash-latest`.

- [x] **Step 3: Browser verification**

Open `http://localhost:3000` and verify:

- header shows provider, model and key source;
- recorder appears as studio console;
- settings panel opens and shows key source controls;
- history tab renders without overlap;
- no visible text overflow on desktop.

---

## Self-Review

- Spec coverage: all spec sections map to Tasks 1-7.
- Placeholder scan: no TBD/TODO placeholders are present.
- Type consistency: tests use current exported components and existing storage/hook names.
- Scope: no provider/API behavior changes are planned.
