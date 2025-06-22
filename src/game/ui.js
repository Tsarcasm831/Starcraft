import { ResourceDisplay } from './ui/ResourceDisplay.js';
import { SelectionInfoDisplay } from './ui/SelectionInfoDisplay.js';
import { CommandCard } from './ui/CommandCard.js';
import { MessageDisplay } from './ui/MessageDisplay.js';
import { Compass } from './ui/Compass.js';
import { devLogger } from '../utils/dev-logger.js';

// Create instances of the new UI components
const resourceDisplay = new ResourceDisplay();
const selectionInfoDisplay = new SelectionInfoDisplay();
const commandCard = new CommandCard();
const messageDisplay = new MessageDisplay();
const compass = new Compass();

// UI State
let startScreen;
let mobileControlsCheckbox;
let devModeCheckbox;
let mainMenu, optionsMenu, optionsButton, backButton;
let bgmVolumeSlider, sfxVolumeSlider;
let ingameOptionsOverlay, resumeButton, quitButton, toggleGridButton;
let ingameBgmVolumeSlider, ingameSfxVolumeSlider;
let spotifyModal, closeSpotifyModalButton;
let devLogModal, closeDevLogModalButton, clearDevLogButton;
let changelogModal, changelogButton, closeChangelogModalButton, changelogOutput;

export let isPaused = false;
export let isGameRunning = false;

// Callbacks to game logic
let onStartGame;
let audioManagerRef;
let gridHelperRef;
let keyStateRef;
let commandExecutorRef;
let cameraGetter;

function togglePause() {
    isPaused = !isPaused;
    commandCard.hideTooltip();
    if (isPaused) {
        ingameOptionsOverlay.classList.remove('hidden');
        // Sync sliders with current volumes
        ingameBgmVolumeSlider.value = audioManagerRef.bgmVolume;
        ingameSfxVolumeSlider.value = audioManagerRef.sfxVolume;
    } else {
        ingameOptionsOverlay.classList.add('hidden');
    }
}

function toggleGrid() {
    if (gridHelperRef) {
        gridHelperRef.visible = !gridHelperRef.visible;
    }
}

let adTimeout = null;

function showVideoAd() {
    if (!isGameRunning) return;

    const placeholder = document.getElementById('spotify-player-placeholder');
    if (!placeholder) return;

    spotifyModal.classList.remove('hidden');
    placeholder.innerHTML =
        '<iframe id="video-ad-iframe" ' +
        'src="https://www.youtube.com/embed/mQgRLL3wod0?autoplay=1" ' +
        'width="100%" height="200" frameborder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"></iframe>';

    if (adTimeout) {
        clearTimeout(adTimeout);
    }
    // Display the ad for 30 seconds before hiding
    adTimeout = setTimeout(hideVideoAd, 30000);
}

function hideVideoAd() {
    const placeholder = document.getElementById('spotify-player-placeholder');
    if (placeholder) {
        placeholder.innerHTML = '<p>Video Player Placeholder</p>';
    }
    spotifyModal.classList.add('hidden');
    if (adTimeout) {
        clearTimeout(adTimeout);
        adTimeout = null;
    }
}

function toggleDevLogModal() {
    if (!isGameRunning || !devLogger.isActive) return;
    devLogModal.classList.toggle('hidden');
    // Populate the log when it's opened
    if (!devLogModal.classList.contains('hidden')) {
        const devLogOutput = document.getElementById('dev-log-output');
        if (devLogOutput) {
            devLogOutput.textContent = devLogger.getLogs().join('\n');
        }
    }
}

async function toggleChangelogModal() {
    changelogModal.classList.toggle('hidden');
    if (!changelogModal.classList.contains('hidden')) {
        if (changelogOutput.dataset.loaded !== 'true') {
            try {
                const response = await fetch('README.md');
                if (response.ok) {
                    const text = await response.text();
                    changelogOutput.textContent = text;
                    changelogOutput.dataset.loaded = 'true';
                } else {
                    changelogOutput.textContent = 'Error loading changelog.';
                }
            } catch (error) {
                console.error('Failed to fetch README.md:', error);
                changelogOutput.textContent = 'Error loading changelog.';
            }
        }
    }
}

export function initUI(commandExecutor, startGameCallback, audioManager, getGridHelper, getKeyState, getCamera) {
    resourceDisplay.init();
    selectionInfoDisplay.init();
    commandCard.init(commandExecutor);
    messageDisplay.init();
    compass.init(getCamera);

    // Store references
    onStartGame = startGameCallback;
    audioManagerRef = audioManager;
    gridHelperRef = getGridHelper;
    keyStateRef = getKeyState;
    commandExecutorRef = commandExecutor;
    cameraGetter = getCamera;

    // --- Find all UI elements ---
    startScreen = document.getElementById('start-screen');
    mobileControlsCheckbox = document.getElementById('enable-mobile-controls-checkbox');
    devModeCheckbox = document.getElementById('enable-dev-mode-checkbox');
    mainMenu = document.getElementById('main-menu');
    optionsMenu = document.getElementById('options-menu');
    optionsButton = document.getElementById('options-button');
    backButton = document.getElementById('back-button');
    bgmVolumeSlider = document.getElementById('bgm-volume-slider');
    sfxVolumeSlider = document.getElementById('sfx-volume-slider');

    ingameOptionsOverlay = document.getElementById('ingame-options-overlay');
    resumeButton = document.getElementById('resume-button');
    quitButton = document.getElementById('quit-button');
    toggleGridButton = document.getElementById('toggle-grid-button');
    ingameBgmVolumeSlider = document.getElementById('ingame-bgm-volume-slider');
    ingameSfxVolumeSlider = document.getElementById('ingame-sfx-volume-slider');

    spotifyModal = document.getElementById('spotify-modal');
    closeSpotifyModalButton = document.getElementById('close-spotify-modal');
    
    devLogModal = document.getElementById('dev-log-modal');
    closeDevLogModalButton = document.getElementById('close-dev-log-modal');
    clearDevLogButton = document.getElementById('clear-dev-log-button');

    changelogModal = document.getElementById('changelog-modal');
    changelogButton = document.getElementById('changelog-button');
    closeChangelogModalButton = document.getElementById('close-changelog-modal');
    changelogOutput = document.getElementById('changelog-output');

    // --- Attach Event Listeners ---
    const startButton = startScreen.querySelector('#start-button');
    if (startButton) {
        startButton.addEventListener('click', onStartGame, { once: true });
    }
    window.addEventListener('keydown', (e) => {
        if (startScreen && !startScreen.classList.contains('hidden')) {
            onStartGame();
        }
    }, { once: true });

    optionsButton.addEventListener('click', () => {
        mainMenu.classList.add('hidden');
        optionsMenu.classList.remove('hidden');
    });

    changelogButton.addEventListener('click', toggleChangelogModal);

    backButton.addEventListener('click', () => {
        optionsMenu.classList.add('hidden');
        mainMenu.classList.remove('hidden');
    });

    bgmVolumeSlider.addEventListener('input', (e) => audioManagerRef.setBgmVolume(e.target.value));
    sfxVolumeSlider.addEventListener('input', (e) => audioManagerRef.setSfxVolume(e.target.value));

    resumeButton.addEventListener('click', togglePause);
    quitButton.addEventListener('click', () => window.location.reload());
    toggleGridButton.addEventListener('click', toggleGrid);
    
    ingameBgmVolumeSlider.addEventListener('input', (e) => {
        audioManagerRef.setBgmVolume(e.target.value);
        bgmVolumeSlider.value = e.target.value;
    });
    ingameSfxVolumeSlider.addEventListener('input', (e) => {
        audioManagerRef.setSfxVolume(e.target.value);
        sfxVolumeSlider.value = e.target.value;
    });

    closeSpotifyModalButton.addEventListener('click', hideVideoAd);
    closeDevLogModalButton.addEventListener('click', toggleDevLogModal);
    clearDevLogButton.addEventListener('click', () => devLogger.clearLogs());
    closeChangelogModalButton.addEventListener('click', toggleChangelogModal);

    // --- Global Hotkeys ---
    window.addEventListener('keydown', (e) => {
        if (!isGameRunning || isPaused) return;

        // Find the command associated with the hotkey for the current selection
        const firstSelected = commandCard.currentCommandObject;
        if (firstSelected && firstSelected.commands) {
            const command = firstSelected.commands.find(cmd => cmd && cmd.hotkey && cmd.hotkey.toUpperCase() === e.key.toUpperCase());
            if (command) {
                e.preventDefault();
                commandExecutorRef(command.command);
                commandCard.hideTooltip();
            }
        }
    });

    window.addEventListener('keyup', (e) => {
        if (!isGameRunning) return;
        
        switch (e.code) {
            case 'Backquote':
                togglePause();
                break;
            case 'KeyM':
                showVideoAd();
                break;
            case 'Backslash':
                if (devLogger.isActive) {
                    toggleDevLogModal();
                }
                break;
        }
    });
}

export function hideStartScreen() {
    if (startScreen) startScreen.classList.add('hidden');
}

export function setGameRunning(running) {
    isGameRunning = running;
}

export function updatePlacementText(message) {
    messageDisplay.updatePlacementText(message);
}

export function updateStatusText(message) {
    const lower = message.toLowerCase();
    if (audioManagerRef) {
        if (lower.includes('not enough minerals') && audioManagerRef.mineralsWarningSoundName) {
            audioManagerRef.playSound(audioManagerRef.mineralsWarningSoundName);
        } else if (lower.includes('not enough vespene') && audioManagerRef.gasWarningSoundName) {
            audioManagerRef.playSound(audioManagerRef.gasWarningSoundName);
        } else if (lower.includes('additional supply required') && audioManagerRef.supplyWarningSoundName) {
            audioManagerRef.playSound(audioManagerRef.supplyWarningSoundName);
        }
    }
    messageDisplay.updateStatusText(message);
}

export function updateUI(selectedObjects, gameState) {
    resourceDisplay.update(gameState);
    selectionInfoDisplay.update(selectedObjects);

    const firstObject = selectedObjects.length > 0 ? selectedObjects[0] : null;
    commandCard.update(firstObject, gameState);
    compass.update();
}