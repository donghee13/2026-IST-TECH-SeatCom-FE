import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

function Svg({ children, strokeWidth = 1.6, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  )
}

export const BackIcon = (p: IconProps) => (
  <Svg strokeWidth={1.8} {...p}>
    <path d="M15 5l-7 7 7 7" />
  </Svg>
)

export const CheckIcon = (p: IconProps) => (
  <Svg strokeWidth={2.4} {...p}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Svg>
)

export const BookIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 5.5c3-1.2 6-1.2 9 .8 3-2 6-2 9-.8V19c-3-1.2-6-1.2-9 .8-3-2-6-2-9-.8z" />
    <path d="M12 6.3v13.5" />
  </Svg>
)

export const SearchIcon = (p: IconProps) => (
  <Svg strokeWidth={2} {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M16 16l4.5 4.5" />
  </Svg>
)

export const MailIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M3.5 6.5l8.5 6 8.5-6" />
  </Svg>
)

export const LaptopIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="4" y="5" width="16" height="11" rx="1.5" />
    <path d="M2 19h20" />
  </Svg>
)

export const TargetIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="12" cy="12" r="0.8" />
  </Svg>
)

export const WindowIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="4" y="3" width="16" height="18" rx="1" />
    <path d="M12 3v18M4 12h16" />
  </Svg>
)

export const ClockIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </Svg>
)

export const CornerIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 4v15h15" />
    <rect x="8.5" y="10" width="6" height="5.5" rx="1" />
  </Svg>
)

export const HourglassIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M7 3h10M7 21h10" />
    <path d="M8 3c0 4.5 4 6 4 9s-4 4.5-4 9" />
    <path d="M16 3c0 4.5-4 6-4 9s4 4.5 4 9" />
  </Svg>
)