# hkk.fyi

Personal site of **Hassan Keshtkar** — electrical engineering @ University of Tehran.
Applied electromagnetics · RF & microwave · bioelectromagnetics.

Static site, no build step, no frameworks, exactly three colors
(paper `#F4EFE4`, ink `#1C1B1A`, signal red `#D9482B`).

## Structure

```
index.html            main page (about · lab · CV · contact)
assets/site.css       all styling (3-color palette lives at the top)
assets/site.js        standing wave, theme toggle, instrument launcher
projects/<name>/      each interactive project, fully self-contained
CNAME                 custom domain for GitHub Pages (hkk.fyi)
```

## Adding a project

1. Drop the app into `projects/<name>/` (must have its own `index.html`).
2. In `index.html`, duplicate the `<article class="project card">` block
   inside the **Lab** section and point it at `projects/<name>/`.

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
