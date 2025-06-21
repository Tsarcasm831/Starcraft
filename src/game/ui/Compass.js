import * as THREE from 'three';

let compassEl;
let getCamera;

export class Compass {
    init(cameraGetter) {
        compassEl = document.getElementById('compass');
        getCamera = cameraGetter;
    }

    update() {
        if (!compassEl || !getCamera) return;
        const camera = getCamera();
        if (!camera) return;

        const dir = new THREE.Vector3();
        camera.getWorldDirection(dir);
        dir.y = 0;
        dir.normalize();

        const angle = Math.atan2(dir.x, dir.z);
        const deg = THREE.MathUtils.radToDeg(angle);
        let orientation;
        if (deg >= -45 && deg < 45) {
            orientation = 'N';
        } else if (deg >= 45 && deg < 135) {
            orientation = 'W';
        } else if (deg < -135 || deg >= 135) {
            orientation = 'S';
        } else {
            orientation = 'E';
        }

        compassEl.textContent = orientation;
    }
}
