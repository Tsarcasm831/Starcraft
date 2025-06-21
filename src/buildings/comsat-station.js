import * as THREE from 'three';
import { createScannerSweep } from '../game/effects.js';
import { getGroundMeshes } from '../utils/terrain.js';

export class ComsatStation {
    constructor(position, { isUnderConstruction = false, buildTime = 25.2, parent = null } = {}) {
        this.name = 'Comsat Station';
        this.portraitUrl = 'assets/images/comsat_station_portrait.png';
        this.maxHealth = 500;
        this.currentHealth = isUnderConstruction ? 1 : this.maxHealth;
        this.selected = false;
        this.isUnderConstruction = isUnderConstruction;
        this.buildTime = buildTime;
        this.parentBuilding = parent;

        this.energy = 50;
        this.maxEnergy = 200;
        this.isAddon = true;

        // Commands will be merged by the parent Command Center
        this.commands = [
            null, // Placeholder for alignment
            null,
            null,
            {
                command: 'scanner_sweep',
                hotkey: 'S',
                icon: 'assets/images/scanner_sweep_icon.png',
                name: 'Scanner Sweep',
                cost: { energy: 50 }
            }
        ];

        this.mesh = this.createMesh();
        this.mesh.position.copy(position);

        this.mesh.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                child.userData.owner = this;
            }
        });

        const buildingWidth = 5;
        const buildingDepth = 5;
        const buildingHeight = 7;
        this.collider = new THREE.Box3(
            new THREE.Vector3(-buildingWidth / 2, 0, -buildingDepth / 2),
            new THREE.Vector3(buildingWidth / 2, buildingHeight, buildingDepth / 2)
        );
        this.collider.translate(this.mesh.position);
    }

    createMesh() {
        const group = new THREE.Group();
        const mainMaterial = new THREE.MeshStandardMaterial({ color: 0x7a8a9a, metalness: 0.7, roughness: 0.6 });
        const accentMaterial = new THREE.MeshStandardMaterial({ color: 0x4a5a6a, metalness: 0.8, roughness: 0.5 });

        const baseGeo = new THREE.BoxGeometry(4, 2, 4);
        const base = new THREE.Mesh(baseGeo, mainMaterial);
        base.position.y = 1.0;
        group.add(base);

        const supportGeo = new THREE.CylinderGeometry(0.5, 0.5, 1.0, 8);
        const support = new THREE.Mesh(supportGeo, accentMaterial);
        support.position.y = 2.5;
        group.add(support);
        
        const dishGeo = new THREE.SphereGeometry(2, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2.5);
        this.dish = new THREE.Mesh(dishGeo, mainMaterial);
        this.dish.position.y = 3.0;
        this.dish.rotation.x = -Math.PI / 5;
        group.add(this.dish);

        return group;
    }
    
    getCollider() { return this.collider; }
    
    select() { 
        this.selected = true; 
        if(this.parentBuilding && !this.parentBuilding.selected) this.parentBuilding.select();
    }
    deselect() { 
        this.selected = false;
        if(this.parentBuilding && this.parentBuilding.selected) this.parentBuilding.deselect(true); // pass flag to avoid feedback loop
    }
    
    executeCommand(commandName, gameState, statusCallback) {
        if (commandName === 'scanner_sweep') {
            const cost = 50;
            if (this.energy < cost) {
                statusCallback('Not enough energy.');
                return true;
            }

            const scene = window.gameScene;
            const camera = window.gameCamera;
            if (!scene || !camera) {
                statusCallback('Scanner unavailable.');
                return true;
            }

            const groundMeshes = getGroundMeshes(scene);
            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
            const intersects = raycaster.intersectObjects(groundMeshes, true);

            if (intersects.length > 0) {
                this.energy -= cost;
                createScannerSweep(intersects[0].point);
                statusCallback('Scanner Sweep activated.');
            } else {
                statusCallback('No valid target.');
            }
            return true;
        }
        return false; // Command was not handled
    }

    update(delta) {
        // Regenerate energy
        if (this.energy < this.maxEnergy) {
            this.energy += 0.5625 * delta;
        }
        if (this.energy > this.maxEnergy) {
            this.energy = this.maxEnergy;
        }

        if (this.dish) {
            this.dish.rotation.y += delta * 0.4;
        }
    }
}