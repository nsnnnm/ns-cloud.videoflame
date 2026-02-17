const fileInput = document.getElementById("file");
const intervalInput = document.getElementById("interval");
const extractBtn = document.getElementById("extract");
const framesDiv = document.getElementById("frames");

const video = document.createElement("video");
video.muted = true;

const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d");

extractBtn.onclick = async () => {
  const file = fileInput.files[0];
  if (!file) {
    alert("動画を選択してください");
    return;
  }

  framesDiv.innerHTML = "処理中…";

  video.src = URL.createObjectURL(file);
  await video.play();
  video.pause();

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const interval = parseFloat(intervalInput.value);
  framesDiv.innerHTML = "";

  for (let t = 0; t < video.duration; t += interval) {
    video.currentTime = t;
    await new Promise(resolve => video.onseeked = resolve);

    ctx.drawImage(video, 0, 0);
    const img = document.createElement("img");
    img.src = canvas.toDataURL("image/png");
    img.title = `t=${t.toFixed(2)}s`;
    framesDiv.appendChild(img);
  }
};
