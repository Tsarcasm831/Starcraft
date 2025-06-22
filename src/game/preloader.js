import { assetManager } from '../utils/asset-manager.js';

export async function preloadAssets(audioManager) {
    const loadingOverlay = document.getElementById('loading-overlay');
    const loadingText = document.getElementById('loading-text');
    const tasks = [];
    tasks.push(() => assetManager.loadTexture('assets/images/starfield_texture.png', 'skybox'));
    tasks.push(() => assetManager.loadTexture('assets/images/terrain_texture.png', 'ground'));
    tasks.push(() => assetManager.loadGLB('assets/models/scv.glb', 'scv'));
    tasks.push(() => assetManager.loadGLB('assets/models/scv2.glb', 'scv2'));

    // Remote animations for SCV Mark 2
    const scv2AnimationUrls = {
        mineRepair: 'https://file.garden/Zy7B0LkdIVpGyzA1/StarCraft/sounds/Terran/Units/SCV/Animation_MineRepair.glb',
        idle: 'https://file.garden/Zy7B0LkdIVpGyzA1/StarCraft/sounds/Terran/Units/SCV/Animation_Idle.glb',
        walking: 'https://file.garden/Zy7B0LkdIVpGyzA1/StarCraft/sounds/Terran/Units/SCV/Animation_Walking.glb'
    };
    Object.entries(scv2AnimationUrls).forEach(([key, url]) => {
        tasks.push(() => assetManager.loadGLB(url, `scv2_${key}`));
    });
    tasks.push(() => assetManager.loadGLB('assets/models/vulture.glb', 'vulture'));
    tasks.push(() => assetManager.loadGLB('assets/models/goliath.glb', 'goliath'));
    tasks.push(() => assetManager.loadGLB('assets/models/wraith.glb', 'wraith'));
    tasks.push(() => assetManager.loadGLB('assets/models/dropship.glb', 'dropship'));
    tasks.push(() => assetManager.loadGLB('assets/models/science_vessel.glb', 'science_vessel'));
    tasks.push(() => assetManager.loadGLB('assets/models/valkyrie.glb', 'valkyrie'));
    tasks.push(() => assetManager.loadGLB('assets/models/battlecruiser.glb', 'battlecruiser'));
    tasks.push(() => assetManager.loadGLB('assets/models/science_facility.glb', 'science_facility'));
    tasks.push(() => assetManager.loadGLB('assets/models/control_tower.glb', 'control_tower'));
    tasks.push(() => assetManager.loadGLB('assets/models/physics_lab.glb', 'physics_lab'));
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
        'assets/images/build_armory_icon.png',
        'assets/images/build_scv_icon.png',
        'assets/images/build_scv2_icon.png',
        'assets/images/build_science_facility_icon.png',
        'assets/images/build_control_tower_icon.png',
        'assets/images/build_physics_lab_icon.png',
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
        'assets/images/train_siege_tank_icon.png',
        'assets/images/train_goliath_icon.png',
        'assets/images/train_wraith_icon.png',
        'assets/images/train_dropship_icon.png',
        'assets/images/train_science_vessel_icon.png',
        'assets/images/train_valkyrie_icon.png',
        'assets/images/train_battlecruiser_icon.png',
        'assets/images/upgrade_infantry_weapons_icon.png',
        'assets/images/upgrade_infantry_armor_icon.png',
        'assets/images/stim_pack_icon.png',
        'assets/images/u238_shells_icon.png',
        'assets/images/siege_mode_icon.png',
        'assets/images/tank_mode_icon.png',
        'assets/images/research_siege_mode_icon.png',
        'assets/images/charon_boosters_icon.png',
        'assets/images/scanner_sweep_icon.png',
        'assets/images/arm_nuke_icon.png',
        'assets/images/yamato_cannon_icon.png',
        'assets/images/defensive_matrix_icon.png',
        'assets/images/emp_shockwave_icon.png',
        'assets/images/irradiate_icon.png',
        'assets/images/cloak_icon.png',
        'assets/images/lockdown_icon.png',
        'assets/images/nuke_strike_icon.png',
        'assets/images/train_ghost_icon.png',
    ];

    iconPaths.forEach(path => {
        const name = path.split('/').pop().replace('.png', '');
        tasks.push(() => assetManager.loadImage(path, name));
    });

    // Preload portraits
    const portraitPaths = [
        'assets/images/wraith_portrait.png',
        'assets/images/dropship_portrait.png',
        'assets/images/science_vessel_portrait.png',
        'assets/images/valkyrie_portrait.png',
        'assets/images/battlecruiser_portrait.png',
        'assets/images/science_facility_portrait.png',
        'assets/images/control_tower_portrait.png',
        'assets/images/physics_lab_portrait.png',
    ];
    portraitPaths.forEach(path => {
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

    const scvMark2ConstructUrls = [
        'https://file.garden/Zy7B0LkdIVpGyzA1/StarCraft/sounds/Terran/Units/SCV/22_aint_paid_enough.wav',
        'https://file.garden/Zy7B0LkdIVpGyzA1/StarCraft/sounds/Terran/Units/SCV/01_scv_good_to.wav'
    ];
    scvMark2ConstructUrls.forEach((url, i) => {
        const name = `scv_mark2_constructed_${i}`;
        tasks.push(async () => {
            await assetManager.loadSound(url, name);
            audioManager.scvMark2ConstructedSoundNames.push(name);
        });
    });

    const firebatSoundUrls = [
        'https://file.garden/Zy7B0LkdIVpGyzA1/StarCraft/sounds/Terran/Units/Firebat/move2.wav',
        'https://file.garden/Zy7B0LkdIVpGyzA1/StarCraft/sounds/Terran/Units/Firebat/move.wav',
        'https://file.garden/Zy7B0LkdIVpGyzA1/StarCraft/sounds/Terran/Units/Firebat/on-click.wav',
        'https://file.garden/Zy7B0LkdIVpGyzA1/StarCraft/sounds/Terran/Units/Firebat/spawn.wav',
        'https://file.garden/Zy7B0LkdIVpGyzA1/StarCraft/sounds/Terran/Units/Firebat/attack-marshmallows.wav'
    ];
    firebatSoundUrls.forEach((url, i) => {
        const name = `firebat_${i}`;
        tasks.push(async () => {
            await assetManager.loadSound(url, name);
            audioManager.firebatSoundNames.push(name);
        });
    });

    const marineSoundUrls = [
        'https://file.garden/Zy7B0LkdIVpGyzA1/StarCraft/sounds/Terran/Units/Marine/move.wav',
        'https://file.garden/Zy7B0LkdIVpGyzA1/StarCraft/sounds/Terran/Units/Marine/spawn.wav',
        'https://file.garden/Zy7B0LkdIVpGyzA1/StarCraft/sounds/Terran/Units/Marine/on-kill.wav',
        'https://file.garden/Zy7B0LkdIVpGyzA1/StarCraft/sounds/Terran/Units/Marine/idle1.wav'
    ];
    marineSoundUrls.forEach((url, i) => {
        const name = `marine_${i}`;
        tasks.push(async () => {
            await assetManager.loadSound(url, name);
            audioManager.marineSoundNames.push(name);
        });
    });

    const medicSoundUrls = [
        'https://file.garden/Zy7B0LkdIVpGyzA1/StarCraft/sounds/Terran/Units/Medic/ready1.wav',
        'https://file.garden/Zy7B0LkdIVpGyzA1/StarCraft/sounds/Terran/Units/Medic/ready3.wav',
        'https://file.garden/Zy7B0LkdIVpGyzA1/StarCraft/sounds/Terran/Units/Medic/ready2.wav',
        'https://file.garden/Zy7B0LkdIVpGyzA1/StarCraft/sounds/Terran/Units/Medic/move1.wav',
        'https://file.garden/Zy7B0LkdIVpGyzA1/StarCraft/sounds/Terran/Units/Medic/idle1.wav',
        'https://file.garden/Zy7B0LkdIVpGyzA1/StarCraft/sounds/Terran/Units/Medic/heal2.wav',
        'https://file.garden/Zy7B0LkdIVpGyzA1/StarCraft/sounds/Terran/Units/Medic/heal1.wav',
        'https://file.garden/Zy7B0LkdIVpGyzA1/StarCraft/sounds/Terran/Units/Medic/banter2.wav',
        'https://file.garden/Zy7B0LkdIVpGyzA1/StarCraft/sounds/Terran/Units/Medic/banter1.wav'
    ];
    medicSoundUrls.forEach((url, i) => {
        const name = `medic_${i}`;
        tasks.push(async () => {
            await assetManager.loadSound(url, name);
            audioManager.medicSoundNames.push(name);
        });
    });

    const warningUrls = {
        minerals: 'https://file.garden/Zy7B0LkdIVpGyzA1/StarCraft/sounds/Terran/Units/SCV/minerals_warning.wav',
        gas: 'https://file.garden/Zy7B0LkdIVpGyzA1/StarCraft/sounds/Terran/Units/SCV/gas_warning.wav',
        supply: 'https://file.garden/Zy7B0LkdIVpGyzA1/StarCraft/sounds/Terran/Units/SCV/supply_warning.wav'
    };
    tasks.push(() => audioManager.loadWarningSounds(warningUrls));

    const bgUrls = [
        'https://file.garden/Zy7B0LkdIVpGyzA1/StarCraft/sounds/Terran/Terran%20BGM.mp3',
        'https://file.garden/Zy7B0LkdIVpGyzA1/StarCraft/sounds/Terran/Terran%20BGM2.mp3',
        'https://file.garden/Zy7B0LkdIVpGyzA1/StarCraft/sounds/Terran/terran1.mp3',
    ];
    // This part now uses the AudioManager method
    tasks.push(() => audioManager.loadBackgroundTracks(bgUrls));

    let loaded = 0;

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

    if (loadingOverlay) loadingOverlay.classList.remove('visible');
}