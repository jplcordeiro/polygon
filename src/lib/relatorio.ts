import {
  passagensDoMes,
  relatorioDoMes,
  type Marca,
  type PassagemMes,
} from "./quadras";
import { campanhas, hojeISO } from "./rodadas";
import { dataBR, MES_NOME, type Mes } from "./saidas";
import type { Rodada, Territorio } from "./types";

export interface LinhaFolha {
  numero: string;
  nome: string;
  feitasNoMes: number;
  total: number;
  concluidoNoMes: boolean;
  passagens: PassagemMes[];
}

export interface PeriodoFolha {
  nome: string;
  inicio: string;
  territorios: number;
}

export interface Folha {
  titulo: string;
  geradoEm: string;
  totalQuadrasNoMes: number;
  totalTerritorios: number;
  totalConcluidos: number;
  linhas: LinhaFolha[];
  periodos: PeriodoFolha[];
}

export function folhaDoMes(
  m: Mes,
  territorios: Territorio[],
  marcas: Marca[],
  rodadas: Rodada[] = [],
  hoje: string = hojeISO(),
): Folha {
  const relatorio = relatorioDoMes(m, territorios, marcas, rodadas);

  return {
    titulo: `${MES_NOME[m.mes - 1]} ${m.ano}`,
    geradoEm: dataBR(hoje),
    totalQuadrasNoMes: relatorio.totalQuadrasNoMes,
    totalTerritorios: relatorio.linhas.length,
    totalConcluidos: relatorio.totalConcluidos,
    linhas: relatorio.linhas.map((l) => ({
      numero: l.territorio.numero,
      nome: l.territorio.nome ?? "Sem nome",
      feitasNoMes: l.feitasNoMes,
      total: l.total,
      concluidoNoMes: l.concluidoNoMes,
      passagens: passagensDoMes(l.territorio, m, marcas),
    })),
    periodos: campanhas(rodadas).map((c) => ({
      nome: c.nome ?? "Rodada",
      inicio: c.inicio,
      territorios: c.territorio_ids.length,
    })),
  };
}
