# Listen Meet Audio Studio Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reestruturar o Listen Meet como um estúdio de captura e inteligência de reuniões, indo além da troca de tema.

**Architecture:** A mudança preserva hooks, APIs e storage. A UI ganha um shell compacto de estúdio, um painel de prontidão independente, o gravador vira um console central e o histórico passa para master-detail.

**Stitch Reference:** Projeto `Listen Meet Redesign` (`9382423097226611157`), baseline screen `16505439015758658904`, redesign screen `ae301fa145094f3aa23936e2baa18dba`, referência local `/tmp/listen-meet-stitch-studio.png`. Não usar referência FinOps.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS v4, shadcn/Radix primitives, lucide-react, Vitest, Testing Library.

---

## File Structure

- Create/modify `src/components/StudioCommandRail.tsx`: header compacto de estúdio, navegação, rota de IA e ações globais.
- Create/modify `src/components/SessionReadinessPanel.tsx`: configuração de IA, upload e checklist de preparação.
- Create/modify `src/components/StudioCommandRail.test.tsx`: RED/GREEN do shell de estúdio.
- Create `src/components/SessionReadinessPanel.test.tsx`: RED/GREEN dos painéis de prontidão.
- Modify `src/components/AdvancedAudioRecorder.test.tsx`: novo contrato do console de captura.
- Modify `src/components/AdvancedAudioRecorder.tsx`: reordenação visual do gravador.
- Modify `src/components/MeetingsList.test.tsx`: novo contrato de arquivo inteligente.
- Modify `src/components/MeetingsList.tsx`: master-detail do histórico.
- Modify `src/app/page.test.tsx`: nova composição da página.
- Modify `src/app/page.tsx`: shell de estúdio, workspace central e layout de captura.
- Modify `src/app/globals.css`: tokens/utility classes se necessário.

---

## Task 1: RED Studio Components

**Files:**
- Create: `src/components/StudioCommandRail.test.tsx`
- Create: `src/components/SessionReadinessPanel.test.tsx`

- [ ] **Step 1: Write failing tests for the studio shell**

Assertions:
- renders `Estúdio de Gravação`;
- renders nav buttons `Gravar Reunião` and `Histórico`;
- renders compact AI route;
- renders provider, model, source and model count;
- calls callbacks when nav/settings buttons are clicked.

- [ ] **Step 2: Write failing tests for readiness panel**

Assertions:
- renders `Configuração de IA`;
- renders `Checklist de Preparação`;
- renders `Área de Upload`;
- renders `Microfone Conectado`, `Sinal de Áudio Detectado`, `IA Pronta para Transcrição`;
- shows last processed meeting when provided.

- [ ] **Step 3: Run RED**

Run:

```bash
npm run test -- src/components/StudioCommandRail.test.tsx src/components/SessionReadinessPanel.test.tsx
```

Expected: FAIL because components do not exist yet.

---

## Task 2: GREEN Studio Components

**Files:**
- Create: `src/components/StudioCommandRail.tsx`
- Create: `src/components/SessionReadinessPanel.tsx`

- [ ] **Step 1: Implement `StudioCommandRail` as compact studio header**

Use props only. Do not read app state internally.

- [ ] **Step 2: Implement `SessionReadinessPanel`**

Use props only. Include AI config, upload and preparation checklist.

- [ ] **Step 3: Run focused tests**

Run:

```bash
npm run test -- src/components/StudioCommandRail.test.tsx src/components/SessionReadinessPanel.test.tsx
```

Expected: PASS.

---

## Task 3: RED Recorder Console

**Files:**
- Modify: `src/components/AdvancedAudioRecorder.test.tsx`

- [ ] **Step 1: Add console assertions**

Assertions:
- idle state renders `Console de captura`;
- renders `Sinal ao vivo`;
- renders `Matriz de entrada`;
- renders `Área de Upload`;
- renders status chips `Entrada`, `Limite`, `Saída`;
- recording state still exposes pause/stop controls.

- [ ] **Step 2: Run RED**

Run:

```bash
npm run test -- src/components/AdvancedAudioRecorder.test.tsx
```

Expected: FAIL because current component still uses old labels.

---

## Task 4: GREEN Recorder Console

**Files:**
- Modify: `src/components/AdvancedAudioRecorder.tsx`

- [ ] **Step 1: Rebuild recorder composition**

Change layout from generic studio card to recording console with central timer, signal area, routing matrix and upload area.

- [ ] **Step 2: Run focused test**

Run:

```bash
npm run test -- src/components/AdvancedAudioRecorder.test.tsx
```

Expected: PASS.

---

## Task 5: RED Intelligent Archive

**Files:**
- Modify: `src/components/MeetingsList.test.tsx`

- [ ] **Step 1: Add archive assertions**

Assertions:
- populated state renders `Arquivo inteligente`;
- renders `Painel de leitura`;
- renders selected meeting detail without requiring inline expansion;
- still supports opening details and seeing key points/actions.

- [ ] **Step 2: Run RED**

Run:

```bash
npm run test -- src/components/MeetingsList.test.tsx
```

Expected: FAIL because current history still uses the previous title/detail model.

---

## Task 6: GREEN Intelligent Archive

**Files:**
- Modify: `src/components/MeetingsList.tsx`

- [ ] **Step 1: Implement master-detail archive**

Render metrics, search and filter in a command header. Render meeting list and reading panel side by side on desktop.

- [ ] **Step 2: Run focused test**

Run:

```bash
npm run test -- src/components/MeetingsList.test.tsx
```

Expected: PASS.

---

## Task 7: RED Page Composition

**Files:**
- Modify: `src/app/page.test.tsx`

- [ ] **Step 1: Add page shell assertions**

Assertions:
- renders `Estúdio de Gravação`;
- renders `Configuração de IA`;
- renders `Checklist de Preparação`;
- renders `Área de Upload`;
- still renders mocked recorder/history.

- [ ] **Step 2: Run RED**

Run:

```bash
npm run test -- src/app/page.test.tsx
```

Expected: FAIL because page has not been restructured.

---

## Task 8: GREEN Page Composition

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Integrate shell components**

Replace old header/tabs-first layout with compact studio header, centered capture workspace, support panel and archive workspace.

- [ ] **Step 2: Run focused page test**

Run:

```bash
npm run test -- src/app/page.test.tsx
```

Expected: PASS.

---

## Task 9: Full Verification

**Files:**
- No file changes expected.

- [ ] **Step 1: Run regression**

Run:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

- [ ] **Step 2: Verify model API**

Run:

```bash
curl -s -X POST http://localhost:3000/api/models \
  -H 'Content-Type: application/json' \
  -d '{"provider":"gemini"}'
```

- [ ] **Step 3: Browser verification**

Open `http://localhost:3000` and verify:
- left command rail;
- Live deck;
- capture deck;
- readiness cards;
- archive master-detail;
- settings screen still usable.
