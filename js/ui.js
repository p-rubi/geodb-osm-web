// ui.js — el panell de l'esquerra.
//
// Aquí hi ha tot el que toca el DOM del panell: omplir els selectors, activar
// i desactivar controls, i connectar cada control amb la funció que li toca.
// Cap altre mòdul escolta esdeveniments del panell.
//
// La regla que ho ordena tot: el panell no dibuixa res ell mateix. Quan
// l'usuari canvia alguna cosa, s'actualitza l'estat (state.js) i es demana a
// les capes que es refresquin. Així només hi ha un camí possible:
//
//   control del panell → state → refresh de les capes
//
// Això és el que fa que canviar de categoria, marcar una casella o moure el
// llindar no es trepitgin entre ells.

import { $, esc, fmtM } from './utils.js';
import { CATEGORIES, subsOf, label } from './taxonomy.js';
import { state, isAnalysable } from './state.js';
import { map } from './map.js';
import { refreshPois } from './layer-pois.js';
import { refreshAccessibility } from './layer-accessibility.js';
import { refreshInfluence } from './layer-influence.js';
import { initBasemapToggles } from './layer-basemap.js';
import { setMode, clearQuery, results, highlightRank, getLastClick } from './query-modes.js';
import { rerunQuery } from './query-run.js';

/** Missatge del peu del panell. Amb warn=true surt en ambre. */
export const setStatus = (txt, warn = false) => {
  $('status').textContent = txt;
  $('status').classList.toggle('warn', warn);
};

/**
 * Avís quan l'API no respon.
 *
 * PER QUÈ EXISTEIX: el visor està fet perquè la cartografia base i
 * l'accessibilitat funcionin sense servidor (són PMTiles). Si Supabase està
 * pausat o la clau és incorrecta, només cauen les capes vives, i cal dir-ho
 * en comptes de deixar l'usuari mirant un mapa que sembla incomplet.
 */
export const LIVE_DOWN = 'Capes vives no disponibles — es mostra només la base cartogràfica';

/** Omple el selector de categories amb el recompte de punts de cadascuna. */
function fillCategories() {
  $('sel-cat').innerHTML = `<option value="">Tots els POIs</option>` +
    CATEGORIES.map(c => `<option value="${esc(c.code)}">${esc(c.label)} (${c.n})</option>`).join('');
}

/** Omple el selector de subcategories amb les de la categoria triada. */
function fillSubcategories() {
  const subs = state.cat ? subsOf(state.cat) : [];
  $('sel-sub').disabled = !state.cat;
  $('sel-sub').innerHTML = `<option value="">${state.cat ? 'Totes' : '—'}</option>` +
    subs.map(s => `<option value="${esc(s.code)}">${esc(s.label)} (${s.n})</option>`).join('');
}

/**
 * Posa al dia tot el que depèn de la selecció: el text d'ajuda, els controls
 * d'anàlisi, les tres capes i, si n'hi ha, el resultat de la consulta, que
 * s'ha de refer perquè segueix el mateix filtre.
 *
 * L'anàlisi (bloc 2) sempre és d'una subcategoria concreta. Sense cap de
 * triada, les caselles i els seus controls es desactiven I es desmarquen:
 * deixar-les marcades però sense efecte seria pitjor que apagar-les.
 */
function applySelection() {
  const ok = isAnalysable();

  $('an-note').textContent = ok
    ? `Sobre: ${label(state.sub)}`
    : 'Tria una subcategoria de POIs al bloc 1 per analitzar-la.';

  for (const id of ['access', 'infl']) {
    $(`c-${id}`).disabled = !ok;
    $(`lbl-${id}`).classList.toggle('off', !ok);
    $(`ctl-${id}`).classList.toggle('off', !ok);
    $(`ctl-${id}`).querySelectorAll('input, select').forEach(el => { el.disabled = !ok; });
    if (!ok) $(`c-${id}`).checked = false;
  }

  refreshPois();
  refreshInfluence();
  refreshAccessibility();
  rerunQuery();
}

/**
 * El botó de la capçalera plega i desplega el cos del panell.
 *
 * En una pantalla estreta el panell és un full que puja des de baix (app.css)
 * i arrenca plegat: desplegat, taparia el mapa. Quan una consulta dona
 * resultat, el panell es desplega sol i el porta a la vista: si no, en un
 * mòbil, on l'usuari el plega per poder clicar el mapa, el resultat quedaria
 * amagat. I si en desplegar-se el full tapa el punt consultat, el mapa es
 * desplaça fins a deixar-lo a la part visible.
 */
function initPanelToggle() {
  const panel = $('panel'), btn = $('panel-toggle');
  const narrow = matchMedia('(max-width: 700px)');
  const setOpen = open => {
    panel.classList.toggle('collapsed', !open);
    btn.setAttribute('aria-expanded', open);
    btn.title = open ? 'Plega el panell' : 'Desplega el panell';
    btn.setAttribute('aria-label', btn.title);
  };
  setOpen(!narrow.matches);
  btn.addEventListener('click', () => setOpen(panel.classList.contains('collapsed')));

  document.addEventListener('geodb:results', () => {
    setOpen(true);
    $('results').scrollIntoView({ block: 'nearest' });
    const lngLat = getLastClick();
    if (!narrow.matches || !lngLat) return;
    const visible = map.getContainer().clientHeight - panel.offsetHeight;
    const y = map.project(lngLat).y;
    if (y > visible - 30) map.panBy([0, y - visible / 2]);
  });
}

/**
 * Globus d'ajuda dels botons (i).
 *
 * El text de cada botó és en un <template> d'index.html (data-tip en diu
 * l'id). Es mostra en un únic element #tip penjat del <body> i posicionat
 * amb `position: fixed`: dins del panell, que té scroll, quedaria retallat.
 * Surt en passar-hi el ratolí o amb el focus del teclat.
 */
function initTooltips() {
  const tip = document.createElement('div');
  tip.id = 'tip';
  tip.setAttribute('role', 'tooltip');
  tip.hidden = true;
  document.body.append(tip);

  const show = btn => {
    tip.innerHTML = document.getElementById(btn.dataset.tip).innerHTML;
    tip.hidden = false;
    // A la dreta del botó; si no hi cap, a sota. Mai fora de la finestra.
    const r = btn.getBoundingClientRect();
    const w = tip.offsetWidth, h = tip.offsetHeight;
    let left = r.right + 10, top = r.top - 8;
    if (left + w > innerWidth - 8) { left = r.left - w / 2; top = r.bottom + 8; }
    tip.style.left = `${Math.max(8, Math.min(left, innerWidth - w - 8))}px`;
    tip.style.top  = `${Math.max(8, Math.min(top, innerHeight - h - 8))}px`;
  };
  const hide = () => { tip.hidden = true; };

  document.querySelectorAll('.info').forEach(btn => {
    btn.addEventListener('mouseenter', () => show(btn));
    btn.addEventListener('focus',      () => show(btn));
    btn.addEventListener('mouseleave', hide);
    btn.addEventListener('blur',       hide);
    // El botó del bloc 3 és dins del <summary>: sense això, el clic
    // plegaria o desplegaria el bloc a més d'ensenyar l'ajuda.
    btn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); show(btn); });
  });
}

/**
 * Deixa el panell a punt: l'omple i connecta tots els controls.
 * La crida main.js un cop el mapa ja ha carregat l'estil.
 */
export function initPanel() {
  fillCategories();
  fillSubcategories();
  applySelection();

  initTooltips();
  initPanelToggle();

  // --- POIs: canviar de categoria reinicia la subcategoria -------------
  $('sel-cat').addEventListener('change', e => {
    state.cat = e.target.value;
    state.sub = '';
    fillSubcategories();
    applySelection();
  });
  $('sel-sub').addEventListener('change', e => {
    state.sub = e.target.value;
    applySelection();
  });

  // --- Capes i anàlisi: cada control crida només el que ha de canviar --
  $('c-pois').addEventListener('change', refreshPois);
  $('c-access').addEventListener('change', refreshAccessibility);
  // 'input' i no 'change': el mapa es repinta mentre s'arrossega el control,
  // cosa que només és possible perquè no hi ha cap petició pel mig.
  $('threshold').addEventListener('input', refreshAccessibility);
  $('c-infl').addEventListener('change', refreshInfluence);
  $('radius').addEventListener('change', refreshInfluence);
  initBasemapToggles();

  // --- Consultes espacials ----------------------------------------------
  // Cada botó és un interruptor: setMode() desactiva la consulta si ja era
  // l'activa. La crida inicial deixa escrita l'ajuda del mode "cap".
  setMode('none');
  document.querySelectorAll('#mode button')
    .forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
  // Plegar el bloc desactiva la consulta: si no, el clic al mapa seguiria
  // llançant consultes des d'uns controls que ja no es veuen.
  $('queries').addEventListener('toggle', e => {
    if (!e.target.open && state.mode !== 'none') setMode(state.mode);
  });

  // El radi s'escriu mentre s'arrossega, però la consulta es refà en deixar
  // anar ('change'): una petició per posició intermèdia no serviria de res.
  $('q-radius').addEventListener('input', e => { $('q-radius-val').textContent = fmtM(+e.target.value); });
  $('q-radius').addEventListener('change', rerunQuery);
  $('nearest-n').addEventListener('change', rerunQuery);

  // Clics dins de la targeta de resultats. S'escolta la targeta sencera i no
  // cada element, perquè els elements es refan a cada consulta i els seus
  // escoltadors es perdrien.
  //   ×            esborra el resultat i el dibuix
  //   un resultat  hi vola i en ressalta el marcador; les coordenades i el
  //                número viatgen en atributs data-* que hi posa query-run.js
  $('results').addEventListener('click', e => {
    if (e.target.closest('.rclose')) { clearQuery(); results(''); return; }
    const li = e.target.closest('li.hit');
    if (!li) return;
    map.flyTo({
      center: [+li.dataset.lon, +li.dataset.lat],
      zoom: Math.max(map.getZoom(), 16)   // acosta't, però no t'allunyis mai
    });
    highlightRank(li.dataset.rank);
  });
}
