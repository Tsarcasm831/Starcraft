import * as THREE from 'three';
import { Infantry } from './infantry.js';

export class Ghost extends Infantry {
    constructor(position) {
        super(position);

        this.name = 'Ghost';
        this.portraitUrl = 'assets/images/ghost_portrait.png';
        this.maxHealth = 45;
        this.currentHealth = 45;
        this.speed = 3.5; // Slightly slower than a marine

        this.energy = 50;
        this.maxEnergy = 200;

        this.isCloaked = false;
        this._buildings = null;

        this.commands = [
            { command: 'move', hotkey: 'M', icon: 'assets/images/move_icon.png', name: 'Move' },
            { command: 'stop', hotkey: 'S', icon: 'assets/images/stop_icon.png', name: 'Stop' },
            { command: 'hold', hotkey: 'H', icon: 'assets/images/hold_position_icon.png', name: 'Hold Position' },
            { command: 'patrol', hotkey: 'P', icon: 'assets/images/patrol_icon.png', name: 'Patrol' },
            { command: 'attack', hotkey: 'A', icon: 'assets/images/attack_icon.png', name: 'Attack' },
            null,
            null,
            { command: 'cloak', hotkey: 'C', icon: 'assets/images/cloak_icon.png', name: 'Cloak' },
            { command: 'lockdown', hotkey: 'L', icon: 'assets/images/lockdown_icon.png', name: 'Lockdown' },
            { command: 'nuke_strike', hotkey: 'N', icon: 'assets/images/nuke_strike_icon.png', name: 'Nuke Strike' },
        ];
        
        this.mesh = this.createMesh();
        this.setup(position);
    }

    createMesh() {
        const group = new THREE.Group();

        const armorMaterial = new THREE.MeshStandardMaterial({ color: 0xeeeeee, metalness: 0.6, roughness: 0.5 });
        const suitMaterial = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.7, roughness: 0.4 });
        const visorMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000, metalness: 0.9, roughness: 0.2, emissive: 0xff0000, emissiveIntensity: 0.6 });

        // Torso (slender)
        const torsoGeometry = new THREE.CylinderGeometry(0.25, 0.20, 0.9, 8);
        const torso = new THREE.Mesh(torsoGeometry, suitMaterial);
        torso.position.y = 0.45;
        torso.castShadow = true;
        group.add(torso);

        // Head
        const headGeometry = new THREE.IcosahedronGeometry(0.25, 1);
        const head = new THREE.Mesh(headGeometry, armorMaterial);
        head.position.y = 1.05;
        head.castShadow = true;
        group.add(head);
        
        // Visor
        const visorGeometry = new THREE.BoxGeometry(0.3, 0.15, 0.05);
        const visor = new THREE.Mesh(visorGeometry, visorMaterial);
        visor.position.set(0, 1.05, 0.22);
        group.add(visor);

        // Shoulder pads (small)
        const shoulderGeo = new THREE.SphereGeometry(0.18, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2);
        const leftShoulder = new THREE.Mesh(shoulderGeo, armorMaterial);
        leftShoulder.position.set(0.3, 0.8, 0);
        leftShoulder.rotation.z = Math.PI / 8;
        leftShoulder.castShadow = true;
        group.add(leftShoulder);

        const rightShoulder = leftShoulder.clone();
        rightShoulder.position.x = -0.3;
        rightShoulder.rotation.z = -Math.PI / 8;
        group.add(rightShoulder);

        // Sniper Rifle (C-10 Canister Rifle)
        const gunGroup = new THREE.Group();
        const gunBodyGeo = new THREE.BoxGeometry(0.1, 0.15, 1.2);
        const gunBody = new THREE.Mesh(gunBodyGeo, suitMaterial);
        gunGroup.add(gunBody);

        const gunBarrelGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.5, 8);
        const gunBarrel = new THREE.Mesh(gunBarrelGeo, suitMaterial);
        gunBarrel.rotation.x = Math.PI / 2;
        gunBarrel.position.z = 0.75;
        gunGroup.add(gunBarrel);
        
        const scopeGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.3, 6);
        const scope = new THREE.Mesh(scopeGeo, suitMaterial);
        scope.rotation.x = Math.PI / 2;
        scope.position.set(0, 0.15, -0.2);
        gunGroup.add(scope);

        gunBody.castShadow = true;
        gunBarrel.castShadow = true;
        gunGroup.position.set(0.45, 0.5, 0.4);
        group.add(gunGroup);

        group.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.userData.owner = this;
            }
        });

        group.scale.set(0.7, 0.7, 0.7);

        return group;
    }

    executeCommand(commandName, gameState, statusCallback) {
        switch (commandName) {
            case 'cloak':
                if (!this.isCloaked) {
                    if (this.energy < 25) {
                        statusCallback('Not enough energy.');
                        return;
                    }
                    this.energy -= 25;
                    this.isCloaked = true;
                    this.mesh.traverse(child => {
                        if (child.material) {
                            child.material.transparent = true;
                            child.material.opacity = 0.35;
                        }
                    });
                    statusCallback('Cloak engaged.');
                } else {
                    this.isCloaked = false;
                    this.mesh.traverse(child => {
                        if (child.material) {
                            child.material.opacity = 1;
                            child.material.transparent = false;
                        }
                    });
                    statusCallback('Cloak disengaged.');
                }
                break;
            case 'lockdown':
                if (this.energy < 100) {
                    statusCallback('Not enough energy.');
                    return;
                }
                this.energy -= 100;
                statusCallback('Lockdown fired (no effect in demo).');
                break;
            case 'nuke_strike':
                if (!this._buildings) {
                    statusCallback('No Nuclear Silo available.');
                    return;
                }
                const silo = this._buildings.find(b => b.name === 'Nuclear Silo');
                if (!silo) {
                    statusCallback('No Nuclear Silo available.');
                    return;
                }
                if (!silo.hasNuke) {
                    statusCallback('Nuclear missile not ready.');
                    return;
                }
                if (this.energy < 50) {
                    statusCallback('Not enough energy.');
                    return;
                }
                this.energy -= 50;
                silo.hasNuke = false;
                statusCallback('Nuclear launch initiated!');
                break;
        }
    }

    update(delta, pathfinder, gameState, buildings, scene) {
        this._buildings = buildings;

        if (this.isCloaked) {
            this.energy -= delta;
            if (this.energy <= 0) {
                this.energy = 0;
                this.isCloaked = false;
                this.mesh.traverse(child => {
                    if (child.material) {
                        child.material.opacity = 1;
                        child.material.transparent = false;
                    }
                });
            }
        } else if (this.energy < this.maxEnergy) {
            this.energy += 0.5625 * delta;
            if (this.energy > this.maxEnergy) this.energy = this.maxEnergy;
        }

        super.update(delta, pathfinder, gameState, buildings, scene);
    }
}