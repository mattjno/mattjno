# MATTJNO — contexte du dépôt

Site portfolio de photographie sportive de Matthieu Jauneau (marque MATTJNO, mattjno.com, Instagram @matt.jno).

## Architecture
- Next.js (App Router), page unique. `app/page.js` (serveur) lit les photos dans R2 via `app/_site/data.js` et rend `app/_site/Portfolio.jsx` (client). Page régénérée toutes les 5 minutes (`revalidate = 300`).
- Photos hébergées sur Cloudflare R2, bucket `mattjno-photos`, URL publique `https://pub-9350dce8a12e41c091a228ca7b1d7d48.r2.dev/`.
- Dossiers du site dans R2 : `hero/`, `football/`, `handball/`, `basketball/`, `football-americain/`. Matthieu y dépose ses exports sans les renommer. Les dossiers par match à la racine sont son archive, le site ne les lit pas.
- Règles de `data.js` : dimensions lues dans l'en-tête des fichiers ; les 4 paysages les plus récents d'un sport (hors panoramiques) = ouverture du chapitre en fondu ; tout le reste (portraits, autres paysages, panoramiques) = galerie, du plus récent au plus ancien ; dossier vide ou incomplet = sélection d'origine (`app/_site/photos.js`, complétée par `EXTRA`). Dossier `hero/` vide : l'accueil tire au hasard 6 paysages des dossiers sport (hors panoramiques, 3 000 px de large au moins s'il y en a 3, sans la photo qui ouvre chaque chapitre, sports en alternance), nouveau tirage à chaque régénération de la page (5 min au plus). Point d'action facultatif dans le nom : `...@60-40.jpg`.
- Mise en page des galeries (`app/_site/pack.js`) : portrait 1 case, paysage 3:2 à 16:10 2 cases, panoramique 2,1 à 2,6:1 3 cases, à la hauteur d'un portrait ; autres formats hors galerie. Rangées complètes seulement, à 2, 4 ou 5 colonnes selon l'écran ; une rangée est complétée par la combinaison de photos qui garde le plus l'ordre, parmi les 10 suivantes (`fill`).
- Pas de légendes sous les photos (choix de Matthieu, comme konradborzy.com).
- `public/site.json` et `scripts/generate-manifests.mjs` ne servent plus au site (outils de prototype seulement). L'Action `update-manifest` est supprimée ; ses secrets R2 GitHub (lecture seule) peuvent être retirés.
- Formulaire de contact : `app/api/contact/route.js` (envoi via Resend).
- Déploiement : projet Vercel `mattjno` (équipe `mattjnos-projects`), relié à ce dépôt. Chaque push sur `main` part en production. Chaque push sur une autre branche crée une URL de prévisualisation.

## Façon de travailler
- Les modifications se font depuis Claude, qui pousse sur GitHub.
- Jamais de push direct sur `main` pour une évolution du site : travailler sur une branche, vérifier la prévisualisation Vercel, faire valider par Matthieu, puis fusionner sur `main`.
- Aucun secret dans le dépôt. Les clés R2 et Resend vivent dans les secrets GitHub Actions et les variables d'environnement Vercel.
- Variables Vercel (Production et Preview) : `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` (jeton lecture seule), `RESEND_API_KEY`, `CONTACT_EMAIL`. Le site peut donc lire R2 directement côté serveur (testé le 23/10/2026).
- Avant de pousser : `npm run build` doit passer en local. `package-lock.json` est versionné : le mettre à jour avec toute nouvelle dépendance.
- Prévisualisation : adresse fixe par branche, `mattjno-git-<branche>-mattjnos-projects.vercel.app`. Vérifier le build via le connecteur Vercel avant de demander validation.

## Photos
- Hero et ouvertures : paysages d'au moins 3 000 px de large. Grilles : portraits 3:4 (format Instagram 1080 × 1440), paysages 3:2 ou 16:10, panoramiques 2,4:1.
- Les exports de Matthieu sont surtout en 16:10 (paysages) et 2,4:1 (panoramiques), lu dans `public/site.json`.
- Les identifiants R2 de Claude (Vercel, GitHub) sont en lecture seule : Claude ne crée ni ne dépose rien dans le bucket.

## Direction de la refonte (validée par Matthieu)
- Fond noir, accent blanc, rendu premium et simple. Référence : konradborzy.com/portfolio.
- Une seule police sur tout le site : Instrument Sans, déclinée en graisses, interlettrage resserré sur les gros titres.
- Plus d'albums par match. Page unique déroulante, bandeau de navigation fixe en haut, liens qui font défiler vers les sections.
- Hero plein écran : photos paysage en fondu enchaîné, alimentées par un dossier R2. "MATT JNO / Sports Photographer" superposé, en bas à gauche, sans légende ni accroche.
- Section "PORTFOLIO" : grille de portraits verticaux 4:5, cadre blanc au survol, alimentée par un dossier R2.
- Fin de page : contact.
- Motion design à développer dans un second temps.

## Version A (en production depuis le 24/10/2026)
- Le site est une vitrine : ni adresse e-mail ni liste de clubs. Matthieu démarche les clubs lui-même par e-mail ou Instagram.
- Pas d'intro : la photo est là au premier instant, le nom se lève dessus en moins de 1,2 s. MATT JNO sur une seule ligne (demande du 30/10/2026) ; sur téléphone, sa taille suit la largeur de l'écran (4,6 em de long).
- Un chapitre par sport. La fenêtre d'ouverture part du point d'action de la photo (`fx`, `fy` dans `photos.js`) et s'ouvre jusqu'au plein écran. Le même point centre le recadrage sur écran étroit.
- Grande ouverte et à l'écran, l'ouverture fait défiler les paysages du sport en fondu au fil du temps (4,5 s, fondu 1,4 s, léger recul comme à l'accueil). Refermée, elle revient à sa première photo. En pause quand l'onglet est caché.
- Football : grille droite, chaque photo monte dans son cadre en arrivant (découpe depuis le bas). Effets essayés puis retirés à la demande de Matthieu, à retrouver dans l'historique git : « plonger dans le O » (24/10/2026, commit b9aef0a) et « le but », ballon dessiné qui frappe la lucarne (24/10/2026, retiré le 30/10/2026 : il ne veut pas d'animation de ballon).
- La découpe de la fenêtre est calculée à chaque image (`insetAt`) : l'interpolation de chaînes `inset()` par GSAP perd un côté ou se déforme selon l'arrondi.
- Les déclencheurs ScrollTrigger sont créés dans l'ordre de la page, puis `ScrollTrigger.refresh()`. Sinon les ouvertures sous la galerie handball se calculent avant sa hauteur.
- Ordre des chapitres : football (grille droite, la grille décalée a été abandonnée), basket (rangées qui glissent), football américain (mosaïque), handball en dernier (galerie latérale, à la taille des autres grilles : 4 portraits de front, 5 au-delà de 1 700 px ; chaque photo à sa largeur naturelle). Paysages et portraits mêlés dans les quatre galeries, sans case vide.
- Portraits jamais rognés au repos ; paysages en grille rognés de 4 % au plus (formats de l'appareil). Seul sur sa rangée (téléphone), un paysage garde son format. Visionneuse plein écran au clic : la photo grandit depuis sa vignette, entière.
- Scènes tenues seulement sur grand écran (`min-width: 1024px` et `min-height: 560px`). La tablette en portrait suit le téléphone.
- Au doigt (téléphone, tablette), les animations ne suivent pas le défilement : l'élan les ferait passer en un éclair. L'ouverture se joue d'elle-même en 1,3 s dès que la fenêtre est à l'écran, et se referme si l'on remonte. Rangées basket et galerie handball entrent en cascade.
- Entrées au défilement (`arrive`) : tout élément encore sous l'écran est caché dès le chargement, puis entre à son déclencheur ; ce qui est déjà à l'écran ou au-dessus reste visible (page rechargée en cours de lecture). Ne jamais cacher un élément au moment où il entre (`fromTo` dans `onEnter` seul) : au doigt, l'élan l'amène à l'écran avant le déclencheur, la photo apparaît puis disparaît pour entrer (signalé par Matthieu le 30/10/2026).
- Mouvement réduit (réglage du système) : apparitions en fondu, aucun déplacement.
- À partir de 1 700 px : 5 colonnes (football, basket, mosaïque). La galerie est rangée à nouveau pour chaque nombre de colonnes ; trop peu de photos pour une rangée complète : moins de colonnes.
