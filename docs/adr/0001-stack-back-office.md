# ADR 0001 — Stack du back-office

- Statut : accepté
- Date : 2026-11-12

## Contexte

Le back-office sert aux administrateurs de Manora : suivre le parc (terminaux Raspberry Pi, capteurs Zigbee) en temps réel, régler les règles « si … alors … », gérer les comptes et les clés des bornes. Il doit être livré vite, rester simple à maintenir, et être utilisable sur ordinateur comme sur tablette. L'API n'existe pas encore : elle sera écrite plus tard sur le VPS selon le contrat [0002](0002-contrat-api.md).

## Décision

- **Vite + React + TypeScript** : application web statique (SPA), build rapide, typage des formes du contrat (`src/lib/types.ts`).
- **react-router** pour les routes, avec une zone protégée réservée au rôle `admin`.
- **Recharts** pour l'historique 24 h / 7 j de la fiche appareil, chargé à la demande avec cette page.
- **CSS simple** avec variables (tokens de la charte), sans framework UI.
- **Pas de mock ni de faux serveur** : sans API, chaque écran affiche un état d'erreur « API injoignable » avec un bouton « Réessayer ».
- Temps réel : un seul WebSocket `/ws?token=` ouvert après connexion, appliqué à un état partagé (`src/live/LiveContext.tsx`), avec reconnexion automatique (attente croissante, 30 s au plus) et rechargement de l'instantané REST à chaque reconnexion.
- La logique pure (affichage des capacités, validation des règles, dates) est écrite en JavaScript typé par JSDoc (`src/lib/*.js`) pour être testée par `node --test` sans outil de plus.
- Le jeton est gardé dans `localStorage` ; une réponse 401 déconnecte.

## Conséquences

- Le back-office se déploie comme des fichiers statiques (`dist/`) ; `VITE_API_URL` est figée au build.
- L'API doit autoriser l'origine du back-office (CORS) et accepter le jeton en paramètre du WebSocket.
- Les widgets ne dépendent que de `capability.type` et `unit` : un nouveau capteur s'affiche sans changer le code.
