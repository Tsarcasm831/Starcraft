import * as THREE from 'three';
import { Unit } from '../units/unit.js';
import { SCV } from '../units/scv.js';
import { SCVMark2 } from '../units/scv-mark-2.js';
import { Firebat } from '../units/firebat.js';
import { Medic } from '../units/medic.js';
import { Ghost } from '../units/ghost.js';
import { Vulture } from '../units/vulture.js';
import { SiegeTank } from '../units/siege-tank.js';
import { CommandCenter } from '../buildings/command-center.js';
import { SupplyDepot } from '../buildings/supply-depot.js';
import { Refinery } from '../buildings/refinery.js';
import { Barracks } from '../buildings/barracks.js';
import { EngineeringBay } from '../buildings/engineering-bay.js';
import { Bunker } from '../buildings/bunker.js';
import { Academy } from '../buildings/academy.js';
import { MissileTurret } from '../buildings/missile-turret.js';
import { Factory } from '../buildings/factory.js';
import { Starport } from '../buildings/starport.js';
import { ComsatStation } from '../buildings/comsat-station.js';
import { NuclearSilo } from '../buildings/nuclear-silo.js';
import { Goliath } from '../units/goliath.js';
import { Wraith } from '../units/wraith.js';
import { Dropship } from '../units/dropship.js';
import { Armory } from '../buildings/armory.js';
import { ScienceVessel } from '../units/science-vessel.js';
import { ScienceFacility } from '../buildings/science-facility.js';
import { ControlTower } from '../buildings/control-tower.js';
import { Valkyrie } from '../units/valkyrie.js';
import { Battlecruiser } from '../units/battlecruiser.js';
import { PhysicsLab } from '../buildings/physics-lab.js';
import { Zealot } from '../protoss/zealot.js';
import { Probe } from '../protoss/probe.js';
import { Adept } from '../protoss/adept.js';
import { Stalker } from '../protoss/stalker.js';
import { Dragoon } from '../protoss/dragoon.js';
import { DarkTemplar } from '../protoss/darktemplar.js';
import { HighTemplar } from '../protoss/hightemplar.js';
import { Zergling } from '../zerg/zergling.js';
import { Hydralisk } from '../zerg/hydralisk.js';
import { Larva } from '../zerg/larva.js';
import { Hatchery } from '../zerg/hatchery.js';
import { audioManager } from '../utils/audio.js';

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

let selectedObjects = [];
let onSelectSound;
let allSelectables = [];
let rendererDomElement, camera;

/** @tweakable The chance (0 to 1) that a unit will play a sound when selected. */
const unitSelectAckProbability = 1.0;

export function initSelection(deps) {
    onSelectSound = deps.onSelectSound;
    allSelectables = deps.allSelectables;
    rendererDomElement = deps.renderer.domElement;
    camera = deps.camera;
}

export function getSelectedObjects() {
    return selectedObjects;
}

function changeSelection(newSelection) {
    selectedObjects.forEach(obj => obj.deselect());
    selectedObjects = newSelection;
    selectedObjects.forEach(obj => {
        if (typeof obj.select === 'function') {
             obj.select();
        }
    });

    if (selectedObjects.length > 0) {
        const playedUnitSound = audioManager.playUnitSound(selectedObjects, 'select', unitSelectAckProbability);
        if (!playedUnitSound && onSelectSound) {
            onSelectSound();
        }
    }
}

function getMousePosOnCanvas(event) {
    const rect = rendererDomElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    return { x, y, width: rect.width, height: rect.height };
}

export function handleSingleSelection(event) {
    const pos = event.isMobile ? {
        x: event.clientX - rendererDomElement.getBoundingClientRect().left,
        y: event.clientY - rendererDomElement.getBoundingClientRect().top,
        width: rendererDomElement.clientWidth,
        height: rendererDomElement.clientHeight
    } : getMousePosOnCanvas(event);

    mouse.x = (pos.x / pos.width) * 2 - 1;
    mouse.y = -(pos.y / pos.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    const objectMeshes = allSelectables.map(s => s.mesh);
    const intersects = raycaster.intersectObjects(objectMeshes, true);

    if (intersects.length > 0) {
        const clickedObject = intersects[0].object.userData.owner;
        if (clickedObject) {
            changeSelection([clickedObject]);
        } else {
             changeSelection([]);
        }
    } else {
        changeSelection([]);
    }
}

export function handleBoxSelection(selectionBox) {
    const boxBounds = selectionBox.getBoundingClientRect();
    const objectsInBox = [];
    const canvasRect = rendererDomElement.getBoundingClientRect();

    allSelectables.forEach(selectable => {
        if (!selectable.mesh.position) return;
        const screenPos = selectable.mesh.position.clone().project(camera);
        const x = (screenPos.x * 0.5 + 0.5) * canvasRect.width + canvasRect.left;
        const y = (-screenPos.y * 0.5 + 0.5) * canvasRect.height + canvasRect.top;

        if (x >= boxBounds.left && x <= boxBounds.right && y >= boxBounds.top && y <= boxBounds.bottom) {
            // Only add ownable units to selection
            if (
                selectable instanceof SCV ||
                selectable instanceof SCVMark2 ||
                selectable instanceof Unit ||
                selectable instanceof Firebat ||
                selectable instanceof Medic ||
                selectable instanceof Ghost ||
                selectable instanceof Vulture ||
                selectable instanceof SiegeTank ||
                selectable instanceof Goliath ||
                selectable instanceof Wraith ||
                selectable instanceof Dropship ||
                selectable instanceof ScienceVessel ||
                selectable instanceof Valkyrie ||
                selectable instanceof Battlecruiser ||
                selectable instanceof Zealot ||
                selectable instanceof Probe ||
                selectable instanceof Adept ||
                selectable instanceof Stalker ||
                selectable instanceof DarkTemplar ||
                selectable instanceof HighTemplar ||
                selectable instanceof Zergling ||
                selectable instanceof Hydralisk ||
                selectable instanceof Larva ||
                selectable instanceof Dragoon ||
                selectable instanceof CommandCenter ||
                selectable instanceof SupplyDepot ||
                selectable instanceof Refinery ||
                selectable instanceof Barracks ||
                selectable instanceof EngineeringBay ||
                selectable instanceof Bunker ||
                selectable instanceof Academy ||
                selectable instanceof MissileTurret ||
                selectable instanceof Factory ||
                selectable instanceof Starport ||
                selectable instanceof Armory ||
                selectable instanceof ScienceFacility ||
                selectable instanceof ControlTower ||
                selectable instanceof PhysicsLab ||
                selectable instanceof Hatchery ||
                selectable instanceof ComsatStation ||
                selectable instanceof NuclearSilo
            ) {
                objectsInBox.push(selectable);
            }
        }
    });
    changeSelection(objectsInBox);
}