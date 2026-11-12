# ADR 0004 — Charte graphique

- Statut : accepté
- Date : 2026-11-12

## Contexte

Manora a déjà une identité (site manora-site-vitrine), reprise par l'app mobile. Le back-office doit ressembler aux autres interfaces de Manora Live tout en restant un outil de travail lisible.

## Décision

- Police unique : Plus Jakarta Sans, fichier variable `src/assets/fonts/PlusJakartaSans.woff2` servi par l'app (pas de CDN). Titres en 800, pas de serif ni d'italique décoratif.
- Mêmes tokens que l'app mobile (`src/lib/theme.ts`), en variables CSS dans `src/styles.css` : encre `#132537`, terracotta `#b83a22`, crème `#fffaf1`, sable `#ead8bd`, sarcelle `#136d66`.
- Barre latérale encre, lien actif terracotta, boutons pilule, cartes arrondies sur fond crème.
- Couleurs d'état : sarcelle pour « en ligne » et les états positifs, terracotta pour les alertes ; toujours accompagnées d'un libellé, jamais la couleur seule.
- Accessibilité : focus visible (anneau terracotta), cibles de 44 px, labels sur tous les champs, lien d'évitement, contrastes AA.
- Logo : `src/assets/manora-logo.png` (repris de l'app mobile).

## Conséquences

Le back-office, l'app mobile et la borne partagent la même identité ; une évolution de la charte se reporte dans `src/styles.css` et dans `theme.ts` de l'app mobile.
