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


/** @tweakable How many status messages must be shown before an "ad" plays. Set to 0 to disable. */
const adFrequency = 5;
let statusMessageCount = 0;

/** @tweakable Adjust the video player settings */
const videoPlayerSettings = {
    volume: 0, // Muted by default to allow autoplay
    playbackRate: 1.0,
    opacity: 0.8
};

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

let adTimeout = null;

function setupVideoPanel() {
    const videoPanel = document.getElementById('video-panel');
    if (!videoPanel) return;

    try {
        const videoElement = assetManager.get('ad_video'); // This is the preloaded <video> element
        videoElement.loop = true;
        videoElement.muted = true; // Essential for autoplay in most browsers
        videoElement.volume = videoPlayerSettings.volume;
        videoElement.playbackRate = videoPlayerSettings.playbackRate;

        // Style the video to fit its container
        videoElement.style.width = '100%';
        videoElement.style.height = '100%';
        videoElement.style.objectFit = 'cover';
        videoElement.style.opacity = videoPlayerSettings.opacity;

        videoPanel.innerHTML = ''; // Clear any placeholder text
        videoPanel.appendChild(videoElement);

        videoElement.play().catch(e => {
            console.warn("Video autoplay was prevented. User interaction might be needed.", e);
            // We can add a click handler to the panel to attempt to play again.
            videoPanel.addEventListener('click', () => videoElement.play(), { once: true });
        });
    } catch (e) {
        console.error("Could not find preloaded video asset 'ad_video'.", e);
        videoPanel.textContent = 'Video asset not found.';
    }
}

function showVideoAd() {
    if (!menuManager.isGameRunning) return;

    if (audioManager) {
        audioManager.pauseBackgroundMusic();
    }
    
    const videoPanel = document.getElementById('video-panel');
    if (!videoPanel) return;

    try {
        const adPlayer = assetManager.get('ad_video').cloneNode(true);
        adPlayer.loop = false;
        adPlayer.muted = false;
        adPlayer.volume = videoPlayerSettings.volume > 0 ? videoPlayerSettings.volume : 0.5; // Unmute for ad
        
        const originalContent = videoPanel.innerHTML;
        videoPanel.innerHTML = '';
        videoPanel.appendChild(adPlayer);
        
        adPlayer.play().catch(e => {
            console.warn("Ad video playback prevented:", e);
            // Restore original video if ad fails to play
            videoPanel.innerHTML = originalContent;
            if(audioManager) audioManager.resumeBackgroundMusic();
        });

        adPlayer.onended = () => {
            videoPanel.innerHTML = originalContent;
            const originalVideo = videoPanel.querySelector('video');
            if (originalVideo) {
                originalVideo.play().catch(e => console.warn("Could not resume panel video", e));
            }
            if (audioManager) {
                audioManager.resumeBackgroundMusic();
            }
        };

    } catch (e) {
        console.error("Could not find ad video asset 'ad_video'.", e);
        if (audioManager) {
            audioManager.resumeBackgroundMusic();
        }
    }
}

function hideVideoAd() {
    // This function is now obsolete as the ad plays in-panel.
    // Kept for legacy event listeners, but does nothing.
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
            messageDisplay.showVideoAd();
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