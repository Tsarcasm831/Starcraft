import * as THREE from 'three';
import { getTerrainHeight } from '../utils/terrain.js';
import { Infantry } from './infantry.js';

export class Firebat extends Infantry {
    constructor(position) {
        super(position);

        this.name = 'Firebat';
        this.portraitUrl = 'assets/images/firebat_portrait.png';
        this.maxHealth = 50; // Firebats have more health than marines
        this.currentHealth = 50;
        
        this.commands = [
            { command: 'move', hotkey: 'M', icon: 'assets/images/move_icon.png', name: 'Move' },
            { command: 'stop', hotkey: 'S', icon: 'assets/images/stop_icon.png', name: 'Stop' },
            { command: 'hold', hotkey: 'H', icon: 'assets/images/hold_position_icon.png', name: 'Hold Position' },
            { command: 'patrol', hotkey: 'P', icon: 'assets/images/patrol_icon.png', name: 'Patrol' },
            { command: 'attack', hotkey: 'A', icon: 'assets/images/attack_icon.png', name: 'Attack' },
        ];

        this.mesh = this.createMesh();
        this.setup(position);
    }

    createMesh() {
        const group = new THREE.Group();

        const armorMaterial = new THREE.MeshStandardMaterial({ color: 0xaa6a6a, metalness: 0.6, roughness: 0.5 }); // More reddish armor
        const gunMaterial = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.7, roughness: 0.4 });
        const visorMaterial = new THREE.MeshStandardMaterial({ color: 0xff8c00, metalness: 0.9, roughness: 0.2, emissive: 0xff8c00, emissiveIntensity: 0.6 }); // Orange visor

        // Torso
        const torsoGeometry = new THREE.CylinderGeometry(0.45, 0.35, 0.9, 8); // Bulkier
        const torso = new THREE.Mesh(torsoGeometry, armorMaterial);
        torso.position.y = 0.45;
        torso.castShadow = true;
        group.add(torso);

        // Backpack (fuel tanks)
        const backpackGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.8, 8);
        const leftTank = new THREE.Mesh(backpackGeo, armorMaterial);
        leftTank.position.set(-0.2, 0.6, -0.3);
        leftTank.castShadow = true;
        group.add(leftTank);
        const rightTank = leftTank.clone();
        rightTank.position.x = 0.2;
        group.add(rightTank);

        // Head
        const headGeometry = new THREE.IcosahedronGeometry(0.25, 1);
        const head = new THREE.Mesh(headGeometry, armorMaterial);
        head.position.y = 1.05;
        head.castShadow = true;
        group.add(head);
        
        // Visor
        const visorGeometry = new THREE.BoxGeometry(0.3, 0.15, 0.05);
        const visor = new THREE.Mesh(visorGeometry, visorMaterial);
        visor.position.set(0, 1.05, 0.22);
        group.add(visor);

        // Shoulder pads
        const shoulderGeo = new THREE.SphereGeometry(0.3, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2); // Bigger
        const leftShoulder = new THREE.Mesh(shoulderGeo, armorMaterial);
        leftShoulder.position.set(0.5, 0.8, 0);
        leftShoulder.rotation.z = Math.PI / 8;
        leftShoulder.castShadow = true;
        group.add(leftShoulder);

        const rightShoulder = leftShoulder.clone();
        rightShoulder.position.x = -0.5;
        rightShoulder.rotation.z = -Math.PI / 8;
        group.add(rightShoulder);

        // Flamethrowers (on wrists)
        const flamethrowerGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.5, 8);
        const leftFlamer = new THREE.Mesh(flamethrowerGeo, gunMaterial);
        leftFlamer.rotation.x = Math.PI / 2;
        leftFlamer.position.set(0.5, 0.3, 0.3);
        group.add(leftFlamer);
        
        const rightFlamer = leftFlamer.clone();
        rightFlamer.position.x = -0.5;
        group.add(rightFlamer);

        group.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.userData.owner = this;
            }
        });

        group.scale.set(0.7, 0.7, 0.7);

        return group;
    }
}