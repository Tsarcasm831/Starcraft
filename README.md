# Starcraft Clone

A small Starcraft-inspired RTS prototype built with Three.js.

## Prerequisites

- Modern web browser with ES module support
- Local HTTP server (required because modules can't be loaded from `file://`)

You can start a simple server from the repository root with:

```bash
python3 -m http.server 8000
```

## Launching

1. Run the server from this directory.
2. Open `http://localhost:8000/index.html` in your browser.

The page fetches Three.js from the internet and initializes the game scene.

## Controls

- **Left-click** to select a unit/building. Drag with the left mouse button to box-select.
- **Right-click** issues context-sensitive commands (move, gather, garrison or interact).
- Use **W/A/S/D** or arrow keys to pan the camera.
- When an SCV is selected, use the command card at the bottom to construct buildings.

### Audio

Audio feedback plays when units are selected or ordered to move. Sounds are preloaded from `assets/audio/` as shown in `src/game/index.js`:

```javascript
await assetManager.loadSound('assets/audio/select.mp3', 'select');
await assetManager.loadSound('assets/audio/move.mp3', 'move');
```

Playback is handled by `AudioManager.playSound`:

```javascript
const audioBuffer = assetManager.get(name);
const source = audioContext.createBufferSource();
source.buffer = audioBuffer;
source.connect(audioContext.destination);
source.start(0);
```

When a new SCV finishes construction a random voice line is also played. The
tracks are fetched during startup from remote URLs.

