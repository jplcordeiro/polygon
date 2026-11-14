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
  letrasDoLocal: number;
  letrasDoDirigente: number;
  letrasDaObservacao: number;
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
    { local: 15, dirigente: 13, territorio: 13, observacao: 11, letrasDoLocal: 40, letrasDoDirigente: 30, letrasDaObservacao: 40 },
    { local: 15, dirigente: 13, territorio: 13, observacao: 11, letrasDoLocal: 40, letrasDoDirigente: 30, letrasDaObservacao: 40 },
  ],
  2: [
    { local: 13, dirigente: 11.5, territorio: 11.5, observacao: null, letrasDoLocal: 40, letrasDoDirigente: 30, letrasDaObservacao: 0 },
    { local: 12, dirigente: 10.5, territorio: 10.5, observacao: null, letrasDoLocal: 40, letrasDoDirigente: 30, letrasDaObservacao: 0 },
  ],
  3: [
    { local: 11, dirigente: 10, territorio: 10, observacao: null, letrasDoLocal: 40, letrasDoDirigente: 30, letrasDaObservacao: 0 },
    { local: 9, dirigente: 8, territorio: 8, observacao: null, letrasDoLocal: 40, letrasDoDirigente: 30, letrasDaObservacao: 0 },
  ],
};

function cortar(texto: string, letras: number): string {
  return texto.length <= letras ? texto : `${texto.slice(0, letras - 1).trimEnd()}…`;
}

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

  const porDia = new Map<string, number>();
  for (const s of saidas) porDia.set(s.data, (porDia.get(s.data) ?? 0) + 1);
  const patamar = patamarDe(
    gradeDoMes(m).length / 7,
    [...porDia.entries()].reduce(
      (maior, [data, quantas]) => (mesmoMes(data, m) ? Math.max(maior, quantas) : maior),
      0,
    ),
  );

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
            local: s.local && cortar(s.local, patamar.letrasDoLocal),
            dirigente: cortar(
              s.publicador_id
                ? (nomeDe.get(s.publicador_id) ?? "a definir")
                : "a definir",
              patamar.letrasDoDirigente,
            ),
            territorios: s.territorio_ids.flatMap((id) => {
              const numero = numeroDe.get(id);
              return numero ? [numero] : [];
            }),
            observacao:
              s.observacao && cortar(s.observacao, patamar.letrasDaObservacao),
          }))
        : [],
    };
  });

  const semanas: SemanaEscala[] = [];
  for (let i = 0; i < dias.length; i += 7) semanas.push(dias.slice(i, i + 7));

  return {
    titulo: `${MES_NOME[m.mes - 1]} ${m.ano}`,
    geradoEm: dataBR(hoje),
    aviso: aviso.trim(),
    semanas,
    patamar,
  };
}
