// @ts-check
// Règles « si … alors … » : passage du formulaire (texte) au format du contrat, avec validation.

import { binaryLabel, capabilityLabel, formatCapabilityValue } from './capabilities.js';

/** @typedef {import('./types').Capability} Capability */
/** @typedef {import('./types').Device} Device */
/** @typedef {import('./types').Rule} Rule */
/** @typedef {import('./types').RuleAction} RuleAction */
/** @typedef {import('./types').Operator} Operator */

/**
 * @typedef {{ type: 'notify' | 'command' | 'booth', message: string, deviceId: string, capability: string, value: string, event: string }} ActionDraft
 * @typedef {{
 *   name: string, enabled: boolean,
 *   trigger: { deviceId: string, capability: string, operator: string, value: string, forSeconds: string },
 *   schedule: { after: string, before: string },
 *   actions: ActionDraft[],
 * }} RuleDraft
 */

/** @type {Record<Operator, string>} */
export const OPERATOR_LABELS = { eq: 'est égal à', neq: 'est différent de', gt: 'est supérieur à', lt: 'est inférieur à' };

/** @type {Record<string, string>} */
export const BOOTH_EVENTS = {
  countdown: 'Lancer le compte à rebours',
  sleep: 'Mettre la borne en veille',
  wake: 'Réveiller la borne',
};

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Opérateurs possibles selon le type de capacité.
 * @param {Capability['type'] | undefined} type
 * @returns {Operator[]}
 */
export function operatorsFor(type) {
  return type === 'numeric' ? ['eq', 'neq', 'gt', 'lt'] : ['eq', 'neq'];
}

/** @param {string} [type] @returns {ActionDraft} */
export function emptyAction(type = 'notify') {
  return { type: /** @type {ActionDraft['type']} */ (type), message: '', deviceId: '', capability: '', value: '', event: 'countdown' };
}

/** @returns {RuleDraft} */
export function emptyDraft() {
  return {
    name: '',
    enabled: true,
    trigger: { deviceId: '', capability: '', operator: 'eq', value: '', forSeconds: '' },
    schedule: { after: '', before: '' },
    actions: [emptyAction()],
  };
}

/**
 * Convertit une saisie texte en valeur typée selon la capacité.
 * @param {Capability | undefined} capability
 * @param {string} raw
 * @returns {{ ok: true, value: boolean | number | string } | { ok: false }}
 */
export function parseValue(capability, raw) {
  const text = raw.trim();
  if (!capability || text === '') return { ok: false };
  if (capability.type === 'binary') {
    if (text === 'true') return { ok: true, value: true };
    if (text === 'false') return { ok: true, value: false };
    return { ok: false };
  }
  if (capability.type === 'numeric') {
    const n = Number(text.replace(',', '.'));
    return Number.isFinite(n) ? { ok: true, value: n } : { ok: false };
  }
  if (capability.values && !capability.values.includes(text)) return { ok: false };
  return { ok: true, value: text };
}

/**
 * @param {Device[]} devices
 * @param {string} deviceId
 * @param {string} name
 */
function findCapability(devices, deviceId, name) {
  return devices.find((d) => d.id === deviceId)?.capabilities.find((c) => c.name === name);
}

/**
 * Valide le brouillon et construit la règle au format du contrat.
 * @param {RuleDraft} draft
 * @param {Device[]} devices
 * @returns {{ errors: Record<string, string>, rule: Omit<Rule, 'id'> | null }}
 */
export function buildRule(draft, devices) {
  /** @type {Record<string, string>} */
  const errors = {};
  const name = draft.name.trim();
  if (!name) errors.name = 'Donnez un nom à la règle.';

  const t = draft.trigger;
  const device = devices.find((d) => d.id === t.deviceId);
  const capability = device?.capabilities.find((c) => c.name === t.capability);
  if (!device) errors['trigger.deviceId'] = 'Choisissez un appareil.';
  else if (!capability) errors['trigger.capability'] = 'Choisissez une capacité.';

  const operator = /** @type {Operator} */ (t.operator);
  if (!operatorsFor(capability?.type).includes(operator)) errors['trigger.operator'] = 'Opérateur non valable pour cette capacité.';

  const parsed = parseValue(capability, t.value);
  if (capability && !parsed.ok) errors['trigger.value'] = 'Valeur invalide.';

  /** @type {number | undefined} */
  let forSeconds;
  if (t.forSeconds.trim() !== '') {
    const n = Number(t.forSeconds);
    if (!Number.isInteger(n) || n < 0) errors['trigger.forSeconds'] = 'Durée en secondes, nombre entier positif.';
    else if (n > 0) forSeconds = n;
  }

  /** @type {{ after?: string, before?: string }} */
  const schedule = {};
  for (const key of /** @type {const} */ (['after', 'before'])) {
    const v = draft.schedule[key].trim();
    if (!v) continue;
    if (TIME.test(v)) schedule[key] = v;
    else errors[`schedule.${key}`] = 'Heure au format HH:MM.';
  }

  if (draft.actions.length === 0) errors.actions = 'Ajoutez au moins une action.';
  /** @type {RuleAction[]} */
  const actions = [];
  draft.actions.forEach((a, i) => {
    if (a.type === 'notify') {
      if (!a.message.trim()) errors[`actions.${i}`] = 'Message de notification vide.';
      else actions.push({ type: 'notify', message: a.message.trim() });
    } else if (a.type === 'command') {
      const cap = findCapability(devices, a.deviceId, a.capability);
      const v = parseValue(cap, a.value);
      if (!a.deviceId) errors[`actions.${i}`] = 'Choisissez un appareil à commander.';
      else if (!cap || cap.access === 'read') errors[`actions.${i}`] = 'Choisissez une capacité commandable.';
      else if (!v.ok) errors[`actions.${i}`] = 'Valeur de commande invalide.';
      else actions.push({ type: 'command', deviceId: a.deviceId, capability: a.capability, value: v.value });
    } else if (a.type === 'booth') {
      if (!(a.event in BOOTH_EVENTS)) errors[`actions.${i}`] = 'Choisissez une action de borne.';
      else actions.push({ type: 'booth', event: /** @type {'countdown' | 'sleep' | 'wake'} */ (a.event) });
    }
  });

  if (Object.keys(errors).length > 0 || !parsed.ok) return { errors, rule: null };
  /** @type {Omit<Rule, 'id'>} */
  const rule = {
    name,
    enabled: draft.enabled,
    trigger: { deviceId: t.deviceId, capability: t.capability, operator, value: parsed.value },
    actions,
  };
  if (forSeconds !== undefined) rule.trigger.forSeconds = forSeconds;
  if (schedule.after || schedule.before) rule.schedule = schedule;
  return { errors, rule };
}

/** @param {Rule} rule @returns {RuleDraft} */
export function ruleToDraft(rule) {
  return {
    name: rule.name,
    enabled: rule.enabled,
    trigger: {
      deviceId: rule.trigger.deviceId,
      capability: rule.trigger.capability,
      operator: rule.trigger.operator,
      value: String(rule.trigger.value),
      forSeconds: rule.trigger.forSeconds ? String(rule.trigger.forSeconds) : '',
    },
    schedule: { after: rule.schedule?.after ?? '', before: rule.schedule?.before ?? '' },
    actions: rule.actions.map((a) => {
      const base = emptyAction(a.type);
      if (a.type === 'notify') return { ...base, message: a.message };
      if (a.type === 'command') return { ...base, deviceId: a.deviceId, capability: a.capability, value: String(a.value) };
      return { ...base, event: a.event };
    }),
  };
}

/**
 * Condition lisible : « Porte ouverte depuis 30 s », « Température est supérieur à 25 °C ».
 * @param {Rule['trigger']} trigger
 * @param {Device[]} devices
 */
export function describeTrigger(trigger, devices) {
  const device = devices.find((d) => d.id === trigger.deviceId);
  const cap = findCapability(devices, trigger.deviceId, trigger.capability);
  const where = device ? ` (${device.name})` : '';
  let text;
  if (cap?.type === 'binary' && typeof trigger.value === 'boolean') {
    const on = trigger.operator === 'eq' ? trigger.value : !trigger.value;
    text = binaryLabel(trigger.capability, on);
  } else {
    const value = cap ? formatCapabilityValue(cap, trigger.value) : String(trigger.value);
    text = `${capabilityLabel(trigger.capability)} ${OPERATOR_LABELS[trigger.operator]} ${value}`;
  }
  const duration = trigger.forSeconds ? ` pendant ${trigger.forSeconds} s` : '';
  return `${text}${where}${duration}`;
}

/**
 * @param {RuleAction} action
 * @param {Device[]} devices
 */
export function describeAction(action, devices) {
  if (action.type === 'notify') return `Notifier : « ${action.message} »`;
  if (action.type === 'booth') return BOOTH_EVENTS[action.event] ?? action.event;
  const device = devices.find((d) => d.id === action.deviceId);
  const cap = findCapability(devices, action.deviceId, action.capability);
  const value = cap ? formatCapabilityValue(cap, action.value) : String(action.value);
  return `Commander ${device?.name ?? 'un appareil'} : ${value}`;
}

/** @param {Rule['schedule']} schedule */
export function describeSchedule(schedule) {
  if (!schedule || (!schedule.after && !schedule.before)) return 'À toute heure';
  if (schedule.after && schedule.before) return `Entre ${schedule.after} et ${schedule.before}`;
  return schedule.after ? `Après ${schedule.after}` : `Avant ${schedule.before}`;
}
