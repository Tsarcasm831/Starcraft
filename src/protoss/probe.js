import * as THREE from 'three';
import { assetManager } from '../utils/asset-manager.js';
import { getTerrainHeight } from '../utils/terrain.js';

export class Probe {
    constructor(position) {
        const unitData = assetManager.get('unit_probe').stats;
        this.name = 'Probe';
        this.portraitUrl = 'assets/images/protoss/probe_portrait.png';
        
        this.maxHealth = unitData.health;
        this.currentHealth = unitData.health;
        this.maxShields = unitData.shields;
        this.currentShields = unitData.shields;
        this.armor = unitData.armor;
        this.timeSinceLastDamage = Infinity;
        
        this.state = 'idle'; // idle, moving, movingToResource, gathering, returning
        this.isGarrisoned = false; // Cannot be garrisoned
        this.isStuckOnDepot = false; // Not really applicable but for consistency
        this.stuckOnDepotInstance = null;
        this.isFlying = true; // Probes hover

        this.targetResource = null;
        this.gatherPosition = null;
        this.dropOffPoint = null;
        this.resourceLoad = 0;
        this.resourceType = null;
        this.carryCapacity = unitData.carryCapacity;
        this.gatherTime = unitData.gatherTime;
        this.gatherProgress = 0;

        this.shieldRechargeDelay = 7; // Standard for all Protoss units with shields
        
        /** @tweakable Shield recharge rate for Probes (shields per second). */
        this.shieldRechargeRate = 2;

        this.commands = [
            { command: 'move', hotkey: 'M', icon: 'assets/images/move_icon.png', name: 'Move' },
            { command: 'stop', hotkey: 'S', icon: 'assets/images/stop_icon.png', name: 'Stop' },
            { command: 'hold', hotkey: 'H', icon: 'assets/images/hold_position_icon.png', name: 'Hold Position' },
            { command: 'patrol', hotkey: 'P', icon: 'assets/images/patrol_icon.png', name: 'Patrol' },
            { command: 'gather', hotkey: 'G', icon: 'assets/images/gather_icon.png', name: 'Gather' },
            { command: 'attack', hotkey: 'A', icon: 'assets/images/attack_icon.png', name: 'Attack' },
        ];
        
        this.hoverHeight = 0.5;
        this.baseY = position.y + this.hoverHeight;
        
        try {
            const asset = assetManager.get('protoss_probe');
            this.mesh = this.createMeshFromGLB(asset);
        } catch (error) {
            console.warn("Could not load probe model, using procedural fallback.", error);
            this.mesh = this.createProceduralMesh();
        }

        this.mesh.position.copy(position);
        this.mesh.position.y = this.baseY;

        this.selected = false;
        this.path = [];
        this.currentWaypointIndex = 0;
        this.speed = unitData.speed;

        this.driveTime = Math.random() * Math.PI * 2;
        this.driveFrequency = 8;
        this.driveAmplitude = 0.1;

        const selectionGeometry = new THREE.RingGeometry(0.6, 0.7, 32);
        const selectionMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide });
        this.selectionIndicator = new THREE.Mesh(selectionGeometry, selectionMaterial);
        this.selectionIndicator.rotation.x = -Math.PI / 2;
        this.selectionIndicator.position.y = position.y + 0.01;
        this.selectionIndicator.visible = false;
        this.selectionIndicator.userData.owner = this;
        
        this.collider = new THREE.Box3().setFromObject(this.mesh);
        
        this.addCarryVisuals(this.mesh);
    }
    
    addCarryVisuals(model) {
        // Probe warps resources, so just a glow
        const glowMaterial = new THREE.SpriteMaterial({ color: 0x41aeff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending });
        this.resourceGlow = new THREE.Sprite(glowMaterial);
        this.resourceGlow.scale.set(1.5, 1.5, 1.5);
        this.resourceGlow.position.set(0, 0.2, 0);
        model.add(this.resourceGlow);
    }

    createMeshFromGLB(asset) {
        const model = asset.scene.clone();

        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const desiredSize = 1.0; 
        const maxDim = Math.max(size.x, size.y, size.z);
        
        if (maxDim > 0) {
            const scale = desiredSize / maxDim;
            model.scale.set(scale, scale, scale);
        }
        
        const scaledBox = new THREE.Box3().setFromObject(model);
        model.position.y = -scaledBox.min.y;

        const wrapper = new THREE.Group();
        wrapper.add(model);

        wrapper.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                child.userData.owner = this;
            }
        });
        
        return wrapper;
    }

    createProceduralMesh() {
        const group = new THREE.Group();
        const mainMaterial = new THREE.MeshStandardMaterial({ color: 0xdaa520, metalness: 0.8, roughness: 0.4 });
        const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x00a1ff, emissive: 0x00a1ff, emissiveIntensity: 0.8 });

        const bodyGeo = new THREE.IcosahedronGeometry(0.5, 1);
        const body = new THREE.Mesh(bodyGeo, mainMaterial);
        group.add(body);

        const eyeGeo = new THREE.SphereGeometry(0.2, 16, 8);
        const eye = new THREE.Mesh(eyeGeo, eyeMaterial);
        eye.position.z = 0.4;
        group.add(eye);
        
        group.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                child.userData.owner = this;
            }
        });
        
        return group;
    }
    
    select() { this.selected = true; this.selectionIndicator.visible = true; }
    deselect() { this.selected = false; this.selectionIndicator.visible = false; }
    
    stopActions() {
        if (this.targetResource && this.targetResource.removeMiner) {
            this.targetResource.removeMiner(this);
        }
        this.targetResource = null;
        this.gatherPosition = null;
        this.dropOffPoint = null;
        this.resourceLoad = 0;
        this.resourceType = null;
    }
    
    setPath(path) {
        if (path && path.length > 0) {
            this.path = path;
            this.currentWaypointIndex = 0;
        } else {
            this.path = [];
        }
    }
    
    findClosestDropOff(allBuildings) {
        let closest = null;
        let minDistance = Infinity;
        // Probes drop off at a Nexus, which isn't in the game yet.
        // As a fallback, they'll use the Command Center.
        const depots = allBuildings.filter(b => b.name === 'Command Center' || b.name === 'Nexus');
        if (depots.length === 0) return;

        depots.forEach(building => {
            const distance = this.mesh.position.distanceToSquared(building.mesh.position);
            if (distance < minDistance) {
                minDistance = distance;
                closest = building;
            }
        });
        this.dropOffPoint = closest;
    }

    gather(resource, allBuildings, gatherPosition) {
        this.stopActions();
        this.targetResource = resource;
        if (typeof this.targetResource.addMiner === 'function') {
            this.targetResource.addMiner(this);
        }
        this.gatherPosition = gatherPosition;
        this.findClosestDropOff(allBuildings);
        if (this.targetResource && this.dropOffPoint) {
            this.state = 'movingToResource';
            this.path = [];
        } else {
            this.state = 'idle';
        }
    }

    update(delta, pathfinder, gameState, buildings, scene) {
        this.timeSinceLastDamage += delta;
        if (this.currentShields < this.maxShields && this.timeSinceLastDamage > this.shieldRechargeDelay) {
            this.currentShields += this.shieldRechargeRate * delta;
            if (this.currentShields > this.maxShields) {
                this.currentShields = this.maxShields;
            }
        }
        
        if (this.resourceLoad > 0) {
            this.resourceGlow.material.opacity = 0.8;
            this.resourceGlow.material.color.set(this.resourceType === 'minerals' ? 0x41aeff : 0x00ff00);
        } else {
            this.resourceGlow.material.opacity = 0;
        }

        switch (this.state) {
            case 'idle':
                 this.driveTime += delta;
                 this.mesh.position.y = this.baseY + Math.sin(this.driveTime * this.driveFrequency) * this.driveAmplitude;
                break;
            case 'moving':
                this.updateMovement(delta, scene, () => { this.state = 'idle'; });
                break;
            case 'movingToResource':
                if (!this.targetResource || this.targetResource.isDepleted) {
                    this.state = 'idle'; this.targetResource = null; this.gatherPosition = null; return;
                }
                if (!this.path || this.path.length === 0) {
                    const targetPos = this.gatherPosition || this.targetResource.mesh.position;
                    this.setPath(pathfinder.findPath(this.mesh.position, targetPos));
                    if (!this.path || this.path.length === 0) { this.state = 'idle'; return; }
                }
                this.updateMovement(delta, scene, () => {
                    this.mesh.lookAt(this.targetResource.mesh.position);
                    this.state = 'gathering'; this.gatherProgress = 0;
                });
                break;
            case 'gathering':
                this.gatherProgress += delta;
                if (this.gatherProgress >= this.gatherTime) {
                    this.gatherProgress = 0;
                    const amountExtracted = this.targetResource.extract(this.carryCapacity);
                    if (amountExtracted > 0) {
                        this.resourceLoad = amountExtracted;
                        this.resourceType = this.targetResource.resourceType;
                        this.state = 'returning'; this.path = [];
                    } else {
                        this.state = 'idle';
                        this.targetResource = null;
                    }
                }
                break;
            case 'returning':
                 if (!this.dropOffPoint) {
                    this.findClosestDropOff(buildings);
                    if (!this.dropOffPoint) { this.state = 'idle'; return; }
                 }
                if(!this.path || this.path.length === 0) {
                    this.setPath(pathfinder.findPath(this.mesh.position, this.dropOffPoint.mesh.position));
                    if(!this.path || this.path.length === 0) { this.state = 'idle'; return; }
                }
                this.updateMovement(delta, scene, () => {
                    if (this.resourceType === 'minerals') gameState.minerals += this.resourceLoad;
                    else if (this.resourceType === 'vespene') gameState.vespene += this.resourceLoad;
                    this.resourceLoad = 0; this.resourceType = null;
                    if (this.targetResource && !this.targetResource.isDepleted) {
                        this.state = 'movingToResource'; this.path = [];
                    } else {
                        this.state = 'idle'; this.targetResource = null;
                    }
                });
                break;
        }

        this.selectionIndicator.position.set(this.mesh.position.x, 0.01, this.mesh.position.z);
    }

    updateMovement(delta, scene, onPathComplete) {
        if (!this.path || this.path.length === 0 || this.currentWaypointIndex >= this.path.length) {
            if (onPathComplete) onPathComplete();
            return;
        }
        const targetPosition = this.path[this.currentWaypointIndex];
        const targetY = getTerrainHeight(scene, targetPosition.x, targetPosition.z);
        targetPosition.y = targetY + this.hoverHeight;
        const distance = this.mesh.position.distanceTo(targetPosition);

        if (distance < 0.2) {
            this.currentWaypointIndex++;
        } else {
            const direction = targetPosition.clone().sub(this.mesh.position).normalize();
            const moveDistance = this.speed * delta;
            const moveVector = direction.clone().multiplyScalar(moveDistance);

            if (moveVector.length() > distance) moveVector.setLength(distance);

            this.mesh.position.add(moveVector);

            const lookAtTarget = new THREE.Vector3(targetPosition.x, this.mesh.position.y, targetPosition.z);
            this.mesh.lookAt(lookAtTarget);
        }
        
        if (this.currentWaypointIndex >= this.path.length) {
            this.path = [];
            if (onPathComplete) onPathComplete();
        }
    }
}