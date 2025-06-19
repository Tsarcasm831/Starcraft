import * as THREE from 'three';

export class Bunker {
    constructor(position, { isUnderConstruction = false, buildTime = 18.9 } = {}) {
        // UI and game properties
        this.name = 'Bunker';
        this.portraitUrl = 'assets/images/bunker_portrait.png';
        this.maxHealth = 400;
        this.currentHealth = isUnderConstruction ? 1 : this.maxHealth;
        this.selected = false;
        this.isUnderConstruction = isUnderConstruction;
        this.buildTime = buildTime;
        
        // Garrison properties
        this.garrisonedUnits = [];
        this.capacity = 4;

        this.mesh = this.createMesh();
        this.mesh.position.copy(position);

        this.mesh.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                child.userData.owner = this; // Link mesh to this instance
            }
        });

        if (this.isUnderConstruction) {
            this.mesh.scale.y = 0.01;
            this.mesh.traverse(child => {
                if (child.isMesh) {
                    child.material = child.material.clone();
                    child.material.transparent = true;
                    child.material.opacity = 0.5;
                }
            });
        }

        // The selection indicator on the ground
        const selectionGeometry = new THREE.RingGeometry(2.5, 2.7, 64);
        const selectionMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide });
        this.selectionIndicator = new THREE.Mesh(selectionGeometry, selectionMaterial);
        this.selectionIndicator.rotation.x = -Math.PI / 2;
        this.selectionIndicator.position.y = 0.01;
        this.selectionIndicator.visible = false;
        this.mesh.add(this.selectionIndicator);
        
        // Manually define collider box
        const buildingWidth = 4;
        const buildingDepth = 4;
        const buildingHeight = 3;
        this.collider = new THREE.Box3(
            new THREE.Vector3(-buildingWidth / 2, 0, -buildingDepth / 2),
            new THREE.Vector3(buildingWidth / 2, buildingHeight, buildingDepth / 2)
        );
        this.collider.translate(this.mesh.position);
    }
    
    get commands() {
        const commandList = new Array(12).fill(null);
        if (this.garrisonedUnits.length > 0) {
            commandList[0] = { 
                command: 'unload_all', 
                hotkey: 'U', 
                icon: 'assets/images/unload_all_icon.png', 
                name: 'Unload All'
            };
        }
        return commandList;
    }

    createMesh() {
        const group = new THREE.Group();
        const mainMaterial = new THREE.MeshStandardMaterial({ color: 0x7a8a9a, metalness: 0.7, roughness: 0.6 });
        const accentMaterial = new THREE.MeshStandardMaterial({ color: 0x4a5a6a, metalness: 0.8, roughness: 0.5 });

        const baseGeo = new THREE.BoxGeometry(4, 2.5, 4);
        const base = new THREE.Mesh(baseGeo, mainMaterial);
        base.position.y = 1.25;
        group.add(base);

        const topGeo = new THREE.BoxGeometry(3, 0.5, 3);
        const top = new THREE.Mesh(topGeo, accentMaterial);
        top.position.y = 2.75;
        group.add(top);

        const slitGeo = new THREE.BoxGeometry(3.2, 0.2, 0.2);
        const slitMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
        const frontSlit = new THREE.Mesh(slitGeo, slitMaterial);
        frontSlit.position.set(0, 1.5, 1.9);
        group.add(frontSlit);
        
        const backSlit = frontSlit.clone();
        backSlit.position.z = -1.9;
        group.add(backSlit);
        
        const leftSlit = frontSlit.clone();
        leftSlit.rotation.y = Math.PI / 2;
        leftSlit.position.set(-1.9, 1.5, 0);
        group.add(leftSlit);
        
        const rightSlit = leftSlit.clone();
        rightSlit.position.x = 1.9;
        group.add(rightSlit);

        return group;
    }

    onConstructionComplete(gameState) {
        this.isUnderConstruction = false;
        this.currentHealth = this.maxHealth;
        this.mesh.scale.y = 1.0;
        
        this.mesh.traverse(child => {
            if (child.isMesh && child.material.transparent === true) {
                child.material.opacity = 1.0;
                child.material.transparent = false;
            }
        });
    }

    getCollider() { return this.collider; }
    select() { this.selected = true; this.selectionIndicator.visible = true; }
    deselect() { this.selected = false; this.selectionIndicator.visible = false; }
    
    executeCommand(commandName, gameState, statusCallback) {
        switch (commandName) {
            case 'unload_all':
                this.unloadAll();
                statusCallback("Units unloaded.");
                break;
        }
    }

    addUnit(unit) {
        if (this.garrisonedUnits.length >= this.capacity) {
            return false; // Bunker is full
        }
        this.garrisonedUnits.push(unit);
        unit.isGarrisoned = true;
        unit.mesh.visible = false;
        unit.deselect(); // Cannot have a selected unit that is garrisoned
        return true;
    }

    getSpawnPoints() {
        const points = [];
        const radius = 3; // How far from the center units spawn
        const count = this.garrisonedUnits.length > 0 ? this.garrisonedUnits.length : 1;
        for (let i = 0; i < this.garrisonedUnits.length; i++) {
            const angle = (i / count) * Math.PI * 2;
            points.push(
                this.mesh.position.clone().add(new THREE.Vector3(radius * Math.cos(angle), 0, radius * Math.sin(angle)))
            );
        }
        return points;
    }

    unloadAll() {
        const spawnPoints = this.getSpawnPoints();
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

    update(delta, gameState) {
        if (this.isUnderConstruction) {
            const buildProgress = Math.max(0.01, this.currentHealth / this.maxHealth);
            this.mesh.scale.y = buildProgress;
        }
    }
}