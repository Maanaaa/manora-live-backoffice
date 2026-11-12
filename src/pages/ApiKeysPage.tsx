import { useState } from 'react';
import { PageHeader } from '../components/Layout';
import { Empty, ErrorState, FormError, Loading } from '../components/States';
import { api } from '../lib/api';
import { formatDateTime } from '../lib/time.js';
import type { ApiKey } from '../lib/types';
import { useApi } from '../lib/useApi';

export function ApiKeysPage() {
  const { data: keys, error, loading, reload, setData } = useApi((signal) => api<ApiKey[]>('/api-keys', { signal }), []);
  const [name, setName] = useState('');
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<unknown>(null);
  const [created, setCreated] = useState<{ name: string; key: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [rowError, setRowError] = useState<{ id: string; error: unknown } | null>(null);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    setFormError(null);
    setCopied(false);
    try {
      const res = await api<{ id: string; name: string; key: string }>('/api-keys', { method: 'POST', body: { name: name.trim() } });
      setCreated({ name: res.name, key: res.key });
      setData((list) => [...(list ?? []), { id: res.id, name: res.name, createdAt: new Date().toISOString(), lastUsedAt: null }]);
      setName('');
    } catch (err) {
      setFormError(err);
    } finally {
      setPending(false);
    }
  };

  const copy = async () => {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.key);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const revoke = async (key: ApiKey) => {
    if (!window.confirm(`Révoquer la clé « ${key.name} » ? La borne qui l'utilise sera déconnectée.`)) return;
    setRowError(null);
    try {
      await api(`/api-keys/${key.id}`, { method: 'DELETE' });
      setData((list) => (list ?? []).filter((k) => k.id !== key.id));
    } catch (err) {
      setRowError({ id: key.id, error: err });
    }
  };

  return (
    <>
      <PageHeader title="Clés des bornes" />

      <form className="card" onSubmit={create}>
        <h2>Nouvelle clé</h2>
        <p className="muted">Une clé par tablette de borne. Elle se saisit dans les réglages de l'app en mode borne.</p>
        <div className="row row-end">
          <label className="field">
            <span>Nom de la borne</span>
            <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Borne salle des fêtes" />
          </label>
          <button type="submit" className="btn btn-primary" disabled={pending}>
            {pending ? 'Création…' : 'Créer la clé'}
          </button>
        </div>
        <FormError error={formError} />
      </form>

      {created && (
        <div className="card callout" role="status">
          <h2>Clé « {created.name} » créée</h2>
          <p>Copiez-la maintenant : elle ne sera plus jamais affichée.</p>
          <div className="row">
            <code className="secret">{created.key}</code>
            <button type="button" className="btn btn-primary" onClick={() => void copy()}>
              {copied ? 'Copiée' : 'Copier'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setCreated(null)}>
              J'ai noté la clé
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : !keys || keys.length === 0 ? (
        <Empty title="Aucune clé">Créez une clé pour connecter une borne à l'API.</Empty>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Nom</th>
                <th scope="col">Créée le</th>
                <th scope="col">Dernière utilisation</th>
                <th scope="col">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k.id}>
                  <td>{k.name}</td>
                  <td>{formatDateTime(k.createdAt)}</td>
                  <td>{k.lastUsedAt ? formatDateTime(k.lastUsedAt) : 'Jamais'}</td>
                  <td>
                    <button type="button" className="btn btn-danger" onClick={() => void revoke(k)}>
                      Révoquer
                    </button>
                    {rowError?.id === k.id && <FormError error={rowError.error} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
