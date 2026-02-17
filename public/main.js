// main.js
import * as JSZip from "https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js";

const fileInput = document.getElementById("file");
const intervalInput = document.getElementById("interval");
const modeSelect = document.getElementById("mode");
const speedInput = document.getElementById("speed");
const reverseCheckbox = document.getElementById("reverse");
const runBtn = document.getElementById("run");
const zipBtn = document.getElementById("zip");
const statusDiv = document.getElementById("status");
const progressBar = document.getElementById("progress");
const framesDiv = document.getElementById("frames");

let extractedImages = [];
let processedVideoBlob = null;

// 実行ボタン
runBtn.addEventListener("click", async () => {
  if (!fileInput.files[0]) {
    alert("動画を選択してください");
    return;
  }

  extractedImages = [];
  processedVideoBlob = null;
  framesDiv.innerHTML = "";
  zipBtn.disabled = true;
  progressBar.value = 0;
  statusDiv.textContent = "処理中…";

  const mode = modeSelect.value;

  if (mode === "extract") {
    await extractFrames(fileInput.files[0], parseFloat(intervalInput.value));
  } else if (mode === "process") {
    await processVideo(
      fileInput.files[0],
      parseFloat(speedInput.value),
      reverseCheckbox.checked
    );
  }
});

// ZIPダウンロード
zipBtn.addEventListener("click", async () => {
  if (extractedImages.length === 0) return;

  statusDiv.textContent = "ZIP作成中…";
  const zip = new JSZip();
  extractedImages.forEach((imgData, i) => {
    zip.file(`frame_${i + 1}.png`, imgData.split(",")[1], { base64: true });
  });
  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "frames.zip";
  a.click();
  URL.revokeObjectURL(url);
  statusDiv.textContent = "ZIP作成完了";
});

// フレーム抽出
async function extractFrames(file, intervalSec) {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.src = url;
  video.muted = true;
  await video.play();
  video.pause();

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  let currentTime = 0;

  while (currentTime < video.duration) {
    video.currentTime = currentTime;
    await new Promise((resolve) => (video.onseeked = resolve));
    ctx.drawImage(video, 0, 0);
    const imgData = canvas.toDataURL("image/png");

    // プレビュー追加
    const img = document.createElement("img");
    img.src = imgData;
    img.className = "preview-frame";
    framesDiv.appendChild(img);

    extractedImages.push(imgData);

    const progressPercent = Math.min(Math.floor((currentTime / video.duration) * 100), 100);
    statusDiv.textContent = `抽出中… (${progressPercent}%)`;
    progressBar.value = progressPercent;

    currentTime += intervalSec;
    await new Promise((r) => setTimeout(r, 1));
  }

  statusDiv.textContent = "抽出完了";
  progressBar.value = 100;
  zipBtn.disabled = false;
}

// 動画加工（逆再生/倍速、高速版）
async function processVideo(file, speed = 1, reverse = false) {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.src = url;
  video.muted = true;
  await video.play();
  video.pause();

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const frameDuration = 1000 / 30; // 30fps
  let currentTime = reverse ? video.duration : 0;
  const increment = reverse ? -frameDuration / 1000 : frameDuration / 1000;

  const stream = canvas.captureStream(30);
  const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
  const chunks = [];
  recorder.ondataavailable = (e) => chunks.push(e.data);
  recorder.start();

  statusDiv.textContent = "動画書き出し中…";
  progressBar.value = 0;

  await new Promise((resolve) => {
    function drawFrame() {
      if ((reverse && currentTime <= 0) || (!reverse && currentTime >= video.duration)) {
        recorder.stop();
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: "video/webm" });
          processedVideoBlob = blob;

          // プレビュー追加
          const outVideo = document.createElement("video");
          outVideo.controls = true;
          outVideo.src = URL.createObjectURL(blob);
          framesDiv.appendChild(outVideo);

          // ダウンロードボタン追加
          const dlBtn = document.createElement("button");
          dlBtn.textContent = "動画ダウンロード";
          dlBtn.className = "primary";
          dlBtn.onclick = () => {
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = "processed_video.webm";
            a.click();
          };
          framesDiv.appendChild(dlBtn);

          progressBar.value = 100;
          statusDiv.textContent = "動画加工完了";
          resolve();
        };
        return;
      }

      video.currentTime = currentTime;
      video.onseeked = () => {
        ctx.drawImage(video, 0, 0);
        const progressPercent = Math.floor(
          ((reverse ? video.duration - currentTime : currentTime) / video.duration) * 100
        );
        progressBar.value = progressPercent;

        currentTime += increment * speed;
        setTimeout(drawFrame, frameDuration / speed);
      };
    }

    drawFrame();
  });
}
