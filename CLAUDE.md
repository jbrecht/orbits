# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## What this is

A Next.js app, deployed to Vercel, with one page: an interactive Three.js view of Earth's orbit as a helix, traced as the Sun moves along a straight axis. You can also show the Moon and the other planets. It started as a single HTML file (`helical_orbit_of_the_earth_3d_visualization.html`, still in the first commit on `main`).

It's built for desktop browsers. Phones aren't a target, so don't spend effort on phone layouts.

## Commands

- `npm run dev`: dev server on port **3300**. orbits owns 3300–3399 in claude-kit's `conventions/ports.md`.
- `npm run build`, `npm start`: production build, served on 3300.
- `npm test`: Vitest unit tests for the pure physics in `src/lib/orbit/`.
- `npm run typecheck`: `next typegen && tsc --noEmit` (`LayoutProps` comes from the generated route types).
- `npm run lint`: ESLint.

## Stack

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, `three` from npm. Fonts are Inter and JetBrains Mono via `next/font` (`font-sans`, `font-mono`). The page has no data fetching and prerenders as static HTML; Three.js only runs in the browser, inside `HelixVisualization`'s effect.

## Architecture

- `src/lib/orbit/` holds the model, with no React or DOM:
  - `constants.ts`: physical constants and scale. `WORLD_UNITS_PER_AU = 3.0` (applied through `auToUnits`) applies to the radius and the axis alike, so the helix angle `atan(pitch / circumference)` you see on screen is the true angle. Don't scale one axis on its own.
  - `bodies.ts`: planet data (`PLANETS`) and label metadata. The Moon uses the made-up `MOON_VISUAL_RADIUS_UNITS` on purpose: its true distance is smaller than Earth's sphere.
  - `physics.ts`: pure functions (helix angle, km/s, body positions, playback). Every body moves forward at the Sun's speed, so each position is `(sunX(years), orbitOffset(radius, years, period))`. A planet's pitch is Earth's pitch × its period.
  - `view.ts`: `ViewState` (everything the user can change), `INITIAL_VIEW` and the presets (Galactic 52.95 AU/yr ≈ 251 km/s, LSR 4.11, Tight Coil 1.11). Preset button labels and help text compute their angles and speeds from these values.
  - `scene/OrbitScene.ts`: owns the renderer and everything drawn. `scene/OrbitCameraController.ts` is the hand-written orbit/zoom/pan controller (no `OrbitControls`).
- `src/components/`: `HelixVisualization` holds the `ViewState` in React, creates the `OrbitScene` once and passes it each new state with `scene.update(view)`. Bumping `fitRequest` refits the camera after the state is applied (presets, span changes, Reset View). If WebGL 2 is unavailable, `InfoPanel` says so in place of the drag hint and the playback and camera buttons are disabled. The rest are presentational: `InfoPanel`, `ControlBar`, `HelpDialog` (a native modal `<dialog>`), `BodyLabels`.
- **Two update paths in `OrbitScene`:**
  - `rebuildHelix()` disposes and recreates everything in `helixGroup` (the axis line, the orbit paths). `update()` calls it only when pitch, span or visibility changes. Anything new you add to `helixGroup` must be disposable this way.
  - `frame()` runs every animation frame and only moves things that already exist. Tethers get their endpoints and dash distances written into preallocated buffers via `setTether` (not `computeLineDistances()`, which allocates). Don't allocate geometry there.
- **The animation phase lives in the scene, not React**, so React doesn't re-render every frame. A span change rescales it to keep relative progress.
- **Labels are HTML, not sprites.** `BodyLabels` renders their text; `OrbitScene` moves them every frame by projecting world positions through refs, and hides them when they're behind the camera. `labelLayout.ts` fades a label that overlaps one nearer the camera and stacks labels nearest on top; their sizes come from a `ResizeObserver`, not from reading layout each frame.
- **Adding a planet** means an entry in `PLANETS` (and its id in `PLANET_IDS`) plus a style in `BodyLabels`' `LABEL_STYLES`, which TypeScript requires.
- **Colours match the r128 prototype.** `OrbitScene` turns off colour management, renders in linear sRGB and scales light intensities by π. Removing those makes every colour darker and more saturated. The Sun light's falloff still differs: r128 faded it linearly to zero at 300 units, so bodies far from the Sun are now lit somewhat more brightly.
- Playback speed scales with `spanYears`, so one sweep of the visible helix takes `SWEEP_SECONDS` (10 s) whatever the span.
