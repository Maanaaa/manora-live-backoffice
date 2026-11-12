// Affichage des capacités : widget selon type + unité, vocabulaire métier en français.
const { test } = require('node:test');
const assert = require('node:assert/strict');

const load = () => import('../src/lib/capabilities.js');

test('un contact binaire se lit en vocabulaire métier', async () => {
  const { formatCapabilityValue } = await load();
  const contact = { name: 'contact', type: 'binary', access: 'read' };
  assert.equal(formatCapabilityValue(contact, false), 'Porte ouverte');
  assert.equal(formatCapabilityValue(contact, true), 'Porte fermée');
  const occupancy = { name: 'occupancy', type: 'binary', access: 'read' };
  assert.equal(formatCapabilityValue(occupancy, true), 'Présence détectée');
});

test('les états ON/OFF de type prise sont reconnus', async () => {
  const { formatCapabilityValue, toBoolean } = await load();
  const state = { name: 'state', type: 'binary', access: 'readwrite' };
  assert.equal(formatCapabilityValue(state, 'ON'), 'Allumée');
  assert.equal(formatCapabilityValue(state, 'OFF'), 'Éteinte');
  assert.equal(toBoolean('n importe quoi'), null);
});

test('une capacité binaire inconnue a un repli lisible', async () => {
  const { formatCapabilityValue } = await load();
  assert.equal(formatCapabilityValue({ name: 'vibration_alarm', type: 'binary', access: 'read' }, true), 'Vibration alarm : oui');
});

test('une valeur numérique est affichée avec son unité, en français', async () => {
  const { formatCapabilityValue } = await load();
  const temp = { name: 'temperature', type: 'numeric', unit: '°C', access: 'read' };
  assert.equal(formatCapabilityValue(temp, 21.46).replace(/\s/g, ' '), '21,5 °C');
  assert.equal(formatCapabilityValue(temp, null), '—');
});

test('les valeurs enum sont traduites', async () => {
  const { formatCapabilityValue } = await load();
  assert.equal(formatCapabilityValue({ name: 'action', type: 'enum', values: ['single'], access: 'read' }, 'single'), 'Appui simple');
});

test('le widget dépend du type et de l’unité, pas du modèle', async () => {
  const { widgetFor } = await load();
  assert.equal(widgetFor({ name: 'x', type: 'binary', access: 'read' }), 'binary');
  assert.equal(widgetFor({ name: 'humidity', type: 'numeric', unit: '%', access: 'read' }), 'gauge');
  assert.equal(widgetFor({ name: 'temperature', type: 'numeric', unit: '°C', access: 'read' }), 'number');
  assert.equal(widgetFor({ name: 'action', type: 'enum', access: 'read' }), 'enum');
});

test('la batterie est classée par niveau', async () => {
  const { batteryStatus } = await load();
  assert.equal(batteryStatus(null).level, 'unknown');
  assert.deepEqual(batteryStatus(10), { label: '10 %', level: 'low' });
  assert.equal(batteryStatus(30).level, 'medium');
  assert.equal(batteryStatus(90).level, 'ok');
});
