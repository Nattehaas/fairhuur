async function loadListings(){
  const res = await fetch('/data/listings.json', { cache: 'no-store' });
  if(!res.ok) throw new Error('Kon listings.json niet laden');
  const data = await res.json();
  return (data.listings || []).filter(x => x && (x.active ?? true));
}

function normalize(s){
  return (s || '').toString().trim().toLowerCase();
}

function money(n){
  if(n === null || n === undefined || n === '') return '';
  const x = Number(n);
  if(Number.isNaN(x)) return '';
  return '€' + x.toLocaleString('nl-NL');
}

function sameDayISO(isoA, isoB){
  if(!isoA || !isoB) return false;
  return isoA.slice(0,10) === isoB.slice(0,10);
}

function calcStats(listings){
  const live = listings.length;
  const todayISO = new Date().toISOString();
  const today = listings.filter(l => sameDayISO(l.postedAt || '', todayISO)).length;

  const prices = listings.map(l => Number(l.price)).filter(p => Number.isFinite(p) && p > 0);
  const avg = prices.length ? Math.round(prices.reduce((a,b)=>a+b,0) / prices.length) : null;
  return { live, today, avg };
}

function escapeHtml(str){
  return (str || '').toString()
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'","&#039;");
}

function listingCard(l){
  const img = l.imageUrl ? `<img src="${l.imageUrl}" alt="Foto van ${escapeHtml(l.title || 'woning')}" loading="lazy">` : '';
  const type = l.type || 'Woning';
  const city = l.city || '';
  const sqm = l.sqm ? `${l.sqm} m²` : '';
  const beds = (Number.isFinite(Number(l.bedrooms)) && Number(l.bedrooms) > 0) ? `${l.bedrooms} slk` : '';
  const metaBits = [city, sqm, beds].filter(Boolean);

  return `
    <article class="listing-card">
      <a href="/woning.html?id=${encodeURIComponent(l.id)}" class="listing-media" aria-label="Open ${escapeHtml(l.title)}">
        ${img}
        <span class="pill">${escapeHtml(type)}</span>
      </a>
      <div class="listing-body">
        <div class="listing-title">${escapeHtml(l.title || 'Onbekende titel')}</div>
        <div class="listing-meta">
          ${metaBits.map((m,i)=>`${i?'<span class="dot" aria-hidden="true"></span>':''}<span>${escapeHtml(m)}</span>`).join('')}
        </div>
        <div class="muted tiny">${escapeHtml((l.short || '').slice(0,120))}</div>
      </div>
      <div class="listing-footer">
        <div class="price">${money(l.price)}<span class="muted tiny"> p/m</span></div>
        <div class="footer-actions">
          <a class="small-link" href="/woning.html?id=${encodeURIComponent(l.id)}">Details</a>
        </div>
      </div>
    </article>
  `;
}

function getVal(id){
  const el = document.getElementById(id);
  return el ? el.value : '';
}

function applyFiltersAndSort(listings){
  const q = normalize(getVal('q'));
  const city = normalize(getVal('city'));
  const type = normalize(getVal('type'));
  const minPrice = Number(getVal('minPrice') || '');
  const maxPrice = Number(getVal('maxPrice') || '');
  const minSqm = Number(getVal('minSqm') || '');
  const minBeds = Number(getVal('minBeds') || '');
  const sort = getVal('sort') || 'newest';

  let filtered = listings.filter(l => {
    const hay = normalize([l.title, l.city, l.type, l.short, l.description].join(' '));
    if(q && !hay.includes(q)) return false;
    if(city && normalize(l.city) !== city) return false;
    if(type && normalize(l.type) !== type) return false;

    const p = Number(l.price);
    if(Number.isFinite(minPrice) && minPrice > 0 && Number.isFinite(p) && p < minPrice) return false;
    if(Number.isFinite(maxPrice) && maxPrice > 0 && Number.isFinite(p) && p > maxPrice) return false;

    const s = Number(l.sqm);
    if(Number.isFinite(minSqm) && minSqm > 0 && Number.isFinite(s) && s < minSqm) return false;

    const b = Number(l.bedrooms);
    if(Number.isFinite(minBeds) && minBeds > 0 && Number.isFinite(b) && b < minBeds) return false;

    return true;
  });

  const byDate = (a,b) => (new Date(b.postedAt || 0)) - (new Date(a.postedAt || 0));
  const byPriceAsc = (a,b) => (Number(a.price)||0) - (Number(b.price)||0);
  const byPriceDesc = (a,b) => (Number(b.price)||0) - (Number(a.price)||0);
  const bySqmDesc = (a,b) => (Number(b.sqm)||0) - (Number(a.sqm)||0);

  if(sort === 'price_asc') filtered.sort(byPriceAsc);
  else if(sort === 'price_desc') filtered.sort(byPriceDesc);
  else if(sort === 'sqm_desc') filtered.sort(bySqmDesc);
  else filtered.sort(byDate);

  return filtered;
}

function render(listings){
  const el = document.getElementById('listings');
  const empty = document.getElementById('emptyState');
  const count = document.getElementById('resultCount');

  if(!el) return;

  el.innerHTML = listings.map(listingCard).join('');
  if(count) count.textContent = `${listings.length} woningen`;
  if(empty) empty.hidden = listings.length !== 0;
}

function wireFilters(all){
  const ids = ['q','city','type','minPrice','maxPrice','minSqm','minBeds','sort'];
  const inputs = ids.map(id => document.getElementById(id)).filter(Boolean);

  const rerender = () => render(applyFiltersAndSort(all));
  inputs.forEach(i => i.addEventListener('input', rerender));
  inputs.forEach(i => i.addEventListener('change', rerender));

  const reset = document.getElementById('resetFilters');
  if(reset){
    reset.addEventListener('click', () => {
      inputs.forEach(i => { i.value = ''; });
      const sortEl = document.getElementById('sort');
      if(sortEl) sortEl.value = 'newest';
      render(all.slice().sort((a,b)=> (new Date(b.postedAt||0)) - (new Date(a.postedAt||0))));
    });
  }
}

function renderStats(all){
  const s = calcStats(all);
  const live = document.getElementById('statLive');
  const today = document.getElementById('statToday');
  const avg = document.getElementById('statAvg');
  if(live) live.textContent = String(s.live);
  if(today) today.textContent = String(s.today);
  if(avg) avg.textContent = s.avg ? ('€' + s.avg.toLocaleString('nl-NL')) : '-';
}

(async function init(){
  try{
    const all = await loadListings();
    const sorted = all.slice().sort((a,b)=> (new Date(b.postedAt||0)) - (new Date(a.postedAt||0)));
    renderStats(sorted);
    render(sorted);
    wireFilters(sorted);
  }catch(e){
    const el = document.getElementById('listings');
    if(el){
      el.innerHTML = `<div class="empty"><h3>Kon woningen niet laden</h3><p class="muted">${escapeHtml(e.message || String(e))}</p></div>`;
    }
  }
})();