import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {loadFallbackCatalog} from '../dist/ocean-fallback.js';

const catalog = JSON.parse(await readFile(new URL('../dist/assets/fish-catalog.json', import.meta.url), 'utf8'));
const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');

function staticGallery() {
  const cards = Array.from({length: 20}, (_, index) => {
    const fields = {
      h3: {textContent: '原有名字'}, '.fallback-card-description': {textContent: '原有描述'},
      '.fallback-card-kind': {textContent: index > 17 ? '大型游鱼' : '长身小鱼'},
      img: {src: `assets/fish-${String(index + 1).padStart(2, '0')}.png`},
    };
    return {querySelector: selector => fields[selector]};
  });
  return {cards, dataset: {}, querySelectorAll: () => cards};
}

test('the initial HTML contains the complete static gallery and absolute social preview metadata', () => {
  assert.equal((html.match(/class="fallback-card" tabindex="0"/g) || []).length, 20);
  for (const fish of catalog) {
    assert.ok(html.includes(`src="${fish.image}"`), `${fish.name} is present before JavaScript runs`);
    assert.ok(html.includes(`<h3>${fish.name}</h3>`));
    assert.ok(html.includes(fish.description));
  }
  assert.match(html, /id="retry-scene"[^>]+href="\.\/"/);
  assert.match(html, /<noscript>[\s\S]*ocean-fallback\[hidden\]/);
  const metadata = Object.fromEntries([...html.matchAll(/<meta (?:property|name)="([^"]+)" content="([^"]*)"/g)].map(match => [match[1], match[2]]));
  assert.equal(metadata['og:type'], 'website');
  assert.equal(metadata['og:url'], 'https://tomatodroid.github.io/yarn-ocean/');
  assert.equal(metadata['og:image'], `${metadata['og:url']}assets/ocean-cover.jpg`);
  assert.equal(metadata['og:image:width'], '1200');
  assert.equal(metadata['og:image:height'], '630');
  assert.equal(metadata['twitter:card'], 'summary_large_image');
  assert.equal(metadata['twitter:image'], metadata['og:image']);
  for (const key of ['description', 'og:title', 'og:description', 'twitter:title', 'twitter:description']) {
    assert.match(metadata[key], /喂/);
    assert.match(metadata[key], /爱心/);
  }
  assert.ok(metadata['og:image:alt'] && metadata['twitter:image:alt']);
  assert.match(html, /rel="canonical" href="https:\/\/tomatodroid\.github\.io\/yarn-ocean\/"/);
});

test('catalog enhancement reuses the authored cards and makes only one request per gallery', async () => {
  const root = staticGallery();
  const originalCards = [...root.cards];
  let requests = 0;
  const fetchCatalog = async url => {
    requests++;
    assert.ok(url.pathname.endsWith('/assets/fish-catalog.json'));
    return {ok: true, json: async () => catalog};
  };
  await Promise.all([loadFallbackCatalog(root, fetchCatalog), loadFallbackCatalog(root, fetchCatalog)]);
  assert.equal(requests, 1);
  assert.deepEqual(root.cards, originalCards);
  assert.equal(root.cards[0].querySelector('h3').textContent, catalog[0].name);
  assert.equal(root.cards[19].querySelector('.fallback-card-kind').textContent, '大型游鱼');
  assert.equal(root.dataset.catalog, 'ready');
});

test('failed or malformed catalog responses leave the built-in gallery intact', async () => {
  for (const response of [{ok: false, status: 503}, {ok: true, json: async () => catalog.slice(1)}]) {
    const root = staticGallery();
    await assert.rejects(loadFallbackCatalog(root, async () => response));
    assert.equal(root.cards.length, 20);
    assert.equal(root.cards[0].querySelector('h3').textContent, '原有名字');
    assert.equal(root.cards[0].querySelector('img').src, 'assets/fish-01.png');
  }
});
