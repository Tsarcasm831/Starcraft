import * as THREE from 'three';
import { FlyingBuildingBehavior } from './flying-building-behavior.js';
import { AddonBehavior } from './addon-behavior.js';

/** @tweakable Hotkeys for Starport unit training commands */
const starportHotkeys = {
    trainWraith: 'R',
    trainDropship: 'T',
    trainScienceVessel: 'V',
    trainValkyrie: 'Y',
    trainBattlecruiser: 'B',
};

export class Starport {
    constructor(position, { isUnderConstruction = false, buildTime = 50.4, onStateChange = () => {} } = {}) {
        this.name = 'Starport';
        this.portraitUrl = 'assets/images/starport_portrait.png';
        this.maxHealth = 1300;
        this.currentHealth = isUnderConstruction ? 1 : this.maxHealth;
        this.selected = false;
        this.isUnderConstruction = isUnderConstruction;
        this.buildTime = buildTime;
        this.onStateChange = onStateChange;

        // Behaviors
        this.flyingBehavior = new FlyingBuildingBehavior(this, {
            onStateChange: this.onStateChange,
        });
        this.addonBehavior = new AddonBehavior(this);

        this._commands = [];
        this.buildQueue = [];
        this.rallyPoint = new THREE.Vector3(position.x - 7, 0, position.z);
        this.addon = null;
        this.addonToBuild = null;
        this.addonBuildProgress = 0;

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

        const selectionGeometry = new THREE.RingGeometry(5.5, 5.7, 64);
        const selectionMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide });
        this.selectionIndicator = new THREE.Mesh(selectionGeometry, selectionMaterial);
        this.selectionIndicator.rotation.x = -Math.PI / 2;
        this.selectionIndicator.position.y = 0.01;
        this.selectionIndicator.visible = false;
        this.mesh.add(this.selectionIndicator);

        const buildingWidth = 9;
        const buildingDepth = 9;
        const buildingHeight = 7;
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
        const padMaterial = new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.9, roughness: 0.4 });

        const baseGeo = new THREE.CylinderGeometry(4.5, 4.5, 1, 8);
        const base = new THREE.Mesh(baseGeo, mainMaterial);
        base.position.y = 0.5;
        group.add(base);
        
        const towerGeo = new THREE.BoxGeometry(3, 6, 3);
        const tower = new THREE.Mesh(towerGeo, mainMaterial);
        tower.position.set(-3, 3, 0);
        group.add(tower);

        const landingPadGeo = new THREE.BoxGeometry(6, 0.5, 8);
        const landingPad = new THREE.Mesh(landingPadGeo, padMaterial);
        landingPad.position.set(2, 1.25, 0);
        group.add(landingPad);
        
        const controlTowerTopGeo = new THREE.BoxGeometry(3.5, 1, 3.5);
        const controlTowerTop = new THREE.Mesh(controlTowerTopGeo, accentMaterial);
        controlTowerTop.position.set(-3, 6.5, 0);
        group.add(controlTowerTop);

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
                command: 'train_wraith',
                hotkey: starportHotkeys.trainWraith,
                icon: 'assets/images/train_wraith_icon.png',
                name: 'Build Wraith',
                cost: { minerals: 150, vespene: 100, supply: 2 },
                buildTime: 40
            };
            newCommands[1] = {
                command: 'train_dropship',
                hotkey: starportHotkeys.trainDropship,
                icon: 'assets/images/train_dropship_icon.png',
                name: 'Build Dropship',
                cost: { minerals: 100, vespene: 100, supply: 2 },
                buildTime: 40
            };
            
            if (this.addonBehavior.addon?.name === 'Control Tower') {
                newCommands[2] = {
                    command: 'train_science_vessel',
                    hotkey: starportHotkeys.trainScienceVessel,
                    icon: 'assets/images/train_science_vessel_icon.png',
                    name: 'Build Science Vessel',
                    cost: { minerals: 100, vespene: 225, supply: 2 },
                    buildTime: 80,
                    prereq: 'scienceFacilityBuilt',
                };
            }
            if (this.addonBehavior.addon?.name === 'Control Tower') {
                newCommands[3] = {
                    command: 'train_valkyrie',
                    hotkey: starportHotkeys.trainValkyrie,
                    icon: 'assets/images/train_valkyrie_icon.png',
                    name: 'Build Valkyrie',
                    cost: { minerals: 250, vespene: 125, supply: 3 },
                    buildTime: 60
                };
            }

            if (this.addonBehavior.addon?.name === 'Control Tower' && gameState.physicsLabBuilt) {
                newCommands[4] = {
                    command: 'train_battlecruiser',
                    hotkey: starportHotkeys.trainBattlecruiser,
                    icon: 'assets/images/train_battlecruiser_icon.png',
                    name: 'Build Battlecruiser',
                    cost: { minerals: 400, vespene: 300, supply: 6 },
                    buildTime: 133
                };
            }
            
            const addonCommands = this.addonBehavior.getCommands();
            addonCommands.forEach((cmd, index) => {
                if (cmd) newCommands[index] = cmd;
            });

            newCommands[8] = {
                command: 'lift_off',
                hotkey: 'L',
                icon: 'assets/images/lift_off_icon.png',
                name: 'Lift Off'
            };
        } else if (this.state === 'flying') {
            newCommands[0] = { command: 'move', hotkey: 'M', icon: 'assets/images/move_icon.png', name: 'Move' };
            newCommands[8] = {
                command: 'land_starport',
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
        gameState.starportBuilt = true;

        this.mesh.scale.y = 1.0;
        this.mesh.traverse(child => {
            if (child.isMesh && child.material.transparent === true) {
                child.material.opacity = 1.0;
                child.material.transparent = false;
            }
        });
        this.addonBehavior.updateCommands(gameState);
        this.updateCommands(gameState);
    }

    getCollider() {
        const flyingCollider = this.flyingBehavior.getCollider();
        if (flyingCollider.isEmpty()) {
            return flyingCollider;
        }
        if (this.addonBehavior.addon) {
            const starportBox = this.groundCollider.clone();
            const addonBox = this.addonBehavior.addon.getCollider();
            return starportBox.union(addonBox);
        }
        return this.groundCollider;
    }
    select() {
        this.selected = true;
        this.selectionIndicator.visible = true;
        if (this.addonBehavior.addon) {
            this.addonBehavior.addon.selected = true;
        }
    }
    deselect(calledByAddon = false) {
        this.selected = false;
        this.selectionIndicator.visible = false;
        if (this.addonBehavior.addon && !calledByAddon) {
            this.addonBehavior.addon.deselect();
        }
    }

    setPath(path) {
        this.flyingBehavior.setPath(path);
    }

    landAt(position, pathfinder) {
        this.flyingBehavior.landAt(position, pathfinder);
    }

    executeCommand(commandName, gameState, statusCallback) {
        if (this.addonBehavior.executeCommand(commandName, gameState, statusCallback)) {
            return;
        }

        const command = this.commands.find(c => c && c.command === commandName);
        if (!command) return;

        if (commandName.startsWith('train_')) {
            if (this.state !== 'grounded') {
                statusCallback("Must be landed to train units.");
                return;
            }
            if (this.addonBehavior.isBuilding()) {
                statusCallback("Cannot train units while building an addon.");
                return;
            }
            if (command.prereq && !gameState[command.prereq]) {
                let prereqName = 'prerequisites';
                if (command.prereq === 'scienceFacilityBuilt') prereqName = 'Science Facility';
                else if (command.prereq === 'physicsLabBuilt') prereqName = 'Physics Lab';
                statusCallback(`Requires ${prereqName}.`);
                return;
            }
            if (commandName === 'train_battlecruiser' && (!this.addonBehavior.addon || this.addonBehavior.addon.name !== 'Control Tower' || !gameState.physicsLabBuilt)) {
                statusCallback("Requires Control Tower and Physics Lab.");
                return;
            }
            if (commandName === 'train_valkyrie' && this.addonBehavior.addon?.name !== 'Control Tower') {
                statusCallback("Requires Control Tower.");
                return;
            }
            if (commandName === 'train_science_vessel' && (!this.addonBehavior.addon || this.addonBehavior.addon.name !== 'Control Tower' || !gameState.scienceFacilityBuilt)) {
                statusCallback("Requires Control Tower and Science Facility.");
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
            if (command.cost.vespene) gameState.vespene -= command.cost.vespene;

            const unitTypeMap = {
                'train_wraith': 'Wraith',
                'train_dropship': 'Dropship',
                'train_science_vessel': 'Science Vessel',
                'train_valkyrie': 'Valkyrie',
                'train_battlecruiser': 'Battlecruiser',
            };
            const unitType = unitTypeMap[commandName];

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
            case 'lift_off':
                 if (this.flyingBehavior.liftOff()) {
                     statusCallback("Lift-off sequence initiated.");
                 } else {
                     if (this.state !== 'grounded') statusCallback("Already airborne.");
                     else if (this.addonBehavior.addon) statusCallback("Cannot lift off with an addon attached.");
                 }
                break;
        }
    }

    update(delta, gameState, spawnUnitCallback, spawnBuildingCallback) {
        this.flyingBehavior.update(delta);

        if (this.isUnderConstruction) {
            const buildProgress = Math.max(0.01, this.currentHealth / this.maxHealth);
            this.mesh.scale.y = buildProgress;
            return;
        }

        this.addonBehavior.update(delta, gameState);
        
        // Less aggressive command updates.
        const shouldUpdateCmds = !this.isUnderConstruction && 
                               (this.addonBehavior.addon?.name !== this._lastAddonName || 
                                gameState.physicsLabBuilt !== this._lastPhysicsLabState ||
                                gameState.controlTowerBuilt !== this._lastControlTowerState ||
                                // Force update if build queue becomes empty
                                (this.buildQueue.length === 0 && this._lastQueueLength > 0)
                               );
        
        if (shouldUpdateCmds) {
            this.addonBehavior.updateCommands(gameState);
            this.updateCommands(gameState);
            this._lastAddonName = this.addonBehavior.addon?.name;
            this._lastPhysicsLabState = gameState.physicsLabBuilt;
            this._lastControlTowerState = gameState.controlTowerBuilt;
        }
        this._lastQueueLength = this.buildQueue.length;

        if (this.buildQueue.length > 0) {
            const job = this.buildQueue[0];
            job.progress += delta;

            if (job.progress >= job.buildTime) {
                const finishedJob = this.buildQueue.shift();
                
                if (finishedJob.isAddon) {
                    this.addonBehavior.completeAddonConstruction(finishedJob, spawnBuildingCallback, gameState);
                } else {
                    spawnUnitCallback(finishedJob.type, this.rallyPoint.clone());
                }
            }
        }
    }
}