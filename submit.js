function val(form, name){
  const el = form.elements[name];
  if(!el) return '';
  return (el.value || '').toString().trim();
}

function buildBody(form){
  const lines = [];
  lines.push("Nieuwe woningplaatsing via FairHuur");
  lines.push("");
  lines.push("Titel: " + val(form,'title'));
  lines.push("Plaats: " + val(form,'city'));
  lines.push("Type: " + val(form,'type'));
  lines.push("Prijs p/m: " + val(form,'price'));
  const sqm = val(form,'sqm'); if(sqm) lines.push("m²: " + sqm);
  const beds = val(form,'bedrooms'); if(beds) lines.push("Slaapkamers: " + beds);
  lines.push("");
  lines.push("Beschrijving:");
  lines.push(val(form,'description'));
  lines.push("");
  const email = val(form,'contactEmail'); if(email) lines.push("Contact e-mail: " + email);
  const phone = val(form,'contactPhone'); if(phone) lines.push("Contact telefoon: " + phone);
  const img = val(form,'imageUrl'); if(img) lines.push("Foto link: " + img);
  lines.push("");
  lines.push("Let op: Toon contactgegevens direct op de listing.");
  return lines.join("\n");
}

function encodeMailto(s){
  return encodeURIComponent(s).replace(/%20/g, '+');
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('placeForm');
  if(!form) return;

  const ok = document.getElementById('submitOk');
  const err = document.getElementById('submitErr');
  const fb = document.getElementById('fallbackText');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if(ok) ok.hidden = true;
    if(err) err.hidden = true;

    const subject = "Woning plaatsen: " + val(form,'city') + " - " + val(form,'title');
    const body = buildBody(form);

    const mailto = "mailto:plaatsing@fairhuur.ai"
      + "?subject=" + encodeMailto(subject)
      + "&body=" + encodeMailto(body);

    // Try open mail client
    try{
      window.location.href = mailto;
      if(ok) ok.hidden = false;
    }catch(ex){
      if(fb) fb.textContent = body;
      if(err) err.hidden = false;
    }
  });
});
