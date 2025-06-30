import { ResourceDisplay } from './ui/ResourceDisplay.js';
import { SelectionInfoDisplay } from './ui/SelectionInfoDisplay.js';
import { CommandCard } from './ui/CommandCard.js';
import { MessageDisplay } from './ui/MessageDisplay.js';
import { Compass } from './ui/Compass.js';
import { MenuManager } from './ui/MenuManager.js';
import { ModalManager } from './ui/ModalManager.js';

// Create instances of the new UI components
const resourceDisplay = new ResourceDisplay();
const selectionInfoDisplay = new SelectionInfoDisplay();
const commandCard = new CommandCard();
const messageDisplay = new MessageDisplay();
const compass = new Compass();
const menuManager = new MenuManager();
const modalManager = new ModalManager();

// Callbacks to game logic
let commandExecutorRef;



function togglePause() {
    menuManager.isPaused = !menuManager.isPaused;
    commandCard.hideTooltip();
    if (menuManager.isPaused) {
        menuManager.ingameOptionsOverlay.classList.remove('hidden');
        // Sync sliders with current volumes
        menuManager.ingameBgmVolumeSlider.value = audioManager.bgmVolume;
        menuManager.ingameSfxVolumeSlider.value = audioManager.sfxVolume;
    } else {
        menuManager.ingameOptionsOverlay.classList.add('hidden');
    }
}

function toggleGrid() {
    if (gridHelperRef) {
        gridHelperRef.visible = !gridHelperRef.visible;
    }
}



export function initUI(commandExecutor, startGameCallback, audioManager, getGridHelper, getKeyState, getCamera) {
    resourceDisplay.init();
    selectionInfoDisplay.init();
    commandCard.init(commandExecutor);
    messageDisplay.init(audioManager);
    compass.init(getCamera);
    menuManager.init({
        onStartGame: startGameCallback,
        audioManager: audioManager,
        getGridHelper: getGridHelper,
    });
    modalManager.init(menuManager);

    // Store references
    commandExecutorRef = commandExecutor;

    // --- Global Hotkeys ---
    window.addEventListener('keydown', (e) => {
        if (!menuManager.isGameRunning || menuManager.isPaused) return;

        if (e.key === '/' || e.code === 'Slash') {
            e.preventDefault();
            modalManager.togglePromoModal();
            return;
        }

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
}

export function hideStartScreen() {
    menuManager.hideStartScreen();
}

export function setGameRunning(running) {
    menuManager.setGameRunning(running);
    if (running) {
        messageDisplay.setupVideoPanel(); // Set up the looping video when the game starts
    }
}

export function updatePlacementText(message) {
    messageDisplay.updatePlacementText(message);
}

export function updateStatusText(message) {
    messageDisplay.updateStatusText(message);
}

export function updateUI(selectedObjects, gameState) {
    resourceDisplay.update(gameState);
    selectionInfoDisplay.update(selectedObjects);

    const firstObject = selectedObjects.length > 0 ? selectedObjects[0] : null;
    commandCard.update(firstObject, gameState);
    compass.update();
}

// Export state getters from MenuManager for other modules to use
export const isPaused = () => menuManager.isPaused;
export const isGameRunning = () => menuManager.isGameRunning;