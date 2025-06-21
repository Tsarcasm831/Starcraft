import * as THREE from 'three';
import { assetManager } from '../utils/asset-manager.js';
import { getTerrainHeight } from '../utils/terrain.js';

export class Goliath {
    constructor(position) {
        this.name = 'Goliath';
        this.portraitUrl = 'assets/images/goliath_portrait.png';
        this.maxHealth = 125;
        this.currentHealth = 125;
        
        this.isGarrisoned = false;
        this.isStuckOnDepot = false;
        this.stuckOnDepotInstance = null;
        this.state = 'idle'; // idle, moving, attacking

        this.commands = [
            { command: 'move', hotkey: 'M', icon: 'assets/images/move_icon.png', name: 'Move' },
            { command: 'stop', hotkey: 'S', icon: 'assets/images/stop_icon.png', name: 'Stop' },
            { command: 'hold', hotkey: 'H', icon: 'assets/images/hold_position_icon.png', name: 'Hold Position' },
            { command: 'patrol', hotkey: 'P', icon: 'assets/images/patrol_icon.png', name: 'Patrol' },
            { command: 'attack', hotkey: 'A', icon: 'assets/images/attack_icon.png', name: 'Attack' },
        ];

        this.baseY = position.y;
        
        try {
            const asset = assetManager.get('goliath');
            this.mesh = this.createMeshFromGLB(asset);
        } catch (error) {
            this.mesh = this.createProceduralMesh();
        }

        this.mesh.position.copy(position);

        this.selected = false;
        this.path = [];
        this.currentWaypointIndex = 0;
        this.speed = 3.8; // Medium speed

        // For walk animation
        this.walkTime = 0;
        this.walkFrequency = 12;
        this.walkAmplitude = 0.1;

        const selectionGeometry = new THREE.RingGeometry(1.2, 1.4, 32);
        const selectionMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide });
        this.selectionIndicator = new THREE.Mesh(selectionGeometry, selectionMaterial);
        this.selectionIndicator.rotation.x = -Math.PI / 2;
        this.selectionIndicator.position.y = 0.01;
        this.selectionIndicator.visible = false;
        this.mesh.add(this.selectionIndicator);

        this.collider = new THREE.Box3().setFromObject(this.mesh);
    }
    
    createMeshFromGLB(asset) {
        const model = asset.scene.clone();

        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const desiredSize = 2.5; // Goliaths are tall
        const maxDim = Math.max(size.x, size.y, size.z);
        
        if (maxDim > 0) {
            const scale = desiredSize / maxDim;
            model.scale.set(scale, scale, scale);
        }

        const scaledBox = new THREE.Box3().setFromObject(model);
        model.position.y = -scaledBox.min.y;

        model.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.userData.owner = this;
            }
        });
        
        return model;
    }
    
    createProceduralMesh() {
        const group = new THREE.Group();
        const mainMaterial = new THREE.MeshStandardMaterial({ color: 0x6a8aaa, metalness: 0.8, roughness: 0.4 });
        const darkMaterial = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.7, roughness: 0.4 });

        // Cockpit / Torso
        const torsoGeo = new THREE.BoxGeometry(1.2, 1.2, 1);
        const torso = new THREE.Mesh(torsoGeo, mainMaterial);
        torso.position.y = 1.6;
        group.add(torso);

        // Legs
        const legGeo = new THREE.BoxGeometry(0.4, 1.0, 0.4);
        const leftLeg = new THREE.Mesh(legGeo, darkMaterial);
        leftLeg.position.set(-0.4, 1.0, 0);
        group.add(leftLeg);
        const rightLeg = leftLeg.clone();
        rightLeg.position.x = 0.4;
        group.add(rightLeg);
        
        const footGeo = new THREE.BoxGeometry(0.6, 0.2, 0.8);
        const leftFoot = new THREE.Mesh(footGeo, darkMaterial);
        leftFoot.position.set(-0.4, 0.1, 0.2);
        group.add(leftFoot);
        const rightFoot = leftFoot.clone();
        rightFoot.position.x = 0.4;
        group.add(rightFoot);

        // Arms (autocannons)
        const armGeo = new THREE.BoxGeometry(0.3, 0.3, 1.5);
        const leftArm = new THREE.Mesh(armGeo, darkMaterial);
        leftArm.position.set(-0.8, 1.6, 0.5);
        group.add(leftArm);
        const rightArm = leftArm.clone();
        rightArm.position.x = 0.8;
        group.add(rightArm);
        
        // Missile pods
        const podGeo = new THREE.BoxGeometry(0.8, 0.4, 0.4);
        const missilePod = new THREE.Mesh(podGeo, mainMaterial);
        missilePod.position.set(0, 2.4, 0);
        group.add(missilePod);

        group.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.userData.owner = this;
            }
        });

        group.scale.set(0.9, 0.9, 0.9);

        return group;
    }

    select() { this.selected = true; this.selectionIndicator.visible = true; }
    deselect() { this.selected = false; this.selectionIndicator.visible = false; }

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
    
    executeCommand(commandName, gameState, statusCallback) {
        // No special commands for Goliath yet.
    }

    update(delta, pathfinder, gameState, buildings, scene) {
        if (this.isStuckOnDepot || this.isGarrisoned) return;

        if (this.state === 'moving') {
            this.updateMovement(delta, scene, () => { this.state = 'idle'; });
        } else {
            // Stop bobbing animation if idle
            if (this.walkTime !== 0) {
                 this.mesh.position.y = this.baseY;
                 this.walkTime = 0;
            }
        }
    }

    updateMovement(delta, scene, onPathComplete) {
        if (!this.path || this.path.length === 0 || this.currentWaypointIndex >= this.path.length) {
            if (onPathComplete) onPathComplete();
            return;
        }

        const targetPosition = this.path[this.currentWaypointIndex];
        const targetY = getTerrainHeight(scene, targetPosition.x, targetPosition.z);
        targetPosition.y = targetY;
        this.baseY = getTerrainHeight(scene, this.mesh.position.x, this.mesh.position.z);

        const currentPos2D = new THREE.Vector2(this.mesh.position.x, this.mesh.position.z);
        const targetPos2D = new THREE.Vector2(targetPosition.x, targetPosition.z);
        const distance = currentPos2D.distanceTo(targetPos2D);

        if (distance < 0.1) {
            this.currentWaypointIndex++;
        } else {
            const direction = targetPosition.clone().sub(this.mesh.position);
            direction.y = 0;
            direction.normalize();

            const moveDistance = this.speed * delta;
            const moveVector = direction.clone().multiplyScalar(moveDistance);

            if (moveVector.length() > distance) {
                moveVector.setLength(distance);
            }

            this.mesh.position.add(moveVector);

            const lookAtTarget = new THREE.Vector3(targetPosition.x, this.mesh.position.y, targetPosition.z);
            this.mesh.lookAt(lookAtTarget);

            // Walking animation
            this.walkTime += delta;
            this.mesh.position.y = this.baseY + Math.abs(Math.sin(this.walkTime * this.walkFrequency) * this.walkAmplitude);
        }
        
        if (this.currentWaypointIndex >= this.path.length) {
            this.path = [];
            this.mesh.position.y = this.baseY;
            this.walkTime = 0;
            if (onPathComplete) onPathComplete();
        }
    }
}