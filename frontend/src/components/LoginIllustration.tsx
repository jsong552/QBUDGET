import queensQ from '../assets/queens-q.png'

/** Laptop, books and plant scene from the sign-in sketch. Decorative only. */
export function LoginIllustration() {
  return (
    <svg viewBox="0 0 640 360" className="w-full" aria-hidden="true">
      {/* background hills */}
      <path d="M0 210 C 90 150, 190 150, 290 200 S 470 300, 640 230 L 640 360 L 0 360 Z" className="fill-sidebar-raised/45" />
      <path d="M330 120 C 420 40, 560 50, 640 90 L 640 360 L 330 360 Z" className="fill-sidebar-raised/35" />
      <rect x="0" y="330" width="640" height="30" className="fill-sidebar-raised/70" />

      {/* books */}
      <rect x="96" y="300" width="132" height="30" rx="6" className="fill-accent" />
      <rect x="108" y="306" width="112" height="18" rx="3" className="fill-surface" />
      <rect x="104" y="266" width="124" height="30" rx="6" className="fill-surface" />
      <rect x="112" y="272" width="108" height="18" rx="3" className="fill-surface-muted" />
      <rect x="112" y="234" width="112" height="28" rx="6" className="fill-info" />
      <rect x="160" y="240" width="58" height="16" rx="3" className="fill-surface" />

      {/* laptop */}
      <g>
        <path d="M262 98 L 502 98 Q 512 98 511 108 L 498 300 L 236 300 L 252 108 Q 253 98 262 98 Z" className="fill-surface" />
        <path d="M268 112 L 494 112 L 484 288 L 254 288 Z" className="fill-surface-muted" />
        <path d="M268 112 L 300 112 L 288 288 L 254 288 Z" className="fill-sidebar" />
        <image href={queensQ} x="270" y="122" width="22" height="26" />
        <rect x="270" y="162" width="18" height="4" rx="2" className="fill-on-sidebar/70" />
        <rect x="268" y="176" width="18" height="4" rx="2" className="fill-on-sidebar/40" />
        <rect x="267" y="190" width="18" height="4" rx="2" className="fill-on-sidebar/40" />

        <rect x="312" y="124" width="90" height="8" rx="4" className="fill-line-strong" />
        <rect x="310" y="142" width="104" height="64" rx="6" className="fill-surface" />
        <polyline points="318,192 336,178 352,184 370,164 386,170 404,150" className="fill-none stroke-info" strokeWidth="2.5" />
        {[318, 336, 352, 370, 386, 404].map((cx, i) => (
          <circle key={cx} cx={cx} cy={[192, 178, 184, 164, 170, 150][i]} r="3" className="fill-info" />
        ))}

        <rect x="424" y="142" width="58" height="64" rx="6" className="fill-surface" />
        <circle cx="453" cy="174" r="20" className="fill-none stroke-primary" strokeWidth="9" />
        <path d="M 453 154 A 20 20 0 0 1 472 168" className="fill-none stroke-accent" strokeWidth="9" />
        <path d="M 472 180 A 20 20 0 0 1 444 192" className="fill-none stroke-danger" strokeWidth="9" />

        <rect x="304" y="218" width="108" height="60" rx="6" className="fill-surface" />
        <circle cx="316" cy="232" r="4" className="fill-danger" />
        <rect x="326" y="229" width="70" height="6" rx="3" className="fill-line" />
        <circle cx="315" cy="248" r="4" className="fill-accent" />
        <rect x="325" y="245" width="60" height="6" rx="3" className="fill-line" />
        <circle cx="314" cy="264" r="4" className="fill-success" />
        <rect x="324" y="261" width="72" height="6" rx="3" className="fill-line" />

        <rect x="420" y="218" width="58" height="60" rx="6" className="fill-surface" />
        <circle cx="432" cy="236" r="4" className="fill-info" />
        <rect x="440" y="233" width="28" height="6" rx="3" className="fill-line" />
        <circle cx="431" cy="256" r="4" className="fill-info" />
        <rect x="439" y="253" width="26" height="6" rx="3" className="fill-line" />

        <path d="M206 300 L 528 300 Q 532 312 520 316 L 214 316 Q 202 312 206 300 Z" className="fill-surface-muted" />
        <rect x="336" y="300" width="70" height="6" rx="3" className="fill-line-strong" />
      </g>

      {/* plant */}
      <path d="M560 250 C 520 220, 506 170, 522 140 C 556 170, 566 210, 560 250 Z" className="fill-success" />
      <path d="M562 250 C 590 210, 620 196, 640 200 C 626 236, 596 252, 562 250 Z" className="fill-success/80" />
      <path d="M560 250 C 556 200, 572 160, 600 140 C 610 186, 592 226, 560 250 Z" className="fill-success/90" />
      <path d="M528 252 L 596 252 L 588 324 Q 586 332 576 332 L 548 332 Q 538 332 536 324 Z" className="fill-surface" />
      <rect x="524" y="246" width="76" height="12" rx="4" className="fill-surface-muted" />
    </svg>
  )
}
