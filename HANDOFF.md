# HANDOFF — Suivi Sport

Ce fichier sert à reprendre le projet dans un nouvel outil (Claude Code) qui n'a aucun
accès à la conversation où tout ça a été construit. Il résume les décisions, l'état
actuel, et ce qui reste à faire — au-delà de ce que `README.md` couvre déjà (setup).

## Le projet en une phrase

App perso de suivi sportif pour Maxence : musculation (séries/exos/muscles précis),
course à pied, alimentation, poids, sommeil — en Next.js 15 + Supabase, mono-utilisateur
pour l'instant (pas de comptes).

## État actuel (confirmé fonctionnel)

- Le schéma Supabase (`supabase/schema.sql`) a été exécuté avec succès sur le projet
  Supabase de Maxence (nom du projet : `suivi-sport`, région Europe/eu-west-1).
- `.env.local` est configuré avec l'URL du projet et la **Publishable key**
  (`sb_publishable_...`, le nouveau système de clés Supabase — pas l'ancienne clé
  `anon` JWT, et surtout pas la Secret key `sb_secret_...`).
- `npm install` + `npm run dev` fonctionnent, l'app tourne en local, testée visuellement
  par Maxence (dashboard avec résumé, ajout rapide, nav complète).
- **Row Level Security (RLS) est volontairement désactivée** sur toutes les tables : pas
  de comptes/auth, donc pas de politique RLS à appliquer. Ça devra changer si le chantier
  comptes (voir plus bas) avance — RLS devra être activée avec des policies par `user_id`.
- Git **n'a jamais été initialisé**. Pas de repo GitHub. Pas de déploiement Vercel. Tout
  a été livré à Maxence sous forme de zips successifs au fil de la conversation.

## Décisions techniques importantes (et pourquoi)

- **Next.js 15.5.24 + React 19**, pas 14.x : une faille critique (CVE-2026-75604, RCE non
  authentifiée spécifique à Windows) n'a pas de correctif dans la branche 14.x. Maxence
  développe sur Windows, donc migration obligatoire. Les 3 pages avec route dynamique
  (`/course/[id]`, `/musculation/[id]`, `/musculation/exercices/[id]`) utilisent le hook
  `use()` de React pour déballer `params` (devenu une Promise en Next 15).
- **postcss forcé en override** dans `package.json` (`"overrides": { "postcss": "^8.5.28" }`)
  pour une vulnérabilité transitive via Next.js. `npm audit` doit rester à 0 vulnérabilité.
- **wger.de** comme base d'exercices de musculation (gratuite, sans clé, 481+ exercices,
  et fournit aussi les muscles primaires/secondaires par exercice + leurs illustrations
  anatomiques officielles). Intégré via 3 routes API internes (`app/api/exercises/search`,
  `app/api/exercises/wger-details`, `app/api/muscles/images`) qui proxient wger côté serveur.
- **Open Food Facts** comme base alimentaire (gratuite, sans clé, base française).
  Intégré via `app/api/food/search`.
- **Formules physiologiques plutôt qu'API** pour les calculs nutrition/calories : Mifflin-St
  Jeor (métabolisme de base) + équations ACSM (calories brûlées à l'effort, personnalisées
  au poids réel + à la durée/l'allure). Voir `lib/nutrition.ts` et `lib/calorieBurn.ts`.
- **15 muscles précis** (pas de simples catégories larges) calqués sur le référentiel
  officiel wger, avec un body heatmap qui superpose leurs vraies illustrations anatomiques
  (`components/BodyHeatmapWger.tsx`) ou un dessin schématique de secours
  (`components/BodyHeatmapDetailed.tsx`) si les illustrations wger ne rendent pas bien.
- **Next → nombre de séries d'abord** : le formulaire de séance muscu (nouvelle + édition)
  demande le nombre de séries, génère les champs reps/poids correspondants d'un coup,
  plutôt que d'ajouter une série à la fois (changement demandé par Maxence, tout récent).

## ⚠️ Point de vigilance jamais vérifié

Les 3 routes API qui proxient wger.de et Open Food Facts (`app/api/exercises/search`,
`app/api/exercises/wger-details`, `app/api/muscles/images`, `app/api/food/search`) ont été
écrites **sans jamais pouvoir tester un appel réel** (l'environnement où le code a été
écrit n'avait pas d'accès internet sortant vers ces domaines). Le parsing est défensif
(plusieurs formats de réponse essayés, erreurs attrapées), mais si une recherche ne
remonte rien côté Maxence : ouvrir l'URL wger/OFF concernée directement dans le navigateur
pour voir la vraie forme du JSON, et ajuster le parsing en conséquence. Demander à Maxence
s'il a déjà vérifié ça avant de supposer que c'est cassé.

## Fonctionnalités déjà livrées (résumé — détail complet dans README.md)

Musculation (séances, exercices wger, muscles précis, vue corporelle, PR auto, suggestion
de charge, unilatéral G/D, ressenti, durée) · Course (types, dénivelé, météo, VMA/zones,
comparaison au précédent) · Calendrier · Alimentation (recherche OFF, bibliothèque perso,
aliments fréquents, macros complets, hydratation, suppléments, suggestions protéines
restantes, ajustement calorique jours d'entraînement) · Poids & sommeil (courbes) ·
Objectifs (barre de progression + compte à rebours) · Stats (plusieurs graphiques) ·
Bilan hebdo & Insights automatiques (corrélations météo/perf, tendance volume, sommeil/perf)
· PWA installable (manifest, icônes, service worker) · Export/import JSON complet
(`/parametres`).

## Chantier en cours : comptes + amis + défis quotidiens

Maxence veut que lui et ses amis puissent chacun avoir un compte, s'ajouter en amis, et
s'envoyer un défi quotidien (ex: "fait 10 pompes") qui arrive en notification push sur le
téléphone du destinataire ("Maxence te défie sur Pompes : 10 reps"). Idée validée : le
défi porte sur un exercice choisi dans la bibliothèque wger déjà intégrée (pas juste un
texte libre), pour un rendu propre en notif.

Avant de se lancer, 3 questions ont été posées à Maxence et **jamais répondues
explicitement** — des défauts ont été proposés mais pas confirmés :
1. Mode de connexion : email + mot de passe (défaut proposé) vs aussi Google
2. Les données actuelles (séances, runs, poids...) : deviennent celles du compte de
   Maxence une fois inscrit (défaut proposé) vs on repart de zéro
3. Notifications : navigateur classique avec autorisation (défaut proposé, cohérent avec
   le service worker PWA déjà en place) vs autre chose

**Redemander ces 3 points avant de commencer**, ne pas juste supposer les défauts.

Ampleur du chantier (à garder en tête, c'est plus qu'un ajout de feature) :
- Auth réelle via Supabase Auth (le projet Supabase existe déjà, juste à activer Auth)
- **Chaque table existante doit gagner une colonne `user_id`** et RLS doit être activée
  avec des policies (`user_id = auth.uid()`) — gros changement transverse, pas cosmétique
- Système de relations d'amitié (demande envoyée / acceptée / refusée)
- Table de défis quotidiens (exercice wger, nombre de reps, expéditeur, destinataire,
  statut relevé/pas relevé, limité à 1x/jour par ami à définir précisément)
- Notifications Web Push : le service worker existe déjà (`public/sw.js`), mais il faut
  générer des clés VAPID, stocker l'abonnement push de chaque utilisateur, et une route
  serveur qui déclenche l'envoi quand un défi est créé

## Pour la suite immédiate (si Maxence ne repart pas direct sur les comptes)

1. `git init`, premier commit, repo GitHub (compte `Maxencelctr`)
2. Déploiement Vercel connecté à ce repo, avec les 2 variables d'env
   (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) ajoutées dans les
   settings Vercel
3. Vérifier les 3 routes API externes en conditions réelles une fois en ligne
