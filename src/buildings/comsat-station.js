import * as THREE from 'three';

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

        const baseGeo = new THREE.BoxGeometry(5, 2.5, 5);
        const base = new THREE.Mesh(baseGeo, mainMaterial);
        base.position.y = 1.25;
        group.add(base);

        const supportGeo = new THREE.CylinderGeometry(0.7, 0.7, 1.5, 8);
        const support = new THREE.Mesh(supportGeo, accentMaterial);
        support.position.y = 3.25;
        group.add(support);
        
        const dishGeo = new THREE.SphereGeometry(3, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2.5);
        const dish = new THREE.Mesh(dishGeo, mainMaterial);
        dish.position.y = 4;
        dish.rotation.x = -Math.PI / 5;
        group.add(dish);

        return group;
    }
    
    getCollider() { return this.collider; }
    
    select() { 
        this.selected = true; 
        if(this.parentBuilding && !this.parentBuilding.selected) this.parentBuilding.select();
    }
    deselect(calledByAddon = false) { 
        this.selected = false;
        if(this.parentBuilding && this.parentBuilding.selected && !calledByAddon) this.parentBuilding.deselect(true);
    }
    
    executeCommand(commandName, gameState, statusCallback) {
        if (commandName === 'scanner_sweep') {
            statusCallback("Scanner Sweep not yet implemented.");
        }
    }

    update(delta) {
        // Regenerate energy
        if (this.energy < this.maxEnergy) {
            this.energy += 0.5625 * delta;
        }
        if (this.energy > this.maxEnergy) {
            this.energy = this.maxEnergy;
        }
    }
}

