# Changelog

## Unreleased

- Plateaus with ramps no longer block pathfinding; `createPlateau` gained an `isObstacle` option.
- Added a changelog modal to view project updates and manual information directly in-game. The changelog content is loaded from this file.
- Documented in `AGENTS.md` that all contributions must update this changelog.
- Explained in `AGENTS.md` how remote sound URLs in `preloader.js` are loaded and registered.
- Control Tower can research flight upgrades.
- Physics Lab enables Battlecruiser upgrades.
- Nuclear Silo can arm nuclear missiles over time.
- Comsat Station's scanner sweep now consumes energy and reveals terrain.
- Armory can research vehicle and ship weapon/armor upgrades.
- SCV can now construct basic buildings and repair damaged allies.
- Medics can heal wounded infantry at the cost of energy.
- Ghosts can cloak, use Lockdown and call Nuclear Strikes when a loaded Nuclear Silo is available.
- Science Vessels can deploy Defensive Matrix, EMP Shockwave and Irradiate abilities.
- Battlecruisers can fire the Yamato Cannon when researched, consuming energy and displaying a blast effect.
- Spotify advertisement now plays for a full 30 seconds before closing.
- In-game advertisement now shows a YouTube video instead of a Spotify track.
- Background music pauses while the advertisement video plays.
- Added a placeholder video panel beside the status messages for future cutscenes.
- Fixed the video panel so it stays anchored to the status text box.
- Map expansion logic now positions new ground based on the number of unlocked chunks, keeping pathfinding and the minimap consistent.
- Border plateaus can now include optional ramps so elevations vary across new map chunks.
- Plateau generation was moved to a reusable helper to avoid duplicate logic.
- Fixed a crash when SCVs attempted to repair mineral fields by excluding
  resources from repair commands.
- Anchored the main menu promo images so they remain fixed when opening the options menu.
- Added remote Firebat, Marine and Medic sound effects to the preloader.
- SCV Mark 2 loads remote animations for idle, walking and repair.
- SCV Mark 2 now relies on the remote rigged idle model so its animations play correctly.
- SCV Mark 2 animations load correctly using a local rigged model.
- Removed obsolete remote SCV2 model reference so the unit renders properly.
- Assets and sounds now load in parallel for faster startup times.
- Documented that `apt-utils` and `pygltflib` must be installed at startup.
- Loading overlay now shows a progress bar to track asset downloads.
- Centered the SCV Mark 2 model so it appears correctly in-game.

