import * as THREE from 'three';

const creepPatches = [];

export function spreadCreep(position, radius, scene) {
    const patch = { position: position.clone(), radius };
    creepPatches.push(patch);
    if (scene) {
        const geo = new THREE.CircleGeometry(radius, 32);
        const mat = new THREE.MeshStandardMaterial({ color: 0x552266 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(position.x, 0.02, position.z);
        mesh.name = 'creep';
        scene.add(mesh);
    }
}

export function isOnCreep(x, z) {
    return creepPatches.some(p => Math.hypot(x - p.position.x, z - p.position.z) <= p.radius);
}

export function getGroundMeshes(scene) {
    const grounds = [];
    scene.traverse(obj => {
        if (obj.name === 'ground' || obj.name === 'creep') grounds.push(obj);
    });
    return grounds;
}

export function sampleTerrain(scene, x, z) {
    const grounds = getGroundMeshes(scene);
    if (grounds.length === 0) {
        return { height: 0, normal: new THREE.Vector3(0, 1, 0) };
    }

    const raycaster = new THREE.Raycaster(
        new THREE.Vector3(x, 1000, z),
        new THREE.Vector3(0, -1, 0)
    );
    const intersects = raycaster.intersectObjects(grounds, true);
    if (intersects.length > 0) {
        const hit = intersects[0];
        const normalMatrix = new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld);
        const normal = hit.face.normal.clone().applyMatrix3(normalMatrix).normalize();
        return { height: hit.point.y, normal };
    }

    return { height: 0, normal: new THREE.Vector3(0, 1, 0) };
}

export function getTerrainHeight(scene, x, z) {
    return sampleTerrain(scene, x, z).height;
}
