import * as THREE from 'three';
import { assetManager } from '../utils/asset-manager.js';
import { SCVBase } from './scv-base.js';

/** @tweakable Hotkeys for SCV commands. Change these values to customize keybinds. */
const scvHotkeys = {
    move: 'M',
    stop: 'T', // Changed from S
    hold: 'H',
    patrol: 'P',
    gather: 'G',
    repair: 'R',
    openBuildMenu: 'B',
    cancelBuildMenu: 'Escape',
    // Build menu hotkeys
    buildCommandCenter: 'C',
    buildSupplyDepot: 'U',
    buildRefinery: 'R',
    buildBarracks: 'B',
};

export class SCV extends SCVBase {
    constructor(position) {
        super(position);
        this.name = 'SCV';
        this.portraitUrl = 'assets/images/scv_portrait.png';
        this.maxHealth = 60;
        this.currentHealth = 60;

        this.carryCapacity = 5;
        this.gatherTime = 2.0; // seconds to gather

        this.commandMode = 'basic'; // 'basic' or 'build'
        this._commands = [];
        this.buildingTarget = null;
        this.repairTarget = null;
        
        this.sounds = {
            select: ['extra_scv_ack1', 'extra_scv_ack2'],
            move: ['extra_SCV_move', 'extra_SCV_move2']
        };

        this.mixer = null; // Animation mixer

        // Try to use GLB model, otherwise fallback to procedural
        try {
            const scvAsset = assetManager.get('scv');
            const { wrapper, model } = this.createMeshFromGLB(scvAsset);
            this.mesh = wrapper;
            this.model = model;

            // Setup animations on the inner model so rotation isn't overwritten
            if (scvAsset.animations && scvAsset.animations.length) {
                this.mixer = new THREE.AnimationMixer(this.model);
                // Just play the first animation clip found on a loop.
                const action = this.mixer.clipAction(scvAsset.animations[0]);
                action.play();
            }
        } catch (error) {
            this.mesh = this.createProceduralMesh();
        }

        this.setupModel(this.mesh, position);
        this.speed = 3.5; // SCVs are a bit slower than marines
        this.updateCommands({});
    }

    get commands() {
        return this._commands;
    }

    updateCommands(gameState) {
        const commands = new Array(12).fill(null);

        if (this.commandMode === 'build') {
            commands[0] = { command: 'build_command_center', hotkey: scvHotkeys.buildCommandCenter, icon: 'assets/images/build_command_center_icon.png', name: 'Build Command Center', cost: { minerals: 400 }, buildTime: 75.6 };
            commands[1] = { command: 'build_supply_depot', hotkey: scvHotkeys.buildSupplyDepot, icon: 'assets/images/build_supply_depot_icon.png', name: 'Build Supply Depot', cost: { minerals: 100 }, buildTime: 25.2 };
            commands[2] = { command: 'build_refinery', hotkey: scvHotkeys.buildRefinery, icon: 'assets/images/build_refinery_icon.png', name: 'Build Refinery', cost: { minerals: 100 }, buildTime: 25.2 };
            commands[3] = { command: 'build_barracks', hotkey: scvHotkeys.buildBarracks, icon: 'assets/images/build_barracks_icon.png', name: 'Build Barracks', cost: { minerals: 150 }, buildTime: 50.4 };
            commands[11] = { command: 'cancel_build_menu', hotkey: scvHotkeys.cancelBuildMenu, icon: 'assets/images/stop_icon.png', name: 'Cancel' };
        } else {
            commands[0] = { command: 'move', hotkey: scvHotkeys.move, icon: 'assets/images/move_icon.png', name: 'Move' };
            commands[1] = { command: 'stop', hotkey: scvHotkeys.stop, icon: 'assets/images/stop_icon.png', name: 'Stop' };
            commands[2] = { command: 'hold', hotkey: scvHotkeys.hold, icon: 'assets/images/hold_position_icon.png', name: 'Hold Position' };
            commands[3] = { command: 'patrol', hotkey: scvHotkeys.patrol, icon: 'assets/images/patrol_icon.png', name: 'Patrol' };
            commands[4] = { command: 'gather', hotkey: scvHotkeys.gather, icon: 'assets/images/gather_icon.png', name: 'Gather' };
            commands[5] = { command: 'repair', hotkey: scvHotkeys.repair, icon: 'assets/images/heal_icon.png', name: 'Repair' };
            commands[6] = { command: 'open_build_menu', hotkey: scvHotkeys.openBuildMenu, icon: 'assets/images/build_basic_structures_icon.png', name: 'Build Structures' };
        }

        this._commands = commands;
    }

    createMeshFromGLB(asset) {
        const model = asset.scene.clone();

        // Scale it down to be the same size as the current SCVs
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const desiredSize = 0.9; // Target largest dimension
        const maxDim = Math.max(size.x, size.y, size.z);
        
        if (maxDim > 0) { // Avoid division by zero
            const scale = desiredSize / maxDim;
            model.scale.set(scale, scale, scale);
        }

        // Center the model so it sits on the ground
        const scaledBox = new THREE.Box3().setFromObject(model);
        model.position.y = -scaledBox.min.y;

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
        const scvMaterial = new THREE.MeshStandardMaterial({ color: 0xffcc00, metalness: 0.6, roughness: 0.5 });
        const darkMaterial = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.7, roughness: 0.4 });
        const cockpitMaterial = new THREE.MeshStandardMaterial({ color: 0x00a1ff, emissive: 0x00a1ff, emissiveIntensity: 0.5, transparent: true, opacity: 0.8 });

        // Body
        const bodyGeo = new THREE.BoxGeometry(0.8, 0.6, 1);
        const body = new THREE.Mesh(bodyGeo, scvMaterial);
        body.position.y = 0.4;
        body.castShadow = true;
        group.add(body);

        // Cockpit
        const cockpitGeo = new THREE.BoxGeometry(0.5, 0.3, 0.2);
        const cockpit = new THREE.Mesh(cockpitGeo, cockpitMaterial);
        cockpit.position.set(0, 0.6, 0.45);
        group.add(cockpit);

        // Arms (simple cylinders for now)
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
        
        // Treads/Wheels (represented by boxes)
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

    build(buildingInstance, pathfinder, targetPosition = null) {
        this.stopActions();
        this.state = 'movingToBuild';
        this.buildingTarget = buildingInstance;

        let finalTargetPos = targetPosition;
        if (!finalTargetPos) {
            const buildingCollider = this.buildingTarget.getCollider();
            const size = buildingCollider.getSize(new THREE.Vector3());
            const buildPosition = this.buildingTarget.mesh.position;
            const radius = Math.max(size.x, size.z) / 2 + 1.5;

            finalTargetPos = new THREE.Vector3(
                buildPosition.x + radius,
                buildPosition.y,
                buildPosition.z
            );
        }

        const path = pathfinder.findPath(this.mesh.position, finalTargetPos);
        this.setPath(path);
    }

    repair(target, pathfinder, targetPosition = null) {
        this.stopActions();
        this.state = 'movingToRepair';
        this.repairTarget = target;

        let finalTargetPos = targetPosition;
        if (!finalTargetPos) {
            const collider = this.repairTarget.getCollider();
            const size = collider.getSize(new THREE.Vector3());
            const pos = this.repairTarget.mesh.position;
            const radius = Math.max(size.x, size.z) / 2 + 1.5;

            finalTargetPos = new THREE.Vector3(
                pos.x + radius,
                pos.y,
                pos.z
            );
        }

        const path = pathfinder.findPath(this.mesh.position, finalTargetPos);
        this.setPath(path);
    }

    executeCommand(commandName, gameState, statusCallback) {
        if (commandName === 'repair') {
            statusCallback('Right-click a damaged unit or building to repair.');
        }
    }

    update(delta, pathfinder, gameState, allBuildings, scene) {
        if (this.isGarrisoned) return;

        this.updateCommands(gameState);

        if (this.state === 'movingToBuild') {
            if (!this.buildingTarget) {
                this.state = 'idle';
                return;
            }
            this.updateMovement(delta, scene, () => {
                this.state = 'building';
                this.mesh.lookAt(this.buildingTarget.mesh.position);
            });
            return;
        }

        if (this.state === 'building') {
            if (!this.buildingTarget) {
                this.state = 'idle';
                return;
            }
            const buildRate = (this.buildingTarget.maxHealth / this.buildingTarget.buildTime) * delta;
            this.buildingTarget.currentHealth += buildRate;
            if (this.buildingTarget.currentHealth >= this.buildingTarget.maxHealth) {
                this.buildingTarget.currentHealth = this.buildingTarget.maxHealth;
                this.buildingTarget.onConstructionComplete(gameState);
                this.state = 'idle';
                this.buildingTarget = null;
            }
            return;
        }

        if (this.state === 'movingToRepair') {
            if (!this.repairTarget || this.repairTarget.currentHealth >= this.repairTarget.maxHealth) {
                this.state = 'idle';
                this.repairTarget = null;
                return;
            }
            this.updateMovement(delta, scene, () => {
                this.state = 'repairing';
                this.mesh.lookAt(this.repairTarget.mesh.position);
            });
            return;
        }

        if (this.state === 'repairing') {
            if (!this.repairTarget || this.repairTarget.currentHealth >= this.repairTarget.maxHealth) {
                this.state = 'idle';
                this.repairTarget = null;
                return;
            }
            const repairRate = 10 * delta;
            this.repairTarget.currentHealth += repairRate;
            if (this.repairTarget.currentHealth >= this.repairTarget.maxHealth) {
                this.repairTarget.currentHealth = this.repairTarget.maxHealth;
                this.state = 'idle';
                this.repairTarget = null;
            }
            return;
        }

        super.update(delta, pathfinder, gameState, allBuildings, scene);
    }
}