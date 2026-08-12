# Media Gallery

FootPrintStudio plugin for Obsidian: render local, searched, and remote media in grid, thumbnail, carousel, and masonry layouts inside notes.

## Features

- **Local media** — single files, folders, or recursive folder scans
- **Title search** — build galleries from media filenames containing text within a folder
- **Remote media** — `URL:` lines for images, direct video links, and hosted platforms (YouTube, Vimeo, etc.)
- **Views** — `grid`, `thumbnails`, `carousel`, `masonry-h`, `masonry-v`
- **Filter** — `images`, `video`, or `all` (applies to LOCAL folder scans, SEARCH sources, and URL entries)
- **Lightbox** — prev/next, Escape, arrow keys, basic zoom on images, native video controls
- **Media Extended** — video playback via [Media Extended](https://github.com/aidenlx/media-extended) when installed (desktop); required for hosted platform URLs
- **Builder** — command palette **Insert media gallery** with live preview
- **Auto-refresh** — open galleries re-render when vault media files change

## Block syntax

Use a `media-gallery` fenced code block with two sections: **OPTIONS** and **MEDIA**.

```media-gallery
OPTIONS:
VIEW: grid | repeat(auto-fill, minmax(160px, 1fr))
FILTER: images
MEDIA:
LOCAL: Media Gallery Test/Assets/ recursive | From Assets folder
LOCAL: Media Gallery Test/Assets/sample.png | Single file (rename if needed)
SEARCH: Media/Art/2D recursive | Renaissance, Sculpture
```

### Search by media title

Use `SEARCH:` with a folder path and one or more literal title queries after `|`. Separate queries with commas. Matching is case-insensitive, uses the filename without its extension, and requires every query to match.

```media-gallery
OPTIONS:
VIEW: thumbnails | 120px
FILTER: images
MEDIA:
SEARCH: Media/Art/2D | Renaissance, Sculpture
SEARCH: Media/References recursive | blue period, sketch
```

Searches scan direct children by default. Append `recursive` or end the folder path with `/` to include subfolders. Empty comma-separated queries are rejected. The gallery `FILTER` still controls whether images, videos, or both are included.

### VIEW options — column layout (grid, thumbnails, masonry-v)

`grid`, `thumbnails`, and `masonry-v` share one column-option syntax. Append the same kind of value after `|` on the VIEW line:

| Syntax | Meaning |
|--------|---------|
| *(omit)* or `auto` | Responsive columns using the view’s default size (see below) |
| `3` | Fixed column count |
| `200px` | Target minimum column / tile width |
| `minmax(200px, 1fr)` | Uses the px minimum extracted from minmax |
| `repeat(auto-fill, minmax(160px, 1fr))` | Raw CSS `grid-template-columns` (**grid** and **thumbnails** only) |

Each view applies the parsed option differently:

| View | Default when `auto` | Applied as |
|------|---------------------|------------|
| `grid` | ~160px minimum column | CSS grid columns; tiles keep aspect ratio (`contain`) |
| `thumbnails` | ~96px minimum tile | CSS grid columns; square tiles (`cover`) |
| `masonry-v` | ~160px target column | Shortest-column masonry columns; heights from aspect ratio |

Examples:

```media-gallery
OPTIONS:
VIEW: grid | 3
FILTER: images
MEDIA:
LOCAL: Media Gallery Test/Assets/ recursive
```

```media-gallery
OPTIONS:
VIEW: thumbnails | 120px
FILTER: images
MEDIA:
LOCAL: Media Gallery Test/Assets/ recursive
```

```media-gallery
OPTIONS:
VIEW: masonry-v | 200px
FILTER: images
MEDIA:
LOCAL: Media Gallery Test/Assets/ recursive
```

### VIEW options (carousel only)

Append options after `|` on the VIEW line (comma-separated):

| Syntax | Result |
|--------|--------|
| `VIEW: carousel` | Default height (420px), no thumbnails |
| `VIEW: carousel \| 500px` | Main slide height 500px |
| `VIEW: carousel \| show` | Thumbnail strip under main slide |
| `VIEW: carousel \| 500px, show` | Both height and thumbnails |

### VIEW options (masonry-h only)

| Syntax | Result |
|--------|--------|
| `VIEW: masonry-h` | Default row height (200px), Allusion-style justified rows |
| `VIEW: masonry-h \| 300px` | Target row height 300px; rows scale to fill width |

### Parser rules

| Rule | Detail |
|------|--------|
| Sections | `OPTIONS:` then `MEDIA:` (either order for VIEW/FILTER before media lines) |
| VIEW / FILTER | One value each; duplicates are errors |
| LOCAL/URL captions | Pipe delimiter: `path-or-url \| caption` |
| Title search | `SEARCH: folder \| text, text`; every comma-separated query must match |
| Comments | Lines starting with `#` are ignored |
| List prefix | Optional leading `- ` on any line |
| Recursive | Append `recursive` after a folder path, or end path with `/` |
| URL entries | Direct image/video URLs (`.jpg`, `.mp4`, etc.) or hosted platforms (YouTube, Vimeo, Bilibili, Coursera) |

### VIEW values

| Value | Description |
|-------|-------------|
| `grid` | Responsive grid; optional `\| column layout` (shared syntax above) |
| `thumbnails` | Compact square thumbnails; optional `\| column layout` (shared syntax above) |
| `carousel` | Slideshow; optional `\| height, show` for px height and thumbnail strip |
| `masonry-h` | Allusion-style horizontal masonry; optional `\| 300px` row height |
| `masonry-v` | Allusion-style vertical masonry; optional `\| column layout` (shared syntax above) |

### FILTER values

| Value | Applies to |
|-------|------------|
| `images` | `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp` from LOCAL, SEARCH, and URL sources |
| `video` | `.mp4`, `.webm`, `.mov` from LOCAL, SEARCH, and URL sources, plus hosted platforms |
| `all` | Both image and video extensions |

FILTER affects **LOCAL folder scans**, **SEARCH sources**, and **URL entries** (by detected media kind). Single LOCAL files are included if their type is supported regardless of FILTER.

## Settings

Open **Settings → Community plugins → Media Gallery** (Settings | README tabs).

| Setting | Description |
|---------|-------------|
| Allow remote media | Enable or block `URL:` entries (images, direct video links, hosted platforms) |
| Validate remote Content-Type | Probe URL headers when extension is missing or validation is enabled |
| Remote request timeout | Milliseconds to wait for Content-Type probes |
| Use Media Extended for videos | Open local and direct URL videos in Media Extended when installed (desktop); hosted platform URLs always open in Media Extended |
| Show captions | Toggle caption display on tiles and lightbox |
| Caption max lines | Line clamp for tile captions (1–5) |
| Default view | Used when VIEW is omitted |

### URL media notes

**Direct links** (`.mp4`, `.webm`, `.mov`, image extensions):

- Need a recognizable extension or **Validate remote Content-Type** enabled.
- **CORS:** some hosts block in-browser preview in gallery tiles; playback may still work via Media Extended. Failed tiles show a warning above the gallery.
- With **Use Media Extended for videos** off, direct URL videos fall back to the native lightbox.

**Hosted platforms** (YouTube, Vimeo, Bilibili, Coursera):

- Require **Media Extended** on desktop; without it, entries show a resolve warning and are skipped.
- Tiles use platform thumbnails where available (YouTube, Vimeo) or a generic video poster.
- Click always opens Media Extended (no lightbox fallback).

## Commands

- **Insert media gallery** — opens the builder modal in the active markdown note (command palette or hotkey)

### Builder

The builder (**Insert media gallery**) helps compose a `media-gallery` block without memorizing syntax:

- Pick **view** and per-view layout options (columns, carousel height, masonry sizing)
- Set **filter** (`images` / `video` / `all`) — applies to LOCAL folder scans, SEARCH sources, and URL entries
- Add **local** vault paths, **folder title searches**, or **remote URLs** (images, direct `.mp4` links, YouTube/Vimeo/Bilibili/Coursera)
- Live **block preview** with copy-to-clipboard
- Drag source cards to reorder, or use move-up/down controls
- Quick-add shortcuts: **+ Local**, **+ Search**, **+ URL**, **+ YouTube**

Hosted platform URLs require Media Extended on desktop; the builder shows a note when that plugin is not installed.

Example hosted URL block:

```media-gallery
OPTIONS:
VIEW: grid
FILTER: video
MEDIA:
URL: https://www.youtube.com/watch?v=jNQXAC9IVRw | Sample video
URL: https://www.w3schools.com/html/mov_bbb.mp4 | Direct MP4
```

## Install from GitHub

```bash
cd /path/to/vault/.obsidian/plugins
git clone https://github.com/FootPrintStudio/obsidian-media-gallery.git media-gallery
cd media-gallery
chmod +x build.sh
./build.sh
```

Enable **Media Gallery** under Community plugins and reload Obsidian.

## Develop / rebuild

Local disk:

```bash
npm install
npm run build
```

Remote vault (recommended):

```bash
./build.sh
```

## Install (BRAT)

This plugin is not in the Obsidian Community Plugins catalog. Install via [BRAT](https://github.com/TfTHacker/obsidian42-brat):

1. Enable **BRAT** in Community Plugins.
2. **Add Beta plugin** → `FootPrintStudio/obsidian-media-gallery`
3. Install / update from BRAT when releases are published.

BRAT requires a [GitHub Release](https://github.com/FootPrintStudio/obsidian-media-gallery/releases) with `main.js`, `manifest.json`, `styles.css`, and `versions.json` attached.

## Credits

Media Gallery is an independent FootPrintStudio plugin with its own `media-gallery` block syntax and settings. It was inspired in part by [Gallery View](https://github.com/mkshp-dev/obsidian-gallery-plugin) — particularly the idea of embedding configurable media galleries directly in notes.

Masonry layouts (`masonry-h`, `masonry-v`) adapt algorithms from [Allusion](https://github.com/allusion-app/Allusion).

## License

MIT — see [LICENSE](LICENSE).
