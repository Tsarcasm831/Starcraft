import * as THREE from 'three';

export class EngineeringBay {
    constructor(position, { isUnderConstruction = false, buildTime = 37.8 } = {}) {
        this.name = 'Engineering Bay';
        this.portraitUrl = 'assets/images/engineering_bay_portrait.png';
        this.maxHealth = 850;
        this.currentHealth = isUnderConstruction ? 1 : this.maxHealth;
        this.selected = false;
        this.isUnderConstruction = isUnderConstruction;
        this.buildTime = buildTime;
        this.state = 'grounded';

        this._commands = [];
        this.buildQueue = []; // Used for research progress

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

        const baseGeo = new THREE.BoxGeometry(6, 2, 6);
        const base = new THREE.Mesh(baseGeo, mainMaterial);
        base.position.y = 1;
        group.add(base);

        const supportGeo = new THREE.CylinderGeometry(0.5, 0.5, 1, 8);
        const support = new THREE.Mesh(supportGeo, accentMaterial);
        support.position.y = 2.5;
        group.add(support);
        
        const dishGeo = new THREE.SphereGeometry(2, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
        const dish = new THREE.Mesh(dishGeo, mainMaterial);
        dish.position.y = 3;
        dish.rotation.x = -Math.PI / 4;
        group.add(dish);

        return group;
    }
    
    updateCommands(gameState) {
        if (this.isUnderConstruction || this.buildQueue.length > 0) {
            return;
        }

        const newCommands = new Array(12).fill(null);
        const weaponLevel = gameState.upgrades.infantryWeapons;
        const armorLevel = gameState.upgrades.infantryArmor;

        if (weaponLevel < 3) {
            newCommands[0] = {
                command: `research_infantry_weapons_${weaponLevel + 1}`,
                hotkey: 'W',
                icon: 'assets/images/upgrade_infantry_weapons_icon.png',
                name: `Upgrade Infantry Weapons (Lvl ${weaponLevel + 1})`,
                cost: { minerals: 100 * (weaponLevel + 1), vespene: 100 * (weaponLevel + 1) },
                researchTime: 167
            };
        }
        
        if (armorLevel < 3) {
            newCommands[1] = {
                command: `research_infantry_armor_${armorLevel + 1}`,
                hotkey: 'A',
                icon: 'assets/images/upgrade_infantry_armor_icon.png',
                name: `Upgrade Infantry Armor (Lvl ${armorLevel + 1})`,
                cost: { minerals: 100 * (armorLevel + 1), vespene: 100 * (armorLevel + 1) },
                researchTime: 167
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
        this.mesh.scale.y = 1.0;
        
        this.mesh.traverse(child => {
            if (child.isMesh && child.material.transparent === true) {
                child.material.opacity = 1.0;
                child.material.transparent = false;
            }
        });
        
        gameState.engineeringBayBuilt = true;
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
        } else if (commandName === 'lift_off') {
            statusCallback("Lift-off sequence not yet available.");
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
                if (finished.originalCommand.includes('weapons')) {
                    gameState.upgrades.infantryWeapons++;
                } else if (finished.originalCommand.includes('armor')) {
                    gameState.upgrades.infantryArmor++;
                }
            }
        }

        this.updateCommands(gameState);
    }
}