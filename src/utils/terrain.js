import * as THREE from 'three';

export function sampleTerrain(scene, x, z) {
    const ground = scene.getObjectByName('ground');
    if (!ground) {
        return { height: 0, normal: new THREE.Vector3(0, 1, 0) };
    }

    const raycaster = new THREE.Raycaster(
        new THREE.Vector3(x, 1000, z),
        new THREE.Vector3(0, -1, 0)
    );
    const intersects = raycaster.intersectObject(ground, false);
    if (intersects.length > 0) {
        const hit = intersects[0];
        const normalMatrix = new THREE.Matrix3().getNormalMatrix(ground.matrixWorld);
        const normal = hit.face.normal.clone().applyMatrix3(normalMatrix).normalize();
        return { height: hit.point.y, normal };
    }

    return { height: 0, normal: new THREE.Vector3(0, 1, 0) };
}

export function getTerrainHeight(scene, x, z) {
    return sampleTerrain(scene, x, z).height;
}
