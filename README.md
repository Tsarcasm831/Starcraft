# Starcraft RTS Prototype

This project is a small browser-based real-time strategy game inspired by StarCraft. It is built with modern JavaScript modules and the Three.js library.

## Installation
1. Ensure the required packages are installed:
   ```bash
   apt-get update -y && apt-get install -y apt-utils
   ```
2. Clone this repository and open a shell in the project directory.
3. Install Node dependencies:
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
- Press the `/` key at any time to open the promotional video modal.

For contribution guidelines and more details see `AGENTS.md`.
