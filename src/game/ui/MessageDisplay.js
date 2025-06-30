import { assetManager } from '../../utils/asset-manager.js';

let statusTextPanel, placementTextPanel, globalMessageContainer;
let audioManagerRef;

/** @tweakable How many status messages must be shown before an "ad" plays. Set to 0 to disable. */
const adFrequency = 5;
let statusMessageCount = 0;

/** @tweakable Adjust the video player settings */
const videoPlayerSettings = {
    volume: 0, // Muted by default to allow autoplay
    playbackRate: 1.0,
    opacity: 0.8
};

/** @tweakable The width of the video panel in pixels. */
const videoPanelWidth = 180;

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

            videoElement.play().catch(e => {
                console.warn("Video autoplay was prevented.", e);
                videoPanel.addEventListener('click', () => videoElement.play(), { once: true });
            });
        } catch (e) {
            console.error("Could not find preloaded video asset 'ad_video'.", e);
            videoPanel.textContent = 'Video asset not found.';
        }
    }

    showVideoAd() {
        if (audioManagerRef) {
            audioManagerRef.pauseBackgroundMusic();
        }

        const videoPanel = document.getElementById('video-panel');
        if (!videoPanel) return;

        try {
            const adPlayer = assetManager.get('ad_video').cloneNode(true);
            adPlayer.autoplay = true;
            adPlayer.loop = true;
            adPlayer.muted = false;
            adPlayer.volume = videoPlayerSettings.volume > 0 ? videoPlayerSettings.volume : 0.5;

            const originalContent = videoPanel.innerHTML;
            videoPanel.innerHTML = '';

            const closeBtn = document.createElement('button');
            closeBtn.className = 'close-button';
            closeBtn.style.display = 'none';
            closeBtn.addEventListener('click', () => {
                videoPanel.innerHTML = originalContent;
                const originalVideo = videoPanel.querySelector('video');
                if (originalVideo) {
                    originalVideo.play().catch(e => console.warn("Could not resume panel video", e));
                }
                if (audioManagerRef) {
                    audioManagerRef.resumeBackgroundMusic();
                }
            });

            videoPanel.appendChild(closeBtn);
            videoPanel.appendChild(adPlayer);

            adPlayer.play().catch(e => {
                console.warn("Ad video playback prevented:", e);
                videoPanel.innerHTML = originalContent;
                if(audioManagerRef) audioManagerRef.resumeBackgroundMusic();
            });

            setTimeout(() => {
                closeBtn.style.display = 'block';
            }, 30000);

        } catch (e) {
            console.error("Could not find ad video asset 'ad_video'.", e);
            if (audioManagerRef) {
                audioManagerRef.resumeBackgroundMusic();
            }
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

        if (adFrequency > 0) {
            statusMessageCount++;
            if (statusMessageCount >= adFrequency) {
                statusMessageCount = 0;
                this.showVideoAd();
            }
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