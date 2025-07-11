// nodeConnections.js - Create and manage node connections and transaction pulses

import * as THREE from 'three';

// Store all connections for reference
let fartcoinConnections = [];
let goattokenConnections = [];
let activePulseLines = [];

// Maximum number of active transaction pulses at any time (for performance)
const MAX_ACTIVE_PULSES = 50;

// Transaction pulse configuration
const PULSE_DURATION = 0.5; // seconds
const PULSE_INTERVAL_MIN = 300; // milliseconds
const PULSE_INTERVAL_MAX = 500; // milliseconds

// Container for pulse lines
let pulseContainer;

// Colors
const FARTCOIN_COLOR = 0x8A2BE2; // Purple
const GOATTOKEN_COLOR = 0xFFA500; // Orange
const FARTCOIN_PULSE_COLOR = 0xB866FF; // Brighter purple
const GOATTOKEN_PULSE_COLOR = 0xFFB347; // Brighter orange

// Create connections between nodes of the same type
export function createNodeConnections(walletNodes, galaxyObject) {
  console.log('Creating node connections...');
  
  // Initialize pulse container
  pulseContainer = new THREE.Group();
  galaxyObject.add(pulseContainer);
  
  // Separate nodes by type
  const fartcoinNodes = walletNodes.filter(node => node.userData.wallet.type === 'fartcoin');
  const goattokenNodes = walletNodes.filter(node => node.userData.wallet.type === 'goattoken');
  
  console.log(`Found ${fartcoinNodes.length} Fartcoin nodes and ${goattokenNodes.length} Goattoken nodes`);
  
  // Create connections for Fartcoin nodes (purple)
  const fartcoinMesh = createConnectionMesh(fartcoinNodes, new THREE.Color(FARTCOIN_COLOR));
  galaxyObject.add(fartcoinMesh);
  
  // Create connections for Goattoken nodes (orange)
  const goattokenMesh = createConnectionMesh(goattokenNodes, new THREE.Color(GOATTOKEN_COLOR));
  galaxyObject.add(goattokenMesh);
  
  console.log(`Created ${fartcoinConnections.length} Fartcoin connections and ${goattokenConnections.length} Goattoken connections`);
  
  // Setup initial transaction pulses
  for (let i = 0; i < Math.min(5, MAX_ACTIVE_PULSES); i++) {
    setTimeout(() => triggerRandomTransactionPulse(), i * 100);
  }
  
  // Create connection data for log
  const connectionData = {
    fartcoinConnections: fartcoinConnections.length,
    goattokenConnections: goattokenConnections.length,
    totalConnections: fartcoinConnections.length + goattokenConnections.length
  };
  
  return {
    fartcoinMesh,
    goattokenMesh,
    pulseContainer,
    connectionData
  };
}

// Create an optimized connection mesh for a set of nodes
function createConnectionMesh(nodes, color) {
  // Calculate appropriate connection density based on node count
  const nodeCount = nodes.length;
  let connectionsPerNode;
  
  if (nodeCount > 500) {
    connectionsPerNode = 3; // Minimal connections for very large sets
  } else if (nodeCount > 200) {
    connectionsPerNode = 5; // Few connections for large sets
  } else if (nodeCount > 100) {
    connectionsPerNode = 10; // Moderate connections for medium sets
  } else if (nodeCount > 50) {
    connectionsPerNode = 15; // More connections for smaller sets
  } else {
    connectionsPerNode = Math.max(5, Math.floor(nodeCount / 3)); // Connect to approximately 1/3 of nodes for small sets
  }
  
  // Create a single geometry for all connections
  const positions = [];
  const connections = [];
  
  for (let i = 0; i < nodes.length; i++) {
    const nodeA = nodes[i];
    
    // Connect to a limited number of other nodes (either all or a random subset)
    const connectionCount = Math.min(connectionsPerNode, nodes.length - 1);
    const connectedIndices = getRandomIndices(nodes.length, i, connectionCount);
    
    for (const j of connectedIndices) {
      const nodeB = nodes[j];
      
      // Avoid duplicate connections (if A→B exists, don't add B→A)
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
        startIndex: positions.length - 6, // Index in the position array
        endIndex: positions.length - 3,
        active: false,
        pulseStartTime: 0,
        pulseLine: null
      };
      
      connections.push(connection);
      
      // Store in the appropriate collection
      if (nodeA.userData.wallet.type === 'fartcoin') {
        fartcoinConnections.push(connection);
      } else {
        goattokenConnections.push(connection);
      }
    }
  }
  
  // Create buffer geometry
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  
  // Create material with low opacity
  const material = new THREE.LineBasicMaterial({
    color: color,
    transparent: true,
    opacity: 0.03,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  
  // Create line segments
  return new THREE.LineSegments(geometry, material);
}

// Get random indices for connections, excluding self
function getRandomIndices(total, excludeIndex, count) {
  const available = Array.from({ length: total }, (_, i) => i).filter(i => i !== excludeIndex);
  
  // Shuffle and take the first count elements
  const shuffled = available.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

// Start a transaction pulse on a random connection
export function triggerRandomTransactionPulse() {
  // If we've reached the maximum number of active pulses, don't add more
  if (activePulseLines.length >= MAX_ACTIVE_PULSES) {
    return;
  }
  
  // Randomly choose between fartcoin and goattoken connections
  const connectionPool = Math.random() < 0.5 ? fartcoinConnections : goattokenConnections;
  
  if (connectionPool.length === 0) return;
  
  // Select a random connection
  const connectionIndex = Math.floor(Math.random() * connectionPool.length);
  const connection = connectionPool[connectionIndex];
  
  // If this connection is already active, try another one
  if (connection.active) {
    triggerRandomTransactionPulse();
    return;
  }
  
  // Create the pulse line
  const startPos = connection.startNode.position;
  const endPos = connection.endNode.position;
  const isGoattoken = connection.startNode.userData.wallet.type === 'goattoken';
  
  // Create a line for the pulse
  const pulseLine = createPulseLine(
    startPos, 
    endPos, 
    isGoattoken ? GOATTOKEN_PULSE_COLOR : FARTCOIN_PULSE_COLOR
  );
  
  // Activate the connection
  connection.active = true;
  connection.pulseStartTime = Date.now();
  connection.pulseLine = pulseLine;
  
  // Add to active list
  activePulseLines.push({
    connection,
    line: pulseLine,
    startTime: Date.now()
  });
  
  // Add to scene
  pulseContainer.add(pulseLine);
  
  // Schedule next pulse after a random interval
  setTimeout(triggerRandomTransactionPulse, getRandomPulseInterval());
}

// Create a line for pulse visualization
function createPulseLine(start, end, color) {
  // Create a geometry for the pulse
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([
    start.x, start.y, start.z,
    end.x, end.y, end.z
  ], 3));
  
  // Create a glowing material for the pulse
  const material = new THREE.LineBasicMaterial({
    color: color,
    transparent: true,
    opacity: 0.0, // Start invisible and fade in
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    linewidth: 1.5 // Note: This has limited browser support
  });
  
  // Create the line
  return new THREE.Line(geometry, material);
}

// Get a random interval for transaction pulses
function getRandomPulseInterval() {
  return PULSE_INTERVAL_MIN + Math.random() * (PULSE_INTERVAL_MAX - PULSE_INTERVAL_MIN);
}

// Update all active transaction pulses
export function updateTransactionPulses() {
  const currentTime = Date.now();
  const expiredPulses = [];
  
  // Check all active pulses
  for (const pulse of activePulseLines) {
    const elapsedTime = (currentTime - pulse.startTime) / 1000; // Convert to seconds
    
    // If the pulse has expired
    if (elapsedTime > PULSE_DURATION) {
      // Mark connection as inactive
      pulse.connection.active = false;
      pulse.connection.pulseLine = null;
      
      // Remove pulse line from scene
      pulseContainer.remove(pulse.line);
      
      // Mark for removal from active list
      expiredPulses.push(pulse);
      continue;
    }
    
    // Calculate pulse intensity (brighten then fade)
    const normalizedTime = elapsedTime / PULSE_DURATION;
    let opacity;
    
    if (normalizedTime < 0.2) {
      // Ramp up quickly
      opacity = normalizedTime * 5;
    } else if (normalizedTime < 0.8) {
      // Stay bright
      opacity = 1.0;
    } else {
      // Fade out
      opacity = 1.0 - ((normalizedTime - 0.8) * 5);
    }
    
    // Update the line opacity
    pulse.line.material.opacity = opacity;
  }
  
  // Remove expired pulses from the active list
  if (expiredPulses.length > 0) {
    activePulseLines = activePulseLines.filter(pulse => !expiredPulses.includes(pulse));
    
    // If we've removed some pulses, trigger new ones to maintain activity
    if (activePulseLines.length < MAX_ACTIVE_PULSES / 2) {
      triggerRandomTransactionPulse();
    }
  }
}