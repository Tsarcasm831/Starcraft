import * as THREE from 'three';

export class PhysicsLab {
    constructor(position, { isUnderConstruction = false, buildTime = 50.4, parent = null } = {}) {
        this.name = 'Physics Lab';
        this.portraitUrl = 'assets/images/physics_lab_portrait.png';
        this.maxHealth = 600;
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
        const buildingHeight = 6;
        this.collider = new THREE.Box3(
            new THREE.Vector3(-buildingWidth / 2, 0, -buildingDepth / 2),
            new THREE.Vector3(buildingWidth / 2, buildingHeight, buildingDepth / 2)
        );
        this.collider.translate(this.mesh.position);
    }

    createMesh() {
        const group = new THREE.Group();
        const mainMaterial = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.7, roughness: 0.6 });
        const accentMaterial = new THREE.MeshStandardMaterial({ color: 0x7a8a9a, metalness: 0.8, roughness: 0.5 });
        const glowMaterial = new THREE.MeshStandardMaterial({ color: 0x00a1ff, emissive: 0x00a1ff, emissiveIntensity: 0.7 });

        const baseGeo = new THREE.BoxGeometry(4, 5, 4);
        const base = new THREE.Mesh(baseGeo, mainMaterial);
        base.position.y = 2.5;
        group.add(base);

        const windowGeo = new THREE.BoxGeometry(3, 2, 0.2);
        const frontWindow = new THREE.Mesh(windowGeo, glowMaterial);
        frontWindow.position.set(0, 3, 2.05);
        group.add(frontWindow);

        const atomCoreGeo = new THREE.SphereGeometry(0.5, 8, 8);
        this.atomCore = new THREE.Mesh(atomCoreGeo, glowMaterial);
        this.atomCore.position.y = 5.5;
        group.add(this.atomCore);
        
        this.electronPaths = new THREE.Group();
        const pathGeo = new THREE.TorusGeometry(1, 0.05, 8, 32);
        
        const path1 = new THREE.Mesh(pathGeo, accentMaterial);
        path1.rotation.x = Math.PI / 2;
        
        const path2 = path1.clone();
        path2.rotation.y = Math.PI / 2;
        
        this.electronPaths.add(path1);
        this.electronPaths.add(path2);
        this.electronPaths.position.y = 5.5;
        group.add(this.electronPaths);

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

        if (!gameState.upgrades.yamatoGun) {
            newCommands[0] = {
                command: 'research_yamato_gun',
                hotkey: 'Y',
                icon: 'assets/images/yamato_cannon_icon.png',
                name: 'Research Yamato Gun',
                cost: { minerals: 100, vespene: 100 },
                researchTime: 80,
            };
        }

        if (!gameState.upgrades.behemothReactor) {
            newCommands[1] = {
                command: 'research_behemoth_reactor',
                hotkey: 'B',
                icon: 'assets/images/train_battlecruiser_icon.png',
                name: 'Research Behemoth Reactor',
                cost: { minerals: 150, vespene: 150 },
                researchTime: 80,
            };
        }

        this.commands = newCommands;
    }

    executeCommand(commandName, gameState, statusCallback) {
        const command = this.commands.find(c => c && c.command === commandName);
        if (!command) return;

        if (commandName.startsWith('research_')) {
            if (this.buildQueue.length > 0) {
                statusCallback('Already researching an upgrade.');
                return true;
            }
            if (gameState.minerals < command.cost.minerals || (command.cost.vespene && gameState.vespene < command.cost.vespene)) {
                statusCallback('Not enough resources.');
                return true;
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
            this.updateCommands(gameState);
            return true;
        }
    }

    update(delta, gameState) {
        if(this.electronPaths) {
            this.electronPaths.rotation.y += delta * 0.5;
            this.electronPaths.rotation.x += delta * 0.2;
        }

        if (this.buildQueue.length > 0) {
            const research = this.buildQueue[0];
            research.progress += delta;

            if (research.progress >= research.buildTime) {
                const finished = this.buildQueue.shift();
                if (finished.originalCommand.includes('yamato_gun')) {
                    gameState.upgrades.yamatoGun = true;
                } else if (finished.originalCommand.includes('behemoth_reactor')) {
                    gameState.upgrades.behemothReactor = true;
                }
                this.updateCommands(gameState);
            }
        }

        if (this.buildQueue.length === 0) {
            this.updateCommands(gameState);
        }
    }
}

