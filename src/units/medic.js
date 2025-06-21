import * as THREE from 'three';
import { Infantry } from './infantry.js';

export class Medic extends Infantry {
    constructor(position) {
        super(position);

        this.name = 'Medic';
        this.portraitUrl = 'assets/images/medic_portrait.png';
        this.maxHealth = 60;
        this.currentHealth = 60;

        this.energy = 50;
        this.maxEnergy = 200;
        this.healRange = 1.5;
        this.healTarget = null;
        this.state = 'idle'; // idle, moving, movingToHeal, healing
        this.healCooldown = 0;

        this.commands = [
            { command: 'move', hotkey: 'M', icon: 'assets/images/move_icon.png', name: 'Move' },
            { command: 'stop', hotkey: 'S', icon: 'assets/images/stop_icon.png', name: 'Stop' },
            { command: 'hold', hotkey: 'H', icon: 'assets/images/hold_position_icon.png', name: 'Hold Position' },
            { command: 'patrol', hotkey: 'P', icon: 'assets/images/patrol_icon.png', name: 'Patrol' },
            { command: 'heal', hotkey: 'E', icon: 'assets/images/heal_icon.png', name: 'Heal', cost: { energy: 1 } },
        ];

        this.mesh = this.createMesh();
        this.setup(position);
    }

    createMesh() {
        const group = new THREE.Group();

        // White armor, red accents
        const armorMaterial = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.6, roughness: 0.5 });
        const accentMaterial = new THREE.MeshStandardMaterial({ color: 0xbb2222, metalness: 0.5, roughness: 0.6 });
        const visorMaterial = new THREE.MeshStandardMaterial({ color: 0x00d1ff, metalness: 0.9, roughness: 0.2, emissive: 0x00a1ff, emissiveIntensity: 0.6 });

        // Torso - slightly smaller than marine
        const torsoGeometry = new THREE.CylinderGeometry(0.30, 0.22, 0.7, 8);
        const torso = new THREE.Mesh(torsoGeometry, armorMaterial);
        torso.position.y = 0.35;
        torso.castShadow = true;
        group.add(torso);

        // Backpack with red cross
        const backpackGeo = new THREE.BoxGeometry(0.4, 0.5, 0.25);
        const backpack = new THREE.Mesh(backpackGeo, armorMaterial);
        backpack.position.set(0, 0.5, -0.2);
        backpack.castShadow = true;
        group.add(backpack);

        const crossHGeo = new THREE.BoxGeometry(0.3, 0.1, 0.02);
        const crossVGeo = new THREE.BoxGeometry(0.1, 0.3, 0.02);
        const crossH = new THREE.Mesh(crossHGeo, accentMaterial);
        const crossV = new THREE.Mesh(crossVGeo, accentMaterial);
        crossH.position.z = 0.13;
        crossV.position.z = 0.13;
        backpack.add(crossH);
        backpack.add(crossV);

        // Head
        const headGeometry = new THREE.IcosahedronGeometry(0.22, 1);
        const head = new THREE.Mesh(headGeometry, armorMaterial);
        head.position.y = 0.9;
        head.castShadow = true;
        group.add(head);
        
        // Visor
        const visorGeometry = new THREE.BoxGeometry(0.28, 0.13, 0.05);
        const visor = new THREE.Mesh(visorGeometry, visorMaterial);
        visor.position.set(0, 0.9, 0.20);
        group.add(visor);

        // Shoulder pads
        const shoulderGeo = new THREE.SphereGeometry(0.20, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2);
        const leftShoulder = new THREE.Mesh(shoulderGeo, accentMaterial);
        leftShoulder.position.set(0.35, 0.65, 0);
        leftShoulder.rotation.z = Math.PI / 8;
        leftShoulder.castShadow = true;
        group.add(leftShoulder);

        const rightShoulder = leftShoulder.clone();
        rightShoulder.position.x = -0.35;
        rightShoulder.rotation.z = -Math.PI / 8;
        group.add(rightShoulder);

        // No gun for medic

        group.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.userData.owner = this;
            }
        });

        group.scale.set(0.7, 0.7, 0.7);

        return group;
    }

    stopActions() {
        if (this.state === 'movingToHeal' || this.state === 'healing') {
            this.state = 'idle';
            this.healTarget = null;
        }
    }

    heal(target, pathfinder, targetPosition = null) {
        this.stopActions();
        if (!target) return;
        this.state = 'movingToHeal';
        this.healTarget = target;

        let finalPos = targetPosition;
        if (!finalPos && target.getCollider) {
            const collider = target.getCollider();
            const size = collider.getSize(new THREE.Vector3());
            const pos = target.mesh.position;
            const radius = Math.max(size.x, size.z) / 2 + 1.0;
            finalPos = new THREE.Vector3(pos.x + radius, pos.y, pos.z);
        }
        if (!finalPos) finalPos = target.mesh.position.clone();

        if (pathfinder) {
            const path = pathfinder.findPath(this.mesh.position, finalPos);
            this.setPath(path);
        }
    }

    executeCommand(commandName, gameState, statusCallback) {
        if (commandName === 'heal') {
            const wounded = gameState.units
                .filter(u => u instanceof Infantry && u.currentHealth < u.maxHealth && u !== this);
            if (wounded.length === 0) {
                statusCallback('No wounded units to heal.');
                return;
            }
            wounded.sort((a, b) => a.mesh.position.distanceToSquared(this.mesh.position) - b.mesh.position.distanceToSquared(this.mesh.position));
            const target = wounded[0];
            const pathfinder = window.pathfinder;
            this.heal(target, pathfinder);
            statusCallback(`Healing ${target.name}.`);
        }
    }

    update(delta, pathfinder, gameState, buildings, scene) {
        if (this.energy < this.maxEnergy) {
            this.energy += 0.5625 * delta;
            if (this.energy > this.maxEnergy) this.energy = this.maxEnergy;
        }

        if (this.state === 'movingToHeal') {
            if (!this.healTarget || this.healTarget.currentHealth >= this.healTarget.maxHealth) {
                this.state = 'idle';
                this.healTarget = null;
            } else {
                this.updateMovement(delta, scene, () => {
                    this.state = 'healing';
                    this.mesh.lookAt(this.healTarget.mesh.position);
                });
                return;
            }
        }

        if (this.state === 'healing') {
            if (!this.healTarget || this.healTarget.currentHealth >= this.healTarget.maxHealth) {
                this.state = 'idle';
                this.healTarget = null;
            } else if (this.energy <= 0) {
                this.state = 'idle';
                this.healTarget = null;
            } else {
                const healAmount = 10 * delta;
                const energyCost = healAmount;
                const actualHeal = Math.min(healAmount, this.healTarget.maxHealth - this.healTarget.currentHealth);
                const actualCost = Math.min(this.energy, energyCost * (actualHeal / healAmount));
                this.healTarget.currentHealth += actualHeal;
                this.energy -= actualCost;
                if (this.healTarget.currentHealth >= this.healTarget.maxHealth) {
                    this.healTarget.currentHealth = this.healTarget.maxHealth;
                    this.state = 'idle';
                    this.healTarget = null;
                }
            }
            return;
        }

        super.update(delta, pathfinder, gameState, buildings, scene);
    }
}