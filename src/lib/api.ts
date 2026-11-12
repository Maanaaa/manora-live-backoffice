// Client HTTP de l'API Manora Live (contrat : docs/adr/0002-contrat-api.md).

const TOKEN_KEY = 'manora-live.token';

export const API_URL = (import.meta.env.VITE_API_URL ?? '').trim().replace(/\/+$/, '');

export class ApiError extends Error {
  /** 0 = API injoignable (réseau, CORS, URL absente). */
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }

  get unreachable() {
    return this.status === 0;
  }
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Stockage indisponible (navigation privée) : la session durera le temps de l'onglet.
  }
}

let onUnauthorized: (() => void) | null = null;

/** Appelé quand l'API répond 401 avec un jeton : la session est expirée. */
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

type Query = Record<string, string | number | undefined | null>;

interface Options {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Query;
  signal?: AbortSignal;
}

export async function api<T>(path: string, { method = 'GET', body, query, signal }: Options = {}): Promise<T> {
  if (!API_URL) throw new ApiError(0, "Adresse de l'API non configurée (VITE_API_URL).");

  const url = new URL(API_URL + path);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  }

  const token = getToken();
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new ApiError(0, "L'API est injoignable. Vérifiez la connexion ou réessayez plus tard.");
  }

  if (res.status === 401 && token && path !== '/auth/login') onUnauthorized?.();

  if (!res.ok) {
    let message = `Erreur ${res.status}`;
    try {
      const data = (await res.json()) as { error?: string };
      if (data?.error) message = data.error;
    } catch {
      // Réponse sans JSON : on garde le message générique.
    }
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

/** URL du WebSocket temps réel : même hôte que l'API, en ws:// ou wss://. */
export function wsUrl(token: string) {
  const url = new URL(API_URL + '/ws');
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.searchParams.set('token', token);
  return url.toString();
}

export function errorMessage(err: unknown) {
  if (err instanceof ApiError) return err.message;
  return 'Une erreur inattendue est survenue.';
}
