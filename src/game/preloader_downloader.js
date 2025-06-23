import { assetManager } from '../utils/asset-manager.js';

export async function addExtraPreloadTasks(tasks) {
    try {
        const response = await fetch('assets/extra-assets.json');
        if (!response.ok) {
            console.warn('extra-assets.json not found');
            return;
        }
        const manifest = await response.json();

        const pushTask = (urls, loader, ext) => {
            if (!Array.isArray(urls)) return;
            urls.forEach(url => {
                const base = url.split('/').pop().split('?')[0];
                const name = `extra_${base.replace('.' + ext, '')}`;
                tasks.push(() => loader.call(assetManager, url, name));
            });
        };

        pushTask(manifest.glbs, assetManager.loadGLB, 'glb');
        pushTask(manifest.mp3s, assetManager.loadSound, 'mp3');
        pushTask(manifest.wavs, assetManager.loadSound, 'wav');
        pushTask(manifest.mp4s, assetManager.loadVideo, 'mp4');
    } catch (e) {
        console.warn('Failed to load extra asset manifest', e);
    }
}
