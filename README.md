# Viruzz — Spicetify Theme

Dark minimal theme matching my website): with interactive cursor animation and shapes floating.

## What the background does (same as the site)

- **Dot lattice** — 66px grid of slowly drifting dots (`bg-canvas.js`)
- **Cursor constellation** — move the mouse and nearby dots brighten and link with lines that fade out with distance
- **Click ripple** — clicking empty background sends a spectral wave through the lattice
- **Scroll parallax** — the lattice drifts against the page as you scroll the main view
- **Shape field** — 14 random circles / squares / hexagons drifting behind everything, ~40% spectral, some with the flicker glow (`shape-field.js`)

## Install

1. Install [Spicetify](https://spicetify.app)
2. Copy the `Viruzz` folder into your Themes folder
   - **Windows:** `%APPDATA%\spicetify\Themes\`
   - **macOS / Linux:** `~/.config/spicetify/Themes/`
3. Run:
   ```
   spicetify config current_theme Viruzz inject_css 1 replace_colors 1 inject_theme_js 1
   spicetify apply
   ```

`inject_theme_js 1` matters: without it `user.js` never runs and there is no canvas.

## If part of the app still looks like a solid slab

Spotify paints a few big containers opaque, and the lattice sits *behind* them. `user.css` clears the known ones and `user.js` auto-detects unknown ones, but if a panel is still solid:

1. Open DevTools in Spotify (`Ctrl+Shift+I`, or `spicetify enable-devtools` first)
2. Inspect the solid area and note the element's class name
3. Add it to the transparent list at the top of `user.css`

## Colors
| Variable | Hex | Use |
| `main` | `#111111` | Background |
| `surface` | `#161616` | Cards |
| `surface-2` | `#1c1c1c` | Selected rows |
| `text` | `#e0eaf9` | Main text |
| `subtext` | `#a3aec2` | Secondary text |
| `spectral` | `#8b9aed` | Accent, buttons, progress bar |
| `button-disabled` | `#6b7386` | Faint text |
