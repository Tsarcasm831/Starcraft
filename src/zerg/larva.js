import * as THREE from 'three';
import { Infantry } from '../units/infantry.js';

export class Larva extends Infantry {
    constructor(position) {
        super(position);
        this.name = 'Larva';
        this.portraitUrl = 'assets/images/zerg/larva_portrait.png';
        this.maxHealth = 25;
        this.currentHealth = 25;
        this.speed = 2;
        this.commands = [];
        this.mesh = this.createProceduralMesh();
        this.setup(position);
    }

    createProceduralMesh() {
        const body = new THREE.Mesh(
            new THREE.SphereGeometry(0.3, 8, 8),
            new THREE.MeshStandardMaterial({ color: 0xaa55ff })
        );
        body.position.y = 0.3;
        body.castShadow = true;
        body.userData.owner = this;
        return body;
    }
}
