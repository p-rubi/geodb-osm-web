// state.js — la selecció actual de l'usuari.
//
// És l'única cosa que comparteixen tots els mòduls. Es manté petita a posta:
// tres valors, i cadascun surt directament d'un control del panell.
//
// Qui l'escriu: ui.js (els selectors) i query-modes.js (els botons de mode).
// Qui la llegeix: totes les capes i totes les consultes.

import { BY_CODE } from './taxonomy.js';

export const state = {
  cat:  '',      // codi de la categoria triada       ('' = totes)
  sub:  '',      // codi de la subcategoria triada    ('' = totes)
  mode: 'none'   // mode de clic: none | nearest | radius
};

/**
 * Digues si la subcategoria triada té anàlisi precalculada.
 *
 * PER QUÈ: l'accessibilitat i l'àrea d'influència són d'una subcategoria
 * concreta (columna d_<codi> als PMTiles, buffers a la base). Totes les
 * subcategories de servei estan marcades amb `analysis` a la taxonomia; la
 * comprovació es manté per si mai se'n desmarca alguna.
 */
export const isAnalysable = () => !!state.sub && !!BY_CODE[state.sub]?.analysis;
