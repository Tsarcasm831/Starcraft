# Starcraft RTS Prototype

This project is a small browser-based real-time strategy game inspired by StarCraft. It is built with modern JavaScript modules and the Three.js library.

## Installation
1. Ensure the required packages are installed:
   ```bash
   apt-get update -y && apt-get install -y apt-utils
   ```
2. Clone this repository and open a shell in the project directory.
3. Install Node dependencies (includes `jsdom` for the changelog archiving script):
   ```bash
   npm install
   ```

## Running the Game
1. Start a local HTTP server from the repository root:
   ```bash
   python3 -m http.server 8000
   ```
2. Open your browser to [http://localhost:8000/index.html](http://localhost:8000/index.html).
3. Verify the game loads with no errors in the console.

## Usage
- Use the in-game menus to start a match and view the tutorial or changelog.
- The `Changelog` button in the main menu opens the changelog modal sourced from `changelog.md` and `changelog.old.md`, not the manual.

## Development Notes
- `scripts/changelog-archive.js` automatically runs when `index.html` loads and moves entries older than today from `changelog.md` to `changelog.old.md`.
- Ensure you run `npm install` to fetch `jsdom`, which the archiving script depends on.
- To add a new unit, create a stats JSON file and corresponding unit class as outlined in `agent-units.md`. Log your work in `changelog.md`; the archiver will relocate older logs on the next page load.

For contribution guidelines and more details see `AGENTS.md`.