import * as THREE from 'three';
import { getTerrainHeight } from '../utils/terrain.js';

export class SCVBase {
    constructor(position) {
        this.state = 'idle'; // idle, moving, movingToResource, gathering, returning, movingToGarrison
        this.isGarrisoned = false;
        this.garrisonTarget = null;
        this.isStuckOnDepot = false;
        this.stuckOnDepotInstance = null;

        this.targetResource = null;
        this.gatherPosition = null;
        this.dropOffPoint = null;
        this.resourceLoad = 0;
        this.resourceType = null; // 'minerals' or 'vespene'
        this.carryCapacity = 5;
        this.gatherTime = 2.0;
        this.gatherProgress = 0;

        this.baseY = position.y;
        this.mixer = null;

        this.selected = false;
        this.path = [];
        this.currentWaypointIndex = 0;
        this.speed = 3.5;

        this.driveTime = 0;
        this.driveFrequency = 15;
        this.driveAmplitude = 0.05;
    }

    stopActions() {
        if (this.targetResource && this.targetResource.removeMiner) {
            this.targetResource.removeMiner(this);
        }
        this.targetResource = null;
        this.gatherPosition = null;
        this.dropOffPoint = null;
        this.resourceLoad = 0;
        this.resourceType = null;

        if (this.buildingTarget) {
            this.buildingTarget = null;
        }

        if (this.garrisonTarget) {
            this.garrisonTarget = null;
        }
    }

    setupModel(model, position) {
        this.mesh = model;
        this.mesh.position.copy(position);

        const selectionGeometry = new THREE.RingGeometry(0.6, 0.7, 32);
        const selectionMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide });
        this.selectionIndicator = new THREE.Mesh(selectionGeometry, selectionMaterial);
        this.selectionIndicator.rotation.x = -Math.PI / 2;
        this.selectionIndicator.position.y = 0.01;
        this.selectionIndicator.visible = false;
        this.mesh.add(this.selectionIndicator);

        this.collider = new THREE.Box3().setFromObject(this.mesh);
    }

    addCarryVisuals(model) {
        this.mineralCarryMesh = new THREE.Mesh(
            new THREE.BoxGeometry(0.25, 0.25, 0.25),
            new THREE.MeshStandardMaterial({ color: 0x4169e1, emissive: 0x2030a0, emissiveIntensity: 0.5 })
        );
        this.mineralCarryMesh.position.set(0, 0.5, -0.3);
        this.mineralCarryMesh.visible = false;
        model.add(this.mineralCarryMesh);

        const gasMaterial = new THREE.SpriteMaterial({ color: 0x00ff00, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending });
        this.vespeneCarrySprite = new THREE.Sprite(gasMaterial);
        this.vespeneCarrySprite.scale.set(0.6, 0.6, 0.6);
        this.vespeneCarrySprite.position.set(0, 0.6, -0.3);
        this.vespeneCarrySprite.visible = false;
        model.add(this.vespeneCarrySprite);
    }

    select() {
        this.selected = true;
        this.selectionIndicator.visible = true;
    }

    deselect() {
        this.selected = false;
        this.selectionIndicator.visible = false;
    }

    garrison(bunker) {
        if (this.isGarrisoned) return;
        this.stopActions();
        this.state = 'movingToGarrison';
        this.garrisonTarget = bunker;
    }

    setPath(path) {
        if (this.isStuckOnDepot) return;
        if (path && path.length > 0) {
            this.path = path;
            this.currentWaypointIndex = 0;
        } else {
            this.path = [];
        }
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
            console.warn('SCV cannot gather, no resource or drop-off point found.');
            this.state = 'idle';
        }
    }

    findClosestDropOff(allBuildings) {
        let closest = null;
        let minDistance = Infinity;
        const depots = allBuildings.filter(b => b.name === 'Command Center');
        depots.forEach(building => {
            const distance = this.mesh.position.distanceToSquared(building.mesh.position);
            if (distance < minDistance) {
                minDistance = distance;
                closest = building;
            }
        });
        this.dropOffPoint = closest;
    }

    update(delta, pathfinder, gameState, allBuildings, scene) {
        if (this.isStuckOnDepot) {
            this.state = 'idle';
            this.path = [];
            return;
        }

        if (this.isGarrisoned) return;

        if (this.mixer) {
            this.mixer.update(delta);
        }

        this.mineralCarryMesh.visible = this.resourceType === 'minerals' && this.resourceLoad > 0;
        this.vespeneCarrySprite.visible = this.resourceType === 'vespene' && this.resourceLoad > 0;

        switch (this.state) {
            case 'idle':
                break;
            case 'moving':
                this.updateMovement(delta, scene, () => { this.state = 'idle'; });
                break;
            case 'movingToGarrison':
                if (!this.garrisonTarget) {
                    this.state = 'idle';
                    return;
                }
                this.updateMovement(delta, scene, () => {
                    this.garrisonTarget.addUnit(this);
                    this.garrisonTarget = null;
                    this.state = 'idle';
                });
                break;
            case 'movingToResource':
                if (!this.targetResource || this.targetResource.isDepleted) {
                    this.state = 'idle';
                    this.targetResource = null;
                    this.gatherPosition = null;
                    return;
                }
                if (!this.path || this.path.length === 0) {
                    const targetPos = this.gatherPosition || this.targetResource.mesh.position;
                    const newPath = pathfinder.findPath(this.mesh.position, targetPos);
                    this.setPath(newPath);
                    if (!this.path || this.path.length === 0) {
                        this.state = 'idle';
                        return;
                    }
                }
                this.updateMovement(delta, scene, () => {
                    this.mesh.lookAt(this.targetResource.mesh.position);
                    this.state = 'gathering';
                    this.gatherProgress = 0;
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
                        this.state = 'returning';
                        this.path = [];
                    } else {
                        this.state = 'idle';
                        this.targetResource = null;
                    }
                }
                break;
            case 'returning':
                 if (!this.dropOffPoint) {
                    this.findClosestDropOff(allBuildings);
                    if (!this.dropOffPoint) {
                        this.state = 'idle';
                        return;
                    }
                 }
                const dropOffPos = this.dropOffPoint.mesh.position;
                if (!this.path || this.path.length === 0) {
                    const newPath = pathfinder.findPath(this.mesh.position, dropOffPos);
                    this.setPath(newPath);
                    if (!this.path || this.path.length === 0) {
                        this.state = 'idle';
                        return;
                    }
                    this.state = 'returning';
                }
                this.updateMovement(delta, scene, () => {
                    if (this.resourceType === 'minerals') {
                        gameState.minerals += this.resourceLoad;
                    } else if (this.resourceType === 'vespene') {
                        gameState.vespene += this.resourceLoad;
                    }
                    this.resourceLoad = 0;
                    this.resourceType = null;

                    if (this.targetResource && !this.targetResource.isDepleted) {
                        this.state = 'movingToResource';
                        this.path = [];
                    } else {
                        this.state = 'idle';
                        this.targetResource = null;
                    }
                });
                break;
        }
    }

    updateMovement(delta, scene, onPathComplete) {
        if (!this.path || this.path.length === 0 || this.currentWaypointIndex >= this.path.length) {
            if (onPathComplete) onPathComplete();
            return;
        }

        const targetPosition = this.path[this.currentWaypointIndex];
        const targetY = getTerrainHeight(scene, targetPosition.x, targetPosition.z);
        targetPosition.y = targetY;
        this.baseY = getTerrainHeight(scene, this.mesh.position.x, this.mesh.position.z);

        const currentPos2D = new THREE.Vector2(this.mesh.position.x, this.mesh.position.z);
        const targetPos2D = new THREE.Vector2(targetPosition.x, targetPosition.z);
        const distance = currentPos2D.distanceTo(targetPos2D);

        if (distance < 0.2) {
            this.currentWaypointIndex++;
        } else {
            const direction = targetPosition.clone().sub(this.mesh.position);
            direction.y = 0;
            direction.normalize();

            const moveDistance = this.speed * delta;
            const moveVector = direction.clone().multiplyScalar(moveDistance);

            if (moveVector.length() > distance) {
                moveVector.setLength(distance);
            }

            this.mesh.position.add(moveVector);

            const lookAtTarget = new THREE.Vector3(targetPosition.x, this.mesh.position.y, targetPosition.z);
            this.mesh.lookAt(lookAtTarget);

            if (!this.mixer) {
                this.driveTime += delta;
                this.mesh.position.y = this.baseY + Math.abs(Math.sin(this.driveTime * this.driveFrequency) * this.driveAmplitude);
            }
        }

        if (this.currentWaypointIndex >= this.path.length) {
            this.path = [];
            if (!this.mixer) {
                this.mesh.position.y = this.baseY;
                this.driveTime = 0;
            }
            if (onPathComplete) onPathComplete();
        }
    }
}