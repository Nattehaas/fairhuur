
async function loadListings(){
  const res = await fetch('/data/listings.json', { cache: 'no-store' });
  if(!res.ok) throw new Error('Kon listings.json niet laden');
  const data = await res.json();
  return (data.listings || []).filter(x => x && (x.active ?? true));
}
function money(n){
  if(n === null || n === undefined || n === '') return '';
  const x = Number(n);
  if(Number.isNaN(x)) return '';
  return '€' + x.toLocaleString('nl-NL');
}
function escapeHtml(str){
  return (str || '').toString()
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'","&#039;");
}
function qs(name){
  const u = new URL(window.location.href);
  return u.searchParams.get(name);
}
function contactBlock(l){
  const parts = [];
  if(l.contactEmail){
    parts.push(`<div class="mono">Email: <a href="mailto:${encodeURIComponent(l.contactEmail)}">${escapeHtml(l.contactEmail)}</a></div>`);
  }
  if(l.contactPhone){
    const tel = l.contactPhone.replace(/\s+/g,'');
    parts.push(`<div class="mono">Telefoon: <a href="tel:${escapeHtml(tel)}">${escapeHtml(l.contactPhone)}</a></div>`);
  }
  if(l.contactUrl){
    parts.push(`<div class="mono">Link: <a href="${escapeHtml(l.contactUrl)}" target="_blank" rel="noopener">Open</a></div>`);
  }
  if(!parts.length){
    parts.push(`<p class="muted">Geen contactgegevens beschikbaar.</p>`);
  }
  return parts.join('<div style="height:10px"></div>');
}

function detailHtml(l){
  const img = l.imageUrl ? `<div class="woning-photo"><img src="${l.imageUrl}" alt="Foto van ${escapeHtml(l.title || 'woning')}" loading="lazy"></div>` : `<div class="woning-photo"></div>`;
  const desc = escapeHtml(l.description || l.short || '').replaceAll('\n','<br>');
  const posted = l.postedAt ? new Date(l.postedAt).toLocaleDateString('nl-NL') : '';
  document.title = `${l.title || 'Woning'} - FairHuur`;

  return `
    <div class="woning-grid">
      <div>
        ${img}
        <div class="card" style="margin-top:14px">
          <div class="card-body">
            <h1 style="font-size:30px;margin:0">${escapeHtml(l.title || 'Woning')}</h1>
            <p class="muted" style="margin:8px 0 0">${escapeHtml(l.city || '')}${posted ? ' • geplaatst ' + posted : ''}</p>
            <div style="margin-top:14px;color:rgba(231,233,238,.90)">${desc || '<span class="muted">Geen beschrijving.</span>'}</div>
          </div>
        </div>
      </div>

      <div class="woning-panel">
        <div class="card">
          <div class="card-body">
            <h2>Overzicht</h2>
            <table class="table">
              <tr><td>Prijs</td><td><strong>${money(l.price)}</strong> p/m</td></tr>
              <tr><td>Type</td><td>${escapeHtml(l.type || '')}</td></tr>
              <tr><td>Oppervlakte</td><td>${l.sqm ? escapeHtml(String(l.sqm)) + ' m²' : '-'}</td></tr>
              <tr><td>Slaapkamers</td><td>${l.bedrooms ? escapeHtml(String(l.bedrooms)) : '-'}</td></tr>
              <tr><td>Borg</td><td>${l.deposit ? money(l.deposit) : '-'}</td></tr>
              <tr><td>Beschikbaar</td><td>${escapeHtml(l.availableFrom || '-') }</td></tr>
            </table>

            <div class="callout">
              <div class="callout-title">Contact</div>
              <div class="callout-body">${contactBlock(l)}</div>
            </div>

            <div class="hero-actions" style="margin-top:14px">
              <a class="btn btn-primary" href="/submit.html">Plaats ook een woning</a>
              <a class="btn btn-ghost" href="/#woningen">Overzicht</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

(async function init(){
  const id = qs('id');
  const host = document.getElementById('woning');
  if(!host) return;

  try{
    const all = await loadListings();
    const found = all.find(x => String(x.id) === String(id)) || null;
    if(!found){
      host.innerHTML = `
        <div class="empty">
          <h3>Woning niet gevonden</h3>
          <p class="muted">Check de link of ga terug naar het overzicht.</p>
          <div class="hero-actions" style="margin-top:14px">
            <a class="btn btn-primary" href="/#woningen">Terug naar woningen</a>
          </div>
        </div>
      `;
      return;
    }
    host.innerHTML = detailHtml(found);
  }catch(e){
    host.innerHTML = `<div class="empty"><h3>Kon woning niet laden</h3><p class="muted">${escapeHtml(e.message || String(e))}</p></div>`;
  }
})();
