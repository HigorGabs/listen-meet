import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AudioLevelMeter } from './AudioLevelMeter'

describe('AudioLevelMeter', () => {
  it('renders a stable studio meter with accessible level semantics', () => {
    render(<AudioLevelMeter level={48.6} isActive />)

    const meter = screen.getByRole('meter', { name: /nível de áudio/i })
    expect(meter).toHaveAttribute('aria-valuenow', '49')
    expect(meter).toHaveAttribute('data-state', 'active')
    expect(screen.getByText('Espectro de captação')).toBeInTheDocument()
    expect(screen.getAllByTestId('audio-spectrum-bar')).toHaveLength(40)
    expect(screen.getByTestId('audio-presence-rail')).toBeInTheDocument()
    expect(screen.getByText('49%')).toBeInTheDocument()
  })
})
