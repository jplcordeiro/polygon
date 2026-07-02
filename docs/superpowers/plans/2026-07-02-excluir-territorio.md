# Excluir território — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir excluir (hard delete) um território pela tela de Gestão, bloqueando naturalmente quando ele tem designações.

**Architecture:** Uma função fina de dados `excluirTerritorio(id)` em `src/lib/territorios.ts` chama `supabase.delete()`. O banco já protege com `on delete restrict` na FK de `designacao` → o DELETE falha com código `23503` se houver designação. A UI (`Gestao.tsx`) ganha um botão "Excluir" por linha, com `window.confirm()` e tratamento amigável do erro `23503`. Sem migration, sem mudança de RLS.

**Tech Stack:** React 19 + TypeScript + Vite, Supabase JS client, Vitest.

## Global Constraints

- A UI **nunca** chama `supabase` direto — só através da camada `src/lib/*`.
- Sem mudança de schema e sem migration (o `on delete restrict` já existe em `0001_init.sql`; RLS `auth_full_territorio` já é `for all`).
- Escopo: hard delete só de território sem designação. Sem soft delete, sem cascade, sem tela de edição.
- Build/typecheck: `npm run build`. Testes: `npm run test`.

---

### Task 1: Função de dados `excluirTerritorio` + botão Excluir na Gestão

**Files:**
- Modify: `src/lib/territorios.ts` (adicionar `excluirTerritorio` ao final, após `setAtivo`)
- Modify: `src/screens/Gestao.tsx` (importar `excluirTerritorio`; adicionar handler + botão na célula de Ação)

**Interfaces:**
- Produces: `excluirTerritorio(id: string): Promise<void>` — deleta o território; lança o erro do Supabase (código `23503` quando há designação).

- [ ] **Step 1: Adicionar `excluirTerritorio` em `src/lib/territorios.ts`**

Adicione ao final do arquivo, seguindo o padrão de `setAtivo`:

```ts
export async function excluirTerritorio(id: string): Promise<void> {
  const { error } = await supabase.from("territorio").delete().eq("id", id);
  if (error) throw error; // 23503 = território tem designação; tratado na UI
}
```

- [ ] **Step 2: Typecheck da camada de dados**

Run: `npm run build`
Expected: PASS (sem erros de tipo). A função ainda não é usada, mas deve compilar.

- [ ] **Step 3: Importar `excluirTerritorio` em `src/screens/Gestao.tsx`**

Na linha de import de `../lib/territorios`, adicione `excluirTerritorio`:

```ts
import { listTerritorios, setAtivo, statusTerritorio, excluirTerritorio } from "../lib/territorios";
```

- [ ] **Step 4: Adicionar o handler de exclusão dentro do componente `Gestao`**

Logo após a função `addPublicador` (antes do `return`), adicione:

```tsx
  async function excluir(t: Territorio) {
    if (!window.confirm(`Excluir o território Nº ${t.numero}? Esta ação não pode ser desfeita.`))
      return;
    try {
      await excluirTerritorio(t.id);
      carregar();
    } catch (err) {
      if ((err as { code?: string }).code === "23503") {
        alert("Não é possível excluir: este território tem histórico de designações.");
      } else {
        alert("Não foi possível excluir o território. Tente novamente.");
      }
    }
  }
```

- [ ] **Step 5: Adicionar o botão "Excluir" na célula de Ação**

Na célula `<td>` de Ação, logo depois do `<label>...ativo</label>` (por volta da linha 116, ainda dentro do mesmo `<td>`), adicione o botão:

```tsx
                    <button
                      style={{ marginLeft: 8 }}
                      onClick={() => excluir(t)}
                    >
                      Excluir
                    </button>
```

- [ ] **Step 6: Typecheck do app inteiro**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 7: Verificação manual pela app**

Run: `npm run dev`
Faça login e vá para a tela de Gestão. Verifique:
- Criar/usar um território **sem** designação → clicar "Excluir" → confirmar → some da lista.
- Em um território **com** designação (aberta ou já devolvida) → clicar "Excluir" → confirmar → aparece o aviso "tem histórico de designações" e ele **permanece** na lista.
- Cancelar o `confirm()` → nada acontece.

- [ ] **Step 8: Commit**

```bash
git add src/lib/territorios.ts src/screens/Gestao.tsx
git commit -m "feat(gestao): excluir território (bloqueado quando há designação)"
```

---

## Self-Review

**Spec coverage:**
- Hard delete só sem designação → banco `on delete restrict` (Step 1) + aviso `23503` (Step 4). ✓
- Sem schema/migration/RLS → Global Constraints + nada de SQL no plano. ✓
- Camada de dados fina espelhando `setAtivo` → Step 1. ✓
- UI nunca chama supabase direto → botão chama `excluir` → `excluirTerritorio`. ✓
- Botão por linha + `confirm()` + recarrega → Steps 4–5. ✓
- Testes: verificação manual (wrapper fino, sem lógica pura nova) → Step 7. ✓

**Placeholder scan:** sem TBD/TODO; todo código está escrito. ✓

**Type consistency:** `excluirTerritorio(id: string): Promise<void>` definido no Step 1 e consumido igual no Step 3/4. `Territorio` já importado em `Gestao.tsx`. `carregar` já existe no componente. ✓
