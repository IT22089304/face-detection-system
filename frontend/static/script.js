import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getStorage, ref, uploadString, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";
import QRCode from "https://cdn.jsdelivr.net/npm/qrcode@1.5.3/+esm";

// ✅ Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyC_GknCorE0goHp-bDUqySS7-BmrjONXE8",
  authDomain: "ceylonvibes.firebaseapp.com",
  projectId: "ceylonvibes",
  storageBucket: "ceylonvibes.appspot.com",
  messagingSenderId: "804091201630",
  appId: "1:804091201630:web:234dbd999f20e197c78ccf"
};

const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

document.addEventListener("DOMContentLoaded", function () {
  const webcam = document.getElementById("webcam");
  const captureBtn = document.getElementById("capture-btn");
  const registerBtn = document.getElementById("register-btn");
  const instructions = document.getElementById("instructions");
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");

  let frontImage = "";

  // ✅ Open Webcam
  navigator.mediaDevices.getUserMedia({ video: true })
    .then((stream) => {
      webcam.srcObject = stream;
    })
    .catch((err) => {
      console.error("Error accessing webcam:", err);
    });

  // ✅ Capture Face Image
  captureBtn.addEventListener("click", () => {
    canvas.width = webcam.videoWidth;
    canvas.height = webcam.videoHeight;
    ctx.drawImage(webcam, 0, 0, canvas.width, canvas.height);

    frontImage = canvas.toDataURL("image/jpeg");
    registerBtn.disabled = false;
    instructions.textContent = "✅ Front image captured! Click Register to continue.";
  });

  // ✅ Register User
  registerBtn.addEventListener("click", async () => {
    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const password = document.getElementById("password").value.trim();
    const role = sessionStorage.getItem("selectedRole") || "visitor";

    if (!name || !email || !phone || !password || !frontImage) {
      alert("❗ Please fill in all fields and capture your front image!");
      return;
    }

    const qrToken = `${email}_${Date.now()}`;
    let qrImageBase64;

    try {
      // ✅ Generate QR code
      qrImageBase64 = await QRCode.toDataURL(qrToken);
    } catch (err) {
      console.error("QR generation failed:", err);
      alert("❗ QR code generation failed.");
      return;
    }

    try {
      // ✅ Upload face image
      const faceRef = ref(storage, `faces/${email}_face.jpg`);
      await uploadString(faceRef, frontImage, 'data_url');
      const faceURL = await getDownloadURL(faceRef);

      // ✅ Upload QR image
      const qrRef = ref(storage, `qr_codes/${email}_qr.png`);
      await uploadString(qrRef, qrImageBase64, 'data_url');
      const qrURL = await getDownloadURL(qrRef);

      // ✅ Construct data to send
      const userData = {
        name,
        email,
        phone,
        password,
        qr_token: qrToken,
        qr_url: qrURL,
        face_url: faceURL,
        role
      };

      const response = await fetch("http://127.0.0.1:5000/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData)
      });

      const result = await response.json();

      if (response.ok && result.pdf_url) {
        alert("🎉 Registration successful! Your ID card will now download.");
        
        // ✅ Download PDF
        const link = document.createElement("a");
        link.href = result.pdf_url;
        link.download = "Hospital_ID_Card.pdf";
        link.click();
      } else {
        alert(result.message || "❌ Registration failed.");
      }

    } catch (err) {
      console.error("Registration failed:", err);
      alert("❌ Registration failed. Check console for errors.");
    }
  });
});
