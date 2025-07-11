// main.js - Main application entry point
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { FlyControls } from 'three/examples/jsm/controls/FlyControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { loadWalletData } from './dataLoader.js';
import { generateFractalPosition, generateNodeSize, getWalletColor, initGalaxyContainer, galaxyContainer } from './fractalPlacement.js';
import { TooltipHandler } from './tooltipHandler.js';
import { createGlowMaterial } from './shaders.js';
import { createNodeConnections, updateTransactionPulses, storeOriginalGlowIntensities } from './nodeConnections.js';

// Global variables
let scene, camera, renderer;
let controls;
let wallets = [];
let walletNodes = [];
let raycaster, mouse;
let tooltipHandler;
let hoveredWallet = null;
let paused = false;
let galaxyRotationSpeed = 0.0002; // Slow rotation speed for galactic swirl
let galaxyObject; // Reference to the galaxy container object
let lastMouseActivity = Date.now(); // Track when mouse was last active
let mouseInactivityTime = 10000; // 10 seconds of inactivity before auto-rotation
let isAutoRotating = false;
let stats = {
  fartcoinCount: 0,
  goattokenCount: 0,
  totalCount: 0
};

// Node interaction variables
let interactableWallet = null;
let showingInteractionPrompt = false;
let confirmationDialogVisible = false;
let soundEffects = {
  fartcoin: [],
  goattoken: []
};

// Post-processing variables
let composer;
let bloomPass;
const BLOOM_SCENE = 1;
const bloomLayer = new THREE.Layers();
bloomLayer.set(BLOOM_SCENE);

// Node connection variables
let nodeConnectionObjects = null;

// Core orb variables
let coreOrb = null;
let coreOrbGlow = null;
let orbLight = null;

// Preload sound effects
function preloadSoundEffects() {
  console.log('Preloading sound effects...');
  
  // Preload fartcoin sound effects
  for (let i = 1; i <= 5; i++) {
    const paddedNum = i.toString().padStart(3, '0');
    const audio = new Audio(`sound/fart-${paddedNum}.mp3`);
    audio.load();
    soundEffects.fartcoin.push(audio);
  }
  
  // Preload goattoken sound effects
  for (let i = 1; i <= 5; i++) {
    const paddedNum = i.toString().padStart(3, '0');
    const audio = new Audio(`sound/bahhh-${paddedNum}.mp3`);
    audio.load();
    soundEffects.goattoken.push(audio);
  }
  
  console.log(`Loaded ${soundEffects.fartcoin.length} fartcoin sounds and ${soundEffects.goattoken.length} goattoken sounds`);
}

// Play random sound based on wallet type
function playWalletSound(walletType) {
  if (!walletType) return;
  
  const sounds = walletType === 'fartcoin' ? soundEffects.fartcoin : soundEffects.goattoken;
  if (sounds.length === 0) return;
  
  // Select a random sound effect
  const randomIndex = Math.floor(Math.random() * sounds.length);
  const sound = sounds[randomIndex];
  
  // Stop any currently playing instances of this sound
  sound.currentTime = 0;
  
  // Play the sound
  sound.play().catch(error => {
    console.error('Error playing sound:', error);
  });
}

// Initialize the application
async function init() {
  console.log('Initializing Fractal Wallet Visualization');
  
  // Preload sound effects
  preloadSoundEffects();
  
  // Create scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000011);
  
  // Create camera with extended far plane for the larger visualization
  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 10, 50000);
  
  // Position camera to see the entire galaxy structure
  camera.position.set(0, 0, 7000);
  camera.lookAt(0, 0, 0);
  
  // Create renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  document.body.appendChild(renderer.domElement);
  
  // Setup post-processing with bloom effect
  const renderScene = new RenderPass(scene, camera);
  
  // Add UnrealBloomPass for the glowing effect
  bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.5,    // strength
    0.4,    // radius
    0.1     // threshold
  );
  
  // Create composer for post-processing
  composer = new EffectComposer(renderer);
  composer.addPass(renderScene);
  composer.addPass(bloomPass);
  
  // Add ambient light
  const ambientLight = new THREE.AmbientLight(0x404040);
  scene.add(ambientLight);
  
  // Add directional light
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
  directionalLight.position.set(1, 1, 1);
  scene.add(directionalLight);
  
  // Add star field background - expanded for larger scale
  createStarField();
  
  // Initialize the galaxy container
  galaxyObject = initGalaxyContainer();
  scene.add(galaxyObject);
  
  // Create glowing core orb at the center
  createCoreOrb();
  
  // Initialize controls
  initControls();
  
  // Initialize raycaster for interaction
  raycaster = new THREE.Raycaster();
  raycaster.params.Points.threshold = 3; // Increase detection threshold for better interactions
  mouse = new THREE.Vector2();
  
  // Initialize tooltip handler
  tooltipHandler = new TooltipHandler();
  
  // Load wallet data and create visualization
  try {
    wallets = await loadWalletData();
    createWalletVisualization();
    
    // Update displayed stats
    updateStats();
  } catch (error) {
    console.error('Failed to initialize visualization:', error);
  }
  
  // Add event listeners
  window.addEventListener('resize', onWindowResize);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('keydown', onKeyDown);
  
  // Start animation loop
  animate();
}

// Update stat counters in the UI
function updateStats() {
  document.getElementById('fartcoin-count').textContent = stats.fartcoinCount;
  document.getElementById('goattoken-count').textContent = stats.goattokenCount;
  document.getElementById('node-count').textContent = stats.totalCount;
}

// Create star field background
function createStarField() {
  // Create distant stars (small and numerous)
  const starGeometry = new THREE.BufferGeometry();
  const starMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 2.5,
    transparent: true,
    opacity: 0.8
  });
  
  const starVertices = [];
  for (let i = 0; i < 30000; i++) {
    const x = (Math.random() - 0.5) * 40000;
    const y = (Math.random() - 0.5) * 40000;
    const z = (Math.random() - 0.5) * 40000;
    starVertices.push(x, y, z);
  }
  
  starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
  const stars = new THREE.Points(starGeometry, starMaterial);
  scene.add(stars);
  
  // Create medium brightness stars
  const mediumStarGeometry = new THREE.BufferGeometry();
  const mediumStarMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 5,
    transparent: true,
    opacity: 0.9
  });
  
  const mediumStarVertices = [];
  for (let i = 0; i < 1000; i++) {
    const x = (Math.random() - 0.5) * 30000;
    const y = (Math.random() - 0.5) * 30000;
    const z = (Math.random() - 0.5) * 30000;
    mediumStarVertices.push(x, y, z);
  }
  
  mediumStarGeometry.setAttribute('position', new THREE.Float32BufferAttribute(mediumStarVertices, 3));
  const mediumStars = new THREE.Points(mediumStarGeometry, mediumStarMaterial);
  scene.add(mediumStars);
  
  // Create bright stars
  const brightStarGeometry = new THREE.BufferGeometry();
  const brightStarMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 8,
    transparent: true,
    opacity: 1.0
  });
  
  const brightStarVertices = [];
  for (let i = 0; i < 200; i++) {
    const x = (Math.random() - 0.5) * 25000;
    const y = (Math.random() - 0.5) * 25000;
    const z = (Math.random() - 0.5) * 25000;
    brightStarVertices.push(x, y, z);
  }
  
  brightStarGeometry.setAttribute('position', new THREE.Float32BufferAttribute(brightStarVertices, 3));
  const brightStars = new THREE.Points(brightStarGeometry, brightStarMaterial);
  scene.add(brightStars);
}

// Initialize controls
function initControls() {
  controls = new FlyControls(camera, renderer.domElement);
  controls.movementSpeed = 1000; // Increased for the larger scale
  controls.rollSpeed = 0.15;
  controls.dragToLook = true;
  controls.autoForward = false;
}

// Create wallet visualization
function createWalletVisualization() {
  console.log(`Creating visualization for ${wallets.length} wallets`);
  
  walletNodes = [];
  stats.fartcoinCount = 0;
  stats.goattokenCount = 0;
  
  // Create node materials with custom shaders
  const fartcoinShaderMaterial = new THREE.ShaderMaterial(
    createGlowMaterial(new THREE.Color(0x8A2BE2), 1.8) // Purple with higher intensity
  );
  
  const goattokenShaderMaterial = new THREE.ShaderMaterial(
    createGlowMaterial(new THREE.Color(0xFFA500), 1.8) // Orange with higher intensity
  );
  
  // Standard materials as fallback
  const fartcoinMaterial = new THREE.MeshPhongMaterial({
    color: 0x8A2BE2, // Purple
    emissive: 0x4B0082,
    specular: 0xffffff,
    shininess: 100,
    transparent: true,
    opacity: 0.9
  });
  
  const goattokenMaterial = new THREE.MeshPhongMaterial({
    color: 0xFFA500, // Orange
    emissive: 0xFF4500,
    specular: 0xffffff,
    shininess: 100,
    transparent: true,
    opacity: 0.9
  });
  
  // Create nodes for each wallet
  wallets.forEach((wallet, index) => {
    if (wallet.type === 'fartcoin') {
      stats.fartcoinCount++;
    } else {
      stats.goattokenCount++;
    }
    
    // Generate position using fractal placement
    const position = generateFractalPosition(index, wallets.length);
    
    // Generate size based on wallet data - scale up for visibility in the larger space
    const size = generateNodeSize(wallet) * 6;
    
    // Create geometry - fewer subdivisions for better performance with many nodes
    const geometry = new THREE.SphereGeometry(size, 16, 16);
    
    // Select material based on wallet type
    const material = wallet.type === 'fartcoin' ? fartcoinMaterial : goattokenMaterial;
    
    // Calculate distance from origin for opacity falloff
    const distanceFromOrigin = position.length();
    const maxDistance = 7000; // Adjust based on your scene scale
    
    // Apply opacity based on distance using sharper exponential falloff (exponent increased from 2 to 3)
    const opacityValue = Math.max(0.05, 1 / (1 + Math.pow(distanceFromOrigin / maxDistance, 3)));
    
    // Create mesh with opacity applied
    const nodeMaterial = material.clone();
    nodeMaterial.transparent = true;
    nodeMaterial.opacity = opacityValue;
    
    const mesh = new THREE.Mesh(geometry, nodeMaterial);
    mesh.position.copy(position);
    
    // Add a glow effect using our custom shader
    const glowSize = size * 2.2; // Larger glow for better visibility
    const glowGeometry = new THREE.SphereGeometry(glowSize, 24, 24);
    const glowMaterial = wallet.type === 'fartcoin' ? 
      fartcoinShaderMaterial.clone() : 
      goattokenShaderMaterial.clone();
    
    // Also apply opacity to glow material
    if (glowMaterial.uniforms && glowMaterial.uniforms.opacity) {
      glowMaterial.uniforms.opacity.value = opacityValue;
    }
    
    const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    mesh.add(glowMesh);
    
    // Store reference to wallet data
    mesh.userData.wallet = wallet;
    
    // Add to galaxy container instead of directly to scene
    galaxyObject.add(mesh);
    walletNodes.push(mesh);
  });
  
  stats.totalCount = walletNodes.length;
  console.log(`Created ${walletNodes.length} wallet nodes (${stats.fartcoinCount} Fartcoin, ${stats.goattokenCount} Goattoken)`);
  
  // Store original glow intensities for proper animation restoration
  storeOriginalGlowIntensities(walletNodes);
  
  // Create local node connections (only between nearest neighbors)
  console.log('Creating local node connection mesh...');
  nodeConnectionObjects = createNodeConnections(walletNodes, galaxyObject);
  
  // Log the connection statistics
  const connectionStats = nodeConnectionObjects.connectionData;
  console.log(`Created ${connectionStats.totalConnections} local connections ` +
              `(${connectionStats.fartcoinConnections} Fartcoin, ${connectionStats.goattokenConnections} Goattoken)`);
  console.log(`Average connections per node: ${connectionStats.avgConnectionsPerNode.toFixed(2)}`);
  console.log(`Max connection distance: ${connectionStats.maxDistance.toFixed(2)}`);
  
  // Create a log file with connection information
  createConnectionLog(connectionStats);
}

// Create a log file with connection information
function createConnectionLog(connectionStats) {
  // This function would normally write to a file, but in a browser environment,
  // we'll just log to console and simulate the file creation
  const logData = {
    timestamp: new Date().toISOString(),
    stats: {
      nodes: {
        total: stats.totalCount,
        fartcoin: stats.fartcoinCount,
        goattoken: stats.goattokenCount
      },
      connections: {
        total: connectionStats.totalConnections,
        fartcoin: connectionStats.fartcoinConnections,
        goattoken: connectionStats.goattokenConnections,
        averagePerNode: connectionStats.avgConnectionsPerNode,
        maxDistance: connectionStats.maxDistance,
        averageDistance: connectionStats.avgDistance
      }
    },
    configuration: {
      minNeighbors: 3,
      maxNeighbors: 6,
      lineOpacity: 0.03,
      pulseDuration: 1.0,
      pulseInterval: '500ms',
      localConnections: true
    }
  };
  
  console.log('Local node mesh connection log:', logData);
  
  // In a production environment, we would save this to a file
  // For now, we'll just add it to window object for debugging
  window.nodeMeshLocalConnectionLog = logData;
  
  // Create a physical log file for the GitHub repo
  const logContent = JSON.stringify(logData, null, 2);
  console.log('Connection log data ready:', logContent.substring(0, 100) + '...');
}

// Handle window resize
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  
  // Update renderer and composer sizes
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
  
  // Update bloom pass resolution
  bloomPass.resolution.set(window.innerWidth, window.innerHeight);
}

// This function is replaced by the updated onMouseMove function below

// Check if a wallet is directly in front of the camera for interaction
function checkForWalletInteraction(intersects) {
  // Reset interaction state if we're not looking at any wallet
  if (intersects.length === 0) {
    if (interactableWallet) {
      interactableWallet = null;
      hideInteractionPrompt();
    }
    return;
  }
  
  const intersectedObject = intersects[0].object;
  const wallet = intersectedObject.userData.wallet;
  
  // Calculate dot product between camera direction and direction to wallet
  // This checks if we're looking directly at the wallet
  const cameraDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
  
  const walletDirection = new THREE.Vector3();
  walletDirection.subVectors(intersectedObject.position, camera.position).normalize();
  
  const dotProduct = cameraDirection.dot(walletDirection);
  const distanceToWallet = camera.position.distanceTo(intersectedObject.position);
  
  // If we're looking directly at the wallet (dot product close to 1) and it's close enough
  if (dotProduct > 0.95 && distanceToWallet < 1000) {
    if (interactableWallet !== wallet) {
      interactableWallet = wallet;
      showInteractionPrompt();
    }
  } else {
    if (interactableWallet) {
      interactableWallet = null;
      hideInteractionPrompt();
    }
  }
}

// Show the interaction prompt
function showInteractionPrompt() {
  if (showingInteractionPrompt) return;
  
  // Create the interaction prompt if it doesn't exist
  let promptElement = document.getElementById('interaction-prompt');
  if (!promptElement) {
    promptElement = document.createElement('div');
    promptElement.id = 'interaction-prompt';
    promptElement.style.position = 'absolute';
    promptElement.style.top = '50%';
    promptElement.style.left = '50%';
    promptElement.style.transform = 'translate(-50%, -50%)';
    promptElement.style.color = 'white';
    promptElement.style.fontSize = '24px';
    promptElement.style.fontWeight = 'bold';
    promptElement.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    promptElement.style.padding = '10px 20px';
    promptElement.style.borderRadius = '5px';
    promptElement.style.zIndex = '1000';
    document.body.appendChild(promptElement);
  }
  
  promptElement.textContent = 'Press E';
  promptElement.style.display = 'block';
  showingInteractionPrompt = true;
}

// Hide the interaction prompt
function hideInteractionPrompt() {
  if (!showingInteractionPrompt) return;
  
  const promptElement = document.getElementById('interaction-prompt');
  if (promptElement) {
    promptElement.style.display = 'none';
  }
  showingInteractionPrompt = false;
}

// Show confirmation dialog
function showConfirmationDialog(wallet) {
  // Create the confirmation dialog if it doesn't exist
  let dialogElement = document.getElementById('confirmation-dialog');
  if (!dialogElement) {
    dialogElement = document.createElement('div');
    dialogElement.id = 'confirmation-dialog';
    dialogElement.style.position = 'absolute';
    dialogElement.style.top = '50%';
    dialogElement.style.left = '50%';
    dialogElement.style.transform = 'translate(-50%, -50%)';
    dialogElement.style.color = 'white';
    dialogElement.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    dialogElement.style.padding = '20px';
    dialogElement.style.borderRadius = '10px';
    dialogElement.style.zIndex = '2000';
    dialogElement.style.width = '400px';
    dialogElement.style.textAlign = 'center';
    dialogElement.style.border = '1px solid #444';
    document.body.appendChild(dialogElement);
  }
  
  // Set the content of the dialog
  dialogElement.innerHTML = `
    <h3 style="margin-top: 0;">You are about to open a pop-up to:</h3>
    <p style="font-family: monospace; word-break: break-all; margin-bottom: 20px;">
      https://solscan.io/account/${wallet.Account}
    </p>
    <p>Confirm? <span style="font-weight: bold;">Y</span> / <span style="font-weight: bold;">N</span></p>
  `;
  
  // Show the dialog
  dialogElement.style.display = 'block';
  confirmationDialogVisible = true;
}

// Hide confirmation dialog
function hideConfirmationDialog() {
  const dialogElement = document.getElementById('confirmation-dialog');
  if (dialogElement) {
    dialogElement.style.display = 'none';
  }
  confirmationDialogVisible = false;
}

// Open Solscan URL
function openSolscanUrl(walletAddress) {
  const url = `https://solscan.io/account/${walletAddress}`;
  window.open(url, '_blank');
}

// Handle keyboard input
function onKeyDown(event) {
  // Toggle pause with Escape key
  if (event.key === 'Escape') {
    // If confirmation dialog is open, close it
    if (confirmationDialogVisible) {
      hideConfirmationDialog();
      return;
    }
    
    // Otherwise toggle pause
    paused = !paused;
    const pauseIndicator = document.getElementById('pause-indicator');
    pauseIndicator.style.display = paused ? 'block' : 'none';
    controls.enabled = !paused;
    return;
  }
  
  // Handle interaction key (E)
  if (event.key === 'e' || event.key === 'E') {
    if (interactableWallet && !confirmationDialogVisible) {
      // Play sound effect
      playWalletSound(interactableWallet.type);
      
      // Show confirmation dialog
      showConfirmationDialog(interactableWallet);
    }
    return;
  }
  
  // Handle confirmation dialog responses
  if (confirmationDialogVisible) {
    // Confirm (Y key)
    if (event.key === 'y' || event.key === 'Y') {
      openSolscanUrl(interactableWallet.Account);
      hideConfirmationDialog();
    }
    
    // Cancel (N key)
    if (event.key === 'n' || event.key === 'N') {
      hideConfirmationDialog();
    }
  }
}

// Check for hovering over wallet nodes and interaction
function checkHover() {
  if (paused || confirmationDialogVisible) return;
  
  // Update the raycaster
  raycaster.setFromCamera(mouse, camera);
  
  // Check for intersections with wallet nodes
  const intersects = raycaster.intersectObjects(walletNodes);
  
  // First handle hover effect
  if (intersects.length > 0) {
    const intersectedObject = intersects[0].object;
    const wallet = intersectedObject.userData.wallet;
    
    // If hovering over a new node
    if (hoveredWallet !== wallet) {
      // Reset previous hovered node if exists
      if (hoveredWallet) {
        const previousNode = walletNodes.find(node => node.userData.wallet === hoveredWallet);
        if (previousNode) {
          previousNode.scale.set(1, 1, 1);
        }
      }
      
      // Highlight new hovered node
      intersectedObject.scale.set(1.3, 1.3, 1.3);
      hoveredWallet = wallet;
      
      // Show tooltip
      tooltipHandler.showTooltip(wallet);
    }
  } else {
    // If not hovering over any node
    if (hoveredWallet) {
      // Reset previous hovered node
      const previousNode = walletNodes.find(node => node.userData.wallet === hoveredWallet);
      if (previousNode) {
        previousNode.scale.set(1, 1, 1);
      }
      
      // Hide tooltip
      tooltipHandler.hideTooltip();
      hoveredWallet = null;
    }
  }
  
  // Now check for interaction prompt
  checkForWalletInteraction(intersects);
}

// Handle mouse movement for the auto-rotation feature
function updateMouseActivity() {
  lastMouseActivity = Date.now();
  if (isAutoRotating) {
    isAutoRotating = false;
  }
}

// Update mouse movement for raycasting
function onMouseMove(event) {
  // Calculate mouse position in normalized device coordinates
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  
  // Update mouse activity timestamp for auto-rotation
  updateMouseActivity();
}

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  
  if (!paused) {
    // Update controls
    controls.update(0.01);
    
    // Check for hovering over nodes
    checkHover();
    
    // Check if we should start auto-rotation based on mouse inactivity
    const currentTime = Date.now();
    if (!isAutoRotating && (currentTime - lastMouseActivity > mouseInactivityTime)) {
      isAutoRotating = true;
    }
    
    // Apply galaxy rotation if auto-rotating or regardless for slow swirl effect
    if (galaxyObject) {
      // Always rotate slightly for the swirling effect, but rotate faster when auto-rotating
      const baseRotationSpeed = isAutoRotating ? galaxyRotationSpeed * 2 : galaxyRotationSpeed;
      
      // Add parallax spin effect with matched rotation speeds for Y and Z axes
      galaxyObject.rotation.y += baseRotationSpeed * 2.5; // 0.0005
      galaxyObject.rotation.z += baseRotationSpeed * 2.5; // 0.0005 (increased from 0.0003)
      
      // Apply breathing animation to the entire mesh
      const t = performance.now() * 0.0005;
      const scale = 1 + Math.sin(t) * 0.05; // 5% breathing effect
      galaxyObject.scale.set(scale, scale, scale);
      
      // Synchronize core orb glow with breathing
      if (coreOrbGlow && coreOrbGlow.material.uniforms && coreOrbGlow.material.uniforms.intensity) {
        const glowIntensity = 2.0 + Math.sin(t) * 0.8; // Increased intensity variation
        coreOrbGlow.material.uniforms.intensity.value = glowIntensity;
        
        // Pulse the point light intensity with higher values
        const lightChildren = scene.children.filter(child => child instanceof THREE.PointLight);
        if (lightChildren.length > 0) {
          lightChildren[0].intensity = 10 + Math.sin(t) * 5; // Vary between 5 and 15 for stronger effect
        }
        
        // Also pulse the emissive intensity if available
        if (coreOrb && coreOrb.material && coreOrb.material.emissiveIntensity !== undefined) {
          coreOrb.material.emissiveIntensity = 5 + Math.sin(t) * 2; // Vary between 3 and 7
        }
      }
    }
    
    // Animate the glow effect
    const time = Date.now() * 0.001;
    walletNodes.forEach(node => {
      if (node.children.length > 0) {
        const glowMesh = node.children[0];
        if (glowMesh.material && glowMesh.material.uniforms && glowMesh.material.uniforms.intensity) {
          const pulseIntensity = 1.5 + Math.sin(time + Math.random()) * 0.3;
          glowMesh.material.uniforms.intensity.value = pulseIntensity;
        }
      }
    });
    
    // Update transaction pulses if connections are initialized
    if (nodeConnectionObjects) {
      updateTransactionPulses();
    }
    
    // Render the scene with post-processing effects
    composer.render();
  }
}

// Create a glowing core orb at the center of the visualization
function createCoreOrb() {
  console.log('Creating central glowing orb...');
  
  // Create the core orb geometry with high resolution for perfect spherical appearance
  const orbGeometry = new THREE.SphereGeometry(200, 64, 64);
  
  // Create the core orb material with MeshStandardMaterial for more realistic lighting
  const orbMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff, // Pure white color
    emissive: 0xffffff,
    emissiveIntensity: 5,
    roughness: 0.2,
    metalness: 1.0,
  });
  
  // Create the core orb mesh
  coreOrb = new THREE.Mesh(orbGeometry, orbMaterial);
  coreOrb.position.set(0, 0, 0);
  coreOrb.layers.enable(BLOOM_SCENE); // Set the bloom layer for the orb
  
  // Add strong point light at the center to enhance glow
  orbLight = new THREE.PointLight(0xffffff, 10, 4000);
  orbLight.position.set(0, 0, 0);
  scene.add(orbLight);
  
  // Create a larger, softer glow around the orb using shader material
  const glowGeometry = new THREE.SphereGeometry(300, 32, 32);
  const glowMaterial = new THREE.ShaderMaterial({
    uniforms: {
      glowColor: { value: new THREE.Color(0xffffff) },
      intensity: { value: 2.0 }
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vPosition;
      
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 glowColor;
      uniform float intensity;
      
      varying vec3 vNormal;
      varying vec3 vPosition;
      
      void main() {
        float depth = 1.0 - min(1.0, length(vPosition) / 400.0);
        float glow = pow(0.9 - dot(vNormal, vec3(0, 0, 1.0)), 4.0) * intensity;
        
        gl_FragColor = vec4(glowColor, 0.5) * glow * depth;
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending
  });
  
  coreOrbGlow = new THREE.Mesh(glowGeometry, glowMaterial);
  coreOrb.add(coreOrbGlow);
  
  // Add ambient light to ensure the orb is always visible
  const ambientLight = new THREE.AmbientLight(0x404040);
  coreOrb.add(ambientLight);
  
  // Add to scene
  scene.add(coreOrb);
  
  console.log('Core orb created and added to scene with advanced lighting and materials');
  return coreOrb;
}

// Start the application when the page loads
window.addEventListener('load', init);