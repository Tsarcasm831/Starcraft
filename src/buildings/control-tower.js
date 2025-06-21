import * as THREE from 'three';

export class ControlTower {
    constructor(position, { isUnderConstruction = false, buildTime = 30, parent = null } = {}) {
        this.name = 'Control Tower';
        this.portraitUrl = 'assets/images/control_tower_portrait.png';
        this.maxHealth = 750;
        this.currentHealth = isUnderConstruction ? 1 : this.maxHealth;
        this.selected = false;
        this.isUnderConstruction = isUnderConstruction;
        this.buildTime = buildTime;
        this.parentBuilding = parent;
        this.isAddon = true;

        this.commands = []; // Research commands

        this.mesh = this.createMesh();
        this.mesh.position.copy(position);

        this.mesh.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                child.userData.owner = this;
            }
        });
        
        const buildingWidth = 4;
        const buildingDepth = 4;
        const buildingHeight = 8;
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
        
        const baseGeo = new THREE.CylinderGeometry(2, 2, 4, 8);
        const base = new THREE.Mesh(baseGeo, mainMaterial);
        base.position.y = 2;
        group.add(base);

        const dishGeo = new THREE.SphereGeometry(2.5, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2.5);
        this.dish = new THREE.Mesh(dishGeo, accentMaterial);
        this.dish.position.y = 5;
        this.dish.rotation.x = -Math.PI / 6;
        group.add(this.dish);
        
        return group;
    }

    getCollider() { return this.collider; }
    
    select() { 
        this.selected = true; 
        if(this.parentBuilding && !this.parentBuilding.selected) this.parentBuilding.select();
    }
    deselect(flag) { 
        this.selected = false;
        if(this.parentBuilding && this.parentBuilding.selected && !flag) this.parentBuilding.deselect(true);
    }
    
    executeCommand(commandName, gameState, statusCallback) {
        // Research logic for flight upgrades will go here
    }

    update(delta) {
        if(this.dish) {
            this.dish.rotation.y += delta * 0.4;
        }
    }
}

