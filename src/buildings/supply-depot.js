import * as THREE from 'three';
import { assetManager } from '../utils/asset-manager.js';

export class SupplyDepot {
    constructor(position, onStateChangeCallback, { isUnderConstruction = false, buildTime = 30 } = {}) {
        this.name = 'Supply Depot';
        this.portraitUrl = 'assets/images/supply_depot_portrait.png';
        this.maxHealth = 500;
        this.currentHealth = isUnderConstruction ? 1 : 500;
        this.selected = false;
        this.isUnderConstruction = isUnderConstruction;
        this.buildTime = buildTime;

        // State: 'raised', 'lowered', 'animating_up', 'animating_down'
        this.state = 'raised'; 
        this.animationProgress = 0;
        this.animationDuration = 1.0; // 1 second to raise/lower

        this.onStateChange = onStateChangeCallback;
        this.unitsOnTop = [];

        this.mesh = this.createMesh();
        this.mesh.position.copy(position);

        this.mesh.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                child.userData.owner = this;
            }
        });

        if (this.isUnderConstruction) {
            this.mesh.scale.y = 0.01;
        }

        // Selection indicator
        const selectionGeometry = new THREE.RingGeometry(2.5, 2.7, 32);
        const selectionMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide });
        this.selectionIndicator = new THREE.Mesh(selectionGeometry, selectionMaterial);
        this.selectionIndicator.rotation.x = -Math.PI / 2;
        this.selectionIndicator.position.y = 0.01;
        this.selectionIndicator.visible = false;
        this.mesh.add(this.selectionIndicator);

        this.raisedCollider = new THREE.Box3(
            new THREE.Vector3(-2, 0, -2),
            new THREE.Vector3(2, 2.3, 2)
        );
    }

    get commands() {
        if (this.state === 'raised') {
            return [{ command: 'lower_depot', hotkey: 'L', icon: 'assets/images/lower_depot_icon.png', name: 'Lower Depot' }];
        } else if (this.state === 'lowered') {
            return [{ command: 'raise_depot', hotkey: 'R', icon: 'assets/images/raise_depot_icon.png', name: 'Raise Depot' }];
        }
        return []; // No commands while animating
    }

    createMesh() {
        try {
            const asset = assetManager.get('extra_supply_depot');
            return this.createMeshFromGLB(asset);
        } catch (error) {
            console.warn('Could not load supply depot model, using procedural fallback.', error);
            return this.createProceduralMesh();
        }
    }

    createProceduralMesh() {
        const group = new THREE.Group();
        const depotMaterial = new THREE.MeshStandardMaterial({ color: 0x7a8a9a, metalness: 0.8, roughness: 0.5 });
        const darkMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });

        // Base that stays on the ground
        const baseGeo = new THREE.BoxGeometry(4, 0.1, 4);
        const base = new THREE.Mesh(baseGeo, darkMaterial);
        base.position.y = 0.05;
        group.add(base);

        // The part that moves
        this.movablePart = new THREE.Group();
        const wallGeo = new THREE.BoxGeometry(3.8, 2, 3.8);
        const wall = new THREE.Mesh(wallGeo, depotMaterial);
        this.movablePart.add(wall);

        // Add some greebles
        const greebleGeo = new THREE.BoxGeometry(0.5, 2.2, 0.5);
        const greeble1 = new THREE.Mesh(greebleGeo, darkMaterial);
        greeble1.position.set(1.6, 0, 1.6);
        this.movablePart.add(greeble1);

        const greeble2 = greeble1.clone();
        greeble2.position.set(-1.6, 0, 1.6);
        this.movablePart.add(greeble2);

        const greeble3 = greeble1.clone();
        greeble3.position.set(1.6, 0, -1.6);
        this.movablePart.add(greeble3);

        const greeble4 = greeble1.clone();
        greeble4.position.set(-1.6, 0, -1.6);
        this.movablePart.add(greeble4);
        
        this.movablePart.position.y = 1.2; // Raised position
        group.add(this.movablePart);

        if (this.isUnderConstruction) {
            group.traverse(child => {
                if (child.isMesh) {
                    child.material = child.material.clone();
                    child.material.transparent = true;
                    child.material.opacity = 0.5;
                }
            });
        }

        return group;
    }

    createMeshFromGLB(asset) {
        const model = asset.scene.clone();

        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const desired = new THREE.Vector3(4, 2.3, 4);
        const scale = Math.min(
            desired.x / size.x,
            desired.y / size.y,
            desired.z / size.z
        );

        if (scale > 0 && Number.isFinite(scale)) {
            model.scale.set(scale, scale, scale);
        }

        const wrapper = new THREE.Group();
        this.movablePart = wrapper; // entire model moves when raising/lowering
        wrapper.add(model);
        this.movablePart.position.y = 1.2; // Raised position like procedural version

        wrapper.traverse(child => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                child.userData.owner = this;
            }
        });

        return wrapper;
    }

    getCollider() {
        // When lowered or lowering, the depot has no collision for pathfinding.
        if (this.state === 'lowered' || this.state === 'animating_down') {
            // Return an empty box that won't register as an obstacle.
            return new THREE.Box3();
        }
        // Raised or raising depots are full obstacles.
        return this.raisedCollider.clone().translate(this.mesh.position);
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
        
        // This is the original logic for when a depot is finished being built
        gameState.supplyCap += 8;
        if (this.onStateChange) {
            this.onStateChange();
        }
    }

    select() { this.selected = true; this.selectionIndicator.visible = true; }
    deselect() { this.selected = false; this.selectionIndicator.visible = false; }

    executeCommand(commandName, gameState) {
        if (commandName === 'lower_depot' && this.state === 'raised') {
            this.state = 'animating_down';
            this.animationProgress = 0;
            this.onStateChange(); // Update pathfinding grid immediately

        } else if (commandName === 'raise_depot' && this.state === 'lowered') {
            this.state = 'animating_up';
            this.animationProgress = 0;
            this.onStateChange(); // Make it an obstacle immediately

            // Find and capture units on top
            const footprint = new THREE.Box3().setFromCenterAndSize(this.mesh.position, new THREE.Vector3(4, 10, 4));
            gameState.units.forEach(unit => {
                if (!unit.isGarrisoned && footprint.containsPoint(unit.mesh.position)) {
                    unit.isStuckOnDepot = true;
                    unit.stuckOnDepotInstance = this;
                    this.unitsOnTop.push(unit);
                }
            });
        }
    }

    update(delta, gameState) {
        if (this.isUnderConstruction) {
            const buildProgress = this.currentHealth / this.maxHealth;
            this.mesh.scale.y = Math.max(0.01, buildProgress);
            return; // Don't run other update logic while constructing
        }

        const raisedY = 1.2;
        const loweredY = -1.0;
        const platformTopOffset = 1.1; // Top of the movable part's wall

        const updateUnitsOnTop = () => {
            this.unitsOnTop.forEach(unit => {
                if (unit.isStuckOnDepot && unit.stuckOnDepotInstance === this) {
                    unit.mesh.position.y = this.movablePart.position.y + platformTopOffset;
                }
            });
        };

        if (this.state === 'animating_down') {
            this.animationProgress += delta / this.animationDuration;
            this.movablePart.position.y = THREE.MathUtils.lerp(raisedY, loweredY, this.animationProgress);
            updateUnitsOnTop();

            if (this.animationProgress >= 1) {
                this.movablePart.position.y = loweredY;
                this.state = 'lowered';
                this.animationProgress = 0;

                // Release any units that were on top
                this.unitsOnTop.forEach(unit => {
                    if (unit.isStuckOnDepot && unit.stuckOnDepotInstance === this) {
                        unit.isStuckOnDepot = false;
                        unit.stuckOnDepotInstance = null;
                    }
                });
                this.unitsOnTop = [];
            }
        } else if (this.state === 'animating_up') {
            this.animationProgress += delta / this.animationDuration;
            this.movablePart.position.y = THREE.MathUtils.lerp(loweredY, raisedY, this.animationProgress);
            updateUnitsOnTop();
            if (this.animationProgress >= 1) {
                this.movablePart.position.y = raisedY;
                this.state = 'raised';
                this.animationProgress = 0;
                this.onStateChange(); // Update pathfinding grid after it's fully raised
            }
        }
    }

    onBuildComplete(gameState) {
        gameState.supplyCap += 8;
    }
}