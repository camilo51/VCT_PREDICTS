export function formatCountdown(target: Date, now: Date = new Date()): string {
  const diffMs = target.getTime() - now.getTime();
  if (diffMs <= 0) return "En curso";
  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function formatRelativeTime(date: Date, now: Date = new Date()): string {
  const diffMs = now.getTime() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "hace instantes";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `hace ${days}d`;
}

export function formatMatchDateLabel(date: Date, now: Date = new Date()): string {
  const isSameDay = date.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow = date.toDateString() === tomorrow.toDateString();

  const time = date.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  if (isSameDay) return `Hoy · ${time}`;
  if (isTomorrow) return `Mañana · ${time}`;
  const day = date.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
  return `${day} · ${time}`;
}

export function pct(n: number | null | undefined, digits = 0): string {
  if (n == null || Number.isNaN(n)) return "Sin datos";
  return `${(n * 100).toFixed(digits)}%`;
}

export function num(n: number | null | undefined, digits = 2): string {
  if (n == null || Number.isNaN(n)) return "Sin datos";
  return n.toFixed(digits);
}
