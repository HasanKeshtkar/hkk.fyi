# PM-TI pitch page

Scroll-driven, title-only pitch of the B.Sc. project (PM-TI), in the hkk.fyi theme.
Everything is offline: fonts, images and data live in `assets/`.

## Open

Double-click `index.html` (any modern browser; Chrome/Edge recommended).
Or serve the folder, e.g. `python -m http.server 8765 --directory pitch` and open http://localhost:8765/.

## Reading

The page explains itself — no presenter needed. Every slide has a short plain-words paragraph under its
title, and the story runs as a chain: problem → solution → the new problem that solution brings → …
A rail on the left (wide screens) shows where you are in that chain; a recap slide lists all six links.
Math is kept to the two formulas that matter: TI and PM-TI.

- `→` / `Space` / `PageDown` — next step (pinned scenes have several steps)
- `←` / `PageUp` — previous step
- theme button (top right) — ink / paper, same key as hkk.fyi
- the k and E₂/E₁ sliders play by themselves until touched; "auto" hands control back
- "Live" section: play/pause, drag on any map or the profile to scrub `x`

## Flow

hero → P1 disease → S1 DBS → P2 surgery → S2 TI (+ TI formula) → P3 wide focus
→ S3 PM-TI (+ PM-TI formula, penalty demo, k knob) → simulation results → live x-sweep
→ bench test → simulation vs measurement → recap (three problems, three answers) → close + QR

## Data

`assets/data.js` is produced by `tools/export_pitch_data.m` (MATLAB, Signal Processing Toolbox) from
`simulation_export/` and `measured_raw_data_k{1,2,3}/` with exactly the pipeline of
`Phantom_measured_vs_simulated.m` and `TI_interactive_map.m`. Run from the project root:

    matlab -batch "addpath('pitch/tools'); export_pitch_data('pitch/assets/data.js')"

All maps, profiles, FWHM numbers and waveforms on the page are computed live in the browser from that file.

## Credits

DBS X-ray — Hellerhoff, Wikimedia Commons, CC BY-SA 3.0 · Parkinson's sketch — W. R. Gowers 1886, public domain ·
spiral drawing — Wikimedia Commons, CC BY-SA 4.0 · EEG spike-wave — Der Lange, Wikimedia Commons, CC BY-SA 2.0.
Fonts: Space Grotesk (OFL), IBM Plex Mono (OFL).

## Publishing on hkk.fyi

Copy the whole `pitch/` folder as-is (e.g. to `/pmti/`). No build step, no external requests.
