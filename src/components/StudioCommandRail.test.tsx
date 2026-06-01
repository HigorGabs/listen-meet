import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { StudioCommandRail } from './StudioCommandRail'

describe('StudioCommandRail', () => {
  it('renders studio navigation and user profile dropdown', async () => {
    const onTabChange = vi.fn()
    const onOpenSettings = vi.fn()
    const onThemeChange = vi.fn()
    const onLocaleChange = vi.fn()
    const onOpenProfile = vi.fn()

    render(
      <StudioCommandRail
        activeTab="record"
        apiKeySourceLabel="variável do servidor"
        locale="pt-BR"
        onLocaleChange={onLocaleChange}
        onOpenSettings={onOpenSettings}
        onOpenProfile={onOpenProfile}
        onThemeChange={onThemeChange}
        onTabChange={onTabChange}
        theme="dark"
      />
    )

    expect(screen.getByText('Estúdio de Gravação')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /gravar reunião/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /histórico/i })).toBeInTheDocument()
    const profileButton = screen.getByRole('button', { name: /meu perfil/i })
    expect(profileButton).toHaveClass('h-10', 'w-10', 'rounded-full')
    expect(screen.queryByText('Rota de IA')).not.toBeInTheDocument()
    expect(screen.queryByText('variável do servidor')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Tema')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Idioma')).not.toBeInTheDocument()
    expect(screen.queryByText('Padrão')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Cor principal')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Cor secundária')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /histórico/i }))
    await userEvent.click(profileButton)

    const menu = screen.getByRole('menu')
    expect(menu).toBeInTheDocument()
    expect(within(menu).queryByRole('combobox')).not.toBeInTheDocument()
    expect(within(menu).queryByRole('menuitemradio')).not.toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /dark/i })).toHaveAttribute('aria-current', 'true')
    expect(screen.getByRole('menuitem', { name: /white/i })).not.toHaveAttribute('aria-current')
    expect(screen.getByRole('menuitem', { name: /^BR$/ })).toHaveAttribute('aria-current', 'true')
    expect(screen.getByRole('menuitem', { name: /^EN$/ })).not.toHaveAttribute('aria-current')
    expect(within(menu).queryByText('Português')).not.toBeInTheDocument()
    expect(within(menu).queryByText('English')).not.toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /^API$/i })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('menuitem', { name: /white/i }))
    await userEvent.click(screen.getByRole('menuitem', { name: /^EN$/ }))
    await userEvent.click(screen.getByRole('menuitem', { name: /^API$/i }))

    expect(onTabChange).toHaveBeenCalledWith('history')
    expect(onThemeChange).toHaveBeenCalledWith('white')
    expect(onLocaleChange).toHaveBeenCalledWith('en')
    expect(onOpenSettings).toHaveBeenCalled()
  })

  it('renders English topbar copy', () => {
    render(
      <StudioCommandRail
        activeTab="record"
        apiKeySourceLabel="server variable"
        locale="en"
        onLocaleChange={vi.fn()}
        onOpenSettings={vi.fn()}
        onOpenProfile={vi.fn()}
        onThemeChange={vi.fn()}
        onTabChange={vi.fn()}
        theme="dark"
      />
    )

    expect(screen.getByText('Recording Studio')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /record meeting/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /history/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /profile/i })).toHaveClass('h-10', 'w-10', 'rounded-full')
    expect(screen.queryByText('AI Route')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Theme')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Language')).not.toBeInTheDocument()
  })
})
