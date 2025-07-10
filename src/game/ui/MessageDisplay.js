import { assetManager } from '../../utils/asset-manager.js';

let statusTextPanel, placementTextPanel, globalMessageContainer;
let audioManagerRef;


/** @tweakable Adjust the video player settings */
const videoPlayerSettings = {
    volume: 0, // Muted by default to allow autoplay
    playbackRate: 1.0,
    opacity: 0.8
};

/** @tweakable The width of the video panel in pixels. */
const videoPanelWidth = 180;

/** @tweakable If true, the video in the bottom panel will try to play automatically when the game starts. */
const autoplayVideoPanel = false;

export class MessageDisplay {
    init(audioManager) {
        statusTextPanel = document.getElementById('status-text-panel');
        placementTextPanel = document.getElementById('placement-text-panel');
        globalMessageContainer = document.getElementById('global-message-container');
        audioManagerRef = audioManager;
    }
    
    setupVideoPanel() {
        const videoPanel = document.getElementById('video-panel');
        if (!videoPanel) return;

        videoPanel.style.width = `${videoPanelWidth}px`;

        try {
            const videoElement = assetManager.get('ad_video');
            videoElement.loop = true;
            videoElement.muted = true;
            videoElement.volume = videoPlayerSettings.volume;
            videoElement.playbackRate = videoPlayerSettings.playbackRate;

            videoElement.style.width = '100%';
            videoElement.style.height = '100%';
            videoElement.style.objectFit = 'cover';
            videoElement.style.opacity = videoPlayerSettings.opacity;

            videoPanel.innerHTML = '';
            videoPanel.appendChild(videoElement);

            if (autoplayVideoPanel) {
                videoElement.play().catch(e => {
                    console.warn("Video autoplay was prevented.", e);
                    videoPanel.addEventListener('click', () => videoElement.play(), { once: true });
                });
            }
        } catch (e) {
            console.error("Could not find preloaded video asset 'ad_video'.", e);
            videoPanel.textContent = 'Video asset not found.';
        }
    }

    updatePlacementText(message) {
        if (placementTextPanel) {
            placementTextPanel.textContent = message;
        }
    }

    showGlobalMessage(message) {
        if (!globalMessageContainer) return;

        const p = document.createElement('p');
        p.textContent = message;
        p.className = 'global-message';

        globalMessageContainer.appendChild(p);

        setTimeout(() => {
            p.style.opacity = '0';
        }, 1000);

        setTimeout(() => {
            if (p.parentElement) {
                p.parentElement.removeChild(p);
            }
        }, 2000);
    }

    updateStatusText(message) {
        const lowerCaseMessage = message.toLowerCase();
        
        if (audioManagerRef) {
            if (lowerCaseMessage.includes('not enough minerals') && audioManagerRef.mineralsWarningSoundName) {
                audioManagerRef.playSound(audioManagerRef.mineralsWarningSoundName);
            } else if (lowerCaseMessage.includes('not enough vespene') && audioManagerRef.gasWarningSoundName) {
                audioManagerRef.playSound(audioManagerRef.gasWarningSoundName);
            } else if (lowerCaseMessage.includes('additional supply required') && audioManagerRef.supplyWarningSoundName) {
                audioManagerRef.playSound(audioManagerRef.supplyWarningSoundName);
            }
        }

        if (lowerCaseMessage.includes('not enough minerals') ||
            lowerCaseMessage.includes('not enough vespene') ||
            lowerCaseMessage.includes('additional supply required')) {
            this.showGlobalMessage(message);
            return;
        }


        Array.from(statusTextPanel.children).forEach(child => {
            if (child.textContent === message) {
                child.remove();
            }
        });

        const p = document.createElement('p');
        p.textContent = message;
        p.style.margin = '0 0 4px 0';
        p.style.transition = 'opacity 1s ease-out 3s';
        p.style.opacity = '1';
        statusTextPanel.prepend(p);

        p.style.opacity = '0';
        setTimeout(() => p.remove(), 4000);

        while (statusTextPanel.children.length > 8) {
            statusTextPanel.removeChild(statusTextPanel.lastChild);
        }
    }
}