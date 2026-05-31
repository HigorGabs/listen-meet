'use client'

import { Button } from '@/components/ui/button'
import { MaterialIcon } from '@/components/ui/material-icon'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { getMessages, SUPPORTED_LOCALES, type Locale } from '@/lib/i18n'
import { STUDIO_THEMES, type StudioThemeId } from '@/lib/studio-theme'

interface StudioCommandRailProps {
  activeTab: string
  apiKeySourceLabel: string
  isConfigured: boolean
  locale: Locale
  modelName: string
  modelsCount: number
  onLocaleChange: (locale: Locale) => void
  onOpenSettings: () => void
  onThemeChange: (theme: StudioThemeId) => void
  onTabChange: (tab: 'record' | 'history') => void
  providerName: string
  theme: StudioThemeId
}

export function StudioCommandRail({
  activeTab,
  apiKeySourceLabel,
  isConfigured,
  locale,
  modelName,
  modelsCount,
  onLocaleChange,
  onOpenSettings,
  onThemeChange,
  onTabChange,
  providerName,
  theme,
}: StudioCommandRailProps) {
  const t = getMessages(locale)
  const navItems = [
    { id: 'record' as const, label: t.nav.record, icon: 'radio_button_checked' },
    { id: 'history' as const, label: t.nav.history, icon: 'schedule' },
  ]
  const routeStatus = isConfigured ? t.aiRoute.connected : t.aiRoute.pending
  const routeDetailsLabel = [
    providerName,
    modelName || t.common.pending,
    apiKeySourceLabel,
    t.aiRoute.modelCount(modelsCount),
  ].join(' · ')

  return (
    <header className="sticky top-0 z-40 border-b border-[color:var(--studio-border)] bg-[var(--studio-bg)] text-[var(--studio-text)] backdrop-blur-xl">
      <div className="mx-auto flex min-h-20 max-w-7xl flex-col gap-4 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[color:var(--studio-primary-border)] bg-[var(--studio-primary-soft)] text-[var(--studio-primary)]">
            <MaterialIcon name="mic" className="text-base" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold leading-tight text-[var(--studio-text)]">Listen Meet</h1>
            <p className="text-[10px] uppercase tracking-[0.24em] text-[var(--studio-primary)]">{t.brand.subtitle}</p>
          </div>
        </div>

        <nav className="grid min-w-0 gap-1 rounded-lg border border-[color:var(--studio-border)] bg-[var(--studio-panel-strong)] p-1 sm:grid-cols-2 lg:w-[440px]">
          {navItems.map((item) => {
            const isActive = activeTab === item.id

            return (
              <Button
                key={item.id}
                type="button"
                variant="ghost"
                aria-current={isActive ? 'page' : undefined}
                onClick={() => onTabChange(item.id)}
                className={cn(
                  'h-9 justify-center gap-2 rounded-md text-[var(--studio-muted)] hover:bg-[var(--studio-panel)] hover:text-[var(--studio-text)]',
                  isActive && 'bg-[var(--studio-panel)] text-[var(--studio-text)] shadow-[inset_0_0_0_1px_var(--studio-primary-border)]'
                )}
              >
                <MaterialIcon name={item.icon} className="text-base" />
                {item.label}
              </Button>
            )
          })}
        </nav>

        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
          <section
            aria-label={`${t.aiRoute.title}: ${routeStatus}. ${routeDetailsLabel}`}
            className={cn(
              'flex h-10 w-full shrink-0 items-center justify-center rounded-lg border px-3 sm:w-40',
              isConfigured
                ? 'border-[color:var(--studio-primary-border)] bg-[var(--studio-primary-soft)]'
                : 'border-amber-200/25 bg-amber-300/10'
            )}
          >
            {isConfigured ? (
              <MaterialIcon name="check_circle" className="text-base text-[var(--studio-primary)]" filled />
            ) : (
              <MaterialIcon name="tune" className="text-base text-amber-200" />
            )}
            <span className="ml-2 text-sm font-semibold text-[var(--studio-text)]">{routeStatus}</span>
          </section>

          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="h-10 w-full gap-2 rounded-lg border-[color:var(--studio-border)] bg-[var(--studio-panel)] text-[var(--studio-text)] hover:bg-[var(--studio-panel-strong)] hover:text-[var(--studio-text)] sm:w-40"
              >
                <MaterialIcon name="settings" className="text-base" />
                {t.common.settings}
                <MaterialIcon name="expand_more" className="text-sm text-[var(--studio-subtle)]" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-64 border-[color:var(--studio-border)] bg-[var(--studio-card)] p-2 text-[var(--studio-text)] shadow-2xl shadow-black/25"
            >
              <div className="grid gap-4 p-2">
                <section className="grid gap-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--studio-muted)]">
                    {t.theme.label}
                  </p>
                  <div
                    role="group"
                    aria-label={t.theme.label}
                    className="grid grid-cols-2 gap-1 rounded-lg border border-[color:var(--studio-border)] bg-[var(--studio-panel-strong)] p-1"
                  >
                    {STUDIO_THEMES.map((item) => {
                      const isActive = theme === item.id
                      const icon = item.id === 'dark' ? 'dark_mode' : 'light_mode'

                      return (
                        <DropdownMenuItem
                          key={item.id}
                          aria-current={isActive ? 'true' : undefined}
                          onSelect={(event) => {
                            event.preventDefault()
                            onThemeChange(item.id)
                          }}
                          className={cn(
                            'h-10 cursor-pointer justify-center gap-2 rounded-md border px-2 text-sm font-medium transition-colors',
                            isActive
                              ? 'border-[color:var(--studio-primary-border)] bg-[var(--studio-primary-soft)] text-[var(--studio-text)] shadow-[inset_0_0_0_1px_var(--studio-primary-border)]'
                            : 'border-transparent text-[var(--studio-muted)] hover:bg-[var(--studio-panel)] hover:text-[var(--studio-text)]'
                          )}
                        >
                          <MaterialIcon name={icon} className={cn('text-base', isActive && 'text-[var(--studio-primary)]')} />
                          <span>{t.theme[item.id]}</span>
                        </DropdownMenuItem>
                      )
                    })}
                  </div>
                </section>

                <section className="grid gap-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--studio-muted)]">
                    {t.locale.label}
                  </p>
                  <div
                    role="group"
                    aria-label={t.locale.label}
                    className="grid grid-cols-2 gap-1 rounded-lg border border-[color:var(--studio-border)] bg-[var(--studio-panel-strong)] p-1"
                  >
                    {SUPPORTED_LOCALES.map((item) => {
                      const isActive = locale === item.id
                      const localeCode = item.id === 'pt-BR' ? 'BR' : 'EN'

                      return (
                        <DropdownMenuItem
                          key={item.id}
                          aria-current={isActive ? 'true' : undefined}
                          onSelect={(event) => {
                            event.preventDefault()
                            onLocaleChange(item.id)
                          }}
                          title={item.label}
                          className={cn(
                            'h-10 cursor-pointer justify-center gap-2 rounded-md border px-2 text-sm font-semibold tracking-[0.08em] transition-colors',
                            isActive
                              ? 'border-[color:var(--studio-secondary-border)] bg-[var(--studio-secondary-soft)] text-[var(--studio-text)] shadow-[inset_0_0_0_1px_var(--studio-secondary-border)]'
                            : 'border-transparent text-[var(--studio-muted)] hover:bg-[var(--studio-panel)] hover:text-[var(--studio-text)]'
                          )}
                        >
                          <span>{localeCode}</span>
                        </DropdownMenuItem>
                      )
                    })}
                  </div>
                </section>
              </div>
              <DropdownMenuSeparator className="bg-[var(--studio-border)]" />
              <DropdownMenuItem
                onSelect={onOpenSettings}
                className="cursor-pointer gap-2 rounded-md px-2 py-2 text-sm text-[var(--studio-text)] focus:bg-[var(--studio-panel-strong)] focus:text-[var(--studio-text)]"
              >
                <MaterialIcon name="key" className="text-base text-[var(--studio-secondary)]" />
                API
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
