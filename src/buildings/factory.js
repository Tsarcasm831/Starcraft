import * as THREE from 'three';
import { FlyingBuildingBehavior } from './flying-building-behavior.js';

export class Factory {
    constructor(position, { isUnderConstruction = false, buildTime = 50.4, onStateChange = () => {} } = {}) {
        this.name = 'Factory';
        this.portraitUrl = 'assets/images/factory_portrait.png';
        this.maxHealth = 1250;
        this.currentHealth = isUnderConstruction ? 1 : this.maxHealth;
        this.selected = false;
        this.isUnderConstruction = isUnderConstruction;
        this.buildTime = buildTime;
        this.onStateChange = onStateChange;

        // Behaviors
        this.flyingBehavior = new FlyingBuildingBehavior(this, {
            onStateChange: this.onStateChange,
        });

        this._commands = [];
        this.buildQueue = [];
        this.rallyPoint = new THREE.Vector3(position.x - 6, 0, position.z);
        this.hasArmory = undefined;

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
        this.groundCollider = new THREE.Box3(
            new THREE.Vector3(-buildingWidth / 2, 0, -buildingDepth / 2),
            new THREE.Vector3(buildingWidth / 2, buildingHeight, buildingDepth / 2)
        );
        this.groundCollider.translate(this.mesh.position);
    }

    get state() {
        return this.flyingBehavior.state;
    }
    set state(newState) {
        this.flyingBehavior.state = newState;
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

        if (this.state === 'grounded') {
            newCommands[0] = {
                command: 'train_vulture',
                hotkey: 'V',
                icon: 'assets/images/train_vulture_icon.png',
                name: 'Build Vulture',
                cost: { minerals: 75, supply: 2 },
                buildTime: 25.2
            };
            newCommands[1] = {
                command: 'train_siege_tank',
                hotkey: 'T',
                icon: 'assets/images/train_siege_tank_icon.png',
                name: 'Build Siege Tank',
                cost: { minerals: 150, vespene: 100, supply: 2 },
                buildTime: 50
            };
            if (gameState.armoryBuilt) {
                newCommands[2] = {
                    command: 'train_goliath',
                    hotkey: 'G',
                    icon: 'assets/images/train_goliath_icon.png',
                    name: 'Build Goliath',
                    cost: { minerals: 100, vespene: 50, supply: 2 },
                    buildTime: 40
                };
            }
            
            if (!gameState.upgrades.siegeModeResearched) {
                newCommands[5] = {
                    command: 'research_siege_mode',
                    hotkey: 'S',
                    icon: 'assets/images/research_siege_mode_icon.png',
                    name: 'Research Siege Mode',
                    cost: { minerals: 150, vespene: 150 },
                    researchTime: 80,
                };
            }
            
            newCommands[8] = {
                command: 'lift_off',
                hotkey: 'L',
                icon: 'assets/images/lift_off_icon.png',
                name: 'Lift Off'
            };
        } else if (this.state === 'flying') {
            newCommands[0] = { command: 'move', hotkey: 'M', icon: 'assets/images/move_icon.png', name: 'Move' };
            newCommands[8] = {
                command: 'land_factory',
                hotkey: 'L',
                icon: 'assets/images/lower_depot_icon.png',
                name: 'Land',
                cost: {}, // for placement system
            };
        }

        this.commands = newCommands;
    }

    onConstructionComplete(gameState) {
        this.isUnderConstruction = false;
        this.currentHealth = this.maxHealth;
        gameState.factoryBuilt = true;
        if (typeof gameState.onFactoryBuilt === 'function') {
            gameState.onFactoryBuilt();
        }

        this.mesh.scale.y = 1.0;
        this.mesh.traverse(child => {
            if (child.isMesh && child.material.transparent === true) {
                child.material.opacity = 1.0;
                child.material.transparent = false;
            }
        });
        this.updateCommands(gameState);
    }

    getCollider() {
        const flyingCollider = this.flyingBehavior.getCollider();
        if (flyingCollider.isEmpty()) {
            return flyingCollider;
        }
        return this.groundCollider;
    }
    select() { this.selected = true; this.selectionIndicator.visible = true; }
    deselect() { this.selected = false; this.selectionIndicator.visible = false; }

    setPath(path) {
        this.flyingBehavior.setPath(path);
    }

    landAt(position, pathfinder) {
        this.flyingBehavior.landAt(position, pathfinder);
    }

    executeCommand(commandName, gameState, statusCallback) {
        const command = this.commands.find(c => c && c.command === commandName);
        if (!command) return;

        if (commandName.startsWith('train_')) {
            if (this.state !== 'grounded') {
                statusCallback("Must be landed to train units.");
                return;
            }
            if (this.buildQueue.length >= 5) {
                statusCallback("Build queue is full.");
                return;
            }
            if (gameState.minerals < command.cost.minerals) {
                statusCallback("Not enough minerals.");
                return;
            }
            if (command.cost.vespene && gameState.vespene < command.cost.vespene) {
                statusCallback("Not enough vespene.");
                return;
            }
            if (gameState.supplyUsed + command.cost.supply > gameState.supplyCap) {
                statusCallback("Additional supply required.");
                return;
            }
            
            gameState.minerals -= command.cost.minerals;
            if(command.cost.vespene) gameState.vespene -= command.cost.vespene;

            let unitType = '';
            switch(commandName) {
                case 'train_vulture': unitType = 'Vulture'; break;
                case 'train_siege_tank': unitType = 'Siege Tank'; break;
                case 'train_goliath': unitType = 'Goliath'; break;
            }

            this.buildQueue.push({
                type: unitType,
                progress: 0,
                buildTime: command.buildTime,
                originalCommand: commandName,
            });
            statusCallback(`${unitType} training...`);
            return;
        }

        switch (commandName) {
            case 'research_siege_mode':
                if (this.state !== 'grounded') {
                    statusCallback("Must be landed to research.");
                    return;
                }
                if (this.buildQueue.length > 0) {
                    statusCallback("Already building or researching.");
                    return;
                }
                if (gameState.minerals < command.cost.minerals || (command.cost.vespene && gameState.vespene < command.cost.vespene)) {
                    statusCallback("Not enough resources.");
                    return;
                }

                gameState.minerals -= command.cost.minerals;
                gameState.vespene -= command.cost.vespene;
                this.buildQueue.push({
                    type: 'Research',
                    progress: 0,
                    buildTime: command.buildTime,
                    originalCommand: commandName,
                });
                statusCallback("Researching Siege Mode...");
                break;
            case 'lift_off':
                 if (this.flyingBehavior.liftOff()) {
                     statusCallback("Lift-off sequence initiated.");
                 } else {
                     if (this.state !== 'grounded') statusCallback("Already airborne.");
                 }
                break;
        }
    }

    update(delta, gameState, spawnUnitCallback) {
        this.flyingBehavior.update(delta);

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
                if (finishedUnit.type === 'Research') {
                    if (finishedUnit.originalCommand === 'research_siege_mode') {
                        gameState.upgrades.siegeModeResearched = true;
                    }
                } else {
                    spawnUnitCallback(finishedUnit.type, this.rallyPoint.clone());
                }
            }
        }
    }
}