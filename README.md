# Leave Me Alone Games

A quiet offline game collection built with plain HTML, CSS, and JavaScript.

The app is designed for mobile-first play with no ads, accounts, tracking, analytics, or network calls.

## Games

- Klondike Solitaire: `games/klondike/`
- FreeCell: `games/freecell/`
- Spider Solitaire: `games/spider/`
- Pyramid Solitaire: `games/pyramid/`
- Tri-Peaks Solitaire: `games/tripeaks/`
- Golf Solitaire: `games/golf/`

## Structure

- `index.html` - app launcher
- `launcher.css` - launcher layout and visual style
- `launcher.js` - app-level service worker registration
- `games/klondike/` - Klondike HTML, CSS, and JS
- `games/freecell/` - FreeCell HTML, CSS, and JS
- `games/spider/` - Spider Solitaire HTML, CSS, and JS
- `games/pyramid/` - Pyramid Solitaire HTML, CSS, and JS
- `games/tripeaks/` - Tri-Peaks Solitaire HTML, CSS, and JS
- `games/golf/` - Golf Solitaire HTML, CSS, and JS
- `manifest.webmanifest` - installable app metadata
- `sw.js` - offline cache service worker
- `icons/` - home-screen and app icons

Each game folder owns its own page, styles, and game logic. New games should be added as separate folders under `games/`.

## Privacy

This app does not collect data.

It uses browser storage only for local game state and local settings.

There are no external requests, ads, accounts, analytics, or tracking scripts.

See [PRIVACY.md](PRIVACY.md) for the full privacy statement.

## Run Locally

Open `index.html` in a browser.

For phone testing, serve the folder with a static web server and open the served site from the phone.

## Install As An App

When hosted over HTTPS, the app can be installed from supported mobile browsers.

On iPhone:

1. Open the hosted app in Safari.
2. Tap Share.
3. Tap Add to Home Screen.

On Android:

1. Open the hosted app in Chrome.
2. Tap the browser menu.
3. Tap Add to Home screen or Install app.

## App Store Notes

This repository is currently a web version of the app. To submit it to app stores, bundle these files into native iOS and Android app projects that load the local app files.

See [STORE_PREP.md](STORE_PREP.md) for iOS and Android packaging notes.
