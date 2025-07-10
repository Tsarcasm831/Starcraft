import * as THREE from 'three';
import { Infantry } from '../units/infantry.js';
import { assetManager } from '../utils/asset-manager.js';

export class Hydralisk extends Infantry {
    constructor(position) {
        super(position);
        this.name = 'Hydralisk';
        this.portraitUrl = 'assets/images/zerg/hydralisk_portrait.png';
        this.maxHealth = 80;
        this.currentHealth = 80;
        this.speed = 3.5;
        this.commands = [
            { command: 'move', hotkey: 'M', icon: 'assets/images/move_icon.png', name: 'Move' },
            { command: 'stop', hotkey: 'S', icon: 'assets/images/stop_icon.png', name: 'Stop' },
            { command: 'attack', hotkey: 'A', icon: 'assets/images/attack_icon.png', name: 'Attack' },
        ];
        try {
            const asset = assetManager.get('zerg_hydralisk');
            this.mesh = this.createMeshFromGLB(asset);
        } catch (e) {
            console.warn('Could not load hydralisk model, using procedural fallback.', e);
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
        model.traverse(child => {
            if (child.isMesh) {
                child.castShadow = true;
                child.userData.owner = this;
            }
        });
        return model;
    }

    createProceduralMesh() {
        const body = new THREE.Mesh(
            new THREE.ConeGeometry(0.5, 1.5, 6),
            new THREE.MeshStandardMaterial({ color: 0x663388 })
        );
        body.position.y = 0.75;
        body.castShadow = true;
        body.userData.owner = this;
        return body;
    }
}
