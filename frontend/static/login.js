document.addEventListener("DOMContentLoaded", () => {
  const video = document.getElementById("video");
  const faceMessage = document.getElementById("face-message");
  const qrStatus = document.getElementById("qr-status");

  let userEmail = "";
  let userData = null;
  let attemptCount = 0;

  // ✅ QR SCANNER SETUP
  const qrCanvas = document.createElement("canvas");
  const qrCtx = qrCanvas.getContext("2d");
  const qrVideo = document.createElement("video");
  qrVideo.setAttribute("playsinline", true);
  qrVideo.style.display = "none";
  document.body.appendChild(qrVideo);

  function scanQRCode() {
    if (qrVideo.readyState === qrVideo.HAVE_ENOUGH_DATA) {
      qrCanvas.width = qrVideo.videoWidth;
      qrCanvas.height = qrVideo.videoHeight;
      qrCtx.drawImage(qrVideo, 0, 0, qrCanvas.width, qrCanvas.height);
      const imageData = qrCtx.getImageData(0, 0, qrCanvas.width, qrCanvas.height);
      const code = window.jsQR(imageData.data, qrCanvas.width, qrCanvas.height);

      if (code) {
        qrStatus.innerText = `✅ QR Code Read: ${code.data}`;
        handleQRToken(code.data);
        return; // Stop scanning
      }
    }
    requestAnimationFrame(scanQRCode);
  }

  // ✅ Load jsQR and start QR scanning
  function startQRScanner() {
    const script = document.createElement("script");
    script.src = "static/jsQR.js";
    script.onload = () => {
      navigator.mediaDevices.getUserMedia({ video: true }) // changed from { facingMode: "environment" }
        .then((stream) => {
          console.log("✅ QR camera started");
          qrVideo.srcObject = stream;
          qrVideo.play();
          requestAnimationFrame(scanQRCode);
        })
        .catch((err) => {
          qrStatus.innerText = "❌ Webcam not accessible: " + err;
        });
    };
    document.head.appendChild(script);
  }

  startQRScanner();

  // ✅ Step 1: Get user by QR token
  async function handleQRToken(qrToken) {
    try {
      const res = await fetch("http://127.0.0.1:5000/qr-login", {
        method: "POST",
        body: JSON.stringify({ qr_token: qrToken }),
        headers: { "Content-Type": "application/json" }
      });

      const data = await res.json();
      if (data.success) {
        userEmail = data.email;
        userData = data;
        document.getElementById("qr-step").style.display = "none";
        document.getElementById("face-step").style.display = "block";
        startWebcam();
      } else {
        qrStatus.innerText = "❌ Invalid QR code or user not found.";
      }
    } catch (err) {
      console.error("QR fetch error:", err);
      qrStatus.innerText = "❌ Error fetching user from QR.";
    }
  }

  // ✅ Step 2: Start webcam for face
  function startWebcam() {
    navigator.mediaDevices.getUserMedia({ video: true })
      .then((stream) => {
        video.srcObject = stream;
      })
      .catch((err) => console.error("Webcam error:", err));
  }

  // ✅ Step 3: Capture and verify face
  document.getElementById("verify-face-btn").addEventListener("click", async () => {
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const faceImage = canvas.toDataURL("image/jpeg");

    try {
      const res = await fetch("http://127.0.0.1:5000/verify-face", {
        method: "POST",
        body: JSON.stringify({ email: userEmail, image: faceImage }),
        headers: { "Content-Type": "application/json" }
      });

      const result = await res.json();
      if (result.success) {
        faceMessage.innerText = `✅ Face Verified! Match: ${result.message}`;
        sessionStorage.setItem("user", JSON.stringify(userData));
        setTimeout(() => {
          window.location.href = "dashboard.html";
        }, 1500);
      } else {
        attemptCount++;
        faceMessage.innerText = `❌ Face Not Recognized! Attempt ${attemptCount}/3`;

        if (attemptCount >= 3) {
          await fetch("http://127.0.0.1:5000/api/alert-admin", {
            method: "POST",
            body: JSON.stringify({
              email: userEmail,
              time: new Date().toISOString()
            }),
            headers: { "Content-Type": "application/json" }
          });

          alert("Admin has been alerted due to failed attempts.");
          window.location.href = "/login.html";
        }
      }
    } catch (err) {
      console.error("Face verification error:", err);
      faceMessage.innerText = "❌ Error verifying face.";
    }
  });

  /* ❌ Fallback QR Upload – commented
  document.getElementById("uploadQRBtn").addEventListener("click", () => {
    const fileInput = document.getElementById("qrUpload");
    const file = fileInput.files[0];
    if (!file) return alert("Please upload a QR code image.");

    const reader = new FileReader();
    reader.onload = function (e) {
      const img = new Image();
      img.onload = function () {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, img.width, img.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = window.jsQR(imageData.data, canvas.width, canvas.height);
        if (code) {
          qrStatus.innerText = `✅ QR Code Read: ${code.data}`;
          handleQRToken(code.data);
        } else {
          qrStatus.innerText = "❌ Failed to read QR code from image.";
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
  */
});
