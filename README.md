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
VIEW: grid
FILTER: images
MEDIA:
LOCAL: Characters/Art/ recursive | Shared caption for folder items
LOCAL: Images/hero.png | Single file caption
URL: https://example.com/reference.jpg | Remote caption
```

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
| `grid` | Responsive grid (configurable columns in settings) |
| `thumbnails` | Compact square thumbnails |
| `carousel` | Single slide with prev/next controls |
| `masonry-h` | CSS column masonry |
| `masonry-v` | Multi-column vertical masonry |

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
| Grid columns | CSS grid-template-columns value (`auto` = responsive) |

## Commands

- **Insert media gallery** — opens the builder modal in the active note

## Migration from Gallery View (`obs-gallery`)

Gallery View used YAML inside an `obs-gallery` block. Media Gallery uses the OPTIONS/MEDIA format above. There is no automatic converter in v1.

| Gallery View (YAML) | Media Gallery |
|----------------------|---------------|
| `view: grid` | `VIEW: grid` |
| Local path in YAML sources | `LOCAL: path/to/folder recursive` |
| External URL list | `URL: https://...` |
| Immich / Nextcloud | Not supported — use local paths or direct image URLs |

Example manual conversion:

**Before (`obs-gallery`):**

```yaml
view: grid
sources:
  - type: local
    path: Characters/Art
    recursive: true
  - type: external
    urls:
      - https://example.com/photo.jpg
```

**After (`media-gallery`):**

```media-gallery
OPTIONS:
VIEW: grid
FILTER: images
MEDIA:
LOCAL: Characters/Art recursive
URL: https://example.com/photo.jpg
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

## License

MIT — see [LICENSE](LICENSE).
