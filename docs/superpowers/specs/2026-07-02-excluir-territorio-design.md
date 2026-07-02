# Excluir território — design

**Data:** 2026-07-02
**Status:** aprovado

## Objetivo

Permitir que o servo de territórios **exclua um território** cadastrado. Caso de uso
principal: **corrigir cadastro errado** (polígono/número errado ou duplicado), logo
após criar. Não é para arquivar territórios antigos com histórico.

## Regra central

Exclusão **real (hard delete)**, permitida **somente quando o território não tem
nenhuma designação** — nem aberta, nem histórica (devolvida).

O banco já garante isso: `designacao.territorio_id` referencia `territorio(id)`
com `on delete restrict`. Se existir qualquer designação, o `DELETE` no território
falha com violação de foreign key (código Postgres `23503`). Não escrevemos
verificação própria no app — o banco é a fonte da verdade.

## Sem mudança de schema

- Nenhuma migration. O `on delete restrict` já existe em `0001_init.sql`.
- RLS: a política `auth_full_territorio` é `for all to authenticated`, então já
  cobre `DELETE`. Nada a alterar.

## Camada de dados — `src/lib/territorios.ts`

Nova função, no mesmo padrão fino de `criarTerritorio` / `setAtivo`:

```ts
export async function excluirTerritorio(id: string): Promise<void> {
  const { error } = await supabase.from("territorio").delete().eq("id", id);
  if (error) throw error; // 23503 = território tem designação; tratado na UI
}
```

A UI nunca chama `supabase` direto — mantém a regra de arquitetura do projeto.

## UI — `src/screens/Gestao.tsx`

Botão **"Excluir"** em cada linha da tabela de Territórios, na célula de Ação
(ao lado dos controles existentes de designar/devolver e do checkbox "ativo").

Fluxo ao clicar:

1. `window.confirm("Excluir o território Nº <numero>? Esta ação não pode ser desfeita.")`
2. Se confirmado, chama `excluirTerritorio(t.id)` e, no sucesso, `carregar()` para
   atualizar a lista.
3. Se o erro tiver `code === "23503"`, mostra
   `alert("Não é possível excluir: este território tem histórico de designações.")`.
4. Qualquer outro erro: `alert` com mensagem genérica de falha.

O botão aparece em **todas** as linhas. O histórico de designações devolvidas não
está carregado na tela, então não dá para esconder o botão com precisão; confiar no
`on delete restrict` + tratamento de erro é o caminho honesto e mínimo.

## Fluxo de dados e erros

```
UI (Excluir) → window.confirm → excluirTerritorio(id) → Supabase DELETE
   ├─ sucesso        → carregar() recarrega a lista
   ├─ erro 23503     → alert "tem histórico de designações"
   └─ outro erro     → alert genérico
```

Sem estado novo no componente, sem componente novo.

## Testes

- `statusTerritorio` (lógica pura já coberta) não muda.
- `excluirTerritorio` é um wrapper fino sobre o Supabase — mesmo padrão de
  `criarTerritorio`/`setAtivo`, que não têm teste unitário. Verificação **manual**
  pela app:
  - Criar um território novo (sem designação) e excluí-lo → some da lista.
  - Tentar excluir um território que tem designação → aparece o aviso e ele
    permanece.

## Fora de escopo

- Soft delete / arquivamento.
- Exclusão em cascata do histórico de designações.
- Tela de edição de território.
- Confirmação por digitação do número (um `confirm()` basta para o caso de uso).
