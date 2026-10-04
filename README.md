# Viruzz — Spicetify Theme

A dark, minimal Spotify theme that matches [viruzz.xyz](https://viruzz.xyz). An interactive dot lattice and drifting shapes sit behind glass panels with soft spectral glows, and everything is customizable from a built-in settings panel.

<p align="center">
  <img src="[https://raw.githubusercontent.com/xBoredx/Spicetify-Viruzz/main/Viruzz/screenshots/fullPreview.png](https://github.com/xBoredx/Spicetify-Viruzz/blob/main/screenshots/fullPreview.png?raw=true)" alt="Viruzz Full Preview" width="100%">
</p>

<table>
  <tr>
    <td align="center" width="50%">
      <img src="https://raw.githubusercontent.com/xBoredx/Spicetify-Viruzz/main/Viruzz/screenshots/HomePreview.png" alt="Viruzz home view with glass panels, sidebars and the now playing view"><br>
      <sub><b>Home</b></sub>
    </td>
    <td align="center" width="50%">
      <img src="https://raw.githubusercontent.com/xBoredx/Spicetify-Viruzz/main/Viruzz/screenshots/SettingsPreview.png" alt="Viruzz settings panel with the accent color picker"><br>
      <sub><b>Settings panel</b></sub>
    </td>
  </tr>
  <tr>
    <td align="center" width="50%">
      <img src="https://raw.githubusercontent.com/xBoredx/Spicetify-Viruzz/main/Viruzz/screenshots/NoSidebarPreview.png" alt="Library and now playing collapsed into icon strips"><br>
      <sub><b>Icon strips</b></sub>
    </td>
    <td align="center" width="50%">
      <img src="https://raw.githubusercontent.com/xBoredx/Spicetify-Viruzz/main/Viruzz/screenshots/SidebarPreview.png" alt="Both sidebars hidden with the arrows on the edges"><br>
      <sub><b>Hidden sidebars</b></sub>
    </td>
  </tr>
</table>

## Features

### Living background (same as the site)
- **Dot lattice:** a 66px grid of slowly drifting dots.
- **Cursor constellation:** nearby dots brighten and link up with lines that fade with distance as you move the mouse.
- **Click ripple:** clicking empty space sends a wave through the lattice in your accent color.
- **Scroll parallax:** the lattice drifts against the page as you scroll.
- **Shape field:** 14 random circles, squares and hexagons drifting behind everything, some with a flickering glow.

### Glass UI
- The sidebars, main view and player bar are glass panels with an outline that always stays in line with the others.
- Back, forward, home and the Marketplace cart are round glass buttons, with a glass search pill to match.
- Hovering songs, cards and recently played tiles gives them the same glass effect.
- The search dropdown is a frosted glass panel.
- Scrollbars are thin and fade out at both ends.

### Sidebars
- **Collapse the library** with Spotify's Your Library button and the left sidebar hides completely. An arrow on the edge brings it back.
- **Close Now Playing** and the right sidebar hides completely, with its own arrow.
- **Drag the right sidebar small** and it turns into an icon strip with the current cover art plus Now Playing, Queue, Lyrics and Devices buttons. Drag its edge back out to get the full sidebar.
- When a sidebar is hidden, the main view stretches to line up with the player bar.

### Custom window buttons (Windows)
Spotify's native minimize, maximize and close buttons are replaced with round glass ones that match the theme. If your Spotify version doesn't support this, the native buttons are left alone, so you're never stuck without them.

### Settings panel
Click the **gear** next to the window buttons, or choose **Viruzz settings** in the profile menu, to change:

| Setting | What it does |
| --- | --- |
| Accent color | Presets, a drag color picker or a hex code. Recolors outlines, glows, the cursor effect and Spotify's own accents |
| Glow strength | Scales every soft glow (0–200%) |
| Outline strength | Scales every outline (0–200%) |
| Glass tint | How dark and solid the glass is |
| Glass blur | How much the glass blurs what's behind it. Lower it if Spotify feels slow |
| Hover background | Glass, Solid or Off for songs, cards and tiles |
| Floating shapes / Dot background | Turn the background layers on or off |

Changes apply live and are saved on your PC.

## Install

### From the Spicetify Marketplace

The easiest way. Open the **Marketplace** in Spotify (the cart icon in the top bar), go to **Themes**, search for **Viruzz** and hit **Install**. That's it.

Use either the Marketplace or the manual install below, not both, or the two copies of the theme can clash.

### Manual install

1. Install [Spicetify](https://spicetify.app).
2. Copy the `Viruzz` folder from this repo into your Themes folder:
   - **Windows:** `%APPDATA%\spicetify\Themes\`
   - **macOS / Linux:** `~/.config/spicetify/Themes/`

   You should end up with `Themes/Viruzz/user.css`, `theme.js` and `color.ini` directly inside it, not inside another folder.
3. Run:
   ```
   spicetify config current_theme Viruzz color_scheme Viruzz inject_css 1 replace_colors 1 inject_theme_js 1
   spicetify apply
   ```

`inject_theme_js 1` matters. Without it `theme.js` never runs, so there's no background animation, no glass outlines, no sidebar arrows and no settings panel.

Running `spicetify config-dir` opens your real spicetify folder if you're not sure where `Themes` is.

## Troubleshooting

**Spotify looks completely unthemed.**
Spicetify can't find the files. Check that `user.css`, `theme.js` and `color.ini` sit directly inside `Themes/Viruzz`, then run `spicetify apply`. If spicetify says it can't open `color.ini`, that's the cause.

**The background shows, then disappears once Spotify loads.**
`theme.js` is running but `user.css` isn't loading. Open the console (`Ctrl+Shift+I`) and run:
```js
fetch('user.css').then(r => r.text()).then(t => t.slice(0, 60))
```
It should start with `/* viruzz theme for spicetify`. If it shows JavaScript instead, `user.css` and `theme.js` got mixed up.

**Part of the app is still a solid slab.**
Spotify paints a few containers opaque. `user.css` clears the known ones and `theme.js` detects the rest, but if one slips through, inspect it in DevTools (`Ctrl+Shift+I`, or run `spicetify enable-devtools` first) and add its class to the transparent list near the top of `user.css`.

**Reset everything to default.**
Use **Reset to default** in the settings panel. To also clear the saved sidebar state, run this in the console:
```js
['vz-settings', 'vz-left-shut', 'vz-right-strip'].forEach(k => localStorage.removeItem(k)); location.reload();
```

## Colors

The base palette lives in `color.ini`. The accent can also be changed live from the settings panel.

| Variable | Hex | Use |
| --- | --- | --- |
| `main` | `#111111` | Background |
| `card` | `#161616` | Cards |
| `selected-row` | `#1c1c1c` | Selected rows |
| `text` | `#e0eaf9` | Main text |
| `subtext` | `#a3aec2` | Secondary text |
| `button` | `#8b9aed` | Accent, buttons, progress bar |
| `button-disabled` | `#6b7386` | Faint text |
| `notification-error` | `#ff4455` | Errors, close button hover |
