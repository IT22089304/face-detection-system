document.addEventListener("DOMContentLoaded", () => {
  const video = document.getElementById("video");
  const faceMessage = document.getElementById("face-message");
  const qrStatus = document.getElementById("qr-status");
  const verifyBtn = document.getElementById("verify-face-btn");
  const blinkStatus = document.getElementById("blink-status");

  let userEmail = "";
  let userData = null;
  let attemptCount = 0;
  let blinkDetected = false;
  let lastEyeState = "open";
  let blinkCounter = 0;

  verifyBtn.style.display = "none"; 
  blinkStatus.innerText = "👁️ Waiting for blink...";
  blinkStatus.style.color = "orange";

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
        return;
      }
    }
    requestAnimationFrame(scanQRCode);
  }

  function startQRScanner() {
    const script = document.createElement("script");
    script.src = "static/jsQR.js";
    script.onload = () => {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then((stream) => {
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
        startBlinkDetection();
      } else {
        qrStatus.innerText = "❌ Invalid QR code or user not found.";
      }
    } catch (err) {
      qrStatus.innerText = "❌ Error fetching user from QR.";
    }
  }

  function startWebcam() {
    navigator.mediaDevices.getUserMedia({ video: true })
      .then((stream) => {
        video.srcObject = stream;
      })
      .catch((err) => console.error("Webcam error:", err));
  }

  function startBlinkDetection() {
    const faceMesh = new FaceMesh({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
    });

    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    faceMesh.onResults(onFaceResults);

    const camera = new Camera(video, {
      onFrame: async () => {
        await faceMesh.send({ image: video });
      },
      width: 640,
      height: 480
    });

    camera.start();
  }

  function onFaceResults(results) {
    if (results.multiFaceLandmarks.length > 0) {
      const landmarks = results.multiFaceLandmarks[0];

      const leftEAR = getEyeAspectRatio(landmarks, true);
      const rightEAR = getEyeAspectRatio(landmarks, false);
      const avgEAR = (leftEAR + rightEAR) / 2;

      if (avgEAR < 0.2 && lastEyeState === "open") {
        lastEyeState = "closed";
        blinkCounter++;
      } else if (avgEAR >= 0.2) {
        lastEyeState = "open";
      }

      if (blinkCounter >= 1 && !blinkDetected) {
        blinkDetected = true;
        verifyBtn.style.display = "inline-block"; 
        verifyBtn.disabled = false;

        blinkStatus.innerText = "✅ Blink Detected! Ready for face verification.";
        blinkStatus.style.color = "green";
      }
    }
  }

  function getEyeAspectRatio(landmarks, isLeftEye) {
    const indices = isLeftEye
      ? [33, 160, 158, 133, 153, 144]  // Left eye
      : [362, 385, 387, 263, 373, 380]; // Right eye

    const [p1, p2, p3, p4, p5, p6] = indices.map(i => landmarks[i]);
    const vertical1 = Math.hypot(p2.x - p6.x, p2.y - p6.y);
    const vertical2 = Math.hypot(p3.x - p5.x, p3.y - p5.y);
    const horizontal = Math.hypot(p1.x - p4.x, p1.y - p4.y);

    return (vertical1 + vertical2) / (2.0 * horizontal);
  }

  verifyBtn.addEventListener("click", async () => {
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
        setTimeout(() => window.location.href = "dashboard.html", 1500);
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
      faceMessage.innerText = "❌ Error verifying face.";
    }
  });
});
