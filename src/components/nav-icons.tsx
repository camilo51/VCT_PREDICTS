type IconProps = { className?: string };

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

export function IconGrid({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.2" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.2" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.2" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.2" />
    </svg>
  );
}
export function IconSwords({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* two crossed blades */}
      <path d="M4.5 19.5l14-14" />
      <path d="M19.5 19.5l-14-14" />
      {/* hilts at the two bottom ends */}
      <path d="M2 16.5l4.5 4.5" />
      <path d="M22 16.5l-4.5 4.5" />
      <circle cx="4.5" cy="19.5" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="19.5" cy="19.5" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  );
}
export function IconChart({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <path d="M4 20V10M11 20V4M18 20v-7" />
      <path d="M3 20h18" />
    </svg>
  );
}
export function IconShield({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
    </svg>
  );
}
export function IconUser({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <circle cx="12" cy="8" r="3.4" />
      <path d="M4.5 20c1.4-4 4-6 7.5-6s6.1 2 7.5 6" />
    </svg>
  );
}
export function IconMap({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <path d="M9 4l-5 2v14l5-2 6 2 5-2V4l-5 2-6-2z" />
      <path d="M9 4v14M15 6v14" />
    </svg>
  );
}
export function IconTrophy({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <path d="M7 4h10v5a5 5 0 01-10 0V4z" />
      <path d="M5 6H3v2a3 3 0 003 3M19 6h2v2a3 3 0 01-3 3" />
      <path d="M10 17h4M12 14v3M8 20h8" />
    </svg>
  );
}
export function IconBracket({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <path d="M4 5h4M4 12h4M4 19h4M8 5v14M8 8.5h4M8 15.5h4M12 8.5v7M12 12h5v7M17 5h3v3" />
    </svg>
  );
}
export function IconHistory({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <path d="M4 12a8 8 0 108-8" />
      <path d="M4 4v5h5" />
      <path d="M12 8v4l3 2" />
    </svg>
  );
}
