import * as THREE from 'three';

export class Factory {
    constructor(position, { isUnderConstruction = false, buildTime = 50.4 } = {}) {
        this.name = 'Factory';
        this.portraitUrl = 'assets/images/factory_portrait.png';
        this.maxHealth = 1250;
        this.currentHealth = isUnderConstruction ? 1 : this.maxHealth;
        this.selected = false;
        this.isUnderConstruction = isUnderConstruction;
        this.buildTime = buildTime;
        this.state = 'grounded';

        this._commands = [];
        this.buildQueue = [];
        this.rallyPoint = new THREE.Vector3(position.x - 6, 0, position.z);

        this.mesh = this.createMesh();
        this.mesh.position.copy(position);

        this.mesh.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                child.userData.owner = this;
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

        const selectionGeometry = new THREE.RingGeometry(4.5, 4.7, 64);
        const selectionMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide });
        this.selectionIndicator = new THREE.Mesh(selectionGeometry, selectionMaterial);
        this.selectionIndicator.rotation.x = -Math.PI / 2;
        this.selectionIndicator.position.y = 0.01;
        this.selectionIndicator.visible = false;
        this.mesh.add(this.selectionIndicator);

        const buildingWidth = 8;
        const buildingDepth = 6;
        const buildingHeight = 6;
        this.collider = new THREE.Box3(
            new THREE.Vector3(-buildingWidth / 2, 0, -buildingDepth / 2),
            new THREE.Vector3(buildingWidth / 2, buildingHeight, buildingDepth / 2)
        );
        this.collider.translate(this.mesh.position);
    }

    get commands() {
        return this._commands;
    }
    set commands(newCommands) {
        this._commands = newCommands;
    }

    createMesh() {
        const group = new THREE.Group();
        const mainMaterial = new THREE.MeshStandardMaterial({ color: 0x7a8a9a, metalness: 0.7, roughness: 0.6 });
        const accentMaterial = new THREE.MeshStandardMaterial({ color: 0x4a5a6a, metalness: 0.8, roughness: 0.5 });
        const doorMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });

        const baseGeo = new THREE.BoxGeometry(8, 4, 6);
        const base = new THREE.Mesh(baseGeo, mainMaterial);
        base.position.y = 2;
        group.add(base);

        const doorGeo = new THREE.BoxGeometry(4, 3, 0.2);
        const door = new THREE.Mesh(doorGeo, doorMaterial);
        door.position.set(0, 1.5, 3.05);
        group.add(door);

        const smokestackGeo = new THREE.CylinderGeometry(0.5, 0.5, 2, 8);
        const smokestack1 = new THREE.Mesh(smokestackGeo, accentMaterial);
        smokestack1.position.set(-3, 5, -2);
        group.add(smokestack1);

        const smokestack2 = smokestack1.clone();
        smokestack2.position.set(-3, 5, 2);
        group.add(smokestack2);

        return group;
    }

    updateCommands(gameState) {
        if (this.isUnderConstruction) {
            this.commands = [];
            return;
        }

        const newCommands = new Array(12).fill(null);
        newCommands[0] = {
            command: 'train_vulture',
            hotkey: 'V',
            icon: 'assets/images/train_vulture_icon.png',
            name: 'Build Vulture',
            cost: { minerals: 75, supply: 2 },
            buildTime: 25.2
        };
        // Placeholders for other units
        // newCommands[1] = { command: 'train_siege_tank', ... };
        // newCommands[2] = { command: 'train_goliath', ... };
        
        newCommands[8] = {
            command: 'lift_off',
            hotkey: 'L',
            icon: 'assets/images/lift_off_icon.png',
            name: 'Lift Off'
        };

        this.commands = newCommands;
    }

    onConstructionComplete(gameState) {
        this.isUnderConstruction = false;
        this.currentHealth = this.maxHealth;
        gameState.factoryBuilt = true;

        this.mesh.scale.y = 1.0;
        this.mesh.traverse(child => {
            if (child.isMesh && child.material.transparent === true) {
                child.material.opacity = 1.0;
                child.material.transparent = false;
            }
        });
        this.updateCommands(gameState);
    }

    getCollider() { return this.collider; }
    select() { this.selected = true; this.selectionIndicator.visible = true; }
    deselect() { this.selected = false; this.selectionIndicator.visible = false; }

    executeCommand(commandName, gameState, statusCallback) {
        const command = this.commands.find(c => c && c.command === commandName);
        if (!command) return;

        switch (commandName) {
            case 'train_vulture':
                if (this.buildQueue.length >= 5) {
                    statusCallback("Build queue is full.");
                    return;
                }
                if (gameState.minerals < command.cost.minerals) {
                    statusCallback("Not enough minerals.");
                    return;
                }
                if (gameState.supplyUsed + command.cost.supply > gameState.supplyCap) {
                    statusCallback("Additional supply required.");
                    return;
                }
                
                gameState.minerals -= command.cost.minerals;
                this.buildQueue.push({
                    type: 'Vulture',
                    progress: 0,
                    buildTime: command.buildTime,
                    cost: command.cost,
                    originalCommand: commandName,
                });
                statusCallback("Vulture training...");
                break;
            case 'lift_off':
                statusCallback("Lift-off sequence not yet available.");
                break;
        }
    }

    update(delta, gameState, spawnUnitCallback) {
        if (this.isUnderConstruction) {
            const buildProgress = Math.max(0.01, this.currentHealth / this.maxHealth);
            this.mesh.scale.y = buildProgress;
            return;
        }

        // Only update commands if needed.
        if (this.commands.length === 0 && !this.isUnderConstruction) {
            this.updateCommands(gameState);
        }

        if (this.buildQueue.length > 0) {
            const trainingUnit = this.buildQueue[0];
            trainingUnit.progress += delta;
            if (trainingUnit.progress >= trainingUnit.buildTime) {
                const finishedUnit = this.buildQueue.shift();
                spawnUnitCallback(finishedUnit.type, this.rallyPoint.clone());
            }
        }
    }
}