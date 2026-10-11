// This module only enhances the pre-rendered HTML catalog; it never imports 3D.
const requests = new WeakMap();
const kindLabels = {round: '圆脸小鱼', fan: '扇形小鱼', long: '长身小鱼', whale: '长身小鱼'};

export function loadFallbackCatalog(root, fetchCatalog = globalThis.fetch) {
  if (requests.has(root)) return requests.get(root);
  const request = (async () => {
    const response = await fetchCatalog(new URL('./assets/fish-catalog.json', import.meta.url));
    if (!response.ok) throw new Error(`Fish catalog unavailable (${response.status})`);
    const catalog = await response.json();
    const cards = [...root.querySelectorAll('.fallback-card')];
    if (!Array.isArray(catalog) || catalog.length !== 20 || cards.length !== catalog.length
      || catalog.some(fish => !fish || typeof fish.name !== 'string' || !fish.name
        || typeof fish.description !== 'string' || typeof fish.kind !== 'string'
        || !/^assets\/fish-\d{2}\.png$/.test(fish.image))) {
      throw new Error('Fish catalog does not match the static gallery');
    }
    catalog.forEach((fish, index) => {
      const card = cards[index];
      card.querySelector('h3').textContent = fish.name;
      card.querySelector('.fallback-card-description').textContent = fish.description;
      // Keep the authored large-fish distinction if the catalog stores shape only.
      if (!card.querySelector('.fallback-card-kind').textContent.includes('大型')) {
        card.querySelector('.fallback-card-kind').textContent = kindLabels[fish.kind] || fish.kind;
      }
      card.querySelector('img').src = fish.image;
    });
    root.dataset.catalog = 'ready';
    return catalog;
  })();
  requests.set(root, request);
  return request;
}
