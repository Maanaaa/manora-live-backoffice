import { useState } from 'react';
import { PageHeader } from '../components/Layout';
import { RuleForm } from '../components/RuleForm';
import { Empty, ErrorState, FormError, Loading } from '../components/States';
import { api } from '../lib/api';
import { describeAction, describeSchedule, describeTrigger, emptyDraft, ruleToDraft } from '../lib/rules.js';
import type { Rule } from '../lib/types';
import { useApi } from '../lib/useApi';
import { useLive } from '../live/LiveContext';

type Editor = { mode: 'create' } | { mode: 'edit'; rule: Rule } | null;

export function RulesPage() {
  const { devices } = useLive();
  const { data: rules, error, loading, reload, setData } = useApi((signal) => api<Rule[]>('/rules', { signal }), []);
  const [editor, setEditor] = useState<Editor>(null);
  const [rowError, setRowError] = useState<{ id: string; error: unknown } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const replace = (rule: Rule) => setData((list) => (list ?? []).map((r) => (r.id === rule.id ? rule : r)));

  const save = async (body: Omit<Rule, 'id'>) => {
    if (editor?.mode === 'edit') {
      replace(await api<Rule>(`/rules/${editor.rule.id}`, { method: 'PATCH', body }));
    } else {
      const created = await api<Rule>('/rules', { method: 'POST', body });
      setData((list) => [...(list ?? []), created]);
    }
    setEditor(null);
  };

  const toggle = async (rule: Rule) => {
    setBusy(rule.id);
    setRowError(null);
    try {
      replace(await api<Rule>(`/rules/${rule.id}`, { method: 'PATCH', body: { enabled: !rule.enabled } }));
    } catch (err) {
      setRowError({ id: rule.id, error: err });
    } finally {
      setBusy(null);
    }
  };

  const remove = async (rule: Rule) => {
    if (!window.confirm(`Supprimer la règle « ${rule.name} » ?`)) return;
    setBusy(rule.id);
    setRowError(null);
    try {
      await api(`/rules/${rule.id}`, { method: 'DELETE' });
      setData((list) => (list ?? []).filter((r) => r.id !== rule.id));
    } catch (err) {
      setRowError({ id: rule.id, error: err });
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <PageHeader title="Règles">
        {!editor && (
          <button type="button" className="btn btn-primary" onClick={() => setEditor({ mode: 'create' })}>
            Nouvelle règle
          </button>
        )}
      </PageHeader>

      {editor && (
        <RuleForm
          key={editor.mode === 'edit' ? editor.rule.id : 'new'}
          initial={editor.mode === 'edit' ? ruleToDraft(editor.rule) : emptyDraft()}
          editing={editor.mode === 'edit'}
          devices={devices}
          onSubmit={save}
          onCancel={() => setEditor(null)}
        />
      )}

      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : !rules || rules.length === 0 ? (
        <Empty title="Aucune règle">Exemple : si la porte reste ouverte 5 minutes après 22:00, alors notifier l'hôte.</Empty>
      ) : (
        <ul className="rules">
          {rules.map((rule) => (
            <li key={rule.id} className={`card rule${rule.enabled ? '' : ' rule-disabled'}`}>
              <div className="rule-head">
                <h2>{rule.name}</h2>
                <label className="switch">
                  <input type="checkbox" checked={rule.enabled} disabled={busy === rule.id} onChange={() => void toggle(rule)} />
                  <span>{rule.enabled ? 'Active' : 'Inactive'}</span>
                </label>
              </div>
              <p>
                <strong>Si</strong> {describeTrigger(rule.trigger, devices)}
              </p>
              <p className="muted">{describeSchedule(rule.schedule)}</p>
              <p>
                <strong>Alors</strong>
              </p>
              <ul className="rule-actions">
                {rule.actions.map((a, i) => (
                  <li key={i}>{describeAction(a, devices)}</li>
                ))}
              </ul>
              {rowError?.id === rule.id && <FormError error={rowError.error} />}
              <div className="row">
                <button type="button" className="btn btn-secondary" onClick={() => setEditor({ mode: 'edit', rule })}>
                  Modifier
                </button>
                <button type="button" className="btn btn-danger" disabled={busy === rule.id} onClick={() => void remove(rule)}>
                  Supprimer
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
