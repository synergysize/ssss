// shaders.js - Custom shaders for the fractal wallet visualization

// Vertex shader for the glowing effect
export const vertexShader = `
  varying vec3 vNormal;
  varying vec3 vPosition;
  
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Fragment shader for the glowing effect
export const fragmentShader = `
  uniform vec3 glowColor;
  uniform float intensity;
  uniform float opacity;
  
  varying vec3 vNormal;
  varying vec3 vPosition;
  
  void main() {
    float depth = 1.0 - min(1.0, length(vPosition) / 50.0);
    float glow = pow(0.9 - dot(vNormal, vec3(0, 0, 1.0)), 3.0) * intensity;
    
    gl_FragColor = vec4(glowColor, opacity) * glow * depth;
  }
`;

// Create a shader material with the given color
export function createGlowMaterial(color, intensity = 1.5, opacity = 1.0) {
  return {
    vertexShader,
    fragmentShader,
    uniforms: {
      glowColor: { value: color },
      intensity: { value: intensity },
      opacity: { value: opacity }
    },
    transparent: true,
    depthWrite: false,
    side: 2 // THREE.DoubleSide
  };
}