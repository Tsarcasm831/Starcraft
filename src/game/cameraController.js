import * as THREE from 'three';

let camera, controls, keyState;

export function initCameraController(deps) {
    camera = deps.camera;
    controls = deps.controls;
    keyState = deps.keyState;
}

export function updateCamera(delta) {
    const panSpeed = 25 * delta;
    const rotationSpeed = 1.0 * delta; // Radians

    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3().crossVectors(forward, camera.up);

    const moveVector = new THREE.Vector3(0, 0, 0);
    let cameraTransformed = false;

    if (keyState['KeyW'] || keyState['ArrowUp']) {
        moveVector.add(forward);
    }
    if (keyState['KeyS'] || keyState['ArrowDown']) {
        moveVector.sub(forward);
    }
    if (keyState['KeyA'] || keyState['ArrowLeft']) {
        moveVector.sub(right);
    }
    if (keyState['KeyD'] || keyState['ArrowRight']) {
        moveVector.add(right);
    }

    if (moveVector.lengthSq() > 0) {
        moveVector.normalize().multiplyScalar(panSpeed);
        camera.position.add(moveVector);
        controls.target.add(moveVector);
        cameraTransformed = true;
    }

    let rotationDirection = 0;
    if (keyState['KeyQ']) {
        rotationDirection += 1;
    }
    if (keyState['KeyE']) {
        rotationDirection -= 1;
    }
    
    if (rotationDirection !== 0) {
        const angle = rotationDirection * rotationSpeed;
        const offset = new THREE.Vector3().subVectors(camera.position, controls.target);
        offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
        camera.position.copy(controls.target).add(offset);
        cameraTransformed = true;
    }
    
    if(cameraTransformed) {
        controls.update();
    }
}