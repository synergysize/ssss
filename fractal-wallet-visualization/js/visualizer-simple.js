// visualizer-simple.js - Creates the 3D visualization using pre-processed wallet data

let scene, camera, renderer, controls;
let raycaster, mouse, tooltip;
let particleGroups = {
    fartcoin: null,
    goattoken: null
};
let walletData = null;
let colors = null;

// Initialize the visualization
function init() {
    // Initialize colors
    colors = {
        fartcoin: new THREE.Color('#9c27b0'),  // Purple
        goattoken: new THREE.Color('#ff9800')  // Orange
    };
    
    // Setup basic scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    
    // Create camera
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 20000);
    camera.position.set(0, 0, 2000);
    
    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('canvas-container').appendChild(renderer.domElement);
    
    // Add controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.rotateSpeed = 0.5;
    controls.zoomSpeed = 1.2;
    
    // Setup raycaster for hover
    raycaster = new THREE.Raycaster();
    raycaster.params.Points.threshold = 5;
    mouse = new THREE.Vector2();
    
    // Get tooltip element
    tooltip = document.getElementById('tooltip');
    
    // Load wallet data and create visualization
    loadWalletData();
    
    // Event listeners
    window.addEventListener('resize', onWindowResize, false);
    window.addEventListener('mousemove', onMouseMove, false);
    
    // Start animation loop
    animate();
}

// Load the pre-processed wallet data
function loadWalletData() {
    fetch('wallet_data.json')
        .then(response => response.json())
        .then(data => {
            walletData = data;
            createParticles();
            updateCounters();
        })
        .catch(error => {
            console.error('Error loading wallet data:', error);
        });
}

// Create particle systems for each token type
function createParticles() {
    createParticleSystem('fartcoin', walletData.fartcoin);
    createParticleSystem('goattoken', walletData.goattoken);
    
    // Log to console
    console.log(`Created visualization with ${walletData.fartcoin.length} Fartcoin nodes and ${walletData.goattoken.length} Goattoken nodes`);
}

// Create a particle system for a specific token type
function createParticleSystem(type, nodes) {
    const particleCount = nodes.length;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colorArray = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const typeColor = colors[type];
    
    // Set positions, colors, and sizes
    for (let i = 0; i < particleCount; i++) {
        const position = nodes[i].position;
        
        positions[i * 3] = position.x;
        positions[i * 3 + 1] = position.y;
        positions[i * 3 + 2] = position.z;
        
        colorArray[i * 3] = typeColor.r;
        colorArray[i * 3 + 1] = typeColor.g;
        colorArray[i * 3 + 2] = typeColor.b;
        
        sizes[i] = 3;  // Point size
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    // Store node data for tooltips
    geometry.userData = { nodes };
    
    // Create shader material
    const material = new THREE.ShaderMaterial({
        uniforms: {
            pointTexture: { value: new THREE.TextureLoader().load(
                'data:image/png;base64,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'
            )}
        },
        vertexShader: `
            attribute float size;
            varying vec3 vColor;
            
            void main() {
                vColor = color;
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                gl_PointSize = size * (300.0 / -mvPosition.z);
                gl_Position = projectionMatrix * mvPosition;
            }
        `,
        fragmentShader: `
            uniform sampler2D pointTexture;
            varying vec3 vColor;
            
            void main() {
                gl_FragColor = vec4(vColor, 1.0) * texture2D(pointTexture, gl_PointCoord);
                if (gl_FragColor.a < 0.3) discard;
            }
        `,
        transparent: true,
        depthTest: true,
        vertexColors: true
    });
    
    // Create and add the particle system
    const particleSystem = new THREE.Points(geometry, material);
    particleSystem.name = type;
    particleSystem.frustumCulled = true;
    
    scene.add(particleSystem);
    particleGroups[type] = particleSystem;
}

// Handle window resize
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Handle mouse movement for tooltips
function onMouseMove(event) {
    // Calculate mouse position in normalized device coordinates
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    // Update the picking ray with the camera and mouse position
    raycaster.setFromCamera(mouse, camera);
    
    // Check for intersections with all particle systems
    let intersections = [];
    for (let type in particleGroups) {
        if (particleGroups[type]) {
            const intersects = raycaster.intersectObject(particleGroups[type]);
            if (intersects.length > 0) {
                intersects[0].object.name = type;
                intersections.push(intersects[0]);
            }
        }
    }
    
    // Sort intersections by distance
    intersections.sort((a, b) => a.distance - b.distance);
    
    // Hide tooltip by default
    tooltip.style.display = 'none';
    
    // If we have an intersection, show tooltip
    if (intersections.length > 0) {
        const intersection = intersections[0];
        const index = intersection.index;
        const type = intersection.object.name;
        const nodes = intersection.object.geometry.userData.nodes;
        
        if (index !== undefined && index < nodes.length) {
            const node = nodes[index];
            const wallet = node.wallet;
            const address = wallet.address;
            const quantity = parseFloat(wallet.quantity).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
            
            // Position tooltip near the mouse
            tooltip.style.left = event.clientX + 15 + 'px';
            tooltip.style.top = event.clientY + 15 + 'px';
            tooltip.textContent = `Address: ${address}
Quantity: ${quantity}`;
            tooltip.style.display = 'block';
            tooltip.className = type;
        }
    }
}

// Update node counters in the UI
function updateCounters() {
    if (!walletData) return;
    
    const fartcoinCount = walletData.fartcoin.length;
    const goattokenCount = walletData.goattoken.length;
    const totalCount = fartcoinCount + goattokenCount;
    
    document.getElementById('node-count').textContent = totalCount;
    document.getElementById('fartcoin-count').textContent = fartcoinCount;
    document.getElementById('goattoken-count').textContent = goattokenCount;
    
    // Log creation stats
    const logContent = `Fractal Wallet Visualization
================================
Created: ${new Date().toLocaleString()}

Node Statistics:
- Total Nodes: ${totalCount}
- Fartcoin Wallets: ${fartcoinCount}
- Goattoken Wallets: ${goattokenCount}

Visualization Settings:
- Fractal Layout: Golden Ratio spiral with jitter
- Colors: Fartcoin (Purple #9c27b0), Goattoken (Orange #ff9800)
- Tooltip: Shows wallet address on hover
`;
    
    console.log(logContent);
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    // Update controls
    controls.update();
    
    // Render scene
    renderer.render(scene, camera);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', init);