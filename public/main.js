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

// ZIP DL（フレーム抽出用）
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

// ======================
// フレーム抽出関数
// ======================
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

    // ステータス & 進捗バー
    const progressPercent = Math.min(
      Math.floor((currentTime / video.duration) * 100),
      100
    );
    statusDiv.textContent = `抽出中… (${progressPercent}%)`;
    progressBar.value = progressPercent;

    currentTime += intervalSec;
    await new Promise((r) => setTimeout(r, 1));
  }

  statusDiv.textContent = "抽出完了";
  progressBar.value = 100;
  zipBtn.disabled = false;
}

// ======================
// 動画加工関数（逆再生/倍速）
// ======================
async function processVideo(file, speed = 1, reverse = false) {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.src = url;
  await video.play();
  video.pause();

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const interval = 1 / 30; // 30fps
  const frames = [];
  // 全フレーム取得
  for (let t = 0; t < video.duration; t += interval) {
    video.currentTime = t;
    await new Promise((r) => (video.onseeked = r));
    const frameCanvas = document.createElement("canvas");
    frameCanvas.width = video.videoWidth;
    frameCanvas.height = video.videoHeight;
    frameCanvas.getContext("2d").drawImage(video, 0, 0);
    frames.push(frameCanvas);
    // 進捗表示
    progressBar.value = Math.min(Math.floor((t / video.duration) * 100), 100);
    statusDiv.textContent = `フレーム読み込み中… (${progressBar.value}%)`;
    await new Promise((r) => setTimeout(r, 1));
  }

  // 逆再生ならフレームを逆順に
  if (reverse) frames.reverse();

  // MediaRecorderでリアルタイム書き出し
  const stream = canvas.captureStream(30);
  const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
  const chunks = [];
  recorder.ondataavailable = (e) => chunks.push(e.data);
  recorder.start();

  for (let i = 0; i < frames.length; i++) {
    ctx.drawImage(frames[i], 0, 0);
    await new Promise((r) => setTimeout(r, (1000 / 30) / speed)); // speed反映
    progressBar.value = Math.floor((i / frames.length) * 100);
    statusDiv.textContent = `動画書き出し中… (${progressBar.value}%)`;
  }

  recorder.stop();
  processedVideoBlob = await new Promise((resolve) =>
    recorder.onstop = () => resolve(new Blob(chunks, { type: "video/webm" }))
  );

  // プレビュー
  const outVideo = document.createElement("video");
  outVideo.controls = true;
  outVideo.src = URL.createObjectURL(processedVideoBlob);
  framesDiv.appendChild(outVideo);

  progressBar.value = 100;
  statusDiv.textContent = "動画加工完了";
}
