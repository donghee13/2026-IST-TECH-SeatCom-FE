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
export const HomeIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 10.5L12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z" />
  </Svg>
)

export const BuildingIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 21h18M5 21V9l7-5 7 5v12" />
    <path d="M9 21v-6h6v6M9 11h.01M12 11h.01M15 11h.01" />
  </Svg>
)

export const SeatIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M7 4h10v8H7zM5 12h14v3H5zM7 15v5M17 15v5" />
  </Svg>
)

export const SlidersIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" />
    <circle cx="16" cy="6" r="2" />
    <circle cx="10" cy="12" r="2" />
    <circle cx="18" cy="18" r="2" />
  </Svg>
)

export const FlaskIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9 3h6M10 3v6L4.5 18.5A1.7 1.7 0 0 0 6 21h12a1.7 1.7 0 0 0 1.5-2.5L14 9V3" />
    <path d="M7.5 15h9" />
  </Svg>
)

export const LogoutIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M9 16l-4-4 4-4M5 12h11" />
  </Svg>
)

export const StarIcon = ({ filled, ...p }: IconProps & { filled?: boolean }) => (
  <Svg {...p} fill={filled ? 'currentColor' : 'none'}>
    <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" />
  </Svg>
)

export const ChevronIcon = (p: IconProps) => (
  <Svg strokeWidth={1.8} {...p}>
    <path d="M9 5l7 7-7 7" />
  </Svg>
)

export const BoltIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M13 3L5 13.5h6L10 21l8-10.5h-6z" />
  </Svg>
)

export const SunIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4" />
  </Svg>
)

export const WindIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 8h11a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h8" />
  </Svg>
)

export const ThermoIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M10 13.5V5a2 2 0 1 1 4 0v8.5a4 4 0 1 1-4 0z" />
    <path d="M12 9v6" />
  </Svg>
)

export const VolumeIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
    <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />
  </Svg>
)

export const DoorIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 21V4.5A1.5 1.5 0 0 1 6.5 3h11A1.5 1.5 0 0 1 19 4.5V21M3 21h18" />
    <circle cx="15" cy="12.5" r="0.9" />
  </Svg>
)

export const EyeIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
    <circle cx="12" cy="12" r="3" />
  </Svg>
)

export const EyeOffIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9.9 5.7A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-2.6 3.4M6.4 6.9C3.9 8.6 2.5 12 2.5 12S6 18.5 12 18.5c1.7 0 3.2-.5 4.5-1.2" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2M3 3l18 18" />
  </Svg>
)

export const UsersIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.8a3.5 3.5 0 0 1 0 6.4M21.5 20a6.5 6.5 0 0 0-4-6" />
  </Svg>
)

export const DeskIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 8h18M5 8v12M19 8v12M5 13h14" />
  </Svg>
)

export const PartitionIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 20V6l4-2v16M20 20V6l-4-2v16M8 13h8" />
  </Svg>
)

export const ToiletIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="7" cy="5" r="1.8" />
    <circle cx="17" cy="5" r="1.8" />
    <path d="M5 9h4l-.5 6h-3zM6.5 15v5M15 9h4l1.5 7h-7zM16 16v4M18 16v4M12 3v18" />
  </Svg>
)

export const PlusIcon = (p: IconProps) => (
  <Svg strokeWidth={2} {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
)

export const MinusIcon = (p: IconProps) => (
  <Svg strokeWidth={2} {...p}>
    <path d="M5 12h14" />
  </Svg>
)
