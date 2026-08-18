# Oculus

FootPrintStudio plugin for Obsidian: render local vault media and remote images/videos in grid, thumbnail, carousel, and masonry layouts. Clicks on ordinary note images also open the Oculus lightbox.

The plugin **id** remains `media-gallery`. The display name is **Oculus**.

## Features

- **Local media** — single files, folders (one level), or recursive folder scans (`LOCAL: Photos/`)
- **Remote media** — `URL:` lines for images, direct video links, and hosted platforms (YouTube, Vimeo, etc.)
- **Views** — `grid`, `thumbnails`, `carousel`, `masonry-h`, `masonry-v`
- **Filter** — `images`, `video`, or `all` (applies to LOCAL folder scans and URL entries)
- **Lightbox** — prev/next, Escape, arrow keys, basic zoom on images, native video controls
- **Note images** — wiki embeds (`![[photo.png]]`) and markdown images (`![](photo.png)`) open the same lightbox
- **Media Extended** — video playback via [Media Extended](https://github.com/aidenlx/media-extended) when installed (desktop); required for hosted platform URLs
- **Builder** — command palette **Insert Oculus gallery** with live preview
- **Auto-refresh** — open galleries re-render when vault media files change

## Block syntax

Use an `oculus` fenced code block with two sections: **OPTIONS** and **MEDIA**. Legacy `media-gallery` fences still render.

```oculus
OPTIONS:
VIEW: grid | repeat(auto-fill, minmax(160px, 1fr))
FILTER: images
MEDIA:
LOCAL: Media Gallery Test/Assets/ | From Assets folder
LOCAL: Media Gallery Test/Assets/sample.png | Single file (rename if needed)
```

### LOCAL paths

| Path | Meaning |
|------|---------|
| `Photos/image.png` | Single file |
| `Photos` | Folder, **this directory only** (not subfolders) |
| `Photos/` | Folder, **recursive** (all nested folders) |

A trailing `/` is the recursive flag. The old `recursive` keyword is ignored if present.

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

```oculus
OPTIONS:
VIEW: grid | 3
FILTER: images
MEDIA:
LOCAL: Media Gallery Test/Assets/
```

```oculus
OPTIONS:
VIEW: thumbnails | 120px
FILTER: images
MEDIA:
LOCAL: Media Gallery Test/Assets/
```

```oculus
OPTIONS:
VIEW: masonry-v | 200px
FILTER: images
MEDIA:
LOCAL: Media Gallery Test/Assets/
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
| Fence | `oculus` (legacy `media-gallery` still works) |
| Sections | `OPTIONS:` then `MEDIA:` (either order for VIEW/FILTER before media lines) |
| VIEW / FILTER | One value each; duplicates are errors |
| Captions | Pipe delimiter: `path \| caption` |
| Comments | Lines starting with `#` are ignored |
| List prefix | Optional leading `- ` on any line |
| Recursive | Folder path **ends with `/`** |
| Non-recursive folder | Folder path **does not** end with `/` |
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
| `images` | `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp` |
| `video` | `.mp4`, `.webm`, `.mov`, and hosted platform URLs |
| `all` | Both image and video extensions |

FILTER affects **LOCAL folder scans** and **URL entries** (by detected media kind). Single LOCAL files are included if their type is supported regardless of FILTER.

## Note-image lightbox

With **Lightbox note images** on (default), clicks on standard note images open the Oculus lightbox instead of Obsidian’s built-in viewer:

- Wiki embeds: `![[photo.png]]`
- Markdown images: `![](photo.png)` / `![alt](https://…)`
- Prev/next walks the other images in the same note view
- Ctrl/Cmd, Alt, or Shift+click keeps Obsidian’s default behavior
- Gallery tiles are unchanged (they always use the lightbox)

## Settings

Open **Settings → Community plugins → Oculus** (Settings | README tabs).

| Setting | Description |
|---------|-------------|
| Allow remote media | Enable or block `URL:` entries (images, direct video links, hosted platforms) |
| Validate remote Content-Type | Probe URL headers when extension is missing or validation is enabled |
| Remote request timeout | Milliseconds to wait for Content-Type probes |
| Use Media Extended for videos | Open local and direct URL videos in Media Extended when installed (desktop); hosted platform URLs always open in Media Extended |
| Show captions | Toggle caption display on tiles and lightbox |
| Caption max lines | Line clamp for tile captions (1–5) |
| Lightbox note images | Click wiki embeds and markdown images to open the Oculus lightbox |
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

- **Insert Oculus gallery** — opens the builder modal in the active markdown note (command palette or hotkey)

### Builder

The builder helps compose an `oculus` block without memorizing syntax:

- Pick **view** and per-view layout options (columns, carousel height, masonry sizing)
- Set **filter** (`images` / `video` / `all`) — applies to folder scans and URL entries
- Add **local** vault paths or **remote URLs** (images, direct `.mp4` links, YouTube/Vimeo/Bilibili/Coursera)
- End a folder path with `/` for a recursive scan
- Live **block preview** with copy-to-clipboard
- Drag source cards to reorder, or use move-up/down controls
- Quick-add shortcuts: **+ Local**, **+ URL**, **+ YouTube**

Hosted platform URLs require Media Extended on desktop; the builder shows a note when that plugin is not installed.

Example hosted URL block:

```oculus
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

Enable **Oculus** under Community plugins and reload Obsidian.

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

Oculus is an independent FootPrintStudio plugin. It was inspired in part by [Gallery View](https://github.com/mkshp-dev/obsidian-gallery-plugin) — particularly the idea of embedding configurable media galleries directly in notes.

Masonry layouts (`masonry-h`, `masonry-v`) adapt algorithms from [Allusion](https://github.com/allusion-app/Allusion).

## License

MIT — see [LICENSE](LICENSE).
