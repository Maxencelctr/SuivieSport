# Suivi Sport

App perso de suivi sportif (musculation + course à pied) avec courbes de progression.

## Stack
- Next.js 14 (App Router) + TypeScript
- Supabase (Postgres) pour le stockage
- Recharts pour les graphiques
- Tailwind CSS

## Setup

1. Crée un projet sur https://supabase.com (gratuit)
2. Dans le SQL editor de Supabase, colle et exécute `supabase/schema.sql`
3. Récupère ton `Project URL` et ta clé `anon public` dans Project Settings > API
4. Crée un fichier `.env.local` à la racine :
   ```
   NEXT_PUBLIC_SUPABASE_URL=ton_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=ta_clé
   ```
5. `npm install`
6. `npm run dev`

## Structure prévue

- `/app/musculation` — enregistrer une séance (exos, séries, reps, poids)
- `/app/course` — enregistrer une sortie run (distance, temps, allure auto-calculée)
- `/app/stats` — courbes de progression (volume par groupe musculaire, évolution PR, allure dans le temps)

## Status

- [x] Schéma de base de données
- [x] Structure projet + client Supabase
- [x] Formulaire séance musculation (+ édition/suppression)
- [x] Formulaire séance course (+ édition/suppression)
- [x] Dashboard + courbes (allure course, volume muscu)
- [x] Recherche + ajout d'exercices via l'API wger.de (`/musculation/exercices`)
- [x] Calendrier mensuel coloré (vert = muscu, rose = course, dégradé = les deux) — `/calendrier`
- [x] Alimentation : recherche Open Food Facts + saisie manuelle, total protéines/calories du jour — `/alimentation`
- [x] Stats détaillées : distance par run, cumul km/semaine, progression poids max par exercice (sélecteur), volume par groupe musculaire, courbe protéines 30 jours
- [x] Résumé semaine/mois/année sur l'accueil (nb séances muscu, nb runs + km, protéines moyennes/jour)
- [x] Profil (`/profil`) : calcul calories/protéines cible selon sexe, âge, taille, poids, activité et objectif (sèche/maintien/prise de masse) — formule Mifflin-St Jeor, pas d'API externe
- [x] Barres de progression calories/protéines sur `/alimentation`
- [x] Objectifs personnalisés avec barre de progression (`/objectifs`) — distance, poids, temps... mise à jour manuelle de la valeur actuelle
- [x] Fiche détaillée par exercice (`/musculation/exercices/[id]`) : description éditable + historique complet des séries par séance
- [x] **Découpage anatomique précis** : 15 muscles individuels (référentiel wger.de — biceps, deltoïde antérieur, grand pectoral, obliques, quadriceps, trapèzes, grand dorsal, ischio-jambiers, triceps, etc.), liés à chaque exercice en primaire/secondaire, récupérés automatiquement depuis wger à l'ajout (ou éditables à la main)
- [x] Vue corporelle détaillée (`/musculation/corps`) : deux styles au choix — illustrations anatomiques officielles wger (superposées, teintées selon le volume) ou dessin schématique fait main (fallback), une zone par muscle, clic sur une zone ou la liste pour la mettre en évidence
- [x] Suggestion de charge (progressive overload) : à chaque exercice choisi dans une nouvelle séance, rappel de la dernière perf + suggestion +2.5kg ou +1 rep
- [x] Types de sortie course (footing/fractionné/sortie longue/autre) + allure moyenne par type dans les stats
- [x] Suivi du poids de corps (`/poids`) avec courbe — chaque pesée met à jour automatiquement le profil (donc les objectifs caloriques/protéines restent justes sans ressaisie)
- [x] Macros complets sur `/alimentation` (glucides/lipides en plus des protéines/calories, calculés à partir du profil) + résumé glissant des 7 derniers jours
- [x] VMA & zones d'allure (`/course/zones`) : estimation à partir d'une perf récente (5km/10km/semi/marathon/test 6min), 5 zones d'entraînement avec allure cible
- [x] Détection automatique de record personnel : à l'enregistrement d'une séance muscu, écran "🎉 Nouveau record" si un poids dépasse le meilleur historique sur cet exercice
- [x] Comparaison à la dernière sortie du même type (footing vs dernier footing) affichée en direct sur le formulaire de nouveau run
- [x] Compte à rebours (J-XX) sur les objectifs ayant une date cible
- [x] Suggestions de repas selon les protéines restantes du jour (8 aliments courants, quantité calculée automatiquement) + aliments fréquents en un clic sur `/alimentation`
- [x] Suivi unilatéral (gauche/droite) pour les exercices asymétriques : case à cocher "unilatéral" dans les formulaires de séance, comparaison gauche/droite sur la fiche de l'exercice (poids max + reps moyennes par côté)
- [x] Objectif calorique ajusté selon l'activité du jour : estimation personnalisée à ton poids réel (équations ACSM — course selon allure/durée, muscu selon durée de séance), plus fiable qu'un forfait fixe, visible sur `/alimentation`
- [x] Bilan hebdomadaire (`/bilan`) : mini-calendrier de la semaine, séances + runs, moyenne alimentation, évolution du poids — tout sur un écran
- [x] Ajout rapide depuis l'accueil : "Run rapide" et "Repas rapide", 2 champs + enregistrer, sans passer par le formulaire complet
- [x] Bibliothèque d'aliments personnalisés (`/alimentation/aliments`) : saisis une fois les valeurs exactes d'un produit précis (marque, quantité de référence, protéines/calories/glucides/lipides), réutilisable ensuite en sélection rapide sur `/alimentation` avec la quantité mangée qui recalcule tout automatiquement
- [x] App installable (PWA) : manifest + icônes + service worker, "Ajouter à l'écran d'accueil" depuis le navigateur mobile pour un lancement en plein écran comme une vraie appli
- [x] Export/import de toutes les données en JSON (`/parametres`) — sauvegarde complète, restaurable n'importe quand
- [x] Dénivelé (D+) optionnel par sortie course, affiché dans la liste
- [x] Suivi de l'hydratation sur `/alimentation` — boutons rapides 25cl/50cl/1L + saisie libre, total du jour en litres
- [x] Suivi des suppléments (`/alimentation`) — case à cocher par jour pour la créatine (préremplie) + possibilité d'ajouter d'autres suppléments (vitamine D, oméga-3...) qui restent disponibles ensuite
- [x] Météo par run (soleil/pluie/froid/chaud, optionnel) — affichée dans la liste, allure moyenne par météo dans les stats
- [x] Ressenti de séance muscu (1-5, comme pour la course) — affiché dans la liste des séances
- [x] Suivi du sommeil (`/sommeil`) — heures dormies par nuit, courbe, moyenne 7 jours
- [x] Insights automatiques (`/insights`) — croise runs/muscu/sommeil pour sortir 2-3 observations concrètes (météo vs allure, tendance de volume, sommeil vs performance), affiche un message clair si pas encore assez de données plutôt qu'un résultat inventé
- [ ] Déploiement Vercel

## Note sur la PWA

Les icônes sont générées simplement (halteres stylisées sur fond sombre) — change-les si tu veux
un vrai logo. L'installation ("Ajouter à l'écran d'accueil") ne fonctionne qu'une fois l'app servie
en HTTPS (donc une fois déployée sur Vercel — pas en `localhost` sans certificat, même si Chrome
tolère localhost pour le service worker en dev).

## ⚠️ Migration Next.js 15 (sécurité)

Le projet a été mis à jour de Next 14.2.5 → **15.5.24** suite à une faille critique
(CVE-2026-75604, RCE non authentifiée spécifique à Windows) qui n'a pas de correctif
dans la branche 14.x. React est passé en version 19 (requis par Next 15). Les 3 pages
avec route dynamique (`/course/[id]`, `/musculation/[id]`, `/musculation/exercices/[id]`)
ont été adaptées au nouveau système de `params` asynchrones de Next 15 (via `use()`).

**À refaire côté install** : supprime `node_modules` et `package-lock.json`, puis relance
`npm install` pour repartir sur les bonnes versions. Un avertissement de peer dependency
sur `recharts` (qui déclare officiellement React ≤18) peut apparaître — c'est juste un
avertissement, pas une erreur, recharts fonctionne en pratique avec React 19.

## Note sur la vue corporelle — important à lire ce soir

Tu as demandé un vrai rendu anatomique précis. Je ne peux pas reproduire l'illustration de
l'app que tu m'as montrée en capture — c'est un visuel propriétaire d'une autre appli, pas
question de le copier. À la place, j'utilise les **vraies illustrations anatomiques de wger.de**
(même base de données que pour les exercices), récupérées via `app/api/muscles/images/route.ts`
→ `GET https://wger.de/api/v2/muscle/?format=json` → chaque muscle a un champ `image_url_main`
(son illustration sur le corps). Le composant `BodyHeatmapWger` superpose les 15 images et
joue sur le gris/couleur + l'opacité selon ton volume d'entraînement.

**Incertitude à vérifier ce soir** : je n'ai aucun moyen de voir à quoi ressemblent
réellement ces images (pas d'accès internet, pas d'affichage d'image possible dans mon
environnement). Deux scénarios possibles :
1. Chaque image contient déjà le corps entier avec un seul muscle coloré → la superposition
   fonctionne telle quelle, ça devrait bien rendre.
2. Chaque image ne contient QUE le muscle isolé, sans corps autour → il manquera un contour
   de corps visible en dessous, ce sera bizarre visuellement (des taches flottantes).

Ouvre `/musculation/corps`, regarde le rendu "Illustrations anatomiques". Si ça ne ressemble
à rien, bascule sur "Dessin schématique" (toujours fonctionnel, rectangles arrondis) en
attendant, et montre-moi une capture de ce que tu vois — je corrige en conséquence (ajout
d'une image de corps de base séparée, changement d'approche, etc.).

## ⚠️ À tester en priorité ce soir

Deux fonctionnalités tapent sur des API publiques externes et n'ont pas pu être testées en
conditions réelles depuis mon environnement (pas d'accès internet sortant) :

1. **Recherche d'exercices** (`app/api/exercises/search/route.ts`) → wger.de
2. **Recherche alimentaire** (`app/api/food/search/route.ts`) → Open Food Facts
3. **Détails d'exercice + muscles** (`app/api/exercises/wger-details/route.ts`) → wger.de (appelée automatiquement à chaque ajout d'exercice, et via le bouton "↻ Récupérer depuis wger" sur la fiche d'un exercice)

Si une recherche ne remonte rien :
- Exercices : ouvre `https://wger.de/api/v2/exercise/search/?term=squat&language=english&format=json` dans le navigateur
- Alimentation : ouvre `https://world.openfoodfacts.org/cgi/search.pl?search_terms=poulet&search_simple=1&action=process&json=1&page_size=5` dans le navigateur

Compare la vraie forme du JSON à ce que le parsing attend dans le `route.ts` correspondant, et dis-moi ce que tu vois — je corrige avec toi. Les deux pages ont un fallback "ajout manuel" qui fonctionne dans tous les cas, donc rien n'est bloquant.

## Ce soir, une fois devant ton ordi

1. `npm install`
2. Crée ton projet Supabase, exécute `supabase/schema.sql`
3. Remplis `.env.local` (voir `.env.local.example`)
4. `npm run dev` → http://localhost:3000
5. Teste `/musculation/exercices` et `/alimentation` en premier (voir avertissement ci-dessus)
6. Pousse sur GitHub, puis déploie sur Vercel (ajoute les mêmes variables d'env dans les settings Vercel)
