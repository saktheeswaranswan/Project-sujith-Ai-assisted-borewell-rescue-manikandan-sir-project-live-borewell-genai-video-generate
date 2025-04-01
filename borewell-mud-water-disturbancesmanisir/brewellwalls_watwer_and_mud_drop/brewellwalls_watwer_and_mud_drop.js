// Global scene & pose variables.
let angleX = 0;
let angleY = 0;
let cylinderRadius = 100;
let cylinderHeight = 300;
let sliceAngle = 180; // Visible arc (degrees)
let zPos = 0; // z-position for the pose

let lastMouseX, lastMouseY;
let topInput, bottomInput, sliceAngleInput, wallThicknessInput;
let loadJSONButton, reverseButton;
let playbackStartTime = 0;
let recordedData; // JSON sequence storage

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

// Global gravity magnitude (will flip sign in reverse mode)
let baseGravity = 0.3;
let reverseMode = false; // Toggles reversed gravity and trajectory

// New global: wallThickness for thick borewell walls.
let wallThickness = 20;

// Particle arrays.
let waterParticles = [];
let mudParticles = [];

// ----------------------------
// Particle classes with trails.
// ----------------------------

class WaterParticle {
  constructor(x, y, z) {
    this.pos = createVector(x, y, z);
    // Initial velocity: upward parabolic impulse with slight horizontal drift.
    let horizontal = createVector(random(-2, 2), random(-1, 1), 0);
    let vertical = createVector(0, random(-8, -5), 0);
    this.vel = p5.Vector.add(horizontal, vertical);
    this.acc = createVector(0, reverseMode ? -baseGravity : baseGravity, 0);
    this.lifespan = 255;
    this.trail = []; // To store positions for the curve
  }
  update() {
    // Update acceleration based on reverse mode.
    this.acc.y = reverseMode ? -baseGravity : baseGravity;
    this.vel.add(this.acc);
    this.pos.add(this.vel);
    this.lifespan -= 3;
    // Save current position to trail.
    this.trail.push(this.pos.copy());
    if (this.trail.length > 30) {
      this.trail.shift();
    }
  }
  display() {
    // Draw the particle.
    noStroke();
    fill(0, 0, 255, this.lifespan);
    push();
    translate(this.pos.x, this.pos.y, this.pos.z);
    sphere(5);
    pop();
    // Draw the thicker trail curve.
    noFill();
    stroke(0, 0, 255, 200);
    strokeWeight(3);
    beginShape();
    for (let pt of this.trail) {
      vertex(pt.x, pt.y, pt.z);
    }
    endShape();
    strokeWeight(1);
  }
  isDead() {
    return this.lifespan < 0;
  }
}

class MudParticle {
  constructor(x, y, z) {
    this.pos = createVector(x, y, z);
    // Initial velocity: slight horizontal drift and downward impulse.
    let horizontal = createVector(random(-1, 1), random(-1, 1), 0);
    let vertical = createVector(0, random(2, 4), 0);
    this.vel = p5.Vector.add(horizontal, vertical);
    this.acc = createVector(0, reverseMode ? -baseGravity : baseGravity, 0);
    this.lifespan = 255;
    this.trail = [];
  }
  update() {
    this.acc.y = reverseMode ? -baseGravity : baseGravity;
    this.vel.add(this.acc);
    this.pos.add(this.vel);
    this.lifespan -= 2;
    this.trail.push(this.pos.copy());
    if (this.trail.length > 30) {
      this.trail.shift();
    }
  }
  display() {
    noStroke();
    fill(139, 69, 19, this.lifespan);
    push();
    translate(this.pos.x, this.pos.y, this.pos.z);
    sphere(3);
    pop();
    // Draw the thicker trajectory curve.
    noFill();
    stroke(139, 69, 19, 200);
    strokeWeight(3);
    beginShape();
    for (let pt of this.trail) {
      vertex(pt.x, pt.y, pt.z);
    }
    endShape();
    strokeWeight(1);
  }
  isDead() {
    return this.lifespan < 0;
  }
}

// ----------------------------
// Setup and Draw
// ----------------------------
function setup() {
  createCanvas(600, 600, WEBGL);
  
  // Create input elements for cylinder parameters.
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
  
  // New: input for wall thickness (for mud particle spawn range).
  wallThicknessInput = createInput(wallThickness);
  wallThicknessInput.position(380, height + 20);
  wallThicknessInput.size(100, 20);
  wallThicknessInput.input(updateWallThickness);

  // Button to load pose JSON.
  loadJSONButton = createButton("Load Pose JSON");
  loadJSONButton.position(500, height + 20);
  loadJSONButton.mousePressed(loadPoseJSON);

  // Button to toggle reverse mode.
  reverseButton = createButton("Toggle Reverse");
  reverseButton.position(620, height + 20);
  reverseButton.mousePressed(toggleReverse);
}

function draw() {
  background(200);
  rotateX(angleX);
  rotateY(angleY);

  // Draw the extruded cylinder.
  drawExtrudedCylinderWithCut();

  // Update pose from JSON if loaded.
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
  updateWaterParticles();
  updateMudParticles();

  // Spawn new particles.
  spawnWaterParticles();
  spawnMudParticles();
}

// ----------------------------
// Cylinder & Pose Functions
// ----------------------------
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

function drawPoseSkeleton() {
  stroke(255, 0, 0);
  strokeWeight(3);
  for (let conn of connections) {
    let p1 = pose[conn[0]];
    let p2 = pose[conn[1]];
    line(p1.x, -p1.y, 0, p2.x, -p2.y, 0);
  }
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

function updateWallThickness() {
  wallThickness = float(wallThicknessInput.value());
}

// ----------------------------
// Mouse and Key Interactions
// ----------------------------
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

function keyPressed() {
  if (keyCode === UP_ARROW) {
    zPos -= 10;
  } else if (keyCode === DOWN_ARROW) {
    zPos += 10;
  }
}

function loadPoseJSON() {
  loadJSON("pose_sequence.json", updatePoseSequence, 'json');
}

function updatePoseSequence(data) {
  recordedData = data;
  playbackStartTime = millis() / 1000;
  updatePoseFromSequence(0);
  console.log("Pose sequence loaded. Duration: " + recordedData.duration + " seconds");
}

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

// ----------------------------
// Particle System Functions
// ----------------------------

// Water Particles: Spawn above the head.
function spawnWaterParticles() {
  if (pose && pose.length > 0) {
    let headX = pose[0].x;
    let headY = -pose[0].y; // Invert to match drawing
    let spawnX = headX + random(-10, 10);
    let spawnY = headY - random(20, 40);
    let spawnZ = 0;
    if (random() < 0.3) {
      waterParticles.push(new WaterParticle(spawnX, spawnY, spawnZ));
    }
  }
}

function updateWaterParticles() {
  for (let i = waterParticles.length - 1; i >= 0; i--) {
    waterParticles[i].update();
    waterParticles[i].display();
    if (waterParticles[i].isDead()) {
      waterParticles.splice(i, 1);
    }
  }
}

// Mud Particles: Spawn from a random point along the cylinder wall,
// but now from a thick region defined by wallThickness.
function spawnMudParticles() {
  // Random angle within the slice.
  let angle = random(radians(-sliceAngle / 2), radians(sliceAngle / 2));
  // Random radius from (cylinderRadius - wallThickness) to cylinderRadius.
  let r = random(cylinderRadius - wallThickness, cylinderRadius);
  let spawnX = r * cos(angle);
  let spawnY = r * sin(angle);
  let spawnZ = random(parseFloat(bottomInput.value()), parseFloat(topInput.value()));
  if (random() < 0.2) {
    mudParticles.push(new MudParticle(spawnX, spawnY, spawnZ));
  }
}

function updateMudParticles() {
  for (let i = mudParticles.length - 1; i >= 0; i--) {
    mudParticles[i].update();
    mudParticles[i].display();
    if (mudParticles[i].isDead()) {
      mudParticles.splice(i, 1);
    }
  }
}

// ----------------------------
// Reverse Mode Toggle
// ----------------------------
function toggleReverse() {
  // Reverse velocities for existing particles.
  for (let p of waterParticles) {
    p.vel.mult(-1);
  }
  for (let p of mudParticles) {
    p.vel.mult(-1);
  }
  // Toggle the reverse mode flag.
  reverseMode = !reverseMode;
  // Update button text.
  reverseButton.html(reverseMode ? "Normal Mode" : "Toggle Reverse");
}
