import {
  dataBR,
  diaDaSemana,
  diaDe,
  gradeDoMes,
  MES_NOME,
  mesmoMes,
  saidasDoDia,
  type Mes,
} from "./saidas";
import { hojeISO } from "./rodadas";
import type { Periodo, Publicador, Saida, Territorio } from "./types";

export interface SaidaEscala {
  periodo: Periodo;
  local: string | null;
  dirigente: string;
  territorios: string[];
  observacao: string | null;
}

export interface DiaEscala {
  data: string;
  dia: number;
  doMes: boolean;
  diaDaSemana: number;
  saidas: SaidaEscala[];
}

export type SemanaEscala = DiaEscala[];

export interface Patamar {
  local: number;
  dirigente: number;
  territorio: number | null;
  observacao: number | null;
}

export interface Escala {
  titulo: string;
  geradoEm: string;
  aviso: string;
  semanas: SemanaEscala[];
  patamar: Patamar;
}

const PATAMARES: Record<number, [Patamar, Patamar]> = {
  1: [
    { local: 9.5, dirigente: 8, territorio: 7.5, observacao: 7 },
    { local: 9, dirigente: 7.5, territorio: 7, observacao: 6.5 },
  ],
  2: [
    { local: 8.5, dirigente: 7.5, territorio: 7, observacao: 6.5 },
    { local: 8, dirigente: 7, territorio: 6.5, observacao: null },
  ],
  3: [
    { local: 7.5, dirigente: 7, territorio: 6.5, observacao: null },
    { local: 7, dirigente: 6.5, territorio: null, observacao: null },
  ],
};

export function patamarDe(semanas: number, densidade: number): Patamar {
  const nivel = Math.min(Math.max(densidade, 1), 3);
  return PATAMARES[nivel][semanas >= 6 ? 1 : 0];
}

export function escalaDoMes(
  m: Mes,
  saidas: Saida[],
  territorios: Territorio[],
  publicadores: Publicador[],
  aviso: string,
  hoje: string = hojeISO(),
): Escala {
  const numeroDe = new Map(territorios.map((t) => [t.id, t.numero]));
  const nomeDe = new Map(publicadores.map((p) => [p.id, p.nome]));

  const dias = gradeDoMes(m).map((data): DiaEscala => {
    const doMes = mesmoMes(data, m);
    return {
      data,
      dia: diaDe(data),
      doMes,
      diaDaSemana: diaDaSemana(data),
      saidas: doMes
        ? saidasDoDia(saidas, data).map((s) => ({
            periodo: s.periodo,
            local: s.local,
            dirigente: s.publicador_id
              ? (nomeDe.get(s.publicador_id) ?? "a definir")
              : "a definir",
            territorios: s.territorio_ids.flatMap((id) => {
              const numero = numeroDe.get(id);
              return numero ? [numero] : [];
            }),
            observacao: s.observacao,
          }))
        : [],
    };
  });

  const semanas: SemanaEscala[] = [];
  for (let i = 0; i < dias.length; i += 7) semanas.push(dias.slice(i, i + 7));

  const densidade = dias.reduce((maior, d) => Math.max(maior, d.saidas.length), 0);

  return {
    titulo: `${MES_NOME[m.mes - 1]} ${m.ano}`,
    geradoEm: dataBR(hoje),
    aviso: aviso.trim(),
    semanas,
    patamar: patamarDe(semanas.length, densidade),
  };
}
