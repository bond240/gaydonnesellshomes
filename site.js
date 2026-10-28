// ---------- Shared behavior ----------
const nav = document.querySelector('.nav');
const links = document.querySelector('.nav__links');
const toggle = document.querySelector('.nav__toggle');

if (nav && !nav.classList.contains('nav--solid')) {
  const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 60);
  onScroll(); window.addEventListener('scroll', onScroll, { passive: true });
}
if (toggle && links) {
  toggle.addEventListener('click', () => {
    const open = links.classList.toggle('is-open');
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', open);
  });
  links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    links.classList.remove('is-open'); nav.classList.remove('is-open');
  }));
}

function showToast(msg) {
  let t = document.querySelector('.toast');
  if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('is-on');
  clearTimeout(t._timer); t._timer = setTimeout(() => t.classList.remove('is-on'), 2200);
}
document.querySelectorAll('[data-share]').forEach(btn => {
  btn.addEventListener('click', async () => {
    const data = { title: document.title, text: btn.dataset.share || document.title, url: location.href };
    try {
      if (navigator.share) { await navigator.share(data); return; }
      await navigator.clipboard.writeText(location.href);
      showToast('Link copied');
    } catch (e) { /* cancelled */ }
  });
});

// ---------- Photo lightbox ----------
// Photos come from the hidden <template id="photo-list"> list: <li data-full data-thumb data-alt>
const tpl = document.getElementById('photo-list');
if (tpl) {
  const photos = [...tpl.content.querySelectorAll('li')].map(li => ({ full: li.dataset.full, thumb: li.dataset.thumb, alt: li.dataset.alt || '' }));
  const lb = document.createElement('div');
  lb.className = 'lightbox';
  lb.innerHTML = `
    <div class="lightbox__top"><span class="lightbox__count"></span>
      <button class="lightbox__close" aria-label="Close"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>
    <div class="lightbox__stage">
      <button class="lightbox__arrow lightbox__arrow--prev" aria-label="Previous"><svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg></button>
      <img alt="">
      <button class="lightbox__arrow lightbox__arrow--next" aria-label="Next"><svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg></button>
      <div class="lightbox__caption"></div>
    </div>
    <div class="lightbox__thumbs"></div>`;
  document.body.appendChild(lb);
  const img = lb.querySelector('.lightbox__stage img'), cap = lb.querySelector('.lightbox__caption'), count = lb.querySelector('.lightbox__count'), strip = lb.querySelector('.lightbox__thumbs');
  photos.forEach((p, i) => { const b = document.createElement('button'); b.innerHTML = `<img src="${p.thumb}" alt="" loading="lazy">`; b.addEventListener('click', () => show(i)); strip.appendChild(b); });
  const thumbs = [...strip.children];
  let idx = 0;
  function show(i) {
    idx = (i + photos.length) % photos.length;
    img.src = photos[idx].full; img.alt = photos[idx].alt; cap.textContent = photos[idx].alt;
    count.textContent = (idx + 1) + ' / ' + photos.length;
    thumbs.forEach(t => t.classList.remove('is-active')); thumbs[idx].classList.add('is-active');
    thumbs[idx].scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    // preload neighbours
    [idx + 1, idx - 1].forEach(j => { const p = new Image(); p.src = photos[(j + photos.length) % photos.length].full; });
  }
  function open(i) { show(i); lb.classList.add('is-open'); document.body.classList.add('no-scroll'); }
  function close() { lb.classList.remove('is-open'); document.body.classList.remove('no-scroll'); }
  lb.querySelector('.lightbox__close').addEventListener('click', close);
  lb.querySelector('.lightbox__arrow--prev').addEventListener('click', () => show(idx - 1));
  lb.querySelector('.lightbox__arrow--next').addEventListener('click', () => show(idx + 1));
  lb.addEventListener('click', e => { if (e.target === lb.querySelector('.lightbox__stage')) close(); });
  document.addEventListener('keydown', e => {
    if (!lb.classList.contains('is-open')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowRight') show(idx + 1);
    if (e.key === 'ArrowLeft') show(idx - 1);
  });
  let x0 = null;
  img.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
  img.addEventListener('touchend', e => { if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) > 40) show(idx + (dx < 0 ? 1 : -1)); });
  document.querySelectorAll('[data-open-photo]').forEach(el => el.addEventListener('click', () => open(parseInt(el.dataset.openPhoto, 10) || 0)));
}
