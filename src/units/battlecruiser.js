import * as THREE from 'three';
import { assetManager } from '../utils/asset-manager.js';

export class Battlecruiser {
    constructor(position) {
        this.name = 'Battlecruiser';
        this.portraitUrl = 'assets/images/battlecruiser_portrait.png';
        this.maxHealth = 500;
        this.currentHealth = 500;
        this.armor = 3;
        this.isFlying = true;
        this.hoverHeight = 11;

        this.energy = 50;
        this.maxEnergy = 200;

        this.isGarrisoned = false;
        this.state = 'idle';

        this.commands = [
            { command: 'move', hotkey: 'M', icon: 'assets/images/move_icon.png', name: 'Move' },
            { command: 'stop', hotkey: 'S', icon: 'assets/images/stop_icon.png', name: 'Stop' },
            { command: 'hold', hotkey: 'H', icon: 'assets/images/hold_position_icon.png', name: 'Hold Position' },
            { command: 'attack', hotkey: 'A', icon: 'assets/images/attack_icon.png', name: 'Attack' },
            null,
            { command: 'yamato_cannon', hotkey: 'Y', icon: 'assets/images/yamato_cannon_icon.png', name: 'Yamato Cannon', cost: { energy: 150 } },
        ];

        this.baseY = this.hoverHeight;

        try {
            const asset = assetManager.get('battlecruiser');
            this.mesh = this.createMeshFromGLB(asset);
        } catch (error) {
            console.warn("Could not load battlecruiser model, using procedural fallback.", error);
            this.mesh = this.createProceduralMesh();
        }

        this.mesh.position.copy(position);
        this.mesh.position.y = this.baseY;

        this.selected = false;
        this.path = [];
        this.currentWaypointIndex = 0;
        this.speed = 5.0; // Slow

        this.driveTime = 0;
        this.driveFrequency = 5;
        this.driveAmplitude = 0.3;

        const selectionGeometry = new THREE.RingGeometry(4.0, 4.2, 32);
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
        const desiredSize = 8.0;
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
        
        wrapper.rotation.y = -Math.PI / 2;
        return wrapper;
    }

    createProceduralMesh() {
        const group = new THREE.Group();
        const mainMaterial = new THREE.MeshStandardMaterial({ color: 0x8a9aaa, metalness: 0.8, roughness: 0.4 });
        const darkMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });

        const bodyGeo = new THREE.BoxGeometry(2.5, 2, 7);
        const body = new THREE.Mesh(bodyGeo, mainMaterial);
        group.add(body);

        const hammerheadGeo = new THREE.BoxGeometry(5, 1.5, 2);
        const hammerhead = new THREE.Mesh(hammerheadGeo, mainMaterial);
        hammerhead.position.z = 4;
        group.add(hammerhead);

        const bridgeGeo = new THREE.BoxGeometry(1.5, 1, 1.5);
        const bridge = new THREE.Mesh(bridgeGeo, darkMaterial);
        bridge.position.y = 1.2;
        bridge.position.z = -1;
        group.add(bridge);

        group.traverse((child) => {
            if (child.isMesh) {
                child.userData.owner = this;
                child.castShadow = true;
            }
        });
        
        group.rotation.y = -Math.PI / 2;
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
        if (commandName === 'yamato_cannon') {
            statusCallback("Yamato Cannon not yet implemented.");
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