import type { LucideIcon } from 'lucide-react'
import { toneClasses, type Tone } from './tones'

interface IconCircleProps {
  icon: LucideIcon
  tone: Tone
  size?: 'sm' | 'md' | 'lg'
}

const sizes = {
  sm: { box: 'size-9', icon: 'size-4' },
  md: { box: 'size-11', icon: 'size-5' },
  lg: { box: 'size-14', icon: 'size-6' },
}

export function IconCircle({ icon: Icon, tone, size = 'md' }: IconCircleProps) {
  return (
    <span className={`grid shrink-0 place-items-center rounded-full ${sizes[size].box} ${toneClasses[tone].soft}`}>
      <Icon className={sizes[size].icon} strokeWidth={2} />
    </span>
  )
}
