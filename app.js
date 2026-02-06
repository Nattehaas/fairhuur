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

function listingCard(l){
  const img = l.imageUrl ? `<img src="${l.imageUrl}" alt="Foto van ${escapeHtml(l.title || 'woning')}" loading="lazy">` : '';
  const type = l.type || 'Woning';
  const city = l.city || '';
  const sqm = l.sqm ? `${l.sqm} m²` : '';
  const beds = l.bedrooms ? `${l.bedrooms} slk` : '';
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

function escapeHtml(str){
  return (str || '').toString()
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'","&#039;");
}

function applyFilters(listings){
  const q = normalize(document.getElementById('q')?.value);
  const city = normalize(document.getElementById('city')?.value);
  const type = normalize(document.getElementById('type')?.value);
  const maxPrice = Number(document.getElementById('maxPrice')?.value || '');
  const minSqm = Number(document.getElementById('minSqm')?.value || '');

  return listings.filter(l => {
    const hay = normalize([l.title, l.city, l.type, l.short, l.description].join(' '));
    if(q && !hay.includes(q)) return false;
    if(city && normalize(l.city) !== city) return false;
    if(type && normalize(l.type) !== type) return false;
    if(Number.isFinite(maxPrice) && maxPrice > 0 && Number(l.price) > maxPrice) return false;
    if(Number.isFinite(minSqm) && minSqm > 0 && Number(l.sqm) < minSqm) return false;
    return true;
  });
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
  const inputs = ['q','city','type','maxPrice','minSqm'].map(id => document.getElementById(id)).filter(Boolean);
  inputs.forEach(i => i.addEventListener('input', () => render(applyFilters(all))));
  const reset = document.getElementById('resetFilters');
  if(reset){
    reset.addEventListener('click', () => {
      inputs.forEach(i => { i.value = ''; });
      render(all);
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
    renderStats(all);
    render(all);
    wireFilters(all);
  }catch(e){
    const el = document.getElementById('listings');
    if(el){
      el.innerHTML = `<div class="empty"><h3>Kon woningen niet laden</h3><p class="muted">${escapeHtml(e.message || String(e))}</p></div>`;
    }
  }
})();
