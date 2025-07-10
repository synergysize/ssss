// visualizer.js - Creates the 3D visualization of wallet nodes

class FractalWalletVisualizer {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.raycaster = null;
        this.mouse = null;
        this.tooltip = null;
        this.particleGroups = {
            fartcoin: null,
            goattoken: null
        };
        this.colors = {
            fartcoin: new THREE.Color('#9c27b0'),  // Purple
            goattoken: new THREE.Color('#ff9800')  // Orange
        };
        this.nodePointSize = 3;
        this.hoveredObject = null;
        this.stats = null;
        this.frustumCulled = true;
        
        // Initialize tooltip
        this.tooltip = document.getElementById('tooltip');
        
        // Initialize counters
        this.nodeCountElement = document.getElementById('node-count');
        this.fartcoinCountElement = document.getElementById('fartcoin-count');
        this.goattokenCountElement = document.getElementById('goattoken-count');
        
        // Bind methods that will be used as event handlers
        this.onWindowResize = this.onWindowResize.bind(this);
        this.onMouseMove = this.onMouseMove.bind(this);
        this.animate = this.animate.bind(this);
    }
    
    // Initialize the 3D scene
    init() {
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);
        
        // Create camera
        this.camera = new THREE.PerspectiveCamera(
            60, window.innerWidth / window.innerHeight, 1, 20000
        );
        this.camera.position.set(0, 0, 2000);
        
        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.getElementById('canvas-container').appendChild(this.renderer.domElement);
        
        // Create controls
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.rotateSpeed = 0.5;
        this.controls.zoomSpeed = 1.2;
        
        // Setup raycaster for hover interactions
        this.raycaster = new THREE.Raycaster();
        this.raycaster.params.Points.threshold = 5;
        this.mouse = new THREE.Vector2();
        
        // Add stats
        this.stats = new Stats();
        document.body.appendChild(this.stats.dom);
        
        // Add event listeners
        window.addEventListener('resize', this.onWindowResize, false);
        window.addEventListener('mousemove', this.onMouseMove, false);
        
        // Load wallet data
        walletDataManager.loadData();
        walletDataManager.onDataLoaded(() => {
            this.createNodes();
        });
        
        // Start animation loop
        this.animate();
    }
    
    // Create 3D nodes for all wallets
    createNodes() {
        // Create separate particle systems for each token type
        this.createParticleSystem('fartcoin', walletDataManager.fartcoinWallets);
        this.createParticleSystem('goattoken', walletDataManager.goattokenWallets);
        
        // Update counters
        this.updateCounters();
        
        // Log creation to console
        console.log('Created fractal node visualization with:');
        console.log(`- ${walletDataManager.fartcoinWallets.length} Fartcoin wallets`);
        console.log(`- ${walletDataManager.goattokenWallets.length} Goattoken wallets`);
        
        // Log to file
        this.logCreationStats();
    }
    
    // Create a particle system for a specific wallet type
    createParticleSystem(type, wallets) {
        const particleCount = wallets.length;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        const sizes = new Float32Array(particleCount);
        const typeColor = this.colors[type];
        
        // For each wallet, calculate its position based on the fractal layout
        for (let i = 0; i < particleCount; i++) {
            const layer = Math.floor(i / 200);  // controls vertical spread
            const angle = i * 0.618 * Math.PI * 2;  // golden angle rotation
            const radius = 400 + layer * 300 + Math.random() * 100;
            const x = radius * Math.cos(angle) + (Math.random() - 0.5) * 200;
            const y = (layer - 5) * 300 + (Math.random() - 0.5) * 150;
            const z = radius * Math.sin(angle) + (Math.random() - 0.5) * 200;
            
            positions[i * 3] = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = z;
            
            colors[i * 3] = typeColor.r;
            colors[i * 3 + 1] = typeColor.g;
            colors[i * 3 + 2] = typeColor.b;
            
            sizes[i] = this.nodePointSize;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        
        // Store wallet data for tooltip access
        geometry.userData = {
            wallets: wallets
        };
        
        // Create shader material for better-looking points
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
        
        // Create the particle system
        const particleSystem = new THREE.Points(geometry, material);
        particleSystem.name = type;
        particleSystem.frustumCulled = this.frustumCulled;
        
        this.scene.add(particleSystem);
        this.particleGroups[type] = particleSystem;
    }
    
    // Handle window resize
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    // Handle mouse movement for hover effects
    onMouseMove(event) {
        // Calculate mouse position in normalized device coordinates
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        // Update the picking ray with the camera and mouse position
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        // Check for intersections with all particle systems
        let intersections = [];
        for (let type in this.particleGroups) {
            if (this.particleGroups[type]) {
                const intersects = this.raycaster.intersectObject(this.particleGroups[type]);
                if (intersects.length > 0) {
                    intersects[0].object.name = type;
                    intersections.push(intersects[0]);
                }
            }
        }
        
        // Sort intersections by distance
        intersections.sort((a, b) => a.distance - b.distance);
        
        // Hide tooltip by default
        this.tooltip.style.display = 'none';
        
        // If we have an intersection, show tooltip
        if (intersections.length > 0) {
            const intersection = intersections[0];
            const index = intersection.index;
            const type = intersection.object.name;
            const wallets = intersection.object.geometry.userData.wallets;
            
            if (index !== undefined && index < wallets.length) {
                const wallet = wallets[index];
                const address = wallet.address;
                const quantity = wallet.quantity.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                });
                
                // Position tooltip near the mouse
                this.tooltip.style.left = event.clientX + 15 + 'px';
                this.tooltip.style.top = event.clientY + 15 + 'px';
                this.tooltip.textContent = `Address: ${address}
Quantity: ${quantity}`;
                this.tooltip.style.display = 'block';
                this.tooltip.className = type;
            }
        }
    }
    
    // Update node counters in the UI
    updateCounters() {
        const fartcoinCount = walletDataManager.fartcoinWallets.length;
        const goattokenCount = walletDataManager.goattokenWallets.length;
        const totalCount = fartcoinCount + goattokenCount;
        
        this.nodeCountElement.textContent = totalCount;
        this.fartcoinCountElement.textContent = fartcoinCount;
        this.goattokenCountElement.textContent = goattokenCount;
    }
    
    // Log creation statistics to a file
    logCreationStats() {
        const fartcoinCount = walletDataManager.fartcoinWallets.length;
        const goattokenCount = walletDataManager.goattokenWallets.length;
        const totalCount = fartcoinCount + goattokenCount;
        
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
        
        // We would log this to a file, but for now just console.log
        console.log(logContent);
    }
    
    // Animation loop
    animate() {
        requestAnimationFrame(this.animate);
        
        // Update orbit controls
        this.controls.update();
        
        // Update stats
        this.stats.update();
        
        // Render scene
        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize the visualizer when the page loads
document.addEventListener('DOMContentLoaded', () => {
    const visualizer = new FractalWalletVisualizer();
    visualizer.init();
});