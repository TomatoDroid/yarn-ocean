/*
 * The fish speech layer deliberately lives outside the WebGL scene.  A single
 * DOM node is reused for every greeting, so a click never adds another
 * interactive layer on top of the canvas.
 */

const LINES = Object.freeze({
  '柠檬潜水员': [
    '我刚刚数完三朵泡泡，你要加入吗？',
    '柠檬鳍已充电，向珊瑚湾出发！',
    '嘘，我在和海草交换秘密。',
    '今天的阳光有点像蜂蜜。',
  ],
  '可可泡泡': [
    '我的泡泡闻起来像一口热可可。',
    '慢一点游，甜甜的浪花不会跑。',
    '我把一颗小心愿藏进泡泡里啦。',
    '你看见我的紫色嘟嘴了吗？',
  ],
  '柠檬小舟': [
    '请上船，下一站是亮晶晶的海湾。',
    '我的尾巴今天想顺着潮汐散步。',
    '奶油色的云，适合慢慢游过去。',
    '海面那边有一缕柠檬香。',
  ],
  '莓果汽水': [
    '嘭！我的尾巴又冒出一颗莓果泡泡。',
    '今天的海水，是玫红色的汽水。',
    '跟紧一点，我知道一条卷卷的小路。',
    '紫色和粉色，正在水里跳舞呢。',
  ],
  '橘子扇': [
    '我用小扇子，把橘子香吹给你。',
    '今天也要蓬蓬松松地游一圈。',
    '别急，慢慢扇就能赶上潮流。',
    '薄荷色的眼睛发现一颗新珊瑚！',
  ],
  '蓝色蝴蝶': [
    '我的鳍一展开，海水就变成翅膀。',
    '借我一阵小风，我要去看蓝色远方。',
    '今天的舞步是左一下、右一下。',
    '嘘，我正在把浪花折成蝴蝶。',
  ],
  '蓝莓嘟嘟': [
    '我不说话的时候，也在偷偷笑。',
    '珊瑚刚刚夸我的嘴很有颜色。',
    '来碰个泡泡，咕嘟，快乐加倍！',
    '我的蓝色脑袋装满了海风。',
  ],
  '黑白小鲸': [
    '大尾巴慢慢摆，整片海都在摇篮里。',
    '我带着两道云朵，去找温柔的浪。',
    '小声一点，我正在练习鲸鱼的晚安。',
    '别担心，我的橙色小鳍会领路。',
  ],
  '玫瑰团子': [
    '团一团，再游一圈，今天也要香香的。',
    '我的玫红线圈正在数海底星星。',
    '给你一颗软绵绵的泡泡！',
    '珊瑚说我像一朵会游泳的小花。',
  ],
  '海草精灵': [
    '海草刚刚和我打招呼了。',
    '我的紫色小嘴知道一首潮汐歌。',
    '跟着绿色的光，就能找到安静的角落。',
    '今天的任务：让一片海草开心摇摆。',
  ],
  '樱花小扇': [
    '我把一瓣樱花藏在黑色尾巴后面。',
    '轻轻扇一下，粉色的浪就开花啦。',
    '今天适合和小泡泡并肩散步。',
    '请收下这一点软软的春天。',
  ],
  '橙蓝小箭': [
    '橙色在前，湖蓝色在后，出发！',
    '我找到一条只够小鱼通过的捷径。',
    '短尾巴也能画出很长的浪花。',
    '我的小嘴说：今天一定会遇见好朋友。',
  ],
  '琥珀小梭': [
    '嘘，我正穿过一束琥珀色的光。',
    '细细的身子，刚好能钻进海草的缝隙。',
    '奶油尾巴已经准备好转弯啦。',
    '我们沿着深青色的潮线走走？',
  ],
  '葡萄小游侠': [
    '我的梅紫披风今天特别会游。',
    '薄荷小鳍发现了一个新秘密基地。',
    '蜜桃色的肚皮，装得下整片晚霞。',
    '跟我来，前面有一串安静的泡泡。',
  ],
  '雾银泡泡': [
    '雾里的银光，刚好够照亮一颗贝壳。',
    '我游得慢，是因为在数每一圈绒线。',
    '铜橙色小鳍，今天也在闪闪发光。',
    '把声音放轻，海水正在打盹。',
  ],
  '赤陶团团': [
    '团团出发，去找一块暖暖的海底石。',
    '奶油肚皮说，今天的潮汐很香。',
    '我的紫色小叶子正在练习转圈。',
    '你听，海水给我哼了一首圆舞曲。',
  ],
  '孔雀小扇': [
    '孔雀青一闪，珊瑚橙就跟着亮了。',
    '我的小扇子能把浪花扇成彩虹。',
    '奶白色的尾巴，准备好轻轻转弯。',
    '一起去看那片颜色很安静的海。',
  ],
  '姜饼小扇': [
    '我闻到姜饼色的暖暖潮汐了。',
    '灰青色的肚皮，正好配今天的海水。',
    '奶白小尾巴说：再游一小圈！',
    '我的绒圈软软的，借你靠一下。',
  ],
  '斑点巡游鱼': [
    '大鱼经过时，记得把泡泡让给我。',
    '我在靛蓝色的浪里带队巡游。',
    '背上的小绒点，都是今天的星星。',
    '跟着我的大尾巴，绕一圈再回来。',
  ],
  '金色领航鱼': [
    '金色领航，向最柔软的海湾转弯。',
    '大鳍一摆，远处的海草就亮了。',
    '奶油色的潮汐，今天由我带路。',
    '别走散啦，我在鱼群外侧等你。',
  ],
});

const FALLBACK_LINES = [
  '你好呀，今天的海水软绵绵的。',
  '跟我游一小圈，泡泡会告诉你方向。',
  '嘘，海草正在讲一个很轻的故事。',
];

const FADE_MS = 560;
const MIN_DURATION_MS = 5200;
const DURATION_STEP_MS = 100;
const DURATION_STEPS = 9;
const LAYOUT_REFRESH_MS = 180;
const EDGE_PAD = 12;
const BUBBLE_GAP = 12;

function clockNow() {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
}

function clamp(value, min, max) {
  if (max < min) return min;
  return Math.min(max, Math.max(min, value));
}

function finite(value) {
  return Number.isFinite(value) ? value : 0;
}

function createNoop() {
  return {show() {}, update() {}, clear() {}};
}

/**
 * Creates the reusable speech bubble used by yarn fish.
 *
 * The caller owns the render loop. Call update after camera/controls updates;
 * it uses wall-clock milliseconds so a paused scene still reaches expiry.
 */
export function createFishSpeech({THREE, host, stage, status, reduced} = {}) {
  const doc = stage?.ownerDocument || (typeof document !== 'undefined' ? document : null);
  if (!doc || !stage || !THREE?.Vector3) return createNoop();

  const bubble = doc.createElement('div');
  bubble.className = 'fish-speech';
  bubble.hidden = true;
  bubble.setAttribute('aria-hidden', 'true');
  bubble.dataset.state = 'hidden';
  bubble.style.pointerEvents = 'none';
  bubble.style.touchAction = 'none';

  const nameNode = doc.createElement('span');
  nameNode.className = 'fish-speech__name';
  const lineNode = doc.createElement('span');
  lineNode.className = 'fish-speech__line';
  bubble.append(nameNode, lineNode);
  stage.appendChild(bubble);

  const worldPosition = new THREE.Vector3();
  const worldScale = new THREE.Vector3(1, 1, 1);
  const projectedEdges = {above: new THREE.Vector3(), below: new THREE.Vector3()};
  const cameraPosition = new THREE.Vector3();
  const cameraDirection = new THREE.Vector3();
  let active = null;
  let expiresAt = 0;
  let showCount = 0;
  let lastAnnouncement = '';
  let layout = null;
  let layoutMeasuredAt = -Infinity;
  const phraseCursor = new Map();
  const lastPhrase = new Map();

  const reducedMatches = () => {
    if (reduced && typeof reduced.matches === 'boolean') return reduced.matches;
    return Boolean(reduced);
  };

  function invalidateLayout() {
    layoutMeasuredAt = -Infinity;
  }

  function addTarget(targets, seen, node) {
    if (!node || seen.has(node) || typeof node.getBoundingClientRect !== 'function') return;
    seen.add(node);
    targets.push(node);
  }

  function getBlockers(stageRect) {
    const selectors = [
      ['.header', 'header'],
      ['.control-bar'],
      ['.object-info'],
      ['.bottom', 'footer'],
    ];
    const targets = [];
    const seen = new Set();
    for (const choices of selectors) {
      let node = null;
      for (const selector of choices) {
        node = stage.querySelector?.(selector) || null;
        if (node) break;
      }
      addTarget(targets, seen, node);
    }
    const rects = [];
    for (const target of targets) {
      const rect = target.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) rects.push(relativeRect(rect, stageRect));
    }
    return rects;
  }

  function getLayout(timestamp) {
    if (typeof stage.getBoundingClientRect !== 'function') return null;
    const stageRect = stage.getBoundingClientRect();
    if (!stageRect.width || !stageRect.height) return null;
    const shouldMeasure = !layout || timestamp - layoutMeasuredAt >= LAYOUT_REFRESH_MS;
    if (shouldMeasure) {
      layout = {stageRect, blockers: getBlockers(stageRect)};
      layoutMeasuredAt = timestamp;
    } else {
      // A stage can move while scrolling without changing its size. Keep the
      // cached barrier rectangles but use the current stage origin for maths.
      layout.stageRect = stageRect;
    }
    return layout;
  }

  function chooseLine(name) {
    const options = LINES[name] || FALLBACK_LINES;
    const cursor = phraseCursor.get(name) || 0;
    let index = cursor % options.length;
    const previous = lastPhrase.get(name);
    if (options.length > 1 && options[index] === previous) index = (index + 1) % options.length;
    phraseCursor.set(name, index + 1);
    lastPhrase.set(name, options[index]);
    return options[index];
  }

  function hideBubble(forget) {
    bubble.hidden = true;
    bubble.setAttribute('aria-hidden', 'true');
    bubble.dataset.state = 'hidden';
    bubble.classList.remove('is-fading');
    if (forget) {
      active = null;
      expiresAt = 0;
    }
  }

  function showBubble() {
    bubble.hidden = false;
    bubble.setAttribute('aria-hidden', 'false');
  }

  function fishIsVisible(fish) {
    if (!fish || fish.visible === false) return false;
    for (let node = fish.parent; node; node = node.parent) {
      if (node.visible === false) return false;
    }
    const swim = fish.userData?.swim;
    return swim?.mode !== 'waiting' && swim?.waiting !== true;
  }

  function projectFishEdges(fish, camera) {
    if (!fishIsVisible(fish) || !camera) return null;
    if (typeof fish.updateMatrixWorld === 'function') fish.updateMatrixWorld(true);
    if (typeof fish.getWorldPosition === 'function') fish.getWorldPosition(worldPosition);
    else if (fish.position?.copy) worldPosition.copy(fish.position);
    else return null;

    let scaleY = 1;
    if (typeof fish.getWorldScale === 'function') {
      fish.getWorldScale(worldScale);
      scaleY = Math.abs(worldScale.y) || Math.abs(worldScale.x) || 1;
    } else if (fish.scale) {
      scaleY = Math.abs(fish.scale.y || fish.scale.x || 1);
    }
    const ry = Number(fish.userData?.ry);
    const edge = Math.max(.06, Math.abs(Number.isFinite(ry) ? ry : .24) * scaleY);

    if (typeof camera.updateMatrixWorld === 'function') camera.updateMatrixWorld(true);
    if (typeof camera.getWorldPosition === 'function') camera.getWorldPosition(cameraPosition);
    else if (camera.position?.copy) cameraPosition.copy(camera.position);
    if (typeof camera.getWorldDirection === 'function') {
      camera.getWorldDirection(cameraDirection);
      if (worldPosition.clone().sub(cameraPosition).dot(cameraDirection) <= 0) return null;
    }

    const visibleEdges = {};
    for (const [placement, direction] of [['above', 1], ['below', -1]]) {
      const point = projectedEdges[placement].copy(worldPosition);
      point.y += edge * direction;
      point.project(camera);
      // Each placement uses its own visible edge, including at viewport borders.
      if (![point.x, point.y, point.z].every(Number.isFinite)) continue;
      if (Math.abs(point.x) > 1 || Math.abs(point.y) > 1 || Math.abs(point.z) > 1) continue;
      visibleEdges[placement] = point;
    }
    return visibleEdges.above || visibleEdges.below ? visibleEdges : null;
  }

  function relativeRect(rect, stageRect) {
    return {
      left: rect.left - stageRect.left,
      right: rect.right - stageRect.left,
      top: rect.top - stageRect.top,
      bottom: rect.bottom - stageRect.top,
    };
  }

  function overlaps(a, b, padding = 0) {
    return a.left < b.right + padding && a.right > b.left - padding && a.top < b.bottom + padding && a.bottom > b.top - padding;
  }

  function placeBubble(edges, timestamp) {
    const currentLayout = getLayout(timestamp);
    if (!currentLayout) return false;
    const {stageRect} = currentLayout;
    const viewportRect = typeof host?.getBoundingClientRect === 'function'
      ? host.getBoundingClientRect()
      : stageRect;
    if (!viewportRect.width || !viewportRect.height) return false;

    const anchors = {};
    for (const [placement, point] of Object.entries(edges)) {
      anchors[placement] = {
        x: viewportRect.left + (point.x + 1) * .5 * viewportRect.width - stageRect.left,
        y: viewportRect.top + (1 - point.y) * .5 * viewportRect.height - stageRect.top,
      };
    }
    const measured = bubble.getBoundingClientRect();
    const width = Math.max(160, measured.width || bubble.offsetWidth || 220);
    const height = Math.max(58, measured.height || bubble.offsetHeight || 78);
    const pad = Math.max(EDGE_PAD, Math.min(22, stageRect.width * .04));
    const maxY = stageRect.height - pad - height;
    if (maxY < pad) return false;

    const blockers = currentLayout.blockers;
    const preferred = active?.preferBelow && anchors.below ? 'below' : anchors.above ? 'above' : 'below';
    const naturalTop = placement => anchors[placement].y + (placement === 'above' ? -BUBBLE_GAP - height : BUBBLE_GAP);
    const preferredTop = naturalTop(preferred);
    const candidate = (y, placement) => {
      const anchor = anchors[placement];
      if (!anchor) return null;
      const left = clamp(anchor.x, pad + width * .5, stageRect.width - pad - width * .5);
      const top = clamp(y, pad, maxY);
      // Keep the tail close to the fish. If every free band is far away, the
      // bubble would look detached and is better hidden until the fish moves.
      const gap = placement === 'above' ? anchor.y - (top + height) : top - anchor.y;
      if (gap < BUBBLE_GAP * .5 || gap > Math.max(120, height * 1.8)) return null;
      const box = {left: left - width * .5, right: left + width * .5, top, bottom: top + height};
      if (blockers.some(rect => overlaps(box, rect, 8))) return null;
      return {top, left, anchorX: anchor.x, placement, gap, distance: Math.abs(top - preferredTop)};
    };

    const candidates = Object.keys(anchors).map(placement => candidate(naturalTop(placement), placement)).filter(Boolean);

    // If a fish is beside a responsive header/control block, look for the
    // closest free horizontal band instead of letting the bubble overlap it.
    if (!candidates.length) {
      const step = Math.max(6, Math.min(14, height * .2));
      for (let top = pad; top <= maxY; top += step) {
        for (const placement of Object.keys(anchors)) {
          const item = candidate(top, placement);
          if (item) candidates.push(item);
        }
      }
    }
    if (!candidates.length) return false;
    candidates.sort((a, b) => a.distance - b.distance);
    const chosen = candidates[0];
    bubble.style.left = `${Math.round(chosen.left)}px`;
    bubble.style.top = `${Math.round(chosen.top)}px`;
    const tailX = clamp(chosen.anchorX - chosen.left + width * .5, 18, width - 18);
    bubble.style.setProperty('--tail-x', `${Math.round(tailX)}px`);
    bubble.dataset.placement = chosen.placement;
    return true;
  }

  function update(camera, now = clockNow()) {
    if (!active) return;
    const timestamp = Number.isFinite(now) ? now : clockNow();
    if (timestamp >= expiresAt) {
      hideBubble(true);
      return;
    }

    const reducedMotion = reducedMatches();
    const remaining = expiresAt - timestamp;
    if (reducedMotion || remaining > FADE_MS) {
      bubble.dataset.state = 'visible';
      bubble.classList.remove('is-fading');
    } else {
      bubble.dataset.state = 'fading';
      bubble.classList.add('is-fading');
    }

    const edges = projectFishEdges(active.fish, camera);
    if (!edges || !placeBubble(edges, timestamp)) {
      hideBubble(false);
      return;
    }
    showBubble();
  }

  function show(fish, message) {
    if (!fish || !fishIsVisible(fish)) {
      clear();
      return;
    }
    const name = String(fish.userData?.name || '小鱼');
    const line = message || chooseLine(name);
    const announcement = `${name}：${line}`;
    const startedAt = clockNow();
    const duration = MIN_DURATION_MS + (showCount++ % DURATION_STEPS) * DURATION_STEP_MS;
    // Feeding replies sit below when space permits, leaving rising hearts clear.
    active = {fish, name, line, preferBelow: Boolean(message)};
    expiresAt = startedAt + duration;
    lastAnnouncement = announcement;
    nameNode.textContent = name;
    lineNode.textContent = line;
    bubble.dataset.state = 'visible';
    bubble.classList.remove('is-fading');
    bubble.setAttribute('aria-label', announcement);
    showBubble();
    if (status) status.textContent = announcement;
  }

  function clear() {
    if (status && lastAnnouncement && status.textContent === lastAnnouncement) status.textContent = '';
    lastAnnouncement = '';
    hideBubble(true);
  }

  const resizeObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(invalidateLayout) : null;
  resizeObserver?.observe(stage);
  resizeObserver?.observe(host || stage);
  for (const selector of ['.header', '.control-bar', '.bottom', 'header', 'footer']) {
    const node = stage.querySelector?.(selector);
    if (node) resizeObserver?.observe(node);
  }
  const win = doc.defaultView;
  win?.addEventListener('resize', invalidateLayout, {passive: true});
  reduced?.addEventListener?.('change', invalidateLayout);

  return {show, update, clear};
}
