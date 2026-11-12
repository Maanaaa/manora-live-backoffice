import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { api, wsUrl } from '../lib/api';
import type { Device, LiveEvent, Terminal, WsMessage } from '../lib/types';

// État temps réel partagé par le tableau de bord, le parc et les fiches appareil :
// un instantané REST, puis les messages du WebSocket /ws appliqués au fil de l'eau.

export type Connection = 'connecting' | 'open' | 'closed';

const MAX_EVENTS = 50;

interface State {
  terminals: Terminal[];
  devices: Device[];
  events: LiveEvent[];
  loading: boolean;
  error: unknown;
  /** Appareils appairés pendant la session, pour les signaler. */
  joined: string[];
}

type Action =
  | { type: 'loading' }
  | { type: 'loaded'; terminals: Terminal[]; devices: Device[]; events: LiveEvent[] }
  | { type: 'failed'; error: unknown }
  | { type: 'device'; device: Device }
  | { type: 'terminal'; terminal: Partial<Terminal> & { id: string } }
  | WsMessage;

const initial: State = { terminals: [], devices: [], events: [], loading: true, error: null, joined: [] };

function patchDevice(devices: Device[], id: string, patch: (d: Device) => Device) {
  return devices.map((d) => (d.id === id ? patch(d) : d));
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'loading':
      return { ...state, loading: true, error: null };
    case 'loaded':
      return { ...state, loading: false, error: null, terminals: action.terminals, devices: action.devices, events: action.events };
    case 'failed':
      return { ...state, loading: false, error: action.error };
    case 'device':
      return { ...state, devices: patchDevice(state.devices, action.device.id, () => action.device) };
    case 'terminal':
      return { ...state, terminals: state.terminals.map((t) => (t.id === action.terminal.id ? { ...t, ...action.terminal } : t)) };
    case 'device.reading': {
      const { deviceId, state: values, ts } = action.data;
      return {
        ...state,
        devices: patchDevice(state.devices, deviceId, (d) => ({ ...d, state: { ...d.state, ...values }, lastSeenAt: ts, online: true })),
      };
    }
    case 'device.status': {
      const { deviceId, online, battery } = action.data;
      return { ...state, devices: patchDevice(state.devices, deviceId, (d) => ({ ...d, online, battery })) };
    }
    case 'device.joined': {
      const device = action.data;
      const exists = state.devices.some((d) => d.id === device.id);
      return {
        ...state,
        devices: exists ? patchDevice(state.devices, device.id, () => device) : [...state.devices, device],
        joined: state.joined.includes(device.id) ? state.joined : [...state.joined, device.id],
      };
    }
    case 'terminal.status': {
      const { terminalId, online, permitJoinUntil } = action.data;
      return {
        ...state,
        terminals: state.terminals.map((t) =>
          t.id === terminalId ? { ...t, online, permitJoinUntil, lastSeenAt: online ? new Date().toISOString() : t.lastSeenAt } : t,
        ),
      };
    }
    case 'event.created':
      if (state.events.some((e) => e.id === action.data.id)) return state;
      return { ...state, events: [action.data, ...state.events].slice(0, MAX_EVENTS) };
    default:
      return state;
  }
}

const KNOWN_TYPES = new Set(['device.reading', 'device.joined', 'device.status', 'terminal.status', 'event.created']);

interface LiveValue extends State {
  connection: Connection;
  reload: () => void;
  updateDevice: (device: Device) => void;
  updateTerminal: (terminal: Partial<Terminal> & { id: string }) => void;
}

const LiveContext = createContext<LiveValue | null>(null);

export function LiveProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const [state, dispatch] = useReducer(reducer, initial);
  const [connection, setConnection] = useState<Connection>('connecting');

  const load = useCallback(async () => {
    dispatch({ type: 'loading' });
    try {
      const [terminals, devices, events] = await Promise.all([
        api<Terminal[]>('/terminals'),
        api<Device[]>('/devices'),
        api<LiveEvent[]>('/events', { query: { limit: 20 } }),
      ]);
      dispatch({ type: 'loaded', terminals, devices, events });
    } catch (error) {
      dispatch({ type: 'failed', error });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // WebSocket avec reconnexion automatique (attente croissante, plafonnée à 30 s).
  useEffect(() => {
    if (!token) return;
    let socket: WebSocket | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;
    let stopped = false;

    const connect = () => {
      setConnection('connecting');
      try {
        socket = new WebSocket(wsUrl(token));
      } catch {
        return schedule();
      }
      socket.onopen = () => {
        // Après une coupure, on recharge l'instantané pour rattraper les messages manqués.
        if (attempts > 0) void load();
        attempts = 0;
        setConnection('open');
      };
      socket.onmessage = (msg) => {
        try {
          const parsed = JSON.parse(String(msg.data)) as WsMessage;
          if (parsed && KNOWN_TYPES.has(parsed.type) && parsed.data) dispatch(parsed);
        } catch {
          // Message illisible : ignoré.
        }
      };
      socket.onclose = () => {
        socket = null;
        schedule();
      };
    };

    const schedule = () => {
      if (stopped) return;
      setConnection('closed');
      attempts += 1;
      timer = setTimeout(connect, Math.min(30000, 1000 * 2 ** Math.min(attempts - 1, 5)));
    };

    connect();
    return () => {
      stopped = true;
      clearTimeout(timer);
      if (socket) {
        socket.onclose = null;
        socket.close();
      }
    };
  }, [token, load]);

  const updateDevice = useCallback((device: Device) => dispatch({ type: 'device', device }), []);
  const updateTerminal = useCallback((terminal: Partial<Terminal> & { id: string }) => dispatch({ type: 'terminal', terminal }), []);
  const reload = useCallback(() => void load(), [load]);

  const value = useMemo(
    () => ({ ...state, connection, reload, updateDevice, updateTerminal }),
    [state, connection, reload, updateDevice, updateTerminal],
  );
  return <LiveContext.Provider value={value}>{children}</LiveContext.Provider>;
}

export function useLive() {
  const ctx = useContext(LiveContext);
  if (!ctx) throw new Error('useLive doit être utilisé dans LiveProvider');
  return ctx;
}
