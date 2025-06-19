import * as THREE from 'three';
import { getTerrainHeight } from '../utils/terrain.js';

export class Infantry {
    constructor(position) {
        // Common properties for all infantry units
        this.isGarrisoned = false;
        this.garrisonTarget = null;
        this.isStuckOnDepot = false;
        this.stuckOnDepotInstance = null;
        this.state = 'idle'; // idle, moving, movingToGarrison, attack

        this.baseY = position.y;

        this.selected = false;
        this.path = [];
        this.currentWaypointIndex = 0;
        this.speed = 4; // Default speed, can be overridden by subclass

        // For walk animation
        this.walkTime = 0;
        this.walkFrequency = 15;
        this.walkAmplitude = 0.08;

        // Subclass should define: name, portraitUrl, maxHealth, currentHealth, commands, mesh
    }

    // Called by subclass after mesh is created
    setup(position) {
        this.mesh.position.copy(position);

        // The selection circle on the ground
        const selectionGeometry = new THREE.RingGeometry(0.7, 0.8, 32);
        const selectionMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide });
        this.selectionIndicator = new THREE.Mesh(selectionGeometry, selectionMaterial);
        this.selectionIndicator.rotation.x = -Math.PI / 2;
        this.selectionIndicator.position.y = 0.01;
        this.selectionIndicator.visible = false;
        this.mesh.add(this.selectionIndicator);

        this.collider = new THREE.Box3().setFromObject(this.mesh);
    }
    
    // createMesh() must be implemented by subclass

    select() {
        this.selected = true;
        this.selectionIndicator.visible = true;
    }

    deselect() {
        this.selected = false;
        this.selectionIndicator.visible = false;
    }

    garrison(bunker) {
        if (this.isGarrisoned) return;
        this.state = 'movingToGarrison';
        this.garrisonTarget = bunker;
    }

    setPath(path) {
        if (this.isStuckOnDepot) return;
        if (path && path.length > 0) {
            this.path = path;
            this.currentWaypointIndex = 0;
        } else {
            this.path = [];
        }
    }

    moveTo(position) {
        this.targetPosition = new THREE.Vector3(position.x, this.baseY, position.z);
    }

    update(delta, pathfinder, gameState, buildings, scene) {
        if (this.isStuckOnDepot) {
            this.state = 'idle';
            this.path = [];
            return;
        }

        if (this.isGarrisoned) {
            return; // Don't update if inside a bunker
        }

        switch (this.state) {
            case 'idle':
                // Stop bobbing animation if it exists
                if (this.walkTime !== 0) {
                     this.mesh.position.y = this.baseY;
                     this.walkTime = 0;
                }
                break;
            case 'moving':
                this.updateMovement(delta, scene, () => { this.state = 'idle'; });
                break;
            case 'movingToGarrison':
                if (!this.garrisonTarget) {
                    this.state = 'idle';
                    return;
                }
                this.updateMovement(delta, scene, () => {
                    this.garrisonTarget.addUnit(this);
                    this.garrisonTarget = null;
                    this.state = 'idle';
                });
                break;
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