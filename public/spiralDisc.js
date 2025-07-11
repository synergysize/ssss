/**
 * spiralDisc.js - Create and manage the flat spiral disc of 2000 wallet nodes
 * 
 * This module creates a flat spiral disc visualization with 2000 wallet nodes
 * (1000 from fartcoin.csv, 1000 from goattoken.csv) and manages their rendering,
 * animation, and interaction.
 */

import * as THREE from 'three';
import { getDiscData } from './discLoader.js';

// Track state for animation
let discGroup = null;
let isRotating = true;
let rotationSpeed = 0.0001; // Very slow rotation

// Create the spiral disc visualization
export function createSpiralDisc(scene, pointTexture) {
  console.log('Creating spiral disc visualization...');
  
  // Get the disc data
  const discData = getDiscData();
  console.log(`Retrieved ${discData.length} wallet data points for spiral disc`);
  
  if (discData.length === 0) {
    console.error("ERROR: No disc data was loaded! The spiral disc will be empty.");
    console.error("Please check if fartcoin.csv and goattoken.csv are properly loaded.");
  }
  
  // Create a group for the disc
  discGroup = new THREE.Group();
  discGroup.name = 'spiralDisc';
  
  // Create sprites for each wallet in the disc
  discData.forEach((wallet, index) => {
    // Create material with appropriate color
    const material = new THREE.SpriteMaterial({
      map: pointTexture,
      color: wallet.color,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    });
    
    // Create sprite
    const sprite = new THREE.Sprite(material);
    
    // Position the sprite
    sprite.position.set(wallet.x, wallet.y, wallet.z);
    
    // Scale based on amount (increased scale for better visibility)
    const scale = Math.max(150, Math.log(wallet.totalHolding || 1) * 8);
    sprite.scale.set(scale, scale, 1);
    
    // Add subtle float animation with random phase
    sprite.userData = {
      originalY: wallet.y,
      floatPhase: Math.random() * Math.PI * 2,
      floatSpeed: 0.5 + Math.random() * 0.5,
      floatAmount: 2 + Math.random() * 2,
      isDiscWallet: true,
      originalScale: scale,
      originalColor: wallet.color,
      walletData: {
        address: wallet.address,
        fartAmount: wallet.fartAmount || 0,
        goatAmount: wallet.goatAmount || 0,
        totalHolding: wallet.totalHolding || 0,
        walletType: wallet.walletType || 'unknown'
      }
    };
    
    // Add to disc group
    discGroup.add(sprite);
    
    // Log progress for large batches
    if (index % 500 === 0) {
      console.log(`Created ${index} of ${discData.length} disc wallet nodes...`);
    }
  });
  
  // Add the disc group to the scene
  scene.add(discGroup);
  console.log(`Added spiral disc with ${discGroup.children.length} wallet nodes`);
  
  return discGroup;
}

// Update disc animation
export function updateDisc(delta) {
  if (!discGroup || !isRotating) return;
  
  // Rotate the entire disc very slowly
  discGroup.rotation.y += rotationSpeed * delta;
  
  // Update floating animation for each sprite
  discGroup.children.forEach(sprite => {
    if (sprite.userData && sprite.userData.isDiscWallet) {
      const userData = sprite.userData;
      
      // Update float animation phase
      userData.floatPhase += userData.floatSpeed * delta * 0.01;
      
      // Apply subtle floating motion
      const floatOffset = Math.sin(userData.floatPhase) * userData.floatAmount;
      sprite.position.y = userData.originalY + floatOffset;
    }
  });
}

// Toggle disc rotation
export function toggleDiscRotation() {
  isRotating = !isRotating;
  return isRotating;
}

// Set disc rotation speed
export function setDiscRotationSpeed(speed) {
  rotationSpeed = speed;
  return rotationSpeed;
}

// Get all disc wallet nodes for raycasting
export function getDiscWalletNodes() {
  if (!discGroup) return [];
  return discGroup.children.filter(child => child.userData && child.userData.isDiscWallet);
}

// Export default for convenience
export default {
  createSpiralDisc,
  updateDisc,
  toggleDiscRotation,
  setDiscRotationSpeed,
  getDiscWalletNodes
};