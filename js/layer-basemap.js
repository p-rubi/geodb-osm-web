// layer-basemap.js — els interruptors de la cartografia base.
//
// La part més senzilla del visor: quatre caselles que amaguen o mostren capes
// que ja són al mapa. No hi ha cap petició de xarxa pel mig — les tessel·les
// PMTiles ja estan descarregades i només es deixen de dibuixar.

import { $ } from './utils.js';
import { map } from './map.js';

/**
 * Quina casella controla quines capes de l'estil.
 * Aigua són dues capes (la superfície i els cursos), per això la llista.
 */
const TOGGLES = {
  'c-landuse':   ['landuse'],
  'c-water':     ['water', 'waterways'],
  'c-roads':     ['roads'],
  'c-buildings': ['buildings']
};

/** Mostra o amaga les capes d'una casella segons si està marcada. */
const apply = id => {
  const visibility = $(id).checked ? 'visible' : 'none';
  TOGGLES[id].forEach(l => map.setLayoutProperty(l, 'visibility', visibility));
};

/** Connecta cada casella de "Cartografia base" amb les seves capes. */
export function initBasemapToggles() {
  for (const id of Object.keys(TOGGLES)) $(id).addEventListener('change', () => apply(id));
}

/**
 * L'accessibilitat pinta a sobre dels edificis de la base: sense ells, els
 * edificis de fora del terme desapareixerien i el color no tindria context.
 * Mentre és activa, la capa d'edificis s'encén i la casella es bloqueja; en
 * apagar-la, torna a l'estat que l'usuari havia triat.
 */
export function requireBuildings(required) {
  const cb = $('c-buildings');
  if (required && !cb.disabled) {
    cb.dataset.userChecked = cb.checked;
    cb.checked = true;
  } else if (!required && cb.disabled) {
    cb.checked = cb.dataset.userChecked === 'true';
  }
  cb.disabled = required;
  $('lbl-buildings').classList.toggle('off', required);
  $('lbl-buildings').title = required ? "Necessària mentre l'accessibilitat és activa" : '';
  apply('c-buildings');
}
