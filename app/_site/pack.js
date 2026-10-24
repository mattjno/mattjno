// Mise en page des galeries. Chaque photo occupe des cases d'une grille de portraits 3:4 :
// portrait 1 case ; paysage 3:2 à 16:10 : 2 cases ; panoramique (2,4:1) : 3 cases. Sur deux colonnes, la case
// d'un paysage a presque la hauteur d'un portrait (rognage de 4 % au plus pour les formats de l'appareil,
// 10 % aux limites acceptées). Les autres formats restent hors galerie.

export function span({ w, h }) {
  const r = w / h;
  if (r < 1 / 1.1) return 1;
  if (r >= 1.4 && r <= 1.7) return 2;
  if (r >= 2.1 && r <= 2.6) return 3;
  return 0;
}

// Range les photos en rangées complètes de `cols` cases, dans l'ordre reçu (les plus récentes d'abord).
// Quand une photo ne tient pas dans la place restante d'une rangée, la suivante qui tient passe devant.
// Une rangée impossible à compléter n'est pas affichée. Sur deux colonnes, paysages et panoramiques prennent
// la rangée entière. feature : la mosaïque ouvre sur un portrait de 2 × 2 cases (une rangée sur téléphone).
export function pack(list, cols, { rows = Infinity, feature = false } = {}) {
  const queue = list.map((p) => ({ p, s: Math.min(span(p), cols) })).filter((x) => x.s > 0);
  const out = [];
  let r = 0;
  if (feature) {
    const k = queue.findIndex((x) => x.s === 1);
    if (k < 0) return [];
    out.push({ ...queue.splice(k, 1)[0], s: 2, feature: true });
    if (cols < 4) r = 1;
  }
  for (; r < rows; r++) {
    let room = feature && cols >= 4 && r < 2 ? cols - 2 : cols;
    const row = [];
    while (room > 0) {
      const k = queue.findIndex((x) => x.s <= room);
      if (k < 0) break;
      const x = queue.splice(k, 1)[0];
      row.push(x);
      room -= x.s;
    }
    if (room > 0) break;
    out.push(...row);
  }
  // La grande case de la mosaïque couvre deux rangées : elles doivent être complètes toutes les deux
  if (feature && cols >= 4 && r < 2) return [];
  return out;
}
