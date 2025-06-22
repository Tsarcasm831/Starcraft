import * as THREE from 'three';
import { assetManager } from '../utils/asset-manager.js';
import { Pathfinder } from '../utils/pathfinding.js';
import { MineralField } from '../resources/mineral-field.js';
import { VespeneGeyser } from '../resources/vespene-geyser.js';

export class World {
    constructor(scene, width, height, pathfinder, collidableObjects, terrainObstacles) {
        this.scene = scene;
        this.chunkWidth = width;
        this.height = height;
        this.pathfinder = pathfinder;
        this.collidableObjects = collidableObjects;
        this.terrainObstacles = terrainObstacles;
        this.chunks = 1;
    }

    unlockNextChunk() {
        const { chunkWidth, height, scene } = this;
        const baseX = chunkWidth * this.chunks;
        const groundTexture = assetManager.get('ground');
        groundTexture.wrapS = groundTexture.wrapT = THREE.RepeatWrapping;
        groundTexture.repeat.set(chunkWidth / 4, height / 4);
        const material = new THREE.MeshStandardMaterial({
            map: groundTexture,
            metalness: 0.1,
            roughness: 0.9,
        });
        const geometry = new THREE.PlaneGeometry(chunkWidth, height);
        const newGround = new THREE.Mesh(geometry, material);
        newGround.rotation.x = -Math.PI / 2;
        newGround.receiveShadow = true;
        newGround.name = 'ground';
        newGround.position.set(baseX, 0, 0);
        scene.add(newGround);

        const borderSize = 10;
        const plateauHeight = 2;
        const addBorderPlateau = (x, z, sizeX, sizeZ) => {
            const plateauGeom = new THREE.BoxGeometry(sizeX, plateauHeight, sizeZ);
            const plateau = new THREE.Mesh(plateauGeom, material);
            plateau.position.set(x, plateauHeight / 2, z);
            plateau.castShadow = true;
            plateau.receiveShadow = true;
            scene.add(plateau);

            const minX = x - sizeX / 2;
            const maxX = x + sizeX / 2;
            const minZ = z - sizeZ / 2;
            const maxZ = z + sizeZ / 2;
            const obstacle = {
                collider: new THREE.Box3(
                    new THREE.Vector3(minX, 0, minZ),
                    new THREE.Vector3(maxX, plateauHeight, maxZ)
                ),
                getCollider() { return this.collider; }
            };
            this.terrainObstacles.push(obstacle);
            this.collidableObjects.push(obstacle);
        };

        const northZ = height / 2 - borderSize / 2;
        const southZ = -height / 2 + borderSize / 2;
        const eastX = baseX + chunkWidth / 2 - borderSize / 2;

        addBorderPlateau(baseX, northZ, chunkWidth, borderSize);
        addBorderPlateau(baseX, southZ, chunkWidth, borderSize);
        addBorderPlateau(eastX, 0, borderSize, height - 2 * borderSize);

        // Spawn resources in the new chunk
        const resources = [];
        for (let i = 0; i < 4; i++) {
            const pos = new THREE.Vector3(
                baseX - chunkWidth / 2 + 20 + Math.random() * (chunkWidth - 40),
                0,
                -height / 2 + 20 + Math.random() * (height - 40)
            );
            const field = new MineralField(pos);
            scene.add(field.mesh);
            resources.push(field);
            this.collidableObjects.push(field);
        }

        const geyserPos = new THREE.Vector3(
            baseX - chunkWidth / 2 + 20 + Math.random() * (chunkWidth - 40),
            0,
            0
        );
        const geyser = new VespeneGeyser(geyserPos);
        scene.add(geyser.mesh);
        resources.push(geyser);
        this.collidableObjects.push(geyser);

        this.chunks += 1;

        const newWidth = chunkWidth * this.chunks;
        this.pathfinder = new Pathfinder(newWidth, height, 1);
        this.pathfinder.updateObstacles(this.collidableObjects);

        return { width: newWidth, resources };
    }
}
