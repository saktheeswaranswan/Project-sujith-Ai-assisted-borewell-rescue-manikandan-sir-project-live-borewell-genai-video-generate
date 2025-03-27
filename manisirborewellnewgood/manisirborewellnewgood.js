let angleX = 0;
let angleY = 0;
let cylinderRadius = 100;
let cylinderHeight = 300;
let sliceAngle = 180; // Initial slice angle (half of the cylinder)
let zPos = 0; // Position of the pose inside the cylinder
let lastMouseX, lastMouseY;

let topInput, bottomInput, sliceAngleInput;
let loadJSONButton;

let playbackStartTime = 0;
let recordedData;  // will hold the entire JSON sequence

// Default static pose (Sitting Pose) used before a JSON file is loaded.
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

  // Create input elements for controlling the extruded cylinder.
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
  rotateX(angleX);
  rotateY(angleY);

  // Draw the cylinder.
  drawExtrudedCylinderWithCut();

  // If a recorded pose sequence is loaded, compute the current pose from the playback time.
  if (recordedData) {
    let playbackTime = (millis() / 1000 - playbackStartTime) % recordedData.duration;
    updatePoseFromSequence(playbackTime);
  }

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

function keyPressed() {
  if (keyCode === UP_ARROW) {
    zPos -= 10;
  } else if (keyCode === DOWN_ARROW) {
    zPos += 10;
  }
}

// Load the pose sequence JSON file and start playback.
function loadPoseJSON() {
  loadJSON("pose_sequence.json", updatePoseSequence, 'json');
}

function updatePoseSequence(data) {
  recordedData = data;
  playbackStartTime = millis() / 1000;
  // Convert normalized coordinates to canvas coordinates for the first frame.
  updatePoseFromSequence(0);
  console.log("Pose sequence loaded. Duration: " + recordedData.duration + " seconds");
}

// Given a playback time (in seconds), update the global pose by finding the closest frame.
function updatePoseFromSequence(playbackTime) {
  if (!recordedData || recordedData.frames.length === 0) return;
  
  // Find the frame with the largest timestamp less than or equal to playbackTime.
  let currentFrame = recordedData.frames[0];
  for (let frame of recordedData.frames) {
    if (frame.time <= playbackTime) {
      currentFrame = frame;
    } else {
      break;
    }
  }
  
  // Update the global pose array.
  // Convert normalized coordinates ([0,1]) to canvas coordinates (centered in WEBGL, so (0.5,0.5) is the center).
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
