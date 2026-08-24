import * as THREE from 'three';
import { gameState } from '../systems/state.js';

export const VOXEL_SIZE = 1.0;
export const CHUNK_SIZE = 16; // 16x16x16 block chunks

export class VoxelEngine {
  constructor(scene, worldEngine) {
    this.scene = scene;
    this.worldEngine = worldEngine;

    this.activeChunks = new Map(); // key: "cx,cz" => InstancedMesh
    this.loadedChunkCoords = new Set();
    this.chunkRadius = 4; // Render 4 chunks in each direction (128x128 voxel area)

    this.voxelGeo = new THREE.BoxGeometry(VOXEL_SIZE, VOXEL_SIZE, VOXEL_SIZE);

    // Voxel Materials per World Biome
    this.voxelMat = new THREE.MeshStandardMaterial({
      color: '#3d6332',
      roughness: 0.7,
      metalness: 0.1
    });
  }

  updateChunkLoading(playerPos) {
    const world = gameState.getCurrentWorld();

    // Update Voxel Color per World
    if (world.id === 'ashfields-coreth') this.voxelMat.color.set('#422319');
    else if (world.id === 'hollow-steppe') this.voxelMat.color.set('#526e33');
    else if (world.id === 'pallid-reach' || world.id === 'thessyras-veil') this.voxelMat.color.set('#2f4a5c');
    else if (world.id === 'vantauri-deep') this.voxelMat.color.set('#134254');
    else this.voxelMat.color.set('#3d6332');

    const playerChunkX = Math.floor(playerPos.x / (CHUNK_SIZE * VOXEL_SIZE));
    const playerChunkZ = Math.floor(playerPos.z / (CHUNK_SIZE * VOXEL_SIZE));

    const currentCoords = new Set();

    for (let cx = playerChunkX - this.chunkRadius; cx <= playerChunkX + this.chunkRadius; cx++) {
      for (let cz = playerChunkZ - this.chunkRadius; cz <= playerChunkZ + this.chunkRadius; cz++) {
        const key = `${cx},${cz}`;
        currentCoords.add(key);

        if (!this.activeChunks.has(key)) {
          this.loadChunk(cx, cz);
        }
      }
    }

    // Unload distant voxel chunks out of render radius
    this.activeChunks.forEach((mesh, key) => {
      if (!currentCoords.has(key)) {
        this.scene.remove(mesh);
        mesh.geometry.dispose();
        this.activeChunks.delete(key);
      }
    });
  }

  loadChunk(cx, cz) {
    const key = `${cx},${cz}`;
    const startX = cx * CHUNK_SIZE;
    const startZ = cz * CHUNK_SIZE;

    const matrices = [];
    const dummy = new THREE.Object3D();
    const radius = 800.0; // Spherical Globe Horizon Curvature Radius

    for (let x = 0; x < CHUNK_SIZE; x += 2) {
      for (let z = 0; z < CHUNK_SIZE; z += 2) {
        const worldX = startX + x;
        const worldZ = startZ + z;

        const rawHeight = Math.floor(this.worldEngine.getMultiOctaveNoise(worldX, worldZ, gameState.currentWorldId));

        // Curvature Globe Drop Math
        const distSq = worldX * worldX + worldZ * worldZ;
        const curvatureDrop = distSq / (2.0 * radius);
        const curvedY = rawHeight - curvatureDrop;

        dummy.position.set(worldX, curvedY, worldZ);
        dummy.updateMatrix();
        matrices.push(dummy.matrix.clone());
      }
    }

    if (matrices.length > 0) {
      const instancedMesh = new THREE.InstancedMesh(this.voxelGeo, this.voxelMat, matrices.length);
      instancedMesh.receiveShadow = true;
      instancedMesh.castShadow = true;

      for (let i = 0; i < matrices.length; i++) {
        instancedMesh.setMatrixAt(i, matrices[i]);
      }
      instancedMesh.instanceMatrix.needsUpdate = true;

      this.scene.add(instancedMesh);
      this.activeChunks.set(key, instancedMesh);
    }
  }
}
