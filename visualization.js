import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.162.0/build/three.module.min.js";
import { VolumetricMaze } from "./generation.js";

// Maze & Chunk Settings
const MAZE_SIZE = { width: 20, height: 5, depth: 20 };
const CELL_SIZE = 10;
const CHUNK_SIZE = 2;
const VIEW_DISTANCE = 3;

// Scene, Camera, Renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Lighting Setup
const ambientLight = new THREE.AmbientLight(0x404040, 1.5); // Soft ambient light
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
directionalLight.position.set(1, 1, 1).normalize();
scene.add(directionalLight);

// Maze Generation
const maze = new VolumetricMaze(MAZE_SIZE.width, MAZE_SIZE.height, MAZE_SIZE.depth);

// Player Settings
const player = {
    position: new THREE.Vector3(0, CELL_SIZE / 2, 0),
    velocity: new THREE.Vector3(),
    speed: 3.5,
    lookSensitivity: 0.002
};

// Mouse Look Variables
let yaw = 0, pitch = 0;
document.body.requestPointerLock = document.body.requestPointerLock || document.body.mozRequestPointerLock || document.body.webkitRequestPointerLock;
document.addEventListener("DOMContentLoaded", () => {
    document.body.requestPointerLock();
});
document.addEventListener("mousemove", (event) => {
    if (document.pointerLockElement) {
        yaw -= event.movementX * player.lookSensitivity;
        pitch -= event.movementY * player.lookSensitivity;
        pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));
        camera.rotation.set(pitch, yaw, 0);
    }
});

// Movement Controls
const keys = { w: false, a: false, s: false, d: false };
document.addEventListener("keydown", (e) => keys[e.key.toLowerCase()] = true);
document.addEventListener("keyup", (e) => keys[e.key.toLowerCase()] = false);

// Chunk Storage
const chunks = new Map();
const activeChunks = new Set();

// Generate Maze Chunks
function generateChunk(chunkX, chunkY, chunkZ) {
    const chunkKey = `${chunkX},${chunkY},${chunkZ}`;
    if (chunks.has(chunkKey)) return chunks.get(chunkKey);

    const chunk = new THREE.Group();
    chunks.set(chunkKey, chunk);

    const wallMaterial = new THREE.MeshPhongMaterial({ color: 0xaaaaaa, shininess: 10 });

    for (let x = 0; x < CHUNK_SIZE; x++) {
        for (let y = 0; y < CHUNK_SIZE; y++) {
            for (let z = 0; z < CHUNK_SIZE; z++) {
                const worldX = chunkX * CHUNK_SIZE + x;
                const worldY = chunkY * CHUNK_SIZE + y;
                const worldZ = chunkZ * CHUNK_SIZE + z;

                if (worldX >= MAZE_SIZE.width || worldY >= MAZE_SIZE.height || worldZ >= MAZE_SIZE.depth) continue;

                const cell = maze.maze[worldX][worldY][worldZ];
                const walls = cell.walls;

                const position = new THREE.Vector3(worldX * CELL_SIZE, worldY * CELL_SIZE, worldZ * CELL_SIZE);
                const wallGeometry = new THREE.BoxGeometry(CELL_SIZE, CELL_SIZE, 1);

                function addWall(offset, rotation) {
                    const wall = new THREE.Mesh(wallGeometry, wallMaterial);
                    wall.position.copy(position).add(offset);
                    wall.rotation.set(rotation.x, rotation.y, rotation.z);
                    chunk.add(wall);
                }

                if (walls.right) addWall(new THREE.Vector3(5, 0, 0), { x: 0, y: Math.PI / 2, z: 0 });
                if (walls.left) addWall(new THREE.Vector3(-5, 0, 0), { x: 0, y: Math.PI / 2, z: 0 });
                if (walls.up) addWall(new THREE.Vector3(0, 5, 0), { x: Math.PI / 2, y: 0, z: 0 });
                if (walls.down) addWall(new THREE.Vector3(0, -5, 0), { x: Math.PI / 2, y: 0, z: 0 });
                if (walls.front) addWall(new THREE.Vector3(0, 0, 5), { x: 0, y: 0, z: 0 });
                if (walls.back) addWall(new THREE.Vector3(0, 0, -5), { x: 0, y: 0, z: 0 });
            }
        }
    }

    return chunk;
}

// Activate Nearby Chunks
function updateChunks() {
    const playerChunkX = Math.floor(player.position.x / (CHUNK_SIZE * CELL_SIZE));
    const playerChunkY = Math.floor(player.position.y / (CHUNK_SIZE * CELL_SIZE));
    const playerChunkZ = Math.floor(player.position.z / (CHUNK_SIZE * CELL_SIZE));

    const newActiveChunks = new Set();

    for (let dx = -VIEW_DISTANCE; dx <= VIEW_DISTANCE; dx++) {
        for (let dy = -VIEW_DISTANCE; dy <= VIEW_DISTANCE; dy++) {
            for (let dz = -VIEW_DISTANCE; dz <= VIEW_DISTANCE; dz++) {
                const chunkX = playerChunkX + dx;
                const chunkY = playerChunkY + dy;
                const chunkZ = playerChunkZ + dz;
                const chunkKey = `${chunkX},${chunkY},${chunkZ}`;

                if (!activeChunks.has(chunkKey)) {
                    const chunk = generateChunk(chunkX, chunkY, chunkZ);
                    scene.add(chunk);
                }
                newActiveChunks.add(chunkKey);
            }
        }
    }

    activeChunks.forEach(chunkKey => {
        if (!newActiveChunks.has(chunkKey)) {
            scene.remove(chunks.get(chunkKey));
        }
    });

    activeChunks.clear();
    newActiveChunks.forEach(chunk => activeChunks.add(chunk));
}

// Collision Detection
function checkCollision(position) {
    for (const chunkKey of activeChunks) {
        const chunk = chunks.get(chunkKey);
        for (const wall of chunk.children) {
            if (wall.position.distanceTo(position) < CELL_SIZE / 2) return true;
        }
    }
    return false;
}

// Game Loop
function animate() {
    requestAnimationFrame(animate);

    const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)).multiplyScalar(player.speed / 10);
    const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw)).multiplyScalar(player.speed / 10);
    let moveDirection = new THREE.Vector3();

    if (keys.w) moveDirection.add(forward);
    if (keys.s) moveDirection.sub(forward);
    if (keys.a) moveDirection.sub(right);
    if (keys.d) moveDirection.add(right);

    const newPosition = player.position.clone().add(moveDirection);
    if (!checkCollision(newPosition)) {
        player.position.copy(newPosition);
        camera.position.copy(player.position);
    }

    updateChunks();
    renderer.render(scene, camera);
}
animate();

// Resize Handling
window.addEventListener("resize", () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
});
