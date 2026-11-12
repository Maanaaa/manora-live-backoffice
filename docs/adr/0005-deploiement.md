# ADR 0005 — Déploiement sur admin.live.manora-photo.fr

- Statut : accepté
- Date : 2026-11-12

## Contexte

Le back-office doit être accessible en ligne, à côté de l'API déployée sur `https://api.live.manora-photo.fr`, avec le même déploiement continu que les autres projets de Théo (Portainer sur le VPS Contabo).

## Décision

- Image Docker en deux étapes : build Vite (`node:24-slim`), puis site statique servi par `nginx:1.29-alpine` (`nginx.conf` : toutes les routes renvoient `index.html`, cache long sur `/assets/`).
- `VITE_API_URL` est figée au build : argument de build dans `compose.yaml`, `https://api.live.manora-photo.fr` par défaut.
- `compose.yaml` : conteneur `manora-live-backoffice` sur `127.0.0.1:10016`, sur le réseau `bridge` par défaut de Docker (le site ne parle à aucun autre conteneur, et les plages d'adresses Docker du VPS étaient épuisées le jour du déploiement).
- Stack Portainer Git `manora-live-backoffice` sur `main` ; `.github/workflows/deploy.yml` appelle son webhook (secret `PORTAINER_WEBHOOK_URL`) une fois la CI réussie.
- Nginx du VPS : `admin.live.manora-photo.fr` → `127.0.0.1:10016`, certificat Let's Encrypt. L'API autorise cette origine dans `CORS_ORIGINS`.
- La CI vérifie aussi que l'image se construit (job `docker`).

## Conséquences

- Chaque fusion sur `main` redéploie le back-office après CI verte.
- Changer d'API demande un nouveau build (variable `VITE_API_URL` de la stack, puis redéploiement).
