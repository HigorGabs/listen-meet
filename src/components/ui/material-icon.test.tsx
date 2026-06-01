import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MaterialIcon } from './material-icon'

describe('MaterialIcon', () => {
  it('renders a Google Material Symbols ligature', () => {
    render(<MaterialIcon name="settings" label="Settings" className="text-current" />)

    const icon = screen.getByRole('img', { name: 'Settings' })
    expect(icon).toHaveClass('material-symbols-rounded')
    expect(icon).toHaveClass('text-current')
    expect(icon).toHaveTextContent('settings')
  })

  it('is hidden from assistive tech by default when decorative', () => {
    const { container } = render(<MaterialIcon name="mic" />)

    const icon = container.querySelector('.material-symbols-rounded')
    expect(icon).toHaveAttribute('aria-hidden', 'true')
  })
})
