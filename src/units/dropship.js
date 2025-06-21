import * as THREE from 'three';
import { assetManager } from '../utils/asset-manager.js';
import { getTerrainHeight } from '../utils/terrain.js';
import { Infantry } from './infantry.js';

export class Dropship {
    constructor(position) {
        this.name = 'Dropship';
        this.portraitUrl = 'assets/images/dropship_portrait.png';
        this.maxHealth = 200;
        this.currentHealth = 200;
        this.isFlying = true;
        this.hoverHeight = 8;
        this.armor = 1;

        this.isGarrisoned = false; // Cannot be garrisoned itself
        this.state = 'idle'; // idle, moving

        // Garrison properties
        this.garrisonedUnits = [];
        this.capacity = 8;

        this.commands = [
            { command: 'move', hotkey: 'M', icon: 'assets/images/move_icon.png', name: 'Move' },
            { command: 'stop', hotkey: 'S', icon: 'assets/images/stop_icon.png', name: 'Stop' },
            { command: 'hold', hotkey: 'H', icon: 'assets/images/hold_position_icon.png', name: 'Hold Position' },
            { command: 'patrol', hotkey: 'P', icon: 'assets/images/patrol_icon.png', name: 'Patrol' },
            null,
            null,
            null,
            null,
            { 
                command: 'unload_all', 
                hotkey: 'U', 
                icon: 'assets/images/unload_all_icon.png', 
                name: 'Unload All'
            },
        ];

        this.baseY = this.hoverHeight;
        
        try {
            const asset = assetManager.get('dropship');
            this.mesh = this.createMeshFromGLB(asset);
        } catch (error) {
            console.warn("Could not load dropship model, using procedural fallback.", error);
            this.mesh = this.createProceduralMesh();
        }

        this.mesh.position.copy(position);
        this.mesh.position.y = this.baseY;

        this.selected = false;
        this.path = [];
        this.currentWaypointIndex = 0;
        this.speed = 7.5; // Fast, but slower than a wraith

        // For hover animation
        this.driveTime = 0;
        this.driveFrequency = 8;
        this.driveAmplitude = 0.3;

        const selectionGeometry = new THREE.RingGeometry(2.2, 2.4, 32);
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
        const desiredSize = 4.0; 
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
        const mainMaterial = new THREE.MeshStandardMaterial({ color: 0x6a8aaa, metalness: 0.8, roughness: 0.4 });
        const darkMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
        
        // Main body
        const bodyGeo = new THREE.BoxGeometry(2, 1, 4);
        const body = new THREE.Mesh(bodyGeo, mainMaterial);
        group.add(body);
        
        // Cockpit
        const cockpitGeo = new THREE.BoxGeometry(1.5, 0.8, 1);
        const cockpit = new THREE.Mesh(cockpitGeo, mainMaterial);
        cockpit.position.z = 2;
        group.add(cockpit);

        // Wings
        const wingGeo = new THREE.BoxGeometry(5, 0.2, 1.5);
        const wings = new THREE.Mesh(wingGeo, mainMaterial);
        wings.position.y = 0.4;
        group.add(wings);

        // Engines
        const engineGeo = new THREE.CylinderGeometry(0.5, 0.5, 1, 8);
        const leftEngine = new THREE.Mesh(engineGeo, darkMaterial);
        leftEngine.rotation.x = Math.PI / 2;
        leftEngine.position.set(-2, 0.4, -0.5);
        group.add(leftEngine);
        const rightEngine = leftEngine.clone();
        rightEngine.position.x = 2;
        group.add(rightEngine);

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
        if (commandName === 'unload_all') {
            if (this.garrisonedUnits.length > 0) {
                this.unloadAll(gameState.scene);
                statusCallback("Units unloaded.");
            } else {
                statusCallback("Dropship is empty.");
            }
        }
    }

    update(delta, pathfinder, gameState, buildings, scene) {
        if (this.state === 'moving') {
            this.updateMovement(delta, scene, () => { this.state = 'idle'; });
        } else {
             // Bobbing animation
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

            if (moveVector.length() > distance) {
                moveVector.setLength(distance);
            }

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

    // Garrisoning Logic
    addUnit(unit) {
        if (this.garrisonedUnits.length >= this.capacity) {
            return false;
        }
        // Only infantry can be transported
        if (unit.isFlying === undefined || unit.isFlying === false) {
            this.garrisonedUnits.push(unit);
            unit.isGarrisoned = true;
            unit.mesh.visible = false;
            unit.deselect();
            return true;
        }
        return false;
    }

    getSpawnPoints(scene) {
        const points = [];
        const radius = 3.5;
        const count = this.garrisonedUnits.length > 0 ? this.garrisonedUnits.length : 1;
        for (let i = 0; i < this.garrisonedUnits.length; i++) {
            const angle = (i / count) * Math.PI * 2;
            const spawnPos = this.mesh.position.clone().add(new THREE.Vector3(radius * Math.cos(angle), 0, radius * Math.sin(angle)));
            spawnPos.y = getTerrainHeight(scene, spawnPos.x, spawnPos.z);
            points.push(spawnPos);
        }
        return points;
    }

    unloadAll(scene) {
        const spawnPoints = this.getSpawnPoints(scene);
        if (spawnPoints.length === 0) return;

        this.garrisonedUnits.forEach((unit, i) => {
            const spawnPoint = spawnPoints[i % spawnPoints.length];
            unit.mesh.position.copy(spawnPoint);
            unit.isGarrisoned = false;
            unit.mesh.visible = true;
            unit.path = [];
            unit.state = 'idle';
        });

        this.garrisonedUnits = [];
    }
}