import * as THREE from 'three';
import { Infantry } from '../units/infantry.js';
import { assetManager } from '../utils/asset-manager.js';

export class Adept extends Infantry {
    constructor(position) {
        super(position);
        
        const unitData = assetManager.get('unit_adept').stats;
        this.name = 'Adept';
        this.portraitUrl = 'assets/images/protoss/adept_portrait.png';
        this.maxHealth = unitData.health;
        this.currentHealth = unitData.health;
        this.maxShields = unitData.shields;
        this.currentShields = unitData.shields;
        this.armor = unitData.armor;
        this.speed = unitData.speed;
        this.timeSinceLastDamage = Infinity;

        this.shieldRechargeDelay = 7; // Standard for all Protoss units with shields
        
        /** @tweakable Shield recharge rate for Adepts (shields per second). */
        this.shieldRechargeRate = 2;

        this.commands = [
            { command: 'move', hotkey: 'M', icon: 'assets/images/move_icon.png', name: 'Move' },
            { command: 'stop', hotkey: 'S', icon: 'assets/images/stop_icon.png', name: 'Stop' },
            { command: 'hold', hotkey: 'H', icon: 'assets/images/hold_position_icon.png', name: 'Hold Position' },
            { command: 'patrol', hotkey: 'P', icon: 'assets/images/patrol_icon.png', name: 'Patrol' },
            { command: 'attack', hotkey: 'A', icon: 'assets/images/attack_icon.png', name: 'Attack' },
        ];
        
        try {
            const asset = assetManager.get('protoss_adept');
            this.mesh = this.createMeshFromGLB(asset);
        } catch (error) {
            console.warn("Could not load adept model, using procedural fallback.", error);
            this.mesh = this.createProceduralMesh();
        }

        this.setup(position); 
    }

    createMeshFromGLB(asset) {
        const model = asset.scene.clone();

        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
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
        const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x8888cc, metalness: 0.8, roughness: 0.4 });
        const armorMaterial = new THREE.MeshStandardMaterial({ color: 0xeeeeff, metalness: 0.9, roughness: 0.3 });

        const torsoGeo = new THREE.CylinderGeometry(0.3, 0.2, 1.0, 8);
        const torso = new THREE.Mesh(torsoGeo, bodyMaterial);
        torso.position.y = 1.0;
        group.add(torso);

        const legGeo = new THREE.BoxGeometry(0.25, 1.0, 0.25);
        const leftLeg = new THREE.Mesh(legGeo, armorMaterial);
        leftLeg.position.set(-0.25, 0.5, 0);
        group.add(leftLeg);
        const rightLeg = leftLeg.clone();
        rightLeg.position.x = 0.25;
        group.add(rightLeg);

        const headGeo = new THREE.IcosahedronGeometry(0.3, 1);
        const head = new THREE.Mesh(headGeo, bodyMaterial);
        head.position.y = 1.6;
        group.add(head);

        group.traverse((child) => {
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