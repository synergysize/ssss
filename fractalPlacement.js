// fractalPlacement.js - Generate positions for wallet nodes in a fractal pattern
import * as THREE from 'three';

const PHI = (1 + Math.sqrt(5)) / 2; // Golden ratio

// Generate a position for a node based on index using a golden-ratio spiral with concentric shells
export function generateFractalPosition(index, totalNodes) {
  // Normalize index to [0,1] range
  const normalizedIndex = index / totalNodes;
  
  // Calculate shell number (0-based) - higher value means more shells
  const shellFactor = 5;
  const shellIndex = Math.floor(normalizedIndex * shellFactor);
  
  // Calculate radius based on shell - outer shells are farther
  const baseRadius = 100 + shellIndex * 50;
  
  // Add some randomness to radius
  const radiusJitter = (Math.random() - 0.5) * 20;
  const radius = baseRadius + radiusJitter;
  
  // Use golden angle (derived from golden ratio) for optimal spacing
  const goldenAngle = Math.PI * (3 - Math.sqrt(5)); // Golden angle in radians
  
  // Calculate angles using golden ratio for nice spiral distribution
  const theta = index * goldenAngle;
  
  // Vary the distribution in vertical direction using another golden ratio derived value
  const phi = Math.acos(1 - 2 * ((index % (totalNodes / shellFactor)) / (totalNodes / shellFactor)));
  
  // Convert spherical to Cartesian coordinates
  const x = radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.sin(phi) * Math.sin(theta);
  const z = radius * Math.cos(phi);
  
  // Add fractal-like jitter
  const jitterAmount = 30;
  const jitterX = (Math.random() - 0.5) * jitterAmount;
  const jitterY = (Math.random() - 0.5) * jitterAmount;
  const jitterZ = (Math.random() - 0.5) * jitterAmount;
  
  return new THREE.Vector3(
    x + jitterX,
    y + jitterY,
    z + jitterZ
  );
}

// Generate size for node based on wallet data
export function generateNodeSize(wallet) {
  // Base size for all nodes
  const baseSize = 1.5;
  
  // Determine size modifier based on wallet value
  let valueModifier = 1.0;
  
  if (wallet.type === 'fartcoin' && wallet.Quantity) {
    // Extract numeric value and convert to number
    const quantity = parseFloat(wallet.Quantity.replace(/[^\d.-]/g, '')) || 0;
    
    // Logarithmic scaling to handle wide range of values
    if (quantity > 0) {
      valueModifier = 1 + Math.log10(quantity) * 0.1;
    }
  } else if (wallet.type === 'goattoken' && wallet.Quantity) {
    const quantity = parseFloat(wallet.Quantity.replace(/[^\d.-]/g, '')) || 0;
    
    if (quantity > 0) {
      valueModifier = 1 + Math.log10(quantity) * 0.1;
    }
  }
  
  // Add slight random variation
  const randomFactor = 0.85 + Math.random() * 0.3;
  
  return baseSize * valueModifier * randomFactor;
}

// Get color for a wallet based on type
export function getWalletColor(wallet) {
  if (wallet.type === 'fartcoin') {
    return new THREE.Color('#8A2BE2'); // Purple for Fartcoin
  } else {
    return new THREE.Color('#FFA500'); // Orange for Goattoken
  }
}