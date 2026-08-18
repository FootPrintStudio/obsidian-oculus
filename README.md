# Oculus

FootPrintStudio plugin for [Obsidian](https://obsidian.md): galleries for local and remote media, plus a lightbox for ordinary note images.

The plugin **id** remains `media-gallery`. The display name is **Oculus**.

```oculus
OPTIONS:
VIEW: grid
FILTER: images
MEDIA:
LOCAL: Photos/
```

A folder path ending in `/` is recursive. Without the slash, only that folder is scanned. Full syntax is in **Settings → Guide** (or [docs/GUIDE.md](docs/GUIDE.md)).

## Features

- **Local media** — files, one-level folders, or recursive scans (`LOCAL: Photos/`)
- **Remote media** — images, direct video URLs, and hosted platforms (YouTube, Vimeo, …)
- **Views** — `grid`, `thumbnails`, `carousel`, `masonry-h`, `masonry-v`
- **Lightbox** — gallery tiles, plus wiki embeds and markdown images in notes
- **Media Extended** — desktop video / hosted URL playback when that plugin is installed
- **Builder** — command palette **Insert Oculus gallery**

## Install (BRAT)

Not in the Obsidian Community Plugins catalog. Install via [BRAT](https://github.com/TfTHacker/obsidian42-brat):

1. Enable **BRAT** in Community Plugins.
2. **Add Beta plugin** → `FootPrintStudio/obsidian-media-gallery`
3. Enable **Oculus** and reload Obsidian.

BRAT installs from [GitHub Releases](https://github.com/FootPrintStudio/obsidian-media-gallery/releases). Each release attaches `main.js`, `manifest.json`, `styles.css`, and `versions.json`.

### From source

```bash
cd /path/to/vault/.obsidian/plugins
git clone https://github.com/FootPrintStudio/obsidian-media-gallery.git media-gallery
cd media-gallery
./build.sh
```

Enable **Oculus** under Community plugins and reload Obsidian.

## Quick syntax

| Piece | Rule |
|-------|------|
| Fence | `oculus` (legacy `media-gallery` still works) |
| Recursive folder | Path **ends with `/`** |
| One-level folder | Path does **not** end with `/` |
| Caption | `LOCAL: Photos/shot.png \| Optional caption` |

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

## Develop / rebuild

```bash
./build.sh
```

Manual checks: [TESTING.md](TESTING.md). Language reference: [docs/GUIDE.md](docs/GUIDE.md).

## Credits

Oculus was inspired in part by [Gallery View](https://github.com/mkshp-dev/obsidian-gallery-plugin). Masonry layouts adapt algorithms from [Allusion](https://github.com/allusion-app/Allusion).

## License

MIT — see [LICENSE](LICENSE).
