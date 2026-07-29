import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { dataBR } from "../lib/saidas";
import type { Folha } from "../lib/relatorio";
import { MONO, SANS, registrarFontes } from "./fontes";

const COR = {
  ink: "#29323c",
  inkSoft: "#67707d",
  inkFaint: "#98a1ae",
  line: "#dde3ea",
  jwblue: "#33507d",
  sageInk: "#3f6b58",
  sageWash: "#e7f0eb",
};

const estilos = StyleSheet.create({
  pagina: {
    fontFamily: SANS,
    fontSize: 9.5,
    color: COR.ink,
    paddingTop: 104,
    paddingBottom: 46,
    paddingHorizontal: 36,
  },
  cabecalho: {
    position: "absolute",
    top: 32,
    left: 36,
    right: 36,
  },
  tituloLinha: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  rotulo: {
    fontSize: 7.5,
    fontWeight: 600,
    letterSpacing: 1.2,
    color: COR.inkSoft,
    textTransform: "uppercase",
  },
  mes: {
    fontSize: 17,
    fontWeight: 700,
    color: COR.jwblue,
  },
  indicadores: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1.6,
    borderBottomWidth: 1.6,
    borderColor: COR.jwblue,
    paddingVertical: 5,
    marginTop: 7,
  },
  indicador: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  indicadorValor: {
    fontFamily: MONO,
    fontSize: 12,
    color: COR.jwblue,
    marginRight: 4,
  },
  indicadorRotulo: {
    fontSize: 7.5,
    fontWeight: 600,
    letterSpacing: 0.8,
    color: COR.inkSoft,
    textTransform: "uppercase",
  },
  faixa: {
    flexDirection: "row",
    borderBottomWidth: 0.8,
    borderColor: COR.line,
    paddingBottom: 3,
    paddingTop: 7,
  },
  faixaTexto: {
    fontSize: 7,
    fontWeight: 600,
    letterSpacing: 1,
    color: COR.inkFaint,
    textTransform: "uppercase",
  },
  territorio: {
    borderBottomWidth: 0.8,
    borderColor: COR.line,
    paddingVertical: 6,
  },
  linha: {
    flexDirection: "row",
    alignItems: "center",
  },
  colNumero: { width: 44 },
  colNome: { flex: 1, paddingRight: 8 },
  colQuadras: { width: 62, textAlign: "right" },
  colStatus: { width: 74, textAlign: "right" },
  numero: {
    fontFamily: MONO,
    fontSize: 11.5,
    fontWeight: 400,
    color: COR.ink,
  },
  nome: { fontSize: 10.5 },
  quadras: {
    fontFamily: MONO,
    fontSize: 9.5,
    color: COR.inkSoft,
  },
  selo: {
    fontSize: 7,
    fontWeight: 700,
    letterSpacing: 0.6,
    color: COR.sageInk,
    backgroundColor: COR.sageWash,
    paddingVertical: 2,
    paddingHorizontal: 4,
    borderRadius: 2,
    textAlign: "center",
  },
  passagem: {
    flexDirection: "row",
    marginTop: 3,
    paddingLeft: 44,
  },
  passagemData: {
    fontFamily: MONO,
    fontSize: 8.5,
    color: COR.inkSoft,
    width: 42,
  },
  passagemTexto: {
    flex: 1,
    fontSize: 8.5,
    color: COR.inkSoft,
  },
  secao: {
    fontSize: 8,
    fontWeight: 700,
    letterSpacing: 1.2,
    color: COR.inkSoft,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  periodo: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 0.8,
    borderColor: COR.line,
    paddingVertical: 6,
  },
  periodoNome: { fontSize: 10.5 },
  periodoDetalhe: {
    fontFamily: MONO,
    fontSize: 8.5,
    color: COR.inkSoft,
  },
  vazio: {
    fontSize: 10,
    color: COR.inkSoft,
    marginTop: 4,
  },
  rodape: {
    position: "absolute",
    bottom: 22,
    left: 36,
    right: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 0.8,
    borderColor: COR.line,
    paddingTop: 5,
  },
  rodapeTexto: {
    fontSize: 7.5,
    color: COR.inkFaint,
  },
});

function diaEMes(data: string) {
  return dataBR(data).slice(0, 5);
}

function Cabecalho({ folha, comFaixa }: { folha: Folha; comFaixa: boolean }) {
  const indicadores = [
    { valor: folha.totalQuadrasNoMes, rotulo: "Quadras feitas" },
    { valor: folha.totalTerritorios, rotulo: "Territórios" },
    { valor: folha.totalConcluidos, rotulo: "Concluídos" },
  ];

  return (
    <View style={estilos.cabecalho} fixed>
      <View style={estilos.tituloLinha}>
        <Text style={estilos.rotulo}>Relatório de campo</Text>
        <Text style={estilos.mes}>{folha.titulo}</Text>
      </View>

      <View style={estilos.indicadores}>
        {indicadores.map(({ valor, rotulo }) => (
          <View key={rotulo} style={estilos.indicador}>
            <Text style={estilos.indicadorValor}>{valor}</Text>
            <Text style={estilos.indicadorRotulo}>{rotulo}</Text>
          </View>
        ))}
      </View>

      {comFaixa && (
        <View style={estilos.faixa}>
          <Text style={[estilos.faixaTexto, estilos.colNumero]}>Terr.</Text>
          <Text style={[estilos.faixaTexto, estilos.colNome]}>Nome</Text>
          <Text style={[estilos.faixaTexto, estilos.colQuadras]}>Quadras</Text>
          <Text style={[estilos.faixaTexto, estilos.colStatus]}>Status</Text>
        </View>
      )}
    </View>
  );
}

function Rodape({ folha }: { folha: Folha }) {
  return (
    <View style={estilos.rodape} fixed>
      <Text style={estilos.rodapeTexto}>Gerado em {folha.geradoEm}</Text>
      <Text
        style={estilos.rodapeTexto}
        render={({ pageNumber, totalPages }) =>
          `Página ${pageNumber} de ${totalPages}`
        }
      />
    </View>
  );
}

export function RelatorioPdf({ folha }: { folha: Folha }) {
  registrarFontes();

  return (
    <Document title={`Relatório de campo — ${folha.titulo}`}>
      <Page size="A4" style={estilos.pagina}>
        <Cabecalho folha={folha} comFaixa />

        {folha.linhas.length === 0 ? (
          <Text style={estilos.vazio}>Nenhum trabalho registrado neste mês.</Text>
        ) : (
          folha.linhas.map((l) => (
            <View key={l.numero} style={estilos.territorio} wrap={false}>
              <View style={estilos.linha}>
                <Text style={[estilos.numero, estilos.colNumero]}>{l.numero}</Text>
                <Text style={[estilos.nome, estilos.colNome]}>{l.nome}</Text>
                <Text style={[estilos.quadras, estilos.colQuadras]}>
                  {l.total > 0 ? `${l.feitasNoMes} de ${l.total}` : `${l.feitasNoMes}`}
                </Text>
                <View style={estilos.colStatus}>
                  {l.concluidoNoMes && <Text style={estilos.selo}>Concluído</Text>}
                </View>
              </View>

              {l.passagens.map((p) => (
                <View key={p.saida_id} style={estilos.passagem}>
                  <Text style={estilos.passagemData}>{diaEMes(p.data)}</Text>
                  <Text style={estilos.passagemTexto}>
                    {p.local ?? "Sem ponto de encontro"}
                    {" · "}
                    {p.quadras === 1 ? "1 quadra" : `${p.quadras} quadras`}
                  </Text>
                </View>
              ))}
            </View>
          ))
        )}

        <Rodape folha={folha} />
      </Page>

      {folha.periodos.length > 0 && (
        <Page size="A4" style={estilos.pagina}>
          <Cabecalho folha={folha} comFaixa={false} />

          <Text style={estilos.secao}>Rodadas</Text>
          {folha.periodos.map((p) => (
            <View key={`${p.inicio}-${p.nome}`} style={estilos.periodo}>
              <Text style={estilos.periodoNome}>{p.nome}</Text>
              <Text style={estilos.periodoDetalhe}>
                desde {dataBR(p.inicio)} ·{" "}
                {p.territorios === 1 ? "1 território" : `${p.territorios} territórios`}
              </Text>
            </View>
          ))}

          <Rodape folha={folha} />
        </Page>
      )}
    </Document>
  );
}
