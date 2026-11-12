import { useState } from 'react';
import { binaryLabel, capabilityLabel, enumLabel, isReadable, isWritable } from '../lib/capabilities.js';
import { BOOTH_EVENTS, OPERATOR_LABELS, buildRule, emptyAction, operatorsFor } from '../lib/rules.js';
import type { ActionDraft, RuleDraft } from '../lib/rules.js';
import type { Capability, Device, Rule } from '../lib/types';
import { FormError } from './States';

interface Props {
  initial: RuleDraft;
  devices: Device[];
  editing: boolean;
  onSubmit: (rule: Omit<Rule, 'id'>) => Promise<void>;
  onCancel: () => void;
}

/** Champ de valeur adapté au type de la capacité. */
function ValueInput({ capability, value, onChange, id }: { capability?: Capability; value: string; onChange: (v: string) => void; id: string }) {
  if (capability?.type === 'binary') {
    return (
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Choisir…</option>
        <option value="true">{binaryLabel(capability.name, true)}</option>
        <option value="false">{binaryLabel(capability.name, false)}</option>
      </select>
    );
  }
  if (capability?.type === 'enum' && capability.values?.length) {
    return (
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Choisir…</option>
        {capability.values.map((v) => (
          <option key={v} value={v}>
            {enumLabel(v)}
          </option>
        ))}
      </select>
    );
  }
  return (
    <input
      id={id}
      type={capability?.type === 'numeric' ? 'number' : 'text'}
      step="any"
      value={value}
      disabled={!capability}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function ErrorText({ message }: { message?: string }) {
  return message ? <span className="field-error">{message}</span> : null;
}

export function RuleForm({ initial, devices, editing, onSubmit, onCancel }: Props) {
  const [draft, setDraft] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<unknown>(null);
  const [pending, setPending] = useState(false);

  const t = draft.trigger;
  const triggerDevice = devices.find((d) => d.id === t.deviceId);
  const triggerCaps = triggerDevice?.capabilities.filter(isReadable) ?? [];
  const triggerCap = triggerCaps.find((c) => c.name === t.capability);
  const operators = operatorsFor(triggerCap?.type);

  const setTrigger = (patch: Partial<RuleDraft['trigger']>) => setDraft((d) => ({ ...d, trigger: { ...d.trigger, ...patch } }));
  const setAction = (i: number, patch: Partial<ActionDraft>) =>
    setDraft((d) => ({ ...d, actions: d.actions.map((a, j) => (j === i ? { ...a, ...patch } : a)) }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { errors: found, rule } = buildRule(draft, devices);
    setErrors(found);
    if (!rule) return;
    setPending(true);
    setSubmitError(null);
    try {
      await onSubmit(rule);
    } catch (err) {
      setSubmitError(err);
      setPending(false);
    }
  };

  return (
    <form className="card rule-form" onSubmit={submit} noValidate>
      <h2>{editing ? 'Modifier la règle' : 'Nouvelle règle'}</h2>

      <label className="field">
        <span>Nom</span>
        <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Porte ouverte le soir" />
        <ErrorText message={errors.name} />
      </label>

      <fieldset>
        <legend>Si…</legend>
        <div className="form-grid">
          <label className="field">
            <span>Appareil</span>
            <select value={t.deviceId} onChange={(e) => setTrigger({ deviceId: e.target.value, capability: '', value: '' })}>
              <option value="">Choisir…</option>
              {devices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <ErrorText message={errors['trigger.deviceId']} />
          </label>
          <label className="field">
            <span>Capacité</span>
            <select
              value={t.capability}
              disabled={!triggerDevice}
              onChange={(e) => setTrigger({ capability: e.target.value, operator: 'eq', value: '' })}
            >
              <option value="">Choisir…</option>
              {triggerCaps.map((c) => (
                <option key={c.name} value={c.name}>
                  {capabilityLabel(c.name)}
                </option>
              ))}
            </select>
            <ErrorText message={errors['trigger.capability']} />
          </label>
          <label className="field">
            <span>Condition</span>
            <select value={t.operator} onChange={(e) => setTrigger({ operator: e.target.value })}>
              {operators.map((op) => (
                <option key={op} value={op}>
                  {OPERATOR_LABELS[op]}
                </option>
              ))}
            </select>
            <ErrorText message={errors['trigger.operator']} />
          </label>
          <div className="field">
            <label htmlFor="trigger-value">Valeur{triggerCap?.unit ? ` (${triggerCap.unit})` : ''}</label>
            <ValueInput id="trigger-value" capability={triggerCap} value={t.value} onChange={(value) => setTrigger({ value })} />
            <ErrorText message={errors['trigger.value']} />
          </div>
          <label className="field">
            <span>Pendant (secondes, optionnel)</span>
            <input type="number" min={0} step={1} value={t.forSeconds} onChange={(e) => setTrigger({ forSeconds: e.target.value })} />
            <ErrorText message={errors['trigger.forSeconds']} />
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend>Fenêtre horaire (optionnelle)</legend>
        <div className="form-grid">
          <label className="field">
            <span>Après</span>
            <input
              type="time"
              value={draft.schedule.after}
              onChange={(e) => setDraft({ ...draft, schedule: { ...draft.schedule, after: e.target.value } })}
            />
            <ErrorText message={errors['schedule.after']} />
          </label>
          <label className="field">
            <span>Avant</span>
            <input
              type="time"
              value={draft.schedule.before}
              onChange={(e) => setDraft({ ...draft, schedule: { ...draft.schedule, before: e.target.value } })}
            />
            <ErrorText message={errors['schedule.before']} />
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend>Alors…</legend>
        <ErrorText message={errors.actions} />
        {draft.actions.map((a, i) => {
          const target = devices.find((d) => d.id === a.deviceId);
          const targetCaps = target?.capabilities.filter(isWritable) ?? [];
          const targetCap = targetCaps.find((c) => c.name === a.capability);
          return (
            <div key={i} className="action">
              <div className="form-grid">
                <label className="field">
                  <span>Action {i + 1}</span>
                  <select value={a.type} onChange={(e) => setAction(i, emptyAction(e.target.value))}>
                    <option value="notify">Envoyer une notification</option>
                    <option value="command">Commander un appareil</option>
                    <option value="booth">Piloter la borne</option>
                  </select>
                </label>

                {a.type === 'notify' && (
                  <label className="field field-wide">
                    <span>Message</span>
                    <input value={a.message} onChange={(e) => setAction(i, { message: e.target.value })} />
                  </label>
                )}

                {a.type === 'command' && (
                  <>
                    <label className="field">
                      <span>Appareil</span>
                      <select value={a.deviceId} onChange={(e) => setAction(i, { deviceId: e.target.value, capability: '', value: '' })}>
                        <option value="">Choisir…</option>
                        {devices
                          .filter((d) => d.capabilities.some(isWritable))
                          .map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name}
                            </option>
                          ))}
                      </select>
                    </label>
                    <label className="field">
                      <span>Capacité</span>
                      <select value={a.capability} disabled={!target} onChange={(e) => setAction(i, { capability: e.target.value, value: '' })}>
                        <option value="">Choisir…</option>
                        {targetCaps.map((c) => (
                          <option key={c.name} value={c.name}>
                            {capabilityLabel(c.name)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="field">
                      <label htmlFor={`action-${i}-value`}>Valeur</label>
                      <ValueInput id={`action-${i}-value`} capability={targetCap} value={a.value} onChange={(value) => setAction(i, { value })} />
                    </div>
                  </>
                )}

                {a.type === 'booth' && (
                  <label className="field">
                    <span>Borne</span>
                    <select value={a.event} onChange={(e) => setAction(i, { event: e.target.value })}>
                      {Object.entries(BOOTH_EVENTS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
              <ErrorText message={errors[`actions.${i}`]} />
              {draft.actions.length > 1 && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setDraft({ ...draft, actions: draft.actions.filter((_, j) => j !== i) })}
                >
                  Retirer l'action {i + 1}
                </button>
              )}
            </div>
          );
        })}
        <button type="button" className="btn btn-secondary" onClick={() => setDraft({ ...draft, actions: [...draft.actions, emptyAction()] })}>
          Ajouter une action
        </button>
      </fieldset>

      <label className="switch">
        <input type="checkbox" checked={draft.enabled} onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })} />
        <span>Règle active</span>
      </label>

      <FormError error={submitError} />
      <div className="row">
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? 'Enregistrement…' : editing ? 'Enregistrer' : 'Créer la règle'}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Annuler
        </button>
      </div>
    </form>
  );
}
