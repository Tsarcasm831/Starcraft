import * as THREE from 'three';
import { assetManager } from '../utils/asset-manager.js';
import { getTerrainHeight } from '../utils/terrain.js';

export class Vulture {
    constructor(position) {
        this.name = 'Vulture';
        this.portraitUrl = 'assets/images/vulture_portrait.png';
        this.maxHealth = 80;
        this.currentHealth = 80;
        this.isGarrisoned = false; // Cannot be garrisoned
        this.isStuckOnDepot = false;
        this.stuckOnDepotInstance = null;
        this.state = 'idle'; // idle, moving, attack

        this.commands = [
            { command: 'move', hotkey: 'M', icon: 'assets/images/move_icon.png', name: 'Move' },
            { command: 'stop', hotkey: 'S', icon: 'assets/images/stop_icon.png', name: 'Stop' },
            { command: 'hold', hotkey: 'H', icon: 'assets/images/hold_position_icon.png', name: 'Hold Position' },
            { command: 'patrol', hotkey: 'P', icon: 'assets/images/patrol_icon.png', name: 'Patrol' },
            { command: 'attack', hotkey: 'A', icon: 'assets/images/attack_icon.png', name: 'Attack' },
        ];

        this.baseY = position.y + 0.3; // Hover height

        try {
            const asset = assetManager.get('vulture');
            this.mesh = this.createMeshFromGLB(asset);
        } catch (error) {
            console.warn("Could not load vulture.glb, using procedural fallback.", error);
            this.mesh = this.createProceduralMesh();
        }

        this.mesh.position.copy(position);
        this.mesh.position.y = this.baseY;

        this.selected = false;
        this.path = [];
        this.currentWaypointIndex = 0;
        this.speed = 6.5; // Vultures are fast

        // For hover/drive animation
        this.driveTime = 0;
        this.driveFrequency = 20;
        this.driveAmplitude = 0.05;

        const selectionGeometry = new THREE.RingGeometry(0.9, 1.0, 32);
        const selectionMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide });
        this.selectionIndicator = new THREE.Mesh(selectionGeometry, selectionMaterial);
        this.selectionIndicator.rotation.x = -Math.PI / 2;
        this.selectionIndicator.position.y = -this.baseY + 0.01; // Position on the ground
        this.selectionIndicator.visible = false;
        this.mesh.add(this.selectionIndicator);

        this.collider = new THREE.Box3().setFromObject(this.mesh);
    }
    
    createMeshFromGLB(asset) {
        const model = asset.scene.clone();

        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const desiredSize = 2.0;
        const maxDim = Math.max(size.x, size.y, size.z);
        
        if (maxDim > 0) {
            const scale = desiredSize / maxDim;
            model.scale.set(scale, scale, scale);
        }
        
        // The GLB model's "front" is along its local +X axis.
        // We need to rotate it so it aligns with the parent group's +Z axis,
        // which is what Three.js's lookAt() uses as the forward direction.
        model.rotation.y = -Math.PI / 2;

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
        const mainMaterial = new THREE.MeshStandardMaterial({ color: 0x4a6a8a, metalness: 0.8, roughness: 0.4 });
        const darkMaterial = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.9, roughness: 0.3 });

        // Body
        const bodyGeo = new THREE.BoxGeometry(2, 0.4, 1);
        const body = new THREE.Mesh(bodyGeo, mainMaterial);
        group.add(body);
        
        // Cockpit/Seat area
        const seatGeo = new THREE.BoxGeometry(0.5, 0.3, 0.6);
        const seat = new THREE.Mesh(seatGeo, darkMaterial);
        seat.position.set(-0.2, 0.3, 0);
        group.add(seat);

        // Front part
        const frontGeo = new THREE.BoxGeometry(0.8, 0.3, 0.8);
        const front = new THREE.Mesh(frontGeo, mainMaterial);
        front.position.x = 0.8;
        group.add(front);

        // Grenade launcher
        const launcherGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.5, 8);
        const launcher = new THREE.Mesh(launcherGeo, darkMaterial);
        launcher.position.set(0.6, -0.2, 0);
        launcher.rotation.z = Math.PI / 2;
        group.add(launcher);

        group.traverse((child) => {
            if (child.isMesh) {
                child.userData.owner = this;
                child.castShadow = true;
            }
        });

        return group;
    }

    select() {
        this.selected = true;
        this.selectionIndicator.visible = true;
    }

    deselect() {
        this.selected = false;
        this.selectionIndicator.visible = false;
    }

    setPath(path) {
        if (this.isStuckOnDepot) return;
        if (path && path.length > 0) {
            this.path = path;
            this.currentWaypointIndex = 0;
            this.state = 'moving';
        } else {
            this.path = [];
            this.state = 'idle';
        }
    }

    update(delta, pathfinder, gameState, buildings, scene) {
        if (this.isStuckOnDepot) {
            this.state = 'idle';
            this.path = [];
            return;
        }

        if (this.state === 'moving') {
            this.updateMovement(delta, scene, () => { this.state = 'idle'; });
        } else {
             // Stop bobbing animation if idle
            if (this.driveTime !== 0) {
                 this.mesh.position.y = this.baseY;
                 this.driveTime = 0;
            }
        }
    }

    updateMovement(delta, scene, onPathComplete) {
        if (!this.path || this.path.length === 0 || this.currentWaypointIndex >= this.path.length) {
            if (onPathComplete) onPathComplete();
            return;
        }

        const targetPosition = this.path[this.currentWaypointIndex].clone();
        const targetY = getTerrainHeight(scene, targetPosition.x, targetPosition.z);
        targetPosition.y = targetY + 0.3;
        this.baseY = getTerrainHeight(scene, this.mesh.position.x, this.mesh.position.z) + 0.3;

        const currentPos2D = new THREE.Vector2(this.mesh.position.x, this.mesh.position.z);
        const targetPos2D = new THREE.Vector2(targetPosition.x, targetPosition.z);
        const distance = currentPos2D.distanceTo(targetPos2D);

        if (distance < 0.2) {
            this.currentWaypointIndex++;
        } else {
            const direction = targetPosition.clone().sub(this.mesh.position);
            direction.normalize();

            const moveDistance = this.speed * delta;
            const moveVector = direction.clone().multiplyScalar(moveDistance);

            if (moveVector.length() > distance) {
                moveVector.setLength(distance);
            }

            this.mesh.position.add(moveVector);

            const lookAtTarget = new THREE.Vector3(targetPosition.x, this.mesh.position.y, targetPosition.z);
            this.mesh.lookAt(lookAtTarget);

            // Bobbing animation
            this.driveTime += delta;
            this.mesh.position.y = this.baseY + Math.sin(this.driveTime * this.driveFrequency) * this.driveAmplitude;
        }
        
        if (this.currentWaypointIndex >= this.path.length) {
            this.path = [];
            this.mesh.position.y = this.baseY;
            this.driveTime = 0;
            if (onPathComplete) onPathComplete();
        }
    }
}