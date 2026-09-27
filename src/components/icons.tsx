/**
 * Ícones. Desenhados aqui, em traço, para não depender de biblioteca externa
 * (peso a mais no cache offline) e para nada ser reaproveitado do app de
 * referência — o fluxo pode inspirar, o desenho não.
 */
import type { SVGProps } from 'react'

const base = (p: SVGProps<SVGSVGElement>): SVGProps<SVGSVGElement> => ({
  width: 22,
  height: 22,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false,
  ...p,
})

export const IconArrowLeft = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M19 12H5" />
    <path d="m12 19-7-7 7-7" />
  </svg>
)

export const IconChevronRight = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="m9 18 6-6-6-6" />
  </svg>
)

export const IconLock = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <rect x="4" y="10" width="16" height="11" rx="2.5" />
    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
  </svg>
)

export const IconCheck = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="m20 6-11 11-5-5" />
  </svg>
)

export const IconPlay = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base({ fill: 'currentColor', stroke: 'none', ...p })}>
    <path d="M8 5.5v13a1 1 0 0 0 1.54.84l10-6.5a1 1 0 0 0 0-1.68l-10-6.5A1 1 0 0 0 8 5.5Z" />
  </svg>
)

export const IconPause = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base({ fill: 'currentColor', stroke: 'none', ...p })}>
    <rect x="7" y="5" width="3.5" height="14" rx="1.4" />
    <rect x="13.5" y="5" width="3.5" height="14" rx="1.4" />
  </svg>
)

export const IconSound = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M11 5 6.5 9H3v6h3.5L11 19z" />
    <path d="M15.5 8.5a5 5 0 0 1 0 7" />
    <path d="M18.5 5.8a9 9 0 0 1 0 12.4" />
  </svg>
)

export const IconSoundOff = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M11 5 6.5 9H3v6h3.5L11 19z" />
    <path d="m16 9.5 5 5" />
    <path d="m21 9.5-5 5" />
  </svg>
)

export const IconVibrate = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <rect x="8" y="3" width="8" height="18" rx="2" />
    <path d="M4 9v6" />
    <path d="M20 9v6" />
  </svg>
)

export const IconVibrateOff = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <rect x="8" y="3" width="8" height="18" rx="2" />
    <path d="m3 3 18 18" />
  </svg>
)

export const IconShare = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M12 16V4" />
    <path d="m8 8 4-4 4 4" />
    <path d="M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" />
  </svg>
)

export const IconPlus = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <rect x="4" y="4" width="16" height="16" rx="4" />
    <path d="M12 8.5v7" />
    <path d="M8.5 12h7" />
  </svg>
)

export const IconSettings = (p: SVGProps<SVGSVGElement>) => (
  // Engrenagem padrão (antes era um círculo com raios, que lia como "luz" —
  // apontado na revisão de QA da cliente em 26/09/2026).
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
)

/*
 * Posturas. São o eixo de progressão do programa, então cada uma precisa ser
 * reconhecível de relance no card da semana: uma figura deitada na horizontal,
 * sentada em ângulo reto, e em pé na vertical.
 */

export const IconLying = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <circle cx="5.5" cy="10" r="2.2" />
    <path d="M8 12h6.5a3 3 0 0 1 3 3v1" />
    <path d="M3 16h18" />
  </svg>
)

export const IconSeated = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <circle cx="9" cy="5" r="2.2" />
    <path d="M9 8v5h6" />
    <path d="M15 13v6" />
    <path d="M6 19h6" />
  </svg>
)

export const IconStanding = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <circle cx="12" cy="5" r="2.2" />
    <path d="M12 8v7" />
    <path d="m9 21 3-6 3 6" />
    <path d="M8.5 11h7" />
  </svg>
)

export const IconFlame = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M12 3c.6 3-1.4 4.2-2.7 5.7A6.5 6.5 0 0 0 7.5 13a4.5 4.5 0 0 0 9 0c0-2-1-3.4-2-4.6-.5 1-1.2 1.6-2 1.8.4-2.6-.2-5.2-.5-7.2Z" />
  </svg>
)
