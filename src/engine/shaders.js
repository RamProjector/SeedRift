import * as THREE from 'three';

export function createWaterShaderMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      waterColor: { value: new THREE.Color('#105577') },
      foamColor: { value: new THREE.Color('#5fe6d0') }
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vPosition;
      uniform float time;

      void main() {
        vUv = uv;
        vec3 pos = position;
        // Animated ocean surface wave displacement
        pos.z += sin(pos.x * 0.15 + time * 2.0) * 0.3 + cos(pos.y * 0.15 + time * 1.5) * 0.3;
        vPosition = pos;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      varying vec3 vPosition;
      uniform vec3 waterColor;
      uniform vec3 foamColor;
      uniform float time;

      void main() {
        // Dynamic caustics wave pattern
        float wave = sin(vPosition.x * 0.8 + time * 3.0) * cos(vPosition.y * 0.8 + time * 2.5);
        float foam = smoothstep(0.3, 0.7, wave);

        vec3 finalColor = mix(waterColor, foamColor, foam * 0.4);
        gl_FragColor = vec4(finalColor, 0.75);
      }
    `,
    transparent: true,
    side: THREE.DoubleSide
  });
}
