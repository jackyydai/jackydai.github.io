import * as THREE from "three";
import * as CANNON from "cannon-es";

// Scene Setup
const scene = new THREE.Scene();

// Camera Setup
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 15);

// Renderer Setup (Make it cover the whole screen)
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 1);
scene.add(ambientLight);

const pointLight = new THREE.PointLight(0xffffff, 1.5);
pointLight.position.set(10, 10, 10);
scene.add(pointLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 3);
directionalLight.position.set(-5, 5, 10);
scene.add(directionalLight);

// Cannon.js Physics World
const world = new CANNON.World();
world.gravity.set(0, 0, 0);
const worldPoint = new CANNON.Vec3(0, 0, 0);

// Sphere Config
const sphereRadius = 2.5;
const sphereMaterial = new CANNON.Material();
sphereMaterial.restitution = 0.4; // Slight bounciness
sphereMaterial.friction = 0;

// Define contact material for sphere interactions
const worldMaterial = new CANNON.Material();
const contactMaterial = new CANNON.ContactMaterial(sphereMaterial, worldMaterial, {
    friction: 0,
    restitution: 0.4,
});
world.addContactMaterial(contactMaterial);

// Sphere Initialization
const spheres = [];
const sphereBodies = [];
const sphereCount = 30;
const sphereShape = new CANNON.Sphere(sphereRadius);

// Function to Create a New Sphere (With Scaling Animation)
function createSphere(initialScale = 0) {
    // Three.js Mesh
    const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(`hsl(${Math.random() * 360}, 100%, 70%)`),
        roughness: 0.85,
        metalness: 0.2,  // More matte appearance
        transparent: true, // Enable transparency
        opacity: 0.9, // Adjust transparency (0 = invisible, 1 = solid)
        depthWrite: false // Helps avoid transparency issues
    });
    const geometry = new THREE.SphereGeometry(sphereRadius, 64, 64);
    const sphereMesh = new THREE.Mesh(geometry, material);
    sphereMesh.scale.set(initialScale, initialScale, initialScale); // Start small for animation
    scene.add(sphereMesh);
    spheres.push(sphereMesh);

    // Cannon.js Physics Body
    const sphereBody = new CANNON.Body({
        mass: 300,
        shape: sphereShape,
        material: sphereMaterial,
        position: new CANNON.Vec3(
            (Math.random() - 0.5) * 20,
            (Math.random() - 0.5) * 20,
            (Math.random() - 0.5) * 20
        ),
        angularDamping: 0.2,
        linearDamping: 0.01
    });

    // Apply random impulse for floating effect
    sphereBody.applyImpulse(new CANNON.Vec3(
        (Math.random() - 0.5) * 50,
        (Math.random() - 0.5) * 50,
        (Math.random() - 0.5) * 50
    ), new CANNON.Vec3(0, 0, 0));

    world.addBody(sphereBody);
    sphereBodies.push(sphereBody);

    // Animate sphere expansion
    animateScale(sphereMesh, 1, 0.5);
}

// Create Initial Spheres
for (let i = 0; i < sphereCount; i++) {
    createSphere(1); // Start at full scale
}

// Function to Animate Scale (Shrink or Expand)
function animateScale(mesh, targetScale, duration) {
    const startTime = performance.now();
    const startScale = mesh.scale.x;

    function scaleStep(time) {
        const progress = Math.min((time - startTime) / (duration * 1000), 1);
        const newScale = startScale + (targetScale - startScale) * progress;

        mesh.scale.set(newScale, newScale, newScale);

        if (progress < 1) {
            requestAnimationFrame(scaleStep);
        }
    }

    requestAnimationFrame(scaleStep);
}

// Function to Shrink & Replace a Sphere
function replaceRandomSphere() {
    if (spheres.length === 0) return;

    // Select a random sphere index
    const index = Math.floor(Math.random() * spheres.length);
    const mesh = spheres[index];
    const body = sphereBodies[index];

    // Animate shrinking
    animateScale(mesh, 0, 0.5);

    // Wait for shrink animation, then remove and respawn
    setTimeout(() => {
        scene.remove(mesh);
        world.removeBody(body);
        spheres.splice(index, 1);
        sphereBodies.splice(index, 1);

        // Spawn a new sphere with expansion effect
        createSphere(0);
    }, 500); // Wait for animation to finish
}

// Set interval to shrink & replace a sphere every few seconds
setInterval(replaceRandomSphere, 1000);




// Mouse Attraction Force
const mouse = new CANNON.Vec3(0, 0, 0);
window.addEventListener("mousemove", (event) => {
    const x = (event.clientX / window.innerWidth) * 2 - 1;
    const y = -(event.clientY / window.innerHeight) * 2 + 1;
    mouse.set(x * 5, y * 5, 0);
});

// Animation Loop
function animate() {
    requestAnimationFrame(animate);

    // Step the physics world
    world.step(1 / 60);

    // Update Three.js objects based on Cannon.js physics
    for (let i = 0; i < spheres.length; i++) {
        const body = sphereBodies[i];
        const mesh = spheres[i];

        // Stronger Attraction Formula
        const distance = body.position.distanceTo(mouse);
        const forceMultiplier = Math.min(5000 / (distance * 0.05 + 1), 100);

        const force = new CANNON.Vec3(
            (mouse.x - body.position.x) * forceMultiplier,
            (mouse.y - body.position.y) * forceMultiplier,
            (mouse.z - body.position.z) * forceMultiplier
        );

        body.applyForce(force, worldPoint);

        // Sync Three.js mesh with Cannon.js body
        mesh.position.copy(body.position);
        mesh.quaternion.copy(body.quaternion);
    }

    renderer.render(scene, camera);
}

// Resize Handling (Ensures Three.js scene resizes with the window)
window.addEventListener("resize", () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
});

// Start Animation
animate();
