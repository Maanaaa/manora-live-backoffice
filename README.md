# Manora Live — back-office

Back-office web de Manora Live, la borne photo connectée de Manora : suivi du parc en temps réel, règles d'automatisation, utilisateurs, journal et clés des bornes. Réservé aux administrateurs.

L'API (sur le VPS) suit le contrat [docs/adr/0002-contrat-api.md](docs/adr/0002-contrat-api.md). Sans API joignable, l'interface affiche ses états « API injoignable » : il n'y a pas de données de démonstration.

## Installation (moins de 15 min)

Prérequis : Node.js 22 ou plus, npm.

```bash
git clone git@github.com:Maanaaa/manora-live-backoffice.git
cd manora-live-backoffice
npm install
cp .env.example .env        # puis renseigner VITE_API_URL, ex. https://api.exemple.fr (sans / final)
npm run dev                 # http://localhost:5173
```

Se connecter avec un compte `admin` de l'API.

| Commande | Rôle |
| --- | --- |
| `npm run dev` | serveur de développement |
| `npm run build` | vérification des types puis build dans `dist/` |
| `npm run preview` | sert le build localement |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript |
| `npm test` | tests `node --test tests/*.test.cjs` |

Déploiement : servir `dist/` en statique, avec retour sur `index.html` pour toutes les routes. `VITE_API_URL` est figée au build. L'API doit autoriser l'origine du back-office (CORS).

## Fonctionnalités

- **Connexion** (`/auth/login`, `/auth/me`), déconnexion, routes réservées au rôle `admin`.
- **Tableau de bord temps réel** : terminaux en ligne / hors ligne, appareils avec leur dernière valeur et leur batterie, derniers événements ; mis à jour par WebSocket, reconnexion automatique et indicateur de connexion.
- **Parc** : terminaux (dernier contact, « Appairer un capteur » avec décompte), appareils (renommer, lieu, activer / désactiver) ; un capteur appairé apparaît tout seul.
- **Fiche appareil** : capacités, historique 24 h / 7 jours, commandes avec l'état réel renvoyé par l'appareil.
- **Règles** « si … alors … » : déclencheur, durée et fenêtre horaire optionnelles, actions notifier / commander / borne ; activer, modifier, supprimer.
- **Utilisateurs** : création, rôle administrateur ou hôte, suppression.
- **Journal** filtrable par appareil, type et période.
- **Clés des bornes** : création (clé affichée une seule fois, bouton copier), révocation.

Les widgets sont choisis selon `capability.type` et `unit`, jamais selon le modèle : binaire → libellé métier (« Porte ouverte »), numérique → valeur et unité, `%` → jauge, enum → libellé.

## Structure

```
src/
  auth/        session (jeton, /auth/me, déconnexion)
  live/        état temps réel partagé et WebSocket
  lib/         client d'API, types du contrat, logique pure testée (capacités, règles, dates)
  components/  mise en page, widgets, états (chargement, vide, erreur), formulaire de règle, graphique
  pages/       une page par écran
  assets/      police Plus Jakarta Sans, logo
tests/         tests node --test (.cjs)
docs/adr/      décisions d'architecture
```

## Documentation

- [Décisions d'architecture](docs/adr/README.md)
- [Contrat d'API](docs/adr/0002-contrat-api.md)
