import os
import base64
import cv2
import numpy as np
import io
import requests
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from deepface import DeepFace
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from flask import send_from_directory

from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)

# 🔥 Updated CORS setup to fix your issue
CORS(app, resources={r"/*": {"origins": "http://127.0.0.1:8000"}}, supports_credentials=True)

# 🔥 Explicitly allow your frontend origin and handle all methods
CORS(app)

# 📦 MongoDB
# 🔧 MongoDB Setup
MONGO_URI = "mongodb+srv://lahiruflutter:lahiru@cluster0.oxqke.mongodb.net/flutterapp?retryWrites=true&w=majority&appName=Cluster0"
client = MongoClient(MONGO_URI)
db = client["face_auth"]
users = db["users"]

# 📧 Admin Email Setup 
ADMIN_EMAIL = "gproject000001@gmail.com"
SENDER_EMAIL = "lahirucoc2@gmail.com"
SENDER_PASSWORD = "kkjs wdgl ejox earb "

# 📁 Directories
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PDF_DIR = os.path.join(BASE_DIR, "pdf_cards")
os.makedirs(PDF_DIR, exist_ok=True)

# 📄 PDF Generator
def generate_pdf_card(name, email, qr_url, filename):
    pdf_path = os.path.join(PDF_DIR, filename)
    width, height = 400, 180  # Slimmer height for ID card
    c = canvas.Canvas(pdf_path, pagesize=(width, height))

    # 🔲 Border
    c.setStrokeColorRGB(0.2, 0.2, 0.5)
    c.setLineWidth(2)
    c.rect(5, 5, width - 10, height - 10, fill=0)

    # 🟦 Header Banner
    c.setFillColorRGB(0.1, 0.3, 0.6)
    c.rect(5, height - 35, width - 10, 30, fill=True)

    c.setFont("Helvetica-Bold", 16)
    c.setFillColorRGB(1, 1, 1)
    c.drawString(20, height - 25, "Hospital Access ID")

    # 👤 Info Section
    c.setFont("Helvetica", 12)
    c.setFillColorRGB(0, 0, 0)
    c.drawString(20, height - 60, f"Name : {name}")
    c.drawString(20, height - 80, f"Email: {email}")
    c.drawString(20, height - 100, f"Date : {datetime.now().strftime('%Y-%m-%d')}")

    # 🧾 QR Code (Right side)
    try:
        qr_img_data = requests.get(qr_url).content
        qr_img = ImageReader(io.BytesIO(qr_img_data))
        c.drawImage(qr_img, width - 120, 40, width=80, height=80)
    except:
        print("⚠️ Couldn't load QR image")

    c.save()
    print(f"✅ Hospital ID PDF saved: {pdf_path}")

# ✅ Register user
@app.route("/register", methods=["POST"])
def register():
    try:
        data = request.json
        name = data["name"]
        email = data["email"]
        phone = data["phone"]
        password = data["password"]
        qr_token = data["qr_token"]
        qr_url = data["qr_url"]
        face_url = data["face_url"]
        role = data.get("role", "visitor")  # Default to visitor if not sent

        user = {
            "name": name,
            "email": email,
            "phone": phone,
            "password": password,
            "qr_token": qr_token,
            "qr_url": qr_url,
            "face_url": face_url,
            "role": role,
            "created_at": datetime.utcnow()
        }

        users.insert_one(user)

        pdf_filename = f"{email.replace('@', '_').replace('.', '_')}_card.pdf"
        generate_pdf_card(name, email, qr_url, pdf_filename)

        pdf_download_url = f"http://127.0.0.1:5000/download-pdf/{pdf_filename}"

        return jsonify({
            "message": "User registered and PDF card created!",
            "pdf_url": pdf_download_url
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ✅ QR login
@app.route("/qr-login", methods=["POST"])
def qr_login():
    try:
        data = request.json
        qr_token = data.get("qr_token")
        user = users.find_one({"qr_token": qr_token})
        if not user:
            return jsonify({"success": False, "message": "Invalid QR token"}), 404

        return jsonify({
            "success": True,
            "email": user["email"],
            "name": user["name"],
            "phone": user["phone"],
            "face_url": user["face_url"],
            "role": user.get("role", "visitor")  # Default to visitor if missing
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/download-pdf/<filename>", methods=["GET"])
def download_pdf(filename):
    try:
        return send_from_directory(PDF_DIR, filename, as_attachment=True)
    except FileNotFoundError:
        return jsonify({"error": "File not found"}), 404
    
# ✅ Verify face
@app.route("/verify-face", methods=["POST"])
def verify_face():
    try:
        data = request.json
        email = data.get("email")
        image_data = data.get("image")

        user = users.find_one({"email": email})
        if not user:
            return jsonify({"success": False, "message": "User not found"}), 404

        # Decode uploaded image
        img_bytes = base64.b64decode(image_data.split(",")[1])
        np_img = np.frombuffer(img_bytes, np.uint8)
        captured_img = cv2.imdecode(np_img, cv2.IMREAD_COLOR)

        if captured_img is None:
            return jsonify({"success": False, "message": "Invalid image"}), 400

        # Compare using DeepFace
        result = DeepFace.verify(img1_path=captured_img, img2_path=user["face_url"], model_name="Facenet")
        score = (1 - result["distance"]) * 100

        if result["verified"]:
            return jsonify({
                "success": True,
                "message": f"{score:.2f}% match",
                "name": user["name"],
                "email": user["email"],
                "phone": user["phone"]
            })

        return jsonify({"success": False, "message": f"{score:.2f}% match"})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ✅ Alert admin (after 3 fails)
@app.route("/api/alert-admin", methods=["POST"])
def alert_admin():
    try:
        data = request.json
        email = data.get("email")
        time = data.get("time")

        user = users.find_one({"email": email})
        if not user:
            return jsonify({"message": "User not found"}), 404

        # 🚨 Log Alert
        print(f"🚨 Alert: {user['name']} ({email}) failed 3 times at {time}")

        # ✉️ Prepare Email Content
        import smtplib
        from email.mime.text import MIMEText
        from email.mime.multipart import MIMEMultipart

        subject = "🚨 Face Verification Alert!"
        body = f"""
        ALERT: Face verification failed 3 times!

        User Details:
        Name : {user['name']}
        Email: {email}
        Time : {time}

        Immediate action recommended.
        """

        msg = MIMEMultipart()
        msg['From'] = SENDER_EMAIL
        msg['To'] = ADMIN_EMAIL
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'plain'))

        # 📧 Send Email
        try:
            server = smtplib.SMTP('smtp.gmail.com', 587)
            server.starttls()
            server.login(SENDER_EMAIL, SENDER_PASSWORD)
            server.sendmail(SENDER_EMAIL, ADMIN_EMAIL, msg.as_string())
            server.quit()
            print("📧 Admin alerted via email.")
        except Exception as e:
            print(f"❌ Failed to send email: {e}")
            return jsonify({"message": "Failed to send email alert."}), 500

        return jsonify({"message": "Admin has been alerted via email."})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ✅ Run server
if __name__ == "__main__":
    app.run(debug=True)
