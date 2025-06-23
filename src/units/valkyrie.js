import * as THREE from 'three';
import { assetManager } from '../utils/asset-manager.js';

export class Valkyrie {
    constructor(position) {
        this.name = 'Valkyrie';
        this.portraitUrl = 'assets/images/valkyrie_portrait.png';
        this.maxHealth = 200;
        this.currentHealth = 200;
        this.isFlying = true;
        this.hoverHeight = 9;
        this.armor = 2;

        this.isGarrisoned = false; // Cannot be garrisoned
        this.state = 'idle'; // idle, moving, attacking

        this.commands = [
            { command: 'move', hotkey: 'M', icon: 'assets/images/move_icon.png', name: 'Move' },
            { command: 'stop', hotkey: 'S', icon: 'assets/images/stop_icon.png', name: 'Stop' },
            { command: 'hold', hotkey: 'H', icon: 'assets/images/hold_position_icon.png', name: 'Hold Position' },
            { command: 'patrol', hotkey: 'P', icon: 'assets/images/patrol_icon.png', name: 'Patrol' },
            { command: 'attack', hotkey: 'A', icon: 'assets/images/attack_icon.png', name: 'Attack' },
        ];

        this.baseY = this.hoverHeight;
        
        try {
            let asset;
            try {
                asset = assetManager.get('extra_valkyrie');
            } catch (e) {
                asset = assetManager.get('valkyrie');
            }
            this.mesh = this.createMeshFromGLB(asset);
        } catch (error) {
            console.warn("Could not load valkyrie model, using procedural fallback.", error);
            this.mesh = this.createProceduralMesh();
        }

        this.mesh.position.copy(position);
        this.mesh.position.y = this.baseY;

        this.selected = false;
        this.path = [];
        this.currentWaypointIndex = 0;
        this.speed = 8.5; // Valkyries are fast

        // For hover/drive animation
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
        const desiredSize = 4.5; 
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
        const mainMaterial = new THREE.MeshStandardMaterial({ color: 0x8a9aaa, metalness: 0.8, roughness: 0.4 });
        const darkMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
        
        // Main fuselage
        const bodyGeo = new THREE.BoxGeometry(1.5, 0.8, 4.5);
        const body = new THREE.Mesh(bodyGeo, mainMaterial);
        group.add(body);
        
        // Wings
        const wingGeo = new THREE.BoxGeometry(5, 0.3, 1.5);
        const wings = new THREE.Mesh(wingGeo, mainMaterial);
        wings.position.y = 0.2;
        group.add(wings);

        // Engines
        const engineGeo = new THREE.CylinderGeometry(0.6, 0.4, 1.2, 8);
        const leftEngine = new THREE.Mesh(engineGeo, darkMaterial);
        leftEngine.rotation.z = Math.PI / 2;
        leftEngine.position.set(-1.5, 0.2, -1.8);
        group.add(leftEngine);
        const rightEngine = leftEngine.clone();
        rightEngine.position.x = 1.5;
        group.add(rightEngine);

        // Missile Pods under wings
        const podGeo = new THREE.BoxGeometry(0.4, 0.4, 1.2);
        for(let i = 0; i < 4; i++) {
             const podL = new THREE.Mesh(podGeo, darkMaterial);
             podL.position.set(-2.2 + i * 0.5, -0.3, 0.3);
             wings.add(podL);
             const podR = podL.clone();
             podR.position.x = 2.2 - i * 0.5;
             wings.add(podR);
        }

        group.traverse((child) => {
            if (child.isMesh) {
                child.userData.owner = this;
                child.castShadow = true;
            }
        });
        
        group.rotation.y = -Math.PI / 2; // Align to Z-forward
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
        // No special commands yet
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