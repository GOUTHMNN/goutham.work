# goutham.work

Personal portfolio for Goutham Satheesh. Plain HTML, CSS and JavaScript with a WebGL hero (Three.js r128, self-hosted). No build step, no framework, no tracking, and no external requests: fonts and libraries are served from this repo.

## What's in here

| Path | What it is |
|---|---|
| `index.html` | The whole site (one page) |
| `css/styles.css` | All styles (one dark, night-race look) |
| `js/scene.js` | The 3D circuit: 21,124 points, drag to spin, compound highlight buttons |
| `js/vendor/three.min.js` | Three.js r128 (MIT licence) |
| `fonts/` | Big Shoulders Display, Schibsted Grotesk, JetBrains Mono (all SIL Open Font Licence) |
| `js/main.js` | Quick menu (Ctrl/⌘ K), copy email, nav highlight, scroll reveals |
| `js/pitwall.js` | The pit-stop strategy simulator |
| `cv/Goutham-Satheesh-CV.pdf` | The CV the "Download CV" button serves |
| `img/` | Your photos and product screenshots, resized for the web |
| `assets/` | Favicon, Apple touch icon, social share image (`og.png`, 1200×630) |
| `CNAME` | Tells GitHub Pages the site lives at goutham.work |
| `404.html`, `robots.txt`, `sitemap.xml`, `site.webmanifest`, `.nojekyll` | Hosting extras |

## Put it live on goutham.work (GitHub Pages, free)

1. On GitHub, create a public repository, for example `goutham.work`.
2. Upload everything in this folder to the repository root (drag and drop works; make sure `.nojekyll` and `CNAME` go too).
3. Repository → **Settings → Pages** → Source: **Deploy from a branch**, Branch: `main`, folder `/ (root)` → Save.
4. Under **Custom domain** type `goutham.work` and save.
5. At your domain registrar, open DNS settings for goutham.work and add:

   | Type | Name/Host | Value |
   |---|---|---|
   | A | @ | 185.199.108.153 |
   | A | @ | 185.199.109.153 |
   | A | @ | 185.199.110.153 |
   | A | @ | 185.199.111.153 |
   | AAAA | @ | 2606:50c0:8000::153 |
   | AAAA | @ | 2606:50c0:8001::153 |
   | AAAA | @ | 2606:50c0:8002::153 |
   | AAAA | @ | 2606:50c0:8003::153 |
   | CNAME | www | gouthmnn.github.io |

   Delete any old "parking" A records or URL-forward records the registrar added.
6. Wait for the DNS check in Settings → Pages to go green (minutes to a few hours), then tick **Enforce HTTPS** (the certificate can take up to 24 hours).
7. Optional but recommended: in your GitHub profile settings → Pages, **verify the domain** so nobody else can claim it.

## Updating things

- **New CV:** replace `cv/Goutham-Satheesh-CV.pdf` with a file of the same name.
- **Email:** change it in `index.html` (search `Satheesh-G@ulster.ac.uk`) and in `js/main.js` (`var EMAIL`).
- **Photos:** live in `img/` in two sizes (for phones and desktops). To swap one, replace both files with the same names, or ask Claude to re-crop new ones.
- **Repo links:** each project's case study has a links row; add `<a href="https://github.com/...">Code</a>`.
- **Sitemap:** bump `<lastmod>` in `sitemap.xml` after big changes.

## After launch

- Run Lighthouse (Chrome DevTools → Lighthouse) and aim for 90+ in every category.
- Test the share card at https://www.opengraph.xyz/ by pasting goutham.work.
- Add the URL to LinkedIn (Contact info → Website) and the top of your CV.

## Notes on the 3D hero

- Phones get 14,000 points instead of 21,124, and the scene renders less often once you've scrolled past it, to save battery.
- If someone has *reduce motion* switched on, the circuit is drawn once and doesn't animate.
- If WebGL isn't available, a soft colour glow is shown instead and everything else works.
