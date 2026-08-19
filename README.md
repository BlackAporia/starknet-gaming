# Starknet Gaming

A public community hub and game directory for the Starknet gaming ecosystem.

The site helps players discover games, follow official project links, join Starknet Gaming community channels, and explore infrastructure used by onchain games.

## Live Site

The production site is deployed on **Vercel** and auto-updates from the `main` branch:

```text
https://starknet-gaming.com/
```

The project is fully static and can also be hosted on GitHub Pages, Netlify, Cloudflare Pages, or any static server.

## Features

- Responsive landing page for desktop and mobile.
- Searchable Starknet game registry (**18 games tracked**).
- Status filters: `All`, `Live`, `New`, `Beta`, `Soon`.
- Game cards grouped by category (`Strategy / MMO`, `Roguelike / Dungeon`, `Card Games`, `Action / PvP`, `Puzzle / Casual`, `Creative / Social`, `Sports / Fantasy`, `Cross-chain`).
- Official X and Website links for every listed game.
- Pending projects section for entries still being verified.
- Infrastructure cards (Dojo Engine, Cartridge).
- Partner cards (Aegis, StarkRelayHQ) with X and Website links.
- Featured games section.
- Community and ecosystem mission sections.
- Background music player (SoundCloud embed, "Phantom" by A.e.r.o. + Germind) with a persistent corner toggle, animated equalizer, and auto-loop.
- Visual polish: scroll progress bar, back-to-top button, scrollspy nav, reveal-on-scroll animations, count-up stats, cursor spotlight, hero orbs, reduced-motion support.
- Social previews: Open Graph and Twitter Card meta tags with a 1200×630 banner image.
- Language selector with custom translations for 8 languages.
- Fun fullscreen `Rocket Jump` mini game with nickname entry, combo bonuses, powerups, hazards, melody, and a shared leaderboard API with local fallback.

## Languages

The site includes a custom language selector for:

- English
- Chinese
- Korean
- Turkish
- Russian
- Hindi
- Ukrainian
- Spanish

The translation system is local JavaScript. It does not use Google Translate widgets or external translation iframes.

## Project Structure

```text
.
├── index.html
├── README.md
├── site.webmanifest
├── .gitignore
├── .nojekyll
├── api/
│   └── leaderboard.js
├── assets/
│   ├── brand/
│   │   ├── background.png
│   │   ├── community-world.png
│   │   └── hero-brand.png
│   └── logos/
│       ├── aegis.jpg
│       ├── abyss.jpg
│       ├── art-peace.jpg
│       ├── axe.jpg
│       ├── blob-arena.jpg
│       ├── brove-royale.jpg
│       ├── cartridge.jpg
│       ├── corsair.jpg
│       ├── dark-shuffle.png
│       ├── dojo.jpg
│       ├── dope-wars.jpg
│       ├── gm-nft.jpg
│       ├── header.jpeg
│       ├── influence.jpg
│       ├── jokers-of-neon.jpg
│       ├── loot-survivor.png
│       ├── nums.jpg
│       ├── pistols-at-dawn.jpg
│       ├── ponziland.jpg
│       ├── realms-blitz.svg
│       ├── social-card-v5.jpg
│       ├── starknet-gaming.png
│       ├── StarkRelayHQ.png
│       ├── zap-football.jpg
│       └── zkube.png
├── data/
│   └── rocket-jump-leaderboard.json
└── docs/
    └── project-links.txt
```

## Run Locally

Serve the folder with Python:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://127.0.0.1:8000
```

## Deployment (Vercel)

The site is connected to Vercel and redeploys automatically on every push to `main`.

The Rocket Jump leaderboard API needs these environment variables on the host:

```text
GITHUB_TOKEN=github fine-grained token with Contents read/write access
GITHUB_OWNER=blackaporia
GITHUB_REPO=starknet-gaming
GITHUB_BRANCH=main
```

If the API is unavailable, the game automatically falls back to a local leaderboard in the browser.

## Rocket Jump Leaderboard

The mini game reads and posts scores to `api/leaderboard` when the site is deployed with serverless API support. The API stores scores in `data/rocket-jump-leaderboard.json` through the GitHub Contents API.

## GitHub Pages Setup (alternative)

To publish this repository with GitHub Pages:

1. Open the repository on GitHub.
2. Go to `Settings`.
3. Open `Pages`.
4. Under `Build and deployment`, choose `Deploy from a branch`.
5. Select branch `main` and folder `/root`.
6. Save.

The included `.nojekyll` file keeps GitHub Pages from running Jekyll processing and serves the static assets directly.

## Updating Games

Game data lives in the `GAMES` array inside `index.html`.

Each game entry should include:

- `name`
- `cat`
- `status`
- `desc`
- `twitter`
- `website`
- `logo`

Store new logos in `assets/logos/` and use clean lowercase file names with hyphens, for example:

```text
new-game-logo.png
```

## Source Links

The original collected project links are kept in:

```text
docs/project-links.txt
```

## Community Links

- [Telegram Channel](https://t.me/channel_starknet_gaming)
- [Official X](https://x.com/StarknetGaming)
- [Telegram Group](https://t.me/Starknet_Gaming)
- [Starknet Ecosystem](https://starknet-ecosystem.com/)
