import * as THREE from 'three';

export class Starport {
    constructor(position, { isUnderConstruction = false, buildTime = 50.4 } = {}) {
        this.name = 'Starport';
        this.portraitUrl = 'assets/images/starport_portrait.png';
        this.maxHealth = 1300;
        this.currentHealth = isUnderConstruction ? 1 : this.maxHealth;
        this.selected = false;
        this.isUnderConstruction = isUnderConstruction;
        this.buildTime = buildTime;
        this.state = 'grounded';

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
        newCommands[0] = {
            command: 'train_wraith',
            hotkey: 'W',
            icon: 'assets/images/train_wraith_icon.png',
            name: 'Build Wraith',
            cost: { minerals: 150, vespene: 100, supply: 2 },
            buildTime: 42
        };
        newCommands[1] = {
            command: 'train_dropship',
            hotkey: 'D',
            icon: 'assets/images/train_dropship_icon.png',
            name: 'Build Dropship',
            cost: { minerals: 100, vespene: 100, supply: 2 },
            buildTime: 33.6
        };
        newCommands[2] = {
            command: 'train_science_vessel',
            hotkey: 'S',
            icon: 'assets/images/train_science_vessel_icon.png',
            name: 'Build Science Vessel',
            cost: { minerals: 100, vespene: 225, supply: 2 },
            buildTime: 66.7
        };
        newCommands[3] = {
            command: 'train_valkyrie',
            hotkey: 'Y',
            icon: 'assets/images/train_valkyrie_icon.png',
            name: 'Build Valkyrie',
            cost: { minerals: 250, vespene: 125, supply: 3 },
            buildTime: 42
        };

        if (gameState.covertOpsBuilt) { // Assuming a prerequisite for battlecruisers
            newCommands[4] = {
                command: 'train_battlecruiser',
                hotkey: 'B',
                icon: 'assets/images/train_battlecruiser_icon.png',
                name: 'Build Battlecruiser',
                cost: { minerals: 400, vespene: 300, supply: 6 },
                buildTime: 83.3
            };
        }
        
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
        gameState.starportBuilt = true;

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
            case 'train_wraith':
            case 'train_dropship':
            case 'train_science_vessel':
            case 'train_valkyrie':
            case 'train_battlecruiser':
                 statusCallback(`${command.name} unit not yet implemented.`);
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
