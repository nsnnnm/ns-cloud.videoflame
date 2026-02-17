const fileInput = document.getElementById("file");
const intervalInput = document.getElementById("interval");
const extractBtn = document.getElementById("extract");
const zipBtn = document.getElementById("zip");
const framesDiv = document.getElementById("frames");
const statusDiv = document.getElementById("status");

const video = document.createElement("video");
video.muted = true;
video.playsInline = true;

const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d");

let capturedFrames = [];

extractBtn.onclick = async () => {
  const file = fileInput.files[0];
  if (!file) {
    alert("動画を選択してください");
    return;
  }

  capturedFrames = [];
  zipBtn.disabled = true;
  framesDiv.innerHTML = "";
  statusDiv.textContent = "準備中…";

  video.src = URL.createObjectURL(file);
  await video.play();
  video.pause();

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const interval = parseFloat(intervalInput.value);
  const duration = video.duration;

  // 高速化対応判定
  if ("requestVideoFrameCallback" in HTMLVideoElement.prototype) {
    statusDiv.textContent = "高速モードで抽出中…";
    await extractFast(interval, duration);
  } else {
    statusDiv.textContent = "互換モードで抽出中…";
    await extractNormal(interval, duration);
  }

  statusDiv.textContent = `完了：${capturedFrames.length}枚`;
  zipBtn.disabled = false;
};

// 高速版（対応ブラウザ）
async function extractFast(interval, duration) {
  for (let t = 0; t < duration; t += interval) {
    video.currentTime = t;
    await new Promise(resolve =>
      video.requestVideoFrameCallback(() => resolve())
    );
    capture(t);
  }
}

// 通常版（フォールバック）
async function extractNormal(interval, duration) {
  for (let t = 0; t < duration; t += interval) {
    video.currentTime = t;
    await new Promise(resolve => video.onseeked = resolve);
    capture(t);
  }
}

// フレーム取得
function capture(time) {
  ctx.drawImage(video, 0, 0);
  const dataURL = canvas.toDataURL("image/png");

  capturedFrames.push({ time, dataURL });

  const img = document.createElement("img");
  img.src = dataURL;
  img.title = `t=${time.toFixed(2)}s`;
  framesDiv.appendChild(img);
}

// ZIP一括DL
zipBtn.onclick = async () => {
  const zip = new JSZip();

  capturedFrames.forEach((f, i) => {
    const base64 = f.dataURL.split(",")[1];
    zip.file(`frame_${i}_${f.time.toFixed(2)}s.png`, base64, {
      base64: true
    });
  });

  statusDiv.textContent = "ZIP生成中…";

  const blob = await zip.generateAsync({ type: "blob" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "frames.zip";
  a.click();

  statusDiv.textContent = "ZIPダウンロード完了";
};
