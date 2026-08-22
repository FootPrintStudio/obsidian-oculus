# Oculus — manual test checklist

Use fixtures in `Dev Pages/Media Gallery Test/` inside the Command Centre vault. Reload Obsidian after building the plugin.

## Prerequisites

- Build the plugin: `cd .obsidian/plugins/oculus && ./build.sh`
- Enable **Oculus** in Community plugins
- For LOCAL tests, add a few images (and optionally a short `.mp4`) under `Dev Pages/Media Gallery Test/Assets/` — the vault may not ship with binary fixtures

## Fixtures

| File | What to verify |
|------|----------------|
| `Dev Pages/Media Gallery Test/00 Index.md` | Hub linking to all test notes |
| `Dev Pages/Media Gallery Test/01 Grid Local.md` | Grid view, LOCAL file + indented folder list |
| `Dev Pages/Media Gallery Test/02 Carousel URL.md` | Carousel + remote URL list |
| `Dev Pages/Media Gallery Test/03 Masonry Views.md` | masonry-h and masonry-v blocks |
| `Dev Pages/Media Gallery Test/04 Video Filter.md` | FILTER: video / all with local video |
| `Dev Pages/Media Gallery Test/05 Error Cases.md` | Parse errors and warnings display |
| `Dev Pages/Media Gallery Test/06 Refresh Test.md` | Add/remove file in watched folder; gallery updates |
| `Dev Pages/Media Gallery Test/08 URL Video.md` | Direct URL video + FILTER |
| `Dev Pages/Media Gallery Test/09 Hosted Video.md` | Hosted platform URLs + ME |
| `Dev Pages/Media Gallery Test/10 Markdown Images.md` | Wiki embed + markdown image lightbox |

## Checklist

- [ ] `oculus` code blocks render in Reading view
- [ ] `LOCAL: folder/` scans nested folders; `LOCAL: folder` is one level only
- [ ] Indented `LOCAL:` / `URL:` / `SEARCH:` lists resolve every path
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
- [ ] `SEARCH: folder | text` matches media filenames case-insensitively
- [ ] Comma-separated SEARCH queries require every query to match the filename
- [ ] SEARCH respects FILTER and only includes subfolders when recursive
- [ ] `URL:` blocked when **Allow remote media** is off (warning shown)
- [ ] Duplicate VIEW or FILTER shows parse error panel
- [ ] `OPTIONS:` / `MEDIA:` headers show parse errors
- [ ] `XIEWER:` resolves when CollectionXiewer is running; warning when it is not
- [ ] `LIMIT:` caps SEARCH and XIEWER results only
- [ ] `SORT: date DSC` / `name ASC` / `random` reorder the merged gallery
- [ ] Empty block with no LOCAL/SEARCH/URL/XIEWER shows error
- [ ] Omitting VIEW and FILTER uses Settings defaults
- [ ] **Augur → Insert Oculus gallery** builds and inserts an `oculus` block
- [ ] Clicking `![[image]]` / `![](image)` in a note opens the Oculus lightbox; prev/next walks note images
- [ ] Ctrl/Cmd-click on a note image keeps Obsidian’s default behavior
- [ ] Vault create/delete/modify on media files refreshes open galleries (~750 ms debounce)
- [ ] Settings README and Guide tabs render (including under BRAT)
- [ ] Plugin disable removes gallery UI cleanly

## Refresh test procedure

1. Open **06 Refresh Test** in Reading view.
2. Note item count in the gallery (folder `Dev Pages/Media Gallery Test/Assets/`).
3. Add or remove an image in that folder.
4. Within ~1 s the gallery should re-render without reloading the note.

## Build verification

```bash
cd .obsidian/plugins/oculus
./build.sh
```

Confirm `main.js` timestamp updates and Obsidian loads **Oculus** v2.0.0 from plugin settings.
