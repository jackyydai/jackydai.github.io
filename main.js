import * as THREE from "three";
import * as CANNON from "cannon-es";

// Scene Setup
const scene = new THREE.Scene();

// Camera Setup
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 15);

// Renderer Setup (Make it cover the whole screen)
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); // Enable transparency
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
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
sphereMaterial.friction = 0;
const sphereShape = new CANNON.Sphere(sphereRadius);

const spheres = [];
const sphereBodies = [];
const sphereCount = 30;

// Create Floating Spheres
for (let i = 0; i < sphereCount; i++) {
    // Three.js Mesh
    const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(`hsl(${Math.random() * 360}, 100%, 70%)`),
        roughness: 0.2,
        metalness: 0.8
    });
    const geometry = new THREE.SphereGeometry(sphereRadius, 64, 64);
    const sphereMesh = new THREE.Mesh(geometry, material);
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

    // Apply random impulse to float in different directions
    sphereBody.applyImpulse(new CANNON.Vec3(
        (Math.random() - 0.5) * 50,
        (Math.random() - 0.5) * 50,
        (Math.random() - 0.5) * 50
    ), new CANNON.Vec3(0, 0, 0));

    world.addBody(sphereBody);
    sphereBodies.push(sphereBody);
}

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
        const forceMultiplier = 100;
        // Exponential scaling factor (adjust exponent as needed)
        const exponent = 1; // You can tweak this value
        const scaledMultiplier = 50;

        const force = new CANNON.Vec3(
            (mouse.x - body.position.x) * scaledMultiplier,
            (mouse.y - body.position.y) * scaledMultiplier,
            (mouse.z - body.position.z) * scaledMultiplier
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
