# Starknet Gaming

Starknet Gaming is a static landing page and game directory for the Starknet gaming ecosystem. It helps players discover games, follow project links, join community channels, and explore infrastructure used by onchain games.

## Project Structure

```text
.
├── index.html
├── README.md
├── assets/
│   ├── brand/
│   │   ├── background.png
│   │   ├── community-world.png
│   │   └── hero-brand.png
│   └── logos/
│       ├── abyss.jpg
│       ├── art-peace.jpg
│       ├── blob-arena.jpg
│       ├── brove-royale.jpg
│       ├── cartridge.jpg
│       ├── corsair.jpg
│       ├── dark-shuffle.png
│       ├── dojo.jpg
│       ├── dope-wars.jpg
│       ├── gm-nft.jpg
│       ├── influence.jpg
│       ├── jokers-of-neon.jpg
│       ├── loot-survivor.png
│       ├── nums.jpg
│       ├── pistols-at-dawn.jpg
│       ├── ponziland.jpg
│       ├── realms-blitz.svg
│       ├── zap-football.jpg
│       └── zkube.png
└── docs/
    └── project-links.txt
```

## Features

- Responsive static site in `index.html`.
- Searchable and filterable game registry.
- Game cards grouped by category.
- X and Website links for every listed game.
- Project logos for all listed games.
- Purple hover highlight on game cards.
- Community, updates, and infrastructure sections.
- Footer links for Telegram, X, and the Starknet ecosystem explorer.

## Run Locally

Open `index.html` directly in a browser, or serve the folder with a static server:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://127.0.0.1:8000
```

## Updating Games

Game data lives in the `GAMES` array inside `index.html`.

Each game should include:

- `name`
- `cat`
- `status`
- `desc`
- `twitter`
- `website`
- `logo`

Store new logos in `assets/logos/` and use clean lowercase file names with hyphens.

## Source Links

Original project links are kept in `docs/project-links.txt`.

## Community Links

- [Telegram Channel](https://t.me/channel_starknet_gaming)
- [Official X](https://x.com/StarknetGaming)
- [Telegram Group](https://t.me/Starknet_Gaming)
- [Starknet Ecosystem](https://starknet-ecosystem.com/)
