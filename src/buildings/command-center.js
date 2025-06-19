import * as THREE from 'three';
import { FlyingBuildingBehavior } from './flying-building-behavior.js';

export class CommandCenter {
    constructor(position, { isUnderConstruction = false, buildTime = 75, onStateChange = () => {} } = {}) {
        // UI and game properties
        this.name = 'Command Center';
        this.portraitUrl = 'assets/images/command_center_portrait.png';
        this.maxHealth = 1500;
        this.currentHealth = isUnderConstruction ? 1 : 1500;
        this.selected = false;
        this.isUnderConstruction = isUnderConstruction;
        this.buildTime = buildTime;
        this.addon = null;
        this.addonToBuild = null;
        this.addonBuildProgress = 0;
        this.onStateChange = onStateChange;

        // Flying properties are now managed by the behavior
        this.flyingBehavior = new FlyingBuildingBehavior(this, {
            onStateChange: this.onStateChange,
            hoverHeight: 5,
            animationDuration: 3.0,
            speed: 10
        });

        // Command Card is now a getter
        this.buildQueue = [];
        this.rallyPoint = new THREE.Vector3(position.x - 8, 0, position.z); // Default rally point

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
        const selectionGeometry = new THREE.RingGeometry(6, 6.5, 64);
        const selectionMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide });
        this.selectionIndicator = new THREE.Mesh(selectionGeometry, selectionMaterial);
        this.selectionIndicator.rotation.x = -Math.PI / 2;
        this.selectionIndicator.position.y = 0.01;
        this.selectionIndicator.visible = false;
        this.mesh.add(this.selectionIndicator);
        
        // Manually define collider box for simplicity and accuracy
        const buildingWidth = 13;
        const buildingDepth = 8;
        const buildingHeight = 10;
        this.groundCollider = new THREE.Box3(
            new THREE.Vector3(-buildingWidth / 2, 0, -buildingDepth / 2),
            new THREE.Vector3(buildingWidth / 2, buildingHeight, buildingDepth / 2)
        );
        this.groundCollider.translate(this.mesh.position);

        // Training progress visuals
        const barGeom = new THREE.PlaneGeometry(4, 0.4);
        const bgMat = new THREE.MeshBasicMaterial({ color: 0x333333, transparent: true, depthTest: false });
        const fgMat = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, depthTest: false });
        this.progressBg = new THREE.Mesh(barGeom, bgMat);
        this.progressFg = new THREE.Mesh(barGeom, fgMat);
        this.progressFg.scale.x = 0;
        this.progressFg.position.z = 0.01;
        this.progressGroup = new THREE.Group();
        this.progressGroup.add(this.progressBg);
        this.progressGroup.add(this.progressFg);
        this.progressGroup.position.set(0, 8.5, 0);
        this.progressGroup.visible = false;
        this.mesh.add(this.progressGroup);

        // Queue count sprite
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');
        ctx.font = '28px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        this.queueCtx = ctx;
        this.queueCanvas = canvas;
        this.queueTexture = new THREE.CanvasTexture(canvas);
        const spriteMat = new THREE.SpriteMaterial({ map: this.queueTexture, transparent: true });
        this.queueSprite = new THREE.Sprite(spriteMat);
        this.queueSprite.scale.set(2, 1, 1);
        this.queueSprite.position.set(0, 9.2, 0);
        this.queueSprite.visible = false;
        this.mesh.add(this.queueSprite);
    }

    get state() {
        return this.flyingBehavior.state;
    }
    set state(newState) {
        this.flyingBehavior.state = newState;
    }

    get commands() {
        const commandList = new Array(12).fill(null);

        // If addon is building, show a cancel button
        if (this.addonToBuild) {
            // In a real implementation, we'd add a cancel button
            return commandList;
        }

        // Base commands
        if (this.state === 'grounded' && !this.addonToBuild) {
            commandList[0] = { 
                command: 'train_scv', 
                hotkey: 'S', 
                icon: 'assets/images/build_scv2_icon.png', 
                name: 'Build SCV',
                cost: { minerals: 50, supply: 1 },
                buildTime: 17 // seconds
            };
            commandList[1] = {
                command: 'train_scv_mark_2',
                hotkey: 'D',
                icon: 'assets/images/build_scv_icon.png',
                name: 'Build SCV Mark 2',
                cost: { minerals: 75, supply: 1 },
                buildTime: 22
            };
        }

        if (this.state === 'grounded') {
            commandList[8] = {
                command: 'lift_off',
                hotkey: 'L',
                icon: 'assets/images/lift_off_icon.png',
                name: 'Lift Off'
            };
        } else if (this.state === 'flying') {
            commandList[0] = { command: 'move', hotkey: 'M', icon: 'assets/images/move_icon.png', name: 'Move' };
            commandList[8] = {
                command: 'land',
                hotkey: 'L',
                icon: 'assets/images/raise_depot_icon.png', // Placeholder icon
                name: 'Land',
                cost: {}, // for placement system
            };
        }

        // If an addon is attached, merge its commands.
        if (this.state === 'grounded' && this.addon) {
            if (this.addon.commands) {
                this.addon.commands.forEach((cmd, index) => {
                    if (cmd) commandList[index] = cmd;
                });
            }
        } else if (this.state === 'grounded') {
            // If no addon, show build options
            commandList[2] = {
                command: 'build_comsat_station',
                hotkey: 'C',
                icon: 'assets/images/build_comsat_station_icon.png',
                name: 'Build Comsat Station',
                cost: { minerals: 50, vespene: 50 },
                buildTime: 25.2,
                prereq: 'academyBuilt'
            };
            commandList[3] = {
                command: 'build_nuclear_silo',
                hotkey: 'N',
                icon: 'assets/images/build_nuclear_silo_icon.png',
                name: 'Build Nuclear Silo',
                cost: { minerals: 100, vespene: 100 },
                buildTime: 50.4,
                prereq: 'scienceFacilityBuilt' // Corrected prereq
            };
        }
        
        return commandList;
    }

    createMesh() {
        const group = new THREE.Group();

        const mainMaterial = new THREE.MeshStandardMaterial({ color: 0x8a9aaa, metalness: 0.7, roughness: 0.6 });
        const accentMaterial = new THREE.MeshStandardMaterial({ color: 0x5a6a7a, metalness: 0.8, roughness: 0.5 });
        const lightMaterial = new THREE.MeshStandardMaterial({ color: 0xffa500, emissive: 0xffa500, emissiveIntensity: 1.0 });

        // Base structure
        const baseGeo = new THREE.BoxGeometry(10, 2, 8);
        const base = new THREE.Mesh(baseGeo, mainMaterial);
        base.position.y = 1;
        group.add(base);

        // Upper structure
        const upperGeo = new THREE.BoxGeometry(7, 2, 6);
        const upper = new THREE.Mesh(upperGeo, mainMaterial);
        upper.position.y = 3;
        group.add(upper);

        // Command tower
        const towerGeo = new THREE.CylinderGeometry(1.5, 2, 3, 8);
        const tower = new THREE.Mesh(towerGeo, accentMaterial);
        tower.position.y = 5.5;
        group.add(tower);

        // Antenna
        const antennaGeo = new THREE.CylinderGeometry(0.2, 0.2, 4, 6);
        const antenna = new THREE.Mesh(antennaGeo, new THREE.MeshStandardMaterial({ color: 0x333333 }));
        antenna.position.y = 8;
        group.add(antenna);

        // Side pods
        const podGeo = new THREE.BoxGeometry(2, 1.5, 3);
        const leftPod = new THREE.Mesh(podGeo, accentMaterial);
        leftPod.position.set(-5.5, 0.75, 0);
        leftPod.name = "leftPod";
        group.add(leftPod);
        
        const rightPod = leftPod.clone();
        rightPod.position.x = 5.5;
        rightPod.name = "rightPod";
        group.add(rightPod);

        // Small lights
        const lightGeo = new THREE.SphereGeometry(0.2, 8, 8);
        const light1 = new THREE.Mesh(lightGeo, lightMaterial);
        light1.position.set(4.9, 2.2, 3);
        group.add(light1);

        const light2 = light1.clone();
        light2.position.set(-4.9, 2.2, 3);
        group.add(light2);
        
        const light3 = light1.clone();
        light3.position.set(4.9, 2.2, -3);
        group.add(light3);

        const light4 = light1.clone();
        light4.position.set(-4.9, 2.2, -4);
        group.add(light4);

        return group;
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
    }

    getCollider() {
        const flyingCollider = this.flyingBehavior.getCollider();
        // If airborne, collider is empty.
        if (flyingCollider.isEmpty()) {
            return flyingCollider;
        }

        // Otherwise, on the ground, calculate union of self and addon.
        if (this.addon) {
            const ccBox = this.groundCollider.clone();
            const addonBox = this.addon.getCollider();
            return ccBox.union(addonBox);
        }
        return this.groundCollider;
    }

    select() {
        this.selected = true;
        this.selectionIndicator.visible = true;
        if (this.addon) {
            this.addon.selected = true;
        }
    }

    deselect(calledByAddon = false) {
        this.selected = false;
        this.selectionIndicator.visible = false;
        if (this.addon && !calledByAddon) {
            this.addon.deselect();
        }
    }

    setPath(path) {
        this.flyingBehavior.setPath(path);
    }

    executeCommand(commandName, gameState, statusCallback) {
        const command = this.commands.find(c => c && c.command === commandName);
        if (!command) {
            // If command not found on CC, try addon
            if (this.addon && this.addon.executeCommand) {
                this.addon.executeCommand(commandName, gameState, statusCallback);
            }
            return;
        }

        if (command.prereq && !gameState[command.prereq]) {
            let prereqName = "prerequisites";
            if (command.prereq === 'academyBuilt') prereqName = "Academy";
            else if (command.prereq === 'scienceFacilityBuilt') prereqName = "Science Facility";
            statusCallback(`Requires ${prereqName}.`);
            return;
        }

        switch(commandName) {
            case 'train_scv':
            case 'train_scv_mark_2':
                if (this.state !== 'grounded') {
                    statusCallback("Must be landed to train units.");
                    return;
                }
                if (this.addonToBuild) {
                    statusCallback("Cannot train units while building an addon.");
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
                if (gameState.supplyUsed + command.cost.supply > gameState.supplyCap) {
                    statusCallback("Additional supply required.");
                    return;
                }

                gameState.minerals -= command.cost.minerals;
                // Supply is formally used when unit spawns, not when queued.
                this.buildQueue.push({
                    type: command.name.replace('Build ', ''),
                    progress: 0,
                    buildTime: command.buildTime,
                    cost: command.cost,
                    originalCommand: commandName,
                });
                statusCallback(`${command.name.replace('Build ', '')} training...`);
                break;

            case 'build_comsat_station':
            case 'build_nuclear_silo':
                if (this.addonToBuild || this.addon) {
                    statusCallback("Addon already built or in progress.");
                    return;
                }
                if (gameState.minerals < command.cost.minerals || (command.cost.vespene && gameState.vespene < command.cost.vespene)) {
                    statusCallback("Not enough resources.");
                    return;
                }
                
                gameState.minerals -= command.cost.minerals;
                if(command.cost.vespene) gameState.vespene -= command.cost.vespene;

                this.addonToBuild = {
                    type: command.name.replace('Build ', ''),
                    buildTime: command.buildTime,
                };
                this.addonBuildProgress = 0;
                statusCallback(`Constructing ${this.addonToBuild.type}...`);
                break;

            case 'lift_off':
                 if (this.flyingBehavior.liftOff()) {
                     statusCallback("Lift-off sequence initiated.");
                 } else {
                     if (this.state !== 'grounded') statusCallback("Already airborne.");
                     else if (this.addon) statusCallback("Cannot lift off with an addon attached.");
                 }
                 break;
            case 'land':
                 // This is now handled by the placement system via game/index.js
                 // It will call landAt() on this instance.
                 break;
        }
    }

    landAt(position) {
        this.flyingBehavior.landAt(position);
    }

    update(delta, gameState, spawnUnitCallback, spawnBuildingCallback) {
        if (this.isUnderConstruction) {
            const buildProgress = Math.max(0.01, this.currentHealth / this.maxHealth);
            this.mesh.scale.y = buildProgress;
            return;
        }

        this.flyingBehavior.update(delta);

        // Addon Construction
        if (this.state === 'grounded' && this.addonToBuild && !this.isUnderConstruction) {
            this.addonBuildProgress += delta;
            
            if (this.addonBuildProgress >= this.addonToBuild.buildTime) {
                const addonInfo = this.addonToBuild;
                const ccSize = this.groundCollider.getSize(new THREE.Vector3());
                const addonWidth = 5; // from addon class
                const addonOffset = new THREE.Vector3(ccSize.x / 2 + addonWidth / 2, 0, 0);
                const addonPosition = this.mesh.position.clone().add(addonOffset);
                
                const newAddon = spawnBuildingCallback(addonInfo.type, addonPosition, { 
                    isUnderConstruction: false, 
                    buildTime: addonInfo.buildTime,
                    parent: this,
                });
                
                this.addon = newAddon;
                this.addonToBuild = null;
                this.addonBuildProgress = 0;
                this.onStateChange(); // Update pathfinding
            }
        }

        if (this.buildQueue.length > 0) {
            const trainingUnit = this.buildQueue[0];
            trainingUnit.progress += delta;

            if (trainingUnit.progress >= trainingUnit.buildTime) {
                // Unit finished
                const finishedUnit = this.buildQueue.shift();
                spawnUnitCallback(finishedUnit.type, this.rallyPoint.clone(), { cost: finishedUnit.cost });
            }
        }

        if (this.addon && this.addon.update) {
            this.addon.update(delta, gameState);
        }
    }
}