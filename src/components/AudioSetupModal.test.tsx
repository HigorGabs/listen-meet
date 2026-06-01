import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AudioSetupModal } from './AudioSetupModal'

describe('AudioSetupModal', () => {
  it('renders the studio audio routing guide with macOS instructions', () => {
    render(<AudioSetupModal open onOpenChange={vi.fn()} />)

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Guia de captura')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /macos/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /windows/i })).toBeInTheDocument()
    expect(screen.getByText(/roteamento de áudio/i)).toBeInTheDocument()
    expect(screen.getAllByText(/BlackHole/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/consentimento/i)).toBeInTheDocument()
  })

  it('switches to Windows routing instructions and keeps the close action available', async () => {
    const onOpenChange = vi.fn()
    render(<AudioSetupModal open onOpenChange={onOpenChange} />)

    await userEvent.click(screen.getByRole('tab', { name: /windows/i }))

    expect(screen.getAllByText(/VB-Audio Virtual Cable/i).length).toBeGreaterThan(0)
    await userEvent.click(screen.getByRole('button', { name: /entendi/i }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
