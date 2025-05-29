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

  const nameInput = document.getElementById("name");
  const emailInput = document.getElementById("email");
  const phoneInput = document.getElementById("phone");

  const previewContainer = document.getElementById("captured-preview");
  const capturedImage = document.getElementById("captured-image");
  const deleteCapture = document.getElementById("delete-capture");

  let frontImage = "";
  let faceCaptured = false;

  // ✅ Webcam Access
  navigator.mediaDevices.getUserMedia({ video: true })
    .then((stream) => {
      webcam.srcObject = stream;
    })
    .catch((err) => {
      console.error("Error accessing webcam:", err);
    });

  // ✅ Face Capture
  captureBtn.addEventListener("click", () => {
    canvas.width = webcam.videoWidth;
    canvas.height = webcam.videoHeight;
    ctx.drawImage(webcam, 0, 0, canvas.width, canvas.height);

    frontImage = canvas.toDataURL("image/jpeg"); 
    faceCaptured = true;

    // Show captured image preview
    capturedImage.src = frontImage;
    previewContainer.style.display = "block";

    instructions.textContent = "✅ Face captured! If not clear, delete and recapture.";
  });

  // ✅ Delete Captured Image
  deleteCapture.addEventListener("click", () => {
    frontImage = "";
    faceCaptured = false;
    capturedImage.src = "";
    previewContainer.style.display = "none";
    instructions.textContent = "❗ Please capture your face before registering!";
  });

  // ✅ Form Validation
  function validateInput(input, errorId, validationFn, errorMsg) {
    const value = input.value.trim();
    const errorElement = document.getElementById(errorId);

    if (!validationFn(value)) {
      input.classList.add("invalid");
      input.classList.remove("valid");
      errorElement.textContent = errorMsg;
      return false;
    } else {
      input.classList.remove("invalid");
      input.classList.add("valid");
      errorElement.textContent = "";
      return true;
    }
  }

  function validateForm() {
    const nameValid = validateInput(nameInput, "name-error", val => val.length >= 3, "Name must be at least 3 characters.");
    const emailValid = validateInput(emailInput, "email-error", val => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), "Enter a valid email.");
    const phoneValid = validateInput(phoneInput, "phone-error", val => /^[0-9]{10}$/.test(val), "Phone must be exactly 10 digits.");

    if (!faceCaptured) {
      instructions.textContent = "❗ Please capture your face before registering!";
    } else {
      instructions.textContent = "✅ Face captured! If not clear, delete and recapture.";
    }

    return nameValid && emailValid && phoneValid && faceCaptured;
  }

  [nameInput, emailInput, phoneInput].forEach(input => {
    input.addEventListener("input", validateForm);
  });

  // ✅ Register User
  registerBtn.addEventListener("click", async () => {
    if (!validateForm()) {
      alert("❗ Please fix the errors before registering.");
      return;
    }

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const phone = phoneInput.value.trim();
    const role = sessionStorage.getItem("selectedRole") || "visitor";

    const qrToken = `${email}_${Date.now()}`;
    let qrImageBase64;

    try {
      qrImageBase64 = await QRCode.toDataURL(qrToken);
    } catch (err) {
      console.error("QR generation failed:", err);
      alert("❗ QR code generation failed.");
      return;
    }

    try {
      // ✅ Upload Face Image
      const faceRef = ref(storage, `faces/${email}_face.jpg`);
      await uploadString(faceRef, frontImage, 'data_url');
      const faceURL = await getDownloadURL(faceRef);

      // ✅ Upload QR Image
      const qrRef = ref(storage, `qr_codes/${email}_qr.png`);
      await uploadString(qrRef, qrImageBase64, 'data_url');
      const qrURL = await getDownloadURL(qrRef);

      const userData = {
        name,
        email,
        phone,
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

        const link = document.createElement("a");
        link.href = result.pdf_url;
        link.download = "Hospital_ID_Card.pdf";
        link.click();
      } else {
        alert(result.message || "❌ Registration failed face capture failed.");
      }

    } catch (err) {
      console.error("Registration failed:", err);
      alert("❌ Registration failed. Check console for errors.");
    }
  });
});
