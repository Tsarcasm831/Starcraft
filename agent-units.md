# Agent's Guide to Creating Units

This guide breaks down every step required to introduce a new unit. Follow the order below and reference the **High Templar** implementation for a working example.

---

## Overview

1. Create the unit's JSON data file.
2. Implement the JavaScript class.
3. Register assets in the preloader.
4. Hook the unit into spawn logic.
5. Add the model, icon and portrait files.

Once complete, launch the game to verify the unit appears.

---

## Step 1: Create the Unit Data File (`.json`)

All gameplay stats live in JSON files so they can be tweaked without touching code.

1. **Create the file** in the faction directory, e.g. `assets/data/protoss/<unit_name>.json`.
2. **Add a `stats` object** containing numbers for attributes like `health`, `shields`, `armor`, `speed` and `energy` if applicable.

Example file:

```json
{
    "stats": {
        "health": 100,
        "shields": 0,
        "armor": 1,
        "speed": 3.5,
        "energy": 50
    }
}
```

## Step 2: Write the Unit Class

1. Create `src/<faction>/<unit_name>.js` and import the correct base class (`Infantry`, `Unit`, etc.).
2. Load stats via `assetManager.get('unit_<unit_name>').stats`.
3. Assign properties like `maxHealth`, `maxShields`, `speed` and any energy values.
4. Build the `commands` array (`move`, `stop`, `attack` and others as needed).
5. Load the mesh using `createMeshFromGLB(assetManager.get('<faction>_<unit_name>'))`.
6. Provide a `createProceduralMesh` fallback in case the GLB fails to load.
7. Call `setup(position)` at the end of the constructor.

See `src/protoss/hightemplar.js` for a complete reference implementation.

## Step 3: Register Assets in the Preloader

Open `src/game/preloader.js` and queue tasks for each asset:

```javascript
tasks.push(() => assetManager.loadGLB('assets/models/protoss/high_templar.glb', 'protoss_hightemplar'));
tasks.push(() => assetManager.loadJSON('assets/data/protoss/high_templar.json', 'unit_high_templar'));
tasks.push(() => assetManager.loadImage('assets/images/protoss/train_high_templar_icon.png', 'train_high_templar_icon'));
tasks.push(() => assetManager.loadImage('assets/images/protoss/high_templar_portrait.png', 'high_templar_portrait'));
```

Replace paths and keys with your unit's name. The key string after the comma is what `assetManager.get()` uses.

## Step 4: Hook the Unit into Spawn Logic

1. Import your class in `src/game/spawn.js`.
2. Add a case in `spawnUnit()` returning `new YourUnit(position)`.
3. (Optional) For quick testing, import the class in `src/game/initial-state.js` and add its name to `devUnitsToSpawn`.

## Step 5: Add Assets and Update the Asset List

1. Place the GLB model under `assets/models/<faction>/`, the command icon under `assets/images/<faction>/` and the portrait in the same `images` folder.
2. Append each asset path to `assets/asset-list.json` so the downloader caches it for offline play.
3. Ensure the same paths are used in the preloader snippet above.

When all steps are finished, start a local server (`python3 -m http.server 8000`) and open the game in your browser. The new unit should load without errors.

---

Remember to record every change in `changelog.md` using the ASCL format. Following this checklist ensures even a less experienced agent can integrate new units smoothly.
