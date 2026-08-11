# Media Gallery

FootPrintStudio plugin for Obsidian: render local vault media and remote images in grid, thumbnail, carousel, and masonry layouts inside notes.

## Features

- **Local media** — single files, folders, or recursive folder scans
- **Remote images** — `URL:` lines (optional; toggle in settings)
- **Views** — `grid`, `thumbnails`, `carousel`, `masonry-h`, `masonry-v`
- **Filter** — `images`, `video`, or `all` (applies to LOCAL folder scans)
- **Lightbox** — prev/next, Escape, arrow keys, basic zoom on images, native video controls
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
```

### VIEW options (grid only)

Append column layout after `|` on the VIEW line:

| Value | Result |
|-------|--------|
| `VIEW: grid` | Responsive auto columns (default) |
| `VIEW: grid \| auto` | Same as default |
| `VIEW: grid \| 3` | Fixed 3-column grid |
| `VIEW: grid \| 200px` | ~200px minimum column width |
| `VIEW: grid \| repeat(auto-fill, minmax(160px, 1fr))` | Raw CSS `grid-template-columns` |

### VIEW options (thumbnails only)

Same column conventions as grid; default auto uses ~96px minimum tile size:

| Value | Result |
|-------|--------|
| `VIEW: thumbnails` | Responsive auto columns (~96px tiles) |
| `VIEW: thumbnails \| auto` | Same as default |
| `VIEW: thumbnails \| 3` | Fixed 3 columns |
| `VIEW: thumbnails \| 120px` | ~120px minimum tile size |
| `VIEW: thumbnails \| repeat(auto-fill, minmax(120px, 1fr))` | Raw CSS `grid-template-columns` |

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

### VIEW options (masonry-v only)

Append column width after `|` on the VIEW line (same conventions as grid columns):

| Syntax | Result |
|--------|--------|
| `VIEW: masonry-v` | Responsive auto columns (~160px target width) |
| `VIEW: masonry-v \| auto` | Same as default |
| `VIEW: masonry-v \| 200px` | ~200px target column width |
| `VIEW: masonry-v \| 3` | Fixed 3 columns |
| `VIEW: masonry-v \| minmax(200px, 1fr)` | Uses 200px minimum from minmax |

### Parser rules

| Rule | Detail |
|------|--------|
| Sections | `OPTIONS:` then `MEDIA:` (either order for VIEW/FILTER before media lines) |
| VIEW / FILTER | One value each; duplicates are errors |
| Captions | Pipe delimiter: `path \| caption` |
| Comments | Lines starting with `#` are ignored |
| List prefix | Optional leading `- ` on any line |
| Recursive | Append `recursive` after a folder path, or end path with `/` |
| URL video | Not supported in v1 (images only) |

### VIEW values

| Value | Description |
|-------|-------------|
| `grid` | Responsive grid; optional `\| columns` for layout (see above) |
| `thumbnails` | Compact square thumbnails; optional `\| columns` for layout (see above) |
| `carousel` | Slideshow; optional `\| height, show` for px height and thumbnail strip |
| `masonry-h` | Allusion-style horizontal masonry; optional `\| 300px` row height |
| `masonry-v` | Allusion-style vertical masonry; optional `\| column width` (see above) |

### FILTER values

| Value | Applies to |
|-------|------------|
| `images` | `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp` |
| `video` | `.mp4`, `.webm`, `.mov` |
| `all` | Both image and video extensions |

FILTER affects **LOCAL folder scans** only. Single LOCAL files and URL entries are included if their type is supported.

## Settings

Open **Settings → Community plugins → Media Gallery** (Settings | README tabs).

| Setting | Description |
|---------|-------------|
| Allow remote images | Enable or block `URL:` entries |
| Show captions | Toggle caption display on tiles and lightbox |
| Caption max lines | Line clamp for tile captions (1–5) |
| Default view | Used when VIEW is omitted |

## Commands

- **Insert media gallery** — opens the builder modal in the active note

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

## Credits

Media Gallery is an independent FootPrintStudio plugin with its own `media-gallery` block syntax and settings. It was inspired in part by [Gallery View](https://github.com/mkshp-dev/obsidian-gallery-plugin) — particularly the idea of embedding configurable media galleries directly in notes.

Masonry layouts (`masonry-h`, `masonry-v`) adapt algorithms from [Allusion](https://github.com/allusion-app/Allusion).

## License

MIT — see [LICENSE](LICENSE).
