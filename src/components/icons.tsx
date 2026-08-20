interface IconProps {
  className?: string;
  strokeWidth?: number;
}

const base = (className?: string) => className ?? "w-5 h-5";

const S = ({ className, strokeWidth = 1.8, children }: IconProps & { children: React.ReactNode }) => (
  <svg
    viewBox="0 0 24 24"
    className={base(className)}
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    {children}
  </svg>
);

export const IconPlay = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={base(className)} fill="currentColor" aria-hidden>
    <path d="M8.5 5.1c0-.9 1-1.5 1.8-1L19 10.9c.8.5.8 1.7 0 2.2l-8.7 6.8c-.8.5-1.8-.1-1.8-1V5.1z" />
  </svg>
);

export const IconPause = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={base(className)} fill="currentColor" aria-hidden>
    <rect x="6" y="4.5" width="4" height="15" rx="1.4" />
    <rect x="14" y="4.5" width="4" height="15" rx="1.4" />
  </svg>
);

export const IconReset = ({ className, strokeWidth = 2 }: IconProps) => (
  <S className={className} strokeWidth={strokeWidth}>
    <path d="M4.5 5v4.6h4.6" />
    <path d="M5.2 13.6a7.2 7.2 0 1 0 .7-6L4.5 9.6" />
  </S>
);

export const IconSkip = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={base(className)} fill="currentColor" aria-hidden>
    <path d="M5 5.9c0-.8.9-1.3 1.6-.9l6 4.1c.7.4.7 1.4 0 1.8l-6 4.1c-.7.4-1.6-.1-1.6-.9V5.9z" />
    <path d="M13 5.9c0-.8.9-1.3 1.6-.9l6 4.1c.7.4.7 1.4 0 1.8l-6 4.1c-.7.4-1.6-.1-1.6-.9V5.9z" />
  </svg>
);

export const IconTomato = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={base(className)} fill="none" aria-hidden>
    <path d="M12 8.1c-4.6 0-8 3.1-8 7.2 0 4 3.4 6.7 8 6.7s8-2.7 8-6.7c0-4.1-3.4-7.2-8-7.2z" fill="#ff6b4a" />
    <path d="M12 8.6c-.7-2.2-2.5-3.6-5.2-3.7 1.4 1 2.3 2.1 2.7 3.4-1.6-.4-3 .1-4 1.3 2 .7 4.3.4 6.5-1z" fill="#3ecf9a" />
    <path d="M12 8.6c.7-2.2 2.5-3.6 5.2-3.7-1.4 1-2.3 2.1-2.7 3.4 1.6-.4 3 .1 4 1.3-2 .7-4.3.4-6.5-1z" fill="#3ecf9a" />
    <path d="M12 8.4c-.3-1.5.1-2.8 1.2-4" stroke="#2aa87b" strokeWidth="1.4" strokeLinecap="round" />
    <path d="M7.2 13.1c-.6.9-.9 1.9-.8 3" stroke="#ffa184" strokeWidth="1.3" strokeLinecap="round" opacity="0.9" />
  </svg>
);

export const IconTimer = ({ className, strokeWidth }: IconProps) => (
  <S className={className} strokeWidth={strokeWidth}>
    <circle cx="12" cy="13.5" r="7.5" />
    <path d="M12 9.5v4l2.8 1.7" />
    <path d="M9.5 3h5" />
    <path d="M12 3v3" />
  </S>
);

export const IconMug = ({ className, strokeWidth }: IconProps) => (
  <S className={className} strokeWidth={strokeWidth}>
    <path d="M5 9.5h11v6.2A4.3 4.3 0 0 1 11.7 20H9.3A4.3 4.3 0 0 1 5 15.7V9.5z" />
    <path d="M16 10.7h1.6a2.4 2.4 0 0 1 0 4.8H16" />
    <path d="M8.3 6.6c-.5-.8-.5-1.6 0-2.4M11.5 6.6c-.5-.8-.5-1.6 0-2.4" />
  </S>
);

export const IconLeaf = ({ className, strokeWidth }: IconProps) => (
  <S className={className} strokeWidth={strokeWidth}>
    <path d="M19.5 4.5c.3 7.8-3.4 12.6-9 12.6-2.5 0-4.4-1.4-4.4-3.9 0-4.6 5.5-8.5 13.4-8.7z" />
    <path d="M4.5 20c2.8-4.6 6.8-7.7 11.5-9.3" />
  </S>
);

export const IconTrophy = ({ className, strokeWidth }: IconProps) => (
  <S className={className} strokeWidth={strokeWidth}>
    <path d="M8 4h8v6a4 4 0 0 1-8 0V4z" />
    <path d="M8 5.5H4.8a3.2 3.2 0 0 0 3.4 3.6M16 5.5h3.2a3.2 3.2 0 0 1-3.4 3.6" />
    <path d="M12 14v3.2M8.5 20.5h7M10 20.5v-3.3h4v3.3" />
  </S>
);

export const IconSliders = ({ className, strokeWidth }: IconProps) => (
  <S className={className} strokeWidth={strokeWidth}>
    <path d="M4 7.5h9M17.5 7.5H20M4 12h3M11.5 12H20M4 16.5h11M19.5 16.5H20" />
    <circle cx="15" cy="7.5" r="1.9" />
    <circle cx="9" cy="12" r="1.9" />
    <circle cx="17" cy="16.5" r="1.9" />
  </S>
);

export const IconCheck = ({ className, strokeWidth = 2.2 }: IconProps) => (
  <S className={className} strokeWidth={strokeWidth}>
    <path d="M4.5 12.5l5 5 10-11" />
  </S>
);

export const IconFlame = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={base(className)} fill="none" aria-hidden>
    <path
      d="M12 2.8c.7 3.1 4.7 4.9 4.7 9a4.7 4.7 0 0 1-9.4 0c0-1.8.8-3.2 1.8-4.5.5.9 1.2 1.5 1.2 1.5-.4-1.9.3-4 1.7-6z"
      fill="currentColor"
      opacity="0.35"
    />
    <path
      d="M12 2.8c.7 3.1 4.7 4.9 4.7 9a4.7 4.7 0 0 1-9.4 0c0-1.8.8-3.2 1.8-4.5.5.9 1.2 1.5 1.2 1.5-.4-1.9.3-4 1.7-6z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
    <path d="M12 21a2.8 2.8 0 0 1-2.8-2.8c0-1.5 1.3-2.3 2.8-3.9 1.5 1.6 2.8 2.4 2.8 3.9A2.8 2.8 0 0 1 12 21z" fill="currentColor" />
  </svg>
);

export const IconPlus = ({ className, strokeWidth = 2 }: IconProps) => (
  <S className={className} strokeWidth={strokeWidth}>
    <path d="M12 5v14M5 12h14" />
  </S>
);

export const IconX = ({ className, strokeWidth = 2 }: IconProps) => (
  <S className={className} strokeWidth={strokeWidth}>
    <path d="M6 6l12 12M18 6L6 18" />
  </S>
);

export const IconTrash = ({ className, strokeWidth }: IconProps) => (
  <S className={className} strokeWidth={strokeWidth}>
    <path d="M4.5 6.5h15M9.5 6V4.5h5V6M6.5 6.5l.8 12a1.8 1.8 0 0 0 1.8 1.7h5.8a1.8 1.8 0 0 0 1.8-1.7l.8-12" />
    <path d="M10 10.5v5.5M14 10.5v5.5" />
  </S>
);

export const IconDownload = ({ className, strokeWidth }: IconProps) => (
  <S className={className} strokeWidth={strokeWidth}>
    <path d="M12 4v10.5M7.5 10.5L12 15l4.5-4.5" />
    <path d="M4.5 16.5v2A1.5 1.5 0 0 0 6 20h12a1.5 1.5 0 0 0 1.5-1.5v-2" />
  </S>
);

export const IconUpload = ({ className, strokeWidth }: IconProps) => (
  <S className={className} strokeWidth={strokeWidth}>
    <path d="M12 15V4.5M7.5 9L12 4.5 16.5 9" />
    <path d="M4.5 16.5v2A1.5 1.5 0 0 0 6 20h12a1.5 1.5 0 0 0 1.5-1.5v-2" />
  </S>
);

export const IconLock = ({ className, strokeWidth }: IconProps) => (
  <S className={className} strokeWidth={strokeWidth}>
    <rect x="5.5" y="10.5" width="13" height="9.5" rx="2" />
    <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
    <circle cx="12" cy="15.2" r="1.2" fill="currentColor" stroke="none" />
  </S>
);

export const IconChevronDown = ({ className, strokeWidth = 2 }: IconProps) => (
  <S className={className} strokeWidth={strokeWidth}>
    <path d="M5.5 9.5l6.5 6 6.5-6" />
  </S>
);

export const IconBell = ({ className, strokeWidth }: IconProps) => (
  <S className={className} strokeWidth={strokeWidth}>
    <path d="M12 4a5.5 5.5 0 0 1 5.5 5.5c0 4.2 1 5.6 2 6.5H4.5c1-.9 2-2.3 2-6.5A5.5 5.5 0 0 1 12 4z" />
    <path d="M10 19a2 2 0 0 0 4 0" />
  </S>
);

export const IconExpand = ({ className, strokeWidth }: IconProps) => (
  <S className={className} strokeWidth={strokeWidth}>
    <path d="M9 4.5H4.5V9M15 4.5h4.5V9M9 19.5H4.5V15M15 19.5h4.5V15" />
  </S>
);

export const IconTarget = ({ className, strokeWidth }: IconProps) => (
  <S className={className} strokeWidth={strokeWidth}>
    <circle cx="12" cy="12" r="8" />
    <circle cx="12" cy="12" r="4.4" />
    <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
  </S>
);

export const IconSun = ({ className, strokeWidth }: IconProps) => (
  <S className={className} strokeWidth={strokeWidth}>
    <circle cx="12" cy="12" r="4.2" />
    <path d="M12 2.8v2.2M12 19v2.2M2.8 12H5M19 12h2.2M5.2 5.2l1.6 1.6M17.2 17.2l1.6 1.6M18.8 5.2l-1.6 1.6M6.8 17.2l-1.6 1.6" />
  </S>
);

export const IconMoon = ({ className, strokeWidth }: IconProps) => (
  <S className={className} strokeWidth={strokeWidth}>
    <path d="M19.5 14.2A7.8 7.8 0 0 1 9.8 4.5a7.8 7.8 0 1 0 9.7 9.7z" />
  </S>
);

export const IconBriefcase = ({ className, strokeWidth }: IconProps) => (
  <S className={className} strokeWidth={strokeWidth}>
    <rect x="3.5" y="7.5" width="17" height="12" rx="2" />
    <path d="M9 7.5V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1.5" />
    <path d="M3.5 12.5h17" />
    <path d="M12 11.5v2" />
  </S>
);

export const IconBook = ({ className, strokeWidth }: IconProps) => (
  <S className={className} strokeWidth={strokeWidth}>
    <path d="M5 5.2C5 4 6 3 7.2 3H19v15H7.2A2.2 2.2 0 0 0 5 20.2V5.2z" />
    <path d="M19 18v2.5H7.2A2.2 2.2 0 0 1 5 18.3" />
    <path d="M9 3v15" />
  </S>
);

export const IconHeart = ({ className, strokeWidth }: IconProps) => (
  <S className={className} strokeWidth={strokeWidth}>
    <path d="M12 20.2S5.2 15.8 3.3 11.4C2.1 8.6 4 5.4 7.1 5.4c2.1 0 3.6 1.3 4.9 3 1.3-1.7 2.8-3 4.9-3 3.1 0 5 3.2 3.8 6-1.9 4.4-8.7 8.8-8.7 8.8z" />
  </S>
);

export const IconShare = ({ className, strokeWidth }: IconProps) => (
  <S className={className} strokeWidth={strokeWidth}>
    <path d="M12 3.5v11" />
    <path d="M8 7l4-3.5L16 7" />
    <path d="M5.5 12v6.5a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V12" />
  </S>
);

export const IconGrip = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={base(className)} fill="currentColor" aria-hidden>
    <circle cx="9.5" cy="6" r="1.2" />
    <circle cx="14.5" cy="6" r="1.2" />
    <circle cx="9.5" cy="12" r="1.2" />
    <circle cx="14.5" cy="12" r="1.2" />
    <circle cx="9.5" cy="18" r="1.2" />
    <circle cx="14.5" cy="18" r="1.2" />
  </svg>
);

export const IconArrowRight = ({ className, strokeWidth = 2 }: IconProps) => (
  <S className={className} strokeWidth={strokeWidth}>
    <path d="M4.5 12h15M13.5 6l6 6-6 6" />
  </S>
);

export const IconPicture = ({ className, strokeWidth }: IconProps) => (
  <S className={className} strokeWidth={strokeWidth}>
    <rect x="3" y="4.5" width="18" height="15" rx="2.5" />
    <rect x="11.5" y="12" width="7.5" height="5" rx="1.2" fill="currentColor" stroke="none" />
  </S>
);

export const IconPin = ({ className, strokeWidth }: IconProps) => (
  <S className={className} strokeWidth={strokeWidth}>
    <path d="M9 4h6l-.8 5.2 2.3 3.3H7.5l2.3-3.3L9 4z" />
    <path d="M12 12.5V20" />
  </S>
);

export const IconArchive = ({ className, strokeWidth }: IconProps) => (
  <S className={className} strokeWidth={strokeWidth}>
    <rect x="3.5" y="4" width="17" height="4.5" rx="1.2" />
    <path d="M5.5 8.5V18a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V8.5" />
    <path d="M10 12.5h4" />
  </S>
);

export const IconRepeat = ({ className, strokeWidth }: IconProps) => (
  <S className={className} strokeWidth={strokeWidth}>
    <path d="M17 5l3 3-3 3" />
    <path d="M4 13V11a3 3 0 0 1 3-3h13" />
    <path d="M7 19l-3-3 3-3" />
    <path d="M20 11v2a3 3 0 0 1-3 3H4" />
  </S>
);

export const IconFlag = ({ className, strokeWidth }: IconProps) => (
  <S className={className} strokeWidth={strokeWidth}>
    <path d="M5.5 21V4" />
    <path d="M5.5 4.8c2.4-1.4 4.6-1.4 7 0s4.6 1.4 6 0.4v8.2c-1.4 1-3.6 1-6-.4s-4.6-1.4-7 0" />
  </S>
);

export const IconZap = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={base(className)} fill="currentColor" aria-hidden>
    <path d="M13 2.5L4.5 13.5H11l-1 8 8.5-11H12l1-8z" />
  </svg>
);
