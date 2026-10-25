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
- Pas d'intro : la photo est là au premier instant, le nom se lève dessus en moins de 1,2 s. (Remplacé le 25/10/2026 sur `design/passages` par le chargement MATTJNO et l'accueil matériel : voir plus bas.)
- Un chapitre par sport. La fenêtre d'ouverture part du point d'action de la photo (`fx`, `fy` dans `photos.js`) et s'ouvre jusqu'au plein écran. Le même point centre le recadrage sur écran étroit.
- Grande ouverte et à l'écran, l'ouverture fait défiler les paysages du sport en fondu au fil du temps (4,5 s, fondu 1,4 s, léger recul comme à l'accueil). Refermée, elle revient à sa première photo. En pause quand l'onglet est caché.
- Football : les photos montent dans leur cadre en arrivant (découpe du bas vers le haut, léger recul de la photo), en cascade. « Le but » (un ballon dessiné qui frappait la lucarne de la grille, choisi le 24/10/2026) a été retiré à la demande de Matthieu le 25/10/2026 ; « plonger dans le O » avait été essayé puis écarté avant lui.
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
- Accueil : fond noir, « MATTJNO » sur une ligne au centre (Instrument Sans, comme avant), au premier plan, son haut à 26 % de la hauteur de l'écran (`--name-top`, entre 120 et 300 px ; descendu le 25/10/2026 à la demande de Matthieu) ; le matériel de Matthieu derrière, atténué (demande du 25/10/2026 : « en arrière-plan, moins visible, le MATTJNO prédominant »). Détouré (PNG) : au centre, opacité 0,5. Photographié à plat (JPEG) : tout le fond, opacité 0,3. À droite « Sports Photographer », les sports, « Voir les photos » ; en bas à droite son matériel (`GEAR`) ; en bas à gauche « Défiler ». Téléphone : nom, puis métier dessous. En descendant : le matériel remonte et rétrécit un peu, le reste s'efface.
- Photo de l'accueil : `public/materiel/kit.jpg` (2000 × 1500), la photo de Matthieu de tout son matériel étalé sur du cuir noir, vu de dessus (70-200 mm F2.8 GM II, 300 mm F2.8 GM, α7 V, α1 II, monopode Manfrotto, 24-70 mm GM II, batteries), envoyée le 25/10/2026 comme « la dernière photo à prendre en compte », à garder telle quelle : aucune retouche. Tout le fond, opacité 0,3 ; sur téléphone, cadrée sur le 300 mm et les boîtiers (`object-position: 45% 35%`). Ses dimensions sont écrites dans `GEAR_PHOTO` (data.js) : en ligne, le serveur ne relit pas `public/`.
- Photos précédentes retirées du dépôt le 25/10/2026 (dans l'historique git) : `kit-noir.jpg` (sa photo sur parquet, posée sur fond noir avec `tools/fond-noir.swift`) et `alpha1-ii-300mm.png` (détourée avec `tools/detoure.swift`). Les deux outils restent pour une prochaine photo. Une photo déposée dans le dossier R2 `materiel/` remplace celle de `GEAR_PHOTO` (la plus récente) : PNG = détourée, au centre, opacité 0,5 ; JPEG = photo à plat, en fond. Sans aucune photo, l'accueil redevient celui de la version A (photos en fondu).
- Les photos de matériel envoyées par Matthieu en référence (visuels Sony, photos de sites et de photographes, une signée, une avec un logo, une de PCMag avec son filigrane) ne sont pas à lui : ne jamais les publier ni les versionner. Avant de publier une photo qu'il envoie, s'assurer qu'elle est de lui.
- Matériel confirmé par Matthieu le 25/10/2026 : Sony α1 II et FE 300 mm F2.8 GM OSS, α7 V et 70-200 mm F2.8 GM II (`GEAR`). Ses réglages habituels (300 mm · f/2.8 · 1/2000 s), affichés un temps au-dessus du nom, ont été retirés à sa demande le 25/10/2026.
- Chargement (Camera.jsx, `Loader`), à la manière de landonorris.com : demandé le 25/10/2026 (« plus simple et plus percutant ») à la place du viseur, dont on ne comprenait pas le sens. Écran blanc, « MATTJNO » en noir au centre, les lettres se lèvent l'une après l'autre (0,9 s, décalage 0,07 s), en CSS dès le premier affichage (attendre le script faisait paraître le nom, disparaître, puis se lever), « Chargement N % » en bas. L'écran est en mode `screen` : ses lettres noires sont des fenêtres sur l'accueil. Tout chargé (l'image de l'accueil ; au moins 1,2 s, au plus 4,5 s), on plonge dans la hampe du second T (×90 en 0,95 s, `power4.in`, centre mesuré sur le dessin de la lettre) : la photo de l'accueil paraît dans les lettres puis couvre l'écran ; le nom de l'accueil se lève ensuite (`html.is-dive` : 750 ms de plus), pour ne pas voir un second MATTJNO dans les lettres. Une fois par onglet (`sessionStorage` `mj-seen`, lu aussi dans layout.js) ; sans script, rien ; au pire il s'efface seul à 6 s. Mouvement réduit : lettres en fondu, puis l'écran s'efface, sans fenêtres. Page remise en haut au premier chargement.
- Entrées de l'accueil en CSS : `is-ready` change le nom de leurs animations (`pf-line-go`, `pf-rise-go`) pour qu'elles repartent de zéro à cet instant. Changer seulement le délai d'une animation déjà lancée la fait sauter à la fin quand le chargement a duré plus longtemps.
- Curseur (Camera.jsx, `FocusCursor`) : le collimateur d'autofocus, rouge ; vert et resserré sur un lien, un bouton, une photo ; pincé quand on clique ; caché sur les champs de saisie. Seulement avec une souris (`hover: hover` et `pointer: fine`).
