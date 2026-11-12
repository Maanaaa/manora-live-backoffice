// @ts-check
// Affichage des capacités : le widget dépend de `type` et `unit`, jamais du modèle de l'appareil.
// Le vocabulaire métier dépend du nom de la capacité, avec un repli générique pour les inconnues.

/** @typedef {import('./types').Capability} Capability */
/** @typedef {import('./types').CapabilityValue} CapabilityValue */

/** @type {Record<string, { label: string, on?: string, off?: string }>} */
const KNOWN = {
  occupancy: { label: 'Présence', on: 'Présence détectée', off: 'Aucune présence' },
  presence: { label: 'Présence', on: 'Présence détectée', off: 'Aucune présence' },
  // Zigbee : contact = true quand l'aimant touche, donc porte fermée.
  contact: { label: 'Porte', on: 'Porte fermée', off: 'Porte ouverte' },
  state: { label: 'Alimentation', on: 'Allumée', off: 'Éteinte' },
  water_leak: { label: "Fuite d'eau", on: 'Fuite détectée', off: 'Pas de fuite' },
  tamper: { label: 'Sabotage', on: 'Boîtier ouvert', off: 'Boîtier fermé' },
  temperature: { label: 'Température' },
  humidity: { label: 'Humidité' },
  battery: { label: 'Batterie' },
  power: { label: 'Puissance' },
  energy: { label: 'Consommation' },
  voltage: { label: 'Tension' },
  illuminance: { label: 'Luminosité' },
  action: { label: 'Action' },
  linkquality: { label: 'Qualité du signal' },
};

/** @type {Record<string, string>} */
const ENUM_VALUES = {
  single: 'Appui simple',
  double: 'Double appui',
  triple: 'Triple appui',
  long: 'Appui long',
  hold: 'Appui maintenu',
  release: 'Relâché',
  on: 'Marche',
  off: 'Arrêt',
};

/** @param {string} name */
function humanize(name) {
  const text = name.replace(/[_-]+/g, ' ').trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Libellé lisible d'une capacité. @param {string} name */
export function capabilityLabel(name) {
  return KNOWN[name]?.label ?? humanize(name);
}

/**
 * Interprète une valeur binaire (booléen, ON/OFF, 1/0, "true").
 * @param {CapabilityValue | undefined} value
 * @returns {boolean | null}
 */
export function toBoolean(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  const v = String(value).trim().toLowerCase();
  if (['on', 'true', '1', 'yes'].includes(v)) return true;
  if (['off', 'false', '0', 'no'].includes(v)) return false;
  return null;
}

/**
 * Libellé métier d'un état binaire.
 * @param {string} name
 * @param {boolean} on
 */
export function binaryLabel(name, on) {
  const known = KNOWN[name];
  if (known?.on && known?.off) return on ? known.on : known.off;
  return `${capabilityLabel(name)} : ${on ? 'oui' : 'non'}`;
}

/** @param {string} value */
export function enumLabel(value) {
  return ENUM_VALUES[value.toLowerCase()] ?? humanize(value);
}

/** @param {number} value */
export function formatNumber(value) {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(value);
}

/**
 * Valeur lisible d'une capacité, avec son unité.
 * @param {Capability} capability
 * @param {CapabilityValue | undefined} value
 * @returns {string}
 */
export function formatCapabilityValue(capability, value) {
  if (value === null || value === undefined || value === '') return '—';
  if (capability.type === 'binary') {
    const on = toBoolean(value);
    return on === null ? String(value) : binaryLabel(capability.name, on);
  }
  if (capability.type === 'numeric') {
    const n = typeof value === 'number' ? value : Number(value);
    if (Number.isNaN(n)) return String(value);
    return capability.unit ? `${formatNumber(n)} ${capability.unit}` : formatNumber(n);
  }
  return enumLabel(String(value));
}

/**
 * Widget à utiliser, choisi uniquement selon le type et l'unité.
 * @param {Capability} capability
 * @returns {'binary' | 'gauge' | 'number' | 'enum'}
 */
export function widgetFor(capability) {
  if (capability.type === 'binary') return 'binary';
  if (capability.type === 'enum') return 'enum';
  return capability.unit === '%' ? 'gauge' : 'number';
}

/** @param {Capability} capability */
export function isReadable(capability) {
  return capability.access === 'read' || capability.access === 'readwrite';
}

/** @param {Capability} capability */
export function isWritable(capability) {
  return capability.access === 'write' || capability.access === 'readwrite';
}

/**
 * Niveau de batterie : libellé et gravité.
 * @param {number | null | undefined} battery
 * @returns {{ label: string, level: 'unknown' | 'low' | 'medium' | 'ok' }}
 */
export function batteryStatus(battery) {
  if (battery === null || battery === undefined) return { label: 'Secteur ou inconnue', level: 'unknown' };
  const pct = Math.max(0, Math.min(100, Math.round(battery)));
  const level = pct <= 15 ? 'low' : pct <= 40 ? 'medium' : 'ok';
  return { label: `${pct} %`, level };
}
