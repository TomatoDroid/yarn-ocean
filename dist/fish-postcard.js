// A knitted postcard: one photo of the fish in its own sea, framed on
// stockinette "paper" with a running stitch, its name and one of its lines.
// Everything is drawn locally; nothing is uploaded.

export const CARD = Object.freeze({width: 1080, height: 1440, margin: 72, photo: 936});
const INK = '#143f4b', SOFT_INK = '#46707a', PAPER = '#f1e7cd', THREAD = '#f7f0dc';
const SERIF = '"Songti SC","STSong","Noto Serif SC","Source Han Serif SC",serif';
const SANS = '-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif';

// Greedy wrap that works for Chinese (no spaces) and Latin text alike.
export function wrapText(measure, text, maxWidth, maxLines) {
  const lines = [];
  let line = '';
  for (const char of Array.from(String(text))) {
    if (line && measure(line + char) > maxWidth) {
      lines.push(line);
      line = char.trim() ? char : '';
      if (lines.length === maxLines) break;
    } else {
      line += char;
    }
  }
  if (lines.length < maxLines && line) lines.push(line);
  if (lines.length === maxLines && lines.join('').length < Array.from(String(text)).length) {
    let last = lines[maxLines - 1];
    while (last && measure(last + '…') > maxWidth) last = Array.from(last).slice(0, -1).join('');
    lines[maxLines - 1] = last + '…';
  }
  return lines;
}

export function postcardFileName(name, date = new Date()) {
  const safe = Array.from(String(name ?? '')).filter(c => !/[\\/:*?"<>|\p{Cc}\p{Cf}]/u.test(c)).join('').trim() || '毛线鱼';
  const day = [date.getFullYear(), date.getMonth() + 1, date.getDate()].map(n => String(n).padStart(2, '0')).join('');
  return `${safe}-线织海洋明信片-${day}.png`;
}

// Photograph the fish with the live renderer: same lights, fog, tone mapping
// and yarn as on screen. The canvas is resized and restored inside one task,
// so the visitor never sees the intermediate frame.
export function photographFish({THREE, renderer, scene, viewCamera, fish, others = [], size = CARD.photo}) {
  const lens = new THREE.PerspectiveCamera(30, 1, .1, 180);
  fish.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(fish);
  const center = box.getCenter(new THREE.Vector3()), extent = box.getSize(new THREE.Vector3());
  const radius = Math.max(extent.x, extent.y, extent.z) * .5;
  // Round fish face the camera; long and fan fish are shown side-on, like the close-up.
  const facing = new THREE.Vector3(.18, .16, 1).applyQuaternion(fish.quaternion).normalize();
  const distance = radius / Math.tan(THREE.MathUtils.degToRad(15)) * 1.32;
  lens.position.copy(center).addScaledVector(facing, distance);
  lens.lookAt(center.clone().add(new THREE.Vector3(0, -radius * .08, 0)));
  lens.updateMatrixWorld();

  const hidden = others.filter(o => o !== fish && o.visible);
  const wasVisible = fish.visible;
  hidden.forEach(o => { o.visible = false; });
  fish.visible = true;
  const oldSize = renderer.getSize(new THREE.Vector2()), oldRatio = renderer.getPixelRatio();
  const photo = document.createElement('canvas');
  photo.width = photo.height = size;
  try {
    renderer.setPixelRatio(1);
    renderer.setSize(size, size, false);
    renderer.render(scene, lens);
    photo.getContext('2d').drawImage(renderer.domElement, 0, 0, size, size);
  } finally {
    hidden.forEach(o => { o.visible = true; });
    fish.visible = wasVisible;
    renderer.setPixelRatio(oldRatio);
    renderer.setSize(oldSize.x, oldSize.y, false);
    renderer.render(scene, viewCamera);
  }
  return photo;
}

function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Rows of little "v" stitches, the face of stockinette knitting.
function knitPaper(ctx, width, height) {
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, width, height);
  ctx.lineCap = 'round';
  ctx.lineWidth = 2.2;
  const w = 18, h = 16;
  for (let row = 0, y = 4; y < height; row++, y += h) {
    for (let x = (row % 2) * (w / 2) - w; x < width + w; x += w) {
      ctx.strokeStyle = (row + Math.round(x / w)) % 7 ? 'rgba(122,98,58,.075)' : 'rgba(122,98,58,.11)';
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + w * .2, y + h * .75, x + w * .5, y + h * .85);
      ctx.quadraticCurveTo(x + w * .8, y + h * .75, x + w, y);
      ctx.stroke();
    }
  }
}

function runningStitch(ctx, draw, color, width, dash = [20, 13]) {
  ctx.save();
  ctx.setLineDash(dash);
  ctx.lineCap = 'round';
  ctx.lineWidth = width;
  ctx.strokeStyle = 'rgba(40,30,15,.18)';
  ctx.translate(1.5, 2.5);
  draw();
  ctx.stroke();
  ctx.translate(-1.5, -2.5);
  ctx.strokeStyle = color;
  draw();
  ctx.stroke();
  ctx.restore();
}

export function composePostcard({photo, name, kindLabel, line, colors, url, to = '', date = new Date()}) {
  const {width, height, margin, photo: size} = CARD;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  knitPaper(ctx, width, height);

  // Photo window with a soft shadow, then a cream running stitch just inside it.
  ctx.save();
  ctx.shadowColor = 'rgba(20,50,60,.28)';
  ctx.shadowBlur = 34;
  ctx.shadowOffsetY = 12;
  roundedRect(ctx, margin, margin, size, size, 34);
  ctx.fillStyle = '#0b3c50';
  ctx.fill();
  ctx.restore();
  ctx.save();
  roundedRect(ctx, margin, margin, size, size, 34);
  ctx.clip();
  ctx.drawImage(photo, margin, margin, size, size);
  ctx.restore();
  runningStitch(ctx, () => roundedRect(ctx, margin + 22, margin + 22, size - 44, size - 44, 20), THREAD, 5);

  // Postmark-style eyebrow in the photo corner.
  ctx.save();
  ctx.font = `600 22px ${SANS}`;
  ctx.fillStyle = 'rgba(247,240,220,.92)';
  ctx.textBaseline = 'top';
  ctx.fillText('线织海洋 · THE SOFT AQUARIUM', margin + 50, margin + 52);
  ctx.restore();

  let y = margin + size + 70;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = INK;
  ctx.font = `400 80px ${SERIF}`;
  const nameWidth = ctx.measureText(name).width;
  ctx.fillText(name, margin, y + 20);

  // Yarn swatches beside the name, like the dots on a ball band.
  let dotX = margin + nameWidth + 40;
  for (const color of colors) {
    ctx.beginPath();
    ctx.arc(dotX, y - 2, 13, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(20,63,75,.25)';
    ctx.stroke();
    dotX += 36;
  }

  y += 72;
  ctx.font = `500 26px ${SANS}`;
  ctx.fillStyle = SOFT_INK;
  ctx.fillText(kindLabel, margin, y);
  // The recipient sits right-aligned like an address, so the layout never shifts.
  if (to) {
    ctx.save();
    ctx.textAlign = 'right';
    ctx.font = `400 34px ${SERIF}`;
    ctx.fillStyle = INK;
    const toWidth = ctx.measureText(to).width;
    ctx.fillText(to, width - margin, y + 2);
    ctx.font = `500 24px ${SANS}`;
    ctx.fillStyle = SOFT_INK;
    ctx.fillText('送给', width - margin - toWidth - 14, y);
    ctx.restore();
  }

  y += 70;
  ctx.font = `400 38px ${SERIF}`;
  ctx.fillStyle = INK;
  const quote = wrapText(t => ctx.measureText(t).width, `「${line}」`, size, 2);
  quote.forEach((text, i) => ctx.fillText(text, margin, y + i * 56));

  const footer = height - margin + 4;
  runningStitch(ctx, () => { ctx.beginPath(); ctx.moveTo(margin, footer - 58); ctx.lineTo(width - margin, footer - 58); }, SOFT_INK, 3.5, [16, 12]);
  ctx.font = `500 24px ${SANS}`;
  ctx.fillStyle = SOFT_INK;
  ctx.fillText(url, margin, footer);
  const stamp = [date.getFullYear(), date.getMonth() + 1, date.getDate()].map((n, i) => i ? String(n).padStart(2, '0') : n).join('.');
  ctx.textAlign = 'right';
  ctx.fillText(stamp, width - margin, footer);
  return canvas;
}

export function postcardBlob(canvas) {
  return new Promise((resolve, reject) => canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('Postcard encoding failed'))), 'image/png'));
}

// One dialog serves every entry point: it photographs the fish once, then
// recomposes the card as the recipient changes.
export function createPostcardDialog({THREE, renderer, scene, getViewCamera, getOthers, cleanName}) {
  const dialog = document.querySelector('#postcard');
  const image = document.querySelector('#postcard-image');
  const toInput = document.querySelector('#postcard-to');
  const save = document.querySelector('#postcard-save');
  const share = document.querySelector('#postcard-share');
  const status = document.querySelector('#postcard-status');
  let photo = null, details = null, file = null, objectUrl = '', version = 0, timer = 0;
  const WEAVING = '正在织明信片…';
  const url = (location.host + location.pathname).replace(/\/(index\.html)?$/, '');

  async function recompose() {
    const ticket = ++version;
    const to = cleanName(toInput.value, '');
    const canvas = composePostcard({...details, photo, url, to});
    const blob = await postcardBlob(canvas);
    if (ticket !== version) return;
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = URL.createObjectURL(blob);
    file = new File([blob], postcardFileName(details.name), {type: 'image/png'});
    image.src = objectUrl;
    image.alt = `${details.name}的毛线明信片${to ? `，送给${to}` : ''}`;
    save.href = objectUrl;
    save.download = file.name;
    share.hidden = !(navigator.canShare?.({files: [file]}));
    if (status.textContent === WEAVING) status.textContent = '';
  }

  function open(fish, {kindLabel, line}) {
    const d = fish.userData;
    details = {name: d.name, kindLabel, line, colors: d.colors};
    photo = photographFish({THREE, renderer, scene, viewCamera: getViewCamera(), fish, others: getOthers()});
    // Encoding a full-size PNG can take a moment on phones.
    status.textContent = WEAVING;
    image.removeAttribute('src');
    save.removeAttribute('href');
    share.hidden = true;
    dialog.showModal();
    recompose().catch(() => { status.textContent = '明信片没能生成，请稍后再试。'; });
  }

  toInput.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => recompose().catch(() => {}), 160);
  });
  // Enter would otherwise do nothing useful; keep it from closing anything.
  toInput.addEventListener('keydown', event => { if (event.key === 'Enter') event.preventDefault(); });
  share.addEventListener('click', async () => {
    try {
      await navigator.share({files: [file], title: `${details.name} · 线织海洋`});
      status.textContent = '已打开分享。';
    } catch (error) {
      if (error?.name !== 'AbortError') status.textContent = '没能分享，可以先保存图片再发送。';
    }
  });
  save.addEventListener('click', () => { status.textContent = '图片已开始保存。'; });
  document.querySelector('#postcard-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => {
    clearTimeout(timer);
    version++;
    photo = null;
    file = null;
    image.removeAttribute('src');
    save.removeAttribute('href');
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = '';
  });
  return {open, isOpen: () => dialog.open};
}
