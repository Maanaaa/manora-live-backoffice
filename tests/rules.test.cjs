// Validation des règles : du formulaire au format du contrat d'API.
const { test } = require('node:test');
const assert = require('node:assert/strict');

const load = () => import('../src/lib/rules.js');

const devices = [
  {
    id: 'porte',
    name: 'Porte entrée',
    capabilities: [{ name: 'contact', type: 'binary', access: 'read' }],
  },
  {
    id: 'thermo',
    name: 'Salle',
    capabilities: [{ name: 'temperature', type: 'numeric', unit: '°C', access: 'read' }],
  },
  {
    id: 'prise',
    name: 'Prise lumière',
    capabilities: [{ name: 'state', type: 'binary', access: 'readwrite' }],
  },
];

function draft(overrides = {}) {
  return {
    name: 'Porte ouverte le soir',
    enabled: true,
    trigger: { deviceId: 'porte', capability: 'contact', operator: 'eq', value: 'false', forSeconds: '300' },
    schedule: { after: '22:00', before: '' },
    actions: [
      { type: 'notify', message: 'La porte est ouverte', deviceId: '', capability: '', value: '', event: 'countdown' },
      { type: 'command', message: '', deviceId: 'prise', capability: 'state', value: 'true', event: 'countdown' },
      { type: 'booth', message: '', deviceId: '', capability: '', value: '', event: 'wake' },
    ],
    ...overrides,
  };
}

test('un brouillon complet produit une règle conforme au contrat', async () => {
  const { buildRule } = await load();
  const { errors, rule } = buildRule(draft(), devices);
  assert.deepEqual(errors, {});
  assert.deepEqual(rule, {
    name: 'Porte ouverte le soir',
    enabled: true,
    trigger: { deviceId: 'porte', capability: 'contact', operator: 'eq', value: false, forSeconds: 300 },
    schedule: { after: '22:00' },
    actions: [
      { type: 'notify', message: 'La porte est ouverte' },
      { type: 'command', deviceId: 'prise', capability: 'state', value: true },
      { type: 'booth', event: 'wake' },
    ],
  });
});

test('les champs optionnels vides sont omis', async () => {
  const { buildRule } = await load();
  const { rule } = buildRule(draft({ schedule: { after: '', before: '' } }), devices);
  assert.equal('schedule' in rule, false);
  const d = draft();
  d.trigger.forSeconds = '';
  assert.equal('forSeconds' in buildRule(d, devices).rule.trigger, false);
});

test('les erreurs de saisie sont signalées champ par champ', async () => {
  const { buildRule } = await load();
  const { errors, rule } = buildRule(
    draft({ name: ' ', schedule: { after: '25:00', before: '' }, actions: [] }),
    devices,
  );
  assert.equal(rule, null);
  assert.ok(errors.name);
  assert.ok(errors['schedule.after']);
  assert.ok(errors.actions);
});

test('un opérateur de comparaison est refusé sur une capacité binaire', async () => {
  const { buildRule, operatorsFor } = await load();
  assert.deepEqual(operatorsFor('binary'), ['eq', 'neq']);
  const d = draft();
  d.trigger.operator = 'gt';
  assert.ok(buildRule(d, devices).errors['trigger.operator']);
});

test('une valeur numérique accepte la virgule décimale', async () => {
  const { buildRule } = await load();
  const d = draft();
  d.trigger = { deviceId: 'thermo', capability: 'temperature', operator: 'gt', value: '25,5', forSeconds: '' };
  assert.equal(buildRule(d, devices).rule.trigger.value, 25.5);
});

test('on ne peut pas commander une capacité en lecture seule', async () => {
  const { buildRule } = await load();
  const d = draft();
  d.actions = [{ type: 'command', message: '', deviceId: 'porte', capability: 'contact', value: 'true', event: '' }];
  assert.ok(buildRule(d, devices).errors['actions.0']);
});

test('une règle relue puis réenregistrée ne change pas', async () => {
  const { buildRule, ruleToDraft } = await load();
  const { rule } = buildRule(draft(), devices);
  assert.deepEqual(buildRule(ruleToDraft({ id: 'r1', ...rule }), devices).rule, rule);
});

test('la condition est décrite en français', async () => {
  const { describeTrigger, describeSchedule } = await load();
  const text = describeTrigger({ deviceId: 'porte', capability: 'contact', operator: 'eq', value: false, forSeconds: 300 }, devices);
  assert.equal(text, 'Porte ouverte (Porte entrée) pendant 300 s');
  assert.equal(describeSchedule({ after: '22:00', before: '06:00' }), 'Entre 22:00 et 06:00');
});
