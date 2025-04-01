// Global Variables for scene and pose.
let angleX = 0;
let angleY = 0;
let cylinderRadius = 100;
let cylinderHeight = 300;
let sliceAngle = 180; // Visible arc of the cylinder (in degrees)
let zPos = 0; // z-position for the pose

let lastMouseX, lastMouseY;
let topInput, bottomInput, sliceAngleInput, loadJSONButton;
let playbackStartTime = 0;
let recordedData; // Will hold the JSON sequence

// Default static pose (Sitting Pose) used before a JSON file is loaded.
let pose = [
  { x: 0, y: -120, dragging: false },  // Head
  { x: 0, y: -80, dragging: false },    // Neck
  { x: -40, y: -60, dragging: false },   // Left Shoulder
  { x: 40, y: -60, dragging: false },    // Right Shoulder
  { x: -60, y: -20, dragging: false },   // Left Elbow
  { x: 60, y: -20, dragging: false },    // Right Elbow
  { x: -80, y: 30, dragging: false },    // Left Hand
  { x: 80, y: 30, dragging: false },     // Right Hand
  { x: 0, y: 0, dragging: false },       // Hip
  { x: -40, y: 60, dragging: false },    // Left Knee
  { x: 40, y: 60, dragging: false },     // Right Knee
  { x: -50, y: 120, dragging: false },   // Left Foot
  { x: 50, y: 120, dragging: false }     // Right Foot
];
let connections = [
  [0, 1],         // Head to Neck
  [1, 2], [1, 3], // Neck to Shoulders
  [2, 4], [3, 5], // Shoulders to Elbows
  [4, 6], [5, 7], // Elbows to Hands
  [1, 8],         // Neck to Hip
  [8, 9], [8, 10],// Hip to Knees
  [9, 11], [10, 12]// Knees to Feet
];

// Particle arrays.
let waterParticles = [];
let sandParticles = [];

// ----------------------------------------------
// Water particles: They spawn along the cylinder wall and 
// follow a parabolic trajectory toward the opposite side.
// ----------------------------------------------
class WaterParticle {
  constructor(x, y, z, spawnAngle) {
    this.pos = createVector(x, y, z);
    // Compute initial horizontal velocity: move opposite to the wall normal.
    // The wall’s outward unit vector is (cos(spawnAngle), sin(spawnAngle)); 
    // here we invert it so that the particle is propelled inward.
    let speed = random(2, 4);
    let horizontal = createVector(-cos(spawnAngle), -sin(spawnAngle), 0);
    horizontal.mult(speed);
    // Add an upward component (remember: in p5.js positive y is downward).
    let vertical = createVector(0, random(-6, -3), 0);
    this.vel = p5.Vector.add(horizontal, vertical);
    // Gravity pulls downward.
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
    push();
    translate(this.pos.x, this.pos.y, this.pos.z);
    sphere(5);
    pop();
  }
  isDead() {
    return this.lifespan < 0;
  }
}

// ----------------------------------------------
// Sand/Mud particles: They now spawn from the cylinder wall 
// opposite to the water particles.
// ----------------------------------------------
class SandParticle {
  constructor(x, y, z) {
    this.pos = createVector(x, y, z);
    // A modest random horizontal drift and downward velocity.
    this.vel = createVector(random(-1, 1), random(1, 3), 0);
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
    fill(139, 69, 19, this.lifespan);
    push();
    translate(this.pos.x, this.pos.y, this.pos.z);
    sphere(3);
    pop();
  }
  isDead() {
    return this.lifespan < 0;
  }
}

function setup() {
  createCanvas(600, 600, WEBGL);

  // Create input elements to control the extruded cylinder.
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

  // Button to load an updated pose JSON.
  loadJSONButton = createButton("Load Pose JSON");
  loadJSONButton.position(380, height + 20);
  loadJSONButton.mousePressed(loadPoseJSON);
}

function draw() {
  background(200);
  // Allow scene rotation.
  rotateX(angleX);
  rotateY(angleY);

  // Draw the extruded cylinder (only the visible slice).
  drawExtrudedCylinderWithCut();

  // Update pose from JSON sequence if loaded.
  if (recordedData) {
    let playbackTime = (millis() / 1000 - playbackStartTime) % recordedData.duration;
    updatePoseFromSequence(playbackTime);
  }

  // Draw the pose skeleton.
  push();
  translate(0, zPos, 0);
  drawPoseSkeleton();
  pop();

  // Update and display both particle systems.
  updateParticles();

  // Spawn new water droplets from the cylinder wall.
  spawnWaterParticles();

  // Spawn new sand/mud particles from the opposite wall.
  spawnSandParticles();
}

// Draw a half-cylinder with a cut defined by sliceAngle.
function drawExtrudedCylinderWithCut() {
  push();
  noFill();
  stroke(0, 255, 0);
  strokeWeight(2);
  // Rotate so the extrusion is drawn correctly.
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

// Draw the pose skeleton with keypoints and connecting lines.
function drawPoseSkeleton() {
  stroke(255, 0, 0);
  strokeWeight(3);
  for (let conn of connections) {
    let p1 = pose[conn[0]];
    let p2 = pose[conn[1]];
    line(p1.x, -p1.y, 0, p2.x, -p2.y, 0);
  }
  // Blinking blue spheres for keypoints.
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

// Update input values.
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

// Mouse interaction: drag keypoints.
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
  angleY += (mouseX - lastMouseX) * 0.01;
  angleX -= (mouseY - lastMouseY) * 0.01;
  lastMouseX = mouseX;
  lastMouseY = mouseY;
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

// Use arrow keys to adjust the z-position of the pose.
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

// Update global pose from JSON sequence.
function updatePoseFromSequence(playbackTime) {
  if (!recordedData || recordedData.frames.length === 0) return;
  let currentFrame = recordedData.frames[0];
  for (let frame of recordedData.frames) {
    if (frame.time <= playbackTime) {
      currentFrame = frame;
    } else {
      break;
    }
  }
  pose = [];
  for (let kp of currentFrame.pose) {
    pose.push({
      x: (kp.x - 0.5) * width,
      y: (kp.y - 0.5) * height,
      dragging: false
    });
  }
  if (recordedData.connections) {
    connections = recordedData.connections;
  }
}

// ----------------------------------------------
// Particle System Functions
// ----------------------------------------------

function updateParticles() {
  // Update and display water particles.
  for (let i = waterParticles.length - 1; i >= 0; i--) {
    waterParticles[i].update();
    waterParticles[i].display();
    if (waterParticles[i].isDead()) {
      waterParticles.splice(i, 1);
    }
  }
  // Update and display sand/mud particles.
  for (let i = sandParticles.length - 1; i >= 0; i--) {
    sandParticles[i].update();
    sandParticles[i].display();
    if (sandParticles[i].isDead() || waterParticles[i]?.pos.y > height / 2) {
      sandParticles.splice(i, 1);
    }
  }
}

// Spawn water particles from the cylinder wall.
// They spawn at a random angle along the visible arc and
// are propelled in the opposite (inward) direction.
function spawnWaterParticles() {
  if (random() < 0.2) {
    let angle = random(radians(-sliceAngle / 2), radians(sliceAngle / 2));
    let spawnX = cylinderRadius * cos(angle);
    let spawnY = cylinderRadius * sin(angle);
    let spawnZ = random(parseFloat(bottomInput.value()), parseFloat(topInput.value()));
    waterParticles.push(new WaterParticle(spawnX, spawnY, spawnZ, angle));
  }
}

// Spawn sand/mud particles from the wall opposite to water particles.
// Their spawn location is computed by adding PI to a random angle.
function spawnSandParticles() {
  if (random() < 0.1) {
    let angle = random(radians(-sliceAngle / 2), radians(sliceAngle / 2));
    let oppositeAngle = angle + PI;
    let spawnX = cylinderRadius * cos(oppositeAngle);
    let spawnY = cylinderRadius * sin(oppositeAngle);
    let spawnZ = random(parseFloat(bottomInput.value()), parseFloat(topInput.value()));
    sandParticles.push(new SandParticle(spawnX, spawnY, spawnZ));
  }
}
