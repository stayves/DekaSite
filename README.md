# Deka site

Marketing site for Deka — built with Vite + React.

## Develop

```bash
npm install
npm run dev
```

Opens at http://localhost:5173.

## Build

```bash
npm run build      # outputs to dist/
npm run preview    # serves dist/ at http://localhost:4173
```

## Where to drop the Windows installer

The download buttons link to **`/downloads/Deka-Setup.exe`**. To make the
installer downloadable:

1. Build your Electron installer in the `DekaApp` project (e.g. with
   `electron-builder`). It will produce something like
   `DekaApp/dist/Deka Setup 1.0.0.exe`.
2. Copy that file into `public/downloads/` and rename it to:

   ```
   public/downloads/Deka-Setup.exe
   ```

   Vite serves everything inside `public/` at the site root, so the file
   is then available at `/downloads/Deka-Setup.exe` in both `npm run dev`
   and the production build.

3. (Optional) If you want a different filename or path — say
   `Deka-1.2.0-Setup.exe` — change the `WIN_DOWNLOAD` constant in:

   - `src/components/Hero.jsx`
   - `src/components/CTA.jsx`

`.exe`, `.dmg`, and `.zip` files inside `public/downloads/` are
git-ignored so you do not bloat the repo with binary artifacts. When
you deploy, upload the installer manually to the host (Vercel, Netlify,
S3 + CloudFront, etc.) or pull it in during your CI build step.

### Hosting big binaries (recommended for >100 MB)

Most static hosts have a per-file size cap. If the installer is larger
than ~100 MB, host it elsewhere and change `WIN_DOWNLOAD` to the
absolute URL:

```js
const WIN_DOWNLOAD = 'https://github.com/your-org/deka/releases/download/v1.0.0/Deka-Setup.exe'
```

Good places to host the binary:

- **GitHub Releases** — free, fast CDN, version-tagged. Upload the
  `.exe` as a release asset and link to the asset URL.
- **Cloudflare R2 / AWS S3** — for a custom domain like
  `https://downloads.deka.app/Deka-Setup.exe`.
- **Vercel Blob / Netlify Large Media** — if you already host the site
  there.

## Project structure

```
DekaSite/
├── public/
│   ├── favicon.svg
│   └── downloads/                 ← drop installers here
├── src/
│   ├── components/                ← Nav, Hero, Features, Pricing, Login, Account, ...
│   ├── lib/
│   │   ├── supabase.js            ← Supabase client
│   │   ├── auth.jsx               ← AuthProvider + useAuth() hook
│   │   └── polar.js               ← Polar checkout helper
│   ├── styles/global.css
│   ├── App.jsx                    ← landing page (/)
│   └── main.jsx                   ← router + AuthProvider wiring
├── index.html
├── vite.config.js
└── package.json
```

## Auth + billing setup

Routes:

- `/` — landing page
- `/pricing` — Free / Pro $20·mo / Team tiers
- `/login` — email + password, magic link, Google, GitHub (Supabase)
- `/account` — signed-in user dashboard

### 1. Copy env file

```bash
cp .env.example .env.local
```

`.env.local` is gitignored. Fill in real values from the sources below.

### 2. Supabase (auth)

1. Create a project at https://supabase.com.
2. **Project Settings → API** → copy `Project URL` and `anon public` key into:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. **Authentication → URL Configuration** → add your local + production
   site URLs to "Site URL" and "Redirect URLs":
   - `http://localhost:5173`
   - `http://localhost:5173/account`
   - `http://localhost:5173/login`
   - your production origin + the same paths
4. **Authentication → Providers** — enable the ones you want:
   - **Email** is on by default (covers email/password + magic link).
   - **Google** — create an OAuth client at
     https://console.cloud.google.com/apis/credentials, set the redirect URL to
     the one Supabase shows you (`https://YOUR-PROJECT.supabase.co/auth/v1/callback`),
     paste client ID + secret into Supabase.
   - **GitHub** — register an OAuth app at
     https://github.com/settings/developers, callback URL is the same Supabase
     callback, paste client ID + secret into Supabase.

### 3. Polar (billing)

1. Sign up at https://polar.sh and create an organization.
2. Create a **Product** with a recurring monthly price of **$20 USD**.
3. Open the product → **Checkout Link** → copy the URL. It looks like:
   `https://buy.polar.sh/polar_cl_XXXXXXXXXX`.
4. Paste into `.env.local` as `VITE_POLAR_PRO_CHECKOUT_URL`.

The Pro CTA on `/pricing` opens that URL with the signed-in user's email and
Supabase user ID attached:

```
https://buy.polar.sh/polar_cl_xxx?customer_email=<email>&metadata[user_id]=<uuid>
```

When you're ready to gate features by subscription state, set up a Polar
webhook → Supabase Edge Function that writes to a `subscriptions` table keyed
on `metadata[user_id]`.

### 4. Run

```bash
npm install
npm run dev
```

Both `/pricing` and `/login` work without env vars (they show a friendly
banner). The Pro checkout button only opens once `VITE_POLAR_PRO_CHECKOUT_URL`
is set.
