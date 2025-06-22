import * as THREE from 'three';
import { assetManager } from '../utils/asset-manager.js';
import { createPlateau } from '../utils/map-utils.js';

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

    function addBorderPlateau(x, z, sizeX, sizeZ, orientation, withRamp = false, isObstacle = true) {
        const { meshes, colliders } = createPlateau({
            x,
            z,
            sizeX,
            sizeZ,
            height: plateauHeight,
            orientation,
            material,
            withRamp,
            isObstacle
        });
        meshes.forEach(m => group.add(m));
        colliders.forEach(collider => {
            obstacles.push({ collider, getCollider() { return this.collider; } });
        });
    }

    const northZ = height / 2 - borderSize / 2;
    const southZ = -height / 2 + borderSize / 2;
    const westX = -width / 2 + borderSize / 2;
    const eastX = width / 2 - borderSize / 2;

    addBorderPlateau(0, northZ, width, borderSize, 'north', true, false);
    addBorderPlateau(0, southZ, width, borderSize, 'south', true, false);
    addBorderPlateau(westX, 0, borderSize, height - 2 * borderSize, 'west');
    // The eastern edge will be left open for future expansion

    return { mesh: group, obstacles };
}