# Territórios existentes como referência ao cadastrar — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mostrar os territórios já cadastrados como pano de fundo (contorno + número) na tela `Cadastro`, apenas ao criar um território novo, para não desenhar por cima dos vizinhos.

**Architecture:** Uma função pura em `territorios.ts` monta a `FeatureCollection` de referência (um `MultiPolygon` por território, carregando o `numero`). Um componente de mapa novo e não-interativo, `TerritoriosReferencia`, renderiza essa coleção como linha discreta + rótulo `symbol`, sem `fill` e sem handlers de clique. `Cadastro` busca os territórios no ramo de criação e monta o componente dentro do `BaseMap`, junto do `DrawControl`.

**Tech Stack:** React 19 + TypeScript, `react-map-gl/mapbox` (`Source`/`Layer`), Mapbox GL, Vitest + Testing Library.

## Global Constraints

- **Sem comentários no código** — nomes claros bastam (regra do CLAUDE.md).
- Importar componentes de mapa de **`react-map-gl/mapbox`**, nunca de `react-map-gl`.
- A UI nunca chama `supabase` direto — só a camada `src/lib`.
- Trabalho **só no modo de criação** (`Cadastro` sem `:id`); o modo edição não muda.
- **Não tocar nem commitar** `src/map/TerritoriosLayer.tsx` e `src/screens/Mapa.tsx` — têm alterações não commitadas de outro trabalho em andamento. Cada commit deste plano deve stage-ar apenas os arquivos da sua task.
- Estado e progresso são derivados; esta feature é só visual — não cria tabela nem coluna.

---

### Task 1: Função pura `colecaoReferencia`

Monta a `FeatureCollection` de referência a partir de uma lista de territórios: um `Feature`/`MultiPolygon` por território **que tenha limites**, carregando `numero` nas properties. Territórios sem mapa (`limites` nulo) são omitidos.

**Files:**
- Modify: `src/lib/territorios.ts` (adicionar a função exportada, junto de `geometriaDe`/`boundsDeTerritorios`)
- Test: `src/lib/territorios.test.ts` (novo `describe`)

**Interfaces:**
- Consumes: `geometriaDe(limites: Limites | null): GeoJSON.MultiPolygon | null` (já existe), tipo `Territorio` de `./types`.
- Produces: `colecaoReferencia(territorios: Territorio[]): GeoJSON.FeatureCollection<GeoJSON.MultiPolygon>` — cada feature tem `properties: { numero: string }`.

- [ ] **Step 1: Escrever o teste que falha**

Adicionar ao fim de `src/lib/territorios.test.ts` (o helper `quadrado`, o tipo e o fixture `base` já existem no arquivo):

```ts
describe("colecaoReferencia", () => {
  it("gera uma feature por território com mapa, carregando o número", () => {
    const ts: Territorio[] = [
      { ...base, id: "t1", numero: "12", limites: quadrado(-46, -23) },
      { ...base, id: "t2", numero: "13", limites: quadrado(-45, -22) },
    ];
    const fc = colecaoReferencia(ts);
    expect(fc.type).toBe("FeatureCollection");
    expect(fc.features).toHaveLength(2);
    expect(fc.features[0].geometry.type).toBe("MultiPolygon");
    expect(fc.features.map((f) => f.properties?.numero)).toEqual(["12", "13"]);
  });

  it("omite territórios sem mapa", () => {
    const ts: Territorio[] = [
      { ...base, id: "t1", numero: "12", limites: null },
      { ...base, id: "t2", numero: "13", limites: quadrado(-45, -22) },
    ];
    const fc = colecaoReferencia(ts);
    expect(fc.features).toHaveLength(1);
    expect(fc.features[0].properties?.numero).toBe("13");
  });
});
```

Atualizar o `import` no topo de `src/lib/territorios.test.ts` para incluir `colecaoReferencia`:

```ts
import {
  statusTerritorio,
  boundsDeTerritorios,
  quadrasDe,
  limitesDe,
  featureCollectionDe,
  colecaoReferencia,
} from "./territorios";
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `npx vitest run src/lib/territorios.test.ts -t "colecaoReferencia"`
Expected: FAIL — `colecaoReferencia is not a function` (ou erro de import).

- [ ] **Step 3: Implementar a função**

Adicionar em `src/lib/territorios.ts`, logo depois de `geometriaDe` (que já existe):

```ts
export function colecaoReferencia(
  territorios: Territorio[],
): GeoJSON.FeatureCollection<GeoJSON.MultiPolygon> {
  return {
    type: "FeatureCollection",
    features: territorios
      .map((t) => ({ t, geometry: geometriaDe(t.limites) }))
      .filter(
        (x): x is { t: Territorio; geometry: GeoJSON.MultiPolygon } => !!x.geometry,
      )
      .map(({ t, geometry }) => ({
        type: "Feature",
        geometry,
        properties: { numero: t.numero },
      })),
  };
}
```

- [ ] **Step 4: Rodar o teste e ver passar**

Run: `npx vitest run src/lib/territorios.test.ts -t "colecaoReferencia"`
Expected: PASS (2 testes).

- [ ] **Step 5: Commit**

```bash
git add src/lib/territorios.ts src/lib/territorios.test.ts
git commit -m "feat(territorios): colecaoReferencia para pano de fundo do cadastro"
```

---

### Task 2: Componente `TerritoriosReferencia`

Camada de mapa **não-interativa**: renderiza a coleção de referência como uma linha discreta (com casing branco fino para legibilidade) e um rótulo `symbol` com o `numero`. Sem `fill` (não escurece o mapa) e sem nenhum handler de clique (os toques passam direto para o `DrawControl`). Usa ids de fonte/camada próprios (`referencia-*`), que não colidem com os do `DrawControl` nem com os do `TerritorioPolygon`.

**Files:**
- Create: `src/map/TerritoriosReferencia.tsx`

**Interfaces:**
- Consumes: `colecaoReferencia(territorios: Territorio[])` (Task 1), tipo `Territorio` de `../lib/types`, `Source`/`Layer` de `react-map-gl/mapbox`.
- Produces: `TerritoriosReferencia({ territorios }: { territorios: Territorio[] })` — componente React que renderiza um `<Source>` com camadas de linha e rótulo.

- [ ] **Step 1: Criar o componente**

Criar `src/map/TerritoriosReferencia.tsx`:

```tsx
import { Source, Layer } from "react-map-gl/mapbox";
import type { Territorio } from "../lib/types";
import { colecaoReferencia } from "../lib/territorios";

export function TerritoriosReferencia({
  territorios,
}: {
  territorios: Territorio[];
}) {
  const data = colecaoReferencia(territorios);
  if (data.features.length === 0) return null;

  return (
    <Source id="referencia" type="geojson" data={data}>
      <Layer
        id="referencia-casing"
        type="line"
        layout={{ "line-join": "round" }}
        paint={{ "line-color": "#ffffff", "line-width": 4, "line-opacity": 0.7 }}
      />
      <Layer
        id="referencia-line"
        type="line"
        layout={{ "line-join": "round" }}
        paint={{ "line-color": "#98a1ae", "line-width": 1.75, "line-opacity": 0.9 }}
      />
      <Layer
        id="referencia-label"
        type="symbol"
        layout={{
          "text-field": ["get", "numero"],
          "text-size": 13,
          "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
          "text-allow-overlap": false,
        }}
        paint={{
          "text-color": "#67707d",
          "text-halo-color": "#ffffff",
          "text-halo-width": 1.5,
        }}
      />
    </Source>
  );
}
```

- [ ] **Step 2: Verificar tipos e build**

Run: `npm run build`
Expected: PASS — `tsc -b` sem erros e o bundle é gerado. (O componente é presentational e casa com o padrão já existente de `TerritoriosLayer`, que também não tem teste unitário; a verificação visual acontece na Task 3, no app rodando.)

- [ ] **Step 3: Commit**

```bash
git add src/map/TerritoriosReferencia.tsx
git commit -m "feat(map): TerritoriosReferencia, camada de contorno + número não-interativa"
```

---

### Task 3: Ligar a referência no `Cadastro`

No ramo de **criação** (sem `id`), buscar os territórios e guardá-los para montar a referência; renderizar `<TerritoriosReferencia>` dentro do `BaseMap`, **antes** do `<DrawControl>`, para as camadas do desenho ficarem por cima. Uma falha ao buscar não bloqueia o cadastro.

**Files:**
- Modify: `src/screens/Cadastro.tsx`
- Test: `src/screens/Cadastro.test.tsx`

**Interfaces:**
- Consumes: `TerritoriosReferencia` (Task 2), `listTerritorios()` (já importado em `Cadastro.tsx`).
- Produces: nenhuma nova API pública.

- [ ] **Step 1: Escrever o teste que falha**

Em `src/screens/Cadastro.test.tsx`, adicionar dentro do `describe("Cadastro", ...)` um teste que verifica que a criação busca os territórios para referência (hoje `listTerritorios` só é chamado no modo edição). `listTerritorios` já é mockado no topo do arquivo retornando `[]`.

```ts
it("no modo de criação, busca os territórios para referência", async () => {
  const { listTerritorios } = await import("../lib/territorios");
  renderCadastro();
  await waitFor(() => expect(listTerritorios).toHaveBeenCalled());
});
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `npx vitest run src/screens/Cadastro.test.tsx -t "busca os territórios para referência"`
Expected: FAIL — `expected "listTerritorios" to be called at least once` (no modo criação ele ainda não é chamado).

- [ ] **Step 3: Adicionar o estado de referência**

Em `src/screens/Cadastro.tsx`, adicionar o import do componente junto dos outros imports de `../map`:

```tsx
import { TerritoriosReferencia } from "../map/TerritoriosReferencia";
```

E declarar o estado, junto dos outros `useState` do componente `Cadastro` (perto de `const [marcadas, setMarcadas] = useState(0);`):

```tsx
const [referencia, setReferencia] = useState<Territorio[]>([]);
```

Garantir que `Territorio` está importado. Ajustar o import de tipos no topo do arquivo (ele hoje não importa `Territorio`):

```tsx
import type { Territorio } from "../lib/types";
```

- [ ] **Step 4: Buscar os territórios no ramo de criação**

Ainda em `src/screens/Cadastro.tsx`, dentro do `useEffect(..., [id, navigate])`, no ramo de criação (o trecho que hoje começa em `if (!navigator.geolocation)` / faz `navigator.geolocation.getCurrentPosition`), buscar a referência **antes** de lidar com a geolocalização. Substituir o início do ramo de criação por:

```tsx
    listTerritorios()
      .then(setReferencia)
      .catch(() => setReferencia([]));

    if (!navigator.geolocation) {
      setMapaPronto(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setInicial({
          longitude: pos.coords.longitude,
          latitude: pos.coords.latitude,
          zoom: 16,
        });
        setMapaPronto(true);
      },
      () => setMapaPronto(true),
      { enableHighAccuracy: true, timeout: 8000 },
    );
```

(O `return;` do ramo de `id` acima permanece, então este bloco só roda na criação.)

- [ ] **Step 5: Renderizar a referência dentro do `BaseMap`**

Em `src/screens/Cadastro.tsx`, no JSX, adicionar `<TerritoriosReferencia>` **antes** do `<DrawControl>` (só na criação, quando não há `id`):

```tsx
          <BaseMap
            showLocation={!id}
            initialViewState={inicial}
            bounds={enquadramento}
          >
            {!id && <TerritoriosReferencia territorios={referencia} />}
            <DrawControl desenhoInicial={desenhoInicial} onChange={onChange} />
          </BaseMap>
```

- [ ] **Step 6: Rodar o teste novo e ver passar**

Run: `npx vitest run src/screens/Cadastro.test.tsx -t "busca os territórios para referência"`
Expected: PASS.

- [ ] **Step 7: Rodar a suíte do Cadastro inteira (sem regressão)**

Run: `npx vitest run src/screens/Cadastro.test.tsx`
Expected: PASS — todos os testes, incluindo os de edição (o mock de `listTerritorios` retorna `[]` por padrão e é sobrescrito no `renderEdicao`).

- [ ] **Step 8: Verificar tipos e build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/screens/Cadastro.tsx src/screens/Cadastro.test.tsx
git commit -m "feat(cadastro): mostra territórios existentes como referência ao criar"
```

---

## Verificação visual (após as 3 tasks)

Com `npm run dev`, abrir a tela de cadastro de território novo numa área que já tenha territórios cadastrados por perto e confirmar:
- Os territórios existentes aparecem como contorno discreto com o número no centro.
- É possível desenhar por cima/ao lado normalmente — o contorno de referência não captura os toques.
- Ao editar um território existente, nada de referência aparece (comportamento inalterado).
