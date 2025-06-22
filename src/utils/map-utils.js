import * as THREE from 'three';

export function createRampGeometry(width, length, height) {
    const geometry = new THREE.BufferGeometry();
    const vertices = new Float32Array([
        -width / 2, height, 0,
         width / 2, height, 0,
        -width / 2, 0, -length,
         width / 2, 0, -length,
    ]);
    geometry.setIndex([0, 2, 1, 2, 3, 1]);
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.computeVertexNormals();
    return geometry;
}

export function createPlateau({ x, z, sizeX, sizeZ, height = 2, orientation = 'north', material, withRamp = false }) {
    const meshes = [];
    const plateauGeom = new THREE.BoxGeometry(sizeX, height, sizeZ);
    const plateau = new THREE.Mesh(plateauGeom, material);
    plateau.position.set(x, height / 2, z);
    plateau.castShadow = true;
    plateau.receiveShadow = true;
    meshes.push(plateau);

    if (withRamp) {
        const rampLength = 6;
        const rampGeom = createRampGeometry(
            orientation === 'north' || orientation === 'south' ? sizeX : sizeZ,
            rampLength,
            height
        );
        const ramp = new THREE.Mesh(rampGeom, material);
        ramp.name = 'ground';
        switch (orientation) {
            case 'north':
                ramp.rotation.y = 0;
                ramp.position.set(x, 0, z - sizeZ / 2 - rampLength / 2);
                break;
            case 'south':
                ramp.rotation.y = Math.PI;
                ramp.position.set(x, 0, z + sizeZ / 2 + rampLength / 2);
                break;
            case 'east':
                ramp.rotation.y = -Math.PI / 2;
                ramp.position.set(x + sizeX / 2 + rampLength / 2, 0, z);
                break;
            case 'west':
                ramp.rotation.y = Math.PI / 2;
                ramp.position.set(x - sizeX / 2 - rampLength / 2, 0, z);
                break;
            default:
                break;
        }
        ramp.castShadow = true;
        ramp.receiveShadow = true;
        meshes.push(ramp);
    }

    const minX = x - sizeX / 2;
    const maxX = x + sizeX / 2;
    const minZ = z - sizeZ / 2;
    const maxZ = z + sizeZ / 2;
    const collider = new THREE.Box3(
        new THREE.Vector3(minX, 0, minZ),
        new THREE.Vector3(maxX, height, maxZ)
    );

    return { meshes, collider };
}

