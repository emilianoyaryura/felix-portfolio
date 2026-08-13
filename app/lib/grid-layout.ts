// ─────────────────────────────────────────────────────────────────────────────
// Layout del infinite grid (funciones puras — las fotos llegan por parámetro).
//
// El "infinite grid" tesela un BLOQUE unitario en las 4 direcciones. Para escalar
// a muchas fotos SIN perder frecuencia del hero, el bloque se compone como una
// grilla de SUB-BLOQUES, cada uno con la plantilla bento 6×5 (13 slots de foto +
// 1 hero). Las fotos se reparten entre todos los sub-bloques y cada sub-bloque
// mantiene su hero → el hero aparece 1 vez por cada 6×5, pero entran TODAS las
// fotos. El período de repetición es el bloque grande (todas las fotos), así que
// casi no se nota la repetición.
// ─────────────────────────────────────────────────────────────────────────────

export const UNIT = 300; // lado de una celda unitaria (px)
export const GAP = 12; // separación entre fotos (px)
export const PITCH = UNIT + GAP; // paso de grilla

export type Photo = {
  id: string;
  src: string;
  alt: string;
  width?: number;
  height?: number;
};

export type Cell = {
  id: string;
  col: number;
  row: number;
  w: number; // ancho en celdas unitarias
  h: number; // alto en celdas unitarias
  type: "photo" | "hero";
  src?: string;
  alt?: string;
};

// Plantilla bento 6×5: 13 slots de foto + 1 hero (la "foto fake"). Cubre la malla
// exacta sin solapes ni huecos → tesela perfecto.
const TPL_COLS = 6;
const TPL_ROWS = 5;
type Slot = { id: string; col: number; row: number; w: number; h: number; type: "photo" | "hero" };
const TEMPLATE: Slot[] = [
  { id: "a", col: 0, row: 0, w: 2, h: 2, type: "photo" },
  { id: "b", col: 2, row: 0, w: 1, h: 1, type: "photo" },
  { id: "c", col: 3, row: 0, w: 2, h: 1, type: "photo" },
  { id: "d", col: 5, row: 0, w: 1, h: 2, type: "photo" },
  { id: "e", col: 2, row: 1, w: 1, h: 2, type: "photo" },
  { id: "hero", col: 3, row: 1, w: 2, h: 2, type: "hero" },
  { id: "g", col: 0, row: 2, w: 2, h: 1, type: "photo" },
  { id: "h", col: 5, row: 2, w: 1, h: 1, type: "photo" },
  { id: "i", col: 0, row: 3, w: 1, h: 2, type: "photo" },
  { id: "j", col: 1, row: 3, w: 2, h: 2, type: "photo" },
  { id: "k", col: 3, row: 3, w: 1, h: 1, type: "photo" },
  { id: "l", col: 4, row: 3, w: 2, h: 1, type: "photo" },
  { id: "m", col: 3, row: 4, w: 1, h: 1, type: "photo" },
  { id: "n", col: 4, row: 4, w: 2, h: 1, type: "photo" },
];
const PHOTO_SLOTS = TEMPLATE.filter((s) => s.type === "photo").length; // 13

export type Block = {
  cells: Cell[];
  blockW: number;
  blockH: number;
};

// Compone el bloque grande: grilla ~cuadrada de sub-bloques, repartiendo las
// fotos y conservando el hero en cada sub-bloque.
export function buildBlock(photos: Photo[]): Block {
  const g = Math.max(1, Math.ceil(photos.length / PHOTO_SLOTS)); // sub-bloques necesarios
  const gCols = Math.ceil(Math.sqrt(g)); // arreglo casi cuadrado
  const gRows = Math.ceil(g / gCols);
  const cells: Cell[] = [];
  let p = 0;
  for (let r = 0; r < gRows; r++) {
    for (let c = 0; c < gCols; c++) {
      const baseCol = c * TPL_COLS;
      const baseRow = r * TPL_ROWS;
      for (const t of TEMPLATE) {
        const cell: Cell = {
          id: `${c}-${r}-${t.id}`,
          col: baseCol + t.col,
          row: baseRow + t.row,
          w: t.w,
          h: t.h,
          type: t.type,
        };
        if (t.type === "photo") {
          const photo = photos[p % photos.length]; // wrap para completar el último sub-bloque
          p++;
          cell.src = photo.src;
          cell.alt = photo.alt;
        }
        cells.push(cell);
      }
    }
  }
  return {
    cells,
    blockW: gCols * TPL_COLS * PITCH,
    blockH: gRows * TPL_ROWS * PITCH,
  };
}

// Rectángulo en px de una celda dentro del bloque (con inset GAP/2 → costura uniforme).
export function cellRect(cell: Pick<Cell, "col" | "row" | "w" | "h">) {
  return {
    x: cell.col * PITCH + GAP / 2,
    y: cell.row * PITCH + GAP / 2,
    width: cell.w * PITCH - GAP,
    height: cell.h * PITCH - GAP,
  };
}

// Placeholders (Lorem Picsum b/n) — se muestran mientras no haya fotos reales.
export function placeholderPhotos(): Photo[] {
  return Array.from({ length: 40 }, (_, i) => ({
    id: `p${i}`,
    src: `https://picsum.photos/seed/felix-${i}/1000/1000?grayscale`,
    alt: `Untitled ${String(i + 1).padStart(2, "0")}`,
    width: 1000,
    height: 1000,
  }));
}
