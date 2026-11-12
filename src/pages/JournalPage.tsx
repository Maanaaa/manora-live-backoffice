import { useState } from 'react';
import { EVENT_TYPE_LABELS, EventList } from '../components/EventList';
import { PageHeader } from '../components/Layout';
import { Empty, ErrorState, Loading } from '../components/States';
import { api } from '../lib/api';
import { localToIso } from '../lib/time.js';
import type { LiveEvent } from '../lib/types';
import { useApi } from '../lib/useApi';
import { useLive } from '../live/LiveContext';

const LIMIT = 200;
const emptyFilters = { deviceId: '', type: '', from: '', to: '' };

export function JournalPage() {
  const { devices } = useLive();
  const [draft, setDraft] = useState(emptyFilters);
  const [filters, setFilters] = useState(emptyFilters);

  const { data: events, error, loading, reload } = useApi(
    (signal) =>
      api<LiveEvent[]>('/events', {
        query: {
          deviceId: filters.deviceId,
          type: filters.type,
          from: localToIso(filters.from),
          to: localToIso(filters.to),
          limit: LIMIT,
        },
        signal,
      }),
    [filters],
  );

  const apply = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters(draft);
  };

  const reset = () => {
    setDraft(emptyFilters);
    setFilters(emptyFilters);
  };

  return (
    <>
      <PageHeader title="Journal" />
      <form className="card filters" onSubmit={apply} aria-label="Filtres du journal">
        <div className="form-grid">
          <label className="field">
            <span>Appareil</span>
            <select value={draft.deviceId} onChange={(e) => setDraft({ ...draft, deviceId: e.target.value })}>
              <option value="">Tous</option>
              {devices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Type</span>
            <select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })}>
              <option value="">Tous</option>
              {Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Du</span>
            <input type="datetime-local" value={draft.from} onChange={(e) => setDraft({ ...draft, from: e.target.value })} />
          </label>
          <label className="field">
            <span>Au</span>
            <input type="datetime-local" value={draft.to} onChange={(e) => setDraft({ ...draft, to: e.target.value })} />
          </label>
        </div>
        <div className="row">
          <button type="submit" className="btn btn-primary">
            Filtrer
          </button>
          <button type="button" className="btn btn-ghost" onClick={reset}>
            Réinitialiser
          </button>
        </div>
      </form>

      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : !events || events.length === 0 ? (
        <Empty title="Aucun événement">Aucun événement ne correspond à ces filtres.</Empty>
      ) : (
        <div className="card">
          <p className="muted">
            {events.length} événement{events.length > 1 ? 's' : ''}
            {events.length >= LIMIT && ` (les ${LIMIT} plus récents)`}
          </p>
          <EventList events={events} />
        </div>
      )}
    </>
  );
}
