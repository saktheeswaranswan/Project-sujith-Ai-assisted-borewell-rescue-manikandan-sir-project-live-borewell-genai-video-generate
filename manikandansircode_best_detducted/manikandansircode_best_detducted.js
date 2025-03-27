let angleX = 0;
let angleY = 0;
let cylinderRadius = 100;
let cylinderHeight = 300;
let sliceAngle = 180; // Initial slice angle (half of the cylinder)
let zPos = 0; // Position of the pose inside the cylinder
let lastMouseX, lastMouseY;

// Create input elements for controlling the top and bottom positions of the extruded cylinder
let topInput, bottomInput, sliceAngleInput;

// Example Pose Data (Static with Draggable Keypoints) - Sitting Pose
let pose = [
  { x: 0, y: -120, dragging: false }, // Head
  { x: 0, y: -80, dragging: false },   // Neck
  { x: -40, y: -60, dragging: false },  // Left Shoulder
  { x: 40, y: -60, dragging: false },   // Right Shoulder
  { x: -60, y: -20, dragging: false },  // Left Elbow
  { x: 60, y: -20, dragging: false },   // Right Elbow
  { x: -80, y: 30, dragging: false },   // Left Hand
  { x: 80, y: 30, dragging: false },    // Right Hand
  { x: 0, y: 0, dragging: false },      // Hip
  { x: -40, y: 60, dragging: false },   // Left Knee
  { x: 40, y: 60, dragging: false },    // Right Knee
  { x: -50, y: 120, dragging: false },  // Left Foot
  { x: 50, y: 120, dragging: false }    // Right Foot
];

// Pose connections (lines connecting key points)
let connections = [
  [0, 1],        // Head to Neck
  [1, 2], [1, 3],// Neck to Shoulders
  [2, 4], [3, 5],// Shoulders to Elbows
  [4, 6], [5, 7],// Elbows to Hands
  [1, 8],        // Neck to Hip
  [8, 9], [8, 10],// Hip to Knees
  [9, 11], [10, 12]// Knees to Feet
];

function setup() {
  createCanvas(600, 600, WEBGL);

  // Create input for controlling the top position of the extruded cylinder
  topInput = createInput(cylinderHeight / 2);
  topInput.position(20, height + 20);
  topInput.size(100, 20);
  topInput.input(updateExtrude);

  // Create input for controlling the bottom position of the extruded cylinder
  bottomInput = createInput(-cylinderHeight / 2);
  bottomInput.position(140, height + 20);
  bottomInput.size(100, 20);
  bottomInput.input(updateExtrude);

  // Create an HTML text input for slice angle control (do not change)
  sliceAngleInput = createInput(sliceAngle.toString());
  sliceAngleInput.position(260, height + 20);
  sliceAngleInput.size(100, 20);
  sliceAngleInput.input(updateSliceAngle);
}

function draw() {
  background(200);
  rotateX(angleX);
  rotateY(angleY);

  drawExtrudedCylinderWithCut();

  push();
  translate(0, zPos, 0);
  drawPoseSkeleton();
  pop();
}

function drawExtrudedCylinderWithCut() {
  push();
  noFill();
  stroke(0, 255, 0);
  strokeWeight(2);
  rotateX(HALF_PI);

  for (let a = radians(-sliceAngle / 2); a <= radians(sliceAngle / 2); a += 0.1) {
    let x = cylinderRadius * cos(a);
    let y = cylinderRadius * sin(a);
    line(x, y, float(bottomInput.value()), x, y, float(topInput.value()));
  }

  fill(0, 255, 0, 50);
  noStroke();
  arc(0, 0, cylinderRadius * 2, cylinderRadius * 2, radians(-sliceAngle / 2), radians(sliceAngle / 2));
  pop();
}

function drawPoseSkeleton() {
  // Draw connections between keypoints
  stroke(255, 0, 0);
  strokeWeight(3);
  for (let conn of connections) {
    let p1 = pose[conn[0]];
    let p2 = pose[conn[1]];
    line(p1.x, -p1.y, p2.x, -p2.y);
  }

  // Draw keypoints as red circles
  for (let i = 0; i < pose.length; i++) {
    let { x, y } = pose[i];
    push();
    translate(x, -y);
    fill(255, 0, 0);
    ellipse(0, 0, 10, 10);
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
  // Rotate the scene
  angleY += (mouseX - lastMouseX) * 0.01;
  angleX -= (mouseY - lastMouseY) * 0.01;
  lastMouseX = mouseX;
  lastMouseY = mouseY;
  
  // Update dragging keypoints
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
