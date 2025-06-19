import * as THREE from 'three';
import { setupScene } from './setupScene.js';
import { initSpawner, spawnUnit, spawnBuilding } from './spawn.js';
import { initPlacement, getPlacementMode, setPlacementMode, cancelPlacementMode, updateGhostBuilding, attemptPlacement } from './placement.js';
import { initEffects, createMoveIndicator } from './effects.js';
import { initLoop } from './loop.js';
import { gameState } from './gameState.js';
import { SCV } from '../units/scv.js';
import { SCVMark2 } from '../units/scv-mark-2.js';
import { CommandCenter } from '../buildings/command-center.js';
import { MineralField } from '../resources/mineral-field.js';
import { VespeneGeyser } from '../resources/vespene-geyser.js';
import { SupplyDepot } from '../buildings/supply-depot.js';
import { Refinery } from '../buildings/refinery.js';
import { Barracks } from '../buildings/barracks.js';
import { EngineeringBay } from '../buildings/engineering-bay.js';
import { Bunker } from '../buildings/bunker.js';
import { Academy } from '../buildings/academy.js';
import { MissileTurret } from '../buildings/missile-turret.js';
import { ComsatStation } from '../buildings/comsat-station.js';
import { NuclearSilo } from '../buildings/nuclear-silo.js';
import { Factory } from '../buildings/factory.js';
import { setupControls, getSelectedObjects } from './controls.js';
import { AudioManager } from '../utils/audio.js';
import { assetManager } from '../utils/asset-manager.js';
import { initUI, updateStatusText } from './ui.js';
import { init as initMinimap } from './minimap.js';
import { Unit } from '../units/unit.js';
import { Firebat } from '../units/firebat.js';
import { Medic } from '../units/medic.js';
import { Ghost } from '../units/ghost.js';
import { preloadAssets } from './preloader.js';
import { initCameraController, updateCamera } from './cameraController.js';
import { initCommandExecutor } from './commandExecutor.js';
import { initMobileControls } from './mobileControls.js';

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
let startScreen;
let mobileControlsCheckbox;
let mainMenu, optionsMenu, optionsButton, backButton;
let bgmVolumeSlider, sfxVolumeSlider;
let ingameOptionsOverlay, resumeButton, quitButton;
let ingameBgmVolumeSlider, ingameSfxVolumeSlider;
let isPaused = false;

async function init() {
    gameContainer = document.getElementById('game-container');
    startScreen = document.getElementById('start-screen');
    mobileControlsCheckbox = document.getElementById('enable-mobile-controls-checkbox');
    mainMenu = document.getElementById('main-menu');
    optionsMenu = document.getElementById('options-menu');
    optionsButton = document.getElementById('options-button');
    backButton = document.getElementById('back-button');
    bgmVolumeSlider = document.getElementById('bgm-volume-slider');
    sfxVolumeSlider = document.getElementById('sfx-volume-slider');

    // In-game menu elements
    ingameOptionsOverlay = document.getElementById('ingame-options-overlay');
    resumeButton = document.getElementById('resume-button');
    quitButton = document.getElementById('quit-button');
    ingameBgmVolumeSlider = document.getElementById('ingame-bgm-volume-slider');
    ingameSfxVolumeSlider = document.getElementById('ingame-sfx-volume-slider');

    await preloadAssets(audioManager);

    const sceneData = setupScene(gameContainer);
    scene = sceneData.scene;
    camera = sceneData.camera;
    renderer = sceneData.renderer;
    controls = sceneData.controls;
    pathfinder = sceneData.pathfinder;
    terrainObstacles = sceneData.terrainObstacles;
    gridHelper = sceneData.gridHelper;

    initEffects(scene);

    const pathfinderUpdateCallback = () => pathfinder.updateObstacles(collidableObjects);

    terrainObstacles.forEach(ob => collidableObjects.push(ob));

    const commandCenter = new CommandCenter(new THREE.Vector3(15, 0, 15), { onStateChange: pathfinderUpdateCallback });
    scene.add(commandCenter.mesh);
    buildings.push(commandCenter);
    collidableObjects.push(commandCenter);
    selectables.push(commandCenter);

    const supplyDepot = new SupplyDepot(new THREE.Vector3(20, 0, 2), pathfinderUpdateCallback);
    scene.add(supplyDepot.mesh);
    buildings.push(supplyDepot);
    collidableObjects.push(supplyDepot);
    selectables.push(supplyDepot);

    const mineralPositions = [
        new THREE.Vector3(20, 0, 8),
        new THREE.Vector3(23, 0, 9),
        new THREE.Vector3(26, 0, 10),
        new THREE.Vector3(28, 0, 13),
        new THREE.Vector3(28, 0, 17),
        new THREE.Vector3(26, 0, 20),
        new THREE.Vector3(23, 0, 21),
        new THREE.Vector3(20, 0, 22),
    ];

    mineralPositions.forEach(pos => {
        const mineralField = new MineralField(pos);
        scene.add(mineralField.mesh);
        mineralFields.push(mineralField);
        selectables.push(mineralField);
        collidableObjects.push(mineralField);
    });

    const geyser = new VespeneGeyser(new THREE.Vector3(15, 0, -15));
    scene.add(geyser.mesh);
    vespeneGeysers.push(geyser);
    selectables.push(geyser);
    collidableObjects.push(geyser);

    gameState.supplyCap += 12;
    pathfinder.updateObstacles(collidableObjects);

    const scvPositions = [
        new THREE.Vector3(7, 0, 14),
        new THREE.Vector3(7, 0, 16),
        new THREE.Vector3(5.5, 0, 14),
        new THREE.Vector3(5.5, 0, 16)
    ];

    scvPositions.forEach(pos => {
        const scv = new SCV(pos);
        scene.add(scv.mesh);
        units.push(scv);
        selectables.push(scv);
    });

    const scvM2 = new SCVMark2(new THREE.Vector3(5.5, 0, 18));
    scene.add(scvM2.mesh);
    units.push(scvM2);
    selectables.push(scvM2);

    gameState.supplyUsed = units.length;

    const commandExecutor = initCommandExecutor({
        getSelectedObjects,
        gameState,
        units,
        setPlacementMode,
        updateStatusText,
    });
    initUI(commandExecutor);

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

    const resumeAudio = () => {
        audioManager.resumeContext();
        document.body.removeEventListener('mousedown', resumeAudio);
    };
    document.body.addEventListener('mousedown', resumeAudio);

    window.addEventListener('keydown', e => { keyState[e.code] = true; });
    window.addEventListener('keyup', e => {
        keyState[e.code] = false;
        if (e.code === 'KeyG' && gridHelper) {
            gridHelper.visible = !gridHelper.visible;
            if (gridHelper.visible) {
                updateGridLabels(createGridLabels());
            } else {
                if (document.getElementById('grid-labels-container')) {
                    document.getElementById('grid-labels-container').style.display = 'none';
                }
            }
        }
        if (e.code === 'Backquote') {
            togglePause();
        }
    });

    // Don't start music automatically. Wait for user interaction.
    startScreen.querySelector('#start-button').addEventListener('click', startGame);
    window.addEventListener('keydown', startGame, { once: true });
    
    optionsButton.addEventListener('click', () => {
        mainMenu.classList.add('hidden');
        optionsMenu.classList.remove('hidden');
    });

    backButton.addEventListener('click', () => {
        optionsMenu.classList.add('hidden');
        mainMenu.classList.remove('hidden');
    });

    bgmVolumeSlider.addEventListener('input', (e) => audioManager.setBgmVolume(e.target.value));
    sfxVolumeSlider.addEventListener('input', (e) => audioManager.setSfxVolume(e.target.value));

    // In-game menu listeners
    resumeButton.addEventListener('click', togglePause);
    quitButton.addEventListener('click', () => window.location.reload());
    ingameBgmVolumeSlider.addEventListener('input', (e) => {
        audioManager.setBgmVolume(e.target.value);
        bgmVolumeSlider.value = e.target.value; // Sync with main menu slider
    });
    ingameSfxVolumeSlider.addEventListener('input', (e) => {
        audioManager.setSfxVolume(e.target.value);
        sfxVolumeSlider.value = e.target.value; // Sync with main menu slider
    });

    initSpawner({ scene, units, buildings, selectables, collidableObjects, pathfinder, gameState, audioManager });
    initPlacement({ scene, camera, renderer, vespeneGeysers, collidableObjects, pathfinder });
    initCameraController({ camera, controls, keyState });
    initMobileControls({ keyState, renderer, camera, scene });

    const gridLabels = createGridLabels();
    initLoop({ scene, camera, renderer, buildings, units, vespeneGeysers, gameState, pathfinder, spawnUnit, spawnBuilding, updateCamera, updateGridLabels, gridLabels, get isPaused() { return isPaused; } });
}

function startGame() {
    startScreen.style.display = 'none';
    audioManager.resumeContext();
    audioManager.setBgmVolume(bgmVolumeSlider.value);
    audioManager.setSfxVolume(sfxVolumeSlider.value);
    audioManager.playBackgroundMusic();

    if (mobileControlsCheckbox.checked) {
        document.getElementById('mobile-controls').classList.remove('hidden');
        document.getElementById('mobile-cursor').classList.remove('hidden');
        if (window.mobileControls && window.mobileControls.init) {
            window.mobileControls.init();
        }
    }

    document.body.removeEventListener('click', startGame);
    document.body.removeEventListener('keydown', startGame);
}

function togglePause() {
    isPaused = !isPaused;
    if (isPaused) {
        ingameOptionsOverlay.classList.remove('hidden');
        // Sync sliders with current volumes
        ingameBgmVolumeSlider.value = audioManager.bgmVolume;
        ingameSfxVolumeSlider.value = audioManager.sfxVolume;
    } else {
        ingameOptionsOverlay.classList.add('hidden');
    }
}

function createGridLabels() {
    const mapWidth = 128;
    const interval = 10;
    const halfWidth = mapWidth / 2;
    const gridLabelsContainer = document.getElementById('grid-labels-container');
    gridLabelsContainer.style.display = 'none';
    const gridLabels = [];

    for (let x = -halfWidth; x < halfWidth; x += interval) {
        for (let z = -halfWidth; z < halfWidth; z += interval) {
            const worldPos = new THREE.Vector3(x, 0, z);
            const gridPos = pathfinder.worldToGrid(worldPos);

            const labelEl = document.createElement('div');
            labelEl.classList.add('grid-label');
            labelEl.textContent = `${gridPos.x},${gridPos.y}`;
            
            gridLabelsContainer.appendChild(labelEl);
            gridLabels.push({ el: labelEl, pos: worldPos });
        }
    }
    return gridLabels;
}

function updateGridLabels(gridLabels) {
    if (!renderer || !gridHelper || !gridHelper.visible) {
        if (gridLabels.length > 0) gridLabels[0].el.parentElement.style.display = 'none';
        return;
    }
    if (gridLabels.length > 0) gridLabels[0].el.parentElement.style.display = 'block';

    const canvasRect = renderer.domElement.getBoundingClientRect();

    gridLabels.forEach(label => {
        const screenPos = label.pos.clone().project(camera);
        
        if (screenPos.z > 1) {
            label.el.style.display = 'none';
            return;
        }

        label.el.style.display = 'block';
        const x = (screenPos.x * 0.5 + 0.5) * canvasRect.width + canvasRect.left;
        const y = (-screenPos.y * 0.5 + 0.5) * canvasRect.height + canvasRect.top;

        if (x < 0 || x > canvasRect.right || y < 0 || y > canvasRect.bottom) {
             label.el.style.display = 'none';
             return;
        }

        label.el.style.left = `${x}px`;
        label.el.style.top = `${y}px`;
    });
}

export function getMousePosOnCanvas() {
    const rect = renderer.domElement.getBoundingClientRect();
    const center_x = rect.left + rect.width / 2;
    const center_y = rect.top + rect.height / 2;
    return { x: center_x, y: center_y, width: rect.width, height: rect.height, isMobile: true };
}

export { getPlacementMode, attemptPlacement, cancelPlacementMode, updateGhostBuilding } from './placement.js';

init();