import * as THREE from 'three';

export class MissileTurret {
    constructor(position, { isUnderConstruction = false, buildTime = 18.9 } = {}) {
        this.name = 'Missile Turret';
        this.portraitUrl = 'assets/images/missile_turret_portrait.png';
        this.maxHealth = 200;
        this.currentHealth = isUnderConstruction ? 1 : this.maxHealth;
        this.selected = false;
        this.isUnderConstruction = isUnderConstruction;
        this.buildTime = buildTime;

        this.commands = []; // No commands

        this.mesh = this.createMesh();
        this.mesh.position.copy(position);

        this.mesh.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                child.userData.owner = this;
            }
        });

        if (this.isUnderConstruction) {
            this.mesh.scale.y = 0.01;
            this.mesh.traverse(child => {
                if (child.isMesh) {
                    child.material = child.material.clone();
                    child.material.transparent = true;
                    child.material.opacity = 0.5;
                }
            });
        }

        const selectionGeometry = new THREE.RingGeometry(1.8, 2.0, 32);
        const selectionMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide });
        this.selectionIndicator = new THREE.Mesh(selectionGeometry, selectionMaterial);
        this.selectionIndicator.rotation.x = -Math.PI / 2;
        this.selectionIndicator.position.y = 0.01;
        this.selectionIndicator.visible = false;
        this.mesh.add(this.selectionIndicator);
        
        const buildingWidth = 3;
        const buildingDepth = 3;
        const buildingHeight = 5;
        this.collider = new THREE.Box3(
            new THREE.Vector3(-buildingWidth / 2, 0, -buildingDepth / 2),
            new THREE.Vector3(buildingWidth / 2, buildingHeight, buildingDepth / 2)
        );
        this.collider.translate(this.mesh.position);
    }

    createMesh() {
        const group = new THREE.Group();
        const mainMaterial = new THREE.MeshStandardMaterial({ color: 0x7a8a9a, metalness: 0.7, roughness: 0.6 });
        const accentMaterial = new THREE.MeshStandardMaterial({ color: 0x4a5a6a, metalness: 0.8, roughness: 0.5 });
        
        // Base structure
        const baseGeo = new THREE.CylinderGeometry(1.5, 1.5, 0.5, 8);
        const base = new THREE.Mesh(baseGeo, mainMaterial);
        base.position.y = 0.25;
        group.add(base);

        // Tower part
        const towerGeo = new THREE.CylinderGeometry(0.8, 1, 3, 8);
        const tower = new THREE.Mesh(towerGeo, mainMaterial);
        tower.position.y = 2;
        group.add(tower);

        // Rotating head
        this.head = new THREE.Group();
        const headBaseGeo = new THREE.SphereGeometry(0.7, 8, 6);
        const headBase = new THREE.Mesh(headBaseGeo, accentMaterial);
        this.head.add(headBase);
        this.head.position.y = 3.5;
        group.add(this.head);

        // Missile Pods
        const podGeo = new THREE.BoxGeometry(0.5, 1.5, 0.5);
        const leftPod = new THREE.Mesh(podGeo, accentMaterial);
        leftPod.position.set(-0.5, 0.5, 0);
        leftPod.rotation.z = -Math.PI / 12;
        this.head.add(leftPod);

        const rightPod = leftPod.clone();
        rightPod.position.x = 0.5;
        rightPod.rotation.z = Math.PI / 12;
        this.head.add(rightPod);

        return group;
    }

    onConstructionComplete(gameState) {
        this.isUnderConstruction = false;
        this.currentHealth = this.maxHealth;
        this.mesh.scale.y = 1.0;
        
        this.mesh.traverse(child => {
            if (child.isMesh && child.material.transparent === true) {
                child.material.opacity = 1.0;
                child.material.transparent = false;
            }
        });
    }

    getCollider() { return this.collider; }
    select() { this.selected = true; this.selectionIndicator.visible = true; }
    deselect() { this.selected = false; this.selectionIndicator.visible = false; }
    
    update(delta, gameState) {
        if (this.isUnderConstruction) {
            const buildProgress = Math.max(0.01, this.currentHealth / this.maxHealth);
            this.mesh.scale.y = buildProgress;
        } else {
            // Simple rotation to show it's active
            if(this.head) {
                this.head.rotation.y += delta * 0.5;
            }
        }
    }
}