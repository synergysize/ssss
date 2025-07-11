// nodeConnections.js - Create and manage local node connections with dynamic highlighting
// New implementation for connecting only nearby wallet nodes

import * as THREE from 'three';

// Store all connections for reference
let fartcoinConnections = [];
let goattokenConnections = [];
let activeConnections = []; // Active connections for animation

// Animation configuration
const PULSE_DURATION = 1.0; // seconds
const PULSE_INTERVAL = 500; // milliseconds
const MAX_NEIGHBORS = 6; // Maximum number of neighbors per node
const MIN_NEIGHBORS = 3; // Minimum number of neighbors per node

// Container for pulse lines and connection statistics
let pulseContainer;
let connectionStats = {
  fartcoinConnections: 0,
  goattokenConnections: 0,
  totalConnections: 0,
  avgConnectionsPerNode: 0,
  maxDistance: 0,
  avgDistance: 0
};

// Colors
const FARTCOIN_COLOR = 0x8A2BE2; // Purple
const GOATTOKEN_COLOR = 0xFFA500; // Orange
const FARTCOIN_PULSE_COLOR = 0xB866FF; // Brighter purple for pulses
const GOATTOKEN_PULSE_COLOR = 0xFFB347; // Brighter orange for pulses

/**
 * Create local connections between nodes of the same type
 */
export function createNodeConnections(walletNodes, galaxyObject) {
  console.log('Creating local node connections...');
  
  // Initialize pulse container
  pulseContainer = new THREE.Group();
  galaxyObject.add(pulseContainer);
  
  // Separate nodes by type
  const fartcoinNodes = walletNodes.filter(node => node.userData.wallet.type === 'fartcoin');
  const goattokenNodes = walletNodes.filter(node => node.userData.wallet.type === 'goattoken');
  
  console.log(`Found ${fartcoinNodes.length} Fartcoin nodes and ${goattokenNodes.length} Goattoken nodes`);
  
  // Create connections for Fartcoin nodes (purple)
  const fartcoinMesh = createLocalConnectionMesh(fartcoinNodes, new THREE.Color(FARTCOIN_COLOR));
  galaxyObject.add(fartcoinMesh);
  
  // Create connections for Goattoken nodes (orange)
  const goattokenMesh = createLocalConnectionMesh(goattokenNodes, new THREE.Color(GOATTOKEN_COLOR));
  galaxyObject.add(goattokenMesh);
  
  // Calculate average connections per node
  const totalNodes = fartcoinNodes.length + goattokenNodes.length;
  connectionStats.totalConnections = fartcoinConnections.length + goattokenConnections.length;
  connectionStats.avgConnectionsPerNode = totalNodes > 0 ? 
    connectionStats.totalConnections / totalNodes : 0;
  
  console.log(`Created ${connectionStats.totalConnections} local connections ` +
              `(${fartcoinConnections.length} Fartcoin, ${goattokenConnections.length} Goattoken)`);
  console.log(`Average connections per node: ${connectionStats.avgConnectionsPerNode.toFixed(2)}`);
  
  // Start the pulse animation loop
  startPulseAnimation();
  
  return {
    fartcoinMesh,
    goattokenMesh,
    pulseContainer,
    connectionData: connectionStats
  };
}

/**
 * Create a connection mesh that only connects nearby nodes
 */
function createLocalConnectionMesh(nodes, color) {
  if (nodes.length === 0) {
    return new THREE.LineSegments(new THREE.BufferGeometry(), 
      new THREE.LineBasicMaterial({ color }));
  }

  // Calculate distances between all nodes
  const nodeDistances = [];
  let totalDistance = 0;
  let maxDistance = 0;
  let connectionCount = 0;
  
  // For each node, find distances to all other nodes
  for (let i = 0; i < nodes.length; i++) {
    const nodeA = nodes[i];
    nodeDistances[i] = [];
    
    for (let j = 0; j < nodes.length; j++) {
      if (i === j) continue;
      
      const nodeB = nodes[j];
      const distance = nodeA.position.distanceTo(nodeB.position);
      
      nodeDistances[i][j] = {
        index: j,
        distance: distance
      };
      
      totalDistance += distance;
      maxDistance = Math.max(maxDistance, distance);
    }
    
    // Sort by distance (closest first)
    nodeDistances[i].sort((a, b) => a.distance - b.distance);
  }
  
  // Create buffer geometry for connections
  const positions = [];
  const connections = [];
  
  // For each node, connect to its N nearest neighbors
  for (let i = 0; i < nodes.length; i++) {
    const nodeA = nodes[i];
    
    // Use between MIN_NEIGHBORS and MAX_NEIGHBORS connections per node
    // but don't exceed the number of available nodes
    const neighborsCount = Math.min(
      Math.floor(MIN_NEIGHBORS + Math.random() * (MAX_NEIGHBORS - MIN_NEIGHBORS + 1)),
      nodes.length - 1
    );
    
    // Connect to the N closest nodes
    for (let n = 0; n < neighborsCount && n < nodeDistances[i].length; n++) {
      const neighborData = nodeDistances[i][n];
      const j = neighborData.index;
      const nodeB = nodes[j];
      const distance = neighborData.distance;
      
      // Skip if this connection already exists
      if (connections.some(conn => 
        (conn.startNode === nodeB && conn.endNode === nodeA) ||
        (conn.startNode === nodeA && conn.endNode === nodeB)
      )) {
        continue;
      }
      
      // Add positions for the line (start and end points)
      positions.push(
        nodeA.position.x, nodeA.position.y, nodeA.position.z,
        nodeB.position.x, nodeB.position.y, nodeB.position.z
      );
      
      // Store connection reference
      const connection = {
        startNode: nodeA,
        endNode: nodeB,
        positionIndex: positions.length - 6, // Start position index
        distance: distance,
        active: false,
        pulseLine: null,
        originalNodeScales: {
          start: nodeA.scale.clone(),
          end: nodeB.scale.clone()
        }
      };
      
      connections.push(connection);
      connectionCount++;
      
      // Store in the appropriate collection
      if (nodeA.userData.wallet.type === 'fartcoin') {
        fartcoinConnections.push(connection);
        connectionStats.fartcoinConnections++;
      } else {
        goattokenConnections.push(connection);
        connectionStats.goattokenConnections++;
      }
    }
  }
  
  // Update statistics
  connectionStats.maxDistance = maxDistance;
  connectionStats.avgDistance = connectionCount > 0 ? totalDistance / (nodes.length * connectionCount) : 0;
  
  // Create buffer geometry
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  
  // Create material with low opacity
  const material = new THREE.LineBasicMaterial({
    color: color,
    transparent: true,
    opacity: 0.03, // Semi-transparent as required
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  
  // Create line segments for all connections
  return new THREE.LineSegments(geometry, material);
}

/**
 * Start continuous pulse animation on random connections
 */
function startPulseAnimation() {
  // Start with one pulse
  animateRandomConnection();
  
  // Continue with regular interval
  setInterval(animateRandomConnection, PULSE_INTERVAL);
}

/**
 * Animate a random connection with nodes
 */
function animateRandomConnection() {
  // Get all available connections (not currently active)
  const allConnections = [...fartcoinConnections, ...goattokenConnections].filter(conn => !conn.active);
  
  if (allConnections.length === 0) return;
  
  // Select a random connection
  const randomIndex = Math.floor(Math.random() * allConnections.length);
  const connection = allConnections[randomIndex];
  
  // Activate the connection
  connection.active = true;
  connection.pulseStartTime = Date.now();
  
  // Store original node scales (in case they changed from hover state)
  connection.originalNodeScales = {
    start: connection.startNode.scale.clone(),
    end: connection.endNode.scale.clone()
  };
  
  // Get nodes and determine color based on type
  const startNode = connection.startNode;
  const endNode = connection.endNode;
  const isGoattoken = startNode.userData.wallet.type === 'goattoken';
  const pulseColor = isGoattoken ? GOATTOKEN_PULSE_COLOR : FARTCOIN_PULSE_COLOR;
  
  // Create a glowing line for the pulse
  const pulseLine = createPulseLine(
    startNode.position,
    endNode.position,
    pulseColor
  );
  
  // Store pulse line reference
  connection.pulseLine = pulseLine;
  
  // Add to scene
  pulseContainer.add(pulseLine);
  
  // Add to active connections
  activeConnections.push(connection);
}

/**
 * Create a line for pulse visualization
 */
function createPulseLine(start, end, color) {
  // Create geometry
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([
    start.x, start.y, start.z,
    end.x, end.y, end.z
  ], 3));
  
  // Create glowing material
  const material = new THREE.LineBasicMaterial({
    color: color,
    transparent: true,
    opacity: 0.0, // Start invisible and fade in
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    linewidth: 2 // Thicker line for pulse (limited browser support)
  });
  
  // Create line
  return new THREE.Line(geometry, material);
}

/**
 * Update all active connection animations
 */
export function updateTransactionPulses() {
  const currentTime = Date.now();
  const completedAnimations = [];
  
  // Update each active connection
  for (const connection of activeConnections) {
    const elapsedTime = (currentTime - connection.pulseStartTime) / 1000; // in seconds
    
    // Check if animation is complete
    if (elapsedTime > PULSE_DURATION) {
      // Reset node scales to original
      connection.startNode.scale.copy(connection.originalNodeScales.start);
      connection.endNode.scale.copy(connection.originalNodeScales.end);
      
      // Remove pulse line
      if (connection.pulseLine) {
        pulseContainer.remove(connection.pulseLine);
        connection.pulseLine = null;
      }
      
      // Mark connection as inactive
      connection.active = false;
      
      // Mark for removal from active list
      completedAnimations.push(connection);
      continue;
    }
    
    // Calculate animation progress (0 to 1)
    const progress = elapsedTime / PULSE_DURATION;
    
    // Animation curve - start slow, peak in the middle, end slow
    let intensity;
    if (progress < 0.2) {
      // Ramp up (0 to 1)
      intensity = progress * 5;
    } else if (progress < 0.8) {
      // Hold at peak
      intensity = 1.0;
    } else {
      // Ramp down (1 to 0)
      intensity = 1.0 - ((progress - 0.8) * 5);
    }
    
    // Update line opacity
    if (connection.pulseLine) {
      connection.pulseLine.material.opacity = intensity;
    }
    
    // Scale up nodes slightly during animation
    const scaleModifier = 1 + intensity * 0.3; // Scale up to 30% larger
    
    // Apply scale, preserving any existing modifications
    connection.startNode.scale.copy(connection.originalNodeScales.start).multiplyScalar(scaleModifier);
    connection.endNode.scale.copy(connection.originalNodeScales.end).multiplyScalar(scaleModifier);
    
    // Enhance glow on nodes during animation
    if (connection.startNode.children.length > 0) {
      const glowMesh = connection.startNode.children[0];
      if (glowMesh.material && glowMesh.material.uniforms && glowMesh.material.uniforms.intensity) {
        // Increase glow intensity based on pulse intensity
        const baseIntensity = glowMesh.material.uniforms.intensity.baseValue || 1.5;
        glowMesh.material.uniforms.intensity.value = baseIntensity * (1 + intensity * 0.5);
      }
    }
    
    if (connection.endNode.children.length > 0) {
      const glowMesh = connection.endNode.children[0];
      if (glowMesh.material && glowMesh.material.uniforms && glowMesh.material.uniforms.intensity) {
        // Increase glow intensity based on pulse intensity
        const baseIntensity = glowMesh.material.uniforms.intensity.baseValue || 1.5;
        glowMesh.material.uniforms.intensity.value = baseIntensity * (1 + intensity * 0.5);
      }
    }
  }
  
  // Remove completed animations
  if (completedAnimations.length > 0) {
    activeConnections = activeConnections.filter(conn => !completedAnimations.includes(conn));
  }
}

/**
 * Store the original intensity values for glow meshes
 * Used to properly restore glow after animations
 */
export function storeOriginalGlowIntensities(walletNodes) {
  walletNodes.forEach(node => {
    if (node.children.length > 0) {
      const glowMesh = node.children[0];
      if (glowMesh.material && glowMesh.material.uniforms && glowMesh.material.uniforms.intensity) {
        // Store the base intensity for later reference
        glowMesh.material.uniforms.intensity.baseValue = glowMesh.material.uniforms.intensity.value;
      }
    }
  });
}