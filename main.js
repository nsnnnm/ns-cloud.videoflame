const fileInput = document.getElementById("file");
const intervalInput = document.getElementById("interval");
const extractBtn = document.getElementById("extract");
const zipBtn = document.getElementById("zip");
const framesDiv = document.getElementById("frames");
const statusDiv = document.getElementById("status");
const progressBar = document.getElementById("progress");

const preview = document.getElementById("preview");
const previewImg = document.getElementById("previewImg");
preview.onclick = () => preview.classList.add("hidden");

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
  framesDiv.innerHTML = "";
  zipBtn.disabled = true;
  progressBar.style.width = "0%";
  statusDiv.textContent = "準備中…";

  video.src = URL.createObjectURL(file);
  await video.play();
  video.pause();

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const interval = parseFloat(intervalInput.value);
  const duration = video.duration;

  if ("requestVideoFrameCallback" in HTMLVideoElement.prototype) {
    statusDiv.textContent = "Turboモードで抽出中…";
    await extractTurbo(interval, duration);
  } else {
    statusDiv.textContent = "互換モードで抽出中…";
    await extractNormal(interval, duration);
  }

  statusDiv.textContent = `完了：${capturedFrames.length}枚`;
  zipBtn.disabled = false;
};

async function extractTurbo(interval, duration) {
  const total = Math.floor(duration / interval);
  let count = 0;

  for (let t = 0; t < duration; t += interval) {
    video.currentTime = t;

    await new Promise(resolve =>
      video.requestVideoFrameCallback(() => resolve())
    );

    capture(t);

    count++;
    updateProgress(count, total);
  }
}

async function extractNormal(interval, duration) {
  const total = Math.floor(duration / interval);
  let count = 0;

  for (let t = 0; t < duration; t += interval) {
    video.currentTime = t;
    await new Promise(resolve => video.onseeked = resolve);

    capture(t);

    count++;
    updateProgress(count, total);
  }
}

function capture(time) {
  ctx.drawImage(video, 0, 0);
  const dataURL = canvas.toDataURL("image/png");

  capturedFrames.push({ time, dataURL });

  const img = document.createElement("img");
  img.src = dataURL;
  img.title = `t=${time.toFixed(2)}s`;
  img.onclick = () => {
    previewImg.src = dataURL;
    preview.classList.remove("hidden");
  };
  framesDiv.appendChild(img);
}

function updateProgress(done, total) {
  const p = Math.floor((done / total) * 100);
  progressBar.style.width = p + "%";
  statusDiv.textContent = `抽出中… ${done}/${total} (${p}%)`;
}

zipBtn.onclick = async () => {
  const zip = new JSZip();

  capturedFrames.forEach((f, i) => {
    const base64 = f.dataURL.split(",")[1];
    zip.file(`frame_${i}_${f.time.toFixed(2)}s.png`, base64, { base64: true });
  });

  statusDiv.textContent = "ZIP生成中…";

  const blob = await zip.generateAsync({ type: "blob" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "frames.zip";
  a.click();

  statusDiv.textContent = "ZIPダウンロード完了";
};
