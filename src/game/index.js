import * as THREE from 'three';
import { setupScene } from './setupScene.js';
import { initSpawner, spawnUnit, spawnBuilding } from './spawn.js';
import { initPlacement, getPlacementMode, setPlacementMode, cancelPlacementMode, updateGhostBuilding, attemptPlacement } from './placement.js';
import { initEffects, createMoveIndicator } from './effects.js';
import { initLoop } from './loop.js';
import { gameState } from './gameState.js';
import { setupControls, getSelectedObjects } from './controls.js';
import { AudioManager } from '../utils/audio.js';
import { assetManager } from '../utils/asset-manager.js';
import { initUI, updateStatusText, updatePlacementText, hideStartScreen, setGameRunning, isPaused, isGameRunning } from './ui.js';
import { init as initMinimap } from './minimap.js';
import { preloadAssets } from './preloader.js';
import { initCameraController, updateCamera } from './cameraController.js';
import { initCommandExecutor } from './commandExecutor.js';
import { initMobileControls } from './mobileControls.js';
import { devLogger } from '../utils/dev-logger.js';
import { setupInitialState } from './initial-state.js';

let scene, camera, renderer, controls, pathfinder, terrainObstacles, gridHelper;
let units = [];
let buildings = [];
let mineralFields = [];
let vespeneGeysers = [];
let selectables = [];
let collidableObjects = [];
const audioManager = new AudioManager();
const keyState = {};
let gameContainer;
let devModeActive = false;

function init() {
    gameContainer = document.getElementById('game-container');
    
    // Key listeners for dev mode and camera controls
    window.addEventListener('keydown', e => {
        keyState[e.code] = true; 
    });
    window.addEventListener('keyup', e => {
        keyState[e.code] = false;
    });

    const commandExecutor = initCommandExecutor({
        getSelectedObjects,
        gameState,
        units,
        setPlacementMode,
        updateStatusText,
    });
    
    initUI(commandExecutor, startGame, audioManager, () => gridHelper, () => keyState);
}

async function startGame() {
    const devModeCheckbox = document.getElementById('enable-dev-mode-checkbox');
    if (devModeCheckbox.checked) {
        devModeActive = true;
        devLogger.activate();
    }

    audioManager.resumeContext();

    const loadingOverlay = document.getElementById('loading-overlay');
    loadingOverlay.classList.add('visible');

    setTimeout(hideStartScreen, 100);
    
    await preloadAssets(audioManager);
    
    const sceneData = setupScene(gameContainer);
    scene = sceneData.scene;
    camera = sceneData.camera;
    renderer = sceneData.renderer;
    controls = sceneData.controls;
    pathfinder = sceneData.pathfinder;
    terrainObstacles = sceneData.terrainObstacles;
    gridHelper = sceneData.gridHelper;

    initSpawner({ scene, units, buildings, selectables, collidableObjects, pathfinder, gameState, audioManager });
    initEffects(scene);

    terrainObstacles.forEach(ob => collidableObjects.push(ob));

    setupInitialState({
        scene, units, buildings, selectables, collidableObjects, mineralFields,
        vespeneGeysers, gameState, pathfinder, spawnBuilding, devModeActive
    });

    const commandExecutor = initCommandExecutor({
        getSelectedObjects,
        gameState,
        units,
        setPlacementMode,
        updateStatusText,
    });

    setupControls({
        camera,
        scene,
        selectables,
        buildings,
        onSelectSound: () => audioManager.playSound('select'),
        onMoveSound: () => audioManager.playSound('move', 0.7),
        createMoveIndicator,
        controls,
        pathfinder,
        updateStatusText,
        keyState,
        mineralFields,
        renderer,
    });

    initMinimap({
        scene,
        camera,
        controls,
        units,
        buildings,
        mineralFields,
        vespeneGeysers,
        mapWidth: sceneData.mapWidth,
        mapHeight: sceneData.mapHeight,
    });
    
    initPlacement({ scene, camera, renderer, vespeneGeysers, collidableObjects, pathfinder, updatePlacementText: updatePlacementText });
    initCameraController({ camera, controls, keyState });
    initMobileControls({ keyState, renderer, camera, scene });
    
    const loopDeps = {
        scene, camera, renderer, buildings, units, vespeneGeysers, gameState, pathfinder, 
        spawnUnit: spawnUnitCallback,
        spawnBuilding, 
        updateCamera, 
        get isPaused() { return isPaused; } 
    };

    initLoop(loopDeps);

    setGameRunning(true);
    audioManager.playBackgroundMusic();

    units.forEach(unit => {
        if ((unit.isFlying || unit.name === 'Vulture') && unit.selectionIndicator) {
            scene.add(unit.selectionIndicator);
        }
    });

    const mobileControlsCheckbox = document.getElementById('enable-mobile-controls-checkbox');
    if (mobileControlsCheckbox.checked) {
        document.getElementById('mobile-controls').classList.remove('hidden');
        document.getElementById('mobile-cursor').classList.remove('hidden');
        if (window.mobileControls) {
            window.mobileControls.initJoystick();
            window.mobileControls.initTapToSelect();
        }
    }

    document.body.removeEventListener('keydown', startGame);
}

function spawnUnitCallback(unitType, position) {
    const unit = spawnUnit(unitType, position);
    if (unit && (unit.isFlying || unit.name === 'Vulture') && unit.selectionIndicator) {
        scene.add(unit.selectionIndicator);
    }
    return unit;
}

export function getMousePosOnCanvas() {
    const rect = renderer.domElement.getBoundingClientRect();
    const center_x = rect.left + rect.width / 2;
    const center_y = rect.top + rect.height / 2;
    return { x: center_x, y: center_y, width: rect.width, height: rect.height, isMobile: true };
}

export { getPlacementMode, attemptPlacement, cancelPlacementMode, updateGhostBuilding } from './placement.js';

init();