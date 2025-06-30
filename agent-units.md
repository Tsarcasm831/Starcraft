# Agent's Guide to Creating Units

This document provides a concise workflow for adding a new unit to the game engine. Follow the steps below to avoid missing any integration points.

---

## Step 1: Create the Unit Data File (`.json`)

All unit stats are stored in JSON files for easy tweaking.

1. **Create the file**: Add a new JSON file in the appropriate faction directory, e.g. `assets/data/protoss/<unit_name>.json`.
2. **Define stats**: Populate the file with the unit's core attributes.

**Example: `assets/data/terran/new_unit.json`**
```json
{
    "stats": {
        "health": 100,
        "shields": 0,
        "armor": 1,
        "speed": 3.5
    }
}
```

## Step 2: Create the Unit Class File

1. Add a new JavaScript file under `src/<faction>/<unit_name>.js`.
2. Extend the appropriate base class (`Infantry`, `Unit`, etc.) and load stats from the JSON file via `assetManager.get('unit_<unit_name>')`.
3. Define the unit's commands, load its model with `createMeshFromGLB`, and fall back to a procedural mesh if the model fails.
4. For a full reference once available, see `src/protoss/high-templar.js` and its data file `assets/data/protoss/high_templar.json`.

## Step 3: Update Preloader and Spawn Logic

1. In `src/game/preloader.js`, load the new model, JSON data, command icon, and portrait.
   ```javascript
   tasks.push(() => assetManager.loadGLB('assets/models/protoss/high_templar.glb', 'protoss_hightemplar'));
   tasks.push(() => assetManager.loadJSON('assets/data/protoss/high_templar.json', 'unit_high_templar'));
   tasks.push(() => assetManager.loadImage('assets/images/protoss/train_high_templar_icon.png', 'train_high_templar_icon'));
   tasks.push(() => assetManager.loadImage('assets/images/protoss/high_templar_portrait.png', 'high_templar_portrait'));
   ```
2. Import the class in `src/game/spawn.js` and add a case to `spawnUnit` so the game can create the unit.
3. If you want the unit spawned in developer mode, also import it in `src/game/initial-state.js` and add it to `devUnitsToSpawn`.

## Step 4: Add Assets

1. Place the model, icon, and portrait in the `assets` directories shown above.
2. Append their paths to `assets/asset-list.json` so the downloader caches them offline.
3. Ensure the paths match those used in the preloader.

After completing these steps and verifying the High Templar example, your new unit should be fully integrated into the game.
