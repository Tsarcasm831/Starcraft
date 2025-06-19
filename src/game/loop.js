import * as THREE from 'three';
import { updateUI } from './ui.js';
import { getSelectedObjects } from './controls.js';
import { updateGatheringEffects, updateActiveEffects } from './effects.js';
import { update as updateMinimap } from './minimap.js';

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
    const { scene, camera, renderer, buildings, units, vespeneGeysers, gameState, pathfinder, spawnUnit, spawnBuilding, updateCamera, updateGridLabels, gridLabels } = deps;

    updateCamera(delta);

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
    if (gridLabels) {
        updateGridLabels(gridLabels);
    }

    renderer.render(scene, camera);
}