const stage = document.querySelector('#stage');
const viewport = document.querySelector('#viewport');
const fallback = document.querySelector('#ocean-fallback');
const errorMessage = document.querySelector('#error');
const help = document.querySelector('#help');
const toggle = document.querySelector('#help-toggle');
let catalogPromise;

toggle.addEventListener('click', () => {
  help.hidden = !help.hidden;
  toggle.setAttribute('aria-expanded', String(!help.hidden));
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !help.hidden) {
    help.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    toggle.focus();
  }
});
document.querySelector('#retry-scene').addEventListener('click', event => {
  event.preventDefault();
  location.reload();
});

// The cover and cards already exist in HTML. Even this optional import failing
// cannot prevent a useful fallback or its ordinary reload link from appearing.
export function showSceneFallback(error) {
  const focusWasInScene = stage.contains(document.activeElement) && !fallback.contains(document.activeElement);
  document.querySelector('#loading')?.remove();
  help.hidden = true;
  toggle.setAttribute('aria-expanded', 'false');
  stage.classList.add('scene-unavailable');
  stage.dataset.sceneMode = 'static';
  viewport.inert = true;
  fallback.hidden = false;
  errorMessage.hidden = false;
  const skip = document.querySelector('.skip-link');
  skip.href = '#ocean-fallback';
  skip.textContent = '跳到鱼群图鉴';
  if (focusWasInScene) fallback.focus({preventScroll: true});
  if (error) console.error('Ocean unavailable', error);
  catalogPromise ??= import('./ocean-fallback.js?v=20261011-experience')
    .then(module => module.loadFallbackCatalog(fallback))
    .catch(catalogError => { console.warn('Using the built-in fish catalog', catalogError); });
}

export function hideSceneFallback() {
  const focusWasInFallback = fallback.contains(document.activeElement);
  stage.classList.remove('scene-unavailable');
  stage.dataset.sceneMode = 'interactive';
  fallback.hidden = true;
  errorMessage.hidden = true;
  viewport.inert = false;
  const skip = document.querySelector('.skip-link');
  skip.href = '#viewport';
  skip.textContent = '跳到互动海洋';
  if (focusWasInFallback) viewport.focus({preventScroll: true});
}

requestAnimationFrame(() => requestAnimationFrame(() => {
  import('./scene.js?v=20261011-experience').catch(showSceneFallback);
}));
