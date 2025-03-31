import cv2
import mediapipe as mp
import json
import time

mp_pose = mp.solutions.pose
mp_drawing = mp.solutions.drawing_utils

# Duration to record (in seconds)
duration = 60  # Adjust as needed.
start_time = time.time()
frames_data = []

cap = cv2.VideoCapture('videoplayback.mp4')

# Define target resolution
target_width = 640
target_height = 720

# Optionally, print original resolution
orig_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
orig_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
print(f"Original resolution: {orig_width}x{orig_height}")

with mp_pose.Pose(min_detection_confidence=0.5, min_tracking_confidence=0.5) as pose:
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        # Resize frame to 940x640 resolution
        frame = cv2.resize(frame, (target_width, target_height))
        
        current_time = time.time() - start_time
        if current_time > duration:
            break

        image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        image.flags.writeable = False
        results = pose.process(image)
        image.flags.writeable = True
        image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)

        if results.pose_landmarks:
            mp_drawing.draw_landmarks(image, results.pose_landmarks, mp_pose.POSE_CONNECTIONS)
            keypoints = []
            for lm in results.pose_landmarks.landmark:
                keypoints.append({
                    'x': lm.x,
                    'y': lm.y,
                    'z': lm.z,
                    'visibility': lm.visibility
                })
            frames_data.append({
                'time': current_time,
                'pose': keypoints
            })

        cv2.imshow("Pose Estimation", image)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

cap.release()
cv2.destroyAllWindows()

# Save the sequence data along with connection info.
connections = [list(conn) for conn in mp_pose.POSE_CONNECTIONS]
output_data = {
    'duration': duration,
    'frames': frames_data,
    'connections': connections,
    'target_resolution': {'width': target_width, 'height': target_height}
}

with open("pose_sequence.json", "w") as f:
    json.dump(output_data, f, indent=4)
print("Pose sequence saved to pose_sequence.json")

