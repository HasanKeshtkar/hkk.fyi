# PM-TI pitch page

Scroll-driven, title-only pitch of the B.Sc. project (PM-TI), in the hkk.fyi theme.
Everything is offline: fonts, images and data live in `assets/`.

## Open

Double-click `index.html` (any modern browser; Chrome/Edge recommended).
Or serve the folder, e.g. `python -m http.server 8765 --directory pitch` and open http://localhost:8765/.

## Presenting

- `→` / `Space` / `PageDown` — next step (pinned scenes have several steps)
- `←` / `PageUp` — previous step
- theme button (top right) — ink / paper, same key as hkk.fyi
- "Live" section: play/pause, drag on any map or the profile to scrub `x`

## Flow (≈ 5 min)

hero → problem 01 disease → solution 01 DBS → problem 02 invasive → solution 02 TI (+ two equations)
→ problem 03 wide focus → solution 03 PM-TI (+ two equations, penalty demo, k knob)
→ simulation results → live x-sweep (envelope vs k) → bench test → simulation vs measurement → close

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
