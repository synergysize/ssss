// main.js - Main application entry point
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { FlyControls } from 'three/examples/jsm/controls/FlyControls.js';
import { loadWalletData } from './dataLoader.js';
import { generateFractalPosition, generateNodeSize, getWalletColor, initGalaxyContainer, galaxyContainer } from './fractalPlacement.js';
import { TooltipHandler } from './tooltipHandler.js';
import { createGlowMaterial } from './shaders.js';

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

// Initialize the application
async function init() {
  console.log('Initializing Fractal Wallet Visualization');
  
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
    
    // Create mesh
    const mesh = new THREE.Mesh(geometry, material.clone());
    mesh.position.copy(position);
    
    // Add a glow effect using our custom shader
    const glowSize = size * 2.2; // Larger glow for better visibility
    const glowGeometry = new THREE.SphereGeometry(glowSize, 24, 24);
    const glowMaterial = wallet.type === 'fartcoin' ? 
      fartcoinShaderMaterial.clone() : 
      goattokenShaderMaterial.clone();
    
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
}

// Handle window resize
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// This function is replaced by the updated onMouseMove function below

// Handle keyboard input
function onKeyDown(event) {
  // Toggle pause with Escape key
  if (event.key === 'Escape') {
    paused = !paused;
    const pauseIndicator = document.getElementById('pause-indicator');
    pauseIndicator.style.display = paused ? 'block' : 'none';
    controls.enabled = !paused;
  }
}

// Check for hovering over wallet nodes
function checkHover() {
  if (paused) return;
  
  // Update the raycaster
  raycaster.setFromCamera(mouse, camera);
  
  // Check for intersections with wallet nodes
  const intersects = raycaster.intersectObjects(walletNodes);
  
  // If hovering over a node
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
      const rotationSpeed = isAutoRotating ? galaxyRotationSpeed * 2 : galaxyRotationSpeed;
      galaxyObject.rotation.y += rotationSpeed;
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
    
    // Render the scene
    renderer.render(scene, camera);
  }
}

// Start the application when the page loads
window.addEventListener('load', init);