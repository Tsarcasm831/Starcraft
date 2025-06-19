import * as THREE from 'three';
import { assetManager } from '../utils/asset-manager.js';
import { SCVBase } from './scv-base.js';

export class SCV extends SCVBase {
    constructor(position) {
        super(position);
        this.name = 'SCV';
        this.portraitUrl = 'assets/images/scv_portrait.png';
        this.maxHealth = 60;
        this.currentHealth = 60;

        this.carryCapacity = 5;
        this.gatherTime = 2.0; // seconds to gather

        this.commands = [
            { command: 'move', hotkey: 'M', icon: 'assets/images/move_icon.png', name: 'Move' },
            { command: 'stop', hotkey: 'S', icon: 'assets/images/stop_icon.png', name: 'Stop' },
            { command: 'hold', hotkey: 'H', icon: 'assets/images/hold_position_icon.png', name: 'Hold Position' },
            { command: 'patrol', hotkey: 'P', icon: 'assets/images/patrol_icon.png', name: 'Patrol' },
            { command: 'gather', hotkey: 'G', icon: 'assets/images/gather_icon.png', name: 'Gather' },
            // TODO: Repair, Build commands
        ];

        this.mixer = null; // Animation mixer

        // Try to use GLB model, otherwise fallback to procedural
        try {
            const scvAsset = assetManager.get('scv');
            this.mesh = this.createMeshFromGLB(scvAsset);

            // Setup animations
            if (scvAsset.animations && scvAsset.animations.length) {
                this.mixer = new THREE.AnimationMixer(this.mesh);
                // Just play the first animation clip found on a loop.
                const action = this.mixer.clipAction(scvAsset.animations[0]);
                action.play();
            }
        } catch (error) {
            this.mesh = this.createProceduralMesh();
        }

        this.setupModel(this.mesh, position);
        this.speed = 3.5; // SCVs are a bit slower than marines
    }

    createMeshFromGLB(asset) {
        const model = asset.scene.clone();

        // Scale it down to be the same size as the current SCVs
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const desiredSize = 0.9; // Target largest dimension
        const maxDim = Math.max(size.x, size.y, size.z);
        
        if (maxDim > 0) { // Avoid division by zero
            const scale = desiredSize / maxDim;
            model.scale.set(scale, scale, scale);
        }

        // Center the model so it sits on the ground
        const scaledBox = new THREE.Box3().setFromObject(model);
        model.position.y = -scaledBox.min.y;

        model.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.userData.owner = this;
            }
        });
        
        this.addCarryVisuals(model);
        return model;
    }

    createProceduralMesh() {
        const group = new THREE.Group();
        const scvMaterial = new THREE.MeshStandardMaterial({ color: 0xffcc00, metalness: 0.6, roughness: 0.5 });
        const darkMaterial = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.7, roughness: 0.4 });
        const cockpitMaterial = new THREE.MeshStandardMaterial({ color: 0x00a1ff, emissive: 0x00a1ff, emissiveIntensity: 0.5, transparent: true, opacity: 0.8 });

        // Body
        const bodyGeo = new THREE.BoxGeometry(0.8, 0.6, 1);
        const body = new THREE.Mesh(bodyGeo, scvMaterial);
        body.position.y = 0.4;
        body.castShadow = true;
        group.add(body);

        // Cockpit
        const cockpitGeo = new THREE.BoxGeometry(0.5, 0.3, 0.2);
        const cockpit = new THREE.Mesh(cockpitGeo, cockpitMaterial);
        cockpit.position.set(0, 0.6, 0.45);
        group.add(cockpit);

        // Arms (simple cylinders for now)
        const armGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.6, 6);
        const leftArm = new THREE.Mesh(armGeo, darkMaterial);
        leftArm.position.set(0.5, 0.4, 0);
        leftArm.rotation.z = Math.PI / 4;
        leftArm.castShadow = true;
        group.add(leftArm);

        const rightArm = leftArm.clone();
        rightArm.position.x = -0.5;
        rightArm.rotation.z = -Math.PI / 4;
        group.add(rightArm);
        
        // Treads/Wheels (represented by boxes)
        const treadGeo = new THREE.BoxGeometry(0.2, 0.3, 1.2);
        const leftTread = new THREE.Mesh(treadGeo, darkMaterial);
        leftTread.position.set(0.5, 0.15, 0);
        leftTread.castShadow = true;
        group.add(leftTread);

        const rightTread = leftTread.clone();
        rightTread.position.x = -0.5;
        group.add(rightTread);

        group.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.userData.owner = this;
            }
        });

        group.scale.set(0.8, 0.8, 0.8);
        this.addCarryVisuals(group);
        return group;
    }
}
