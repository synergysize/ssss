// app.js - Main application script with direct Three.js integration
// Debug logging function
function logDebug(category, message, data = null) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${category}] ${message}`);
  if (data) {
    console.log(data);
  }
  
  // Add to debug panel
  let debugPanel = document.getElementById('debug-panel');
  if (debugPanel) {
    const logEntry = document.createElement('div');
    logEntry.textContent = `[${category}] ${message}`;
    debugPanel.appendChild(logEntry);
    
    // Keep only last 15 messages
    while (debugPanel.childNodes.length > 15) {
      debugPanel.removeChild(debugPanel.firstChild);
    }
  }
}

// Global variables
let scene, camera, renderer, controls;
let mouse = new THREE.Vector2();
let raycaster;
let walletNodes = [];
let hoveredWallet = null;
let tooltipHandler;
let paused = false;
let galaxyObject;

// Initialize application
function init() {
  logDebug('INIT', 'Starting application initialization');
  
  // Create scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000033); // Dark blue for testing
  logDebug('SCENE', 'Scene created');
  
  // Create camera
  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 10, 5000);
  camera.position.set(0, 0, 1000);
  logDebug('CAMERA', 'Camera created at position', camera.position);
  
  // Create renderer
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    document.body.appendChild(renderer.domElement);
    logDebug('RENDERER', 'Renderer created and added to DOM');
  } catch (rendererError) {
    console.error('Failed to create renderer:', rendererError);
    showErrorMessage('WebGL renderer initialization failed. Your browser may not support WebGL.');
    return;
  }
  
  // Create controls
  try {
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 100;
    controls.maxDistance = 2000;
    logDebug('CONTROLS', 'OrbitControls initialized');
  } catch (controlsError) {
    console.error('Failed to create controls:', controlsError);
    // Continue without controls
  }
  
  // Initialize raycaster
  raycaster = new THREE.Raycaster();
  
  // Create lights
  const ambientLight = new THREE.AmbientLight(0x404040);
  scene.add(ambientLight);
  logDebug('LIGHT', 'Ambient light added');
  
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
  directionalLight.position.set(1, 1, 1);
  scene.add(directionalLight);
  logDebug('LIGHT', 'Directional light added');
  
  // Create galaxy container
  galaxyObject = new THREE.Object3D();
  scene.add(galaxyObject);
  logDebug('GALAXY', 'Galaxy container created');
  
  // Create test wallet nodes
  createTestWallets();
  
  // Initialize tooltip handler
  initTooltipHandler();
  
  // Add event listeners
  window.addEventListener('resize', onWindowResize);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('keydown', onKeyDown);
  logDebug('EVENTS', 'Event listeners added');
  
  // Start animation loop
  animate();
}

// Create test wallet nodes
function createTestWallets() {
  // Create fartcoin node
  const fartcoinGeometry = new THREE.SphereGeometry(100, 32, 32);
  const fartcoinMaterial = new THREE.MeshPhongMaterial({
    color: 0x8A2BE2, // Purple
    emissive: 0x4B0082,
    specular: 0xffffff,
    shininess: 100
  });
  const fartcoinNode = new THREE.Mesh(fartcoinGeometry, fartcoinMaterial);
  fartcoinNode.position.set(-200, 0, 0);
  fartcoinNode.userData.wallet = {
    type: 'fartcoin',
    Account: 'TestFartcoinWallet1234567890',
    Quantity: '10000'
  };
  galaxyObject.add(fartcoinNode);
  walletNodes.push(fartcoinNode);
  logDebug('TEST', 'Fartcoin test node created');
  
  // Create goattoken node
  const goattokenGeometry = new THREE.SphereGeometry(80, 32, 32);
  const goattokenMaterial = new THREE.MeshPhongMaterial({
    color: 0xFFA500, // Orange
    emissive: 0xFF4500,
    specular: 0xffffff,
    shininess: 100
  });
  const goattokenNode = new THREE.Mesh(goattokenGeometry, goattokenMaterial);
  goattokenNode.position.set(200, 0, 0);
  goattokenNode.userData.wallet = {
    type: 'goattoken',
    Account: 'TestGoattokenWallet0987654321',
    Quantity: '5000'
  };
  galaxyObject.add(goattokenNode);
  walletNodes.push(goattokenNode);
  logDebug('TEST', 'Goattoken test node created');
  
  // Update stats
  document.getElementById('node-count').textContent = walletNodes.length;
  document.getElementById('fartcoin-count').textContent = '1';
  document.getElementById('goattoken-count').textContent = '1';
}

// Initialize tooltip handler
function initTooltipHandler() {
  tooltipHandler = {
    tooltip: document.getElementById('wallet-tooltip'),
    
    showTooltip: function(wallet) {
      if (!this.tooltip) return;
      
      const title = this.tooltip.querySelector('.tooltip-title');
      const address = this.tooltip.querySelector('.tooltip-address');
      const fartcoin = this.tooltip.querySelector('.tooltip-fartcoin');
      const goat = this.tooltip.querySelector('.tooltip-goat');
      const total = this.tooltip.querySelector('.tooltip-total');
      
      title.textContent = wallet.type === 'fartcoin' ? 'Fartcoin Wallet' : 'Goattoken Wallet';
      address.textContent = wallet.Account || 'Unknown Address';
      
      const fartcoinAmount = wallet.type === 'fartcoin' ? wallet.Quantity || '0' : '0';
      const goatAmount = wallet.type === 'goattoken' ? wallet.Quantity || '0' : '0';
      
      fartcoin.textContent = `💨: ${fartcoinAmount}`;
      goat.textContent = `🐐: ${goatAmount}`;
      
      total.textContent = `Total Value: ${wallet.type === 'fartcoin' ? fartcoinAmount : goatAmount}`;
      
      this.tooltip.style.display = 'block';
      this.updatePosition();
    },
    
    hideTooltip: function() {
      if (this.tooltip) {
        this.tooltip.style.display = 'none';
      }
    },
    
    updatePosition: function() {
      const margin = 15;
      const mouseX = (mouse.clientX !== undefined) ? mouse.clientX : 0;
      const mouseY = (mouse.clientY !== undefined) ? mouse.clientY : 0;
      
      if (this.tooltip.style.display === 'block') {
        this.tooltip.style.left = `${mouseX + margin}px`;
        this.tooltip.style.top = `${mouseY + margin}px`;
      }
    }
  };
  
  logDebug('UI', 'Tooltip handler initialized');
}

// Show error message
function showErrorMessage(message) {
  const errorElement = document.createElement('div');
  errorElement.style.position = 'absolute';
  errorElement.style.top = '50%';
  errorElement.style.left = '50%';
  errorElement.style.transform = 'translate(-50%, -50%)';
  errorElement.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
  errorElement.style.color = 'red';
  errorElement.style.padding = '20px';
  errorElement.style.borderRadius = '10px';
  errorElement.style.fontFamily = 'Arial, sans-serif';
  errorElement.style.fontSize = '16px';
  errorElement.style.textAlign = 'center';
  errorElement.style.zIndex = '1000';
  errorElement.style.maxWidth = '80%';
  
  errorElement.innerHTML = `
    <h3>Error</h3>
    <p>${message}</p>
    <p>Please try a different browser or ensure WebGL is enabled.</p>
  `;
  
  document.body.appendChild(errorElement);
}

// Handle window resize
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// Handle mouse movement
function onMouseMove(event) {
  // Save client coordinates for tooltip positioning
  mouse.clientX = event.clientX;
  mouse.clientY = event.clientY;
  
  // Calculate normalized device coordinates for raycasting
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  
  // Update tooltip position if visible
  if (tooltipHandler) {
    tooltipHandler.updatePosition();
  }
}

// Handle keyboard input
function onKeyDown(event) {
  // Toggle pause with Escape key
  if (event.key === 'Escape') {
    paused = !paused;
    const pauseIndicator = document.getElementById('pause-indicator');
    if (pauseIndicator) {
      pauseIndicator.style.display = paused ? 'block' : 'none';
    }
    if (controls) {
      controls.enabled = !paused;
    }
  }
}

// Check for hovering over nodes
function checkHover() {
  if (paused) return;
  
  // Update the raycaster
  raycaster.setFromCamera(mouse, camera);
  
  // Check for intersections with wallet nodes
  const intersects = raycaster.intersectObjects(walletNodes);
  
  if (intersects.length > 0) {
    const intersectedObject = intersects[0].object;
    const wallet = intersectedObject.userData.wallet;
    
    // If hovering over a new wallet
    if (hoveredWallet !== wallet) {
      // Reset previous hovered wallet
      if (hoveredWallet) {
        const previousNode = walletNodes.find(node => node.userData.wallet === hoveredWallet);
        if (previousNode) {
          previousNode.scale.set(1, 1, 1);
        }
      }
      
      // Highlight new hovered wallet
      intersectedObject.scale.set(1.3, 1.3, 1.3);
      hoveredWallet = wallet;
      
      // Show tooltip
      if (tooltipHandler) {
        tooltipHandler.showTooltip(wallet);
      }
    }
  } else {
    // Not hovering over any wallet
    if (hoveredWallet) {
      // Reset previous hovered wallet
      const previousNode = walletNodes.find(node => node.userData.wallet === hoveredWallet);
      if (previousNode) {
        previousNode.scale.set(1, 1, 1);
      }
      
      // Hide tooltip
      if (tooltipHandler) {
        tooltipHandler.hideTooltip();
      }
      hoveredWallet = null;
    }
  }
}

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  
  try {
    if (!paused) {
      // Update controls if available
      if (controls && controls.update) {
        controls.update();
      }
      
      // Check for node hovering
      checkHover();
      
      // Rotate galaxy object slightly
      if (galaxyObject) {
        galaxyObject.rotation.y += 0.001;
      }
      
      // Render the scene
      renderer.render(scene, camera);
    }
  } catch (error) {
    console.error('Animation error:', error);
    logDebug('ERROR', 'Animation loop error: ' + error.message);
  }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', init);