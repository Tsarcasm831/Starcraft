import * as THREE from 'three';
import { AddonBehavior } from './addon-behavior.js';
import { assetManager } from '../utils/asset-manager.js';

export class ScienceFacility {
    constructor(position, { isUnderConstruction = false, buildTime = 60, onStateChange = () => {} } = {}) {
        this.name = 'Science Facility';
        this.portraitUrl = 'assets/images/science_facility_portrait.png';
        this.maxHealth = 850;
        this.currentHealth = isUnderConstruction ? 1 : this.maxHealth;
        this.selected = false;
        this.isUnderConstruction = isUnderConstruction;
        this.buildTime = buildTime;
        this.state = 'grounded';
        this.onStateChange = onStateChange;

        this.addonBehavior = new AddonBehavior(this);
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

        const selectionGeometry = new THREE.RingGeometry(4.5, 4.7, 64);
        const selectionMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide });
        this.selectionIndicator = new THREE.Mesh(selectionGeometry, selectionMaterial);
        this.selectionIndicator.rotation.x = -Math.PI / 2;
        this.selectionIndicator.position.y = 0.01;
        this.selectionIndicator.visible = false;
        this.mesh.add(this.selectionIndicator);
        
        const buildingWidth = 8;
        const buildingDepth = 8;
        const buildingHeight = 6;
        this.groundCollider = new THREE.Box3(
            new THREE.Vector3(-buildingWidth / 2, 0, -buildingDepth / 2),
            new THREE.Vector3(buildingWidth / 2, buildingHeight, buildingDepth / 2)
        );
        this.groundCollider.translate(this.mesh.position);
    }

    get commands() {
        if (this.isUnderConstruction || this.buildQueue.length > 0) return [];
        
        const commandList = new Array(12).fill(null);
        
        // Add own research commands
        if (!this.addonBehavior.addon) {
             // Example research, can be expanded
             commandList[0] = {
                 command: 'research_emp_shockwave',
                 hotkey: 'E',
                 icon: 'assets/images/emp_shockwave_icon.png',
                 name: 'Research EMP Shockwave',
                 cost: { minerals: 150, vespene: 150 },
                 researchTime: 80,
                 prereq: 'scienceFacilityBuilt' // Itself
             };
        }
        
        // Merge commands from addon behavior
        const addonCommands = this.addonBehavior.getCommands();
        addonCommands.forEach((cmd, index) => {
            if (cmd) commandList[index] = cmd;
        });

        return commandList;
    }

    createMesh() {
        try {
            const asset = assetManager.get('extra_science_facility');
            return this.createMeshFromGLB(asset);
        } catch (error) {
            const group = new THREE.Group();
            const mainMaterial = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.7, roughness: 0.6 });
            const accentMaterial = new THREE.MeshStandardMaterial({ color: 0x7a8a9a, metalness: 0.8, roughness: 0.5 });

            const baseGeo = new THREE.BoxGeometry(8, 2, 8);
            const base = new THREE.Mesh(baseGeo, accentMaterial);
            base.position.y = 1;
            group.add(base);

            const mainDomeGeo = new THREE.SphereGeometry(3, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
            const mainDome = new THREE.Mesh(mainDomeGeo, mainMaterial);
            mainDome.position.y = 2;
            group.add(mainDome);

            return group;
        }
    }

    createMeshFromGLB(asset) {
        const model = asset.scene.clone();

        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const desired = new THREE.Vector3(8, 6, 8);
        const scale = Math.min(
            desired.x / size.x,
            desired.y / size.y,
            desired.z / size.z
        );

        if (scale > 0 && Number.isFinite(scale)) {
            model.scale.set(scale, scale, scale);
        }

        // Shift the model so its lowest point aligns with the ground. Without
        // this, models whose pivot is centered appear half buried.
        const adjustedBox = new THREE.Box3().setFromObject(model);
        model.position.y -= adjustedBox.min.y;

        model.traverse(child => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                child.userData.owner = this;
            }
        });

        return model;
    }

    onConstructionComplete(gameState) {
        this.isUnderConstruction = false;
        this.currentHealth = this.maxHealth;
        gameState.scienceFacilityBuilt = true;

        this.mesh.scale.y = 1.0;
        
        this.mesh.traverse(child => {
            if (child.isMesh && child.material.transparent === true) {
                child.material.opacity = 1.0;
                child.material.transparent = false;
            }
        });
        this.addonBehavior.updateCommands(gameState);
    }

    getCollider() {
        if (this.addonBehavior.addon) {
            const facilityBox = this.groundCollider.clone();
            const addonBox = this.addonBehavior.addon.getCollider();
            return facilityBox.union(addonBox);
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
    
    executeCommand(commandName, gameState, statusCallback) {
        if (this.addonBehavior.executeCommand(commandName, gameState, statusCallback)) {
            return;
        }
        
        const command = this.commands.find(c => c && c.command === commandName);
        if (!command) return;

        if (commandName.startsWith('research_')) {
            if (this.buildQueue.length > 0) {
                statusCallback("Already researching or building an addon.");
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
    
    update(delta, gameState, spawnUnit, spawnBuilding) {
        if (this.isUnderConstruction) {
            const buildProgress = Math.max(0.01, this.currentHealth / this.maxHealth);
            this.mesh.scale.y = buildProgress;
            return;
        }

        this.addonBehavior.update(delta, gameState);

        if (this.buildQueue.length > 0) {
            const job = this.buildQueue[0];
            job.progress += delta;
            if (job.progress >= job.buildTime) {
                const finishedJob = this.buildQueue.shift();

                if (finishedJob.isAddon) {
                    this.addonBehavior.completeAddonConstruction(finishedJob, spawnBuilding, gameState);
                } else { // It's a research
                    if (finishedJob.originalCommand.includes('emp_shockwave')) {
                        gameState.upgrades.empShockwave = true;
                    }
                }
            }
        }

        // Update commands if state changes
        const addonChanged = this.addonBehavior.addon?.name !== this._lastAddonName;
        if(addonChanged || this.buildQueue.length === 0) {
            this.addonBehavior.updateCommands(gameState);
            this._lastAddonName = this.addonBehavior.addon?.name;
        }
    }
}