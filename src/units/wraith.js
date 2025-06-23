import * as THREE from 'three';
import { assetManager } from '../utils/asset-manager.js';

export class Wraith {
    constructor(position) {
        this.name = 'Wraith';
        this.portraitUrl = 'assets/images/wraith_portrait.png';
        this.maxHealth = 120;
        this.currentHealth = 120;
        this.isFlying = true;
        this.hoverHeight = 10;

        this.isGarrisoned = false; // Cannot be garrisoned
        this.state = 'idle'; // idle, moving, attacking

        this.commands = [
            { command: 'move', hotkey: 'M', icon: 'assets/images/move_icon.png', name: 'Move' },
            { command: 'stop', hotkey: 'S', icon: 'assets/images/stop_icon.png', name: 'Stop' },
            { command: 'hold', hotkey: 'H', icon: 'assets/images/hold_position_icon.png', name: 'Hold Position' },
            { command: 'patrol', hotkey: 'P', icon: 'assets/images/patrol_icon.png', name: 'Patrol' },
            { command: 'attack', hotkey: 'A', icon: 'assets/images/attack_icon.png', name: 'Attack' },
            null,
            null,
            { command: 'cloak', hotkey: 'C', icon: 'assets/images/cloak_icon.png', name: 'Cloak (Research)' },
        ];

        this.baseY = this.hoverHeight;
        
        try {
            let asset;
            try {
                asset = assetManager.get('extra_wraith');
            } catch (e) {
                asset = assetManager.get('wraith');
            }
            this.mesh = this.createMeshFromGLB(asset);
        } catch (error) {
            console.warn("Could not load wraith model, using procedural fallback.", error);
            this.mesh = this.createProceduralMesh();
        }

        this.mesh.position.copy(position);
        this.mesh.position.y = this.baseY;

        this.selected = false;
        this.path = [];
        this.currentWaypointIndex = 0;
        this.speed = 8.0; // Wraiths are fast

        // For hover/drive animation
        this.driveTime = 0;
        this.driveFrequency = 10;
        this.driveAmplitude = 0.2;

        const selectionGeometry = new THREE.RingGeometry(1.2, 1.4, 32);
        const selectionMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide });
        this.selectionIndicator = new THREE.Mesh(selectionGeometry, selectionMaterial);
        this.selectionIndicator.rotation.x = -Math.PI / 2;
        this.selectionIndicator.position.y = 0.01;
        this.selectionIndicator.visible = false;
        // The indicator is a separate mesh added to the scene, not the unit, to stay on the ground
        this.selectionIndicator.userData.owner = this;

        this.collider = new THREE.Box3().setFromObject(this.mesh);
    }
    
    createMeshFromGLB(asset) {
        const model = asset.scene.clone();

        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const desiredSize = 2.5; 
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
        const cockpitMaterial = new THREE.MeshStandardMaterial({ color: 0x00a1ff, emissive: 0x00a1ff, emissiveIntensity: 0.5 });
        
        const bodyGeo = new THREE.ConeGeometry(0.8, 2.5, 4);
        const body = new THREE.Mesh(bodyGeo, mainMaterial);
        body.rotation.x = Math.PI / 2;
        group.add(body);
        
        const wingGeo = new THREE.BoxGeometry(3, 0.1, 1.2);
        const wings = new THREE.Mesh(wingGeo, mainMaterial);
        wings.position.z = -0.3;
        group.add(wings);

        const cockpitGeo = new THREE.SphereGeometry(0.4, 8, 6, 0, Math.PI * 2, 0, Math.PI/2);
        const cockpit = new THREE.Mesh(cockpitGeo, cockpitMaterial);
        cockpit.position.y = 0.2;
        cockpit.position.z = 0.3;
        group.add(cockpit);

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
        if (commandName === 'cloak') {
            statusCallback("Cloaking field requires research.");
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
}