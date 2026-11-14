import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { DiaEscala, Escala, Patamar, SaidaEscala } from "../lib/escala";
import { MONO, SANS, registrarFontes } from "./fontes";

const TELA: [number, number] = [842, 1400];

const ABREV_DIA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

const MATIZ = [
  "#f6eee1",
  "#e6f1e9",
  "#e5f0ef",
  "#e4eef3",
  "#e4ecf6",
  "#e6e9f5",
  "#f2eee4",
];

const COR = {
  ink: "#29323c",
  inkSoft: "#67707d",
  inkFaint: "#98a1ae",
  line: "#dde3ea",
  jwblue: "#33507d",
  ocre: "#8a6636",
  mist: "#eceff3",
};

const estilos = StyleSheet.create({
  pagina: {
    fontFamily: SANS,
    color: COR.ink,
    padding: 12,
  },
  cabecalho: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  rotulo: {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: 1.2,
    color: COR.inkSoft,
    textTransform: "uppercase",
  },
  mes: {
    fontSize: 24,
    fontWeight: 700,
    color: COR.jwblue,
    textTransform: "uppercase",
  },
  faixa: { flexDirection: "row" },
  faixaDia: {
    flex: 1,
    textAlign: "center",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 1,
    color: COR.inkSoft,
    textTransform: "uppercase",
    paddingBottom: 2,
  },
  faixaDomingo: { color: COR.ocre },
  grade: {
    flex: 1,
    borderTopWidth: 0.6,
    borderLeftWidth: 0.6,
    borderColor: COR.line,
  },
  semana: { flexDirection: "row", flexGrow: 1, flexShrink: 0, flexBasis: "auto" },
  celula: {
    flex: 1,
    borderRightWidth: 0.6,
    borderBottomWidth: 0.6,
    borderColor: COR.line,
    padding: 2,
  },
  celulaVazia: { backgroundColor: COR.mist },
  dia: {
    fontFamily: MONO,
    fontSize: 14,
    fontWeight: 600,
    color: COR.inkSoft,
    textAlign: "right",
    lineHeight: 1.05,
  },
  diaDomingo: { color: COR.ocre },
  saida: { marginTop: 1.5 },
  saidaSeguinte: {
    borderTopWidth: 0.6,
    borderColor: "#ffffff",
    paddingTop: 1.5,
  },
  periodo: {
    fontFamily: MONO,
    fontStyle: "normal",
    fontSize: 8,
    letterSpacing: 0.5,
    color: COR.inkFaint,
    textTransform: "uppercase",
    textAlign: "center",
    lineHeight: 1.05,
  },
  local: {
    fontWeight: 700,
    color: COR.jwblue,
    textAlign: "center",
    lineHeight: 1.12,
    textTransform: "uppercase",
  },
  dirigente: {
    color: COR.ink,
    textAlign: "center",
    lineHeight: 1.12,
    textTransform: "uppercase",
  },
  aDefinir: {
    color: COR.ocre,
    fontStyle: "italic",
    textAlign: "center",
    lineHeight: 1.12,
    textTransform: "uppercase",
  },
  territorios: {
    fontWeight: 700,
    color: COR.ink,
    textAlign: "center",
    lineHeight: 1.12,
    textTransform: "uppercase",
  },
  observacao: {
    fontStyle: "italic",
    color: COR.inkSoft,
    textAlign: "center",
    lineHeight: 1.12,
    textTransform: "uppercase",
  },
  pe: {
    marginTop: 5,
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  avisos: { flexDirection: "row", alignItems: "baseline", flex: 1 },
  avisosRotulo: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 1,
    color: COR.inkSoft,
    textTransform: "uppercase",
    marginRight: 6,
  },
  avisosTexto: {
    fontSize: 12,
    color: COR.ink,
    flex: 1,
    textTransform: "uppercase",
  },
  rodape: {
    fontSize: 9,
    color: COR.inkFaint,
    marginLeft: 10,
    textTransform: "uppercase",
  },
});

function Saida({
  s,
  patamar,
  primeira,
}: {
  s: SaidaEscala;
  patamar: Patamar;
  primeira: boolean;
}) {
  return (
    <View style={[estilos.saida, primeira ? {} : estilos.saidaSeguinte]}>
      {s.periodo === "tarde" && <Text style={estilos.periodo}>tarde</Text>}

      {s.local && (
        <Text style={[estilos.local, { fontSize: patamar.local }]}>{s.local}</Text>
      )}

      <Text
        style={[
          s.dirigente === "a definir" ? estilos.aDefinir : estilos.dirigente,
          { fontSize: patamar.dirigente },
        ]}
      >
        {s.dirigente}
      </Text>

      {patamar.territorio !== null && s.territorios.length > 0 && (
        <Text style={[estilos.territorios, { fontSize: patamar.territorio }]}>
          {s.territorios.length === 1
            ? `Território ${s.territorios[0]}`
            : `Territórios ${s.territorios.join(" · ")}`}
        </Text>
      )}

      {patamar.observacao !== null && s.observacao && (
        <Text style={[estilos.observacao, { fontSize: patamar.observacao }]}>
          {s.observacao}
        </Text>
      )}
    </View>
  );
}

function Celula({ d, patamar }: { d: DiaEscala; patamar: Patamar }) {
  if (!d.doMes) return <View style={[estilos.celula, estilos.celulaVazia]} />;

  return (
    <View style={[estilos.celula, { backgroundColor: MATIZ[d.diaDaSemana] }]}>
      <Text style={[estilos.dia, d.diaDaSemana === 0 ? estilos.diaDomingo : {}]}>
        {d.dia}
      </Text>
      {d.saidas.map((s, i) => (
        <Saida key={`${s.periodo}-${i}`} s={s} patamar={patamar} primeira={i === 0} />
      ))}
    </View>
  );
}

export function EscalaPdf({ escala }: { escala: Escala }) {
  registrarFontes();

  return (
    <Document title={`Saídas de campo — ${escala.titulo}`}>
      <Page size={TELA} style={estilos.pagina}>
        <View style={estilos.cabecalho}>
          <Text style={estilos.rotulo}>Saídas de campo</Text>
          <Text style={estilos.mes}>{escala.titulo}</Text>
        </View>

        <View style={estilos.faixa}>
          {ABREV_DIA.map((d, i) => (
            <Text key={d} style={[estilos.faixaDia, i === 0 ? estilos.faixaDomingo : {}]}>
              {d}
            </Text>
          ))}
        </View>

        <View style={estilos.grade}>
          {escala.semanas.map((semana) => (
            <View key={semana[0].data} style={estilos.semana}>
              {semana.map((d) => (
                <Celula key={d.data} d={d} patamar={escala.patamar} />
              ))}
            </View>
          ))}
        </View>

        <View style={estilos.pe}>
          <View style={estilos.avisos}>
            {escala.aviso !== "" && (
              <>
                <Text style={estilos.avisosRotulo}>Avisos do mês</Text>
                <Text style={estilos.avisosTexto}>{escala.aviso}</Text>
              </>
            )}
          </View>
          <Text style={estilos.rodape}>Gerado em {escala.geradoEm}</Text>
        </View>
      </Page>
    </Document>
  );
}
