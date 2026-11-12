import { useCallback, useEffect, useState } from 'react';

interface ApiState<T> {
  data: T | undefined;
  error: unknown;
  loading: boolean;
  reload: () => void;
  setData: (update: (data: T | undefined) => T | undefined) => void;
}

interface Result<T> {
  key: string;
  data: T | undefined;
  error: unknown;
}

/**
 * Charge une ressource et expose chargement, erreur et rechargement.
 * `deps` (valeurs sérialisables) déclenche un nouveau chargement quand il change.
 */
export function useApi<T>(load: (signal: AbortSignal) => Promise<T>, deps: unknown[]): ApiState<T> {
  const [attempt, setAttempt] = useState(0);
  const key = `${JSON.stringify(deps)}#${attempt}`;
  const [result, setResult] = useState<Result<T>>({ key: '', data: undefined, error: null });

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal).then(
      (data) => setResult({ key, data, error: null }),
      (error: unknown) => {
        if (!controller.signal.aborted) setResult((r) => ({ key, data: r.data, error }));
      },
    );
    return () => controller.abort();
    // `load` est recréée à chaque rendu : seul `key` (deps + tentative) relance la requête.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  const setData = useCallback((update: (data: T | undefined) => T | undefined) => setResult((r) => ({ ...r, data: update(r.data) })), []);

  const settled = result.key === key;
  return { data: result.data, error: settled ? result.error : null, loading: !settled, reload, setData };
}
