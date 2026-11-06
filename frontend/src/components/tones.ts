export type Tone = 'primary' | 'danger' | 'success' | 'accent' | 'info' | 'infoLight' | 'plum' | 'quiet'

interface ToneClasses {
  /** Soft background with matching foreground, for badges and icon circles. */
  soft: string
  /** Solid fill for dots, bars and legend markers. */
  solid: string
  /** Foreground text colour. */
  text: string
  /** SVG stroke colour. */
  stroke: string
  /** Top border for stat cards. */
  border: string
}

export const toneClasses: Record<Tone, ToneClasses> = {
  primary: { soft: 'bg-info-soft text-primary', solid: 'bg-primary', text: 'text-primary', stroke: 'stroke-primary', border: 'border-t-primary' },
  danger: { soft: 'bg-danger-soft text-danger', solid: 'bg-danger', text: 'text-danger', stroke: 'stroke-danger', border: 'border-t-danger' },
  success: { soft: 'bg-success-soft text-success', solid: 'bg-success', text: 'text-success', stroke: 'stroke-success', border: 'border-t-success' },
  accent: { soft: 'bg-accent-soft text-accent-ink', solid: 'bg-accent', text: 'text-accent-ink', stroke: 'stroke-accent', border: 'border-t-accent' },
  info: { soft: 'bg-info-soft text-info', solid: 'bg-info', text: 'text-info', stroke: 'stroke-info', border: 'border-t-info' },
  infoLight: { soft: 'bg-info-soft text-info', solid: 'bg-info-light', text: 'text-info', stroke: 'stroke-info-light', border: 'border-t-info-light' },
  plum: { soft: 'bg-plum-soft text-plum', solid: 'bg-plum', text: 'text-plum', stroke: 'stroke-plum', border: 'border-t-plum' },
  quiet: { soft: 'bg-quiet-soft text-muted', solid: 'bg-quiet', text: 'text-muted', stroke: 'stroke-quiet', border: 'border-t-quiet' },
}
