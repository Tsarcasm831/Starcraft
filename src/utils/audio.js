import { assetManager } from './asset-manager.js';

export class AudioManager {
    constructor() {
        // The AudioContext is now managed by the AssetManager.
        // The manager should be initialized before any sounds are played.
        this.backgroundTrackNames = [];
        this.scvConstructedSoundNames = [];
        this.scvMark2ConstructedSoundNames = [];
        this.firebatSoundNames = [];
        this.marineSoundNames = [];
        this.medicSoundNames = [];
        this.mineralsWarningSoundName = null;
        this.gasWarningSoundName = null;
        this.supplyWarningSoundName = null;
        this.backgroundGain = null;
        this.currentTrackIndex = 0;
        this.backgroundPlaying = false;
        this.backgroundSource = null;
        this.sfxVolume = 1.0;
        this.bgmVolume = 0.3;
    }

    setBgmVolume(volume) {
        this.bgmVolume = parseFloat(volume);
        if (this.backgroundGain) {
            const audioContext = assetManager.audioContext;
            if (audioContext) {
                 this.backgroundGain.gain.setValueAtTime(this.bgmVolume, audioContext.currentTime);
            }
        }
    }
    
    setSfxVolume(volume) {
        this.sfxVolume = parseFloat(volume);
    }

    playSound(name, volume = 1.0) {
        const audioContext = assetManager.audioContext;
        if (!audioContext || audioContext.state === 'suspended') {
            // The main game logic should handle resuming the context on user interaction.
            return;
        }

        let audioBuffer;
        try {
            audioBuffer = assetManager.get(name);
        } catch (error) {
            console.warn(`Could not play sound, asset not found: ${name}`, error);
            return; // Asset not found or not pre-loaded
        }

        if (!audioBuffer) {
            return;
        }

        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;

        const gainNode = audioContext.createGain();
        gainNode.gain.setValueAtTime(this.sfxVolume * volume, audioContext.currentTime);

        source.connect(gainNode);
        gainNode.connect(audioContext.destination);
        source.start(0);
    }
    
    playUnitSound(units, actionType, probability = 1.0) {
        if (!units || units.length === 0) return false;
        if (Math.random() > probability) return false;

        // Pick a random unit from the selection to make a sound
        const unit = units[Math.floor(Math.random() * units.length)];
        
        if (unit.sounds && unit.sounds[actionType] && unit.sounds[actionType].length > 0) {
            const soundNames = unit.sounds[actionType];
            const soundName = soundNames[Math.floor(Math.random() * soundNames.length)];
            this.playSound(soundName);
            return true;
        }

        return false;
    }

    resumeContext() {
        assetManager.resumeAudioContext();
    }

    playRandomSound(names) {
        if (!Array.isArray(names) || names.length === 0) return;
        const index = Math.floor(Math.random() * names.length);
        const name = names[index];
        this.playSound(name);
    }

    async loadWarningSounds(urls) {
        const promises = [];
        if (urls.minerals) {
            this.mineralsWarningSoundName = 'minerals_warning';
            promises.push(assetManager.loadSound(urls.minerals, this.mineralsWarningSoundName));
        }
        if (urls.gas) {
            this.gasWarningSoundName = 'gas_warning';
            promises.push(assetManager.loadSound(urls.gas, this.gasWarningSoundName));
        }
        if (urls.supply) {
            this.supplyWarningSoundName = 'supply_warning';
            promises.push(assetManager.loadSound(urls.supply, this.supplyWarningSoundName));
        }
        await Promise.all(promises);
    }

    async loadBackgroundTracks(urls) {
        this.backgroundTrackNames = [];
        const loadPromises = [];
        for (let i = 0; i < urls.length; i++) {
            const name = `background_${i}`;
            this.backgroundTrackNames.push(name);
            loadPromises.push(assetManager.loadSound(urls[i], name));
        }
        await Promise.all(loadPromises);
    }

    playBackgroundMusic() {
        const audioContext = assetManager.audioContext;
        if (!audioContext || audioContext.state === 'suspended' || this.backgroundTrackNames.length === 0) {
            console.log('Cannot play background music. AudioContext not ready or no tracks loaded.');
            return;
        }

        if (this.backgroundPlaying) return;

        if (!this.backgroundGain) {
            this.backgroundGain = audioContext.createGain();
            this.backgroundGain.connect(audioContext.destination);
        }
        this.backgroundGain.gain.setValueAtTime(this.bgmVolume, audioContext.currentTime);

        this.backgroundPlaying = true;
        this.currentTrackIndex = Math.floor(Math.random() * this.backgroundTrackNames.length);

        const playNext = () => {
            if (!this.backgroundPlaying) return;

            // Stop and disconnect previous source if it exists
            if (this.backgroundSource) {
                try {
                    this.backgroundSource.onended = null; // Prevent re-triggering
                    this.backgroundSource.stop();
                    this.backgroundSource.disconnect();
                } catch (e) { /* ignore errors if already stopped */ }
            }

            const trackName = this.backgroundTrackNames[this.currentTrackIndex];
            let buffer;
            try {
                buffer = assetManager.get(trackName);
            } catch (e) {
                console.warn(`Background track not loaded: ${trackName}. Trying next...`, e);
                this.currentTrackIndex = (this.currentTrackIndex + 1) % this.backgroundTrackNames.length;
                setTimeout(playNext, 1000); // Wait a moment before trying the next track
                return;
            }

            const source = audioContext.createBufferSource();
            source.buffer = buffer;
            source.connect(this.backgroundGain);

            source.onended = () => {
                if (this.backgroundPlaying) {
                    this.currentTrackIndex = (this.currentTrackIndex + 1) % this.backgroundTrackNames.length;
                    playNext();
                }
            };

            source.start(0);
            this.backgroundSource = source;
        };

        playNext();
    }

    pauseBackgroundMusic() {
        if (!this.backgroundPlaying) return;
        this.backgroundPlaying = false;
        if (this.backgroundSource) {
            try {
                this.backgroundSource.onended = null;
                this.backgroundSource.stop();
                this.backgroundSource.disconnect();
            } catch (e) { /* ignore errors if already stopped */ }
            this.backgroundSource = null;
        }
    }

    resumeBackgroundMusic() {
        if (this.backgroundPlaying) return;
        this.playBackgroundMusic();
    }
}

export const audioManager = new AudioManager();