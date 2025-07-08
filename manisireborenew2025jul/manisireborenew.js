// Global scene & pose variables
let angleX = 0;
let angleY = 0;
let cylinderRadius = 100;
let cylinderHeight = 300;
let sliceAngle = 180;
let zPos = 0;

let lastMouseX, lastMouseY;
let topInput, bottomInput, sliceAngleInput, wallThicknessInput;
let loadJSONButton, reverseButton, resetButton;
let playbackStartTime = 0;
let recordedData;

let pose = [
  { x: 0, y: -120, dragging: false },
  { x: 0, y: -80, dragging: false },
  { x: -40, y: -60, dragging: false },
  { x: 40, y: -60, dragging: false },
  { x: -60, y: -20, dragging: false },
  { x: 60, y: -20, dragging: false },
  { x: -80, y: 30, dragging: false },
  { x: 80, y: 30, dragging: false },
  { x: 0, y: 0, dragging: false },
  { x: -40, y: 60, dragging: false },
  { x: 40, y: 60, dragging: false },
  { x: -50, y: 120, dragging: false },
  { x: 50, y: 120, dragging: false }
];

let connections = [
  [0, 1], [1, 2], [1, 3],
  [2, 4], [3, 5],
  [4, 6], [5, 7],
  [1, 8], [8, 9], [8, 10],
  [9, 11], [10, 12]
];

let baseGravity = 0.3;
let reverseMode = false;
let wallThickness = 20;
let waterParticles = [], mudParticles = [];

class WaterParticle {
  constructor(x, y, z) {
    this.pos = createVector(x, y, z);
    this.vel = p5.Vector.add(createVector(random(-2, 2), random(-1, 1), 0), createVector(0, random(-8, -5), 0));
    this.acc = createVector(0, reverseMode ? -baseGravity : baseGravity, 0);
    this.lifespan = 255;
    this.trail = [];
  }
  update() {
    this.acc.y = reverseMode ? -baseGravity : baseGravity;
    this.vel.add(this.acc);
    this.pos.add(this.vel);
    this.lifespan -= 3;
    this.trail.push(this.pos.copy());
    if (this.trail.length > 30) this.trail.shift();
  }
  display() {
    noStroke(); fill(0, 0, 255, this.lifespan);
    push(); translate(this.pos.x, this.pos.y, this.pos.z); sphere(5); pop();
    noFill(); stroke(0, 0, 255, 200); strokeWeight(3);
    beginShape(); for (let pt of this.trail) vertex(pt.x, pt.y, pt.z); endShape(); strokeWeight(1);
  }
  isDead() { return this.lifespan < 0; }
}

class MudParticle {
  constructor(x, y, z) {
    this.pos = createVector(x, y, z);
    this.vel = p5.Vector.add(createVector(random(-1, 1), random(-1, 1), 0), createVector(0, random(2, 4), 0));
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
    if (this.trail.length > 30) this.trail.shift();
  }
  display() {
    noStroke(); fill(139, 69, 19, this.lifespan);
    push(); translate(this.pos.x, this.pos.y, this.pos.z); sphere(3); pop();
    noFill(); stroke(139, 69, 19, 200); strokeWeight(3);
    beginShape(); for (let pt of this.trail) vertex(pt.x, pt.y, pt.z); endShape(); strokeWeight(1);
  }
  isDead() { return this.lifespan < 0; }
}

function setup() {
  createCanvas(windowWidth, windowHeight - 100, WEBGL);

  let yUI = height + 10;
  topInput = createInput(cylinderHeight / 2); topInput.position(20, yUI); topInput.size(80); topInput.input(updateExtrude);
  bottomInput = createInput(-cylinderHeight / 2); bottomInput.position(110, yUI); bottomInput.size(80); bottomInput.input(updateExtrude);
  sliceAngleInput = createInput(sliceAngle); sliceAngleInput.position(200, yUI); sliceAngleInput.size(80); sliceAngleInput.input(updateSliceAngle);
  wallThicknessInput = createInput(wallThickness); wallThicknessInput.position(290, yUI); wallThicknessInput.size(80); wallThicknessInput.input(updateWallThickness);

  loadJSONButton = createButton("Load Pose JSON"); loadJSONButton.position(380, yUI); loadJSONButton.mousePressed(loadPoseJSON);
  reverseButton = createButton("Toggle Reverse"); reverseButton.position(500, yUI); reverseButton.mousePressed(toggleReverse);
  resetButton = createButton("Reset View"); resetButton.position(620, yUI); resetButton.mousePressed(resetView);
}

function draw() {
  background(230);
  rotateX(angleX);
  rotateY(angleY);

  drawCylinder();
  if (recordedData) updatePoseFromSequence((millis() / 1000 - playbackStartTime) % recordedData.duration);

  push(); translate(0, zPos, 0); drawPose(); pop();
  updateWaterParticles(); updateMudParticles();
  spawnWaterParticles(); spawnMudParticles();
}

function drawCylinder() {
  push(); noFill(); stroke(0, 255, 0); strokeWeight(2); rotateX(HALF_PI);
  for (let a = radians(-sliceAngle / 2); a <= radians(sliceAngle / 2); a += 0.1) {
    let x = cylinderRadius * cos(a);
    let y = cylinderRadius * sin(a);
    line(x, y, parseFloat(bottomInput.value()), x, y, parseFloat(topInput.value()));
  }
  pop();
}

function drawPose() {
  stroke(255, 0, 0); strokeWeight(3);
  for (let c of connections) line(pose[c[0]].x, -pose[c[0]].y, 0, pose[c[1]].x, -pose[c[1]].y, 0);
  for (let j of pose) {
    push(); translate(j.x, -j.y, 0); noStroke(); fill(0, 100, 255); sphere(10); pop();
  }
}

function spawnWaterParticles() {
  let head = pose[0];
  if (random() < 0.3) waterParticles.push(new WaterParticle(head.x + random(-10, 10), -head.y - random(20, 40), 0));
}

function spawnMudParticles() {
  let angle = random(radians(-sliceAngle / 2), radians(sliceAngle / 2));
  let r = random(cylinderRadius - wallThickness, cylinderRadius);
  let x = r * cos(angle);
  let y = r * sin(angle);
  let z = random(parseFloat(bottomInput.value()), parseFloat(topInput.value()));
  if (random() < 0.2) mudParticles.push(new MudParticle(x, y, z));
}

function updateWaterParticles() {
  for (let i = waterParticles.length - 1; i >= 0; i--) {
    let p = waterParticles[i]; p.update(); p.display();
    if (p.isDead()) waterParticles.splice(i, 1);
  }
}

function updateMudParticles() {
  for (let i = mudParticles.length - 1; i >= 0; i--) {
    let p = mudParticles[i]; p.update(); p.display();
    if (p.isDead()) mudParticles.splice(i, 1);
  }
}

function updateSliceAngle() { sliceAngle = constrain(float(sliceAngleInput.value()), 0, 360); }
function updateExtrude() { cylinderHeight = float(topInput.value()) - float(bottomInput.value()); }
function updateWallThickness() { wallThickness = float(wallThicknessInput.value()); }

function toggleReverse() {
  for (let p of waterParticles) p.vel.mult(-1);
  for (let p of mudParticles) p.vel.mult(-1);
  reverseMode = !reverseMode;
  reverseButton.html(reverseMode ? "Normal Mode" : "Toggle Reverse");
}

function resetView() { angleX = 0; angleY = 0; zPos = 0; }

function mousePressed() {
  lastMouseX = mouseX; lastMouseY = mouseY;
  for (let p of pose) {
    let d = dist(mouseX - width / 2, mouseY - height / 2, p.x, -p.y);
    if (d < 10) p.dragging = true;
  }
}
function mouseDragged() {
  angleY += (mouseX - lastMouseX) * 0.01;
  angleX -= (mouseY - lastMouseY) * 0.01;
  lastMouseX = mouseX; lastMouseY = mouseY;
  for (let p of pose) {
    if (p.dragging) {
      p.x = mouseX - width / 2;
      p.y = -(mouseY - height / 2);
    }
  }
}
function mouseReleased() {
  for (let p of pose) p.dragging = false;
}

function keyPressed() {
  if (keyCode === UP_ARROW) zPos -= 10;
  else if (keyCode === DOWN_ARROW) zPos += 10;
}

function loadPoseJSON() {
  loadJSON("74-judo-throws-in120sec.json", data => {
    recordedData = data;
    playbackStartTime = millis() / 1000;
    updatePoseFromSequence(0);
  });
}

function updatePoseFromSequence(time) {
  if (!recordedData || recordedData.frames.length === 0) return;
  let frame = recordedData.frames.find(f => f.time >= time) || recordedData.frames[0];
  pose = frame.pose.map(kp => ({ x: (kp.x - 0.5) * width, y: (kp.y - 0.5) * height, dragging: false }));
  if (recordedData.connections) connections = recordedData.connections;
}
