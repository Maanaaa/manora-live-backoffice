import { useState } from 'react';
import { Link } from 'react-router';
import { BatteryBadge, OnlineBadge, useNow } from '../components/Badges';
import { PageHeader } from '../components/Layout';
import { Empty, ErrorState, FormError, Loading } from '../components/States';
import { api } from '../lib/api';
import { capabilityLabel } from '../lib/capabilities.js';
import { formatCountdown, formatRelative, secondsUntil } from '../lib/time.js';
import type { Device, Terminal } from '../lib/types';
import { useLive } from '../live/LiveContext';

const PERMIT_JOIN_SECONDS = 120;

function TerminalRow({ terminal, now }: { terminal: Terminal; now: number }) {
  const { updateTerminal } = useLive();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const remaining = secondsUntil(terminal.permitJoinUntil, now);

  const permitJoin = async () => {
    setPending(true);
    setError(null);
    try {
      const { until } = await api<{ until: string }>(`/terminals/${terminal.id}/permit-join`, {
        method: 'POST',
        body: { seconds: PERMIT_JOIN_SECONDS },
      });
      updateTerminal({ id: terminal.id, permitJoinUntil: until });
    } catch (err) {
      setError(err);
    } finally {
      setPending(false);
    }
  };

  return (
    <li className="card terminal">
      <strong>{terminal.name}</strong>
      <OnlineBadge online={terminal.online} />
      <span className="muted">Dernier contact {formatRelative(terminal.lastSeenAt, now)}</span>
      {remaining > 0 ? (
        <p className="pairing" role="status">
          Appairage ouvert : {formatCountdown(remaining)}. Mettez le capteur en mode appairage.
        </p>
      ) : (
        <button type="button" className="btn btn-primary" onClick={permitJoin} disabled={pending || !terminal.online}>
          {pending ? 'Ouverture…' : 'Appairer un capteur'}
        </button>
      )}
      <FormError error={error} />
    </li>
  );
}

function DeviceRow({ device, isNew, terminalName, now }: { device: Device; isNew: boolean; terminalName: string; now: number }) {
  const { updateDevice } = useLive();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(device.name);
  const [location, setLocation] = useState(device.location ?? '');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const patch = async (body: { name?: string; location?: string | null; enabled?: boolean }) => {
    setPending(true);
    setError(null);
    try {
      updateDevice(await api<Device>(`/devices/${device.id}`, { method: 'PATCH', body }));
      return true;
    } catch (err) {
      setError(err);
      return false;
    } finally {
      setPending(false);
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await patch({ name: name.trim() || device.name, location: location.trim() || null })) setEditing(false);
  };

  const startEditing = () => {
    setName(device.name);
    setLocation(device.location ?? '');
    setEditing(true);
  };

  return (
    <tr>
      <td>
        {editing ? (
          <form className="inline-form" onSubmit={save}>
            <label className="field">
              <span>Nom</span>
              <input value={name} onChange={(e) => setName(e.target.value)} required />
            </label>
            <label className="field">
              <span>Lieu</span>
              <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Entrée, salle…" />
            </label>
            <div className="row">
              <button type="submit" className="btn btn-primary" disabled={pending}>
                Enregistrer
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setEditing(false)}>
                Annuler
              </button>
            </div>
          </form>
        ) : (
          <>
            <Link to={`/parc/appareils/${device.id}`} className="device-name">
              {device.name}
            </Link>
            {isNew && <span className="badge badge-new">Nouveau</span>}
            <div className="muted">
              {device.location ?? 'Sans lieu'} · {terminalName}
            </div>
          </>
        )}
        <FormError error={error} />
      </td>
      <td>
        <OnlineBadge online={device.online} />
        <div className="muted">{formatRelative(device.lastSeenAt, now)}</div>
      </td>
      <td>
        <BatteryBadge battery={device.battery} />
      </td>
      <td>
        <ul className="chips">
          {device.capabilities.map((c) => (
            <li key={c.name} className="chip">
              {capabilityLabel(c.name)}
              {c.access !== 'read' && <span className="sr-only"> (commandable)</span>}
              {c.access !== 'read' && <span aria-hidden="true"> ⚙</span>}
            </li>
          ))}
        </ul>
      </td>
      <td>
        <label className="switch">
          <input
            type="checkbox"
            checked={device.enabled}
            disabled={pending}
            onChange={(e) => void patch({ enabled: e.target.checked })}
          />
          <span>{device.enabled ? 'Activé' : 'Désactivé'}</span>
        </label>
      </td>
      <td>
        {!editing && (
          <button type="button" className="btn btn-ghost" onClick={startEditing}>
            Modifier
          </button>
        )}
      </td>
    </tr>
  );
}

export function FleetPage() {
  const { terminals, devices, joined, loading, error, reload } = useLive();
  const now = useNow();

  if (loading && devices.length === 0 && terminals.length === 0) return <Loading />;

  return (
    <>
      <PageHeader title="Parc" />
      {error && devices.length === 0 && terminals.length === 0 ? (
        <ErrorState error={error} onRetry={reload} />
      ) : (
        <>
          <section aria-labelledby="titre-terminaux">
            <h2 id="titre-terminaux">Terminaux</h2>
            {terminals.length === 0 ? (
              <Empty title="Aucun terminal" />
            ) : (
              <ul className="grid grid-small">
                {terminals.map((t) => (
                  <TerminalRow key={t.id} terminal={t} now={now} />
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="titre-appareils">
            <h2 id="titre-appareils">Appareils</h2>
            {devices.length === 0 ? (
              <Empty title="Aucun appareil">Ouvrez l'appairage sur un terminal : le capteur apparaîtra ici tout seul.</Empty>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Appareil</th>
                      <th scope="col">État</th>
                      <th scope="col">Batterie</th>
                      <th scope="col">Capacités</th>
                      <th scope="col">Activation</th>
                      <th scope="col">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {devices.map((d) => (
                      <DeviceRow
                        key={d.id}
                        device={d}
                        isNew={joined.includes(d.id)}
                        terminalName={terminals.find((t) => t.id === d.terminalId)?.name ?? 'Terminal inconnu'}
                        now={now}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </>
  );
}
