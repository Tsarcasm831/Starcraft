import { assetManager } from '../utils/asset-manager.js';

export async function preloadAssets(audioManager) {
    const loadingOverlay = document.getElementById('loading-overlay');
    const loadingText = document.getElementById('loading-text');
    const tasks = [];
    tasks.push(() => assetManager.loadTexture('assets/images/starfield_texture.png', 'skybox'));
    tasks.push(() => assetManager.loadTexture('assets/images/terrain_texture.png', 'ground'));
    tasks.push(() => assetManager.loadGLB('assets/models/scv.glb', 'scv'));
    tasks.push(() => assetManager.loadGLB('assets/models/scv2.glb', 'scv2'));
    tasks.push(() => assetManager.loadGLB('assets/models/vulture.glb', 'vulture'));
    tasks.push(() => assetManager.loadSound('assets/audio/select.mp3', 'select'));
    tasks.push(() => assetManager.loadSound('assets/audio/move.mp3', 'move'));

    // Preload command card icons
    const iconPaths = [
        'assets/images/build_command_center_icon.png',
        'assets/images/build_supply_depot_icon.png',
        'assets/images/build_refinery_icon.png',
        'assets/images/build_barracks_icon.png',
        'assets/images/build_engineering_bay_icon.png',
        'assets/images/build_academy_icon.png',
        'assets/images/build_bunker_icon.png',
        'assets/images/build_missile_turret_icon.png',
        'assets/images/build_factory_icon.png',
        'assets/images/build_starport_icon.png',
        'assets/images/build_scv_icon.png',
        'assets/images/build_scv2_icon.png',
        'assets/images/build_basic_structures_icon.png',
        'assets/images/build_advanced_structures_icon.png',
        'assets/images/build_comsat_station_icon.png',
        'assets/images/move_icon.png',
        'assets/images/stop_icon.png',
        'assets/images/hold_position_icon.png',
        'assets/images/patrol_icon.png',
        'assets/images/gather_icon.png',
        'assets/images/attack_icon.png',
        'assets/images/heal_icon.png',
        'assets/images/lift_off_icon.png',
        'assets/images/lower_depot_icon.png',
        'assets/images/raise_depot_icon.png',
        'assets/images/unload_all_icon.png',
        'assets/images/train_marine_icon.png',
        'assets/images/train_medic_icon.png',
        'assets/images/train_firebat_icon.png',
        'assets/images/train_vulture_icon.png',
        'assets/images/train_wraith_icon.png',
        'assets/images/train_dropship_icon.png',
        'assets/images/train_science_vessel_icon.png',
        'assets/images/train_valkyrie_icon.png',
        'assets/images/train_battlecruiser_icon.png',
        'assets/images/upgrade_infantry_weapons_icon.png',
        'assets/images/upgrade_infantry_armor_icon.png',
        'assets/images/stim_pack_icon.png',
        'assets/images/u238_shells_icon.png',
        'assets/images/scanner_sweep_icon.png',
        'assets/images/arm_nuke_icon.png',
        'assets/images/cloak_icon.png',
        'assets/images/lockdown_icon.png',
        'assets/images/nuke_strike_icon.png',
    ];

    iconPaths.forEach(path => {
        const name = path.split('/').pop().replace('.png', '');
        tasks.push(() => assetManager.loadImage(path, name));
    });

    const scvConstructUrls = [
        'https://file.garden/Zy7B0LkdIVpGyzA1/StarCraft/sounds/Terran/Units/SCV/SCV_Constructed1.mp3',
        'https://file.garden/Zy7B0LkdIVpGyzA1/StarCraft/sounds/Terran/Units/SCV/SCV_Constructed2.mp3'
    ];
    scvConstructUrls.forEach((url, i) => {
        const name = `scv_constructed_${i}`;
        tasks.push(async () => {
            await assetManager.loadSound(url, name);
            audioManager.scvConstructedSoundNames.push(name);
        });
    });
    const bgUrls = [
        'https://file.garden/Zy7B0LkdIVpGyzA1/StarCraft/sounds/Terran/Terran%20BGM.mp3',
        'https://file.garden/Zy7B0LkdIVpGyzA1/StarCraft/sounds/Terran/Terran%20BGM2.mp3',
        'https://file.garden/Zy7B0LkdIVpGyzA1/StarCraft/sounds/Terran/terran1.mp3',
    ];
    // This part now uses the AudioManager method
    tasks.push(() => audioManager.loadBackgroundTracks(bgUrls));

    let loaded = 0;
    if (loadingOverlay) loadingOverlay.classList.remove('hidden');

    for (const task of tasks) {
        try {
            await task();
        } catch (e) {
            console.warn('Asset failed to load', e);
        }
        loaded++;
        if (loadingText) {
            const pct = Math.round((loaded / tasks.length) * 100);
            loadingText.textContent = `Loading... ${pct}%`;
        }
    }

    if (loadingOverlay) loadingOverlay.classList.add('hidden');
}