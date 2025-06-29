# Starcraft RTS Manual

## Getting Started
1. Install required packages:
   ```bash
   apt-get update -y && apt-get install -y apt-utils
   ```
2. Start the web server from the project root:
   ```bash
   python3 -m http.server 8000
   ```
3. Open `http://localhost:8000/index.html` in your browser and ensure the game loads without errors.

## Main Menu
- **Click to Start** begins a new game.
- **Options** allows toggling mobile controls, enabling dev mode and adjusting volumes.
- **Changelog** opens the latest update notes.

## Basic Controls
- **Left‑click** to select a unit or building. Drag to box‑select multiple units.
- **Right‑click** issues context sensitive commands such as move, gather, attack or repair.
- The command card displays available actions for the current selection. Hover icons to see details and hotkeys.
- Press ``Backquote`` to pause. ``Backslash`` opens the developer log when dev mode is active.

## Resources and Supply
- **Minerals** and **Vespene Gas** are required for constructing units and structures.
- Send SCVs to mineral fields or a refinery to harvest resources.
- Building Supply Depots increases your supply cap so you can field more units.

## Units
The game includes SCVs, Marines, Firebats, Medics, Ghosts, Vultures, Goliaths, Siege Tanks, Wraiths, Dropships, Science Vessels, Valkyries and Battlecruisers.  Flying units hover above the ground and ignore most terrain.

## Buildings
Terran buildings provide production and upgrades:
- **Command Center** – trains SCVs and can lift off or land.
- **Supply Depot** – raises supply cap and can lower or raise to allow passage.
- **Refinery** – built on geysers to harvest Vespene.
- **Barracks** – trains infantry units.
- **Academy**, **Engineering Bay** and **Armory** – unlock upgrades for infantry, vehicles and ships.
- **Factory** – produces mechanized units and unlocks additional map chunks as you expand.
- **Starport** – constructs air units and may build a Control Tower addon for advanced ships.
- **Science Facility** – enables high tech research such as Physics Lab upgrades.
- Defensive structures include **Bunkers** and **Missile Turrets**.

Many structures can lift off and land or accept addons for new research options.

## Gameplay Tips
- Use hotkeys shown on the command card for efficient play.
- Units may garrison inside Bunkers or ride Dropships for transport.
- Explore the map to uncover additional build space as your base grows.
- Watch the status panel for alerts like insufficient minerals or supply.

For more details on recent updates see `0changelog.md`.
