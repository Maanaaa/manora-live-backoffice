# ADR 0002 — Contrat d'API commun aux apps

- Statut : accepté
- Date : 2026-11-12

## Contexte

L'API (REST + temps réel, règles, push, base de données) sera développée plus tard sur le VPS. L'app mobile et le back-office doivent pourtant être construits dès maintenant. Il faut un contrat fixe pour que les deux fronts et la future API se rejoignent sans retouche.

Ce fichier est identique dans `manora-live-mobile` et `manora-live-backoffice`. Toute modification doit être reportée dans les deux dépôts, puis dans l'API.

## Décision

### Généralités

- Base : `EXPO_PUBLIC_API_URL` (mobile) / `VITE_API_URL` (back-office), sans `/` final.
- JSON partout, sauf l'envoi de photos (multipart).
- Authentification : en-tête `Authorization: Bearer <jeton>`.
- Dates : ISO 8601 UTC (`2026-11-12T09:41:07Z`).
- Erreurs : statut HTTP + `{ "error": "message lisible en français" }`.
- Rôles : `admin`, `host` (client qui loue la borne), `guest` (invité d'un événement), `booth` (tablette, par clé d'API).

### Authentification

| Méthode | Route | Corps | Réponse | Accès |
| --- | --- | --- | --- | --- |
| POST | `/auth/login` | `{ email, password }` | `{ token, user }` | public |
| GET | `/auth/me` | — | `user` | connecté |
| POST | `/auth/guest` | `{ code }` (code de l'événement, lu dans le QR) | `{ token, guest: { id, name? }, event }` | public |

`user = { id, name, email, role }` — `event = { id, name, date, code }`

### Parc (terminaux et appareils)

| Méthode | Route | Corps / paramètres | Réponse | Accès |
| --- | --- | --- | --- | --- |
| GET | `/terminals` | — | `Terminal[]` | admin |
| POST | `/terminals/:id/permit-join` | `{ seconds }` (défaut 120) | `{ until }` | admin |
| GET | `/devices` | — | `Device[]` | admin, host |
| GET | `/devices/:id` | — | `Device` | admin, host |
| PATCH | `/devices/:id` | `{ name?, location?, enabled? }` | `Device` | admin |
| GET | `/devices/:id/readings` | `?capability=temperature&range=24h\|7d` | `{ ts, value }[]` | admin, host |
| POST | `/devices/:id/commands` | `{ capability, value }` | `Device` (état réel après exécution) | admin, host |

```ts
Terminal = { id, name, online: boolean, lastSeenAt, permitJoinUntil: string | null }

Device = {
  id, terminalId, ieee, model, name, location: string | null,
  enabled: boolean, online: boolean, battery: number | null, lastSeenAt,
  capabilities: Capability[],
  state: Record<string, boolean | number | string | null>, // dernière valeur par capacité
}

Capability = {
  name: string,                 // occupancy, contact, temperature, state…
  type: 'binary' | 'numeric' | 'enum',
  unit?: string,                // °C, %…
  values?: string[],            // pour enum
  access: 'read' | 'write' | 'readwrite',
}
```

Les fronts affichent un widget selon `type` et `unit`, jamais selon le modèle : un nouveau capteur apparaît sans changer le code.

### Règles

| Méthode | Route | Accès |
| --- | --- | --- |
| GET | `/rules` | admin |
| POST | `/rules` | admin |
| PATCH | `/rules/:id` | admin |
| DELETE | `/rules/:id` | admin |

```ts
Rule = {
  id, name, enabled: boolean,
  trigger: { deviceId, capability, operator: 'eq' | 'neq' | 'gt' | 'lt', value: boolean | number | string, forSeconds?: number },
  schedule?: { after?: 'HH:MM', before?: 'HH:MM' },   // fenêtre horaire optionnelle
  actions: (
    | { type: 'notify', message: string }
    | { type: 'command', deviceId, capability, value }
    | { type: 'booth', event: 'countdown' | 'sleep' | 'wake' }
  )[],
}
```

### Utilisateurs

| Méthode | Route | Corps | Accès |
| --- | --- | --- | --- |
| GET | `/users` | — | admin |
| POST | `/users` | `{ name, email, password, role }` | admin |
| PATCH | `/users/:id` | `{ name?, email?, password?, role? }` | admin |
| DELETE | `/users/:id` | — | admin |

### Journal

| Méthode | Route | Paramètres | Réponse | Accès |
| --- | --- | --- | --- | --- |
| GET | `/events` | `?deviceId=&type=&from=&to=&limit=` | `Event[]` (plus récent d'abord) | admin |

```ts
Event = { id, ts, type: 'reading' | 'joined' | 'online' | 'offline' | 'command' | 'rule', deviceId: string | null, deviceName: string | null, message: string }
```

### Photos

| Méthode | Route | Corps / paramètres | Réponse | Accès |
| --- | --- | --- | --- | --- |
| GET | `/photos` | `?after=<id>&mine=1` | `Photo[]` (plus récent d'abord) | guest, host, admin |
| POST | `/photos` | multipart : `photo` (JPEG), `source` (`booth` \| `guest`) | `{ id, url }` | booth, guest |
| DELETE | `/photos/:id` | — | 204 | auteur, host, admin |

```ts
Photo = { id, url, thumbUrl, source: 'booth' | 'guest', authorName: string | null, mine: boolean, createdAt }
```

Pour une photo de la borne, `url` est la page publique de la photo : c'est elle qui est encodée dans le QR.

### Clés d'API des bornes

| Méthode | Route | Réponse | Accès |
| --- | --- | --- | --- |
| GET | `/api-keys` | `{ id, name, createdAt, lastUsedAt }[]` | admin |
| POST | `/api-keys` | `{ id, name, key }` — `key` n'est renvoyée qu'une fois | admin |
| DELETE | `/api-keys/:id` | 204 | admin |

### Notifications push

| Méthode | Route | Corps | Accès |
| --- | --- | --- | --- |
| POST | `/push-tokens` | `{ token }` (jeton Expo Push) | connecté |

### Temps réel

WebSocket `/ws?token=<jeton>` (le jeton peut être une clé de borne). Le serveur choisit les canaux selon le rôle. Chaque message : `{ "type": string, "data": object }`.

| Type | `data` | Reçu par |
| --- | --- | --- |
| `device.reading` | `{ deviceId, state, ts }` | admin, host |
| `device.joined` | `Device` | admin |
| `device.status` | `{ deviceId, online, battery }` | admin, host |
| `terminal.status` | `{ terminalId, online, permitJoinUntil }` | admin |
| `event.created` | `Event` | admin |
| `photo.created` | `Photo` | guest, host, admin |
| `photo.deleted` | `{ id }` | guest, host, admin |
| `booth.countdown` / `booth.sleep` / `booth.wake` | `{}` | booth |

## Conséquences

- Les apps fonctionnent dès que l'API respecte ce contrat ; sans API, elles affichent leurs états d'erreur ou hors ligne.
- Le contrat est la référence pour écrire l'API sur le VPS.
