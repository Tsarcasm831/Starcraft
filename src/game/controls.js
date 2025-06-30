import * as THREE from 'three';
import { getPlacementMode, attemptPlacement, cancelPlacementMode, updateGhostBuilding } from './placement.js';
import { handleSingleSelection, handleBoxSelection, getSelectedObjects, initSelection } from './selection.js';
import { handleRightClick, initRightClickHandler } from './rightClickHandler.js';
import { audioManager } from '../utils/audio.js';

const mouse = new THREE.Vector2();

let camera, scene, orbitControls, keyState;
let rendererDomElement;

// For drag selection
const selectionBox = document.getElementById('selection-box');
const startPoint = new THREE.Vector2();
let isDragging = false;

export { getSelectedObjects, handleSingleSelection, handleRightClick };

export function setupControls(deps) {
    camera = deps.camera;
    scene = deps.scene;
    orbitControls = deps.controls;
    keyState = deps.keyState;
    rendererDomElement = deps.renderer.domElement;
    
    initSelection({
        onSelectSound: deps.onSelectSound,
        allSelectables: deps.selectables,
        renderer: deps.renderer,
        camera: deps.camera
    });

    initRightClickHandler({
        camera: deps.camera,
        scene: deps.scene,
        selectables: deps.selectables,
        buildings: deps.buildings,
        mineralFields: deps.mineralFields,
        onMoveSound: deps.onMoveSound,
        createMoveIndicator: deps.createMoveIndicator,
        pathfinder: deps.pathfinder,
        updateStatusText: deps.updateStatusText,
        getSelectedObjects: getSelectedObjects
    });

    rendererDomElement.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    rendererDomElement.addEventListener('mouseup', onMouseUp);
    rendererDomElement.addEventListener('contextmenu', (event) => event.preventDefault());
}

function onMouseDown(event) {
    if (getPlacementMode()) {
        if (event.button === 0) { // Left-click for placement
            attemptPlacement(event);
        } else if (event.button === 2) { // Right-click to cancel placement
            cancelPlacementMode();
        }
        return;
    }

    if(event.target !== rendererDomElement) {
        isDragging = false;
        if (orbitControls) orbitControls.enabled = true;
        return;
    }

    if (event.button === 0) { // Left-click
        isDragging = true;
        selectionBox.style.display = 'block';
        startPoint.set(event.clientX, event.clientY);
        selectionBox.style.left = `${event.clientX}px`;
        selectionBox.style.top = `${event.clientY}px`;
        selectionBox.style.width = '0px';
        selectionBox.style.height = '0px';
        if (orbitControls) orbitControls.enabled = false;

    } else if (event.button === 2) { // Right-click
        if (orbitControls) orbitControls.enabled = false;
        handleRightClick(event);
    }
}

function onMouseMove(event) {
    if (getPlacementMode()) {
        updateGhostBuilding(event);
        return;
    }

    if (!isDragging) {
        return;
    };
    const ex = event.clientX;
    const ey = event.clientY;
    const x = Math.min(ex, startPoint.x);
    const y = Math.min(ey, startPoint.y);
    const width = Math.abs(ex - startPoint.x);
    const height = Math.abs(ey - startPoint.y);
    selectionBox.style.left = `${x}px`;
    selectionBox.style.top = `${y}px`;
    selectionBox.style.width = `${width}px`;
    selectionBox.style.height = `${height}px`;
}

function onMouseUp(event) {
    if (isDragging) {
        const dragDistance = startPoint.distanceTo(new THREE.Vector2(event.clientX, event.clientY));
        
        if (dragDistance > 5) { // It was a drag
            handleBoxSelection(selectionBox);
        } else { // It was a click
            handleSingleSelection(event);
        }
        
        isDragging = false;
        selectionBox.style.display = 'none';
    }
    
    if (orbitControls) orbitControls.enabled = true;
}

function getMousePosOnCanvas(event) {
    const rect = rendererDomElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    return { x, y, width: rect.width, height: rect.height };
}

