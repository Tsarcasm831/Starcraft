import * as THREE from 'three';
import { updateUI } from './ui.js';
import { getSelectedObjects } from './controls.js';
import { updateGatheringEffects, updateActiveEffects } from './effects.js';
import { update as updateMinimap } from './minimap.js';
import { devLogger } from '../utils/dev-logger.js';

const clock = new THREE.Clock();
let deps;

export function initLoop(_deps) {
    deps = _deps;
    animate();
}

function animate() {
    requestAnimationFrame(animate);

    const { isPaused } = deps;
    if (isPaused) {
        return; // Skip game logic updates if paused
    }

    const delta = clock.getDelta();
    devLogger.log('Loop', `Frame delta: ${delta.toFixed(4)}s`);
    const { scene, camera, renderer, buildings, units, vespeneGeysers, gameState, pathfinder, spawnUnit, spawnBuilding, updateCamera } = deps;

    updateCamera(delta);

    // Update unit counts in gameState for dynamic costs
    gameState.unitCounts.scv = units.filter(u => u.name === 'SCV').length;
    gameState.unitCounts.scv_mark_2 = units.filter(u => u.name === 'SCV Mark 2').length;

    if (buildings.length > 0 && buildings[0].update) {
        buildings[0].update(delta, gameState, spawnUnit, spawnBuilding);
    }
    buildings.forEach(building => {
        if (building.update) {
            building.update(delta, gameState, spawnUnit, spawnBuilding);
        }
    });
    vespeneGeysers.forEach(geyser => {
        if (geyser.update) {
            geyser.update(delta);
        }
    });
    units.forEach(unit => {
        if (!unit.isGarrisoned) {
            unit.update(delta, pathfinder, gameState, buildings, scene);
        }
    });

    const selectedObjects = getSelectedObjects();
    updateUI(selectedObjects, gameState);
    updateMinimap(selectedObjects);

    updateGatheringEffects(units);
    updateActiveEffects(delta);

    renderer.render(scene, camera);
}