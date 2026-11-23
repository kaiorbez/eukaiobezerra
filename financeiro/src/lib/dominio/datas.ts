/**
 * Datas de calendário como texto "YYYY-MM-DD", sem fuso (PRD, seção 6).
 * Comparar duas datas é comparar os textos.
 */

export const FUSO = "America/La_Paz";

export type DataISO = string;

const RE_DATA = /^\d{4}-\d{2}-\d{2}$/;

export function ehDataISO(x: string): x is DataISO {
  if (!RE_DATA.test(x)) return false;
  const [a, m, d] = x.split("-").map(Number);
  const dt = new Date(Date.UTC(a, m - 1, d));
  return dt.getUTCFullYear() === a && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** Hoje em Santa Cruz, como dia de calendário. */
export function hoje(agora: Date = new Date(), fuso: string = FUSO): DataISO {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: fuso,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(agora);
}

/** Mês como "YYYY-MM". */
export type MesISO = string;

export function ehMesISO(x: string): x is MesISO {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(x);
}

export function mesDe(data: DataISO): MesISO {
  return data.slice(0, 7);
}

export function primeiroDia(mes: MesISO): DataISO {
  return `${mes}-01`;
}

export function ultimoDia(mes: MesISO): DataISO {
  const [a, m] = mes.split("-").map(Number);
  const d = new Date(Date.UTC(a, m, 0)).getUTCDate();
  return `${mes}-${String(d).padStart(2, "0")}`;
}

export function somarMeses(mes: MesISO, n: number): MesISO {
  const [a, m] = mes.split("-").map(Number);
  const dt = new Date(Date.UTC(a, m - 1 + n, 1));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}`;
}

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const MESES_LONGOS = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

/** "nov 26" */
export function rotuloMesCurto(mes: MesISO): string {
  const [a, m] = mes.split("-");
  return `${MESES[Number(m) - 1]} ${a.slice(2)}`;
}

/** "novembro de 2026" */
export function rotuloMes(mes: MesISO): string {
  const [a, m] = mes.split("-");
  return `${MESES_LONGOS[Number(m) - 1]} de ${a}`;
}

/** "21/11/2026" */
export function formatarData(d: DataISO): string {
  const [a, m, dia] = d.split("-");
  return `${dia}/${m}/${a}`;
}

/** "21 nov" */
export function formatarDataCurta(d: DataISO): string {
  const [, m, dia] = d.split("-");
  return `${dia} ${MESES[Number(m) - 1]}`;
}
