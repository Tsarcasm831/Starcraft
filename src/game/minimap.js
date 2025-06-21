import * as THREE from 'three';

let minimapRenderer, minimapCamera, minimapScene;
let mainCamera, mainControls, mainScene;
let units, buildings, mineralFields, vespeneGeysers;
let mapWidth, mapHeight;

const unitMaterial = new THREE.SpriteMaterial({ color: 0x00ff00 });
const selectedUnitMaterial = new THREE.SpriteMaterial({ color: 0xffffff });
const buildingMaterial = new THREE.SpriteMaterial({ color: 0x00ff00 });
const mineralMaterial = new THREE.SpriteMaterial({ color: 0x41aeff });
const vespeneMaterial = new THREE.SpriteMaterial({ color: 0x00ff00 });

const frustumLineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
let frustumLine;

const spritePool = [];
let activeSprites = [];

export function setMapSize(newWidth, newHeight) {
    mapWidth = newWidth;
    mapHeight = newHeight;
    if (minimapCamera) {
        minimapCamera.left = -mapWidth / 2;
        minimapCamera.right = mapWidth / 2;
        minimapCamera.top = mapHeight / 2;
        minimapCamera.bottom = -mapHeight / 2;
        minimapCamera.updateProjectionMatrix();
    }
}

export function init(deps) {
    mainCamera = deps.camera;
    mainControls = deps.controls;
    mainScene = deps.scene;
    units = deps.units;
    buildings = deps.buildings;
    mineralFields = deps.mineralFields;
    vespeneGeysers = deps.vespeneGeysers;
    mapWidth = deps.mapWidth;
    mapHeight = deps.mapHeight;

    const minimapContainer = document.getElementById('minimap');
    if (!minimapContainer) {
        console.error('Minimap container not found!');
        return;
    }

    minimapScene = new THREE.Scene();

    const mapObject = mainScene.getObjectByName('map_geometry');
    if (mapObject) {
        const mapClone = mapObject.clone();
        minimapScene.add(mapClone);

        const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
        minimapScene.add(ambientLight);
    } else {
        minimapScene.background = new THREE.Color(0x0a0a14);
    }

    minimapCamera = new THREE.OrthographicCamera(
        -mapWidth / 2, mapWidth / 2,
        mapHeight / 2, -mapHeight / 2,
        1, 1000
    );
    minimapCamera.position.set(0, 100, 0);
    minimapCamera.lookAt(0, 0, 0);

    minimapRenderer = new THREE.WebGLRenderer();
    minimapRenderer.setSize(minimapContainer.clientWidth, minimapContainer.clientHeight);
    minimapContainer.appendChild(minimapRenderer.domElement);

    const frustumGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()
    ]);
    frustumLine = new THREE.Line(frustumGeometry, frustumLineMaterial);
    frustumLine.position.y = 5; // make it visible above map geometry
    minimapScene.add(frustumLine);

    minimapContainer.addEventListener('mousedown', onMinimapClick);
    minimapContainer.addEventListener('mousemove', (event) => {
        if (event.buttons === 1) { // if left mouse is down
            onMinimapClick(event);
        }
    });
}

function getSprite() {
    if (spritePool.length > 0) {
        const sprite = spritePool.pop();
        sprite.visible = true;
        return sprite;
    }
    const sprite = new THREE.Sprite();
    minimapScene.add(sprite);
    return sprite;
}

function releaseSprite(sprite) {
    sprite.visible = false;
    spritePool.push(sprite);
}

export function update(selectedObjects) {
    if (!minimapRenderer) return;

    activeSprites.forEach(releaseSprite);
    activeSprites = [];

    const drawSprite = (entity, material, scale = 2) => {
        const sprite = getSprite();
        sprite.material = material;
        sprite.position.set(entity.mesh.position.x, 5, entity.mesh.position.z);
        if (typeof scale === 'object') {
            sprite.scale.set(scale.x, scale.z, 1);
        } else {
            sprite.scale.set(scale, scale, 1);
        }
        activeSprites.push(sprite);
    };

    const selectedSet = new Set(selectedObjects);

    units.forEach(unit => {
        if (!unit.isGarrisoned) {
            drawSprite(unit, selectedSet.has(unit) ? selectedUnitMaterial : unitMaterial);
        }
    });

    buildings.forEach(building => {
        const size = building.getCollider().getSize(new THREE.Vector3());
        drawSprite(building, selectedSet.has(building) ? selectedUnitMaterial : buildingMaterial, size);
    });

    mineralFields.forEach(field => !field.isDepleted && drawSprite(field, mineralMaterial, 4));
    vespeneGeysers.forEach(geyser => !geyser.isDepleted && drawSprite(geyser, vespeneMaterial, 4));

    updateFrustum();
    minimapRenderer.render(minimapScene, minimapCamera);
}

const raycaster = new THREE.Raycaster();
const frustumCornersNDC = [
    new THREE.Vector3(-1, -1, -1), new THREE.Vector3(1, -1, -1),
    new THREE.Vector3(1, 1, -1), new THREE.Vector3(-1, 1, -1),
];
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

function updateFrustum() {
    const points = [];
    frustumCornersNDC.forEach(corner => {
        const vec = corner.clone().unproject(mainCamera);
        raycaster.set(mainCamera.position, vec.sub(mainCamera.position).normalize());
        const intersectionPoint = new THREE.Vector3();
        if (raycaster.ray.intersectPlane(groundPlane, intersectionPoint)) {
            points.push(intersectionPoint);
        }
    });

    if (points.length === 4) {
        const pos = frustumLine.geometry.attributes.position.array;
        for(let i=0; i<4; ++i) {
            pos[i*3] = points[i].x;
            pos[i*3 + 1] = 0;
            pos[i*3 + 2] = points[i].z;
        }
        pos[12] = points[0].x;
        pos[13] = 0;
        pos[14] = points[0].z;
        frustumLine.geometry.attributes.position.needsUpdate = true;
    }
}

function onMinimapClick(event) {
    const rect = event.target.getBoundingClientRect();
    const u = (event.clientX - rect.left) / rect.width;
    const v = 1.0 - ((event.clientY - rect.top) / rect.height);

    const targetX = (u - 0.5) * mapWidth;
    const targetZ = (v - 0.5) * mapHeight;

    const cameraOffset = new THREE.Vector3().subVectors(mainCamera.position, mainControls.target);
    mainControls.target.set(targetX, 0, targetZ);
    mainCamera.position.copy(mainControls.target).add(cameraOffset);
    mainControls.update();
}