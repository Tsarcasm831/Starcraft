import * as THREE from 'three';
import { SCVMark2 } from '../units/scv-mark-2.js';

export class AddonBehavior {
    constructor(parentBuilding) {
        this.parentBuilding = parentBuilding;

        this.addon = null;
        this.cachedCommands = [];
    }
    
    isBuilding() {
        return this.parentBuilding.buildQueue?.some(item => item.isAddon);
    }

    getCommands() {
        if (this.isBuilding()) {
            const commandList = new Array(12).fill(null);
            const addonJob = this.parentBuilding.buildQueue.find(item => item.isAddon);
            if (addonJob) {
                // Find the original command definition from the cached commands
                const commandDef = this.cachedCommands.find(c => c && c.command === addonJob.originalCommand);
                if (commandDef) {
                    // Place it in the correct slot so the UI can find it.
                    const cmdIndex = this.cachedCommands.indexOf(commandDef);
                    if (cmdIndex !== -1) {
                        commandList[cmdIndex] = commandDef;
                    }
                }
            }
            return commandList;
        }
        
        if (this.parentBuilding.state === 'grounded') {
            if (this.addon) {
                 return this.addon.commands;
            } else {
                 return this.cachedCommands;
            }
        }
        
        return [];
    }

    updateCommands(gameState) {
        if (this.parentBuilding.isUnderConstruction || this.isBuilding() || this.addon) {
            this.cachedCommands = [];
            return;
        }

        const newCommands = new Array(12).fill(null);

        if (this.parentBuilding.name === 'Command Center') {
            newCommands[2] = {
                command: 'build_comsat_station',
                hotkey: 'C',
                icon: 'assets/images/build_comsat_station_icon.png',
                name: 'Build Comsat Station',
                cost: { minerals: 50, vespene: 50 },
                buildTime: 25.2,
                prereq: 'academyBuilt',
                isAddon: true
            };
            newCommands[3] = {
                command: 'build_nuclear_silo',
                hotkey: 'N',
                icon: 'assets/images/build_nuclear_silo_icon.png',
                name: 'Build Nuclear Silo',
                cost: { minerals: 100, vespene: 100 },
                buildTime: 50.4,
                prereq: 'scienceFacilityBuilt',
                isAddon: true
            };
        } else if (this.parentBuilding.name === 'Science Facility') {
            newCommands[2] = {
                command: 'build_physics_lab',
                hotkey: 'P',
                icon: 'assets/images/build_physics_lab_icon.png',
                name: 'Build Physics Lab',
                cost: { minerals: 100, vespene: 50 },
                buildTime: 50.4,
                prereq: 'scienceFacilityBuilt', // It requires itself, effectively.
                isAddon: true
            };
            // Could add Covert Ops here later
            // newCommands[3] = { ... }
        } else if (this.parentBuilding.name === 'Starport') {
            newCommands[6] = {
                command: 'build_control_tower',
                hotkey: 'C',
                icon: 'assets/images/build_control_tower_icon.png',
                name: 'Build Control Tower',
                cost: { minerals: 50, vespene: 50 },
                buildTime: 30,
                isAddon: true
            };
        }

        this.cachedCommands = newCommands;
    }

    executeCommand(commandName, gameState, statusCallback) {
        // Let the addon try to execute the command first.
        if (this.addon && typeof this.addon.executeCommand === 'function') {
            const handled = this.addon.executeCommand(commandName, gameState, statusCallback);
            // If the addon handled it, we're done.
            if (handled) {
                return true;
            }
        }

        const command = this.cachedCommands.find(c => c && c.command === commandName);
        if (!command || !command.isAddon) return false;
        
        if (command.prereq && !gameState[command.prereq]) {
            let prereqName = command.prereq.replace(/([A-Z])/g, ' $1').replace('Built', '').trim();
            prereqName = prereqName.charAt(0).toUpperCase() + prereqName.slice(1);
            statusCallback(`Requires ${prereqName}.`);
            return true;
        }

        if (this.addon) {
            statusCallback("Addon already built.");
            return true;
        }
        if (this.isBuilding()) {
            statusCallback("Addon already in progress.");
            return true;
        }
        if (this.parentBuilding.buildQueue?.length >= 5) {
            statusCallback("Build queue is full.");
            return true;
        }
        if (gameState.minerals < command.cost.minerals || (command.cost.vespene && gameState.vespene < command.cost.vespene)) {
            statusCallback("Not enough resources.");
            return true;
        }

        gameState.minerals -= command.cost.minerals;
        if (command.cost.vespene) gameState.vespene -= command.cost.vespene;

        if (this.parentBuilding.buildQueue) {
            this.parentBuilding.buildQueue.push({
                type: command.name.replace('Build ', ''),
                buildTime: command.buildTime,
                progress: 0,
                originalCommand: commandName,
                isAddon: true,
            });
            statusCallback(`Constructing ${command.name.replace('Build ', '')}...`);

            // Find a nearby SCV Mark 2 to "build" the addon
            const nearbyBuilder = gameState.units.find(u => 
                u instanceof SCVMark2 && 
                u.state === 'idle' &&
                u.mesh.position.distanceTo(this.parentBuilding.mesh.position) < 20
            );

            if (nearbyBuilder) {
                const parentSize = this.parentBuilding.groundCollider.getSize(new THREE.Vector3());
                const addonWidth = (command.name.includes('Physics Lab') || command.name.includes('Control Tower')) ? 4 : 5;
                const addonOffset = new THREE.Vector3(parentSize.x / 2 + addonWidth / 2, 0, 0);
                const addonPosition = this.parentBuilding.mesh.position.clone().add(addonOffset);
                
                // Set a fake building target for the SCV to move to and play its build animation.
                // The actual addon spawning is handled by the parent building's update loop.
                const fakeBuildTarget = {
                    mesh: { position: addonPosition },
                    getCollider: () => new THREE.Box3().setFromCenterAndSize(addonPosition, new THREE.Vector3(addonWidth, 5, addonWidth)),
                };

                if (nearbyBuilder.build) {
                    // We don't want the SCV to actually increment health, so we'll just send it to move.
                    // The 'build' method handles moving to the site. We create a simplified target.
                     const targetPos = addonPosition.clone().sub(new THREE.Vector3(addonWidth / 2 + 1.5, 0, 0));
                     const pathfinder = window.pathfinder; // Access global pathfinder if available
                     if(pathfinder) {
                        const path = pathfinder.findPath(nearbyBuilder.mesh.position, targetPos);
                        nearbyBuilder.setPath(path);
                     }
                }
            }
        }
        
        // This behavior handled the command (by starting the build).
        return true;
    }

    update(delta, gameState) {
        // Construction logic is now handled by the parent building.
        // This update method is only for the *existing* addon's logic.
        if (this.addon && this.addon.update) {
            this.addon.update(delta, gameState);
        }
    }

    completeAddonConstruction(addonInfo, spawnBuildingCallback, gameState) {
        const parentSize = this.parentBuilding.groundCollider.getSize(new THREE.Vector3());
        let addonWidth = 5; // default
        if (addonInfo.type === 'Physics Lab' || addonInfo.type === 'Control Tower') addonWidth = 4;

        const addonOffset = new THREE.Vector3(parentSize.x / 2 + addonWidth / 2, 0, 0);
        const addonPosition = this.parentBuilding.mesh.position.clone().add(addonOffset);

        const newAddon = spawnBuildingCallback(addonInfo.type, addonPosition, {
            isUnderConstruction: false,
            buildTime: addonInfo.buildTime,
            parent: this.parentBuilding,
        });

        this.addon = newAddon;
        
        // Update parent's state flags
        if (addonInfo.type === 'Physics Lab') {
            gameState.physicsLabBuilt = true;
        } else if (addonInfo.type === 'Covert Ops') {
            gameState.covertOpsBuilt = true;
        } else if (addonInfo.type === 'Control Tower') {
            gameState.controlTowerBuilt = true;
        } else if (addonInfo.type === 'Comsat Station') {
            gameState.comsatStationBuilt = true;
        } else if (addonInfo.type === 'Nuclear Silo') {
            gameState.nuclearSiloBuilt = true;
        }

        // Parent might need to update its commands now that the addon is done
        if(this.parentBuilding.updateCommands) {
            this.parentBuilding.updateCommands(gameState);
        }
        
        // Also need to update the addon's own cached commands
        this.updateCommands(gameState);
    }
}