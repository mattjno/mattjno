# MATTJNO — contexte du dépôt

Site portfolio de photographie sportive de Matthieu Jauneau (marque MATTJNO, mattjno.com, Instagram @matt.jno).

## Architecture
- Next.js (App Router), page unique. `app/page.js` (serveur) lit les photos dans R2 via `app/_site/data.js` et rend `app/_site/Portfolio.jsx` (client). Page régénérée toutes les 5 minutes (`revalidate = 300`).
- Photos hébergées sur Cloudflare R2, bucket `mattjno-photos`, URL publique `https://pub-9350dce8a12e41c091a228ca7b1d7d48.r2.dev/`.
- Dossiers du site dans R2 : `hero/`, `materiel/`, `football/`, `handball/`, `basketball/`, `football-americain/`. Matthieu y dépose ses exports sans les renommer. Les dossiers par match à la racine sont son archive, le site ne les lit pas.
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
- Pas d'intro : la photo est là au premier instant, le nom se lève dessus en moins de 1,2 s. (Remplacé le 25/10/2026 sur `design/passages` par le chargement dans le viseur et l'accueil matériel : voir plus bas.)
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
- Matthieu a aimé Travelling et Terrain (24/10/2026). « Voyage » (couloir de stade et terrain en 3D, caméra qui survole) essayé le 25/10/2026 et écarté (« je n'aime pas du tout ») ; il en a gardé l'idée de voir dans l'appareil (viseur, autofocus, déclic). « Objectif » (son 300 mm dessiné en SVG, éclaté, la photo dans la lentille) essayé le 25/10/2026 et écarté : « moche, on voit que c'est fake ». Leçon : jamais de matériel dessiné ; du réalisme, il faut de vraies photos. Ses références : la vue éclatée en 3D d'un Sony A7 III (Pinterest, épingles 92394229853006452 et 1115907613935429673, même vidéo). Son objectif principal : Sony FE 300 mm f/2.8 GM OSS (blanc). Consigne : plaisant, simple, pas trop long, les photos d'abord.
- Trois propositions, en plus de « Fenêtre » (l'ouverture actuelle), à comparer sur la prévisualisation : barre « Passage » en haut à droite (cachée sur mattjno.com), ou `?passage=ballon|terrain|travelling` dans l'adresse.
  - Ballon : le ballon du sport, dessiné, fait son geste (basket : dribble ; football américain : passe en spirale ; handball : tir vu du gardien), se pose sur le point d'action de la photo ; la photo apparaît dans le ballon, puis le cercle (l'ovale) s'ouvre jusqu'au plein écran.
  - Terrain : les lignes du terrain vu d'en haut se tracent en se couchant à plat ; la photo remplit le terrain, puis s'ouvre en plein écran. Terrain debout sur téléphone.
  - Travelling : une bande de photos du sport (entières) traverse l'écran de droite à gauche et pose au centre la photo d'ouverture, au format de l'écran ; elle grandit jusqu'au plein écran et la bande sort par les bords.
- Chaque passage ajoute un écran tenu (`--pre`) avant l'ouverture. Grand écran : tout suit le défilement. Au doigt : prélude en temps réel puis ouverture en 1,3 s, dès que l'ouverture a son haut à 20 % de l'écran. Mouvement réduit ou sans JavaScript : ni prélude ni calque.
- Les passages et la barre se placent au-dessus du titre du chapitre, mesuré (deux lignes pour « Football américain »).
- Une fois le choix fait par Matthieu : garder le passage retenu, retirer les autres et la barre, puis mettre cette section à jour.

## Accueil « matériel », chargement et curseur (en test sur `design/passages`, demandé le 25/10/2026)
- Référence de style donnée par Matthieu : kinoria.studio (fond noir, vrai appareil détouré devant un nom énorme, chargement vu dans un viseur, curseur collimateur). Leur appareil est une suite de photos détourées (objet et ombre séparés) jouée au défilement, pas un dessin.
- Accueil : fond noir, « MATTJNO » sur une ligne au centre (Instrument Sans, comme avant), au premier plan ; le matériel de Matthieu derrière, atténué (demande du 25/10/2026 : « en arrière-plan, moins visible, le MATTJNO prédominant »). Détouré (PNG) : au centre, opacité 0,5. Photographié à plat (JPEG) : tout le fond, opacité 0,3. Au-dessus du nom, ses réglages (`SETTINGS`, Portfolio.jsx) ; à droite « Sports Photographer », les sports, « Voir les photos » ; en bas à droite son matériel (`GEAR`) ; en bas à gauche « Défiler ». Téléphone : nom, métier, puis le matériel dessous. En descendant : le matériel remonte et rétrécit un peu, le reste s'efface.
- Photo de l'accueil : `public/materiel/kit-a-plat.webp` (1475 × 1066), tout le matériel de Matthieu étalé sur fond noir, vu de dessus : α1 II, α7 V, 300 mm F2.8 GM, 70-200 mm F2.8 GM II, 24-70 mm GM II, multiplicateur 1.4x, Viltrox 14 mm, monopode Manfrotto, MacBook. Image fournie par Matthieu le 25/10/2026, « pour le moment, on verra par la suite ». Elle remplit le fond (JPEG ou WebP = photo à plat), opacité 0,3 ; sur téléphone, cadrée sur les téléobjectifs blancs (`object-position: 70% 25%`). Ses dimensions sont écrites dans `GEAR_PHOTO` (data.js) : en ligne, le serveur ne relit pas `public/`.
- Photo précédente, gardée pour revenir en arrière : `public/materiel/alpha1-ii-300mm.png` (522 × 1290), son α1 II et son 300 mm posés sur la boîte de l'objectif, détourés avec `tools/detoure.swift` (Vision de macOS, comme « Copier le sujet » de Photos : aucun fond particulier nécessaire). Une photo déposée dans le dossier R2 `materiel/` remplace celle de `GEAR_PHOTO` (la plus récente) : PNG = détourée, au centre, opacité 0,5 ; JPEG = photo à plat, en fond. Sans aucune photo, l'accueil redevient celui de la version A (photos en fondu).
- Les photos de matériel envoyées par Matthieu en référence (visuels Sony, photos de sites et de photographes, une signée, une avec un logo, une de PCMag avec son filigrane) ne sont pas à lui : ne jamais les publier ni les versionner. Avant de publier une photo qu'il envoie, s'assurer qu'elle est de lui.
- Confirmés par Matthieu le 25/10/2026 : son matériel, Sony α1 II et FE 300 mm F2.8 GM OSS (`GEAR`), et ses réglages habituels, 300 mm · f/2.8 · 1/2000 s (`SETTINGS`). L'ISO 3200 du chargement est seulement un exemple d'affichage.
- Chargement (Camera.jsx, `Loader`) : le viseur du boîtier. Ses photos (accueil et première de chaque sport) passent en rafale, floues puis nettes à mesure que le tampon se remplit ; vues restantes qui descendent (208, une toutes les 40 ms), 3:2, RAW, AF-C, MATT.JNO ; 1/2000, F2.8, ±0.0, ISO 3200, jauge du tampon, pourcentage en rouge. À 100 % : collimateur et pourcentage au vert, obturateur (deux rideaux), il se rouvre sur l'accueil et le nom se lève (`html.is-ready`). Au moins 1,4 s, au plus 4,5 s ; attend l'image de l'accueil et les trois premières de la rafale. Trois photos par seconde au plus (pas de clignotement). Une fois par onglet (`sessionStorage` `mj-seen`, lu aussi dans layout.js) ; sans script, rien ; au pire il s'efface seul à 6 s et le nom se lève quand même. Page remise en haut au premier chargement.
- Curseur (Camera.jsx, `FocusCursor`) : le collimateur d'autofocus, rouge ; vert et resserré sur un lien, un bouton, une photo ; pincé quand on clique ; caché sur les champs de saisie. Seulement avec une souris (`hover: hover` et `pointer: fine`).
