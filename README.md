# Oculus

FootPrintStudio plugin for [Obsidian](https://obsidian.md): galleries for local, searched, and remote media, plus a lightbox for ordinary note images.

Plugin **id** is `oculus`. Fence language is **`oculus`**.

```oculus
VIEW: grid
FILTER: images
LOCAL: Photos/
SEARCH: Media/Art/ | Renaissance, Sculpture
```

A folder path ending in `/` is recursive. Without the slash, only that folder is scanned. `SEARCH` queries are comma-separated, case-insensitive, and all queries must match the filename without its extension. Full syntax is in **Settings → Guide** (or [docs/GUIDE.md](docs/GUIDE.md)).

## Features

- **Local media** — files, one-level folders, or recursive scans (`LOCAL: Photos/`)
- **Title search** — folder media whose filenames contain every comma-separated query
- **Remote media** — images, direct video URLs, and hosted platforms (YouTube, Vimeo, …)
- **Views** — `grid`, `thumbnails`, `carousel`, `masonry-h`, `masonry-v`
- **Lightbox** — gallery tiles, plus wiki embeds and markdown images in notes
- **Media Extended** — desktop video / hosted URL playback when that plugin is installed
- **Builder** — command palette **Insert Oculus gallery**, including draggable Search source cards

## Install (BRAT)

Not in the Obsidian Community Plugins catalog. Install via [BRAT](https://github.com/TfTHacker/obsidian42-brat):

1. Enable **BRAT** in Community Plugins.
2. **Add Beta plugin** → `FootPrintStudio/obsidian-oculus`
3. Enable **Oculus** and reload Obsidian.

BRAT installs from [GitHub Releases](https://github.com/FootPrintStudio/obsidian-oculus/releases). Each release attaches `main.js`, `manifest.json`, `styles.css`, and `versions.json`.

### From source

```bash
cd /path/to/vault/.obsidian/plugins
git clone https://github.com/FootPrintStudio/obsidian-oculus.git oculus
cd oculus
./build.sh
```

Enable **Oculus** under Community plugins and reload Obsidian.

## Quick syntax

| Piece | Rule |
|-------|------|
| Fence | `oculus` |
| Recursive folder | Path **ends with `/`** |
| One-level folder | Path does **not** end with `/` |
| Caption | `LOCAL: Photos/shot.png \| Optional caption` |
| Title search | `SEARCH: Photos/ \| portrait, night`; every query must match |
| Multiple sources | `LOCAL:` / `URL:` / `SEARCH:` with indented lines below |

VIEW and FILTER are optional. Defaults come from **Settings**.

Commas are reserved as SEARCH query separators and cannot be searched literally. Empty query segments are rejected.

Clicking `![[photo.png]]` or `![](photo.png)` opens the Oculus lightbox when **Lightbox note images** is on (default). Ctrl/Cmd-click keeps Obsidian’s viewer.

## Settings

Open **Settings → Community plugins → Oculus** (Settings | README | Guide).

| Setting | Description |
|---------|-------------|
| Allow remote media | Enable `URL:` entries |
| Validate remote Content-Type | Probe headers when the extension is missing |
| Remote request timeout | Milliseconds for Content-Type probes |
| Use Media Extended for videos | Local and direct URL videos in Media Extended (desktop) |
| Show captions / Caption max lines | Tile and lightbox captions |
| Lightbox note images | Wiki embeds and markdown images open the Oculus lightbox |
| Default view | Used when VIEW is omitted |
| Default filter | Used when FILTER is omitted (`all` by default) |

## Develop / rebuild

```bash
./build.sh
```

Manual checks: [TESTING.md](TESTING.md). Language reference: [docs/GUIDE.md](docs/GUIDE.md).

## Credits

Oculus was inspired in part by [Gallery View](https://github.com/mkshp-dev/obsidian-gallery-plugin). Masonry layouts adapt algorithms from [Allusion](https://github.com/allusion-app/Allusion).

## License

MIT — see [LICENSE](LICENSE).
