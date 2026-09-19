// layer-influence.js — les àrees d'influència.
//
// QUÈ MOSTRA: al voltant de cada servei de la subcategoria triada, la zona que
// en queda a menys del radi seleccionat.
//
// D'ON SURT: els polígons (unió de ST_Buffer de 300, 500 i 1.000 m al voltant
// dels punts de la subcategoria) estan precalculats a analysis.influence_areas
// (sql/analysis/a2_coverage.sql). El que és viu és el tall en tessel·les: api.mvt
// els retalla i els serveix a cada petició. Canviar el radi vol dir demanar
// tessel·les noves.
//
// Es pinten dues capes sobre la mateixa font: l'ompliment translúcid
// ('influence') i el contorn ('influence-line'), perquè on se solapen dues
// àrees es vegi el límit de cadascuna.

import { $ } from './utils.js';
import { mvtUrl } from './api.js';
import { state, isAnalysable } from './state.js';
import { map } from './map.js';

const LAYERS = ['influence', 'influence-line'];

/**
 * Aplica la casella, la subcategoria i el radi actuals.
 *
 * Si la capa està apagada no es demana res: les tessel·les velles es queden on
 * són i només es tornen a demanar quan es torna a encendre amb algun canvi.
 */
export function refreshInfluence() {
  const on = $('c-infl').checked && isAnalysable();
  LAYERS.forEach(l => map.setLayoutProperty(l, 'visibility', on ? 'visible' : 'none'));
  if (!on) return;

  map.getSource('live_influence').setTiles([
    mvtUrl('influence', { subcategory: state.sub, radius: $('radius').value })
  ]);
}
