# hkk.fyi

Personal site of **Hassan Keshtkar** — electrical engineering @ University of Tehran.
Applied electromagnetics · RF & microwave · bioelectromagnetics.

Static site, no build step, no frameworks, exactly three colors
(paper `#F4EFE4`, ink `#1C1B1A`, blueprint blue `#2B59C3`).

## Structure

```
index.html            main page (about · CV · lab · writing · contact)
assets/site.css       all styling (3-color palette lives at the top)
assets/site.js        hero wave, scroll-rippled grid, pluckable rules, scroll
                      reveal, theme toggle
assets/fold.js        <details> open as a wave (home page + essays)
projects/<name>/      each interactive project, fully self-contained
CNAME                 custom domain for GitHub Pages (hkk.fyi)
```

## Shared assets are versioned

`index.html` and the essays load `assets/site.css`, `site.js` and `fold.js`
with a `?v=` suffix (first 8 hex digits of the file's md5). Bump it when
you change the file, so browsers and the CDN never pair a new page with an
old stylesheet or script.

## Adding a project

1. Drop the app into `projects/<name>/` (must have its own `index.html`).
2. In `index.html`, duplicate an `<article class="project card">` block
   inside the **Lab** section's `.lab-grid` and point its links at
   `projects/<name>/` (they open in a new tab).

## Credits

`assets/ut-gate.jpg` — main gate of the University of Tehran, photo by
**Armin Abbasi**, [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:University_of_Tehran_Main_Entrance_Gate.jpg),
CC BY-SA 4.0 (resized).

## Run locally

Any static server works:

```
python -m http.server 4173
```

then open http://localhost:4173
