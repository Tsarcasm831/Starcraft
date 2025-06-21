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

        this.buildQueue = []; // For research progress
        this.commands = []; // Research commands will be populated

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

    updateCommands(gameState) {
        if (this.isUnderConstruction || this.buildQueue.length > 0) {
            this.commands = [];
            return;
        }

        const newCommands = new Array(12).fill(null);

        if (!gameState.upgrades.wraithCloaking) {
            newCommands[0] = {
                command: 'research_wraith_cloaking',
                hotkey: 'C',
                icon: 'assets/images/cloak_icon.png',
                name: 'Research Wraith Cloaking',
                cost: { minerals: 150, vespene: 150 },
                researchTime: 80
            };
        }

        if (!gameState.upgrades.dropThrusters) {
            newCommands[1] = {
                command: 'research_drop_thrusters',
                hotkey: 'D',
                icon: 'assets/images/train_dropship_icon.png',
                name: 'Research Drop Thrusters',
                cost: { minerals: 100, vespene: 100 },
                researchTime: 60
            };
        }

        this.commands = newCommands;
    }
    
    executeCommand(commandName, gameState, statusCallback) {
        const command = this.commands.find(c => c && c.command === commandName);
        if (!command) return;

        if (commandName.startsWith('research_')) {
            if (this.buildQueue.length > 0) {
                statusCallback("Already researching.");
                return;
            }
            if (gameState.minerals < command.cost.minerals || (command.cost.vespene && gameState.vespene < command.cost.vespene)) {
                statusCallback("Not enough resources.");
                return;
            }

            gameState.minerals -= command.cost.minerals;
            if (command.cost.vespene) gameState.vespene -= command.cost.vespene;

            this.buildQueue.push({
                type: command.name,
                buildTime: command.researchTime,
                progress: 0,
                originalCommand: commandName,
            });

            statusCallback(`Researching ${command.name}...`);
        }
    }

    update(delta, gameState) {
        if (this.buildQueue.length > 0) {
            const research = this.buildQueue[0];
            research.progress += delta;

            if (research.progress >= research.buildTime) {
                const finished = this.buildQueue.shift();
                if (finished.originalCommand.includes('wraith_cloaking')) {
                    gameState.upgrades.wraithCloaking = true;
                } else if (finished.originalCommand.includes('drop_thrusters')) {
                    gameState.upgrades.dropThrusters = true;
                }
                this.updateCommands(gameState);
            }
        }

        if (this.buildQueue.length === 0) {
            this.updateCommands(gameState);
        }

        if(this.dish) {
            this.dish.rotation.y += delta * 0.4;
        }
    }
}

