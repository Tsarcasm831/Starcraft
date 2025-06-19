# AGENTS

This repository contains a small Starcraft-inspired RTS prototype. This monolithic AGENTS file applies to the entire project tree.

## Scope
- Everything under the repository root.

## Running the project
1. From the repository root start a local server:
   ```bash
   python3 -m http.server 8000
   ```
2. Visit `http://localhost:8000/index.html` in a modern browser.
3. Verify the game loads without errors in the console.

## Directory structure
- `src/` – JavaScript source files divided into subfolders (`game`, `units`, `buildings`, `resources`, `utils`).
- `assets/` – audio, images and CSS used by the game.
- `index.html` – entry point that loads Three.js from the network and initializes the game.

## Adding features
- New units must go under `src/units` and export a class.
- New buildings go under `src/buildings`.
- Additional game logic belongs in `src/game` or `src/utils` as appropriate.
- Assets for new features belong in `assets/` using lowercase dashed file names.
- Keep code style consistent with existing files (ES6 modules, semicolons, 4 spaces for indentation).

## Audio and images
- Audio is loaded in `src/utils/audio.js` via the asset manager. Add new sound files to `assets/audio/` and register them in that file.
- Images live under `assets/images/` and are referenced by HTML or JS modules.

## Testing changes
There is no automated test suite. After making changes:
1. Run the local server (`python3 -m http.server 8000`).
2. Open the game in a browser and ensure it loads correctly.
3. Check the browser console for any JavaScript errors before submitting a pull request.
