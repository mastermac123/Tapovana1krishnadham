/**
 * The prototype draws every photograph position as a woven stripe or a survey
 * grid, so a missing image never reads as a broken one. Each pattern below is
 * copied verbatim from design-reference/Krishnadham.dc.html.
 *
 * TODO(photos): HANDOFF.md section 7 still owes us the hero, courtyard and
 * entrance photographs. Swap a pattern for a next/image fill and the band's
 * geometry, caption and drift stay exactly as they are.
 */

/** Hero — the building itself. */
export const HERO_WEAVE =
  'repeating-linear-gradient(112deg, #23342E 0px, #23342E 16px, #1B2926 16px, #1B2926 34px)';

/** Home courtyard, full bleed on ivory. */
export const COURTYARD_WEAVE =
  'repeating-linear-gradient(118deg, #E4DED0 0px, #E4DED0 15px, #EFEAE0 15px, #EFEAE0 32px)';

/** Entrance detail, on the forest contact panel. */
export const ENTRANCE_WEAVE =
  'repeating-linear-gradient(98deg, rgba(248,246,241,0.06) 0px, rgba(248,246,241,0.06) 14px, transparent 14px, transparent 30px)';

/** Login, left half. */
export const LOGIN_WEAVE =
  'repeating-linear-gradient(112deg, rgba(248,246,241,0.05) 0px, rgba(248,246,241,0.05) 15px, transparent 15px, transparent 32px)';

/** Map positions — about and contact. */
export const MAP_GRID =
  'repeating-linear-gradient(0deg, #E7E1D3 0px, #E7E1D3 1px, transparent 1px, transparent 46px), repeating-linear-gradient(90deg, #E7E1D3 0px, #E7E1D3 1px, transparent 1px, transparent 46px)';
