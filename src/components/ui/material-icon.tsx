import type { CSSProperties, HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface MaterialIconProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  filled?: boolean
  label?: string
  name: string
}

export function MaterialIcon({
  className,
  filled = false,
  label,
  name,
  style,
  ...props
}: MaterialIconProps) {
  const accessibilityProps = label
    ? { 'aria-label': label, role: 'img' }
    : { 'aria-hidden': true }

  return (
    <span
      className={cn('material-symbols-rounded', filled && 'material-symbols-filled', className)}
      style={style as CSSProperties}
      {...accessibilityProps}
      {...props}
    >
      {name}
    </span>
  )
}
