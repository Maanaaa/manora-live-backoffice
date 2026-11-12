import { formatDateTime, formatRelative } from '../lib/time.js';
import type { EventType, LiveEvent } from '../lib/types';

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  reading: 'Mesure',
  joined: 'Appairage',
  online: 'En ligne',
  offline: 'Hors ligne',
  command: 'Commande',
  rule: 'Règle',
};

export function EventList({ events, now, live = false }: { events: LiveEvent[]; now?: number; live?: boolean }) {
  return (
    <ol className="events" aria-live={live ? 'polite' : undefined}>
      {events.map((e) => (
        <li key={e.id} className="event">
          <span className={`tag tag-${e.type}`}>{EVENT_TYPE_LABELS[e.type] ?? e.type}</span>
          <span className="event-body">
            <span>{e.message}</span>
            {e.deviceName && <span className="muted"> · {e.deviceName}</span>}
          </span>
          <time dateTime={e.ts} title={formatDateTime(e.ts)} className="muted event-time">
            {now ? formatRelative(e.ts, now) : formatDateTime(e.ts)}
          </time>
        </li>
      ))}
    </ol>
  );
}
