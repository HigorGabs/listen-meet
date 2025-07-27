'use client'

import { cn } from '@/lib/utils'

interface AudioLevelMeterProps {
  level: number
  isActive: boolean
  className?: string
}

export function AudioLevelMeter({ level, isActive, className }: AudioLevelMeterProps) {
  const bars = Array.from({ length: 15 }, (_, i) => {
    const barThreshold = (i + 1) * (100 / 15) // Each bar represents ~6.67% of the level
    const isBarActive = level >= barThreshold
    
    // Color based on level with smooth gradient
    let barColor = 'bg-gradient-to-t from-green-400 to-green-500'
    if (barThreshold > 50) {
      barColor = 'bg-gradient-to-t from-yellow-400 to-yellow-500'
    }
    if (barThreshold > 80) {
      barColor = 'bg-gradient-to-t from-red-400 to-red-500'
    }
    
    // Height variation for visual appeal
    const baseHeight = 16
    const heightVariation = Math.floor(i / 3) * 2
    const barHeight = baseHeight + heightVariation
    
    return (
      <div
        key={i}
        className={cn(
          'w-2 rounded-full transition-all duration-150 ease-out',
          isBarActive && isActive 
            ? `${barColor} shadow-sm` 
            : 'bg-gray-200 dark:bg-gray-700',
          // Add glow effect for active bars
          isBarActive && isActive && 'shadow-lg'
        )}
        style={{ 
          height: `${barHeight}px`,
          transform: isBarActive && isActive ? 'scaleY(1.05)' : 'scaleY(1)'
        }}
      />
    )
  })

  return (
    <div className={cn('flex items-end justify-center gap-1 p-3 bg-gradient-to-r from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 rounded-xl border', className)}>
      <div className="flex items-end gap-1">
        {bars}
      </div>
      <div className="ml-3 flex flex-col items-center">
        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {Math.round(level)}%
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {isActive ? 'Ativo' : 'Inativo'}
        </div>
      </div>
    </div>
  )
}