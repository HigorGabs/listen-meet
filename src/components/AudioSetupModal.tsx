'use client'

import { useState, type ReactNode } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { MaterialIcon } from '@/components/ui/material-icon'
import { getMessages, type Locale } from '@/lib/i18n'

interface AudioSetupModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  locale?: Locale
}

interface StepBlockProps {
  step: string
  title: string
  children: ReactNode
}

function StepBlock({ step, title, children }: StepBlockProps) {
  return (
    <section className="rounded-lg border border-[color:var(--studio-border)] bg-[var(--studio-panel)] p-4">
      <div className="mb-3 flex items-center gap-3">
        <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md border border-[color:var(--studio-secondary-border)] bg-[var(--studio-secondary-soft)] font-mono text-xs font-semibold text-[var(--studio-secondary)]">
          {step}
        </span>
        <h3 className="text-sm font-semibold text-[var(--studio-text)]">{title}</h3>
      </div>
      <div className="space-y-3 text-sm leading-6 text-[var(--studio-muted)]">
        {children}
      </div>
    </section>
  )
}

function ExternalButton({ url, children }: { url: string; children: ReactNode }) {
  const openExternalLink = () => {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={openExternalLink}
      className="gap-2 border-[color:var(--studio-border)] bg-[var(--studio-panel-strong)] text-[var(--studio-text)] hover:bg-[var(--studio-card-alt)] hover:text-[var(--studio-text)]"
    >
      {children}
      <MaterialIcon name="open_in_new" className="text-sm" />
    </Button>
  )
}

export function AudioSetupModal({ open, onOpenChange, locale = 'pt-BR' }: AudioSetupModalProps) {
  const [activeTab, setActiveTab] = useState('mac')
  const t = getMessages(locale)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto border-[color:var(--studio-border)] bg-[var(--studio-card)] p-0 text-[var(--studio-text)] shadow-2xl shadow-black/30 sm:max-w-4xl">
        <DialogHeader className="border-b border-[color:var(--studio-border)] bg-[var(--studio-panel)] px-6 py-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[color:var(--studio-secondary-border)] bg-[var(--studio-secondary-soft)]">
              <MaterialIcon name="mic" className="text-xl text-[var(--studio-secondary)]" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold text-[var(--studio-text)]">
                {t.setup.title}
              </DialogTitle>
              <DialogDescription className="mt-2 max-w-2xl text-sm text-[var(--studio-muted)]">
                {t.setup.description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 p-6">
          <div className="rounded-lg border border-[color:var(--studio-secondary-border)] bg-[var(--studio-secondary-soft)] p-4">
            <div className="flex items-start gap-3">
              <MaterialIcon name="info" className="mt-0.5 text-base text-[var(--studio-secondary)]" />
              <div>
                <h2 className="text-sm font-semibold text-[var(--studio-text)]">{t.setup.routingTitle}</h2>
                <p className="mt-1 text-sm leading-6 text-[var(--studio-muted)]">
                  {t.setup.routingDescription}
                </p>
              </div>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
            <TabsList className="grid w-full grid-cols-2 border border-[color:var(--studio-border)] bg-[var(--studio-panel)] p-1">
              <TabsTrigger value="mac" className="gap-2">
                <MaterialIcon name="monitor" className="text-base" />
                {t.setup.mac}
              </TabsTrigger>
              <TabsTrigger value="windows" className="gap-2">
                <MaterialIcon name="monitor" className="text-base" />
                {t.setup.windows}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="mac" className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <StepBlock step="01" title={t.setup.blackholeTitle}>
                  <p>
                    {t.setup.blackholeCopy}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <ExternalButton url="https://existential.audio/blackhole/">
                      <MaterialIcon name="download" className="text-base" />
                      {t.setup.downloadBlackhole}
                    </ExternalButton>
                    <ExternalButton url="https://github.com/ExistentialAudio/BlackHole">
                      GitHub
                    </ExternalButton>
                  </div>
                </StepBlock>

                <StepBlock step="02" title={t.setup.aggregateTitle}>
                  <ol className="space-y-1">
                    {t.setup.aggregateSteps.map((step) => <li key={step}>{step}</li>)}
                  </ol>
                </StepBlock>

                <StepBlock step="03" title={t.setup.multiOutputTitle}>
                  <ol className="space-y-1">
                    {t.setup.multiOutputSteps.map((step) => <li key={step}>{step}</li>)}
                  </ol>
                </StepBlock>

                <StepBlock step="04" title={t.setup.selectInAppTitle}>
                  <ol className="space-y-1">
                    {t.setup.selectInAppSteps.map((step) => <li key={step}>{step}</li>)}
                  </ol>
                </StepBlock>
              </div>
            </TabsContent>

            <TabsContent value="windows" className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <StepBlock step="01" title={t.setup.vbTitle}>
                  <p>
                    {t.setup.vbCopy}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <ExternalButton url="https://vb-audio.com/Cable/">
                      <MaterialIcon name="download" className="text-base" />
                      {t.setup.downloadVbCable}
                    </ExternalButton>
                  </div>
                </StepBlock>

                <StepBlock step="02" title={t.setup.windowsOutputTitle}>
                  <ol className="space-y-1">
                    {t.setup.windowsOutputSteps.map((step) => <li key={step}>{step}</li>)}
                  </ol>
                </StepBlock>

                <StepBlock step="03" title={t.setup.windowsInputTitle}>
                  <ol className="space-y-1">
                    {t.setup.windowsInputSteps.map((step) => <li key={step}>{step}</li>)}
                  </ol>
                </StepBlock>

                <StepBlock step="04" title={t.setup.obsTitle}>
                  <p>
                    {t.setup.obsCopy}
                  </p>
                  <ExternalButton url="https://obsproject.com/">
                    <MaterialIcon name="download" className="text-base" />
                    {t.setup.downloadObs}
                  </ExternalButton>
                </StepBlock>
              </div>
            </TabsContent>
          </Tabs>

          <div className="rounded-lg border border-[color:var(--studio-warning-border)] bg-[var(--studio-warning-bg)] p-4 text-[var(--studio-warning-text)]">
            <div className="flex items-start gap-3">
              <MaterialIcon name="verified_user" className="mt-0.5 text-base" />
              <div>
                <h3 className="text-sm font-semibold">{t.setup.privacyTitle}</h3>
                <ul className="mt-2 space-y-1 text-sm leading-6 opacity-80">
                  {t.setup.privacyItems.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-[color:var(--studio-border)] bg-[var(--studio-panel)] p-4">
            <div className="flex items-start gap-3">
              <MaterialIcon name="error" className="mt-0.5 text-base text-[var(--studio-muted)]" />
              <p className="text-sm leading-6 text-[var(--studio-muted)]">
                {t.setup.finalNote}
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-[color:var(--studio-border)] bg-[var(--studio-panel)] px-6 py-4">
          <Button
            type="button"
            onClick={() => onOpenChange(false)}
            className="bg-[var(--studio-secondary)] text-zinc-950 hover:opacity-90"
          >
            {t.setup.understood}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
