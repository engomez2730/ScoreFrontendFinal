/**
 * Box score used by the manual stats editor. Mirrors the backend's
 * src/lib/manualStats.js: 2PT/3PT and offensive/defensive rebounds are split
 * here, while PlayerGameStats stores tirosIntentados/tirosAnotados including
 * 3-pointers and rebotes as the total.
 */

export interface BoxScore {
  tirosLibresAnotados: number;
  tirosLibresIntentados: number;
  tiros2Anotados: number;
  tiros2Intentados: number;
  tiros3Anotados: number;
  tiros3Intentados: number;
  rebotesOfensivos: number;
  rebotesDefensivos: number;
  asistencias: number;
  robos: number;
  tapones: number;
  perdidas: number;
  faltasPersonales: number;
  minutos: number; // seconds
  plusMinus: number;
}

export type BoxScoreField = keyof BoxScore;

export type StatsRow = Partial<{
  tirosLibresAnotados: number;
  tirosLibresIntentados: number;
  tirosAnotados: number;
  tirosIntentados: number;
  tiros3Anotados: number;
  tiros3Intentados: number;
  rebotes: number;
  rebotesOfensivos: number;
  asistencias: number;
  robos: number;
  tapones: number;
  perdidas: number;
  faltasPersonales: number;
  minutos: number;
  plusMinus: number;
}>;

export const FOUL_OUT_LIMIT = 5;

export const BOX_SCORE_LABELS: Record<BoxScoreField, string> = {
  tirosLibresAnotados: "TL convertidos",
  tirosLibresIntentados: "TL intentados",
  tiros2Anotados: "T2 convertidos",
  tiros2Intentados: "T2 intentados",
  tiros3Anotados: "T3 convertidos",
  tiros3Intentados: "T3 intentados",
  rebotesOfensivos: "Rebotes ofensivos",
  rebotesDefensivos: "Rebotes defensivos",
  asistencias: "Asistencias",
  robos: "Robos",
  tapones: "Tapones",
  perdidas: "Pérdidas",
  faltasPersonales: "Faltas personales",
  minutos: "Minutos",
  plusMinus: "+/-",
};

export const toBoxScore = (s?: StatsRow | null): BoxScore => {
  const v = (n?: number) => n ?? 0;
  return {
    tirosLibresAnotados: v(s?.tirosLibresAnotados),
    tirosLibresIntentados: v(s?.tirosLibresIntentados),
    tiros2Anotados: v(s?.tirosAnotados) - v(s?.tiros3Anotados),
    tiros2Intentados: v(s?.tirosIntentados) - v(s?.tiros3Intentados),
    tiros3Anotados: v(s?.tiros3Anotados),
    tiros3Intentados: v(s?.tiros3Intentados),
    rebotesOfensivos: v(s?.rebotesOfensivos),
    rebotesDefensivos: v(s?.rebotes) - v(s?.rebotesOfensivos),
    asistencias: v(s?.asistencias),
    robos: v(s?.robos),
    tapones: v(s?.tapones),
    perdidas: v(s?.perdidas),
    faltasPersonales: v(s?.faltasPersonales),
    minutos: v(s?.minutos),
    plusMinus: v(s?.plusMinus),
  };
};

export const computePoints = (b: Pick<BoxScore, "tirosLibresAnotados" | "tiros2Anotados" | "tiros3Anotados">) =>
  (b.tirosLibresAnotados ?? 0) + 2 * (b.tiros2Anotados ?? 0) + 3 * (b.tiros3Anotados ?? 0);
