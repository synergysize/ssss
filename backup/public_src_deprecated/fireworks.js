/**
 * Fireworks Particle System
 * Creates burst-style fireworks in the 3D background using Three.js
 */
import * as THREE from 'three';

// Fireworks system state
const fireworks = [];
const maxFireworks = 10; // Maximum number of simultaneous fireworks
const burstInterval = { min: 2000, max: 4000 }; // Random interval between bursts (2-4 seconds)
let lastBurstTime = 0;

// Colors for fireworks - bright reds, blues, purples, yellows
const fireworkColors = [
  new THREE.Color(1.0, 0.2, 0.2), // Red
  new THREE.Color(0.2, 0.2, 1.0), // Blue
  new THREE.Color(0.8, 0.2, 1.0), // Purple
  new THREE.Color(1.0, 1.0, 0.2), // Yellow
  new THREE.Color(1.0, 0.5, 0.0), // Orange
  new THREE.Color(0.0, 1.0, 0.5), // Teal
  new THREE.Color(1.0, 0.2, 0.8)  // Pink
];

/**
 * Create a particle texture for fireworks
 */
function createParticleTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(16, 16, 0, 16, 16, 16);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.8)');
  gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.4)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  
  context.fillStyle = gradient;
  context.fillRect(0, 0, 32, 32);
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

// Create the particle texture once
const particleTexture = createParticleTexture();

/**
 * Create a single firework explosion
 * @param {THREE.Scene} scene - The scene to add the firework to
 */
function createFirework(scene) {
  // Random position in the distant background
  const position = new THREE.Vector3(
    (Math.random() - 0.5) * 30000, // X position (-15000 to 15000)
    10000 + Math.random() * 10000,  // Y position (10000 to 20000) - higher in sky
    -15000 - Math.random() * 10000  // Z position (-15000 to -25000) - behind content
  );
  
  // Random color from our palette
  const color = fireworkColors[Math.floor(Math.random() * fireworkColors.length)];
  
  // Number of particles in this burst
  const particleCount = 100 + Math.floor(Math.random() * 150);
  
  // Create geometry for the particles
  const geometry = new THREE.BufferGeometry();
  
  // Arrays to store particle positions and velocities
  const positions = new Float32Array(particleCount * 3);
  const velocities = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  const sizes = new Float32Array(particleCount);
  
  // Create the burst pattern
  for (let i = 0; i < particleCount; i++) {
    const i3 = i * 3;
    
    // All particles start at the burst center
    positions[i3] = position.x;
    positions[i3 + 1] = position.y;
    positions[i3 + 2] = position.z;
    
    // Random velocity in sphere direction
    const speed = 20 + Math.random() * 30;
    const angle = Math.random() * Math.PI * 2;
    const elevation = Math.random() * Math.PI - Math.PI/2;
    
    velocities[i3] = Math.cos(angle) * Math.cos(elevation) * speed;
    velocities[i3 + 1] = Math.sin(elevation) * speed;
    velocities[i3 + 2] = Math.sin(angle) * Math.cos(elevation) * speed;
    
    // Base color with slight variation
    colors[i3] = color.r * (0.8 + Math.random() * 0.4);
    colors[i3 + 1] = color.g * (0.8 + Math.random() * 0.4);
    colors[i3 + 2] = color.b * (0.8 + Math.random() * 0.4);
    
    // Random particle sizes
    sizes[i] = 2 + Math.random() * 4;
  }
  
  // Set the attributes for the geometry
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  
  // Create the material for the particles
  const material = new THREE.PointsMaterial({
    size: 3,
    map: particleTexture,
    transparent: true,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true
  });
  
  // Create the particle system
  const particleSystem = new THREE.Points(geometry, material);
  particleSystem.name = 'firework';
  
  // Add metadata
  particleSystem.userData = {
    velocities,
    positions,
    sizes,
    age: 0,
    maxAge: 2 + Math.random() * 1, // Lifetime between 2-3 seconds
    gravity: -4,
    fadeStart: 0.7 // When to start fading (fraction of maxAge)
  };
  
  // Add to scene and tracking array
  scene.add(particleSystem);
  fireworks.push(particleSystem);
  
  return particleSystem;
}

/**
 * Initialize the fireworks system
 * @param {THREE.Scene} scene - The scene to add the fireworks to
 */
export function initFireworks(scene) {
  // Nothing to do at init time, fireworks will be created during update
  console.log('Fireworks particle system initialized');
  lastBurstTime = Date.now();
}

/**
 * Update all fireworks (called in animation loop)
 * @param {THREE.Scene} scene - The scene containing the fireworks
 * @param {number} deltaTime - Time since last update in seconds
 */
export function updateFireworks(scene, deltaTime) {
  const currentTime = Date.now();
  
  // Check if it's time to create a new firework
  if (currentTime - lastBurstTime > (burstInterval.min + Math.random() * (burstInterval.max - burstInterval.min))) {
    // Don't create too many fireworks
    if (fireworks.length < maxFireworks) {
      createFirework(scene);
      lastBurstTime = currentTime;
    }
  }
  
  // Update existing fireworks
  for (let i = fireworks.length - 1; i >= 0; i--) {
    const firework = fireworks[i];
    const userData = firework.userData;
    
    // Update age
    userData.age += deltaTime;
    
    // If the firework has expired, remove it
    if (userData.age >= userData.maxAge) {
      scene.remove(firework);
      fireworks.splice(i, 1);
      continue;
    }
    
    // Get attributes for updating
    const positions = firework.geometry.attributes.position.array;
    const velocities = userData.velocities;
    const sizes = firework.geometry.attributes.size.array;
    
    // Calculate opacity based on age
    const lifeRatio = userData.age / userData.maxAge;
    
    // Apply physics to each particle
    for (let j = 0; j < positions.length / 3; j++) {
      const j3 = j * 3;
      
      // Update position based on velocity
      positions[j3] += velocities[j3] * deltaTime;
      positions[j3 + 1] += velocities[j3 + 1] * deltaTime;
      positions[j3 + 2] += velocities[j3 + 2] * deltaTime;
      
      // Apply gravity effect
      velocities[j3 + 1] += userData.gravity * deltaTime;
      
      // Shrink particles over time
      if (lifeRatio > userData.fadeStart) {
        const fadeRatio = (lifeRatio - userData.fadeStart) / (1 - userData.fadeStart);
        sizes[j] = Math.max(0.1, sizes[j] * (1 - fadeRatio * 0.1));
      }
    }
    
    // Update opacity based on lifetime
    firework.material.opacity = lifeRatio > userData.fadeStart 
      ? 1 - ((lifeRatio - userData.fadeStart) / (1 - userData.fadeStart)) 
      : 1;
    
    // Mark attributes as needing update
    firework.geometry.attributes.position.needsUpdate = true;
    firework.geometry.attributes.size.needsUpdate = true;
  }
}