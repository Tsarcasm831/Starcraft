import * as THREE from 'three';
import { MineralField } from '../resources/mineral-field.js';
import { VespeneGeyser } from '../resources/vespene-geyser.js';
import { Refinery } from '../buildings/refinery.js';
import { CommandCenter } from '../buildings/command-center.js';
import { SCVMark2 } from '../units/scv-mark-2.js';
import { SCV } from '../units/scv.js';
import { Bunker } from '../buildings/bunker.js';
import { Dropship } from '../units/dropship.js';
import { Infantry } from '../units/infantry.js';
import { devLogger } from '../utils/dev-logger.js';
import { getGroundMeshes } from '../utils/terrain.js';

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

let camera, scene, allSelectables, onMoveSound, createMoveIndicator, pathfinder, updateStatusText;

export function setPathfinder(newPathfinder) {
    pathfinder = newPathfinder;
}
let allBuildings = [];
let allMineralFields = [];
let getSelectedObjects;

export function initRightClickHandler(deps) {
    camera = deps.camera;
    scene = deps.scene;
    allSelectables = deps.selectables;
    allBuildings = deps.buildings;
    allMineralFields = deps.mineralFields;
    onMoveSound = deps.onMoveSound;
    createMoveIndicator = deps.createMoveIndicator;
    pathfinder = deps.pathfinder;
    updateStatusText = deps.updateStatusText;
    getSelectedObjects = deps.getSelectedObjects;
}

function getMousePosOnCanvas(event) {
    const rect = document.querySelector('canvas').getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    return { x, y, width: rect.width, height: rect.height };
}

function assignGatherersToResource(gatherers, resource) {
    onMoveSound();
    createMoveIndicator(resource.mesh.position);
    
    const resourcePos = resource.mesh.position;
    const count = gatherers.length;
    const resourceCollider = resource.getCollider();
    const resourceSize = resourceCollider.getSize(new THREE.Vector3());
    const radius = Math.max(resourceSize.x, resourceSize.z) / 2 + 1.5;

    gatherers.forEach((unit, i) => {
        const angle = (i / count) * Math.PI * 2;
        const targetPos = new THREE.Vector3(
            resourcePos.x + radius * Math.cos(angle),
            resourcePos.y,
            resourcePos.z + radius * Math.sin(angle)
        );
        unit.gather(resource, allBuildings, targetPos);
    });
}

function handleMoveCommand(unitsToMove, targetPosition) {
    if (!unitsToMove || unitsToMove.length === 0 || !targetPosition) return;
    
    devLogger.log('RightClickHandler', `Issuing move command to ${unitsToMove.length} units to ${targetPosition.x.toFixed(1)}, ${targetPosition.z.toFixed(1)}.`);
    onMoveSound();
    
    createMoveIndicator(targetPosition);
    
    const count = unitsToMove.length;
    const gridSize = Math.ceil(Math.sqrt(count));
    const spacing = 2; 
    const halfSize = (gridSize - 1) * spacing / 2;

    unitsToMove.forEach((unit, i) => {
        if (typeof unit.stopActions === 'function') {
            unit.stopActions();
        }

        const row = Math.floor(i / gridSize);
        const col = i % gridSize;
        const offsetX = col * spacing - halfSize;
        const offsetZ = row * spacing - halfSize;
        const finalTarget = targetPosition.clone().add(new THREE.Vector3(offsetX, 0, offsetZ));
        
        if (unit.isFlying) {
            unit.setPath([finalTarget]);
            return;
        }

        let path = pathfinder.findPath(unit.mesh.position, finalTarget);
        if (!path || path.length === 0) {
            path = pathfinder.findPath(unit.mesh.position, targetPosition);
        }

        if (path && path.length > 0) {
            unit.setPath(path);
            if (unit.state) {
                unit.state = 'moving';
            }
        }
    });
}

export function handleRightClick(event) {
    const selectedObjects = getSelectedObjects();
    const moveableUnits = selectedObjects.filter(obj => 'setPath' in obj);
    if (moveableUnits.length === 0) {
        const commandCenters = selectedObjects.filter(obj => obj instanceof CommandCenter);
        if (commandCenters.length === 0) return;
    }

    const pos = event.isMobile ? event : getMousePosOnCanvas(event);
    mouse.x = (pos.x / pos.width) * 2 - 1;
    mouse.y = -(pos.y / pos.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    const objectMeshes = allSelectables.map(s => s.mesh);
    const objectIntersects = raycaster.intersectObjects(objectMeshes, true);

    let clickedObject = objectIntersects.length > 0 ? objectIntersects[0].object.userData.owner : null;
    
    if (clickedObject) {
        devLogger.log('RightClickHandler', `Clicked on object: ${clickedObject.name}`);
    } else {
        devLogger.log('RightClickHandler', `Clicked on ground.`);
    }

    if (clickedObject && clickedObject.isAddon) {
        clickedObject = clickedObject.parentBuilding;
    }

    if (clickedObject instanceof CommandCenter && clickedObject.state !== 'grounded') {
        // Flying CC move handled by fallback
    } else if (objectIntersects.length > 0) {
        const builders = selectedObjects.filter(obj => obj instanceof SCVMark2 || obj instanceof SCV);
        if (builders.length > 0 && clickedObject?.isUnderConstruction && clickedObject.currentHealth < clickedObject.maxHealth) {
            onMoveSound();
            createMoveIndicator(clickedObject.mesh.position);
            const buildingCollider = clickedObject.getCollider();
            const size = buildingCollider.getSize(new THREE.Vector3());
            const buildPosition = clickedObject.mesh.position;
            const radius = Math.max(size.x, size.z) / 2 + 1.5;

            builders.forEach((builder, i) => {
                const angle = (i / builders.length) * (Math.PI * 2);
                const targetPos = new THREE.Vector3(
                    buildPosition.x + radius * Math.cos(angle),
                    buildPosition.y,
                    buildPosition.z + radius * Math.sin(angle)
                );
                builder.build(clickedObject, pathfinder, targetPos);
            });
            return;
        }

        const repairers = selectedObjects.filter(obj => obj instanceof SCVMark2 || obj instanceof SCV);
        if (repairers.length > 0 && clickedObject?.currentHealth !== undefined && !clickedObject.isUnderConstruction && clickedObject.currentHealth < clickedObject.maxHealth) {
            onMoveSound();
            createMoveIndicator(clickedObject.mesh.position);
            const collider = clickedObject.getCollider();
            const size = collider.getSize(new THREE.Vector3());
            const pos = clickedObject.mesh.position;
            const radius = Math.max(size.x, size.z) / 2 + 1.5;

            repairers.forEach((rep, i) => {
                const angle = (i / repairers.length) * (Math.PI * 2);
                const targetPos = new THREE.Vector3(
                    pos.x + radius * Math.cos(angle),
                    pos.y,
                    pos.z + radius * Math.sin(angle)
                );
                rep.repair(clickedObject, pathfinder, targetPos);
            });
            return;
        }

        const medics = selectedObjects.filter(obj => obj instanceof Infantry && obj.constructor.name === 'Medic');
        if (medics.length > 0 && clickedObject instanceof Infantry && clickedObject.currentHealth < clickedObject.maxHealth) {
            onMoveSound();
            createMoveIndicator(clickedObject.mesh.position);
            const collider = clickedObject.getCollider();
            const size = collider.getSize(new THREE.Vector3());
            const pos = clickedObject.mesh.position;
            const radius = Math.max(size.x, size.z) / 2 + 1.0;

            medics.forEach((medic, i) => {
                const angle = (i / medics.length) * (Math.PI * 2);
                const targetPos = new THREE.Vector3(
                    pos.x + radius * Math.cos(angle),
                    pos.y,
                    pos.z + radius * Math.sin(angle)
                );
                medic.heal(clickedObject, pathfinder, targetPos);
            });
            return;
        }

        const garrisonableUnits = selectedObjects.filter(obj => typeof obj.garrison === 'function');
        if (garrisonableUnits.length > 0 && (clickedObject instanceof Bunker || clickedObject instanceof Dropship)) {
            const spaceAvailable = clickedObject.capacity - clickedObject.garrisonedUnits.length;
            if (spaceAvailable <= 0) {
                updateStatusText(`${clickedObject.name} is full.`);
                return;
            }
            onMoveSound();
            createMoveIndicator(clickedObject.mesh.position);
            const unitsToGarrison = garrisonableUnits.slice(0, spaceAvailable);
            unitsToGarrison.forEach(unit => unit.garrison(clickedObject));
            handleMoveCommand(unitsToGarrison, clickedObject.mesh.position);
            if (unitsToGarrison.length < garrisonableUnits.length) {
                updateStatusText(`Not enough space in ${clickedObject.name} for all units.`);
            }
            return;
        }

        const gatherers = selectedObjects.filter(obj => typeof obj.gather === 'function');
        if (gatherers.length > 0) {
            let gatherTarget = null;
            if (clickedObject instanceof MineralField) {
                const availableSlots = Math.max(0, 2 - clickedObject.miners.size);
                const unitsToAssignToThisField = gatherers.splice(0, availableSlots);
                if (unitsToAssignToThisField.length > 0) {
                    assignGatherersToResource(unitsToAssignToThisField, clickedObject);
                }
                if (gatherers.length > 0) {
                    const otherMineralFields = allMineralFields.filter(mf => mf !== clickedObject && !mf.isDepleted).sort((a, b) => a.mesh.position.distanceToSquared(clickedObject.mesh.position) - b.mesh.position.distanceToSquared(clickedObject.mesh.position));
                    let remainingGatherers = gatherers.slice();
                    for (const field of otherMineralFields) {
                        if (remainingGatherers.length === 0) break;
                        const slots = Math.max(0, 2 - field.miners.size);
                        if (slots > 0) {
                            const unitsForThisField = remainingGatherers.splice(0, slots);
                            assignGatherersToResource(unitsForThisField, field);
                        }
                    }
                    if (remainingGatherers.length > 0) {
                        updateStatusText("Not enough available mineral fields.");
                    }
                }
                return;
            }
            
            if (clickedObject instanceof Refinery) {
                gatherTarget = clickedObject;
            } else if (clickedObject instanceof VespeneGeyser) {
                if (clickedObject.hasRefinery) {
                    gatherTarget = allBuildings.find(b => b.name === 'Refinery' && b.geyser === clickedObject);
                } else {
                    updateStatusText("Refinery required to harvest vespene gas.");
                }
            }

            if (gatherTarget && !gatherTarget.isDepleted) {
                assignGatherersToResource(gatherers, gatherTarget);
                const nonGatherers = moveableUnits.filter(u => !gatherers.includes(u));
                if (nonGatherers.length > 0) {
                    handleMoveCommand(nonGatherers, gatherTarget.mesh.position);
                }
                return; 
            }
        }
    }
    
    const groundMeshes = getGroundMeshes(scene);
    if (groundMeshes.length === 0) return;

    const groundIntersects = raycaster.intersectObjects(groundMeshes, true);

    if (groundIntersects.length > 0) {
        const flyingCCs = selectedObjects.filter(obj => obj instanceof CommandCenter && obj.state === 'flying');
        if (flyingCCs.length > 0) {
             onMoveSound();
             createMoveIndicator(groundIntersects[0].point);
             const cc = flyingCCs[0];
             const path = pathfinder.findPath(cc.mesh.position, groundIntersects[0].point);
             if (path) {
                 cc.setPath(path.map(p => new THREE.Vector3(p.x, cc.hoverHeight, p.z)));
             }
             return;
        }

        handleMoveCommand(moveableUnits, groundIntersects[0].point);
    }
}