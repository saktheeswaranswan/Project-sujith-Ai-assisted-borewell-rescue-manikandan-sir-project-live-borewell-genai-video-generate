import cv2
import mediapipe as mp
import json

# Initialize MediaPipe Pose.
mp_drawing = mp.solutions.drawing_utils
mp_pose = mp.solutions.pose

# Open the default camera.
cap = cv2.VideoCapture(0)

# Set up MediaPipe Pose with detection and tracking confidence thresholds.
with mp_pose.Pose(min_detection_confidence=0.5, min_tracking_confidence=0.5) as pose:
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        # Convert the frame to RGB and process with MediaPipe Pose.
        image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        image.flags.writeable = False
        results = pose.process(image)
        image.flags.writeable = True
        image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)

        # If pose landmarks are detected, draw them on the image.
        if results.pose_landmarks:
            mp_drawing.draw_landmarks(
                image, results.pose_landmarks, mp_pose.POSE_CONNECTIONS)

        cv2.imshow("Pose Estimation", image)
        key = cv2.waitKey(1)

        # Press 's' to save the current pose keypoints to a JSON file.
        if key & 0xFF == ord('s'):
            if results.pose_landmarks:
                keypoints = []
                for lm in results.pose_landmarks.landmark:
                    # Save normalized coordinates.
                    keypoints.append({
                        'x': lm.x,
                        'y': lm.y,
                        'z': lm.z,
                        'visibility': lm.visibility
                    })

                # mp_pose.POSE_CONNECTIONS is a set of tuple pairs.
                connections = [list(conn) for conn in mp_pose.POSE_CONNECTIONS]
                data = {
                    "pose": keypoints,
                    "connections": connections
                }

                with open("pose_keypoints.json", "w") as f:
                    json.dump(data, f, indent=4)
                print("Keypoints saved to pose_keypoints.json")
            else:
                print("No pose landmarks detected to save.")

        # Press 'q' to exit.
        if key & 0xFF == ord('q'):
            break

cap.release()
cv2.destroyAllWindows()

