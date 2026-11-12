import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { PageHeader } from '../components/Layout';
import { Empty, ErrorState, FormError, Loading } from '../components/States';
import { api } from '../lib/api';
import type { User } from '../lib/types';
import { useApi } from '../lib/useApi';

type ManagedRole = 'admin' | 'host';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrateur',
  host: 'Hôte (loue la borne)',
  guest: 'Invité',
  booth: 'Borne',
};

const emptyForm = { name: '', email: '', password: '', role: 'host' as ManagedRole };

export function UsersPage() {
  const { user: me } = useAuth();
  const { data: users, error, loading, reload, setData } = useApi((signal) => api<User[]>('/users', { signal }), []);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState<unknown>(null);
  const [pending, setPending] = useState(false);
  const [rowError, setRowError] = useState<{ id: string; error: unknown } | null>(null);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    setFormError(null);
    try {
      const created = await api<User>('/users', { method: 'POST', body: { ...form, name: form.name.trim(), email: form.email.trim() } });
      setData((list) => [...(list ?? []), created]);
      setForm(emptyForm);
      setShowForm(false);
    } catch (err) {
      setFormError(err);
    } finally {
      setPending(false);
    }
  };

  const changeRole = async (user: User, role: ManagedRole) => {
    setRowError(null);
    try {
      const updated = await api<User>(`/users/${user.id}`, { method: 'PATCH', body: { role } });
      setData((list) => (list ?? []).map((u) => (u.id === user.id ? updated : u)));
    } catch (err) {
      setRowError({ id: user.id, error: err });
    }
  };

  const remove = async (user: User) => {
    if (!window.confirm(`Supprimer le compte de ${user.name} ?`)) return;
    setRowError(null);
    try {
      await api(`/users/${user.id}`, { method: 'DELETE' });
      setData((list) => (list ?? []).filter((u) => u.id !== user.id));
    } catch (err) {
      setRowError({ id: user.id, error: err });
    }
  };

  return (
    <>
      <PageHeader title="Utilisateurs">
        {!showForm && (
          <button type="button" className="btn btn-primary" onClick={() => setShowForm(true)}>
            Nouvel utilisateur
          </button>
        )}
      </PageHeader>

      {showForm && (
        <form className="card" onSubmit={create}>
          <h2>Nouvel utilisateur</h2>
          <div className="form-grid">
            <label className="field">
              <span>Nom</span>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label className="field">
              <span>Adresse e-mail</span>
              <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </label>
            <label className="field">
              <span>Mot de passe</span>
              <input
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </label>
            <label className="field">
              <span>Rôle</span>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as ManagedRole })}>
                <option value="host">{ROLE_LABELS.host}</option>
                <option value="admin">{ROLE_LABELS.admin}</option>
              </select>
            </label>
          </div>
          <FormError error={formError} />
          <div className="row">
            <button type="submit" className="btn btn-primary" disabled={pending}>
              {pending ? 'Création…' : 'Créer'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>
              Annuler
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : !users || users.length === 0 ? (
        <Empty title="Aucun utilisateur" />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Nom</th>
                <th scope="col">Adresse e-mail</th>
                <th scope="col">Rôle</th>
                <th scope="col">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const self = u.id === me?.id;
                const managed = u.role === 'admin' || u.role === 'host';
                return (
                  <tr key={u.id}>
                    <td>
                      {u.name}
                      {self && <span className="muted"> (vous)</span>}
                    </td>
                    <td>{u.email}</td>
                    <td>
                      {managed && !self ? (
                        <label>
                          <span className="sr-only">Rôle de {u.name}</span>
                          <select value={u.role} onChange={(e) => void changeRole(u, e.target.value as ManagedRole)}>
                            <option value="host">{ROLE_LABELS.host}</option>
                            <option value="admin">{ROLE_LABELS.admin}</option>
                          </select>
                        </label>
                      ) : (
                        ROLE_LABELS[u.role] ?? u.role
                      )}
                      {rowError?.id === u.id && <FormError error={rowError.error} />}
                    </td>
                    <td>
                      {!self && (
                        <button type="button" className="btn btn-danger" onClick={() => void remove(u)}>
                          Supprimer
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
