import * as THREE from 'three';
import { getTerrainHeight } from '../utils/terrain.js';
import { Infantry } from './infantry.js';

export class Unit extends Infantry {
    constructor(position) {
        super(position);

        this.name = 'Terran Marine';
        this.portraitUrl = 'assets/images/marine_portrait.png';
        this.maxHealth = 40;
        this.currentHealth = 40;

        this.commands = [
            { command: 'move', hotkey: 'M', icon: 'assets/images/move_icon.png', name: 'Move' },
            { command: 'stop', hotkey: 'T', icon: 'assets/images/stop_icon.png', name: 'Stop' },
            { command: 'hold', hotkey: 'H', icon: 'assets/images/hold_position_icon.png', name: 'Hold Position' },
            { command: 'patrol', hotkey: 'P', icon: 'assets/images/patrol_icon.png', name: 'Patrol' },
            { command: 'attack', hotkey: 'A', icon: 'assets/images/attack_icon.png', name: 'Attack' },
        ];
        
        this.mesh = this.createMesh();
        this.setup(position);
    }

    createMesh() {
        const group = new THREE.Group();

        const armorMaterial = new THREE.MeshStandardMaterial({ color: 0x6a8aaa, metalness: 0.6, roughness: 0.5 });
        const gunMaterial = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.7, roughness: 0.4 });
        const visorMaterial = new THREE.MeshStandardMaterial({ color: 0x00d1ff, metalness: 0.9, roughness: 0.2, emissive: 0x00a1ff, emissiveIntensity: 0.6 });

        // Torso
        const torsoGeometry = new THREE.CylinderGeometry(0.35, 0.25, 0.8, 8);
        const torso = new THREE.Mesh(torsoGeometry, armorMaterial);
        torso.position.y = 0.4;
        torso.castShadow = true;
        group.add(torso);

        // Backpack
        const backpackGeo = new THREE.BoxGeometry(0.5, 0.6, 0.3);
        const backpack = new THREE.Mesh(backpackGeo, armorMaterial);
        backpack.position.set(0, 0.5, -0.25);
        backpack.castShadow = true;
        group.add(backpack);

        // Head
        const headGeometry = new THREE.IcosahedronGeometry(0.25, 1);
        const head = new THREE.Mesh(headGeometry, armorMaterial);
        head.position.y = 1.0;
        head.castShadow = true;
        group.add(head);
        
        // Visor
        const visorGeometry = new THREE.BoxGeometry(0.3, 0.15, 0.05);
        const visor = new THREE.Mesh(visorGeometry, visorMaterial);
        visor.position.set(0, 1.0, 0.22);
        group.add(visor);

        // Shoulder pads
        const shoulderGeo = new THREE.SphereGeometry(0.25, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2);
        const leftShoulder = new THREE.Mesh(shoulderGeo, armorMaterial);
        leftShoulder.position.set(0.4, 0.7, 0);
        leftShoulder.rotation.z = Math.PI / 8;
        leftShoulder.castShadow = true;
        group.add(leftShoulder);

        const rightShoulder = leftShoulder.clone();
        rightShoulder.position.x = -0.4;
        rightShoulder.rotation.z = -Math.PI / 8;
        group.add(rightShoulder);

        // Gun
        const gunGroup = new THREE.Group();
        const gunBodyGeo = new THREE.BoxGeometry(0.15, 0.2, 0.8);
        const gunBody = new THREE.Mesh(gunBodyGeo, gunMaterial);
        gunGroup.add(gunBody);

        const gunBarrelGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.2, 8);
        const gunBarrel = new THREE.Mesh(gunBarrelGeo, gunMaterial);
        gunBarrel.rotation.x = Math.PI / 2;
        gunBarrel.position.z = 0.6;
        gunGroup.add(gunBarrel);
        
        gunBody.castShadow = true;
        gunBarrel.castShadow = true;
        gunGroup.position.set(0.45, 0.4, 0.4);
        group.add(gunGroup);

        group.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.userData.owner = this;
            }
        });

        group.scale.set(0.7, 0.7, 0.7);

        return group;
    }
}