import * as THREE from 'three';
import { Infantry } from '../units/infantry.js';
import { assetManager } from '../utils/asset-manager.js';

export class Dragoon extends Infantry {
    constructor(position) {
        super(position);
        
        const unitData = assetManager.get('unit_dragoon').stats;
        this.name = 'Dragoon';
        this.portraitUrl = 'assets/images/protoss/dragoon_portrait.png';
        this.maxHealth = unitData.health;
        this.currentHealth = unitData.health;
        this.maxShields = unitData.shields;
        this.currentShields = unitData.shields;
        this.armor = unitData.armor;
        this.speed = unitData.speed;
        this.timeSinceLastDamage = Infinity;

        this.shieldRechargeDelay = 7; // Standard for all Protoss units with shields
        
        /** @tweakable Shield recharge rate for Dragoons (shields per second). */
        this.shieldRechargeRate = 2;

        this.commands = [
            { command: 'move', hotkey: 'M', icon: 'assets/images/move_icon.png', name: 'Move' },
            { command: 'stop', hotkey: 'S', icon: 'assets/images/stop_icon.png', name: 'Stop' },
            { command: 'hold', hotkey: 'H', icon: 'assets/images/hold_position_icon.png', name: 'Hold Position' },
            { command: 'patrol', hotkey: 'P', icon: 'assets/images/patrol_icon.png', name: 'Patrol' },
            { command: 'attack', hotkey: 'A', icon: 'assets/images/attack_icon.png', name: 'Attack' },
        ];
        
        try {
            const asset = assetManager.get('protoss_dragoon');
            this.mesh = this.createMeshFromGLB(asset);
        } catch (error) {
            console.warn("Could not load dragoon model, using procedural fallback.", error);
            this.mesh = this.createProceduralMesh();
        }

        this.setup(position); 
    }

    createMeshFromGLB(asset) {
        const model = asset.scene.clone();

        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const desiredSize = 2.5; 
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
        const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x4a6a8a, metalness: 0.9, roughness: 0.4 });
        const coreMaterial = new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 0.8 });

        const torsoGeo = new THREE.SphereGeometry(0.8, 8, 6);
        const torso = new THREE.Mesh(torsoGeo, bodyMaterial);
        torso.position.y = 1.0;
        group.add(torso);

        const coreGeo = new THREE.SphereGeometry(0.4, 16, 8);
        const core = new THREE.Mesh(coreGeo, coreMaterial);
        core.position.y = 1.0;
        group.add(core);

        const legGeo = new THREE.CylinderGeometry(0.15, 0.1, 1.8, 6);
        
        const frontLeftLeg = new THREE.Mesh(legGeo, bodyMaterial);
        frontLeftLeg.position.set(-0.7, 0.9, 0.7);
        frontLeftLeg.rotation.z = Math.PI / 6;
        group.add(frontLeftLeg);
        
        const frontRightLeg = frontLeftLeg.clone();
        frontRightLeg.position.x = 0.7;
        frontRightLeg.rotation.z = -Math.PI / 6;
        group.add(frontRightLeg);
        
        const backLeftLeg = frontLeftLeg.clone();
        backLeftLeg.position.z = -0.7;
        group.add(backLeftLeg);
        
        const backRightLeg = frontRightLeg.clone();
        backRightLeg.position.z = -0.7;
        group.add(backRightLeg);
        
        const cannonGeo = new THREE.CylinderGeometry(0.2, 0.2, 1.0, 8);
        const cannon = new THREE.Mesh(cannonGeo, bodyMaterial);
        cannon.position.y = 1.6;
        cannon.rotation.x = Math.PI / 4;
        group.add(cannon);

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

