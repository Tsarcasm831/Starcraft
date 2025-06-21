import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createMap } from './map.js';
import { Pathfinder } from '../utils/pathfinding.js';
import { assetManager } from '../utils/asset-manager.js';

export function setupScene(container) {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x10101a);

    const skyboxTexture = assetManager.get('skybox');
    skyboxTexture.mapping = THREE.EquirectangularReflectionMapping;
    scene.background = skyboxTexture;

    const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(25, 20, 25);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = true;
    controls.enableZoom = true;
    controls.target.set(15, 0, 15);
    controls.update();

    const mapWidth = 128;
    const mapHeight = 128;
    const { mesh: mapMesh, obstacles: terrainObstacles, chunkBarrier } = createMap(mapWidth, mapHeight);
    scene.add(mapMesh);

    const gridHelper = new THREE.GridHelper(mapWidth, mapWidth, 0xaaaaaa, 0x666666);
    gridHelper.position.y = 0.05;
    gridHelper.visible = false;
    scene.add(gridHelper);

    const pathfinder = new Pathfinder(mapWidth, mapHeight, 1);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
    directionalLight.position.set(-30, 50, 20);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.top = 35;
    directionalLight.shadow.camera.bottom = -35;
    directionalLight.shadow.camera.left = -35;
    directionalLight.shadow.camera.right = 35;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    return { scene, camera, renderer, controls, pathfinder, terrainObstacles, mapWidth, mapHeight, gridHelper, chunkBarrier };
}