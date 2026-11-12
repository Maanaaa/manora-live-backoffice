# ADR 0003 — CI GitHub Actions reprise de l'app mobile

- Statut : accepté
- Date : 2026-11-12

## Contexte

L'app mobile (`manora-live-mobile`) a déjà une CI GitHub Actions reprise de `manora-app` : qualité (lint, types, tests), sécurité (CVE, secrets), SonarCloud. Le back-office doit suivre les mêmes règles.

## Décision

`.github/workflows/ci.yml` reprend la même structure :

| Job | Commande |
| --- | --- |
| `lint` | `npm run lint` (ESLint, typescript-eslint, react-hooks) |
| `typecheck` | `npm run typecheck` (`tsc -b`) |
| `test` | `node --test tests/*.test.cjs`, rapport `junit.xml` en artefact |
| `osv-scanner` | failles connues des dépendances, non bloquant |
| `secret-detection` | gitleaks |
| `sonarqube` | SonarSource/sonarqube-scan-action, seulement si le secret `SONAR_TOKEN` existe |

Déclenchement : push sur `main`, pull requests, lancement manuel.

## Conséquences

- Pour activer Sonar : ajouter le secret `SONAR_TOKEN` (et la variable `SONAR_HOST_URL` si ce n'est pas SonarCloud) ; le projet est `Maanaaa_manora-live-backoffice` dans `sonar-project.properties`.
- Les tests sont en CommonJS (`tests/*.test.cjs`) et importent la logique pure de `src/lib/*.js`.
