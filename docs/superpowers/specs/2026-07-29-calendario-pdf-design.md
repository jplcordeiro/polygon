# Calendário em PDF — a escala do mês como documento — Design

**Data:** 2026-07-29
**Status:** aprovado no brainstorming, pré-implementação

## Problema

O Relatório passou a exportar PDF (`2026-07-29-relatorio-pdf.md`). O Calendário
continua chamando `window.print()` (`Calendario.tsx:241`). Os dois botões ficaram
incoerentes: um baixa um arquivo, o outro abre o diálogo de impressão do navegador.

O motivo desta mudança é **coerência de uso**, não um defeito de layout. O recorte de
`overflow` que arruinava a impressão já foi corrigido no commit anterior, via
`[data-casca]`.

## O que a escala é

Um cartaz. A folha é afixada no quadro de avisos e lida de longe — o valor está em
bater o olho e ver o mês inteiro de uma vez. Isso é uma restrição de design, não uma
preferência: **a grade de 7 colunas é o artefato**, e qualquer solução que a
descaracterize resolve o problema errado.

Dentro de cada dia, o **ponto de encontro é a informação principal**, acima do nome de
quem dirige.

## A tensão central: o domingo não cabe

Em A4 paisagem sobram 786 × 539pt. Descontando cabeçalho (34), faixa dos dias da
semana (16), avisos do mês (30) e rodapé (16), restam **~435pt para a grade**. Num mês
de 6 semanas isso dá **73pt por linha**.

Uma célula com uma saída ocupa ~63pt e cabe. Mas o domínio prevê **duas saídas no
domingo**, de pontos de encontro diferentes (`CLAUDE.md`), e duas saídas nos tamanhos
atuais pedem ~76pt. Estoura — exatamente no dia mais movimentado da escala.

Medições que orientam a saída: soltando os números de território a célula cai para
~58pt; encolhendo o tipo em 15%, para ~65pt. **Duas saídas cabem com compactação
modesta.** O curinga é a `observacao`, que é texto livre e pode ter qualquer tamanho.

## Decisão: grade adaptativa, sempre uma página

A folha calcula a **densidade** do mês — o maior número de saídas num único dia — e
escolhe um patamar tipográfico. É uma tabela de consulta, não medição de texto, então
permanece função pura e testável.

| semanas | densidade | local | dirigente | territórios | observação |
|---|---|---|---|---|---|
| ≤5 | 1 | 9,5 | 8 | 7,5 | 7 |
| ≤5 | 2 | 8,5 | 7,5 | 7 | 6,5 |
| ≤5 | 3+ | 7,5 | 7 | 6,5 | — |
| 6 | 1 | 9 | 7,5 | 7 | 6,5 |
| 6 | 2 | 8 | 7 | 6,5 | — |
| 6 | 3+ | 7 | 6,5 | — | — |

Leitura da tabela: os números são corpo de fonte em pontos, e **`—` significa que o
campo não é desenhado**. A coluna "observação" é a `observacao` *da saída*, não a
seção "Avisos do mês", que é independente e nunca é suprimida. Densidade ≥ 3 usa a
última linha do seu grupo — não há patamar abaixo desse.

Quando aperta, **a observação cai antes dos territórios**: território é operacional
(quem vai aonde), observação é recado. A observação é sempre clampada a uma linha,
mesmo quando cabe — sozinha, ela poderia estourar qualquer patamar.

**Modo de falha, explícito:** a tabela é uma heurística. Se estiver errada para algum
mês, o PDF vaza para a página 2. Degrada, não quebra. É por isso que a verificação
renderiza um PDF real no pior caso e afirma o número de páginas (ver Testes).

### Alternativas descartadas

- **Grade fiel, quebrando entre semanas** (`wrap={false}` por linha, semana alta vai
  para a página seguinte). Nada encolhe e nada some, mas um mês cheio vira duas
  folhas — e aí o "mês de relance" acabou, que é a razão de existir da grade.
- **Grade resumida na frente, agenda cronológica atrás.** Serviria quadro e celular ao
  mesmo tempo, mas o público é o quadro; a segunda parte seria peso morto.

## Correção de comportamento: dias de outro mês

`gradeDoMes` devolve semanas completas, incluindo dias emprestados dos meses vizinhos.
Hoje `listSaidas(grade[0], grade[grade.length - 1])` (`Calendario.tsx:91`) carrega o
intervalo inteiro da grade, e `saidasDoDia` é chamado para toda célula — então, em
julho, **uma saída do dia 2 de agosto aparece na última linha**.

Isso é um defeito, e vale para a tela e para o PDF.

A célula do dia vizinho passa a ser **um bloco neutro e vazio, sem nem o número do
dia**. Ela continua existindo geometricamente, porque a semana precisa de 7 colunas.

O conserto é **estrutural, não cosmético**: `listSaidas` passa a receber o primeiro e
o último dia do mês (`iso(mes, 1)` até `iso({ano, mes: mes + 1}, 0)`), e a saída
vizinha deixa de existir no estado em vez de ser filtrada na hora de desenhar.

Duas consequências aceitas:

- A célula vazia **deixa de ser clicável**. Hoje ela navega para o outro mês
  (`Calendario.tsx:327-330`); os botões ‹ › do cabeçalho já fazem isso.
- `locaisUsados` passa a sugerir os pontos de encontro do mês exibido, não os da
  janela da grade. É uma melhora.

## Arquitetura

Espelha o Relatório, e reaproveita mais do que constrói.

### `src/lib/escala.ts` — modelagem pura

```ts
escalaDoMes(mes, saidas, territorios, publicadores, aviso, hoje?) : Escala
patamarDe(semanas: number, densidade: number) : Patamar
```

```
Escala       { titulo, geradoEm, aviso, semanas: SemanaEscala[], patamar }
SemanaEscala   DiaEscala[7]
DiaEscala    { data, dia, doMes, diaDaSemana, saidas: SaidaEscala[] }
SaidaEscala  { periodo, local, dirigente, territorios: string[], observacao }
```

A resolução de nomes acontece aqui: `publicador_id` vira `dirigente` — ou `"a
definir"`, a mesma string da tela — e `territorio_ids` viram números de território. **O
Document nunca recebe um id.** `local` continua anulável e o Document o omite, como a
tela faz.

`hoje` serve **apenas** para `geradoEm`, e é injetável para o teste não depender do
relógio. Ele não marca o dia atual na grade — ver "o que a folha não leva", abaixo.

A **densidade** (maior número de saídas num único dia do mês) é calculada dentro de
`escalaDoMes` e consumida por `patamarDe`; ela não aparece na `Escala`, que já carrega
o `patamar` resolvido. `patamarDe` fica exportada à parte para ser testada direto
contra a tabela.

### `src/pdf/EscalaPdf.tsx` — o Document

A4 paisagem. **Reaproveita `src/pdf/fontes.ts` inteiro** — Atkinson Next e Mono já
estão registradas, então não há trabalho de fonte neste design.

A célula mantém o vocabulário da tela: fundo com o matiz do dia da semana (tokens
`--color-dia-0..6`, tintas pálidas já pensadas para papel), número do dia no topo à
direita em mono, saídas empilhadas separadas por um fio. Por saída: "tarde" só quando
o período não é manhã, ponto de encontro em negrito `jwblue-deep`, dirigente abaixo, e
`"a definir"` em ocre itálico quando não há dirigente.

Duas coisas da tela que a folha não leva: o anel de **"hoje"**, sem sentido num cartaz
que fica no quadro o mês inteiro, e os **glyphs** dos territórios, que na grade viram
números.

A seção **"Avisos do mês"** só é desenhada quando há texto; sem ela, o espaço volta
para a grade.

O rodapé leva só `Gerado em dd/mm/aaaa`. **Não há "Página X de Y"**: o documento é de
uma página por construção, e numerar uma folha só chamaria atenção para a exceção que
a gente não quer.

### `src/screens/Calendario.tsx`

O botão vira "Baixar PDF" com `import()` dinâmico e `escala-2026-07.pdf`; falha vira
`toast.error`. **Fica sempre habilitado**, diferente do Relatório: um mês sem saídas
ainda é uma folha legítima para afixar, um relatório sem linhas não é.

Nada novo toca o Supabase — `Calendario` já carrega saídas, territórios, publicadores
e a nota (`Calendario.tsx:90-97`).

### `vite.config.ts`

`EscalaPdf*` entra no `globIgnores` do PWA, junto de `react-pdf*` e `RelatorioPdf*`.

## O fim do `@media print`

Com os dois botões exportando PDF, ninguém mais imprime pelo navegador — e o bloco em
`index.css:181` existe inteiro para isso. Ele é podado, não apagado:

- **Saem** `@page { size: A4 landscape }`, `.folha-grade` e `.folha-agenda`, que só
  serviam à grade do Calendário. O `@page` é o mais urgente: órfão, ele viraria de lado
  qualquer tela que alguém imprimisse por engano.
- **Ficam** `[data-casca]`, `.nao-imprime` e o fundo branco. `Ctrl+P` continua
  existindo no navegador quer a gente queira ou não, e essas três regras fazem um
  acidente desses render a tela limpa em retrato, em vez de um cabeçalho de app
  cortado.

Some junto o `.folha` das duas telas, que só carregava `print-color-adjust` para a
grade colorida.

## Testes

| Onde | O que prova |
|---|---|
| `src/lib/escala.test.ts` | `escalaDoMes` monta as semanas, resolve dirigente e territórios, e deixa os dias vizinhos vazios; `patamarDe` devolve a tabela |
| `src/pdf/EscalaPdf.test.tsx` | árvore de elementos: ponto de encontro acima do dirigente, "tarde" só à tarde, observação clampada |
| `src/pdf/verificacao.test.tsx` | **renderiza o PDF real e afirma 1 página** no pior caso: mês de 6 semanas, 3 saídas por dia, observações longas |
| `src/screens/Calendario.test.tsx` | botão, nome do arquivo, e que saída de mês vizinho não aparece mais |

O terceiro carrega o peso. "Sempre uma página" é a promessa central da decisão, e só um
render real a prova — a tabela de patamares, por si, não prova nada.

## Fora de escopo

- Agenda cronológica no PDF (o público é o quadro de avisos).
- Exportar mais de um mês numa passada.
- Qualquer mudança no `SaidaForm` ou no fluxo de marcar quadras.
- Reintroduzir impressão pelo navegador como caminho suportado.

## Pendência conhecida

O destravamento de `overflow` no `@media print` foi entregue no commit anterior com
teste e build verdes, mas **nunca foi conferido visualmente num navegador**. Este
design torna a questão quase irrelevante — o Calendário deixa de depender da impressão
— mas a regra `[data-casca]` permanece no CSS e segue sem verificação visual.
