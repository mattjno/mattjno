# MATT.JNO — Portfolio sport

Site Next.js (App Router) en **une seule page**. Les photos sont hébergées sur
**Cloudflare R2** et listées automatiquement dans `public/site.json` par une
GitHub Action. Pour ajouter un match : déposer un dossier de photos dans R2 → lancer l'action.

## Lancer en local
```bash
npm install
npm run dev        # http://localhost:3000
```
Le site lit `public/site.json` (un fichier de démarrage est déjà inclus).

## Régénérer le manifest depuis R2
```bash
R2_ACCOUNT_ID=… R2_ACCESS_KEY_ID=… R2_SECRET_ACCESS_KEY=… R2_BUCKET=mattjno-photos \
NEXT_PUBLIC_PHOTO_BASE=https://pub-xxxx.r2.dev/ npm run manifest
```

## Mettre en ligne (GitHub + Vercel)

### 1. Pousser sur GitHub
```bash
git init
git add .
git commit -m "Nouveau site MATT.JNO + R2"
git branch -M main
git remote add origin https://github.com/<toi>/<repo>.git
git push -u origin main
```

### 2. Récupérer tes infos R2 (dashboard Cloudflare → R2)
- **URL publique** : bucket → *Settings* → *Public access* → active le *R2.dev subdomain*
  (`https://pub-xxxx.r2.dev`) ou connecte un domaine. → c'est `NEXT_PUBLIC_PHOTO_BASE` (avec `/` final).
- **Jeton d'API** : *Manage R2 API Tokens* → *Create API Token* (Read) → Access Key ID + Secret.
  L'**Account ID** est affiché en haut de la page R2.

### 3. GitHub → Settings → Secrets and variables → Actions
- **Secrets** : `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`
- **Variable** : `NEXT_PUBLIC_PHOTO_BASE` = ton URL publique R2

### 4. Connecter Vercel
1. [vercel.com](https://vercel.com) → **Add New… → Project** → importe ton repo GitHub.
2. Framework détecté : **Next.js** → laisse les réglages par défaut → **Deploy**.
3. *(optionnel)* Pour le formulaire de contact : Project → **Settings → Environment Variables**
   → ajoute `RESEND_API_KEY` et `CONTACT_EMAIL`.
4. Chaque `git push` sur `main` redéploie automatiquement. Les URLs d'images sont déjà
   dans `site.json`, donc **aucune autre variable Vercel n'est nécessaire**.

### 5. Première génération depuis R2
GitHub → onglet **Actions** → *Update site manifest (R2)* → **Run workflow**.
→ `public/site.json` est régénéré et commit → Vercel redéploie.

## Ajouter un match
1. Crée un dossier dans R2 : `2026-05-12-USOvsNantes/` (date + équipes séparées par `vs`).
2. Dépose les photos (versions web légères) dedans.
3. *(autre sport ?)* ajoute un fichier `meta.json` dans le dossier : `{ "sport": "Basket" }`
   — sinon **Football** par défaut. Tu peux aussi corriger les noms :
   `{ "sport": "Football", "home": "Créteil", "away": "Istres" }`.
4. GitHub → Actions → **Run workflow**. Le match apparaît, le plus récent en haut.

## Migrer Backblaze → R2 (une fois)
```bash
rclone copy b2:mattjno-photos r2:mattjno-photos --transfers 16 --progress
```
(Les dossiers de matchs doivent finir à la racine du bucket R2.)

## Structure
```
app/
  page.jsx          → la page unique (design Match Day)
  layout.js         → polices + métadonnées
  globals.css       → reset + keyframes
  api/contact/route.js → formulaire de contact (Resend, optionnel)
scripts/
  generate-manifests.mjs → liste R2 → public/site.json
.github/workflows/
  update-manifest.yml    → régénère le manifest (manuel ou à chaque push)
public/
  site.json         → données du site (généré)
```
