import { useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../lib/api';
import { capabilityLabel, formatCapabilityValue, isReadable, toBoolean } from '../lib/capabilities.js';
import { formatDateTime } from '../lib/time.js';
import type { Capability, Device, Reading } from '../lib/types';
import { useApi } from '../lib/useApi';
import { Empty, ErrorState, Loading } from './States';

type Range = '24h' | '7d';

const RANGES: { value: Range; label: string }[] = [
  { value: '24h', label: '24 h' },
  { value: '7d', label: '7 jours' },
];

/** Valeur tracée : numérique telle quelle, binaire en 0/1. */
function plotValue(capability: Capability, value: Reading['value']) {
  if (capability.type === 'binary') {
    const on = toBoolean(value);
    return on === null ? null : Number(on);
  }
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

export function HistoryChart({ device }: { device: Device }) {
  const charted = device.capabilities.filter((c) => isReadable(c) && c.type !== 'enum');
  const [capName, setCapName] = useState(charted[0]?.name ?? '');
  const [range, setRange] = useState<Range>('24h');
  const capability = charted.find((c) => c.name === capName);

  const { data, error, loading, reload } = useApi(
    (signal) =>
      capName
        ? api<Reading[]>(`/devices/${device.id}/readings`, { query: { capability: capName, range }, signal })
        : Promise.resolve([]),
    [device.id, capName, range],
  );

  if (charted.length === 0) return <Empty title="Pas d'historique graphique pour cet appareil" />;

  const points = (data ?? [])
    .map((r) => ({ t: new Date(r.ts).getTime(), v: capability ? plotValue(capability, r.value) : null, raw: r.value }))
    .filter((p) => p.v !== null && !Number.isNaN(p.t));

  const tick = (t: number) =>
    new Intl.DateTimeFormat('fr-FR', range === '24h' ? { hour: '2-digit', minute: '2-digit' } : { weekday: 'short', day: 'numeric' }).format(t);
  const isBinary = capability?.type === 'binary';

  return (
    <div className="history">
      <div className="toolbar">
        <label className="field">
          <span>Capacité</span>
          <select value={capName} onChange={(e) => setCapName(e.target.value)}>
            {charted.map((c) => (
              <option key={c.name} value={c.name}>
                {capabilityLabel(c.name)}
              </option>
            ))}
          </select>
        </label>
        <div className="segmented" role="group" aria-label="Période">
          {RANGES.map((r) => (
            <button key={r.value} type="button" aria-pressed={range === r.value} onClick={() => setRange(r.value)}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : points.length === 0 ? (
        <Empty title="Aucune mesure sur cette période" />
      ) : (
        <div className="chart" role="img" aria-label={`Historique ${capabilityLabel(capName)} sur ${range === '24h' ? '24 heures' : '7 jours'}`}>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={points} margin={{ top: 12, right: 16, bottom: 4, left: 0 }}>
              <CartesianGrid stroke="var(--line)" vertical={false} />
              <XAxis
                dataKey="t"
                type="number"
                scale="time"
                domain={['dataMin', 'dataMax']}
                tickFormatter={tick}
                stroke="var(--muted)"
                fontSize={12}
              />
              <YAxis
                stroke="var(--muted)"
                fontSize={12}
                width={isBinary ? 110 : 48}
                domain={isBinary ? [0, 1] : ['auto', 'auto']}
                ticks={isBinary ? [0, 1] : undefined}
                tickFormatter={(v: number) => (capability ? formatCapabilityValue(capability, isBinary ? v === 1 : v) : String(v))}
              />
              <Tooltip
                labelFormatter={(t) => formatDateTime(new Date(Number(t)).toISOString())}
                formatter={(_v, _n, item) => [
                  capability ? formatCapabilityValue(capability, (item.payload as { raw: Reading['value'] }).raw) : '',
                  capabilityLabel(capName),
                ]}
              />
              <Line
                type={isBinary ? 'stepAfter' : 'monotone'}
                dataKey="v"
                stroke="var(--terracotta)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 5 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
