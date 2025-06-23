import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

class AssetManager {
    constructor() {
        this.gltfLoader = new GLTFLoader();
        this.textureLoader = new THREE.TextureLoader();
        this.fileLoader = new THREE.FileLoader(); // For generic files
        this.imageLoader = new THREE.ImageLoader();
        this.audioContext = null;
        this.loadedAssets = new Map();
    }

    _initAudioContext() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    resumeAudioContext() {
        this._initAudioContext();
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }

    async loadGLB(url, assetName) {
        if (this.loadedAssets.has(assetName)) {
            return this.loadedAssets.get(assetName);
        }
        
        try {
            const gltf = await this.gltfLoader.loadAsync(url);
            
            const asset = {
                scene: gltf.scene,
                animations: gltf.animations
            };

            this.loadedAssets.set(assetName, asset);
            console.log(`Loaded GLB: ${assetName} from ${url}`);
            return asset;
        } catch (error) {
            console.error(`Error loading GLB asset '${assetName}' from '${url}'. This may be expected if the file doesn't exist.`, error);
            throw error; // Re-throw to allow fallback logic
        }
    }

    async loadTexture(url, assetName) {
        if (this.loadedAssets.has(assetName)) {
            return this.loadedAssets.get(assetName);
        }
        
        try {
            const texture = await this.textureLoader.loadAsync(url);
            this.loadedAssets.set(assetName, texture);
            console.log(`Loaded Texture: ${assetName} from ${url}`);
            return texture;
        } catch (error) {
            console.error(`Error loading texture asset '${assetName}' from '${url}'. This may be expected if the file doesn't exist.`, error);
            throw error;
        }
    }

    async loadImage(url, assetName) {
        if (this.loadedAssets.has(assetName)) {
            return this.loadedAssets.get(assetName);
        }

        try {
            const image = await this.imageLoader.loadAsync(url);
            // We don't need to store the image itself, just loading it into the browser cache is enough.
            // But let's store it anyway in case we need it.
            this.loadedAssets.set(assetName, image);
            console.log(`Loaded Image: ${assetName} from ${url}`);
            return image;
        } catch (error) {
            console.error(`Error loading image asset '${assetName}' from '${url}'.`, error);
            throw error;
        }
    }

    async loadSound(url, assetName) {
        this._initAudioContext();
        if (this.loadedAssets.has(assetName)) {
            return this.loadedAssets.get(assetName);
        }
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status} ${response.statusText}`);
            }
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            this.loadedAssets.set(assetName, audioBuffer);
            console.log(`Loaded Sound: ${assetName} from ${url}`);
            return audioBuffer;
        } catch (error) {
            console.error(`Failed to load sound '${assetName}' from '${url}': ${error.message}`);
            return null;
        }
    }

    async loadVideo(url, assetName) {
        if (this.loadedAssets.has(assetName)) {
            return this.loadedAssets.get(assetName);
        }
        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            video.preload = 'auto';
            video.src = url;
            video.onloadeddata = () => {
                this.loadedAssets.set(assetName, video);
                console.log(`Loaded Video: ${assetName} from ${url}`);
                resolve(video);
            };
            video.onerror = e => {
                console.error(`Error loading video asset '${assetName}' from '${url}'.`, e);
                reject(e);
            };
        });
    }

    get(assetName) {
        const asset = this.loadedAssets.get(assetName);
        if (!asset) {
            throw new Error(`Asset not found: ${assetName}. Make sure it was pre-loaded.`);
        }
        return asset;
    }
}

// Export a single instance
export const assetManager = new AssetManager();