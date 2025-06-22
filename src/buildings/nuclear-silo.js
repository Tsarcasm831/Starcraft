import * as THREE from 'three';

export class NuclearSilo {
    constructor(position, { isUnderConstruction = false, buildTime = 50.4, parent = null } = {}) {
        this.name = 'Nuclear Silo';
        this.portraitUrl = 'assets/images/nuclear_silo_portrait.png';
        this.maxHealth = 1000;
        this.currentHealth = isUnderConstruction ? 1 : this.maxHealth;
        this.selected = false;
        this.isUnderConstruction = isUnderConstruction;
        this.buildTime = buildTime;
        this.parentBuilding = parent;
        this.isAddon = true;

        this.hasNuke = false;
        this.isArming = false;
        this.armingProgress = 0;
        this.armingTime = 60;

        this.commands = [
            null, // Placeholder for alignment
            null,
            null,
            {
                command: 'arm_nuke',
                hotkey: 'N',
                icon: 'assets/images/arm_nuke_icon.png',
                name: 'Arm Nuke',
                cost: { minerals: 200, vespene: 200, supply: 8 },
                buildTime: this.armingTime
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
        const darkMaterial = new THREE.MeshStandardMaterial({ color: 0x3a4a5a, metalness: 0.8, roughness: 0.5 });
        
        const baseGeo = new THREE.BoxGeometry(5, 7, 5);
        const base = new THREE.Mesh(baseGeo, mainMaterial);
        base.position.y = 3.5;
        group.add(base);

        const hatchGeo = new THREE.CylinderGeometry(1.5, 1.5, 0.5, 16);
        const hatch = new THREE.Mesh(hatchGeo, darkMaterial);
        hatch.position.y = 7.25;
        group.add(hatch);
        
        return group;
    }

    getCollider() { return this.collider; }
    
    select() { 
        this.selected = true; 
        if(this.parentBuilding && !this.parentBuilding.selected) this.parentBuilding.select();
    }
    deselect(flag) { 
        this.selected = false;
        if(this.parentBuilding && this.parentBuilding.selected && !flag) this.parentBuilding.deselect(true); // pass flag to avoid feedback loop
    }
    
    executeCommand(commandName, gameState, statusCallback) {
        if (commandName === 'arm_nuke') {
            const command = this.commands.find(c => c && c.command === 'arm_nuke');
            if (this.hasNuke) {
                statusCallback('Silo already loaded.');
                return;
            }
            if (this.isArming) {
                statusCallback('Nuke is already being armed.');
                return;
            }
            if (gameState.minerals < command.cost.minerals) {
                statusCallback('Not enough minerals.');
                return;
            }
            if (gameState.vespene < command.cost.vespene) {
                statusCallback('Not enough vespene.');
                return;
            }
            if (gameState.supplyUsed + command.cost.supply > gameState.supplyCap) {
                statusCallback('Additional supply required.');
                return;
            }

            gameState.minerals -= command.cost.minerals;
            gameState.vespene -= command.cost.vespene;
            this.isArming = true;
            this.armingProgress = 0;
            this.pendingSupplyCost = command.cost.supply;
            statusCallback('Arming nuclear missile...');
        }
    }

    update(delta, gameState) {
        if (this.isUnderConstruction) {
            const buildProgress = Math.max(0.01, this.currentHealth / this.maxHealth);
            this.mesh.scale.y = buildProgress;
            return;
        }

        if (this.isArming) {
            this.armingProgress += delta;
            if (this.armingProgress >= this.armingTime) {
                this.isArming = false;
                this.hasNuke = true;
                this.armingProgress = 0;
                if (gameState && typeof this.pendingSupplyCost === 'number') {
                    gameState.supplyUsed += this.pendingSupplyCost;
                    this.pendingSupplyCost = 0;
                }
            }
        }
    }
}