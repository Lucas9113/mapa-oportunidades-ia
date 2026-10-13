const SUPABASE_URL = 'https://ihrzygowptftgaujoarl.supabase.co';
// Clave publishable (pública por diseño; la seguridad la da RLS)
const SUPABASE_KEY = 'sb_publishable_o9a_t7jBctieg9QRIT08aQ_g-8vOLOR';
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const $ = id => document.getElementById(id);
let all = [];

const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

async function loadOpportunities() {
  const { data, error } = await db.from('opportunities').select('*').order('created_at', { ascending: false });
  if (error) { $('list').innerHTML = `<p class="empty">Error al cargar: ${esc(error.message)}</p>`; return; }
  all = data;
  renderStats();
  fillFilters();
  render();
}

function animateTo(id, target) {
  const el = $(id), from = +el.dataset.v || 0;
  el.dataset.v = target;
  const t0 = performance.now(), dur = 600;
  (function step(t) {
    const k = Math.min((t - t0) / dur, 1);
    el.textContent = Math.round(from + (target - from) * k);
    if (k < 1) requestAnimationFrame(step);
  })(t0);
}

// Estadísticas globales (no dependen de los filtros)
function renderStats() {
  const norm = v => v.trim().toLowerCase();
  animateTo('s-opps', all.length);
  animateTo('s-cities', new Set(all.map(o => norm(o.city))).size);
  animateTo('s-countries', new Set(all.map(o => norm(o.country))).size);
  animateTo('s-likes', all.reduce((n, o) => n + o.likes, 0));
}

function fillFilters() {
  [['f-city','city','Todas las ciudades'],['f-country','country','Todos los países'],['f-category','category','Todas las categorías']]
  .forEach(([id, key, label]) => {
    const sel = $(id), cur = sel.value;
    const vals = [...new Set(all.map(o => o[key]))].sort((a, b) => a.localeCompare(b));
    sel.innerHTML = `<option value="">${label}</option>` + vals.map(v => `<option>${esc(v)}</option>`).join('');
    if (vals.includes(cur)) sel.value = cur;
  });
}

function render() {
  const c = $('f-city').value, p = $('f-country').value, k = $('f-category').value;
  const list = all.filter(o => (!c || o.city === c) && (!p || o.country === p) && (!k || o.category === k));
  $('count').textContent = list.length;
  $('list').innerHTML = list.length ? list.map(o => `
    <article class="card">
      <h3>${esc(o.name)}</h3>
      <div class="place">📍 ${esc(o.city)}, ${esc(o.country)}</div>
      <div class="tags"><span class="tag">${esc(o.category)}</span><span class="tag ${esc(o.potential)}">Potencial ${esc(o.potential)}</span></div>
      <p><span class="lbl">Problema</span>${esc(o.problem)}</p>
      <p><span class="lbl">Solución con IA</span>${esc(o.ai_solution)}</p>
      <button class="like" data-id="${o.id}">❤️ ${o.likes}</button>
    </article>`).join('') : '<p class="empty">No hay oportunidades todavía. ¡Publica la primera!</p>';
}

$('list').addEventListener('click', async e => {
  const btn = e.target.closest('.like');
  if (!btn) return;
  btn.disabled = true;
  const { error } = await db.rpc('increment_likes', { opp_id: btn.dataset.id });
  if (error) alert('No se pudo dar like: ' + error.message);
  await loadOpportunities();
});

$('opp-form').addEventListener('submit', async e => {
  e.preventDefault();
  const msg = $('form-msg'), btn = $('submit-btn');
  const row = {};
  ['name','city','country','problem','ai_solution','category','potential'].forEach(f => row[f] = $(f).value.trim());
  btn.disabled = true; msg.className = 'msg'; msg.textContent = 'Publicando...';
  const { error } = await db.from('opportunities').insert(row);
  btn.disabled = false;
  if (error) { msg.className = 'msg error'; msg.textContent = 'Error: ' + error.message; return; }
  e.target.reset();
  msg.textContent = '✅ ¡Publicada!';
  await loadOpportunities();
});

['f-city','f-country','f-category'].forEach(id => $(id).addEventListener('change', render));
loadOpportunities();
