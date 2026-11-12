import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { BatteryBadge, OnlineBadge, useNow } from '../components/Badges';
import { CapabilityWidget } from '../components/CapabilityWidget';
import { HistoryChart } from '../components/HistoryChart';
import { PageHeader } from '../components/Layout';
import { ErrorState, FormError, Loading } from '../components/States';
import { api } from '../lib/api';
import {
  binaryLabel,
  capabilityLabel,
  enumLabel,
  formatCapabilityValue,
  isReadable,
  isWritable,
  toBoolean,
} from '../lib/capabilities.js';
import { formatRelative } from '../lib/time.js';
import type { Capability, Device } from '../lib/types';
import { useApi } from '../lib/useApi';
import { useLive } from '../live/LiveContext';

const ACCESS_LABELS: Record<Capability['access'], string> = {
  read: 'Lecture',
  write: 'Commande',
  readwrite: 'Lecture et commande',
};

/** Commande d'une capacité en écriture ; l'état affiché est celui renvoyé par l'API après exécution. */
function CommandControl({ device, capability }: { device: Device; capability: Capability }) {
  const { updateDevice } = useLive();
  const current = device.state[capability.name];
  const [draft, setDraft] = useState(() =>
    capability.type === 'enum' ? String(current ?? capability.values?.[0] ?? '') : current == null ? '' : String(current),
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [confirmed, setConfirmed] = useState<string | null>(null);

  const send = async (value: boolean | number | string) => {
    setPending(true);
    setError(null);
    setConfirmed(null);
    try {
      const updated = await api<Device>(`/devices/${device.id}/commands`, {
        method: 'POST',
        body: { capability: capability.name, value },
      });
      updateDevice(updated);
      setConfirmed(formatCapabilityValue(capability, updated.state[capability.name]));
    } catch (err) {
      setError(err);
    } finally {
      setPending(false);
    }
  };

  const disabled = pending || !device.online || !device.enabled;
  const label = capabilityLabel(capability.name);

  let control: React.ReactNode;
  if (capability.type === 'binary') {
    const on = toBoolean(current);
    control = (
      <div className="row">
        <button type="button" className="btn btn-primary" disabled={disabled || on === true} onClick={() => send(true)}>
          {binaryLabel(capability.name, true)}
        </button>
        <button type="button" className="btn btn-secondary" disabled={disabled || on === false} onClick={() => send(false)}>
          {binaryLabel(capability.name, false)}
        </button>
      </div>
    );
  } else {
    const submit = (e: React.FormEvent) => {
      e.preventDefault();
      if (capability.type === 'numeric') {
        const n = Number(draft.replace(',', '.'));
        if (Number.isFinite(n)) void send(n);
      } else if (draft) void send(draft);
    };
    control = (
      <form className="row" onSubmit={submit}>
        <label className="field">
          <span className="sr-only">{label}</span>
          {capability.type === 'enum' ? (
            <select value={draft} onChange={(e) => setDraft(e.target.value)}>
              {(capability.values ?? []).map((v) => (
                <option key={v} value={v}>
                  {enumLabel(v)}
                </option>
              ))}
            </select>
          ) : (
            <input type="number" step="any" inputMode="decimal" required value={draft} onChange={(e) => setDraft(e.target.value)} />
          )}
        </label>
        {capability.unit && <span className="muted">{capability.unit}</span>}
        <button type="submit" className="btn btn-primary" disabled={disabled}>
          Envoyer
        </button>
      </form>
    );
  }

  return (
    <div className="command">
      <h3>{label}</h3>
      {control}
      {pending && <p role="status">Commande en cours…</p>}
      {confirmed && (
        <p className="success" role="status">
          État confirmé par l'appareil : {confirmed}
        </p>
      )}
      {!device.online && <p className="muted">Appareil hors ligne : commande indisponible.</p>}
      {device.online && !device.enabled && <p className="muted">Appareil désactivé : commande indisponible.</p>}
      <FormError error={error} />
    </div>
  );
}

export function DevicePage() {
  const { id = '' } = useParams();
  const live = useLive();
  const now = useNow(15000);
  const fetched = useApi((signal) => api<Device>(`/devices/${id}`, { signal }), [id]);
  // Les mises à jour temps réel passent par le store partagé ; la requête sert au premier affichage.
  const device = live.devices.find((d) => d.id === id) ?? fetched.data;

  if (!device) {
    if (fetched.loading) return <Loading />;
    return (
      <>
        <PageHeader title="Appareil" />
        <ErrorState error={fetched.error} onRetry={fetched.reload} />
        <Link to="/parc">Retour au parc</Link>
      </>
    );
  }

  const terminal = live.terminals.find((t) => t.id === device.terminalId);
  const writable = device.capabilities.filter(isWritable);

  return (
    <>
      <p>
        <Link to="/parc">← Parc</Link>
      </p>
      <PageHeader title={device.name}>
        <OnlineBadge online={device.online} />
        <BatteryBadge battery={device.battery} />
      </PageHeader>

      <dl className="card details">
        <div>
          <dt>Lieu</dt>
          <dd>{device.location ?? 'Sans lieu'}</dd>
        </div>
        <div>
          <dt>Terminal</dt>
          <dd>{terminal?.name ?? device.terminalId}</dd>
        </div>
        <div>
          <dt>Modèle</dt>
          <dd>{device.model}</dd>
        </div>
        <div>
          <dt>Adresse IEEE</dt>
          <dd className="mono">{device.ieee}</dd>
        </div>
        <div>
          <dt>Dernier contact</dt>
          <dd>{formatRelative(device.lastSeenAt, now)}</dd>
        </div>
        <div>
          <dt>Activation</dt>
          <dd>{device.enabled ? 'Activé' : 'Désactivé'}</dd>
        </div>
      </dl>

      <section aria-labelledby="titre-capacites">
        <h2 id="titre-capacites">Capacités</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Capacité</th>
                <th scope="col">Valeur actuelle</th>
                <th scope="col">Type</th>
                <th scope="col">Accès</th>
              </tr>
            </thead>
            <tbody>
              {device.capabilities.map((c) => (
                <tr key={c.name}>
                  <td>{capabilityLabel(c.name)}</td>
                  <td>{isReadable(c) ? <CapabilityWidget capability={c} value={device.state[c.name]} /> : '—'}</td>
                  <td>{c.type === 'binary' ? 'Binaire' : c.type === 'numeric' ? `Numérique${c.unit ? ` (${c.unit})` : ''}` : 'Liste'}</td>
                  <td>{ACCESS_LABELS[c.access]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {writable.length > 0 && (
        <section aria-labelledby="titre-commandes">
          <h2 id="titre-commandes">Commandes</h2>
          <div className="card commands">
            {writable.map((c) => (
              <CommandControl key={c.name} device={device} capability={c} />
            ))}
          </div>
        </section>
      )}

      <section aria-labelledby="titre-historique">
        <h2 id="titre-historique">Historique</h2>
        <div className="card">
          <HistoryChart device={device} />
        </div>
      </section>
    </>
  );
}
