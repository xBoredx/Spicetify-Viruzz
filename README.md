# Viruzz

A dark, minimal Spicetify theme inspired by **[viruzz.xyz](https://viruzz.xyz)** — built around transparent glass-like frames, spectral blue accents, and an interactive animated background.

<p align="center">
  <img src="https://img.shields.io/badge/Spicetify-Theme-8b9aed?style=flat-square" alt="Spicetify Theme">
  <img src="https://img.shields.io/github/license/xBoredx/Spicetify-Viruzz?style=flat-square" alt="License">
</p>

## Preview

<table>
  <tr>
    <td width="50%">
      <img src="https://raw.githubusercontent.com/xBoredx/Spicetify-Viruzz/main/screenshots/preview1.png" alt="Viruzz Preview 1">
    </td>
    <td width="50%">
      <img src="https://raw.githubusercontent.com/xBoredx/Spicetify-Viruzz/main/screenshots/preview2.png" alt="Viruzz Preview 2">
    </td>
  </tr>
  <tr>
    <td width="50%">
      <img src="https://raw.githubusercontent.com/xBoredx/Spicetify-Viruzz/main/screenshots/preview3.png" alt="Viruzz Preview 3">
    </td>
    <td width="50%">
      <img src="https://raw.githubusercontent.com/xBoredx/Spicetify-Viruzz/main/screenshots/preview4.png" alt="Viruzz Preview 4">
    </td>
  </tr>
</table>

## ✦ Features

* **Dark minimal UI** built around `#111111` surfaces
* **Spectral blue** `#8b9aed` accent throughout the interface
* Transparent framed sections with subtle glowing outlines
* Interactive animated **dot lattice** background
* Cursor-reactive connections and click ripples
* Slowly floating circles, squares, and hexagons
* Spotify's automatic cover-art color tint removed
* Thin glowing scrollbar
* Custom styling across the top bar, library, main view, sidebar, and player
* Lightweight and designed to stay visually clean

## Installation

### Marketplace

Open **Marketplace → Themes**, search for **Viruzz**, and click **Install**.

### Manual

Copy the following files into your Spicetify Themes directory:

| OS            | Path                                 |
| ------------- | ------------------------------------ |
| Windows       | `%appdata%\spicetify\Themes\Viruzz\` |
| Linux / macOS | `~/.config/spicetify/Themes/Viruzz/` |

The theme folder should contain:

```text
Viruzz/
├── user.css
├── color.ini
└── theme.js
```

Then run:

```bash
spicetify config current_theme Viruzz color_scheme Viruzz inject_css 1 replace_colors 1 inject_theme_js 1
spicetify apply
```

> **Important:** `inject_theme_js 1` is required.
>
> Without it, `theme.js` will not run, meaning the animated background, frames, and tint removal will not be loaded.

## Colors

| Variable          | Hex       | Usage                     |
| ----------------- | --------- | ------------------------- |
| `main`            | `#111111` | Background                |
| `surface`         | `#161616` | Cards                     |
| `surface-2`       | `#1c1c1c` | Selected rows             |
| `text`            | `#e0eaf9` | Primary text              |
| `subtext`         | `#a3aec2` | Secondary text            |
| `spectral`        | `#8b9aed` | Accent, buttons, progress |
| `button-disabled` | `#6b7386` | Disabled / faint text     |

## Customization

The main customization variables are located at the top of `user.css`:

| Variable        | Description            |
| --------------- | ---------------------- |
| `--vz-frame`    | Frame outline and glow |
| `--vz-radius`   | Frame corner radius    |
| `--vz-spectral` | Main accent color      |

Change these values to quickly adjust the theme's overall appearance without modifying the rest of the stylesheet.

## Background

Viruzz uses a custom animated background instead of Spotify's default flat surfaces.

The background features:

* Connected dots that react to your cursor
* Click-based ripple effects
* Subtle movement while scrolling
* Slowly drifting geometric shapes
* Transparent UI frames layered above the animation

The result is a subtle animated environment that stays behind Spotify's interface instead of competing with it.

## Troubleshooting

### Parts of Spotify still have a solid or tinted background

Spotify's UI can change between versions, which may cause individual elements to retain their default styling.

Open Spotify's DevTools:

```text
Ctrl + Shift + I
```

Or enable them through Spicetify:

```bash
spicetify enable-devtools
```

Inspect the affected element and check its class name. If you've found a Spotify component that isn't covered by the theme, feel free to open an issue.

### The animated background isn't showing

Make sure JavaScript injection is enabled:

```bash
spicetify config inject_theme_js 1
spicetify apply
```

## Uninstall

To restore Spotify's original Spicetify configuration:

```bash
spicetify restore
```

## Credits

Made by **boredq**.

Inspired by and designed to match **[viruzz.xyz](https://viruzz.xyz)**.

<p align="center">
  <sub>Viruzz — a minimal Spicetify experience.</sub>
</p>
