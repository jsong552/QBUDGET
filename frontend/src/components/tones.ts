export type Tone = 'primary' | 'danger' | 'success' | 'accent' | 'info' | 'infoLight' | 'plum' | 'quiet'

interface ToneClasses {
  /** Soft background with matching foreground, for badges and icon circles. */
  soft: string
  /** Solid fill for dots, bars and legend markers. */
  solid: string
  /** Foreground text colour. */
  text: string
  /** Top border for stat cards. */
  border: string
  /** CSS colour value for SVG/chart props that take a colour rather than a class. */
  color: string
}

export const toneClasses: Record<Tone, ToneClasses> = {
  primary: { soft: 'bg-info-soft text-primary', solid: 'bg-primary', text: 'text-primary', border: 'border-t-primary', color: 'var(--color-primary)' },
  danger: { soft: 'bg-danger-soft text-danger', solid: 'bg-danger', text: 'text-danger', border: 'border-t-danger', color: 'var(--color-danger)' },
  success: { soft: 'bg-success-soft text-success', solid: 'bg-success', text: 'text-success', border: 'border-t-success', color: 'var(--color-success)' },
  accent: { soft: 'bg-accent-soft text-accent-ink', solid: 'bg-accent', text: 'text-accent-ink', border: 'border-t-accent', color: 'var(--color-accent)' },
  info: { soft: 'bg-info-soft text-info', solid: 'bg-info', text: 'text-info', border: 'border-t-info', color: 'var(--color-info)' },
  infoLight: { soft: 'bg-info-soft text-info', solid: 'bg-info-light', text: 'text-info', border: 'border-t-info-light', color: 'var(--color-info-light)' },
  plum: { soft: 'bg-plum-soft text-plum', solid: 'bg-plum', text: 'text-plum', border: 'border-t-plum', color: 'var(--color-plum)' },
  quiet: { soft: 'bg-quiet-soft text-muted', solid: 'bg-quiet', text: 'text-muted', border: 'border-t-quiet', color: 'var(--color-quiet)' },
}
