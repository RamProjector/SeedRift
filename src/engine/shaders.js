import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

export class PostProcessingManager {
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.composer = null;
    this.bloomPass = null;

    if (renderer) {
      try {
        const width = renderer.domElement.width || window.innerWidth;
        const height = renderer.domElement.height || window.innerHeight;

        this.composer = new EffectComposer(renderer);
        const renderPass = new RenderPass(scene, camera);
        this.composer.addPass(renderPass);

        // Unreal Bloom Shader Pass for glowing bioluminescent creatures & ruins
        this.bloomPass = new UnrealBloomPass(
          new THREE.Vector2(width, height),
          0.8,  // bloom strength
          0.4,  // bloom radius
          0.85  // bloom threshold
        );
        this.composer.addPass(this.bloomPass);
      } catch (e) {
        console.warn("Post-processing Bloom composer setup failed, falling back to direct render:", e);
        this.composer = null;
      }
    }
  }

  setSize(width, height) {
    if (this.composer) {
      this.composer.setSize(width, height);
    }
  }

  render() {
    if (this.composer) {
      this.composer.render();
    } else if (this.renderer) {
      this.renderer.render(this.scene, this.camera);
    }
  }
}

// Custom Custom Terrain Shader Material with multi-biome blending
export function createCustomTerrainShaderMaterial(groundColorHex, accentColorHex) {
  return new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      groundColor: { value: new THREE.Color(groundColorHex) },
      accentColor: { value: new THREE.Color(accentColorHex) }
    },
    vertexShader: `
      varying vec3 vPosition;
      varying vec3 vNormal;
      varying vec2 vUv;
      uniform float time;

      void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        vec3 pos = position;
        // Subtle terrain undulation wave
        pos.y += sin(pos.x * 0.1 + time) * 0.15;
        vPosition = pos;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vPosition;
      varying vec3 vNormal;
      varying vec2 vUv;
      uniform vec3 groundColor;
      uniform vec3 accentColor;
      uniform float time;

      void main() {
        // Height-based biome color gradient
        float mixFactor = clamp((vPosition.y + 2.0) / 8.0, 0.0, 1.0);
        vec3 baseColor = mix(groundColor, accentColor, mixFactor * 0.4);

        // Slope lighting calculation
        float light = max(0.3, dot(vNormal, vec3(0.4, 0.9, 0.4)));
        vec3 finalColor = baseColor * light;

        // Subtle bioluminescent pulse veins
        float pulse = sin(vPosition.x * 0.5 + vPosition.z * 0.5 + time * 2.0) * 0.5 + 0.5;
        if (pulse > 0.85) {
          finalColor += accentColor * 0.3 * (pulse - 0.85);
        }

        gl_FragColor = vec4(finalColor, 1.0);
      }
    `
  });
}
