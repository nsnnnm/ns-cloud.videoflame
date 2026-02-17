import init, { fast_grayscale } from "./wasm/img_wasm.js";

const fileInput = document.getElementById("file");
const extractBtn = document.getElementById("extract");
const zipBtn = document.getElementById("zip");
const intervalInput = document.getElementById("interval");
const statusDiv = document.getElementById("status");
const framesDiv = document.getElementById("frames");
const progressBar = document.getElementById("progress");

const video = document.createElement("video");
video.muted = true;
video.playsInline = true;

const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d");

let frames = [];
let zip;
let wasmReady = false;

/* =========================
   WASM 初期化
========================= */
(async () => {
  try {
    await init();
    wasmReady = true;
    console.log("WASM ready");
  } catch (e) {
    console.warn("WASM init failed, fallback to JS", e);
  }
})();

/* =========================
   ファイル読み込み
========================= */
fileInput.onchange = () => {
  const file = fileInput.files[0];
  if (!file) return;

  video.src = URL.createObjectURL(file);

  statusDiv.textContent = "動画を読み込み中…";

  video.onloadedmetadata = () => {
    statusDiv.textContent =
      `読み込み完了（${video.videoWidth}x${video.videoHeight}, ${video.duration.toFixed(2)}秒）`;
  };
};

/* =========================
   フレーム抽出
========================= */
extractBtn.onclick = async () => {
  if (!video.src) {
    alert("動画を選択してください");
    return;
  }

  const interval = parseFloat(intervalInput.value);
  if (interval <= 0) {
    alert("抽出間隔が不正です");
    return;
  }

  frames = [];
  framesDiv.innerHTML = "";
  progressBar.style.width = "0%";
  zipBtn.disabled = true;

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const total = Math.floor(video.duration / interval);
  let count = 0;

  statusDiv.textContent = "抽出中…";

  for (let t = 0; t < video.duration; t += interval) {
    video.currentTime = t;

    await new Promise(resolve => {
      video.onseeked = resolve;
    });

    ctx.drawImage(video, 0, 0);

    // WASM 高速処理（有効なら）
    if (wasmReady) {
      const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
      fast_grayscale(img.data);
      ctx.putImageData(img, 0, 0);
    }

    // Blobで高速生成
    const blob = await new Promise(resolve =>
      canvas.toBlob(resolve, "image/png")
    );

    frames.push(blob);

    // プレビュー（軽量）
    if (count % 5 === 0) {
      const imgEl = document.createElement("img");
      imgEl.src = URL.createObjectURL(blob);
      framesDiv.appendChild(imgEl);
    }

    count++;
    const p = Math.floor((count / total) * 100);
    progressBar.style.width = p + "%";
    statusDiv.textContent = `抽出中… ${count}/${total} (${p}%)`;
  }

  statusDiv.textContent = "抽出完了！";
  zipBtn.disabled = false;
};

/* =========================
   ZIP ダウンロード
========================= */
zipBtn.onclick = async () => {
  zipBtn.disabled = true;
  statusDiv.textContent = "ZIP生成中…";

  zip = new JSZip();
  const folder = zip.folder("frames");

  frames.forEach((blob, i) => {
    folder.file(`frame_${String(i).padStart(4, "0")}.png`, blob);
  });

  const content = await zip.generateAsync({ type: "blob" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(content);
  a.download = "frames.zip";
  a.click();

  statusDiv.textContent = "ZIPダウンロード完了";
};
