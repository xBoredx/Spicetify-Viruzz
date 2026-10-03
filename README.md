# Viruzz

![Theme screenshot](https://raw.githubusercontent.com/xBoredx/Spicetify-Viruzz/main/preview.png)

A dark minimal Spicetify theme matching [viruzz.xyz](https://viruzz.xyz).

![Spicetify theme](https://img.shields.io/badge/spicetify-theme-8b9aed)

## Preview

Dark `#111` surfaces with a spectral blue (`#8b9aed`) accent. Every section (top bar, library, main view, right sidebar, player) is its own transparent frame with a thin glowing outline. Behind them sits an interactive dot lattice that links up around your cursor, ripples when you click, and drifts as you scroll, plus slowly floating circles, squares and hexagons. Spotify's cover-art tint on playlists, albums and the home page is removed, and the scrollbar is a thin glowing rail.

## Install

### Marketplace

Open Marketplace, find **Viruzz** in the Themes tab and click **Install**.

### Manual install

1. Copy `user.css`, `color.ini` and `theme.js` into your Spicetify Themes folder:

    | OS            | Path                                    |
    | ------------- | --------------------------------------- |
    | Windows       | `%appdata%\spicetify\Themes\Viruzz\`    |
    | Linux / macOS | `~/.config/spicetify/Themes/Viruzz/`    |

2. Apply:

```
spicetify config current_theme Viruzz color_scheme Viruzz inject_css 1 replace_colors 1 inject_theme_js 1
spicetify apply
```

`inject_theme_js 1` is required. Without it `theme.js` never runs, so there is no background, no frames and no tint removal.

## Colors

| Variable          | Hex       | Use                           |
| ----------------- | --------- | ----------------------------- |
| `main`            | `#111111` | Background                    |
| `surface`         | `#161616` | Cards                         |
| `surface-2`       | `#1c1c1c` | Selected rows                 |
| `text`            | `#e0eaf9` | Main text                     |
| `subtext`         | `#a3aec2` | Secondary text                |
| `spectral`        | `#8b9aed` | Accent, buttons, progress bar |
| `button-disabled` | `#6b7386` | Faint text                    |

## Customization

At the top of `user.css`:

| Variable        | Description                                  |
| --------------- | -------------------------------------------- |
| `--vz-frame`    | The outline drawn on every frame             |
| `--vz-radius`   | Corner radius of the frames                  |
| `--vz-spectral` | The accent color                             |

## Troubleshooting

If part of the app still has a solid or tinted background, open DevTools in Spotify (`Ctrl+Shift+I`, or run `spicetify enable-devtools` first), inspect the area, and open an issue with its class name.

## Uninstall

```
spicetify restore
```

## Credits

Made by boredq. Matches [viruzz.xyz](https://viruzz.xyz).
