import * as THREE from 'three';
import { assetManager } from '../utils/asset-manager.js';

export class MineralField {
    constructor(position) {
        this.name = 'Mineral Field';
        this.portraitUrl = 'assets/images/mineral_field_portrait.png';
        this.maxMinerals = 1500;
        this.currentMinerals = 1500;
        this.isDepleted = false;
        this.statusBarColor = '#4169e1'; // Royal Blue for minerals
        this.resourceType = 'minerals';
        this.miners = new Set(); // Keep track of SCVs mining this field

        this.commands = []; // Mineral fields don't have commands.

        this.mesh = this.createMesh();
        this.mesh.position.copy(position);

        this.mesh.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.castShadow = true;
                child.userData.owner = this;
            }
        });

        this.selected = false;
        const selectionGeometry = new THREE.RingGeometry(1.4, 1.5, 32);
        const selectionMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide });
        this.selectionIndicator = new THREE.Mesh(selectionGeometry, selectionMaterial);
        this.selectionIndicator.rotation.x = -Math.PI / 2;
        this.selectionIndicator.position.y = 0.01;
        this.selectionIndicator.visible = false;
        this.mesh.add(this.selectionIndicator);

        // Define a tighter collider
        this.collider = new THREE.Box3(
            new THREE.Vector3(-1, 0, -1),
            new THREE.Vector3(1, 2.5, 1)
        );
        this.collider.translate(this.mesh.position);
    }

    createMesh() {
        try {
            const asset = assetManager.get('extra_minerals');
            return this.createMeshFromGLB(asset);
        } catch (error) {
            // Procedural fallback
            const group = new THREE.Group();
            const mineralMaterial = new THREE.MeshStandardMaterial({
                color: 0x4169e1, // Royal Blue
                metalness: 0.2,
                roughness: 0.3,
                emissive: 0x2030a0,
                emissiveIntensity: 0.4
            });

            const numCrystals = 5 + Math.floor(Math.random() * 4); // 5 to 8 crystals
            this.crystals = [];

            for (let i = 0; i < numCrystals; i++) {
                const height = 1 + Math.random() * 1.5;
                const radius = 0.2 + Math.random() * 0.4;
                const geometry = new THREE.CylinderGeometry(radius / 2, radius, height, 6);
                const crystal = new THREE.Mesh(geometry, mineralMaterial);

                crystal.position.set(
                    (Math.random() - 0.5) * 1.5,
                    height / 2,
                    (Math.random() - 0.5) * 1.5
                );

                crystal.rotation.set(
                    (Math.random() - 0.5) * Math.PI * 0.2,
                    Math.random() * Math.PI * 2,
                    (Math.random() - 0.5) * Math.PI * 0.2
                );

                group.add(crystal);
                this.crystals.push(crystal);
            }

            return group;
        }
    }

    createMeshFromGLB(asset) {
        const model = asset.scene.clone();

        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const desired = new THREE.Vector3(3, 2.5, 3);
        const scale = Math.min(
            desired.x / size.x,
            desired.y / size.y,
            desired.z / size.z
        );

        if (scale > 0 && Number.isFinite(scale)) {
            model.scale.set(scale, scale, scale);
        }

        // Align the model so its bottom touches the ground. Imported models have
        // their origin at the center, leaving half of them below y=0.
        const adjustedBox = new THREE.Box3().setFromObject(model);
        model.position.y -= adjustedBox.min.y;

        model.traverse(child => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                child.userData.owner = this;
            }
        });

        this.crystals = model.children;

        return model;
    }

    addMiner(scv) {
        this.miners.add(scv);
    }

    removeMiner(scv) {
        this.miners.delete(scv);
    }

    extract(amount) {
        if (this.isDepleted) return 0;

        const extractableAmount = Math.min(amount, this.currentMinerals);
        this.currentMinerals -= extractableAmount;

        if (this.currentMinerals <= 0) {
            this.currentMinerals = 0;
            this.isDepleted = true;
            // Change appearance when depleted by hiding crystals
            this.crystals.forEach(c => c.visible = false);
            // Tell miners to stop
            this.miners.forEach(scv => {
                if (scv.stopActions) scv.stopActions();
                if (scv.state) scv.state = 'idle';
            });
            this.miners.clear();
        }

        return extractableAmount;
    }

    getCollider() {
        return this.collider;
    }

    select() {
        this.selected = true;
        this.selectionIndicator.visible = true;
    }

    deselect() {
        this.selected = false;
        this.selectionIndicator.visible = false;
    }

    get maxHealth() {
        return this.maxMinerals;
    }
    
    get currentHealth() {
        return this.currentMinerals;
    }
}