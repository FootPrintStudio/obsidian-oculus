# Media Gallery — manual test checklist

Use fixtures in `Media Gallery Test/` inside the Command Centre vault. Reload Obsidian after building the plugin.

## Prerequisites

- Build the plugin: `cd .obsidian/plugins/media-gallery && ./build.sh`
- Enable **Media Gallery** in Community plugins
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

## Checklist

- [ ] `media-gallery` code blocks render in Reading view
- [ ] Grid, thumbnails, carousel, masonry-h, masonry-v each display correctly
- [ ] Click tile opens lightbox; Prev/Next and arrow keys work; Escape closes
- [ ] Image zoom +/- works in lightbox
- [ ] Local video shows native controls in lightbox
- [ ] Captions appear when enabled; hidden when disabled in settings
- [ ] `URL:` blocked when **Allow remote images** is off (warning shown)
- [ ] Duplicate VIEW or FILTER shows parse error panel
- [ ] Empty MEDIA section shows error
- [ ] **Insert media gallery** command opens builder and inserts block at cursor
- [ ] Builder drag-reorder and copy block work
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

Confirm `main.js` timestamp updates and Obsidian loads v1.0.0 from plugin settings.
