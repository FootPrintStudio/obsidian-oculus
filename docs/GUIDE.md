# Oculus — Guide

Complete reference for **Oculus** gallery blocks as implemented in v2.0.0.

Use an **`oculus`** fenced code block. Open notes in **Reading view** to see the gallery. The command **Insert Oculus gallery** builds a block with live preview.

```oculus
VIEW: grid | repeat(auto-fill, minmax(160px, 1fr))
FILTER: images
LOCAL: Photos/ | Recursive folder
LOCAL: Photos/cover.png | Single file
SEARCH: Media/Art/ | Renaissance, Sculpture
```

See **Settings → README** for install, BRAT, and credits.

---

## Block layout

| Part | Rule |
|------|------|
| Fence | `oculus` |
| VIEW / FILTER | Optional; one value each. Defaults come from Settings |
| Captions | Pipe delimiter: `path \| caption` |
| Comments | Lines starting with `#` are ignored |
| List prefix | Optional leading `- ` on any line |
| Multiple sources | Indent extra `LOCAL` / `URL` / `SEARCH` paths under an empty key |

`OPTIONS:` and `MEDIA:` headers are parse errors. Put every key at the top level.

```oculus
VIEW: grid
FILTER: images
LOCAL: Photos/
URL: https://example.com/shot.jpg | Remote still
```

---

## LOCAL paths

A trailing **`/`** is the recursive flag. There is no `recursive` keyword.

| Path | Meaning |
|------|---------|
| `Photos/image.png` | Single file |
| `Photos` | Folder, **this directory only** (not subfolders) |
| `Photos/` | Folder, **recursive** (all nested folders) |

Single entries use `LOCAL: path`. Several paths can sit on indented lines under `LOCAL:`:

```oculus
LOCAL: Resources/Media/2D
LOCAL:
	Resources/Media/3D/render1.png
	Resources/Media/Sketches/
```

Indent with a tab or two or more spaces. A filled `LOCAL: path` may also be followed by indented siblings of the same kind.

The retired `recursive` keyword is ignored if it is still present after a path, so `Photos/ recursive` still scans recursively because of the slash. Prefer `Photos/` in new blocks.

FILTER applies to **folder scans**. A single LOCAL file is included whenever its type is a supported image or video.

---

## SEARCH paths

SEARCH scans a folder and keeps media whose filename, without its extension, contains every query:

```oculus
SEARCH: Media/Art | Picasso
SEARCH:
	Media/Art/ | Renaissance, Sculpture
	Media/Photos | sunset
```

- Separate multiple queries with commas.
- Matching is normalized and case-insensitive.
- Every query must match (AND behavior).
- A trailing `/` scans subfolders; without it, only the selected folder is scanned.
- Empty query segments are errors.
- Commas are reserved separators and cannot be searched literally.
- The legacy `SEARCH: folder recursive | query` form remains readable; prefer a trailing `/`.

FILTER applies before title matching, so a SEARCH source only includes the selected media kinds.

---

## URL entries

```oculus
URL: https://example.com/photo.jpg | Direct image
URL:
	https://www.w3schools.com/html/mov_bbb.mp4 | Direct video
	https://www.youtube.com/watch?v=jNQXAC9IVRw | Hosted (Media Extended)
```

| Kind | Notes |
|------|-------|
| Direct image / video | Needs a recognized extension (`.jpg`, `.mp4`, …) or **Validate remote Content-Type** |
| Hosted platforms | YouTube, Vimeo, Bilibili, Coursera — require **Media Extended** on desktop |

**Allow remote media** must be on. Some hosts block in-browser preview (CORS); tiles then show a warning above the gallery.

---

## VIEW

One view per block. Options go after `|`. If VIEW is omitted, **Default view** from Settings is used.

### Column layout (grid, thumbnails, masonry-v)

| Syntax | Meaning |
|--------|---------|
| *(omit)* or `auto` | Responsive columns using the view’s default size |
| `3` | Fixed column count |
| `200px` | Target minimum column / tile width |
| `minmax(200px, 1fr)` | Uses the px minimum from minmax |
| `repeat(auto-fill, minmax(160px, 1fr))` | Raw CSS `grid-template-columns` (**grid** and **thumbnails** only) |

| View | Default when `auto` | Applied as |
|------|---------------------|------------|
| `grid` | ~160px minimum column | CSS grid; tiles keep aspect ratio (`contain`) |
| `thumbnails` | ~96px minimum tile | CSS grid; square tiles (`cover`) |
| `masonry-v` | ~160px target column | Shortest-column masonry |

```oculus
VIEW: grid | 3
FILTER: images
LOCAL: Photos/
```

```oculus
VIEW: thumbnails | 120px
LOCAL: Photos/
```

```oculus
VIEW: masonry-v | 200px
LOCAL: Photos/
```

### Carousel

Comma-separated options after `|`:

| Syntax | Result |
|--------|--------|
| `VIEW: carousel` | Default height (420px), no thumbnails |
| `VIEW: carousel \| 500px` | Main slide height 500px |
| `VIEW: carousel \| show` | Thumbnail strip under the main slide |
| `VIEW: carousel \| 500px, show` | Both |

### Horizontal masonry

| Syntax | Result |
|--------|--------|
| `VIEW: masonry-h` | Default row height (200px), justified rows |
| `VIEW: masonry-h \| 300px` | Target row height 300px |

---

## FILTER

| Value | Includes |
|-------|----------|
| `all` | Both images and video (default when FILTER is omitted) |
| `images` | `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp` |
| `video` | `.mp4`, `.webm`, `.mov`, and hosted platform URLs |

FILTER applies to LOCAL folder scans, SEARCH sources, and URL entries. Duplicate VIEW or FILTER lines are parse errors.

---

## Lightbox

### Gallery tiles

Click a tile to open the lightbox (prev/next, arrow keys, Escape, image zoom). Hosted videos always open in Media Extended when available. Local and direct URL videos follow **Use Media Extended for videos**.

### Note images

With **Lightbox note images** on (default), clicks on ordinary note images use the same lightbox:

- Wiki embeds: `![[photo.png]]`
- Markdown images: `![](photo.png)` / `![alt](https://…)`
- Prev/next walks other images in the same note view
- Ctrl/Cmd, Alt, or Shift+click keeps Obsidian’s default viewer
- Images inside an `oculus` gallery still use gallery tiles

---

## Builder

Command palette: **Insert Oculus gallery**.

- Pick view and per-view layout options
- Set filter (`all` / `images` / `video`)
- Add local vault paths, folder title searches, or remote URLs
- End a folder path with `/` for a recursive scan
- Live block preview, copy, drag-reorder

The inserted fence is `oculus`. Consecutive sources of the same kind are written as an indented list.

---

## Settings

All options are under **Settings → Community plugins → Oculus**.

| Setting | Effect |
|---------|--------|
| Allow remote media | Enable or block `URL:` entries |
| Validate remote Content-Type | Probe URL headers when the extension is missing |
| Remote request timeout | Milliseconds to wait for Content-Type probes |
| Use Media Extended for videos | Open local and direct URL videos in Media Extended (desktop) |
| Show captions | Captions on tiles and in the lightbox |
| Caption max lines | Line clamp for tile captions (1–5) |
| Lightbox note images | Click wiki embeds and markdown images to open the Oculus lightbox |
| Default view | Used when VIEW is omitted |
| Default filter | Used when FILTER is omitted |

Hosted platform URLs (YouTube, Vimeo, Bilibili, Coursera) always require Media Extended on desktop.

---

## Errors and refresh

- Parse problems (duplicate VIEW, retired `OPTIONS:` / `MEDIA:` headers, bad URL scheme) show a red panel on the block.
- Missing folders, empty scans, and blocked remote URLs show yellow warnings; the gallery still renders whatever resolved.
- Open galleries refresh about 750 ms after vault create/delete/rename/modify of image or video files.
