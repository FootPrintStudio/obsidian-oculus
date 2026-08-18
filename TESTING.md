# Oculus — manual test checklist

Use fixtures in `Media Gallery Test/` inside the Command Centre vault. Reload Obsidian after building the plugin.

## Prerequisites

- Build the plugin: `cd .obsidian/plugins/media-gallery && ./build.sh`
- Enable **Oculus** in Community plugins
- For LOCAL tests, add a few images (and optionally a short `.mp4`) under `Media Gallery Test/Assets/` — the vault may not ship with binary fixtures

## Fixtures

| File | What to verify |
|------|----------------|
| `Media Gallery Test/00 Index.md` | Hub linking to all test notes |
| `Media Gallery Test/01 Grid Local.md` | Grid view, LOCAL file + folder |
| `Media Gallery Test/02 Carousel URL.md` | Carousel + remote URL line |
| `Media Gallery Test/03 Masonry Views.md` | masonry-h and masonry-v blocks |
| `Media Gallery Test/04 Video Filter.md` | FILTER: video / all with local video |
| `Media Gallery Test/05 Error Cases.md` | Parse errors and warnings display |
| `Media Gallery Test/06 Refresh Test.md` | Add/remove file in watched folder; gallery updates |
| `Media Gallery Test/08 URL Video.md` | Direct URL video + FILTER |
| `Media Gallery Test/09 Hosted Video.md` | Hosted platform URLs + ME |
| `Media Gallery Test/10 Markdown Images.md` | Wiki embed + markdown image lightbox |

## Checklist

- [ ] `oculus` code blocks render in Reading view
- [ ] Legacy `media-gallery` fences still render
- [ ] `LOCAL: folder/` scans nested folders; `LOCAL: folder` is one level only
- [ ] Grid, thumbnails, carousel, masonry-h, masonry-v each display correctly
- [ ] Click tile opens lightbox; Prev/Next and arrow keys work; Escape closes
- [ ] Image zoom +/- works in lightbox
- [ ] Local video shows native controls in lightbox
- [ ] With Media Extended enabled: video tile opens in Media Extended player (desktop; local and direct URL)
- [ ] Direct `URL:` video (`.mp4`) renders when **Allow remote media** is on
- [ ] `URL:` video excluded when `FILTER: images`
- [ ] YouTube/Vimeo `URL:` renders poster tile when Media Extended is installed (desktop)
- [ ] Hosted platform tile click opens Media Extended (not lightbox)
- [ ] YouTube/Vimeo `URL:` shows resolve warning when Media Extended is missing
- [ ] CORS-blocked remote tile shows runtime warning above gallery
- [ ] Captions appear when enabled; hidden when disabled in settings
- [ ] `URL:` blocked when **Allow remote media** is off (warning shown)
- [ ] Duplicate VIEW or FILTER shows parse error panel
- [ ] Empty MEDIA section shows error
- [ ] **Insert Oculus gallery** command opens builder and inserts an `oculus` block at cursor
- [ ] Builder drag-reorder and copy block work
- [ ] Clicking `![[image]]` / `![](image)` in a note opens the Oculus lightbox; prev/next walks note images
- [ ] Ctrl/Cmd-click on a note image keeps Obsidian’s default behavior
- [ ] Vault create/delete/modify on media files refreshes open galleries (~750 ms debounce)
- [ ] Settings README tab renders plugin README
- [ ] Plugin disable removes gallery UI cleanly

## Refresh test procedure

1. Open **06 Refresh Test** in Reading view.
2. Note item count in the gallery (folder `Media Gallery Test/Assets/`).
3. Add or remove an image in that folder.
4. Within ~1 s the gallery should re-render without reloading the note.

## Build verification

```bash
cd .obsidian/plugins/media-gallery
./build.sh
```

Confirm `main.js` timestamp updates and Obsidian loads **Oculus** v1.5.0 from plugin settings.
