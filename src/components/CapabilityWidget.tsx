import { capabilityLabel, formatCapabilityValue, toBoolean, widgetFor } from '../lib/capabilities.js';
import type { Capability, CapabilityValue } from '../lib/types';

/** Affiche la dernière valeur d'une capacité, avec un widget choisi selon son type et son unité. */
export function CapabilityWidget({ capability, value }: { capability: Capability; value: CapabilityValue | undefined }) {
  const widget = widgetFor(capability);
  const text = formatCapabilityValue(capability, value);
  const label = capabilityLabel(capability.name);

  if (widget === 'binary') {
    const on = toBoolean(value);
    return (
      <div className="widget">
        <span className="widget-label">{label}</span>
        <span className={`pill ${on === null ? 'pill-unknown' : on ? 'pill-on' : 'pill-off'}`}>{text}</span>
      </div>
    );
  }

  if (widget === 'gauge') {
    const pct = typeof value === 'number' ? Math.max(0, Math.min(100, value)) : null;
    return (
      <div className="widget">
        <span className="widget-label">{label}</span>
        <span className="widget-value">{text}</span>
        {pct !== null && (
          <span className="gauge" aria-hidden="true">
            <span style={{ width: `${pct}%` }} />
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="widget">
      <span className="widget-label">{label}</span>
      <span className={widget === 'number' ? 'widget-value' : 'tag'}>{text}</span>
    </div>
  );
}
