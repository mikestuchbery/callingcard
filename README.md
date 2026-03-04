# mikestuchbery — profile

Personal profile site. Built with React + Vite. Deploys to Vercel or GitHub Pages.

## Stack

- React 18
- Vite 5
- Syne (Google Fonts) — single typeface, all weights
- GitHub API for live repo data

## Setup

```bash
npm install
npm run dev
```

## Customise

Everything you need to edit lives at the top of `src/App.jsx` in the `CONFIG` object:

```js
const CONFIG = {
  name:      { first: 'Mike', last: 'Stuchbery' },
  handle:    'mikestuchbery',          // GitHub username
  roles:     ['Historian', ...],
  tagline:   '...',
  pinned:    ['roadtripperde', 'timeline-de'],   // exact repo names, in display order
  expertise: [...],
  social:    [{ label: 'Email', href: '...' }, ...],
}
```

To change which repos appear, edit the `pinned` array. The page fetches all your repos and filters to the names listed, in the order listed.

## Deploy — Vercel (recommended)

1. Push to GitHub
2. Import repo at vercel.com
3. Framework preset: **Vite**
4. Deploy — done. No environment variables needed.

## Deploy — GitHub Pages

Add to `vite.config.js`:
```js
base: '/your-repo-name/',
```

Then add this GitHub Action at `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build
      - uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

## Theme

Dark by default. Light mode toggle in the nav. Preference persisted to `localStorage`.

## Structure

```
src/
  App.jsx      — everything (single component file, easy to reason about)
  index.css    — reset, CSS variables, animation keyframes
  main.jsx     — React entry point
index.html     — Vite entry, font preloads
```
