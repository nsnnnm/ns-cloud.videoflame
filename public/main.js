// main.js
import JSZip from "https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js";

const fileInput = document.getElementById("file");
const intervalInput = document.getElementById("interval");
const extractBtn = document.getElementById("extract");
const zipBtn = document.getElementById("zip");
const statusDiv = document.getElementById("status");
const framesDiv = document.getElementById("frames");

let extractedImages = [];

extractBtn.addEventListener("click", () => {
  if (!fileInput.files[0]) {
    alert("動画を選択してください");
    return;
  }
  extractedImages = [];
  framesDiv.innerHTML = "";
  zipBtn.disabled = true;
  statusDiv.textContent = "抽出中...";
  extractFrames(fileInput.files[0], parseFloat(intervalInput.value));
});

zipBtn.addEventListener("click", async () => {
  if (extractedImages.length === 0) return;

  statusDiv.textContent = "ZIP作成中...";
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

// 高速抽出関数
async function extractFrames(file, intervalSec) {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.src = url;
  await video.play();
  video.pause();

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const totalFrames = Math.ceil(video.duration / intervalSec);
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

    currentTime += intervalSec;
    statusDiv.textContent = `抽出中… (${Math.min(
      Math.floor((currentTime / video.duration) * 100),
      100
    )}%)`;

    // Web Worker でなくても非同期にして高速化
    await new Promise((r) => setTimeout(r, 1));
  }

  statusDiv.textContent = "抽出完了";
  zipBtn.disabled = false;
}
