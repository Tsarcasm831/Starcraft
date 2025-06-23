import * as THREE from 'three';
import { assetManager } from '../utils/asset-manager.js';
import { SCVBase } from './scv-base.js';

/* @tweakable SCV Mark 2 animation settings */
const scv2AnimationConfig = {
    crossfadeDuration: 0.2,
    speedMultiplier: 1.0,
};

export class SCVMark2 extends SCVBase {
    constructor(position) {
        super(position);
        this.name = 'SCV Mark 2';
        this.portraitUrl = 'assets/images/scv2.png';
        this.maxHealth = 75;
        this.currentHealth = 75;

        this.carryCapacity = 8; // Mark 2 can carry more
        this.gatherTime = 2.0;
        this.gatherProgress = 0;
        this.buildingTarget = null;
        this.commandMode = 'basic'; // 'basic', 'build', or 'build_advanced'
        this._commands = [];

        this.mixer = null;
        this.animations = {};
        this.activeAnimation = null;

        try {
            const scvAsset = assetManager.get('extra_scv2');
            const { wrapper, model } = this.createMeshFromGLB(scvAsset);
            this.mesh = wrapper;
            this.model = model;

            this.mixer = new THREE.AnimationMixer(this.model);

            // Separate animation files are loaded via the extra-assets manifest
            const idleAsset = assetManager.get('extra_Animation_Idle');
            const walkAsset = assetManager.get('extra_Animation_Walking');
            const mineRepairAsset = assetManager.get('extra_Animation_MineRepair');

            if (idleAsset && idleAsset.animations && idleAsset.animations[0]) {
                this.animations.idle = this.mixer.clipAction(idleAsset.animations[0]);
            }
            if (walkAsset && walkAsset.animations && walkAsset.animations[0]) {
                this.animations.walk = this.mixer.clipAction(walkAsset.animations[0]);
            }
            if (mineRepairAsset && mineRepairAsset.animations && mineRepairAsset.animations[0]) {
                this.animations.mineRepair = this.mixer.clipAction(mineRepairAsset.animations[0]);
            }
            
            this.switchAnimation('idle');
        } catch (error) {
            console.error("Failed to initialize SCV Mark 2 with animations:", error);
            this.mesh = this.createProceduralMesh();
        }

        this.setupModel(this.mesh, position);
        this.speed = 4.0;
        this.updateCommands({});
    }
    
    get commands() {
        return this._commands;
    }
    
    updateCommands(gameState) {
        const commands = new Array(12).fill(null);

        if (this.commandMode === 'build') {
            commands[0] = { command: 'build_command_center', hotkey: 'C', icon: 'assets/images/build_command_center_icon.png', name: 'Build Command Center', cost: { minerals: 400 }, buildTime: 75.6 };
            commands[1] = { command: 'build_supply_depot', hotkey: 'S', icon: 'assets/images/build_supply_depot_icon.png', name: 'Build Supply Depot', cost: { minerals: 100 }, buildTime: 25.2 };
            commands[2] = { command: 'build_refinery', hotkey: 'R', icon: 'assets/images/build_refinery_icon.png', name: 'Build Refinery', cost: { minerals: 100 }, buildTime: 25.2 };
            commands[3] = { command: 'build_barracks', hotkey: 'B', icon: 'assets/images/build_barracks_icon.png', name: 'Build Barracks', cost: { minerals: 150 }, buildTime: 50.4 };
            commands[4] = { command: 'build_engineering_bay', hotkey: 'E', icon: 'assets/images/build_engineering_bay_icon.png', name: 'Build Engineering Bay', cost: { minerals: 125 }, buildTime: 37.8 };
            commands[5] = { command: 'build_academy', hotkey: 'A', icon: 'assets/images/build_academy_icon.png', name: 'Build Academy', cost: { minerals: 150 }, buildTime: 50.4, prereq: 'barracksBuilt' };
            commands[6] = { command: 'build_bunker', hotkey: 'K', icon: 'assets/images/build_bunker_icon.png', name: 'Build Bunker', cost: { minerals: 100 }, buildTime: 18.9 };
            
            commands[7] = { command: 'build_missile_turret', hotkey: 'T', icon: 'assets/images/build_missile_turret_icon.png', name: 'Build Missile Turret', cost: { minerals: 75 }, buildTime: 18.9, prereq: 'engineeringBayBuilt' };

            commands[11] = { command: 'cancel_build_menu', hotkey: 'Escape', icon: 'assets/images/stop_icon.png', name: 'Cancel' };
        } else if (this.commandMode === 'build_advanced') {
            commands[0] = {
                command: 'build_factory',
                hotkey: 'F',
                icon: 'assets/images/build_factory_icon.png',
                name: 'Build Factory',
                cost: { minerals: 200, vespene: 100 },
                buildTime: 50.4,
                prereq: 'barracksBuilt'
            };
            commands[1] = {
                command: 'build_starport',
                hotkey: 'S',
                icon: 'assets/images/build_starport_icon.png',
                name: 'Build Starport',
                cost: { minerals: 150, vespene: 100 },
                buildTime: 50.4,
                prereq: 'factoryBuilt'
            };
            commands[2] = {
                command: 'build_armory',
                hotkey: 'A',
                icon: 'assets/images/build_armory_icon.png',
                name: 'Build Armory',
                cost: { minerals: 100, vespene: 50 },
                buildTime: 50.4,
                prereq: 'factoryBuilt'
            };
            commands[3] = {
                command: 'build_science_facility',
                hotkey: 'C',
                icon: 'assets/images/build_science_facility_icon.png',
                name: 'Build Science Facility',
                cost: { minerals: 100, vespene: 150 },
                buildTime: 60,
                prereq: 'starportBuilt'
            };

            // Here you could add Science Facility, etc.
            
            commands[11] = { command: 'cancel_build_menu', hotkey: 'Escape', icon: 'assets/images/stop_icon.png', name: 'Cancel' };
        } else { // 'basic' mode
            commands[0] = { command: 'move', hotkey: 'M', icon: 'assets/images/move_icon.png', name: 'Move' };
            commands[1] = { command: 'stop', hotkey: 'S', icon: 'assets/images/stop_icon.png', name: 'Stop' };
            commands[2] = { command: 'hold', hotkey: 'H', icon: 'assets/images/hold_position_icon.png', name: 'Hold Position' };
            commands[3] = { command: 'patrol', hotkey: 'P', icon: 'assets/images/patrol_icon.png', name: 'Patrol' };
            commands[4] = { command: 'gather', hotkey: 'G', icon: 'assets/images/gather_icon.png', name: 'Gather' };
            commands[5] = { command: 'repair', hotkey: 'R', icon: 'assets/images/heal_icon.png', name: 'Repair' };
            commands[6] = { command: 'open_build_menu', hotkey: 'B', icon: 'assets/images/build_basic_structures_icon.png', name: 'Build Basic Structures' };
            commands[7] = { command: 'open_advanced_build_menu', hotkey: 'V', icon: 'assets/images/build_advanced_structures_icon.png', name: 'Build Advanced Structures' };
        }

        this._commands = commands;
    }
    
    createMeshFromGLB(asset) {
        const model = asset.scene.clone();

        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const desiredSize = 0.9; 
        const maxDim = Math.max(size.x, size.y, size.z);
        
        if (maxDim > 0) { 
            const scale = desiredSize / maxDim;
            model.scale.set(scale, scale, scale);
        }

        const scaledBox = new THREE.Box3().setFromObject(model);
        model.position.set(
            -(scaledBox.min.x + scaledBox.max.x) / 2,
            -scaledBox.min.y,
            -(scaledBox.min.z + scaledBox.max.z) / 2
        );

        model.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.userData.owner = this;
            }
        });
        
        this.addCarryVisuals(model);

        const wrapper = new THREE.Group();
        wrapper.add(model);

        return { wrapper, model };
    }
    
    createProceduralMesh() {
        const group = new THREE.Group();
        const scvMaterial = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.7, roughness: 0.5 }); 
        const darkMaterial = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.7, roughness: 0.4 });
        const cockpitMaterial = new THREE.MeshStandardMaterial({ color: 0xff4444, emissive: 0xff0000, emissiveIntensity: 0.5, transparent: true, opacity: 0.8 }); 

        const bodyGeo = new THREE.BoxGeometry(0.8, 0.6, 1);
        const body = new THREE.Mesh(bodyGeo, scvMaterial);
        body.position.y = 0.4;
        body.castShadow = true;
        group.add(body);

        const cockpitGeo = new THREE.BoxGeometry(0.5, 0.3, 0.2);
        const cockpit = new THREE.Mesh(cockpitGeo, cockpitMaterial);
        cockpit.position.set(0, 0.6, 0.45);
        group.add(cockpit);

        const armGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.6, 6);
        const leftArm = new THREE.Mesh(armGeo, darkMaterial);
        leftArm.position.set(0.5, 0.4, 0);
        leftArm.rotation.z = Math.PI / 4;
        leftArm.castShadow = true;
        group.add(leftArm);

        const rightArm = leftArm.clone();
        rightArm.position.x = -0.5;
        rightArm.rotation.z = -Math.PI / 4;
        group.add(rightArm);
        
        const treadGeo = new THREE.BoxGeometry(0.2, 0.3, 1.2);
        const leftTread = new THREE.Mesh(treadGeo, darkMaterial);
        leftTread.position.set(0.5, 0.15, 0);
        leftTread.castShadow = true;
        group.add(leftTread);

        const rightTread = leftTread.clone();
        rightTread.position.x = -0.5;
        group.add(rightTread);

        group.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.userData.owner = this;
            }
        });

        group.scale.set(0.8, 0.8, 0.8);
        this.addCarryVisuals(group);
        return group;
    }

    switchAnimation(name) {
        if (!this.mixer || !this.animations[name]) return;

        const nextAction = this.animations[name];
        const currentAction = this.activeAnimation;

        if (currentAction !== nextAction) {
            nextAction.reset();
            nextAction.timeScale = scv2AnimationConfig.speedMultiplier;
            nextAction.play();
            if (currentAction) {
                currentAction.crossFadeTo(nextAction, scv2AnimationConfig.crossfadeDuration, true);
            }
            this.activeAnimation = nextAction;
        }
    }

    updateAnimationBasedOnState() {
        let anim = 'idle';
        switch (this.state) {
            case 'moving':
            case 'movingToBuild':
            case 'movingToResource':
            case 'movingToRepair':
            case 'movingToGarrison':
            case 'returning':
                anim = 'walk';
                break;
            case 'gathering':
            case 'building':
            case 'repairing':
                anim = 'mineRepair';
                break;
        }
        this.switchAnimation(anim);
    }


    build(buildingInstance, pathfinder, targetPosition = null) {
        this.stopActions();
        this.state = 'movingToBuild';
        this.buildingTarget = buildingInstance;

        let finalTargetPos = targetPosition;
        if (!finalTargetPos) {
            // Pathfind to a spot next to the building site (default logic for one SCV)
            const buildingCollider = this.buildingTarget.getCollider();
            const size = buildingCollider.getSize(new THREE.Vector3());
            const buildPosition = this.buildingTarget.mesh.position;
            const radius = Math.max(size.x, size.z) / 2 + 1.5; // SCV radius + buffer
            
            finalTargetPos = new THREE.Vector3(
                buildPosition.x + radius,
                buildPosition.y,
                buildPosition.z
            );
        }

        const path = pathfinder.findPath(this.mesh.position, finalTargetPos);
        this.setPath(path);
    }

    update(delta, pathfinder, gameState, allBuildings, scene) {
        if (this.isGarrisoned) return;

        if (this.mixer) {
            this.mixer.update(delta);
        }

        this.updateCommands(gameState);

        if (this.state === 'movingToBuild') {
            if (!this.buildingTarget) {
                this.state = 'idle';
            }
            this.updateMovement(delta, scene, () => {
                this.state = 'building';
                if(this.buildingTarget) this.mesh.lookAt(this.buildingTarget.mesh.position);
            });
        } else if (this.state === 'building') {
            if (!this.buildingTarget) {
                this.state = 'idle';
            } else {
                const buildRate = (this.buildingTarget.maxHealth / this.buildingTarget.buildTime) * delta;
                this.buildingTarget.currentHealth += buildRate;
                if (this.buildingTarget.currentHealth >= this.buildingTarget.maxHealth) {
                    this.buildingTarget.currentHealth = this.buildingTarget.maxHealth;
                    this.buildingTarget.onConstructionComplete(gameState);
                    this.state = 'idle';
                    this.buildingTarget = null;
                }
            }
        } else {
            super.update(delta, pathfinder, gameState, allBuildings, scene);
        }

        this.updateAnimationBasedOnState();
    }
    
}