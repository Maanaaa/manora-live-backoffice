// Formes du contrat d'API (docs/adr/0002-contrat-api.md).

export type Role = 'admin' | 'host' | 'guest' | 'booth';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface Terminal {
  id: string;
  name: string;
  online: boolean;
  lastSeenAt: string;
  permitJoinUntil: string | null;
}

export type CapabilityValue = boolean | number | string | null;

export interface Capability {
  name: string;
  type: 'binary' | 'numeric' | 'enum';
  unit?: string;
  values?: string[];
  access: 'read' | 'write' | 'readwrite';
}

export interface Device {
  id: string;
  terminalId: string;
  ieee: string;
  model: string;
  name: string;
  location: string | null;
  enabled: boolean;
  online: boolean;
  battery: number | null;
  lastSeenAt: string;
  capabilities: Capability[];
  state: Record<string, CapabilityValue>;
}

export interface Reading {
  ts: string;
  value: number | boolean | string | null;
}

export type Operator = 'eq' | 'neq' | 'gt' | 'lt';

export type RuleAction =
  | { type: 'notify'; message: string }
  | { type: 'command'; deviceId: string; capability: string; value: boolean | number | string }
  | { type: 'booth'; event: 'countdown' | 'sleep' | 'wake' };

export interface Rule {
  id: string;
  name: string;
  enabled: boolean;
  trigger: {
    deviceId: string;
    capability: string;
    operator: Operator;
    value: boolean | number | string;
    forSeconds?: number;
  };
  schedule?: { after?: string; before?: string };
  actions: RuleAction[];
}

export type EventType = 'reading' | 'joined' | 'online' | 'offline' | 'command' | 'rule';

export interface LiveEvent {
  id: string;
  ts: string;
  type: EventType;
  deviceId: string | null;
  deviceName: string | null;
  message: string;
}

export interface ApiKey {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
}

export type WsMessage =
  | { type: 'device.reading'; data: { deviceId: string; state: Device['state']; ts: string } }
  | { type: 'device.joined'; data: Device }
  | { type: 'device.status'; data: { deviceId: string; online: boolean; battery: number | null } }
  | { type: 'terminal.status'; data: { terminalId: string; online: boolean; permitJoinUntil: string | null } }
  | { type: 'event.created'; data: LiveEvent };
