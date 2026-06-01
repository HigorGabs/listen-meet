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
  onOpenProfile: () => void
  onThemeChange: (theme: StudioThemeId) => void
  onTabChange: (tab: 'record' | 'history') => void
  providerName: string
  theme: StudioThemeId
  userProfile?: { name: string; avatar?: string; avatarColor?: string }
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
  onOpenProfile,
  onThemeChange,
  onTabChange,
  providerName,
  theme,
  userProfile,
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

          {/* Profile button */}
          <Button
            type="button"
            variant="outline"
            onClick={onOpenProfile}
            className="h-10 w-full flex items-center justify-center gap-2 rounded-lg border-[color:var(--studio-border)] bg-[var(--studio-panel)] text-[var(--studio-text)] hover:bg-[var(--studio-panel-strong)] sm:w-auto px-3.5 cursor-pointer shadow-sm hover:border-[var(--studio-primary-border)]/50 transition-colors"
          >
            {userProfile?.avatar ? (
              <img
                src={userProfile.avatar}
                alt="Profile"
                className="w-5.5 h-5.5 rounded-full object-cover border border-[var(--studio-primary-border)]"
              />
            ) : (
              <div
                className={cn(
                  "w-5.5 h-5.5 rounded-full bg-gradient-to-tr flex items-center justify-center text-[9px] font-bold text-white shadow-inner shrink-0",
                  userProfile?.avatarColor || "from-violet-600 to-indigo-600 shadow-indigo-500/30"
                )}
              >
                {(() => {
                  if (!userProfile?.name) return 'EU'
                  const parts = userProfile.name.trim().split(/\s+/)
                  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
                  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
                })()}
              </div>
            )}
            <span className="text-xs font-semibold max-w-[100px] truncate leading-none">
              {userProfile?.name || (locale === 'pt-BR' ? 'Meu Perfil' : 'Profile')}
            </span>
          </Button>

          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="h-10 w-full flex items-center justify-center gap-2 rounded-lg border-[color:var(--studio-border)] bg-[var(--studio-panel)] text-[var(--studio-text)] hover:bg-[var(--studio-panel-strong)] hover:text-[var(--studio-text)] sm:w-auto sm:min-w-40 px-4"
              >
                <MaterialIcon name="settings" className="text-base animate-hover-spin" />
                {t.common.settings}
                <MaterialIcon name="expand_more" className="text-sm text-[var(--studio-subtle)]" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-72 border-[color:var(--studio-border)] bg-[var(--studio-card)]/95 p-3 text-[var(--studio-text)] shadow-2xl shadow-black/35 backdrop-blur-xl"
            >
              <div className="space-y-4">
                <div className="border-b border-[color:var(--studio-border)]/40 pb-2">
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--studio-primary)]">
                    {locale === 'pt-BR' ? 'Ajustes Rápidos' : 'Quick Preferences'}
                  </h3>
                </div>

                {/* Theme Selector */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--studio-muted)]">
                    {t.theme.label}
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
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
                            "flex items-center justify-center gap-2 rounded-lg border py-2 px-3 text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer w-full focus:outline-hidden",
                            isActive
                              ? "border-[color:var(--studio-primary-border)] bg-[var(--studio-primary-soft)] text-[var(--studio-text)] shadow-[0_0_8px_rgba(var(--studio-primary-rgb),0.15)] focus:bg-[var(--studio-primary-soft)] focus:text-[var(--studio-text)]"
                              : "border-transparent bg-[var(--studio-panel-strong)] text-[var(--studio-muted)] hover:bg-[var(--studio-panel)] hover:text-[var(--studio-text)] focus:bg-[var(--studio-panel)] focus:text-[var(--studio-text)]"
                          )}
                        >
                          <MaterialIcon name={icon} className={cn('text-sm', isActive && 'text-[var(--studio-primary)]')} />
                          <span>{t.theme[item.id]}</span>
                        </DropdownMenuItem>
                      )
                    })}
                  </div>
                </div>

                {/* Locale Selector */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--studio-muted)]">
                    {t.locale.label}
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {SUPPORTED_LOCALES.map((item) => {
                      const isActive = locale === item.id
                      const flag = item.id === 'pt-BR' ? '🇧🇷' : '🇺🇸'
                      const label = item.id === 'pt-BR' ? 'BR' : 'EN'

                      return (
                        <DropdownMenuItem
                          key={item.id}
                          aria-label={label}
                          aria-current={isActive ? 'true' : undefined}
                          onSelect={(event) => {
                            event.preventDefault()
                            onLocaleChange(item.id)
                          }}
                          className={cn(
                            "flex items-center justify-center gap-2 rounded-lg border py-2 px-3 text-xs font-bold transition-all duration-200 cursor-pointer w-full focus:outline-hidden",
                            isActive
                              ? "border-[color:var(--studio-secondary-border)] bg-[var(--studio-secondary-soft)] text-[var(--studio-text)] shadow-[0_0_8px_rgba(var(--studio-secondary-rgb),0.15)] focus:bg-[var(--studio-secondary-soft)] focus:text-[var(--studio-text)]"
                              : "border-transparent bg-[var(--studio-panel-strong)] text-[var(--studio-muted)] hover:bg-[var(--studio-panel)] hover:text-[var(--studio-text)] focus:bg-[var(--studio-panel)] focus:text-[var(--studio-text)]"
                          )}
                        >
                          <span className="text-sm leading-none">{flag}</span>
                          <span>{label}</span>
                        </DropdownMenuItem>
                      )
                    })}
                  </div>
                </div>

                {/* Profile Modal Trigger inside settings dropdown */}
                <div className="border-t border-[color:var(--studio-border)]/40 pt-3">
                  <DropdownMenuItem
                    aria-label="Profile"
                    onSelect={() => {
                      onOpenProfile()
                    }}
                    className="flex w-full items-center justify-between rounded-lg border border-[color:var(--studio-border)] bg-[var(--studio-panel-strong)] p-2.5 text-left transition-all duration-300 hover:bg-[var(--studio-panel)] hover:border-[color:var(--studio-primary-border)] focus:bg-[var(--studio-panel)] focus:border-[color:var(--studio-primary-border)] focus:outline-hidden group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--studio-primary-soft)] text-[var(--studio-primary)] shadow-inner">
                        <MaterialIcon name="person" className="text-sm" />
                      </div>
                      <div className="min-w-0">
                        <span className="block text-xs font-semibold text-[var(--studio-text)]">
                          {locale === 'pt-BR' ? 'Meu Perfil' : 'My Profile'}
                        </span>
                        <span className="block text-[10px] text-[var(--studio-muted)] truncate max-w-[140px]">
                          {locale === 'pt-BR' ? 'Empresas & Times' : 'Companies & Teams'}
                        </span>
                      </div>
                    </div>
                    <MaterialIcon name="chevron_right" className="text-sm text-[var(--studio-subtle)] transition-transform duration-300 group-hover:translate-x-0.5 group-focus:translate-x-0.5" />
                  </DropdownMenuItem>
                </div>

                {/* API Key configuration block */}
                <div className="border-t border-[color:var(--studio-border)]/40 pt-3">
                  <DropdownMenuItem
                    aria-label="API"
                    onSelect={() => {
                      onOpenSettings()
                    }}
                    className="flex w-full items-center justify-between rounded-lg border border-[color:var(--studio-border)] bg-[var(--studio-panel-strong)] p-2.5 text-left transition-all duration-300 hover:bg-[var(--studio-panel)] hover:border-[color:var(--studio-primary-border)] focus:bg-[var(--studio-panel)] focus:border-[color:var(--studio-primary-border)] focus:outline-hidden group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--studio-secondary-soft)] text-[var(--studio-secondary)] shadow-inner">
                        <MaterialIcon name="key" className="text-sm" />
                      </div>
                      <div className="min-w-0">
                        <span className="block text-xs font-semibold text-[var(--studio-text)]">
                          API
                        </span>
                        <span className="block text-[10px] text-[var(--studio-muted)] truncate max-w-[140px]">
                          {apiKeySourceLabel}
                        </span>
                      </div>
                    </div>
                    <MaterialIcon name="chevron_right" className="text-sm text-[var(--studio-subtle)] transition-transform duration-300 group-hover:translate-x-0.5 group-focus:translate-x-0.5" />
                  </DropdownMenuItem>
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
