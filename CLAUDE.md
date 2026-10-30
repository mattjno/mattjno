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
- Hero plein écran : photos paysage en fondu enchaîné, alimentées par un dossier R2. « MATTJNO » sur une ligne en bas à gauche, « Sports Photographer » en petit juste au-dessus, comme konradborzy.com (26/10/2026), sans légende ni accroche.
- Section "PORTFOLIO" : grille de portraits verticaux 4:5, cadre blanc au survol, alimentée par un dossier R2.
- Fin de page : contact.
- Motion design à développer dans un second temps.

## Version A (en production depuis le 24/10/2026)
- Le site est une vitrine : ni adresse e-mail ni liste de clubs. Matthieu démarche les clubs lui-même par e-mail ou Instagram.
- Pas d'intro : la photo est là au premier instant, le nom se lève dessus en moins de 1,2 s. (Depuis le 26/10/2026, le chargement MATTJNO joue avant et son nom vient se poser sur celui de l'accueil : voir plus bas.)
- Un chapitre par sport. La fenêtre d'ouverture part du point d'action de la photo (`fx`, `fy` dans `photos.js`) et s'ouvre jusqu'au plein écran. Le même point centre le recadrage sur écran étroit.
- Grande ouverte et à l'écran, l'ouverture fait défiler les paysages du sport en fondu au fil du temps (4,5 s, fondu 1,4 s, léger recul comme à l'accueil). Refermée, elle revient à sa première photo. En pause quand l'onglet est caché.
- Football : les photos montent dans leur cadre en arrivant (découpe du bas vers le haut, léger recul de la photo), en cascade. « Le but » (un ballon dessiné qui frappait la lucarne de la grille, choisi le 24/10/2026) a été retiré à la demande de Matthieu le 25/10/2026 ; « plonger dans le O » avait été essayé puis écarté avant lui.
- La découpe de la fenêtre est calculée à chaque image (`insetAt`) : l'interpolation de chaînes `inset()` par GSAP perd un côté ou se déforme selon l'arrondi.
- Les déclencheurs ScrollTrigger sont créés dans l'ordre de la page, puis `ScrollTrigger.refresh()`. Sinon les ouvertures sous la galerie handball se calculent avant sa hauteur.
- Ordre des chapitres : football (grille droite, la grille décalée a été abandonnée), basket (rangées qui glissent), football américain (mosaïque), handball en dernier (galerie latérale, à la taille des autres grilles : 4 portraits de front, 5 au-delà de 1 700 px ; chaque photo à sa largeur naturelle). Paysages et portraits mêlés dans les quatre galeries, sans case vide.
- Portraits jamais rognés au repos ; paysages en grille rognés de 4 % au plus (formats de l'appareil). Seul sur sa rangée (téléphone), un paysage garde son format. Visionneuse plein écran au clic : la photo grandit depuis sa vignette, entière.
- Scènes tenues seulement sur grand écran (`min-width: 1024px` et `min-height: 560px`). La tablette en portrait suit le téléphone.
- Au doigt (téléphone, tablette), les animations ne suivent pas le défilement : l'élan les ferait passer en un éclair. L'ouverture se joue d'elle-même en 1,3 s dès que la fenêtre est à l'écran, et se referme si l'on remonte. Rangées basket et galerie handball entrent en cascade.
- Entrées au défilement (`arrive`) : tout élément encore sous l'écran est caché dès le chargement, puis entre à son déclencheur ; ce qui est déjà à l'écran ou au-dessus reste visible (page rechargée en cours de lecture). Ne jamais cacher un élément au moment où il entre (`fromTo` dans `onEnter` seul) : au doigt, l'élan l'amène à l'écran avant le déclencheur, la photo apparaît puis disparaît pour entrer (signalé par Matthieu le 30/10/2026).
- Mouvement réduit (réglage du système) : apparitions en fondu, aucun déplacement.
- À partir de 1 700 px : 5 colonnes (football, basket, mosaïque). La galerie est rangée à nouveau pour chaque nombre de colonnes ; trop peu de photos pour une rangée complète : moins de colonnes.

## Passages entre sports (branche `design/passages`, en ligne depuis le 26/10/2026)
- But : montrer qu'on passe d'un monde à l'autre (football → basket → football américain → handball), avec du mouvement et de la place pour les photos. Code dans `app/_site/Passage.jsx`. Le premier chapitre (football) garde son ouverture « fenêtre ».
- Matthieu a aimé Travelling et Terrain (24/10/2026). « Voyage » (couloir de stade et terrain en 3D, caméra qui survole) essayé le 25/10/2026 et écarté (« je n'aime pas du tout ») ; il en a gardé l'idée de voir dans l'appareil (viseur, autofocus, déclic). « Objectif » (son 300 mm dessiné en SVG, éclaté, la photo dans la lentille) essayé le 25/10/2026 et écarté : « moche, on voit que c'est fake ». Leçon : jamais de matériel dessiné ; du réalisme, il faut de vraies photos. Ses références : la vue éclatée en 3D d'un Sony A7 III (Pinterest, épingles 92394229853006452 et 1115907613935429673, même vidéo). Son objectif principal : Sony FE 300 mm f/2.8 GM OSS (blanc). Consigne : plaisant, simple, pas trop long, les photos d'abord.
- Trois propositions, en plus de « Fenêtre » (l'ouverture actuelle), à comparer sur la prévisualisation : barre « Passage » en haut à droite (cachée sur mattjno.com), ou `?passage=ballon|terrain|travelling` dans l'adresse.
  - Ballon : le ballon du sport, dessiné, fait son geste (basket : dribble ; football américain : passe en spirale ; handball : tir vu du gardien), se pose sur le point d'action de la photo ; la photo apparaît dans le ballon, puis le cercle (l'ovale) s'ouvre jusqu'au plein écran.
  - Terrain : les lignes du terrain vu d'en haut se tracent en se couchant à plat ; la photo remplit le terrain, puis s'ouvre en plein écran. Terrain debout sur téléphone.
  - Travelling : une bande de photos du sport (entières) traverse l'écran de droite à gauche et pose au centre la photo d'ouverture, au format de l'écran ; elle grandit jusqu'au plein écran et la bande sort par les bords.
- Chaque passage ajoute un écran tenu (`--pre`) avant l'ouverture. Grand écran : tout suit le défilement. Au doigt : prélude en temps réel puis ouverture en 1,3 s, dès que l'ouverture a son haut à 20 % de l'écran. Mouvement réduit ou sans JavaScript : ni prélude ni calque.
- Les passages et la barre se placent au-dessus du titre du chapitre, mesuré (deux lignes pour « Football américain »).
- Mis en ligne le 26/10/2026 sans choix de passage, à la demande de Matthieu (« tu peux mettre en ligne sur cette base ») : sur mattjno.com, « Fenêtre » (l'ouverture d'origine), sans barre. Les autres passages restent testables par `?passage=…`, en production comme en prévisualisation.
- Choix encore à faire par Matthieu. Ensuite : garder le passage retenu, retirer les autres et la barre, puis mettre cette section à jour.

## Accueil, chargement et curseur (en ligne depuis le 26/10/2026)
- Historique : le 25/10/2026, Matthieu a demandé un accueil à la manière de kinoria.studio (fond noir, son matériel derrière un nom énorme, chargement vu dans un viseur, curseur collimateur). Viseur remplacé le jour même par le chargement MATTJNO ; accueil « matériel » (sa photo du matériel, atténuée, derrière MATTJNO) abandonné le 26/10/2026 (« je n'aime pas la photo que j'ai prise ») : retour au hero de la version A. Code, photo et outils de détourage retirés (dans l'historique git, commit 02eb465). Ne pas les remettre sans qu'il le demande.
- Les photos de matériel envoyées par Matthieu en référence (visuels Sony, photos de sites et de photographes, une signée, une avec un logo, une de PCMag avec son filigrane) ne sont pas à lui : ne jamais les publier ni les versionner. Avant de publier une photo qu'il envoie, s'assurer qu'elle est de lui. Son matériel : Sony α1 II et FE 300 mm F2.8 GM OSS, α7 V et 70-200 mm F2.8 GM II.
- Accueil (26/10/2026) : le hero de la version A (photos du dossier R2 `hero/` en fondu enchaîné, léger recul), « MATTJNO » sur une ligne en bas à gauche et « Sports Photographer » en petit juste au-dessus, comme konradborzy.com. Les sports ne sont plus listés. Nom : Instrument Sans 700, `clamp(54px, 9vw, 152px)`, interlignage 0,9, interlettrage −0,02 em. Métier : 11 px, capitales espacées de 0,3 em, blanc à 65 %, 14 px au-dessus du nom. Bloc à 10 % du bas de l'écran (12 % sur téléphone). Une lettre par cache (`NAME`, Camera.jsx), comme le nom du chargement : même dessin, sans crénage. Sans chargement (déjà vu dans l'onglet), les lettres se lèvent l'une après l'autre (50 ms d'écart) et le métier suit.
- Chargement (Camera.jsx, `Loader`), à la manière de landonorris.com : demandé le 25/10/2026 (« plus simple et plus percutant »). Écran noir comme le site (`.ld-bg`, `--bg`), « MATTJNO » en blanc au centre, aux proportions du nom de l'accueil (seule la taille change) ; noir et blanc demandés par Matthieu le 26/10/2026 (« mon site est noir à la base »), l'écran était blanc avant ; les lettres se lèvent l'une après l'autre (0,9 s, décalage 0,07 s) en CSS dès le premier affichage (attendre le script faisait paraître le nom, disparaître, puis se lever) ; « Chargement N % » en bas. Tout chargé (la première photo du hero et la police ; au moins 1,2 s, au plus 4,5 s) : l'écran noir se relève comme un store (1 s) et le nom vole jusqu'à sa place en bas à gauche (1,1 s, `expo.inOut`). Il se pose exactement sur le nom de l'accueil, caché pendant le vol (`html.is-landing`), qui paraît alors d'un coup (`html.is-landed`) ; le métier vient ensuite. Demandé le 26/10/2026 quand le nom a quitté le centre de l'accueil (avant : on plongeait dans le second T). La première photo attend l'ouverture pour commencer son recul, et le fondu enchaîné démarre à l'atterrissage. Une fois par onglet (`sessionStorage` `mj-seen`, lu aussi dans layout.js) ; sans script, rien ; au pire il s'efface seul à 6 s. Mouvement réduit : lettres en fondu, puis l'écran s'efface. Page remise en haut au premier chargement.
- Entrées de l'accueil en CSS : `is-ready` change le nom de leurs animations (`pf-line-go`, `pf-rise-go`) pour qu'elles repartent de zéro à cet instant. Changer seulement le délai d'une animation déjà lancée la fait sauter à la fin quand le chargement a duré plus longtemps.
- Curseur (Camera.jsx, `FocusCursor`) : le collimateur d'autofocus, rouge ; vert et resserré sur un lien, un bouton, une photo ; pincé quand on clique ; caché sur les champs de saisie. Seulement avec une souris (`hover: hover` et `pointer: fine`).
