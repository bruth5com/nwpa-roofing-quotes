/* First-party campaign attribution; no visitor contact fields sent to Analytics. */
(() => {
  const key = 'ttd_campaign';
  const fields = ['utm_source','utm_medium','utm_campaign','utm_content'];
  let campaign = {};
  try { campaign = JSON.parse(sessionStorage.getItem(key) || '{}'); } catch (_) {}
  const query = new URLSearchParams(location.search);
  if (query.has('utm_source')) {
    campaign = {};
    fields.forEach(name => { const value=query.get(name); if(value && /^[a-zA-Z0-9_.-]{1,100}$/.test(value)) campaign[name]=value; });
    try { sessionStorage.setItem(key,JSON.stringify(campaign)); } catch (_) {}
  }
  document.querySelectorAll('form[data-thank-you]').forEach(form => {
    fields.forEach(name => { if(!campaign[name]) return; const input=document.createElement('input'); input.type='hidden'; input.name=name; input.value=campaign[name]; form.appendChild(input); });
    const page=document.createElement('input'); page.type='hidden'; page.name='source_page'; page.value=location.origin+location.pathname; form.appendChild(page);
  });
  document.querySelectorAll('a[href^="tel:"]').forEach(link => link.addEventListener('click', () => {
    if(typeof gtag === 'function') gtag('event','click_to_call',{site:location.hostname});
  }));
  // A reload or direct thank-you visit is not a new inquiry.
  if (/\/thank-you(?:\.html)?\/?$/.test(location.pathname)) {
    let confirmed=false;
    try { confirmed=sessionStorage.getItem('ttd_lead_confirmed')==='1'; sessionStorage.removeItem('ttd_lead_confirmed'); } catch (_) {}
    if(confirmed && typeof gtag === 'function') gtag('event','generate_lead',{lead_source:'website_form',site:location.hostname});
  }
})();
