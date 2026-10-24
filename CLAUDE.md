# MATTJNO — contexte du dépôt

Site portfolio de photographie sportive de Matthieu Jauneau (marque MATTJNO, mattjno.com, Instagram @matt.jno).

## Architecture
- Next.js (App Router), page unique. `app/page.js` (serveur) lit les photos dans R2 via `app/_site/data.js` et rend `app/_site/Portfolio.jsx` (client). Page régénérée toutes les 5 minutes (`revalidate = 300`).
- Photos hébergées sur Cloudflare R2, bucket `mattjno-photos`, URL publique `https://pub-9350dce8a12e41c091a228ca7b1d7d48.r2.dev/`.
- Dossiers du site dans R2 : `hero/`, `football/`, `handball/`, `basketball/`, `football-americain/`. Matthieu y dépose ses exports sans les renommer. Les dossiers par match à la racine sont son archive, le site ne les lit pas.
- Règles de `data.js` : dimensions lues dans l'en-tête des fichiers ; les 4 paysages les plus récents d'un sport (hors panoramiques) = ouverture du chapitre en fondu ; tout le reste (portraits, autres paysages, panoramiques) = galerie, du plus récent au plus ancien ; dossier vide ou incomplet = sélection d'origine (`app/_site/photos.js`, complétée par `EXTRA`). Point d'action facultatif dans le nom : `...@60-40.jpg`.
- Mise en page des galeries (`app/_site/pack.js`) : portrait 1 case, paysage 3:2 à 16:10 2 cases, panoramique 2,1 à 2,6:1 3 cases, à la hauteur d'un portrait ; autres formats hors galerie. Rangées complètes seulement, à 2, 4 ou 5 colonnes selon l'écran ; une photo qui ne tient pas laisse passer la suivante.
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
- Node n'est pas installé sur le Mac de Matthieu : pour construire ou lancer le site en local, utiliser une copie officielle de Node 22 (nodejs.org) dans un dossier temporaire, sans installation système.
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
- Pas d'intro : la photo est là au premier instant, le nom se lève dessus en moins de 1,2 s.
- Un chapitre par sport. La fenêtre d'ouverture part du point d'action de la photo (`fx`, `fy` dans `photos.js`) et s'ouvre jusqu'au plein écran. Le même point centre le recadrage sur écran étroit.
- Grande ouverte et à l'écran, l'ouverture fait défiler les paysages du sport en fondu au fil du temps (4,5 s, fondu 1,4 s, léger recul comme à l'accueil). Refermée, elle revient à sa première photo. En pause quand l'onglet est caché.
- Football : « le but » (choisi par Matthieu le 24/10/2026, remplace « plonger dans le O », essayé puis écarté). Quand la galerie a son haut à 32 % de l'écran, un ballon dessiné (SVG `BALL`, 400 px réduit pour rester net, liseré clair pour garder sa silhouette sur le noir) part du bas de l'écran, enroule sa trajectoire (Bézier, contrôle à gauche) et frappe la lucarne : coin haut de la photo la plus à droite de la première rangée. Vol 1 s, taille exponentielle sur le temps, trajectoire qui ralentit au loin. À l'impact, le ballon s'écrase et se perd dans le filet ; les photos du premier écran reculent en onde depuis l'impact (perspective centrée sur l'impact, `elastic.out`) et s'allument (voile noir `--veil` 0,84 posé par le script). Les suivantes montent dans leur cadre en arrivant. Se joue de lui-même sur tous les écrans, une seule fois ; pas de tir si l'on arrive déjà plus bas. Mouvement réduit ou sans JavaScript : ni ballon ni voile.
- La découpe de la fenêtre est calculée à chaque image (`insetAt`) : l'interpolation de chaînes `inset()` par GSAP perd un côté ou se déforme selon l'arrondi.
- Les déclencheurs ScrollTrigger sont créés dans l'ordre de la page, puis `ScrollTrigger.refresh()`. Sinon les ouvertures sous la galerie handball se calculent avant sa hauteur.
- Ordre des chapitres : football (grille droite, la grille décalée a été abandonnée), basket (rangées qui glissent), football américain (mosaïque), handball en dernier (galerie latérale, à la taille des autres grilles : 4 portraits de front, 5 au-delà de 1 700 px ; chaque photo à sa largeur naturelle). Paysages et portraits mêlés dans les quatre galeries, sans case vide.
- Portraits jamais rognés au repos ; paysages en grille rognés de 4 % au plus (formats de l'appareil). Seul sur sa rangée (téléphone), un paysage garde son format. Visionneuse plein écran au clic : la photo grandit depuis sa vignette, entière.
- Scènes tenues seulement sur grand écran (`min-width: 1024px` et `min-height: 560px`). La tablette en portrait suit le téléphone.
- Au doigt (téléphone, tablette), les animations ne suivent pas le défilement : l'élan les ferait passer en un éclair. L'ouverture se joue d'elle-même en 1,3 s dès que la fenêtre est à l'écran, et se referme si l'on remonte. Rangées basket et galerie handball entrent en cascade.
- Mouvement réduit (réglage du système) : apparitions en fondu, aucun déplacement.
- À partir de 1 700 px : 5 colonnes (football, basket, mosaïque). La galerie est rangée à nouveau pour chaque nombre de colonnes ; trop peu de photos pour une rangée complète : moins de colonnes.

## Passages entre sports (en test, branche `design/passages`)
- But : montrer qu'on passe d'un monde à l'autre (football → basket → football américain → handball), avec du mouvement et de la place pour les photos. Code dans `app/_site/Passage.jsx`. Le premier chapitre (football) garde son ouverture « fenêtre ».
- Quatre propositions, en plus de « Fenêtre » (l'ouverture actuelle), à comparer sur la prévisualisation : barre « Passage » en haut à droite (cachée sur mattjno.com), ou `?passage=voyage|ballon|terrain|travelling` dans l'adresse.
  - Voyage (demandé par Matthieu le 25/10/2026 après avoir aimé Travelling et Terrain : « immersif, réaliste, style vidéo », se placer en photographe) : caméra en 3D CSS, pour les quatre sports, football compris. Couloir de stade sombre (plafonniers, bandes lumineuses au sol, photos du sport aux murs, la photo d'ouverture au bout comme la lumière du terrain) ; sortie au-dessus du terrain (surface : pelouse tondue, parquet, sol bleu ; lignes aux vraies dimensions ; projecteurs qui s'allument), survol, descente au ras du sol à main levée ; viseur (coins du cadre, collimateur sur le point d'action), mise au point du flou au net, obturateur (deux rideaux) ; rideaux fermés, la photo d'ouverture prend la place de la scène et le titre se lève. Repères de la caméra à s = 0 ; 0,32 ; 0,56 ; 0,8 ; déclenchement à 0,9. Terrain découpé en 16 bandes (une bande passée derrière la caméra disparaît : Safari dessine mal un plan qui traverse la caméra). Perspective posée sur `.vo`, parent direct du monde.
  - Ballon : le ballon du sport, dessiné, fait son geste (basket : dribble ; football américain : passe en spirale ; handball : tir vu du gardien), se pose sur le point d'action de la photo ; la photo apparaît dans le ballon, puis le cercle (l'ovale) s'ouvre jusqu'au plein écran.
  - Terrain : les lignes du terrain vu d'en haut se tracent en se couchant à plat ; la photo remplit le terrain, puis s'ouvre en plein écran. Terrain debout sur téléphone.
  - Travelling : une bande de photos du sport (entières) traverse l'écran de droite à gauche et pose au centre la photo d'ouverture, au format de l'écran ; elle grandit jusqu'au plein écran et la bande sort par les bords.
- Chaque passage ajoute un écran tenu (`--pre`) avant l'ouverture. Grand écran : tout suit le défilement. Au doigt : prélude en temps réel puis ouverture en 1,3 s, dès que l'ouverture a son haut à 20 % de l'écran. Mouvement réduit ou sans JavaScript : ni prélude ni calque.
- Les passages et la barre se placent au-dessus du titre du chapitre, mesuré (deux lignes pour « Football américain »).
- Une fois le choix fait par Matthieu : garder le passage retenu, retirer les autres et la barre, puis mettre cette section à jour.
