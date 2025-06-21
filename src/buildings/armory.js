import * as THREE from 'three';

export class Armory {
    constructor(position, { isUnderConstruction = false, buildTime = 50.4 } = {}) {
        this.name = 'Armory';
        this.portraitUrl = 'assets/images/armory_portrait.png';
        this.maxHealth = 750;
        this.currentHealth = isUnderConstruction ? 1 : this.maxHealth;
        this.selected = false;
        this.isUnderConstruction = isUnderConstruction;
        this.buildTime = buildTime;
        this.state = 'grounded';

        this._commands = [];
        this.buildQueue = []; // For research

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

        const selectionGeometry = new THREE.RingGeometry(3.5, 3.7, 64);
        const selectionMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide });
        this.selectionIndicator = new THREE.Mesh(selectionGeometry, selectionMaterial);
        this.selectionIndicator.rotation.x = -Math.PI / 2;
        this.selectionIndicator.position.y = 0.01;
        this.selectionIndicator.visible = false;
        this.mesh.add(this.selectionIndicator);
        
        const buildingWidth = 6;
        const buildingDepth = 6;
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
        
        const baseGeo = new THREE.BoxGeometry(6, 3, 6);
        const base = new THREE.Mesh(baseGeo, mainMaterial);
        base.position.y = 1.5;
        group.add(base);

        const garageDoorGeo = new THREE.BoxGeometry(3, 2, 0.2);
        const garageDoor = new THREE.Mesh(garageDoorGeo, accentMaterial);
        garageDoor.position.set(0, 1, 3.05);
        group.add(garageDoor);

        const roofGeo = new THREE.BoxGeometry(6.2, 0.5, 6.2);
        const roof = new THREE.Mesh(roofGeo, accentMaterial);
        roof.position.y = 3.25;
        group.add(roof);

        return group;
    }
    
    updateCommands(gameState) {
        if (this.isUnderConstruction || this.buildQueue.length > 0) {
            this.commands = [];
            return;
        }

        const newCommands = new Array(12).fill(null);
        
        if (!gameState.upgrades.charonBoosters) {
            newCommands[0] = {
                command: 'research_charon_boosters',
                hotkey: 'C',
                icon: 'assets/images/charon_boosters_icon.png',
                name: 'Charon Boosters',
                cost: { minerals: 100, vespene: 100 },
                researchTime: 80
            };
        }
        
        const vehicleWeaponLevel = gameState.upgrades.vehicleWeapons;
        const vehicleArmorLevel = gameState.upgrades.vehicleArmor;
        const shipWeaponLevel = gameState.upgrades.shipWeapons;
        const shipArmorLevel = gameState.upgrades.shipArmor;

        if (vehicleWeaponLevel < 3) {
            newCommands[1] = {
                command: `research_vehicle_weapons_${vehicleWeaponLevel + 1}`,
                hotkey: 'V',
                icon: 'assets/images/upgrade_infantry_weapons_icon.png',
                name: `Upgrade Vehicle Weapons (Lvl ${vehicleWeaponLevel + 1})`,
                cost: { minerals: 100 * (vehicleWeaponLevel + 1), vespene: 100 * (vehicleWeaponLevel + 1) },
                researchTime: 167
            };
        }

        if (vehicleArmorLevel < 3) {
            newCommands[2] = {
                command: `research_vehicle_armor_${vehicleArmorLevel + 1}`,
                hotkey: 'A',
                icon: 'assets/images/upgrade_infantry_armor_icon.png',
                name: `Upgrade Vehicle Armor (Lvl ${vehicleArmorLevel + 1})`,
                cost: { minerals: 100 * (vehicleArmorLevel + 1), vespene: 100 * (vehicleArmorLevel + 1) },
                researchTime: 167
            };
        }

        if (shipWeaponLevel < 3) {
            newCommands[3] = {
                command: `research_ship_weapons_${shipWeaponLevel + 1}`,
                hotkey: 'S',
                icon: 'assets/images/upgrade_infantry_weapons_icon.png',
                name: `Upgrade Ship Weapons (Lvl ${shipWeaponLevel + 1})`,
                cost: { minerals: 100 * (shipWeaponLevel + 1), vespene: 100 * (shipWeaponLevel + 1) },
                researchTime: 167
            };
        }

        if (shipArmorLevel < 3) {
            newCommands[4] = {
                command: `research_ship_armor_${shipArmorLevel + 1}`,
                hotkey: 'R',
                icon: 'assets/images/upgrade_infantry_armor_icon.png',
                name: `Upgrade Ship Armor (Lvl ${shipArmorLevel + 1})`,
                cost: { minerals: 100 * (shipArmorLevel + 1), vespene: 100 * (shipArmorLevel + 1) },
                researchTime: 167
            };
        }

        this.commands = newCommands;
    }

    onConstructionComplete(gameState) {
        this.isUnderConstruction = false;
        this.currentHealth = this.maxHealth;
        gameState.armoryBuilt = true;

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

        if (commandName.startsWith('research_')) {
            if (this.buildQueue.length > 0) {
                statusCallback("Already researching an upgrade.");
                return;
            }
            if (gameState.minerals < command.cost.minerals || (command.cost.vespene && gameState.vespene < command.cost.vespene)) {
                statusCallback("Not enough resources.");
                return;
            }

            gameState.minerals -= command.cost.minerals;
            if(command.cost.vespene) gameState.vespene -= command.cost.vespene;

            this.buildQueue.push({
                type: command.name,
                buildTime: command.researchTime,
                progress: 0,
                originalCommand: commandName,
            });

            statusCallback(`Researching ${command.name}...`);
            this.updateCommands(gameState);
        }
    }
    
    update(delta, gameState) {
        if (this.isUnderConstruction) {
            const buildProgress = Math.max(0.01, this.currentHealth / this.maxHealth);
            this.mesh.scale.y = buildProgress;
            return;
        }

        if (this.buildQueue.length > 0) {
            const research = this.buildQueue[0];
            research.progress += delta;

            if (research.progress >= research.buildTime) {
                const finished = this.buildQueue.shift();
                if (finished.originalCommand.includes('charon_boosters')) {
                    gameState.upgrades.charonBoosters = true;
                } else if (finished.originalCommand.includes('vehicle_weapons')) {
                    gameState.upgrades.vehicleWeapons++;
                } else if (finished.originalCommand.includes('vehicle_armor')) {
                    gameState.upgrades.vehicleArmor++;
                } else if (finished.originalCommand.includes('ship_weapons')) {
                    gameState.upgrades.shipWeapons++;
                } else if (finished.originalCommand.includes('ship_armor')) {
                    gameState.upgrades.shipArmor++;
                }
                this.updateCommands(gameState);
            }
        }
        
        if (this.buildQueue.length === 0) {
             this.updateCommands(gameState);
        }
    }
}