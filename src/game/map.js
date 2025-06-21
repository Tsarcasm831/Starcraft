import * as THREE from 'three';
import { assetManager } from '../utils/asset-manager.js';

export function createMap(width, height) {
    const group = new THREE.Group();
    group.name = 'map_geometry';

    const groundTexture = assetManager.get('ground');
    groundTexture.wrapS = groundTexture.wrapT = THREE.RepeatWrapping;
    groundTexture.repeat.set(width / 4, height / 4);

    const material = new THREE.MeshStandardMaterial({
        map: groundTexture,
        metalness: 0.1,
        roughness: 0.9,
    });

    const geometry = new THREE.PlaneGeometry(width, height);
    const plane = new THREE.Mesh(geometry, material);
    plane.rotation.x = -Math.PI / 2;
    plane.name = 'ground'; // For raycasting
    plane.receiveShadow = true;
    group.add(plane);

    const obstacles = [];

    // Create water material once
    const waterMaterial = new THREE.MeshStandardMaterial({
        color: 0x28598a,
        transparent: true,
        opacity: 0.85,
        roughness: 0.1,
        metalness: 0.2,
    });

    function addLake(shape, position, rotationY = 0) {
        const extrudeSettings = { depth: 0.2, bevelEnabled: false };
        const lakeGeom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        // The geometry is created on XY plane, we want it on XZ
        lakeGeom.rotateX(-Math.PI / 2);
        lakeGeom.rotateY(rotationY);

        const lakeMesh = new THREE.Mesh(lakeGeom, waterMaterial);
        lakeMesh.position.copy(position);
        lakeMesh.receiveShadow = true;
        group.add(lakeMesh);

        // Create collider for pathfinding
        const boundingBox = new THREE.Box3().setFromObject(lakeMesh);
        // Adjust Y of collider to be from ground up, so units don't pathfind under it
        boundingBox.min.y = 0;
        boundingBox.max.y = 5; // some arbitrary height
        obstacles.push({
            collider: boundingBox,
            getCollider() { return this.collider; }
        });
    }

    // Define a lake shape
    const lakeShape = new THREE.Shape();
    lakeShape.moveTo( -12, -8 );
    lakeShape.bezierCurveTo( -12, -18, 12, -18, 12, -8 );
    lakeShape.bezierCurveTo( 12, 8, -12, 8, -12, -8 );

    // Add some lakes
    addLake(lakeShape, new THREE.Vector3(-30, -0.1, 0));
    addLake(lakeShape, new THREE.Vector3(40, -0.1, -25), Math.PI / 4);

    const borderSize = 10;
    const plateauHeight = 2;

    function addBorderPlateau(x, z, sizeX, sizeZ) {
        const plateauGeom = new THREE.BoxGeometry(sizeX, plateauHeight, sizeZ);
        const plateau = new THREE.Mesh(plateauGeom, material);
        plateau.position.set(x, plateauHeight / 2, z);
        plateau.castShadow = true;
        plateau.receiveShadow = true;
        group.add(plateau);

        const minX = x - sizeX / 2;
        const maxX = x + sizeX / 2;
        const minZ = z - sizeZ / 2;
        const maxZ = z + sizeZ / 2;
        obstacles.push({
            collider: new THREE.Box3(
                new THREE.Vector3(minX, 0, minZ),
                new THREE.Vector3(maxX, plateauHeight, maxZ)
            ),
            getCollider() { return this.collider; }
        });
    }

    const northZ = height / 2 - borderSize / 2;
    const southZ = -height / 2 + borderSize / 2;
    const westX = -width / 2 + borderSize / 2;
    const eastX = width / 2 - borderSize / 2;

    addBorderPlateau(0, northZ, width, borderSize);
    addBorderPlateau(0, southZ, width, borderSize);
    addBorderPlateau(westX, 0, borderSize, height - 2 * borderSize);
    addBorderPlateau(eastX, 0, borderSize, height - 2 * borderSize);

    return { mesh: group, obstacles };
}