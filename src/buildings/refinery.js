import * as THREE from 'three';

export class Refinery {
    constructor(position, geyser, { isUnderConstruction = false, buildTime = 25.2 } = {}) {
        this.name = 'Refinery';
        this.portraitUrl = 'assets/images/refinery_portrait.png';
        this.maxHealth = 750;
        this.currentHealth = isUnderConstruction ? 1 : this.maxHealth;
        this.selected = false;
        this.isUnderConstruction = isUnderConstruction;
        this.buildTime = buildTime;
        
        this.geyser = geyser; // The geyser it's built on
        this.geyser.hasRefinery = true; // Mark the geyser so we don't build another one on it
        
        // Hide the original geyser visuals that would clip with the refinery
        this.geyser.gasParticles.forEach(p => p.visible = false);
        const rim = this.geyser.mesh.getObjectByName('geyser_rim');
        if (rim) {
            rim.visible = false;
        }

        this.commands = [];
        this.resourceType = 'vespene';

        this.mesh = this.createMesh();
        this.mesh.position.copy(position); // It's built ON the geyser, so same position.
        
        this.mesh.traverse((child) => {
            if (child.isMesh) {
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

        const selectionGeometry = new THREE.RingGeometry(2.4, 2.5, 32);
        const selectionMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide });
        this.selectionIndicator = new THREE.Mesh(selectionGeometry, selectionMaterial);
        this.selectionIndicator.rotation.x = -Math.PI / 2;
        this.selectionIndicator.position.y = 0.01;
        this.selectionIndicator.visible = false;
        this.mesh.add(this.selectionIndicator);

        this.collider = this.geyser.getCollider(); // Use geyser's collider
    }
    
    createMesh() {
        const group = new THREE.Group();
        const mainMaterial = new THREE.MeshStandardMaterial({ color: 0x8a9aaa, metalness: 0.7, roughness: 0.6 });
        const darkMaterial = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.8, roughness: 0.5 });

        // Main cylindrical structure
        const buildingGeo = new THREE.CylinderGeometry(2.2, 2.2, 2, 12);
        const building = new THREE.Mesh(buildingGeo, mainMaterial);
        building.position.y = 1;
        group.add(building);

        // Top part
        const topGeo = new THREE.CylinderGeometry(1.8, 2, 0.5, 12);
        const topPart = new THREE.Mesh(topGeo, darkMaterial);
        topPart.position.y = 2.25;
        group.add(topPart);

        // Central pipe going 'down'
        const pipeGeo = new THREE.CylinderGeometry(0.5, 0.5, 1.5, 8);
        const pipe = new THREE.Mesh(pipeGeo, darkMaterial);
        pipe.position.y = 0.25; // Sits on top of the geyser mound
        group.add(pipe);

        group.traverse(child => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

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
    
    extract(amount) {
        return this.geyser.extract(amount);
    }
    
    getCollider() { return this.collider; }
    select() { this.selected = true; this.selectionIndicator.visible = true; }
    deselect() { this.selected = false; this.selectionIndicator.visible = false; }
    
    update(delta, gameState) {
        if (this.isUnderConstruction) {
            const buildProgress = Math.max(0.01, this.currentHealth / this.maxHealth);
            this.mesh.scale.y = buildProgress;
        }
    }

    get isDepleted() {
        return this.geyser.isDepleted;
    }
}