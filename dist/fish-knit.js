import {YARNS, KINDS, PARTS, cleanName, randomDesign} from './fish-design.js?v=20261015-friends';

// The knitting panel only edits a plain design object. The scene owns the
// 3D fish, so every change goes through onChange and is rebuilt there.
const REBUILD_DELAY_MS = 90;
const SIGNATURE_KEY = 'yarn-ocean:signature';

export function createKnitPanel({stage, onOpen, onClose, onChange, onRemove, getShareUrl, onPostcard}) {
  const panel = document.querySelector('#knit');
  const toggle = document.querySelector('#knit-toggle');
  const form = document.querySelector('#knit-form');
  const nameInput = document.querySelector('#knit-name');
  const kinds = document.querySelector('#knit-kinds');
  const colors = document.querySelector('#knit-colors');
  const status = document.querySelector('#knit-status');
  const link = document.querySelector('#knit-link');
  const fromInput = document.querySelector('#knit-from');
  const reply = document.querySelector('#knit-reply');
  const help = document.querySelector('#help'), helpToggle = document.querySelector('#help-toggle');
  let design = null, timer = 0, composing = false, replyTo = '';

  for (const [kind, {label}] of Object.entries(KINDS)) {
    const option = document.createElement('label');
    option.className = 'knit-segment';
    const input = Object.assign(document.createElement('input'), {type: 'radio', name: 'kind', value: kind});
    const text = document.createElement('span');
    text.textContent = label.replace('小鱼', '');
    option.append(input, text);
    kinds.append(option);
  }
  const yarnNames = {};
  for (const {key, label} of PARTS) {
    const group = document.createElement('fieldset');
    group.className = 'knit-swatches';
    const legend = document.createElement('legend');
    legend.className = 'knit-label';
    const current = document.createElement('span');
    current.className = 'knit-current';
    legend.append(label, current);
    yarnNames[key] = current;
    const row = document.createElement('div');
    row.className = 'knit-swatch-row';
    YARNS.forEach((yarn, index) => {
      const option = document.createElement('label');
      option.className = 'knit-swatch';
      option.title = yarn.name;
      const input = Object.assign(document.createElement('input'), {type: 'radio', name: key, value: String(index)});
      input.setAttribute('aria-label', yarn.name);
      const dot = document.createElement('i');
      dot.style.setProperty('--yarn', yarn.hex);
      option.append(input, dot);
      row.append(option);
    });
    group.append(legend, row);
    colors.append(group);
  }

  function render() {
    form.elements.kind.value = design.kind;
    for (const {key} of PARTS) {
      form.elements[key].value = String(design[key]);
      yarnNames[key].textContent = YARNS[design[key]].name;
    }
    if (document.activeElement !== nameInput) nameInput.value = design.name;
  }
  function resetShare() {
    status.textContent = '';
    link.hidden = true;
  }
  function flush() {
    if (!timer) return;
    clearTimeout(timer);
    timer = 0;
    onChange({...design});
  }
  // Holding an arrow key across swatches would otherwise reknit on every step.
  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(() => { timer = 0; onChange({...design}); }, REBUILD_DELAY_MS);
  }

  form.addEventListener('change', event => {
    const {name, value} = event.target;
    if (name === 'kind') design.kind = value;
    else if (PARTS.some(part => part.key === name)) design[name] = Number(value);
    else return;
    render();
    resetShare();
    schedule();
  });
  function rename() {
    const next = cleanName(nameInput.value);
    if (next === design.name) return;
    design.name = next;
    resetShare();
    clearTimeout(timer);
    timer = 0;
    onChange({...design});
  }
  nameInput.addEventListener('compositionstart', () => { composing = true; });
  nameInput.addEventListener('compositionend', () => { composing = false; rename(); });
  nameInput.addEventListener('input', () => { if (!composing) rename(); });
  nameInput.addEventListener('blur', () => { nameInput.value = design.name; });

  // The signature is the knitter's name, written into share links only.
  function signature() {
    return cleanName(fromInput.value, '');
  }
  fromInput.addEventListener('change', () => {
    fromInput.value = signature();
    try { localStorage.setItem(SIGNATURE_KEY, fromInput.value); } catch {}
    resetShare();
  });

  document.querySelector('#knit-random').addEventListener('click', () => {
    design = {...randomDesign(Math.random, design.name), kind: design.kind};
    render();
    resetShare();
    schedule();
  });
  // Flush first, so the postcard shows the colours that were just picked.
  document.querySelector('#knit-postcard').addEventListener('click', () => {
    flush();
    onPostcard?.();
  });
  document.querySelector('#knit-remove').addEventListener('click', () => {
    clearTimeout(timer);
    timer = 0;
    close();
    onRemove();
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    flush();
    const from = signature();
    try { localStorage.setItem(SIGNATURE_KEY, from); } catch {}
    const url = getShareUrl({...design}, from);
    const title = `${design.name} · 线织海洋`;
    const to = replyTo ? `发给${replyTo}` : '发给朋友';
    // Phones get the native share sheet; elsewhere the link goes to the clipboard.
    if (navigator.share && matchMedia('(pointer: coarse)').matches) {
      try {
        const text = replyTo ? `我织了一条「${design.name}」回赠给${replyTo}，点开看它游过来。` : `我织了一条「${design.name}」，点开看它游过来。`;
        await navigator.share({title, text, url});
        status.textContent = `已打开分享。${replyTo || '朋友'}点开链接，鱼就会游过去。`;
        return;
      } catch (error) {
        if (error?.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      link.hidden = true;
      status.textContent = `链接已复制。${to}，鱼就会游过去。`;
    } catch {
      link.value = url;
      link.hidden = false;
      link.focus();
      link.select();
      link.scrollLeft = 0;
      status.textContent = '没能自动复制，请手动复制下面的链接。';
    }
  });

  function isOpen() {
    return !panel.hidden;
  }
  // Opening from a friend's fish turns the share into a reply to its knitter.
  function open({replyTo: to = ''} = {}) {
    replyTo = cleanName(to, '');
    reply.textContent = replyTo ? `回赠给${replyTo}：挑好颜色，再复制链接发回去。` : '';
    reply.hidden = !replyTo;
    if (isOpen()) return;
    if (help && !help.hidden) {
      help.hidden = true;
      helpToggle?.setAttribute('aria-expanded', 'false');
    }
    // Show the panel first, so the scene can frame the fish beside it.
    panel.hidden = false;
    stage.dataset.knitting = 'true';
    toggle.setAttribute('aria-expanded', 'true');
    design = onOpen();
    try { fromInput.value = cleanName(localStorage.getItem(SIGNATURE_KEY), ''); } catch {}
    render();
    resetShare();
    panel.focus({preventScroll: true});
  }
  function close() {
    if (!isOpen()) return;
    flush();
    const focusWasInside = panel.contains(document.activeElement);
    panel.hidden = true;
    delete stage.dataset.knitting;
    replyTo = '';
    reply.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    onClose?.();
    if (focusWasInside) toggle.focus({preventScroll: true});
  }

  toggle.addEventListener('click', () => (isOpen() ? close() : open()));
  helpToggle?.addEventListener('click', () => { if (help && !help.hidden) close(); });
  document.querySelector('#knit-close').addEventListener('click', close);
  panel.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      close();
    }
  });
  return {
    open, close, isOpen,
    enable() { toggle.disabled = false; },
  };
}
