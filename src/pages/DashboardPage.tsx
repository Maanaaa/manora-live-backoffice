import { Link } from 'react-router';
import { BatteryBadge, OnlineBadge, useNow } from '../components/Badges';
import { CapabilityWidget } from '../components/CapabilityWidget';
import { EventList } from '../components/EventList';
import { PageHeader } from '../components/Layout';
import { Empty, ErrorState, Loading } from '../components/States';
import { isReadable } from '../lib/capabilities.js';
import { formatRelative } from '../lib/time.js';
import { useLive } from '../live/LiveContext';

export function DashboardPage() {
  const { terminals, devices, events, loading, error, reload } = useLive();
  const now = useNow(15000);

  if (loading && devices.length === 0 && terminals.length === 0) return <Loading />;
  if (error && devices.length === 0 && terminals.length === 0) {
    return (
      <>
        <PageHeader title="Tableau de bord" />
        <ErrorState error={error} onRetry={reload} />
      </>
    );
  }

  const onlineTerminals = terminals.filter((t) => t.online).length;
  const onlineDevices = devices.filter((d) => d.online).length;

  return (
    <>
      <PageHeader title="Tableau de bord" />

      <section className="stats" aria-label="Résumé">
        <div className="card stat">
          <span className="stat-value">
            {onlineTerminals}/{terminals.length}
          </span>
          <span className="muted">terminaux en ligne</span>
        </div>
        <div className="card stat">
          <span className="stat-value">
            {onlineDevices}/{devices.length}
          </span>
          <span className="muted">appareils en ligne</span>
        </div>
      </section>

      <section aria-labelledby="titre-terminaux">
        <h2 id="titre-terminaux">Terminaux</h2>
        {terminals.length === 0 ? (
          <Empty title="Aucun terminal">Les Raspberry Pi apparaissent ici dès qu'ils contactent l'API.</Empty>
        ) : (
          <ul className="grid grid-small">
            {terminals.map((t) => (
              <li key={t.id} className="card terminal">
                <strong>{t.name}</strong>
                <OnlineBadge online={t.online} />
                <span className="muted">Dernier contact {formatRelative(t.lastSeenAt, now)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="titre-appareils">
        <h2 id="titre-appareils">Appareils</h2>
        {devices.length === 0 ? (
          <Empty title="Aucun appareil">
            Appairez un capteur depuis la page <Link to="/parc">Parc</Link>.
          </Empty>
        ) : (
          <ul className="grid">
            {devices.map((d) => (
              <li key={d.id} className={`card device${d.enabled ? '' : ' device-disabled'}`}>
                <div className="device-head">
                  <Link to={`/parc/appareils/${d.id}`} className="device-name">
                    {d.name}
                  </Link>
                  <OnlineBadge online={d.online} />
                </div>
                <p className="muted">
                  {d.location ?? 'Sans lieu'}
                  {!d.enabled && ' · désactivé'}
                </p>
                <div className="widgets">
                  {d.capabilities.filter(isReadable).map((c) => (
                    <CapabilityWidget key={c.name} capability={c} value={d.state[c.name]} />
                  ))}
                </div>
                <div className="device-foot">
                  <BatteryBadge battery={d.battery} />
                  <span className="muted">{formatRelative(d.lastSeenAt, now)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="titre-evenements">
        <h2 id="titre-evenements">Derniers événements</h2>
        {events.length === 0 ? (
          <Empty title="Aucun événement pour l'instant" />
        ) : (
          <div className="card">
            <EventList events={events} now={now} live />
          </div>
        )}
        <p>
          <Link to="/journal">Voir tout le journal</Link>
        </p>
      </section>
    </>
  );
}
