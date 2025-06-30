import * as THREE from 'three';
import { assetManager } from '../utils/asset-manager.js';
import { createDefensiveMatrix, createEMPShockwave, createIrradiate } from '../game/effects.js';

/** @tweakable Hotkeys for Science Vessel abilities */
const scienceVesselHotkeys = {
    defensiveMatrix: 'F',
    empShockwave: 'E',
    irradiate: 'R',
};

export class ScienceVessel {
    constructor(position) {
        this.name = 'Science Vessel';
        this.portraitUrl = 'assets/images/science_vessel_portrait.png';
        this.maxHealth = 200;
        this.currentHealth = 200;
        this.armor = 1;
        this.isFlying = true;
        this.hoverHeight = 9;
        this.isDetector = true;

        this.energy = 50;
        this.maxEnergy = 200;

        this.isGarrisoned = false; // Cannot be garrisoned itself
        this.state = 'idle'; // idle, moving

        this.commands = [
            { command: 'move', hotkey: 'M', icon: 'assets/images/move_icon.png', name: 'Move' },
            { command: 'stop', hotkey: 'S', icon: 'assets/images/stop_icon.png', name: 'Stop' },
            { command: 'hold', hotkey: 'H', icon: 'assets/images/hold_position_icon.png', name: 'Hold Position' },
            { command: 'patrol', hotkey: 'P', icon: 'assets/images/patrol_icon.png', name: 'Patrol' },
            null,
            null,
            { command: 'defensive_matrix', hotkey: scienceVesselHotkeys.defensiveMatrix, icon: 'assets/images/defensive_matrix_icon.png', name: 'Defensive Matrix', cost: { energy: 100 } },
            { command: 'emp_shockwave', hotkey: scienceVesselHotkeys.empShockwave, icon: 'assets/images/emp_shockwave_icon.png', name: 'EMP Shockwave', cost: { energy: 100 } },
            { command: 'irradiate', hotkey: scienceVesselHotkeys.irradiate, icon: 'assets/images/irradiate_icon.png', name: 'Irradiate', cost: { energy: 75 } },
        ];

        this.baseY = this.hoverHeight;

        try {
            const asset = assetManager.get('science_vessel');
            this.mesh = this.createMeshFromGLB(asset);
        } catch (error) {
            console.warn("Could not load science vessel model, using procedural fallback.", error);
            this.mesh = this.createProceduralMesh();
        }

        this.mesh.position.copy(position);
        this.mesh.position.y = this.baseY;

        this.selected = false;
        this.path = [];
        this.currentWaypointIndex = 0;
        this.speed = 7.5;

        this.driveTime = 0;
        this.driveFrequency = 7;
        this.driveAmplitude = 0.25;

        const selectionGeometry = new THREE.RingGeometry(2.0, 2.2, 32);
        const selectionMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide });
        this.selectionIndicator = new THREE.Mesh(selectionGeometry, selectionMaterial);
        this.selectionIndicator.rotation.x = -Math.PI / 2;
        this.selectionIndicator.position.y = 0.01;
        this.selectionIndicator.visible = false;
        this.selectionIndicator.userData.owner = this;

        this.collider = new THREE.Box3().setFromObject(this.mesh);
    }

    createMeshFromGLB(asset) {
        const model = asset.scene.clone();
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const desiredSize = 3.5;
        const maxDim = Math.max(size.x, size.y, size.z);

        if (maxDim > 0) {
            const scale = desiredSize / maxDim;
            model.scale.set(scale, scale, scale);
        }
        const wrapper = new THREE.Group();
        wrapper.add(model);
        wrapper.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.userData.owner = this;
            }
        });
        return wrapper;
    }

    createProceduralMesh() {
        const group = new THREE.Group();
        const mainMaterial = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.8, roughness: 0.4 });
        const darkMaterial = new THREE.MeshStandardMaterial({ color: 0x444444 });
        const emissiveMaterial = new THREE.MeshStandardMaterial({ color: 0x00a1ff, emissive: 0x00a1ff, emissiveIntensity: 0.5 });
        
        const bodyGeo = new THREE.SphereGeometry(1.5, 16, 8);
        const body = new THREE.Mesh(bodyGeo, mainMaterial);
        group.add(body);
        
        const bottomGeo = new THREE.ConeGeometry(1, 1, 8);
        const bottom = new THREE.Mesh(bottomGeo, darkMaterial);
        bottom.position.y = -1.2;
        group.add(bottom);

        const dishGeo = new THREE.CylinderGeometry(2, 2, 0.2, 16);
        const dish = new THREE.Mesh(dishGeo, mainMaterial);
        dish.position.y = 0.2;
        group.add(dish);

        group.traverse((child) => {
            if (child.isMesh) {
                child.userData.owner = this;
                child.castShadow = true;
            }
        });
        return group;
    }

    select() { this.selected = true; this.selectionIndicator.visible = true; }
    deselect() { this.selected = false; this.selectionIndicator.visible = false; }

    setPath(path) {
        if (path && path.length > 0) {
            this.path = path;
            this.currentWaypointIndex = 0;
            this.state = 'moving';
        } else {
            this.path = [];
            this.state = 'idle';
        }
    }

    executeCommand(commandName, gameState, statusCallback) {
        switch (commandName) {
            case 'defensive_matrix':
                if (this.energy < 100) {
                    statusCallback('Not enough energy.');
                    break;
                }
                this.energy -= 100;
                createDefensiveMatrix(this.mesh.position);
                statusCallback('Defensive Matrix deployed.');
                break;
            case 'emp_shockwave':
                if (!gameState.upgrades.empShockwave) {
                    statusCallback('EMP Shockwave not researched.');
                    break;
                }
                if (this.energy < 100) {
                    statusCallback('Not enough energy.');
                    break;
                }
                this.energy -= 100;
                createEMPShockwave(this.mesh.position);
                statusCallback('EMP Shockwave fired.');
                break;
            case 'irradiate':
                if (this.energy < 75) {
                    statusCallback('Not enough energy.');
                    break;
                }
                this.energy -= 75;
                createIrradiate(this.mesh.position);
                statusCallback('Irradiate activated.');
                break;
        }
    }

    update(delta, pathfinder, gameState, buildings, scene) {
        if (this.energy < this.maxEnergy) {
            this.energy += 0.5625 * delta;
        }
        if (this.energy > this.maxEnergy) {
            this.energy = this.maxEnergy;
        }

        if (this.state === 'moving') {
            this.updateMovement(delta, scene, () => { this.state = 'idle'; });
        } else {
            this.driveTime += delta;
            this.mesh.position.y = this.baseY + Math.sin(this.driveTime * this.driveFrequency) * this.driveAmplitude;
        }
        this.selectionIndicator.position.set(this.mesh.position.x, 0.01, this.mesh.position.z);
    }

    updateMovement(delta, scene, onPathComplete) {
        if (!this.path || this.path.length === 0 || this.currentWaypointIndex >= this.path.length) {
            if (onPathComplete) onPathComplete();
            return;
        }

        const targetPosition = this.path[this.currentWaypointIndex].clone();
        targetPosition.y = this.hoverHeight;

        const distance = this.mesh.position.distanceTo(targetPosition);

        if (distance < 0.2) {
            this.currentWaypointIndex++;
        } else {
            const direction = targetPosition.clone().sub(this.mesh.position).normalize();
            const moveDistance = this.speed * delta;
            const moveVector = direction.clone().multiplyScalar(moveDistance);
            if (moveVector.length() > distance) moveVector.setLength(distance);

            this.mesh.position.add(moveVector);
            const lookAtTarget = new THREE.Vector3(targetPosition.x, this.mesh.position.y, targetPosition.z);
            this.mesh.lookAt(lookAtTarget);
        }
        
        if (this.currentWaypointIndex >= this.path.length) {
            this.path = [];
            this.state = 'idle';
            if (onPathComplete) onPathComplete();
        }
    }
}