import * as THREE from 'three';
import { updateStatusText, updatePlacementText } from './ui.js';
import { spawnBuilding } from './spawn.js';
import { gameState } from './gameState.js';
import { getGroundMeshes } from '../utils/terrain.js';

let scene, camera, renderer, vespeneGeysers, collidableObjects, pathfinder;

export function setPathfinder(newPathfinder) {
    pathfinder = newPathfinder;
}

export let placementMode = null;
let ghostBuilding = null;
const ghostMaterialValid = new THREE.MeshBasicMaterial({
    color: 0x00ff00,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
    wireframe: true
});
const ghostMaterialInvalid = new THREE.MeshBasicMaterial({
    color: 0xff0000,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
    wireframe: true
});

export function initPlacement(opts) {
    scene = opts.scene;
    camera = opts.camera;
    renderer = opts.renderer;
    vespeneGeysers = opts.vespeneGeysers;
    collidableObjects = opts.collidableObjects;
    pathfinder = opts.pathfinder;

    const ghostGeometry = new THREE.BoxGeometry(1, 1, 1);
    ghostBuilding = new THREE.Mesh(ghostGeometry, ghostMaterialValid);
    ghostBuilding.visible = false;
    scene.add(ghostBuilding);
}

export function getPlacementMode() {
    return placementMode;
}

export function setPlacementMode(mode) {
    if (placementMode) {
        cancelPlacementMode();
    }

    placementMode = mode;
    const commandName = mode.command.command;

    const sizeData = {
        'build_command_center': new THREE.Vector3(13, 10, 8),
        'land_command_center': new THREE.Vector3(13, 10, 8),
        'build_supply_depot': new THREE.Vector3(4, 2.5, 4),
        'build_refinery': new THREE.Vector3(4.4, 2.5, 4.4),
        'build_barracks': new THREE.Vector3(7, 5, 7),
        'land_barracks': new THREE.Vector3(7, 5, 7),
        'build_engineering_bay': new THREE.Vector3(6, 5, 6),
        'land_engineering_bay': new THREE.Vector3(6, 5, 6),
        'build_bunker': new THREE.Vector3(4, 3, 4),
        'build_academy': new THREE.Vector3(6, 4, 6),
        'build_missile_turret': new THREE.Vector3(3, 5, 3),
        'build_factory': new THREE.Vector3(8, 6, 6),
        'land_factory': new THREE.Vector3(8, 6, 6),
        'build_starport': new THREE.Vector3(9, 7, 9),
        'land_starport': new THREE.Vector3(9, 7, 9),
        'build_armory': new THREE.Vector3(6, 5, 6),
        'build_science_facility': new THREE.Vector3(8, 6, 8),
    };

    const size = sizeData[commandName];
    if (!size) {
        console.warn(`No size defined for placement of ${commandName}`);
        cancelPlacementMode();
        return;
    }

    ghostBuilding.scale.copy(size);
    ghostBuilding.visible = true;

    const actionText = placementMode.type === 'land' ? 'Land' : 'Place';
    updatePlacementText(`${actionText} ${mode.command.name}. Left-click to confirm, right-click to cancel.`);
}

export function cancelPlacementMode() {
    placementMode = null;
    ghostBuilding.visible = false;
    updatePlacementText('');
    updateStatusText('Cancelled.');
}

export function updateGhostBuilding(event) {
    if (!placementMode) return;

    const mouse = new THREE.Vector2();
    const raycaster = new THREE.Raycaster();
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const groundMeshes = getGroundMeshes(scene);
    if (groundMeshes.length > 0) {
        const intersects = raycaster.intersectObjects(groundMeshes, true);
        if (intersects.length > 0) {
            const hit = intersects[0];
            const point = hit.point;
            const normalMatrix = new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld);
            const worldNormal = hit.face.normal.clone().applyMatrix3(normalMatrix).normalize();
            ghostBuilding.position.copy(point);
            const placementCheckResult = checkPlacementValidity(point, placementMode.command.command, worldNormal);
            ghostBuilding.material = placementCheckResult.valid ? ghostMaterialValid : ghostMaterialInvalid;

            if (placementCheckResult.valid && placementCheckResult.extraData && placementCheckResult.extraData.position) {
                ghostBuilding.position.copy(placementCheckResult.extraData.position);
            }
        }
    }
}

export function attemptPlacement(event) {
    if (!placementMode) return;

    const rect = renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    const groundMeshes = getGroundMeshes(scene);
    if (groundMeshes.length === 0) return;

    const intersects = raycaster.intersectObjects(groundMeshes, true);
    if (intersects.length > 0) {
        const hit = intersects[0];
        const position = hit.point;
        const normalMatrix = new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld);
        const worldNormal = hit.face.normal.clone().applyMatrix3(normalMatrix).normalize();

        const placementCheckResult = checkPlacementValidity(position, placementMode.command.command, worldNormal);
        if (placementCheckResult.valid) {
            if (placementMode.type === 'land') {
                const finalPosition = placementCheckResult.extraData?.position || position;
                placementMode.building.landAt(finalPosition, pathfinder);
                updateStatusText(`${placementMode.building.name} landing sequence initiated.`);
            } else { // 'build' type
                const command = placementMode.command;
                gameState.minerals -= command.cost.minerals;
                if (command.cost.vespene) {
                    gameState.vespene -= command.cost.vespene;
                }

                const extraData = placementCheckResult.extraData || {};
                const newBuilding = spawnBuilding(command.command, extraData.position || position, command.buildTime, extraData);
                placementMode.builder.build(newBuilding, pathfinder);

                updateStatusText(`${newBuilding.name} construction started.`);
            }
            cancelPlacementMode();
        } else {
            updateStatusText(placementCheckResult.reason || 'Cannot build here.');
        }
    }
}

function checkPlacementValidity(position, buildingCommand, normal) {
    const MAX_SLOPE_COS = Math.cos(30 * Math.PI / 180);
    if (normal && normal.y < MAX_SLOPE_COS) {
        return { valid: false, reason: 'Terrain too steep.' };
    }

    const commandToSizeMap = {
        'build_command_center': new THREE.Vector3(13, 10, 8),
        'land_command_center': new THREE.Vector3(13, 10, 8),
        'build_supply_depot': new THREE.Vector3(4, 2.5, 4),
        'build_refinery': new THREE.Vector3(4.4, 2.5, 4.4),
        'build_barracks': new THREE.Vector3(7, 5, 7),
        'land_barracks': new THREE.Vector3(7, 5, 7),
        'build_engineering_bay': new THREE.Vector3(6, 5, 6),
        'land_engineering_bay': new THREE.Vector3(6, 5, 6),
        'build_bunker': new THREE.Vector3(4, 3, 4),
        'build_academy': new THREE.Vector3(6, 4, 6),
        'build_missile_turret': new THREE.Vector3(3, 5, 3),
        'build_factory': new THREE.Vector3(8, 6, 6),
        'land_factory': new THREE.Vector3(8, 6, 6),
        'build_starport': new THREE.Vector3(9, 7, 9),
        'land_starport': new THREE.Vector3(9, 7, 9),
        'build_armory': new THREE.Vector3(6, 5, 6),
        'build_science_facility': new THREE.Vector3(8, 6, 8),
    };

    if (buildingCommand === 'build_refinery') {
        let targetGeyser = null;
        for (const geyser of vespeneGeysers) {
            if (geyser.getCollider().containsPoint(position) && !geyser.hasRefinery) {
                targetGeyser = geyser;
                break;
            }
        }
        if (targetGeyser) {
            return {
                valid: true,
                extraData: {
                    geyser: targetGeyser,
                    position: targetGeyser.mesh.position
                }
            };
        } else {
            return { valid: false, reason: 'Must be built on a Vespene Geyser.' };
        }
    }

    const buildingSize = commandToSizeMap[buildingCommand];

    if (!buildingSize) {
        return { valid: false, reason: 'Unknown building.' };
    }

    const tempBox = new THREE.Box3().setFromCenterAndSize(position, buildingSize);

    for (const obj of collidableObjects) {
        // If we are landing a building, don't check for collision with itself.
        if (placementMode && placementMode.type === 'land' && obj === placementMode.building) {
            continue;
        }
        if (tempBox.intersectsBox(obj.getCollider())) {
            return { valid: false, reason: 'Cannot build here.' };
        }
    }
    return { valid: true };
}