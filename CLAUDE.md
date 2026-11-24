# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single self-contained page, `helical_orbit_of_the_earth_3d_visualization.html`: an interactive Three.js view of Earth's orbit as a helix, traced as the Sun moves along a straight axis. You can also show the Moon and the other planets. There is no build, package manager, test suite or linter.

## Running it

Open the file in a browser: `open helical_orbit_of_the_earth_3d_visualization.html`. Its dependencies load from CDNs, so it needs network access:
- Tailwind (Play CDN) does all the UI styling through utility classes.
- Three.js is pinned to **r128** (`cdnjs`, the global `THREE`). Don't use APIs added after r128, and don't use ES-module imports, `OrbitControls` or other `examples/` add-ons. The camera controller is hand-written.
- Fonts are Inter and JetBrains Mono (`.mono`).

## Architecture

Everything lives in one inline `<script>`, split into numbered sections (`// 1. CONSTANTS …` through `// 7. … ANIMATION LOOP`).

- **Model.** The Sun moves along the +X axis. Each body circles in the Y–Z plane around the Sun's current X position. One `state` object holds everything that can change (`pitchAU` = AU the Sun travels per Earth year, `spanYears`, `phase` in Earth years, visibility toggles, `frameName`).
- **One scale for both axes.** `WORLD_UNITS_PER_AU = 3.0` applies to the radius and the axis alike, so the helix angle `atan(pitch / circumference)` you see on screen is the true angle. Don't scale one axis on its own.
- **Planet helices come from Earth's pitch.** Every body moves forward at the Sun's speed, so a planet's pitch is `pitchUnits * periodYr` and its turn count is `spanYears / periodYr`. Planet data is in `EXTRA_PLANETS`. Adding a planet means a config entry there plus a matching `#lbl-<id>` element in `#labels-layer`.
- **Moon.** Its true distance is smaller than Earth's sphere, so it uses the made-up `MOON_VISUAL_RADIUS_UNITS` on purpose.
- **Two update paths:**
  - `rebuildHelixGeometry()` disposes and recreates everything in `helixGroup` (the axis line, the tubes, the dimension markers). It runs only when pitch, span or visibility changes, usually through `updateMetricsAndUI()`, which also refreshes the readouts. Anything new you add to `helixGroup` must be disposable this way.
  - `animate()` runs every frame and only moves things that already exist (the Sun, Earth, Moon, planets and the moving ring). It writes tether endpoints straight into their `BufferAttribute` arrays, then sets `needsUpdate` and calls `computeLineDistances()` for dashed lines. Don't allocate geometry here.
- **Labels are HTML, not sprites.** `projectLabelToScreen()` projects a world position onto the `.label-3d` divs every frame, and hides them when they're behind the camera or when symbols and names are both off.
- **Presets** (`btn-galactic` 52.95 AU/yr ≈ 251 km/s, `btn-lsr` 4.11, `btn-tight` 1.11) set `state.pitchAU` and `frameName`, then refit the camera with `resetCameraToFit()`. Speeds in km/s come from `pitchAU / AU_PER_YR_PER_KMS`.
- Playback speed scales with `spanYears`, so one sweep of the visible helix takes about 10 seconds whatever the span.
