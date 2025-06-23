import * as THREE from 'three';
import { assetManager } from '../utils/asset-manager.js';

export class VespeneGeyser {
    constructor(position) {
        this.name = 'Vespene Geyser';
        this.portraitUrl = 'assets/images/vespene_geyser_portrait.png';
        this.maxVespene = 5000;
        this.currentVespene = 5000;
        this.isDepleted = false;
        this.statusBarColor = '#00ff00'; // Green for vespene
        this.resourceType = 'vespene';
        this.hasRefinery = false;

        this.commands = []; // Geysers don't have commands.

        this.mesh = this.createMesh();
        this.mesh.position.copy(position);

        this.mesh.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.castShadow = true;
                child.userData.owner = this;
            }
        });
        
        this.gasParticles = this.mesh.children.filter(c => c.userData.isGas);

        this.selected = false;
        const selectionGeometry = new THREE.RingGeometry(2.4, 2.5, 32);
        const selectionMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide });
        this.selectionIndicator = new THREE.Mesh(selectionGeometry, selectionMaterial);
        this.selectionIndicator.rotation.x = -Math.PI / 2;
        this.selectionIndicator.position.y = 0.01;
        this.selectionIndicator.visible = false;
        this.mesh.add(this.selectionIndicator);

        // Define a collider
        this.collider = new THREE.Box3(
            new THREE.Vector3(-2, 0, -2),
            new THREE.Vector3(2, 1, 2)
        );
        this.collider.translate(this.mesh.position);
    }

    createMesh() {
        try {
            const asset = assetManager.get('extra_vespene_geyser');
            return this.createMeshFromGLB(asset);
        } catch (error) {
            const group = new THREE.Group();
            const moundMaterial = new THREE.MeshStandardMaterial({
                color: 0x60554a,
                roughness: 0.8,
                metalness: 0.1
            });

        // Create a mound shape
        const moundGeo = new THREE.CylinderGeometry(2, 3, 0.5, 12);
        const mound = new THREE.Mesh(moundGeo, moundMaterial);
        mound.position.y = 0.25;
        group.add(mound);

        // Create the geyser hole rim
        const rimGeo = new THREE.TorusGeometry(0.8, 0.3, 8, 16);
        const rim = new THREE.Mesh(rimGeo, moundMaterial);
        rim.rotation.x = Math.PI / 2;
        rim.position.y = 0.5;
        rim.name = 'geyser_rim';
        group.add(rim);

        // Create gas particles
        const gasMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });

        for (let i = 0; i < 20; i++) {
            const size = 0.2 + Math.random() * 0.5;
            const particleGeo = new THREE.PlaneGeometry(size, size);
            const particle = new THREE.Mesh(particleGeo, gasMaterial);
            
            particle.position.set(
                (Math.random() - 0.5) * 1.5,
                0.5 + Math.random() * 3, // Start at different heights
                (Math.random() - 0.5) * 1.5
            );
            particle.rotation.y = Math.random() * Math.PI * 2;
            
            particle.userData.isGas = true;
            particle.userData.velocity = 1 + Math.random() * 2; // Upward speed
            group.add(particle);
        }

        return group;
    }

    createMeshFromGLB(asset) {
        const model = asset.scene.clone();

        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const desired = new THREE.Vector3(4, 2, 4);
        const scale = Math.min(
            desired.x / size.x,
            desired.y / size.y,
            desired.z / size.z
        );

        if (scale > 0 && Number.isFinite(scale)) {
            model.scale.set(scale, scale, scale);
        }

        model.traverse(child => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                child.userData.owner = this;
            }
        });

        this.gasParticles = model.children.filter(c => c.userData?.isGas);

        return model;
    }
}

    update(delta) {
        if (this.isDepleted) return;

        this.gasParticles.forEach(particle => {
            particle.position.y += particle.userData.velocity * delta;
            particle.material.opacity = 0.3 * (1.0 - ((particle.position.y - 0.5) / 3.5)); // Fade as it rises

            if (particle.position.y > 4) {
                particle.position.y = 0.5;
                particle.position.x = (Math.random() - 0.5) * 1.5;
                particle.position.z = (Math.random() - 0.5) * 1.5;
                particle.userData.velocity = 1 + Math.random() * 2;
            }
        });
    }

    extract(amount) {
        if (this.isDepleted) return 0;

        const extractableAmount = Math.min(amount, this.currentVespene);
        this.currentVespene -= extractableAmount;

        if (this.currentVespene <= 0) {
            this.currentVespene = 0;
            this.isDepleted = true;
            // Hide gas particles when depleted
            this.gasParticles.forEach(p => p.visible = false);
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

    // Use getters to map vespene count to the UI's health bar properties
    get maxHealth() {
        return this.maxVespene;
    }
    
    get currentHealth() {
        return this.currentVespene;
    }
}