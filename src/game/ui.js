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

/** @tweakable The filename for the manual document. */
const MANUAL_FILE = 'manual.md';

/** @tweakable The maximum number of lines to display from the manual. 0 for no limit. */
const maxManualLines = 0;

/** @tweakable enable closing the manual modal by clicking its background */
const closeManualOnClickOutside = true;

/** @tweakable The filename for the main (recent) changelog document. */
const CHANGELOG_FILE = 'changelog.md';

/** @tweakable The filename for the archived (old) changelog document. */
const OLD_CHANGELOG_FILE = 'changelog.old.md';

/** @tweakable The maximum number of lines to display from the changelog. 0 for no limit. */
const maxChangelogLines = 50;

/** @tweakable enable closing the changelog modal by clicking its background */
const closeChangelogOnClickOutside = true;

/** @tweakable The cutoff date for archiving changelog entries, in MMDDYY format. Entries on or before this date are considered old. */
const changelogArchiveCutoffDate = '062824';

/** 
 * @tweakable Configuration for formatting ASCL timestamps in the changelog modal.
 * @property {boolean} enabled - Whether to apply custom styling to timestamps.
 * @property {RegExp} regex - The regular expression used to find timestamps. The first capture group should be the timestamp itself.
 * @property {string} color - The color to apply to the timestamp text.
 * @property {string} prefix - Text to add before the timestamp.
 * @property {string} suffix - Text to add after the timestamp.
 */
const changelogTimestampConfig = {
    enabled: true,
    /** @tweakable The regular expression for finding and styling timestamps in the changelog. The first capture group should contain the date and time. */
    regex: /\[TS:? ?(\d{6}-\d{4})]/g,
    color: '#88aaff',
    prefix: '[',
    suffix: ']'
};

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

function toggleDevLogModal() {
    if (!menuManager.isGameRunning || !devLogger.isActive) return;
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
            changelogOutput.textContent = 'Loading...';
            try {
                // Fetch both changelogs concurrently
                const [recentResponse, oldResponse] = await Promise.all([
                    fetch(CHANGELOG_FILE).catch(e => { console.warn(`Could not load ${CHANGELOG_FILE}`, e); return null; }),
                    fetch(OLD_CHANGELOG_FILE).catch(e => { console.warn(`Could not load ${OLD_CHANGELOG_FILE}`, e); return null; })
                ]);

                let recentText = recentResponse && recentResponse.ok ? await recentResponse.text() : `Error loading ${CHANGELOG_FILE}.`;
                let oldText = oldResponse && oldResponse.ok ? await oldResponse.text() : ``; // Don't show error if old log is missing

                let fullText = recentText;
                if (oldText) {
                    fullText += `\n\n<hr>\n\n${oldText}`;
                }

                if (maxChangelogLines > 0) {
                    const lines = fullText.split('\n');
                    if (lines.length > maxChangelogLines) {
                        fullText = lines.slice(0, maxChangelogLines).join('\n') + `\n\n... (and more)`;
                    }
                }
                
                let processedText = fullText.replace(/<hr>/g, '<hr style="border-top: 1px solid #555c6e; margin: 20px 0;">');

                if (changelogTimestampConfig.enabled) {
                    const replacement = `<span style="color:${changelogTimestampConfig.color}">${changelogTimestampConfig.prefix}$1${changelogTimestampConfig.suffix}</span>`;
                    processedText = processedText.replace(changelogTimestampConfig.regex, replacement);
                }

                changelogOutput.innerHTML = processedText; // Use innerHTML to render the spans and hr
                changelogOutput.dataset.loaded = 'true';
            } catch (error) {
                console.error('Failed to fetch changelogs:', error);
                changelogOutput.textContent = 'Error loading changelogs.';
            }
        }
    }
}

async function toggleManualModal() {
    manualModal.classList.toggle('hidden');
    if (!manualModal.classList.contains('hidden')) {
        if (manualOutput.dataset.loaded !== 'true') {
            try {
                const response = await fetch(MANUAL_FILE);
                if (response.ok) {
                    let text = await response.text();
                    if (maxManualLines > 0) {
                        const lines = text.split('\n');
                        if (lines.length > maxManualLines) {
                            text = lines.slice(0, maxManualLines).join('\n') + `\n\n... (and more)`;
                        }
                    }
                    manualOutput.textContent = text;
                    manualOutput.dataset.loaded = 'true';
                } else {
                    manualOutput.textContent = 'Error loading manual.';
                }
            } catch (error) {
                console.error(`Failed to fetch ${MANUAL_FILE}:`, error);
                manualOutput.textContent = 'Error loading manual.';
            }
        }
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