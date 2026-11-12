// @ts-check
// Dates : l'API parle en ISO 8601 UTC, l'interface en français et en heure locale.

/** @param {string | null | undefined} iso */
export function formatDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'medium' }).format(d);
}

/**
 * « à l'instant », « il y a 5 min », « il y a 3 h », puis la date.
 * @param {string | null | undefined} iso
 * @param {number} [now]
 */
export function formatRelative(iso, now = Date.now()) {
  if (!iso) return 'jamais';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 'jamais';
  const s = Math.round((now - t) / 1000);
  if (s < 45) return "à l'instant";
  if (s < 3600) return `il y a ${Math.round(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.round(s / 3600)} h`;
  return formatDateTime(iso);
}

/**
 * Secondes restantes avant une date (0 si passée ou absente).
 * @param {string | null | undefined} iso
 * @param {number} [now]
 */
export function secondsUntil(iso, now = Date.now()) {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.max(0, Math.ceil((t - now) / 1000));
}

/** 125 → « 2:05 ». @param {number} seconds */
export function formatCountdown(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * Valeur d'un champ datetime-local (heure locale) vers ISO UTC, ou chaîne vide.
 * @param {string} local
 */
export function localToIso(local) {
  if (!local) return '';
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().replace(/\.\d{3}Z$/, 'Z');
}
