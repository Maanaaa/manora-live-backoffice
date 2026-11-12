import { useEffect, useState } from 'react';
import { batteryStatus } from '../lib/capabilities.js';
import type { Connection } from '../live/LiveContext';

export function OnlineBadge({ online }: { online: boolean }) {
  return <span className={`badge ${online ? 'badge-ok' : 'badge-off'}`}>{online ? 'En ligne' : 'Hors ligne'}</span>;
}

export function BatteryBadge({ battery }: { battery: number | null }) {
  const { label, level } = batteryStatus(battery);
  return (
    <span className={`battery battery-${level}`} title="Batterie">
      <span className="sr-only">Batterie : </span>
      {level !== 'unknown' && (
        <span className="battery-bar" aria-hidden="true">
          <span style={{ width: `${Math.max(0, Math.min(100, battery ?? 0))}%` }} />
        </span>
      )}
      {label}
    </span>
  );
}

const CONNECTION_LABELS: Record<Connection, string> = {
  open: 'Temps réel connecté',
  connecting: 'Connexion au temps réel…',
  closed: 'Temps réel coupé, reconnexion…',
};

export function ConnectionIndicator({ connection }: { connection: Connection }) {
  return (
    <span className={`connection connection-${connection}`} role="status" aria-live="polite">
      <span className="dot" aria-hidden="true" />
      {CONNECTION_LABELS[connection]}
    </span>
  );
}

/** Horloge qui avance chaque seconde, pour les décomptes et les « il y a … ». */
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
