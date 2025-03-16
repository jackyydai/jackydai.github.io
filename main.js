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
const spawnDistanceThreshold = 8; // Min distance from camera
const repulsionThreshold = 10; // Distance to start pushing away from camera
const repulsionStrength = 500;

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
    // Generate a valid spawn position
    let position;
    do {
        position = new CANNON.Vec3(
            (Math.random() - 0.5) * 50,
            (Math.random() - 0.5) * 50,
            (Math.random() - 0.5) * 50
        );
    } while (position.distanceTo(camera.position) < spawnDistanceThreshold);

    // Three.js Mesh
    const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(`hsl(${Math.random() * 360}, 100%, 70%)`),
        roughness: 0.85,
        metalness: 0.2,
        transparent: true,
        opacity: .95,
        depthWrite: false
    });
    const geometry = new THREE.SphereGeometry(sphereRadius, 64, 64);
    const sphereMesh = new THREE.Mesh(geometry, material);
    sphereMesh.scale.set(initialScale, initialScale, initialScale);
    scene.add(sphereMesh);
    spheres.push(sphereMesh);

    // Cannon.js Physics Body
    const sphereBody = new CANNON.Body({
        mass: 300,
        shape: sphereShape,
        material: sphereMaterial,
        position,
        angularDamping: 0.2,
        linearDamping: 0.01
    });

    // Apply random impulse for floating effect
    sphereBody.applyImpulse(new CANNON.Vec3(
        (Math.random() - 0.5) * 1000,
        (Math.random() - 0.5) * 1000,
        (Math.random() - 0.5) * 1000
    ), new CANNON.Vec3(0, 0, 0));

    world.addBody(sphereBody);
    sphereBodies.push(sphereBody);

    // Animate sphere expansion
    animateScale(sphereMesh, 1, 0.5);
}

// Create Initial Spheres
for (let i = 0; i < sphereCount; i++) {
    createSphere(1);
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

    const index = Math.floor(Math.random() * spheres.length);
    const mesh = spheres[index];
    const body = sphereBodies[index];

    animateScale(mesh, 0, 0.5);

    setTimeout(() => {
        scene.remove(mesh);
        world.removeBody(body);
        spheres.splice(index, 1);
        sphereBodies.splice(index, 1);

        createSphere(0);
    }, 500);
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

// Track focus state
let isFocused = true;
window.addEventListener("blur", () => { isFocused = false; });
window.addEventListener("focus", () => { isFocused = true; });

// Animation Loop
const maxSpeed = 20; // Adjust max speed as needed

function animate() {
    requestAnimationFrame(animate);

    if (!isFocused) return; // Freeze movement when not focused

    world.step(1 / 60);

    for (let i = 0; i < spheres.length; i++) {
        const body = sphereBodies[i];
        const mesh = spheres[i];

        // Stronger Attraction Formula
        const distance = body.position.distanceTo(mouse);
        const forceMultiplier = 10;

        const force = new CANNON.Vec3(
            (mouse.x - body.position.x) * forceMultiplier,
            (mouse.y - body.position.y) * forceMultiplier,
            (mouse.z - body.position.z) * forceMultiplier
        );

        body.applyForce(force, worldPoint);

        // **Repulsion from Camera**
        const cameraToSphere = new CANNON.Vec3().copy(body.position).vsub(camera.position);
        const distanceFromCamera = cameraToSphere.length();

        if (distanceFromCamera < repulsionThreshold) {
            const repulsionForce = cameraToSphere.unit().scale(repulsionStrength);
            body.applyForce(repulsionForce, worldPoint);
        }

        // **Limit max speed**
        const speed = body.velocity.length();
        if (speed > maxSpeed) {
            body.velocity.scale(maxSpeed / speed, body.velocity); // Scale velocity to max speed
        }

        // Sync Three.js mesh with Cannon.js body
        mesh.position.copy(body.position);
        mesh.quaternion.copy(body.quaternion);
    }

    renderer.render(scene, camera);
}

// Resize Handling
window.addEventListener("resize", () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
});

// Start Animation
animate();
