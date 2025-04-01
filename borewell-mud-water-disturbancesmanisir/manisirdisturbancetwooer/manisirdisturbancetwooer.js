// Global Variables for scene and pose
let angleX = 0;
let angleY = 0;
let cylinderRadius = 100;
let cylinderHeight = 300;
let sliceAngle = 180; // Half of the cylinder
let zPos = 0; // Pose z position
let lastMouseX, lastMouseY;
let topInput, bottomInput, sliceAngleInput, loadJSONButton;
let playbackStartTime = 0;
let recordedData; // JSON sequence storage

// Default static pose (Sitting Pose) used before a JSON file is loaded.
let pose = [
  { x: 0, y: -120, dragging: false },   // Head
  { x: 0, y: -80, dragging: false },     // Neck
  { x: -40, y: -60, dragging: false },    // Left Shoulder
  { x: 40, y: -60, dragging: false },     // Right Shoulder
  { x: -60, y: -20, dragging: false },    // Left Elbow
  { x: 60, y: -20, dragging: false },     // Right Elbow
  { x: -80, y: 30, dragging: false },     // Left Hand
  { x: 80, y: 30, dragging: false },      // Right Hand
  { x: 0, y: 0, dragging: false },        // Hip
  { x: -40, y: 60, dragging: false },     // Left Knee
  { x: 40, y: 60, dragging: false },      // Right Knee
  { x: -50, y: 120, dragging: false },    // Left Foot
  { x: 50, y: 120, dragging: false }      // Right Foot
];
let connections = [
  [0, 1],        // Head to Neck
  [1, 2], [1, 3],// Neck to Shoulders
  [2, 4], [3, 5],// Shoulders to Elbows
  [4, 6], [5, 7],// Elbows to Hands
  [1, 8],        // Neck to Hip
  [8, 9], [8, 10],// Hip to Knees
  [9, 11], [10, 12]// Knees to Feet
];

// Particle arrays
let waterParticles = [];
let sandParticles = [];

// ---- Particle Classes ----

// Water droplets: spawn above the head, follow a parabolic (projectile) trajectory.
class WaterParticle {
  constructor(x, y) {
    // Start in 3D space (z = 0)
    this.pos = createVector(x, y, 0);
    // Random horizontal deviation and upward initial velocity
    this.vel = createVector(random(-1, 1), random(-5, -2), 0);
    // Gravity pulling the particle downwards
    this.acc = createVector(0, 0.2, 0);
    this.lifespan = 255;
  }
  update() {
    this.vel.add(this.acc);
    this.pos.add(this.vel);
    this.lifespan -= 2;
  }
  display() {
    noStroke();
    fill(0, 0, 255, this.lifespan);
    sphere(5);
  }
  isDead() {
    return this.lifespan < 0;
  }
}

// Sand/Mud particles: fall along the cylinder sides from above.
class SandParticle {
  constructor(x, y, z) {
    this.pos = createVector(x, y, z);
    // Downward falling velocity
    this.vel = createVector(0, random(1, 3), 0);
    this.acc = createVector(0, 0.1, 0);
    this.lifespan = 255;
  }
  update() {
    this.vel.add(this.acc);
    this.pos.add(this.vel);
    this.lifespan -= 1;
  }
  display() {
    noStroke();
    // Brownish tone for sand/mud
    fill(139, 69, 19, this.lifespan);
    sphere(3);
  }
  isDead() {
    return this.lifespan < 0;
  }
}

function setup() {
  createCanvas(600, 600, WEBGL);

  // Input elements to control the extruded cylinder.
  topInput = createInput(cylinderHeight / 2);
  topInput.position(20, height + 20);
  topInput.size(100, 20);
  topInput.input(updateExtrude);

  bottomInput = createInput(-cylinderHeight / 2);
  bottomInput.position(140, height + 20);
  bottomInput.size(100, 20);
  bottomInput.input(updateExtrude);

  sliceAngleInput = createInput(sliceAngle.toString());
  sliceAngleInput.position(260, height + 20);
  sliceAngleInput.size(100, 20);
  sliceAngleInput.input(updateSliceAngle);

  // Button to load updated pose JSON.
  loadJSONButton = createButton("Load Pose JSON");
  loadJSONButton.position(380, height + 20);
  loadJSONButton.mousePressed(loadPoseJSON);
}

function draw() {
  background(200);
  // Rotate the scene for interactivity.
  rotateX(angleX);
  rotateY(angleY);

  // Draw the extruded cylinder with a cut.
  drawExtrudedCylinderWithCut();

  // Update the pose if a recorded sequence is loaded.
  if (recordedData) {
    let playbackTime = (millis() / 1000 - playbackStartTime) % recordedData.duration;
    updatePoseFromSequence(playbackTime);
  }

  // Draw the pose skeleton.
  push();
  translate(0, zPos, 0);
  drawPoseSkeleton();
  pop();

  // Update and display particle systems.
  updateParticles();

  // Spawn new water droplets above the head.
  spawnWaterParticles();

  // Spawn sand/mud particles from the cylinder's top region.
  spawnSandParticles();
}

// Draws a half-cylinder with a cut defined by sliceAngle.
function drawExtrudedCylinderWithCut() {
  push();
  noFill();
  stroke(0, 255, 0);
  strokeWeight(2);
  rotateX(HALF_PI);
  for (let a = radians(-sliceAngle / 2); a <= radians(sliceAngle / 2); a += 0.1) {
    let x = cylinderRadius * cos(a);
    let y = cylinderRadius * sin(a);
    line(x, y, parseFloat(bottomInput.value()), x, y, parseFloat(topInput.value()));
  }
  fill(0, 255, 0, 50);
  noStroke();
  arc(0, 0, cylinderRadius * 2, cylinderRadius * 2, radians(-sliceAngle / 2), radians(sliceAngle / 2));
  pop();
}

// Draws the pose skeleton using keypoints and connections.
function drawPoseSkeleton() {
  // Draw connections between keypoints.
  stroke(255, 0, 0);
  strokeWeight(3);
  for (let conn of connections) {
    let p1 = pose[conn[0]];
    let p2 = pose[conn[1]];
    line(p1.x, -p1.y, 0, p2.x, -p2.y, 0);
  }

  // Draw keypoints as blinking blue spheres.
  for (let i = 0; i < pose.length; i++) {
    let { x, y } = pose[i];
    push();
    translate(x, -y, 0);
    let blinkAlpha = map(sin(frameCount * 0.1), -1, 1, 50, 255);
    noStroke();
    fill(0, 0, 255, blinkAlpha);
    sphere(15);
    pop();
  }
}

// Update functions for inputs.
function updateSliceAngle() {
  let newAngle = float(sliceAngleInput.value());
  sliceAngle = constrain(newAngle, 0, 360);
}

function updateExtrude() {
  let newTop = float(topInput.value());
  let newBottom = float(bottomInput.value());
  if (newTop > newBottom) {
    cylinderHeight = newTop - newBottom;
  }
}

// Mouse interaction for dragging keypoints.
function mousePressed() {
  lastMouseX = mouseX;
  lastMouseY = mouseY;
  for (let i = 0; i < pose.length; i++) {
    let d = dist(mouseX - width / 2, mouseY - height / 2, pose[i].x, -pose[i].y);
    if (d < 10) {
      pose[i].dragging = true;
    }
  }
}

function mouseDragged() {
  // Rotate the scene.
  angleY += (mouseX - lastMouseX) * 0.01;
  angleX -= (mouseY - lastMouseY) * 0.01;
  lastMouseX = mouseX;
  lastMouseY = mouseY;
  // Update dragging keypoints.
  for (let i = 0; i < pose.length; i++) {
    if (pose[i].dragging) {
      pose[i].x = mouseX - width / 2;
      pose[i].y = -(mouseY - height / 2);
    }
  }
}

function mouseReleased() {
  for (let i = 0; i < pose.length; i++) {
    pose[i].dragging = false;
  }
}

// Use up and down arrows to move the pose in the z direction.
function keyPressed() {
  if (keyCode === UP_ARROW) {
    zPos -= 10;
  } else if (keyCode === DOWN_ARROW) {
    zPos += 10;
  }
}

// Load the pose sequence JSON file.
function loadPoseJSON() {
  loadJSON("pose_sequence.json", updatePoseSequence, 'json');
}

function updatePoseSequence(data) {
  recordedData = data;
  playbackStartTime = millis() / 1000;
  updatePoseFromSequence(0);
  console.log("Pose sequence loaded. Duration: " + recordedData.duration + " seconds");
}

// Given a playback time (in seconds), update the global pose from the sequence.
function updatePoseFromSequence(playbackTime) {
  if (!recordedData || recordedData.frames.length === 0) return;
  
  // Find the frame with the largest timestamp <= playbackTime.
  let currentFrame = recordedData.frames[0];
  for (let frame of recordedData.frames) {
    if (frame.time <= playbackTime) {
      currentFrame = frame;
    } else {
      break;
    }
  }
  
  // Update the global pose array.
  // Convert normalized coordinates ([0,1]) to canvas coordinates.
  pose = [];
  for (let kp of currentFrame.pose) {
    pose.push({
      x: (kp.x - 0.5) * width,
      y: (kp.y - 0.5) * height,
      dragging: false
    });
  }
  
  // Update connections if provided.
  if (recordedData.connections) {
    connections = recordedData.connections;
  }
}

// ---- Particle System Functions ----

function updateParticles() {
  // Update and display water particles.
  for (let i = waterParticles.length - 1; i >= 0; i--) {
    waterParticles[i].update();
    push();
    translate(waterParticles[i].pos.x, waterParticles[i].pos.y, waterParticles[i].pos.z);
    waterParticles[i].display();
    pop();
    if (waterParticles[i].isDead()) {
      waterParticles.splice(i, 1);
    }
  }
  
  // Update and display sand/mud particles.
  for (let i = sandParticles.length - 1; i >= 0; i--) {
    sandParticles[i].update();
    push();
    translate(sandParticles[i].pos.x, sandParticles[i].pos.y, sandParticles[i].pos.z);
    sandParticles[i].display();
    pop();
    // Remove if dead or if it falls below a certain y position.
    if (sandParticles[i].isDead() || sandParticles[i].pos.y > height / 2) {
      sandParticles.splice(i, 1);
    }
  }
}

// Spawn water droplets above the head of the pose.
function spawnWaterParticles() {
  if (pose && pose.length > 0) {
    // The head is the first keypoint.
    let headX = pose[0].x;
    let headY = -pose[0].y; // Flip y as drawn
    // With some probability spawn a water particle.
    if (random() < 0.2) {
      let spawnX = headX + random(-20, 20);
      let spawnY = headY - random(20, 50);
      waterParticles.push(new WaterParticle(spawnX, spawnY));
    }
  }
}

// Spawn sand/mud particles from above the cylinder's side walls.
function spawnSandParticles() {
  // Spawn from a region near the top of the cylinder.
  if (random() < 0.1) {
    let spawnX = random(-cylinderRadius, cylinderRadius);
    // Use the top value from the top input and add a small offset.
    let spawnY = parseFloat(topInput.value()) - 20;
    let spawnZ = random(-50, 50);
    sandParticles.push(new SandParticle(spawnX, spawnY, spawnZ));
  }
}
