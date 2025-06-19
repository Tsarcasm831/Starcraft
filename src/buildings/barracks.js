import * as THREE from 'three';
import { Unit } from '../units/unit.js';

export class Barracks {
    constructor(position, { isUnderConstruction = false, buildTime = 50.4 } = {}) {
        // UI and game properties
        this.name = 'Barracks';
        this.portraitUrl = 'assets/images/barracks_portrait.png';
        this.maxHealth = 1000;
        this.currentHealth = isUnderConstruction ? 1 : this.maxHealth;
        this.selected = false;
        this.isUnderConstruction = isUnderConstruction;
        this.buildTime = buildTime;
        this.state = 'grounded'; // grounded, lifting, flying, landing

        // Command Card definition
        this._commands = [];
        this.hasAcademy = undefined;

        this.buildQueue = [];
        this.rallyPoint = new THREE.Vector3(position.x - 5, 0, position.z); // Default rally point

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
        const selectionGeometry = new THREE.RingGeometry(4, 4.2, 64);
        const selectionMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide });
        this.selectionIndicator = new THREE.Mesh(selectionGeometry, selectionMaterial);
        this.selectionIndicator.rotation.x = -Math.PI / 2;
        this.selectionIndicator.position.y = 0.01;
        this.selectionIndicator.visible = false;
        this.mesh.add(this.selectionIndicator);
        
        // Manually define collider box
        const buildingWidth = 7;
        const buildingDepth = 7;
        const buildingHeight = 5;
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

        // Base structure
        const baseGeo = new THREE.BoxGeometry(6, 4, 6);
        const base = new THREE.Mesh(baseGeo, mainMaterial);
        base.position.y = 2;
        group.add(base);

        // Angled side parts
        const sideGeo = new THREE.BoxGeometry(2, 3, 7);
        const leftSide = new THREE.Mesh(sideGeo, accentMaterial);
        leftSide.position.set(-3.5, 1.5, 0);
        leftSide.rotation.z = Math.PI / 8;
        group.add(leftSide);
        
        const rightSide = leftSide.clone();
        rightSide.position.x = 3.5;
        rightSide.rotation.z = -Math.PI / 8;
        group.add(rightSide);

        // Large front door
        const doorGeo = new THREE.BoxGeometry(3, 2.5, 0.2);
        const door = new THREE.Mesh(doorGeo, doorMaterial);
        door.position.set(0, 1.25, 3.05);
        group.add(door);
        
        // Roof details
        const roofDetailGeo = new THREE.BoxGeometry(4, 0.5, 4);
        const roofDetail = new THREE.Mesh(roofDetailGeo, accentMaterial);
        roofDetail.position.y = 4.25;
        group.add(roofDetail);

        return group;
    }

    updateCommands(gameState) {
        // Only update if the academy status has changed, to avoid constant array creation
        if (this.hasAcademy === gameState.academyBuilt && !this.isUnderConstruction) {
            return;
        }
        if (this.isUnderConstruction) return;

        this.hasAcademy = gameState.academyBuilt;

        const newCommands = new Array(12).fill(null);
        newCommands[0] = { 
            command: 'train_marine', 
            hotkey: 'A', 
            icon: 'assets/images/train_marine_icon.png', 
            name: 'Train Marine',
            cost: { minerals: 50, supply: 1 },
            buildTime: 20 // seconds
        };

        if (gameState.academyBuilt) {
            newCommands[1] = {
                command: 'train_firebat',
                hotkey: 'F',
                icon: 'assets/images/train_firebat_icon.png',
                name: 'Train Firebat',
                cost: { minerals: 50, vespene: 25, supply: 1 },
                buildTime: 20
            };
            newCommands[2] = {
                command: 'train_medic',
                hotkey: 'E',
                icon: 'assets/images/train_medic_icon.png',
                name: 'Train Medic',
                cost: { minerals: 50, vespene: 25, supply: 1 },
                buildTime: 25,
            };
        }

        newCommands[8] = {
            command: 'lift_off',
            hotkey: 'L',
            icon: 'assets/images/lift_off_icon.png',
            name: 'Lift Off'
        };

        if (gameState.academyBuilt && gameState.covertOpsBuilt) {
            newCommands[3] = {
                command: 'train_ghost',
                hotkey: 'G',
                icon: 'assets/images/train_ghost_icon.png',
                name: 'Train Ghost',
                cost: { minerals: 25, vespene: 75, supply: 1 },
                buildTime: 50
            };
        }
        
        this.commands = newCommands;
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
        gameState.barracksBuilt = true;
        this.updateCommands(gameState);
    }

    getCollider() {
        return this.collider;
    }

    select() {
        this.selected = true;
        this.selectionIndicator.visible = true;
    }

    deselect() {
        this.selected = false;
        this.selectionIndicator.visible = false;
    }

    executeCommand(commandName, gameState, statusCallback) {
        const command = this.commands.find(c => c && c.command === commandName);
        if (!command) return;

        switch(commandName) {
            case 'train_marine':
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
                    type: 'Marine',
                    progress: 0,
                    buildTime: command.buildTime,
                    originalCommand: commandName,
                });
                statusCallback("Marine training...");
                break;
            case 'train_firebat':
                if (this.buildQueue.length >= 5) {
                    statusCallback("Build queue is full.");
                    return;
                }
                if (gameState.minerals < command.cost.minerals || (command.cost.vespene && gameState.vespene < command.cost.vespene)) {
                    statusCallback("Not enough resources.");
                    return;
                }
                if (gameState.supplyUsed + command.cost.supply > gameState.supplyCap) {
                    statusCallback("Additional supply required.");
                    return;
                }

                gameState.minerals -= command.cost.minerals;
                gameState.vespene -= command.cost.vespene;
                this.buildQueue.push({
                    type: 'Firebat',
                    progress: 0,
                    buildTime: command.buildTime,
                    originalCommand: commandName,
                });
                statusCallback("Firebat training...");
                break;
            case 'train_medic':
                if (this.buildQueue.length >= 5) {
                    statusCallback("Build queue is full.");
                    return;
                }
                if (gameState.minerals < command.cost.minerals || (command.cost.vespene && gameState.vespene < command.cost.vespene)) {
                    statusCallback("Not enough resources.");
                    return;
                }
                if (gameState.supplyUsed + command.cost.supply > gameState.supplyCap) {
                    statusCallback("Additional supply required.");
                    return;
                }

                gameState.minerals -= command.cost.minerals;
                gameState.vespene -= command.cost.vespene;
                this.buildQueue.push({
                    type: 'Medic',
                    progress: 0,
                    buildTime: command.buildTime,
                    originalCommand: commandName,
                });
                statusCallback("Medic training...");
                break;
            case 'train_ghost':
                if (this.buildQueue.length >= 5) {
                    statusCallback("Build queue is full.");
                    return;
                }
                if (gameState.minerals < command.cost.minerals || (command.cost.vespene && gameState.vespene < command.cost.vespene)) {
                    statusCallback("Not enough resources.");
                    return;
                }
                if (gameState.supplyUsed + command.cost.supply > gameState.supplyCap) {
                    statusCallback("Additional supply required.");
                    return;
                }

                gameState.minerals -= command.cost.minerals;
                gameState.vespene -= command.cost.vespene;
                this.buildQueue.push({
                    type: 'Ghost',
                    progress: 0,
                    buildTime: command.buildTime,
                    originalCommand: commandName,
                });
                statusCallback("Ghost training...");
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

        this.updateCommands(gameState);

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