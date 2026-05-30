# Solitaire That Leaves You Alone

A quiet, offline Klondike Solitaire game built with plain HTML, CSS, and JavaScript.

The game is designed for mobile-first play with no ads, accounts, tracking, analytics, or network calls.

## Features

- Klondike Solitaire
- Draw 1 / Draw 3 setting
- Stock, waste, tableau, and four foundation piles
- Touch-friendly card dragging
- Desktop pointer support
- Mobile portrait and landscape layouts
- Double-tap move to foundation
- Single-move undo
- Auto Finish when the remaining game can safely drain to foundations
- Background themes: green, blue, grey, and orange
- Session-based game persistence
- Local settings persistence for theme and draw mode

## Privacy

This game does not collect data.

It uses browser storage only for:

- Theme preference
- Draw 1 / Draw 3 preference
- Current in-session game state

There are no external requests, ads, accounts, analytics, or tracking scripts.

## Run Locally

Open `index.html` in a browser.

For phone testing, serve the folder with any local static web server and open the local network address from the phone.

## Files

- `index.html` - page structure
- `styles.css` - layout, card visuals, and mobile behavior
- `app.js` - game state, rules, movement, persistence, and controls

## App Store Notes

This repository is currently a web version of the game. To submit it to the iOS App Store, it needs to be bundled into a native iOS app, typically with a Swift `WKWebView` wrapper that loads these files locally from the app bundle.
