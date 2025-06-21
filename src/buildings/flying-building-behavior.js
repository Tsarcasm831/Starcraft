import * as THREE from 'three';

export class FlyingBuildingBehavior {
    constructor(building, { onStateChange, hoverHeight = 5, animationDuration = 3.0, speed = 10 }) {
        this.building = building;
        this.onStateChange = onStateChange;

        // Flying properties
        this.state = 'grounded'; // grounded, lifting, flying, landing, movingToLand
        this.animationProgress = 0;
        this.animationDuration = animationDuration;
        this.hoverHeight = hoverHeight;
        this.path = [];
        this.currentWaypointIndex = 0;
        this.speed = speed;
        this.targetLandPosition = null;
    }

    liftOff() {
        if (this.state !== 'grounded') return false;
        // Cannot lift with addon
        if (this.building.addonBehavior && this.building.addonBehavior.addon) return false; 
        if (this.building.addon) return false;

        this.state = 'lifting';
        this.animationProgress = 0;
        this.onStateChange();
        return true;
    }

    landAt(position, pathfinder) {
        if (this.state !== 'flying') return;
        this.targetLandPosition = position.clone();
        this.targetLandPosition.y = this.hoverHeight;
        
        const path = pathfinder.findPath(this.building.mesh.position, this.targetLandPosition);
        this.setPath(path ? path.map(p => new THREE.Vector3(p.x, this.hoverHeight, p.z)) : [this.targetLandPosition]);

        this.state = 'movingToLand';
    }

    setPath(path) {
        if (this.state !== 'flying' && this.state !== 'movingToLand') return;
        if (path && path.length > 0) {
            this.path = path;
            this.currentWaypointIndex = 0;
        } else {
            this.path = [];
        }
    }

    getCollider() {
        if (this.state === 'flying' || this.state === 'lifting' || this.state === 'landing') {
            return new THREE.Box3(); // No collision when airborne
        }
        // The building itself will provide its ground collider.
        return this.building.groundCollider;
    }

    update(delta) {
        const leftPod = this.building.mesh.getObjectByName("leftPod");
        const rightPod = this.building.mesh.getObjectByName("rightPod");

        if (this.state === 'lifting') {
            this.animationProgress += delta / this.animationDuration;
            const t = Math.min(this.animationProgress, 1.0);

            // Animate pods retracting
            if (leftPod) leftPod.position.x = THREE.MathUtils.lerp(-5.5, -3.5, t);
            if (rightPod) rightPod.position.x = THREE.MathUtils.lerp(5.5, 3.5, t);

            // Animate lifting
            this.building.mesh.position.y = THREE.MathUtils.lerp(0, this.hoverHeight, t);

            if (this.animationProgress >= 1) {
                this.state = 'flying';
                this.animationProgress = 0;
                this.onStateChange();
            }
        } else if (this.state === 'landing') {
            this.animationProgress += delta / this.animationDuration;
            const t = Math.min(this.animationProgress, 1.0);
            
            // Animate landing
            this.building.mesh.position.y = THREE.MathUtils.lerp(this.hoverHeight, 0, t);
            
            // Animate pods extending
            if (leftPod) leftPod.position.x = THREE.MathUtils.lerp(-3.5, -5.5, t);
            if (rightPod) rightPod.position.x = THREE.MathUtils.lerp(3.5, 5.5, t);

            if (this.animationProgress >= 1) {
                this.state = 'grounded';
                this.animationProgress = 0;
                this.building.mesh.position.y = 0;
                this.targetLandPosition = null;
                this.onStateChange(); // Re-enable pathfinding collision
            }
        } else if (this.state === 'flying') {
            // Bobbing animation
            this.animationProgress += delta * 2; // Some arbitrary speed
            this.building.mesh.position.y = this.hoverHeight + Math.sin(this.animationProgress) * 0.25;

            // Movement logic
            if (this.path && this.path.length > 0 && this.currentWaypointIndex < this.path.length) {
                const targetPosition = this.path[this.currentWaypointIndex];
                const distance = this.building.mesh.position.distanceTo(targetPosition);

                if (distance < 0.5) {
                    this.currentWaypointIndex++;
                } else {
                    const direction = targetPosition.clone().sub(this.building.mesh.position).normalize();
                    this.building.mesh.position.add(direction.multiplyScalar(this.speed * delta));
                }
            }
        } else if (this.state === 'movingToLand') {
            // Bobbing animation
            this.animationProgress += delta * 2; // Some arbitrary speed
            this.building.mesh.position.y = this.hoverHeight + Math.sin(this.animationProgress) * 0.25;

            // Movement logic
            if (this.path && this.path.length > 0) {
                const targetPosition = this.path[0]; // always moving to the single landing spot
                const distanceSq = this.building.mesh.position.distanceToSquared(targetPosition);

                if (distanceSq < 0.25) { // Arrived at landing spot
                    this.path = [];
                    this.state = 'landing';
                    this.animationProgress = 0;
                } else {
                    const direction = targetPosition.clone().sub(this.building.mesh.position).normalize();
                    this.building.mesh.position.add(direction.multiplyScalar(this.speed * delta));
                }
            }
        }
    }
}