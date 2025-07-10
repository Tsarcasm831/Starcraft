import * as THREE from 'three';
import { Infantry } from '../units/infantry.js';
import { assetManager } from '../utils/asset-manager.js';

export class HighTemplar extends Infantry {
    constructor(position) {
        super(position);

        const unitData = assetManager.get('unit_hightemplar').stats;
        this.name = 'High Templar';
        this.portraitUrl = 'assets/images/protoss/hightemplar_portrait.png';
        this.maxHealth = unitData.health;
        this.currentHealth = unitData.health;
        this.maxShields = unitData.shields;
        this.currentShields = unitData.shields;
        this.armor = unitData.armor;
        this.speed = unitData.speed;
        this.maxEnergy = unitData.energy;
        this.currentEnergy = unitData.energy;
        this.timeSinceLastDamage = Infinity;

        this.shieldRechargeDelay = 7;
        /** @tweakable Shield recharge rate for High Templar (shields per second). */
        this.shieldRechargeRate = 2;

        this.commands = [
            { command: 'move', hotkey: 'M', icon: 'assets/images/move_icon.png', name: 'Move' },
            { command: 'stop', hotkey: 'S', icon: 'assets/images/stop_icon.png', name: 'Stop' },
            { command: 'hold', hotkey: 'H', icon: 'assets/images/hold_position_icon.png', name: 'Hold Position' },
            { command: 'patrol', hotkey: 'P', icon: 'assets/images/patrol_icon.png', name: 'Patrol' },
            { command: 'attack', hotkey: 'A', icon: 'assets/images/attack_icon.png', name: 'Attack' },
        ];

        try {
            const asset = assetManager.get('protoss_hightemplar');
            this.mesh = this.createMeshFromGLB(asset);
        } catch (error) {
            console.warn('Could not load high templar model, using procedural fallback.', error);
            this.mesh = this.createProceduralMesh();
        }
        this.setup(position);
    }

    createMeshFromGLB(asset) {
        const model = asset.scene.clone();

        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        /** @tweakable The desired size (largest dimension) of the High Templar model. */
        const desiredSize = 2.0;
        const maxDim = Math.max(size.x, size.y, size.z);

        if (maxDim > 0) {
            const scale = desiredSize / maxDim;
            model.scale.set(scale, scale, scale);
        }

        const scaledBox = new THREE.Box3().setFromObject(model);
        model.position.y = -scaledBox.min.y;

        model.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.userData.owner = this;
            }
        });

        return model;
    }

    createProceduralMesh() {
        const group = new THREE.Group();
        const robeMaterial = new THREE.MeshStandardMaterial({ color: 0x88aaff, metalness: 0.3, roughness: 0.8 });
        const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.5, roughness: 0.5 });

        const robeGeo = new THREE.CylinderGeometry(0.5, 0.5, 1.2, 12);
        const robe = new THREE.Mesh(robeGeo, robeMaterial);
        robe.position.y = 0.6;
        group.add(robe);

        const headGeo = new THREE.SphereGeometry(0.3, 16, 16);
        const head = new THREE.Mesh(headGeo, bodyMaterial);
        head.position.y = 1.4;
        group.add(head);

        group.traverse(child => {
            if (child.isMesh) {
                child.castShadow = true;
                child.userData.owner = this;
            }
        });

        return group;
    }

    update(delta, pathfinder, gameState, buildings, scene) {
        super.update(delta, pathfinder, gameState, buildings, scene);

        this.timeSinceLastDamage += delta;

        if (this.currentShields < this.maxShields && this.timeSinceLastDamage > this.shieldRechargeDelay) {
            this.currentShields += this.shieldRechargeRate * delta;
            if (this.currentShields > this.maxShields) {
                this.currentShields = this.maxShields;
            }
        }
    }
}