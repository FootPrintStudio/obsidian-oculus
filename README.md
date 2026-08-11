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
| Captions | Pipe delimiter: `path \| caption` |
| Comments | Lines starting with `#` are ignored |
| List prefix | Optional leading `- ` on any line |
| Recursive | Append `recursive` after a folder path, or end path with `/` |
| URL video | Not supported in v1 (images only) |

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
