import * as THREE from 'three';
import { getTerrainHeight } from '../utils/terrain.js';

export class SiegeTank {
    constructor(position) {
        this.name = 'Siege Tank';
        this.portraitUrl = 'assets/images/siege_tank_portrait.png';
        this.maxHealth = 150;
        this.currentHealth = 150;
        
        this.mode = 'tank'; // 'tank', 'siege', 'transforming_to_siege', 'transforming_to_tank'
        this.state = 'idle'; // 'idle', 'moving', 'attacking'
        this.animationProgress = 0;
        this.animationDuration = 2.0; // seconds to transform

        this.isGarrisoned = false; // Cannot be garrisoned
        this.isStuckOnDepot = false;
        this.stuckOnDepotInstance = null;

        this._commands = [];

        this.baseY = position.y;
        this.mesh = this.createMesh();
        this.mesh.position.copy(position);

        this.selected = false;
        this.path = [];
        this.currentWaypointIndex = 0;
        this.speed = 3.0;

        // For hover/drive animation
        this.driveTime = 0;
        this.driveFrequency = 15;
        this.driveAmplitude = 0.05;

        const selectionGeometry = new THREE.RingGeometry(2.2, 2.4, 32);
        const selectionMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide });
        this.selectionIndicator = new THREE.Mesh(selectionGeometry, selectionMaterial);
        this.selectionIndicator.rotation.x = -Math.PI / 2;
        this.selectionIndicator.position.y = 0.01;
        this.selectionIndicator.visible = false;
        this.mesh.add(this.selectionIndicator);

        this.collider = new THREE.Box3().setFromObject(this.mesh);
    }
    
    get commands() {
        return this._commands;
    }

    updateCommands(gameState) {
        const newCommands = new Array(12).fill(null);
        if (this.mode === 'tank') {
            newCommands[0] = { command: 'move', hotkey: 'M', icon: 'assets/images/move_icon.png', name: 'Move' };
            newCommands[1] = { command: 'stop', hotkey: 'S', icon: 'assets/images/stop_icon.png', name: 'Stop' };
            newCommands[2] = { command: 'hold', hotkey: 'H', icon: 'assets/images/hold_position_icon.png', name: 'Hold Position' };
            newCommands[3] = { command: 'patrol', hotkey: 'P', icon: 'assets/images/patrol_icon.png', name: 'Patrol' };
            newCommands[4] = { command: 'attack', hotkey: 'A', icon: 'assets/images/attack_icon.png', name: 'Attack' };
            if (gameState.upgrades.siegeModeResearched) {
                newCommands[8] = { command: 'siege_mode', hotkey: 'E', icon: 'assets/images/siege_mode_icon.png', name: 'Siege Mode' };
            }
        } else if (this.mode === 'siege') {
            newCommands[4] = { command: 'attack', hotkey: 'A', icon: 'assets/images/attack_icon.png', name: 'Attack' };
            newCommands[8] = { command: 'tank_mode', hotkey: 'E', icon: 'assets/images/tank_mode_icon.png', name: 'Tank Mode' };
        }
        // No commands while transforming
        this._commands = newCommands;
    }

    createMesh() {
        const group = new THREE.Group();
        const mainMaterial = new THREE.MeshStandardMaterial({ color: 0x6a8aaa, metalness: 0.8, roughness: 0.4 });
        const darkMaterial = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.7, roughness: 0.4 });

        // Body
        const bodyGeo = new THREE.BoxGeometry(2.5, 1, 3.5);
        this.body = new THREE.Mesh(bodyGeo, mainMaterial);
        this.body.position.y = 0.5;
        group.add(this.body);

        // Treads
        const treadGeo = new THREE.BoxGeometry(3, 0.8, 0.8);
        const leftTread = new THREE.Mesh(treadGeo, darkMaterial);
        leftTread.position.set(0, 0.4, 1.5);
        group.add(leftTread);
        const rightTread = leftTread.clone();
        rightTread.position.z = -1.5;
        group.add(rightTread);
        
        // Turret
        this.turret = new THREE.Group();
        const turretBaseGeo = new THREE.CylinderGeometry(1, 1.2, 0.8, 8);
        const turretBase = new THREE.Mesh(turretBaseGeo, mainMaterial);
        this.turret.add(turretBase);

        const cannonGeo = new THREE.CylinderGeometry(0.2, 0.2, 4, 8);
        this.cannon = new THREE.Mesh(cannonGeo, darkMaterial);
        this.cannon.rotation.z = Math.PI / 2;
        this.cannon.position.x = 2;
        this.turret.add(this.cannon);
        
        this.turret.position.y = 1.4;
        group.add(this.turret);
        
        // Siege mode parts
        this.siegeParts = new THREE.Group();
        const legGeo = new THREE.BoxGeometry(0.4, 1.5, 0.4);
        const leg1 = new THREE.Mesh(legGeo, darkMaterial);
        leg1.position.set(1, -0.75, 1.5);
        this.siegeParts.add(leg1);
        const leg2 = leg1.clone();
        leg2.position.set(-1, -0.75, 1.5);
        this.siegeParts.add(leg2);
        const leg3 = leg1.clone();
        leg3.position.set(1, -0.75, -1.5);
        this.siegeParts.add(leg3);
        const leg4 = leg1.clone();
        leg4.position.set(-1, -0.75, -1.5);
        this.siegeParts.add(leg4);
        
        this.siegeParts.visible = false;
        this.body.add(this.siegeParts);

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
        if (this.mode !== 'tank' || this.isStuckOnDepot) return;
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
        if (commandName === 'siege_mode' && this.mode === 'tank') {
            if (gameState.upgrades.siegeModeResearched) {
                this.state = 'idle';
                this.path = [];
                this.mode = 'transforming_to_siege';
                this.animationProgress = 0;
            } else {
                statusCallback("Siege Mode must be researched first.");
            }
        } else if (commandName === 'tank_mode' && this.mode === 'siege') {
            this.mode = 'transforming_to_tank';
            this.animationProgress = 0;
        }
    }

    update(delta, pathfinder, gameState, buildings, scene) {
        this.updateCommands(gameState);

        if (this.isStuckOnDepot || this.isGarrisoned) return;

        if (this.mode === 'transforming_to_siege') {
            this.animationProgress += delta / this.animationDuration;
            this.siegeParts.visible = true;
            this.siegeParts.scale.set(1, this.animationProgress, 1);
            this.body.position.y = 0.5 + 0.3 * this.animationProgress;
            if (this.animationProgress >= 1) {
                this.mode = 'siege';
                this.body.position.y = 0.8;
            }
        } else if (this.mode === 'transforming_to_tank') {
            this.animationProgress += delta / this.animationDuration;
            this.siegeParts.scale.set(1, 1 - this.animationProgress, 1);
            this.body.position.y = 0.8 - 0.3 * this.animationProgress;
            if (this.animationProgress >= 1) {
                this.mode = 'tank';
                this.siegeParts.visible = false;
                this.body.position.y = 0.5;
            }
        }

        if (this.state === 'moving' && this.mode === 'tank') {
            this.updateMovement(delta, scene, () => { this.state = 'idle'; });
        } else if (this.state === 'moving' && this.mode !== 'tank') {
            // Can't move, stop.
            this.state = 'idle';
            this.path = [];
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

        if (distance < 0.2) {
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

            // Bobbing animation for treads
            this.driveTime += delta;
            this.mesh.position.y = this.baseY + Math.abs(Math.sin(this.driveTime * this.driveFrequency) * this.driveAmplitude);
        }
        
        if (this.currentWaypointIndex >= this.path.length) {
            this.path = [];
            this.mesh.position.y = this.baseY;
            this.driveTime = 0;
            if (onPathComplete) onPathComplete();
        }
    }
}