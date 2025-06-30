import * as THREE from 'three';

/** @tweakable Hotkeys for Academy research commands */
const academyHotkeys = {
    stimpack: 'T',
    u238shells: 'U',
};

export class Academy {
    constructor(position, { isUnderConstruction = false, buildTime = 50.4 } = {}) {
        this.name = 'Academy';
        this.portraitUrl = 'assets/images/academy_portrait.png';
        this.maxHealth = 600;
        this.currentHealth = isUnderConstruction ? 1 : this.maxHealth;
        this.selected = false;
        this.isUnderConstruction = isUnderConstruction;
        this.buildTime = buildTime;

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
        const buildingHeight = 4;
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
        const roofMaterial = new THREE.MeshStandardMaterial({ color: 0x607080, metalness: 0.7, roughness: 0.6 });

        const baseGeo = new THREE.BoxGeometry(6, 2, 6);
        const base = new THREE.Mesh(baseGeo, mainMaterial);
        base.position.y = 1;
        group.add(base);

        const upperGeo = new THREE.BoxGeometry(4.5, 1, 4.5);
        const upper = new THREE.Mesh(upperGeo, accentMaterial);
        upper.position.y = 2.5;
        group.add(upper);
        
        const roofShape = new THREE.Shape();
        roofShape.moveTo(-2, 0);
        roofShape.lineTo(2, 0);
        roofShape.lineTo(0, 1);
        const extrudeSettings = { depth: 4, bevelEnabled: false };
        const roofGeo = new THREE.ExtrudeGeometry(roofShape, extrudeSettings);
        const roof = new THREE.Mesh(roofGeo, roofMaterial);
        roof.rotation.y = Math.PI / 2;
        roof.position.set(-2, 3, 0);
        group.add(roof);

        return group;
    }
    
    updateCommands(gameState) {
        if (this.isUnderConstruction || this.buildQueue.length > 0) {
            return;
        }

        const newCommands = new Array(12).fill(null);
        
        if (!gameState.upgrades.stimpack) {
            newCommands[0] = {
                command: 'research_stimpack',
                hotkey: academyHotkeys.stimpack,
                icon: 'assets/images/stim_pack_icon.png',
                name: 'Research Stim Packs',
                cost: { minerals: 100, vespene: 100 },
                researchTime: 50.4
            };
        }
        
        if (!gameState.upgrades.u238shells) {
            newCommands[1] = {
                command: 'research_u238shells',
                hotkey: academyHotkeys.u238shells,
                icon: 'assets/images/u238_shells_icon.png',
                name: 'Research U-238 Shells',
                cost: { minerals: 150, vespene: 150 },
                researchTime: 66.7
            };
        }

        this.commands = newCommands;
    }

    onConstructionComplete(gameState) {
        this.isUnderConstruction = false;
        this.currentHealth = this.maxHealth;
        gameState.academyBuilt = true;

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
                statusCallback("Already researching.");
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
                if (finished.originalCommand.includes('stimpack')) {
                    gameState.upgrades.stimpack = true;
                } else if (finished.originalCommand.includes('u238shells')) {
                    gameState.upgrades.u238shells = true;
                }
                this.updateCommands(gameState); // Update commands after research finishes
            }
        }

        // To prevent constant re-evaluation, only update commands if not building/researching.
        if (this.buildQueue.length === 0) {
             this.updateCommands(gameState);
        }
    }
}