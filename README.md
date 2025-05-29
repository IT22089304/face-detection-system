# 🧠 Face Detection & Verification System

This is a smart face detection and verification system built using Python, OpenCV, and Deep Learning. The project detects human faces from images or video, and optionally verifies identities using pre-trained models.

---

## 🚀 Features

- Real-time face detection using OpenCV
- Face verification with DeepFace (VGG-Face, Facenet, ArcFace, Dlib)
- Live webcam or image input support
- Saves detected faces for logs or datasets
- Optional integration with Flask for API support

---

## 🛠 Technologies Used

- Python
- OpenCV
- DeepFace
- NumPy
- Flask (optional API)
- Firebase or MongoDB (optional user/image storage)

---

## 📁 Project Structure

📦 face-detection-system  
├── app.py                 - Main application script  
├── face_utils.py         - Helper functions for detection and verification  
├── static/               - Stored face images or assets  
├── templates/            - HTML templates (if Flask is used)  
├── requirements.txt      - Python dependencies  
└── README.md             - Project documentation  

---

## 🧪 How to Run

1. Clone the repository:
   git clone https://github.com/IT22089304/face-detection-system.git  
   cd face-detection-system

2. Install dependencies:
   pip install -r requirements.txt

3. Run the application:
   python app.py

*Ensure your camera is connected if using live detection.*

---

## 📷 Sample Output

- Detected face shown with bounding box
- If verified: ✔️ Identity matched
- If not verified: ❌ Unknown person

---

## 🧠 Face Verification Models

This system supports the following models through DeepFace:
- VGG-Face
- Facenet
- ArcFace
- Dlib

These models convert faces into vector embeddings and compare similarity to known faces.

---

## 💡 Use Cases

- Face-based login systems
- Attendance tracking for classes or events
- Security alerts for unauthorized faces
- Real-time photo tagging

---

## 🙋 Author

- GitHub: [IT22089304](https://github.com/IT22089304)  
- Built by: Lahiru Bandara  
- Organization: LAB Developers

---

## 📄 License

MIT License

---

⚠️ Disclaimer: This project is for educational purposes. Always handle biometric data ethically and comply with data protection laws when using facial recognition technology.
