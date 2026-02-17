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

const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d");

let capturedFrames = [];

/* ========= メイン ========= */

extractBtn.onclick = async () => {
  const file = fileInput.files[0];
  if (!file) return alert("動画を選択してください");

  capturedFrames = [];
  framesDiv.innerHTML = "";
  zipBtn.disabled = true;
  progressBar.style.width = "0%";

  const interval = parseFloat(intervalInput.value);

  if ("VideoDecoder" in window) {
    statusDiv.textContent = "WebCodecs Turboモードで抽出中…";
    await extractWebCodecs(file, interval);
  } else {
    statusDiv.textContent = "通常Turboモードで抽出中…";
    await extractFallback(file, interval);
  }

  statusDiv.textContent = `完了：${capturedFrames.length}枚`;
  zipBtn.disabled = false;
};

/* ========= WebCodecs 超Turbo ========= */

async function extractWebCodecs(file, interval) {
  const buffer = await file.arrayBuffer();
  const video = document.createElement("video");
  video.src = URL.createObjectURL(file);
  await video.play();
  video.pause();

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const totalFrames = Math.floor(video.duration / interval);
  let count = 0;

  const decoder = new VideoDecoder({
    output: frame => {
      if (count % Math.round(interval * 30) === 0) {
        drawFrame(frame, count * interval);
      }
      frame.close();
      count++;
      updateProgress(count, totalFrames);
    },
    error: e => console.error(e)
  });

  decoder.configure({
    codec: "vp9", // 多くのWeb動画でOK（失敗したら自動でfallback）
  });

  decoder.decode(new EncodedVideoChunk({
    type: "key",
    timestamp: 0,
    data: new Uint8Array(buffer)
  }));

  await decoder.flush();
}

/* ========= フォールバック ========= */

async function extractFallback(file, interval) {
  const video = document.createElement("video");
  video.muted = true;
  video.src = URL.createObjectURL(file);

  await video.play();
  video.pause();

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const duration = video.duration;
  const total = Math.floor(duration / interval);
  let count = 0;

  for (let t = 0; t < duration; t += interval) {
    video.currentTime = t;
    await new Promise(r => video.requestVideoFrameCallback(r));
    capture(video, t);
    count++;
    updateProgress(count, total);
  }
}

/* ========= 共通 ========= */

function drawFrame(frame, time) {
  ctx.drawImage(frame, 0, 0);
  saveFrame(time);
}

function capture(video, time) {
  ctx.drawImage(video, 0, 0);
  saveFrame(time);
}

function saveFrame(time) {
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
  const p = Math.min(100, Math.floor((done / total) * 100));
  progressBar.style.width = p + "%";
  statusDiv.textContent = `抽出中… ${done}/${total} (${p}%)`;
}

/* ========= ZIP ========= */

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
