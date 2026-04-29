import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PlayerStats {
  id: number;
  gameId: number;
  playerId: number;
  puntos: number;
  rebotes: number;
  rebotesOfensivos?: number;
  asistencias: number;
  robos: number;
  tapones: number;
  tirosIntentados: number;
  tirosAnotados: number;
  tiros3Intentados: number;
  tiros3Anotados: number;
  tirosLibresIntentados?: number;
  tirosLibresAnotados?: number;
  minutos: number;
  plusMinus: number;
  perdidas?: number;
  faltasPersonales?: number;
  faltasQ1?: number;
  faltasQ2?: number;
  faltasQ3?: number;
  faltasQ4?: number;
  faltasOT?: number;
  isStarter?: boolean;
  puntosQ1?: number;
  puntosQ2?: number;
  puntosQ3?: number;
  puntosQ4?: number;
  puntosOT?: number;
  player?: {
    id: number;
    nombre: string;
    apellido: string;
    numero: number;
    posicion: string;
    teamId: number;
  };
}

interface GameData {
  id: number;
  fecha: string;
  estado: string;
  homeScore: number;
  awayScore: number;
  currentQuarter: number;
  totalQuarters: number;
  quarterLength: number;
  isOvertime?: boolean;
  event?: { nombre: string; fechaInicio?: string; fechaFin?: string };
  teamHome: { id: number; nombre: string; logo?: string };
  teamAway: { id: number; nombre: string; logo?: string };
  stats: PlayerStats[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const pct = (made: number, att: number): string =>
  att === 0 ? "0.0%" : `${((made / att) * 100).toFixed(1)}%`;

const fmtMinutes = (seconds: number): string => {
  const s = Math.floor(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

const fmtDate = (dateStr: string): string => {
  try {
    return new Date(dateStr).toLocaleDateString("es-ES", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
};

// ─── Color palette ────────────────────────────────────────────────────────────
const HOME_COLOR: [number, number, number] = [24, 144, 255];   // blue
const AWAY_COLOR: [number, number, number] = [255, 77, 79];    // red
const HEADER_BG: [number, number, number] = [15, 23, 42];      // dark navy
const SECTION_BG: [number, number, number] = [240, 242, 245];  // light grey
const WHITE: [number, number, number] = [255, 255, 255];
const DARK: [number, number, number] = [30, 30, 30];

// ─── Main export ─────────────────────────────────────────────────────────────

export function generateGamePdf(
  gameData: GameData,
  playersMap: Record<number, { nombre: string; apellido: string; numero: number; posicion: string; teamId: number }>
): void {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const PW = doc.internal.pageSize.getWidth();   // 297
  const PH = doc.internal.pageSize.getHeight();  // 210

  // Determine winner
  const homeWon = gameData.homeScore > gameData.awayScore;
  const awayWon = gameData.awayScore > gameData.homeScore;

  // Split stats by team
  const homeStats = gameData.stats.filter((s) => {
    const p = playersMap[s.playerId];
    return p && p.teamId === gameData.teamHome.id;
  });
  const awayStats = gameData.stats.filter((s) => {
    const p = playersMap[s.playerId];
    return p && p.teamId === gameData.teamAway.id;
  });

  const sumStat = (stats: PlayerStats[], key: keyof PlayerStats): number =>
    stats.reduce((acc, s) => acc + (Number(s[key]) || 0), 0);

  // ── PAGE 1: Cover / Scoreboard ─────────────────────────────────────────────
  // Background header banner
  doc.setFillColor(...HEADER_BG);
  doc.rect(0, 0, PW, 52, "F");

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...WHITE);
  doc.text("RESUMEN OFICIAL DEL PARTIDO", PW / 2, 14, { align: "center" });

  // Event & date
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  if (gameData.event?.nombre) {
    doc.text(gameData.event.nombre.toUpperCase(), PW / 2, 21, { align: "center" });
  }
  doc.text(fmtDate(gameData.fecha), PW / 2, 27, { align: "center" });

  // Home team block
  const homeX = 30;
  doc.setFillColor(...HOME_COLOR);
  doc.roundedRect(homeX, 32, 80, 16, 3, 3, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...WHITE);
  doc.text(gameData.teamHome.nombre.toUpperCase(), homeX + 40, 40, { align: "center" });
  doc.setFontSize(9);
  doc.text("LOCAL", homeX + 40, 45, { align: "center" });

  // Score
  doc.setFillColor(...WHITE);
  doc.roundedRect(PW / 2 - 22, 30, 44, 20, 4, 4, "F");
  doc.setTextColor(...DARK);
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text(`${gameData.homeScore} - ${gameData.awayScore}`, PW / 2, 44, { align: "center" });

  // Away team block
  const awayX = PW - homeX - 80;
  doc.setFillColor(...AWAY_COLOR);
  doc.roundedRect(awayX, 32, 80, 16, 3, 3, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...WHITE);
  doc.text(gameData.teamAway.nombre.toUpperCase(), awayX + 40, 40, { align: "center" });
  doc.setFontSize(9);
  doc.text("VISITANTE", awayX + 40, 45, { align: "center" });

  // Winner badge
  let winnerLabel = "EMPATE";
  if (homeWon) winnerLabel = `GANADOR: ${gameData.teamHome.nombre.toUpperCase()}`;
  if (awayWon) winnerLabel = `GANADOR: ${gameData.teamAway.nombre.toUpperCase()}`;
  doc.setFillColor(82, 196, 26); // green
  doc.roundedRect(PW / 2 - 45, 54, 90, 9, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...WHITE);
  doc.text(winnerLabel, PW / 2, 60, { align: "center" });

  // ── Points by quarter table ────────────────────────────────────────────────
  const hasOT = (gameData.isOvertime || false) || gameData.stats.some((s) => (s.puntosOT || 0) > 0);

  const qHeaders = ["Equipo", "Q1", "Q2", "Q3", "Q4"];
  if (hasOT) qHeaders.push("OT");
  qHeaders.push("TOTAL");

  const homePtsQ = [
    gameData.teamHome.nombre,
    String(sumStat(homeStats, "puntosQ1")),
    String(sumStat(homeStats, "puntosQ2")),
    String(sumStat(homeStats, "puntosQ3")),
    String(sumStat(homeStats, "puntosQ4")),
  ];
  if (hasOT) homePtsQ.push(String(sumStat(homeStats, "puntosOT")));
  homePtsQ.push(String(gameData.homeScore));

  const awayPtsQ = [
    gameData.teamAway.nombre,
    String(sumStat(awayStats, "puntosQ1")),
    String(sumStat(awayStats, "puntosQ2")),
    String(sumStat(awayStats, "puntosQ3")),
    String(sumStat(awayStats, "puntosQ4")),
  ];
  if (hasOT) awayPtsQ.push(String(sumStat(awayStats, "puntosOT")));
  awayPtsQ.push(String(gameData.awayScore));

  autoTable(doc, {
    startY: 68,
    head: [qHeaders],
    body: [homePtsQ, awayPtsQ],
    tableWidth: 130,
    margin: { left: PW / 2 - 65 },
    styles: { fontSize: 9, halign: "center", cellPadding: 2 },
    headStyles: { fillColor: HEADER_BG, textColor: WHITE, fontStyle: "bold" },
    bodyStyles: { textColor: DARK },
    columnStyles: { 0: { halign: "left", fontStyle: "bold" } },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index > 0) {
        const rowIdx = data.row.index;
        const col = data.column.index;
        // Highlight winning quarter
        const homeVal = Number(homePtsQ[col]);
        const awayVal = Number(awayPtsQ[col]);
        if (rowIdx === 0 && homeVal > awayVal) data.cell.styles.fillColor = [209, 236, 209];
        if (rowIdx === 1 && awayVal > homeVal) data.cell.styles.fillColor = [255, 220, 220];
        // Bold total
        if (col === qHeaders.length - 1) data.cell.styles.fontStyle = "bold";
      }
    },
  });

  // ── Team comparison box ───────────────────────────────────────────────────
  const statsY = (doc as any).lastAutoTable.finalY + 8;

  const buildTeamSummary = (stats: PlayerStats[]) => ({
    pts: sumStat(stats, "puntos"),
    reb: sumStat(stats, "rebotes"),
    rebO: sumStat(stats, "rebotesOfensivos"),
    ast: sumStat(stats, "asistencias"),
    rob: sumStat(stats, "robos"),
    tap: sumStat(stats, "tapones"),
    per: sumStat(stats, "perdidas"),
    flt: sumStat(stats, "faltasPersonales"),
    ta: sumStat(stats, "tirosAnotados"),
    ti: sumStat(stats, "tirosIntentados"),
    t3a: sumStat(stats, "tiros3Anotados"),
    t3i: sumStat(stats, "tiros3Intentados"),
    tla: sumStat(stats, "tirosLibresAnotados"),
    tli: sumStat(stats, "tirosLibresIntentados"),
  });

  const hSum = buildTeamSummary(homeStats);
  const aSum = buildTeamSummary(awayStats);

  const compRows = [
    ["Tiros de Campo", `${hSum.ta}-${hSum.ti} (${pct(hSum.ta, hSum.ti)})`, `${aSum.ta}-${aSum.ti} (${pct(aSum.ta, aSum.ti)})`],
    ["Triples", `${hSum.t3a}-${hSum.t3i} (${pct(hSum.t3a, hSum.t3i)})`, `${aSum.t3a}-${aSum.t3i} (${pct(aSum.t3a, aSum.t3i)})`],
    ["Tiros Libres", `${hSum.tla}-${hSum.tli} (${pct(hSum.tla, hSum.tli)})`, `${aSum.tla}-${aSum.tli} (${pct(aSum.tla, aSum.tli)})`],
    ["Rebotes Totales", String(hSum.reb), String(aSum.reb)],
    ["Rebotes Ofensivos", String(hSum.rebO), String(aSum.rebO)],
    ["Asistencias", String(hSum.ast), String(aSum.ast)],
    ["Robos", String(hSum.rob), String(aSum.rob)],
    ["Tapones", String(hSum.tap), String(aSum.tap)],
    ["Pérdidas", String(hSum.per), String(aSum.per)],
    ["Faltas", String(hSum.flt), String(aSum.flt)],
  ];

  autoTable(doc, {
    startY: statsY,
    head: [["Estadística", gameData.teamHome.nombre, gameData.teamAway.nombre]],
    body: compRows,
    tableWidth: 160,
    margin: { left: PW / 2 - 80 },
    styles: { fontSize: 8, halign: "center", cellPadding: 2 },
    headStyles: { fillColor: HEADER_BG, textColor: WHITE, fontStyle: "bold" },
    bodyStyles: { textColor: DARK },
    columnStyles: {
      0: { halign: "left", fontStyle: "bold", fillColor: SECTION_BG },
      1: { textColor: HOME_COLOR },
      2: { textColor: AWAY_COLOR },
    },
    alternateRowStyles: { fillColor: [250, 250, 250] },
  });

  // Footer page 1
  addFooter(doc, PW, PH, 1);

  // ── PAGE 2: Home team individual stats ────────────────────────────────────
  doc.addPage();
  addTeamStatsPage(doc, gameData, homeStats, playersMap, gameData.teamHome.nombre, HOME_COLOR, "LOCAL", PW, PH, hasOT);

  // ── PAGE 3: Away team individual stats ────────────────────────────────────
  doc.addPage();
  addTeamStatsPage(doc, gameData, awayStats, playersMap, gameData.teamAway.nombre, AWAY_COLOR, "VISITANTE", PW, PH, hasOT);

  // ── Save ──────────────────────────────────────────────────────────────────
  const safeName = (s: string) => s.replace(/[^a-zA-Z0-9]/g, "_");
  const fileName = `Resumen_${safeName(gameData.teamHome.nombre)}_vs_${safeName(gameData.teamAway.nombre)}_${new Date(gameData.fecha).toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
}

// ─── Team stats page helper ───────────────────────────────────────────────────

function addTeamStatsPage(
  doc: jsPDF,
  gameData: GameData,
  stats: PlayerStats[],
  playersMap: Record<number, { nombre: string; apellido: string; numero: number; posicion: string; teamId: number }>,
  teamName: string,
  teamColor: [number, number, number],
  teamLabel: string,
  PW: number,
  PH: number,
  hasOT: boolean
): void {
  // Page banner
  doc.setFillColor(...HEADER_BG);
  doc.rect(0, 0, PW, 22, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...WHITE);
  doc.text(`${teamName.toUpperCase()}  ·  ${teamLabel}`, PW / 2, 10, { align: "center" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(
    `${gameData.teamHome.nombre} ${gameData.homeScore}  -  ${gameData.awayScore} ${gameData.teamAway.nombre}  ·  ${fmtDate(gameData.fecha)}`,
    PW / 2, 17,
    { align: "center" }
  );

  // Coloured accent line
  doc.setFillColor(...teamColor);
  doc.rect(0, 22, PW, 2, "F");

  // Sort players: starters first, then bench; within each group by points desc
  const sorted = [...stats].sort((a, b) => {
    if ((a.isStarter ? 1 : 0) !== (b.isStarter ? 1 : 0)) return (b.isStarter ? 1 : 0) - (a.isStarter ? 1 : 0);
    return b.puntos - a.puntos;
  });

  // Build table rows
  const head = [["#", "Jugador", "POS", "MIN", "PTS", "TC", "%TC", "3PT", "%3PT", "TL", "%TL", "REB", "REB-O", "AST", "ROB", "TAP", "PER", "FLT", "+/-"]];
  if (hasOT) {
    head[0].splice(5, 0, "Q1", "Q2", "Q3", "Q4", "OT");
  } else {
    head[0].splice(5, 0, "Q1", "Q2", "Q3", "Q4");
  }

  const rows = sorted.map((s) => {
    const p = playersMap[s.playerId];
    const nombre = p ? `${p.nombre} ${p.apellido}` : `Jugador ${s.playerId}`;
    const pos = p?.posicion ?? "-";
    const num = p ? String(p.numero) : "-";

    const row = [
      num,
      nombre + (s.isStarter ? " ★" : ""),
      pos,
      fmtMinutes(s.minutos),
      String(s.puntos),
    ];

    // Quarter points
    row.push(String(s.puntosQ1 ?? 0), String(s.puntosQ2 ?? 0), String(s.puntosQ3 ?? 0), String(s.puntosQ4 ?? 0));
    if (hasOT) row.push(String(s.puntosOT ?? 0));

    row.push(
      `${s.tirosAnotados}-${s.tirosIntentados}`,
      pct(s.tirosAnotados, s.tirosIntentados),
      `${s.tiros3Anotados}-${s.tiros3Intentados}`,
      pct(s.tiros3Anotados, s.tiros3Intentados),
      `${s.tirosLibresAnotados ?? 0}-${s.tirosLibresIntentados ?? 0}`,
      pct(s.tirosLibresAnotados ?? 0, s.tirosLibresIntentados ?? 0),
      String(s.rebotes),
      String(s.rebotesOfensivos ?? 0),
      String(s.asistencias),
      String(s.robos),
      String(s.tapones),
      String(s.perdidas ?? 0),
      String(s.faltasPersonales ?? 0),
      s.plusMinus > 0 ? `+${s.plusMinus}` : String(s.plusMinus),
    );

    return row;
  });

  // Totals row
  const sumStat = (key: keyof PlayerStats) => stats.reduce((acc, s) => acc + (Number(s[key]) || 0), 0);
  const totalRow = [
    "", "TOTAL EQUIPO", "",
    fmtMinutes(sumStat("minutos")),
    String(sumStat("puntos")),
    String(sumStat("puntosQ1")), String(sumStat("puntosQ2")), String(sumStat("puntosQ3")), String(sumStat("puntosQ4")),
  ];
  if (hasOT) totalRow.push(String(sumStat("puntosOT")));
  totalRow.push(
    `${sumStat("tirosAnotados")}-${sumStat("tirosIntentados")}`,
    pct(sumStat("tirosAnotados"), sumStat("tirosIntentados")),
    `${sumStat("tiros3Anotados")}-${sumStat("tiros3Intentados")}`,
    pct(sumStat("tiros3Anotados"), sumStat("tiros3Intentados")),
    `${sumStat("tirosLibresAnotados")}-${sumStat("tirosLibresIntentados")}`,
    pct(sumStat("tirosLibresAnotados"), sumStat("tirosLibresIntentados")),
    String(sumStat("rebotes")),
    String(sumStat("rebotesOfensivos")),
    String(sumStat("asistencias")),
    String(sumStat("robos")),
    String(sumStat("tapones")),
    String(sumStat("perdidas")),
    String(sumStat("faltasPersonales")),
    "",
  );

  rows.push(totalRow);

  autoTable(doc, {
    startY: 28,
    head,
    body: rows,
    styles: { fontSize: 6.5, halign: "center", cellPadding: 1.5, overflow: "linebreak" },
    headStyles: { fillColor: teamColor, textColor: WHITE, fontStyle: "bold", fontSize: 7 },
    bodyStyles: { textColor: DARK },
    columnStyles: {
      0: { cellWidth: 8 },
      1: { halign: "left", cellWidth: 38 },
      2: { cellWidth: 10 },
    },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    didParseCell: (data) => {
      // Totals row style
      if (data.section === "body" && data.row.index === rows.length - 1) {
        data.cell.styles.fillColor = SECTION_BG;
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fontSize = 7;
      }
      // Highlight leaders (non-totals rows)
      if (data.section === "body" && data.row.index < rows.length - 1) {
        const colIdx = data.column.index;
        // PTS column: highlight top scorer
        if (colIdx === 4) {
          const maxPts = Math.max(...stats.map((s) => s.puntos));
          const rowStat = sorted[data.row.index];
          if (rowStat && rowStat.puntos === maxPts && maxPts > 0) {
            data.cell.styles.fillColor = [255, 243, 205];
            data.cell.styles.fontStyle = "bold";
          }
        }
      }
      // Plus-minus coloring — last data column
      const pmColIdx = hasOT ? head[0].length - 1 : head[0].length - 1;
      if (data.section === "body" && data.column.index === pmColIdx && data.row.index < rows.length - 1) {
        const val = Number(String(data.cell.text).replace("+", "")) || 0;
        if (val > 0) data.cell.styles.textColor = [34, 139, 34];
        if (val < 0) data.cell.styles.textColor = [200, 0, 0];
      }
    },
  });

  // ── Leaders section ───────────────────────────────────────────────────────
  const leadersY = (doc as any).lastAutoTable.finalY + 6;

  if (leadersY < PH - 30 && stats.length > 0) {
    const byPts = [...stats].sort((a, b) => b.puntos - a.puntos)[0];
    const byReb = [...stats].sort((a, b) => b.rebotes - a.rebotes)[0];
    const byAst = [...stats].sort((a, b) => b.asistencias - a.asistencias)[0];
    const byRob = [...stats].sort((a, b) => b.robos - a.robos)[0];

    const pName = (s: PlayerStats) => {
      const p = playersMap[s.playerId];
      return p ? `${p.nombre} ${p.apellido}` : `#${s.playerId}`;
    };

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...DARK);
    doc.text("LÍDERES DEL PARTIDO", 14, leadersY + 4);
    doc.setFillColor(...teamColor);
    doc.rect(14, leadersY + 5, 40, 0.5, "F");

    const leaders = [
      { label: "Anotación", value: `${byPts.puntos} pts`, name: pName(byPts) },
      { label: "Rebotes", value: `${byReb.rebotes} reb`, name: pName(byReb) },
      { label: "Asistencias", value: `${byAst.asistencias} ast`, name: pName(byAst) },
      { label: "Robos", value: `${byRob.robos} rob`, name: pName(byRob) },
    ];

    leaders.forEach((l, i) => {
      const x = 14 + i * 68;
      const y = leadersY + 9;
      doc.setFillColor(...SECTION_BG);
      doc.roundedRect(x, y, 64, 14, 2, 2, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(...teamColor);
      doc.text(l.label.toUpperCase(), x + 4, y + 5);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...DARK);
      doc.text(l.value, x + 4, y + 11);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(100, 100, 100);
      doc.text(l.name, x + 32, y + 11, { align: "right", maxWidth: 28 });
    });
  }

  // Page number footer
  const pageNum = doc.getNumberOfPages();
  addFooter(doc, PW, PH, pageNum);
}

// ─── Footer helper ────────────────────────────────────────────────────────────

function addFooter(doc: jsPDF, PW: number, PH: number, pageNum: number): void {
  doc.setFillColor(...HEADER_BG);
  doc.rect(0, PH - 8, PW, 8, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...WHITE);
  doc.text(
    `Generado el ${new Date().toLocaleString("es-ES")}  ·  Página ${pageNum}`,
    PW / 2,
    PH - 3,
    { align: "center" }
  );
}
