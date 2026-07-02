import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listTerritorios, setAtivo, statusTerritorio, excluirTerritorio } from "../lib/territorios";
import { listPublicadores, criarPublicador } from "../lib/publicadores";
import { designacoesAbertas, designar, devolver } from "../lib/designacoes";
import type { Territorio, Publicador, Designacao } from "../lib/types";

export function Gestao() {
  const [territorios, setTerritorios] = useState<Territorio[]>([]);
  const [publicadores, setPublicadores] = useState<Publicador[]>([]);
  const [abertas, setAbertas] = useState<Designacao[]>([]);
  const [novoNome, setNovoNome] = useState("");
  const [novoTel, setNovoTel] = useState("");

  async function carregar() {
    const [t, p, d] = await Promise.all([
      listTerritorios(),
      listPublicadores(),
      designacoesAbertas(),
    ]);
    setTerritorios(t);
    setPublicadores(p);
    setAbertas(d);
  }
  useEffect(() => {
    carregar();
  }, []);

  const abertaDe = (tid: string) => abertas.find((d) => d.territorio_id === tid);
  const nomePub = (pid: string) =>
    publicadores.find((p) => p.id === pid)?.nome ?? "?";

  async function addPublicador() {
    if (!novoNome) return;
    await criarPublicador({ nome: novoNome, telefone: novoTel || undefined });
    setNovoNome("");
    setNovoTel("");
    carregar();
  }

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

  return (
    <div style={{ padding: 12, display: "grid", gap: 24 }}>
      <nav style={{ display: "flex", gap: 12 }}>
        <Link to="/cadastro">Cadastrar território</Link>
      </nav>

      <section>
        <h2>Territórios</h2>
        <table>
          <thead>
            <tr>
              <th>Nº</th>
              <th>Nome</th>
              <th>Status</th>
              <th>Ação</th>
            </tr>
          </thead>
          <tbody>
            {territorios.map((t) => {
              const d = abertaDe(t.id);
              const status = statusTerritorio(t, d);
              return (
                <tr key={t.id}>
                  <td>
                    <Link to={`/campo/${t.id}`}>{t.numero}</Link>
                  </td>
                  <td>{t.nome ?? "—"}</td>
                  <td>
                    {status === "designado"
                      ? `Designado a ${nomePub(d!.publicador_id)} (desde ${d!.data_saida})`
                      : status === "inativo"
                        ? "Inativo"
                        : "Disponível"}
                  </td>
                  <td>
                    {d ? (
                      <button
                        onClick={async () => {
                          await devolver(d.id);
                          carregar();
                        }}
                      >
                        Devolver
                      </button>
                    ) : (
                      <select
                        defaultValue=""
                        onChange={async (e) => {
                          if (e.target.value) {
                            await designar(t.id, e.target.value);
                            carregar();
                          }
                        }}
                      >
                        <option value="" disabled>
                          Designar a…
                        </option>
                        {publicadores.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nome}
                          </option>
                        ))}
                      </select>
                    )}
                    <label style={{ marginLeft: 8 }}>
                      <input
                        type="checkbox"
                        checked={t.ativo}
                        onChange={async (e) => {
                          await setAtivo(t.id, e.target.checked);
                          carregar();
                        }}
                      />{" "}
                      ativo
                    </label>
                    <button
                      style={{ marginLeft: 8 }}
                      onClick={() => excluir(t)}
                    >
                      Excluir
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section>
        <h2>Publicadores</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            placeholder="Nome*"
            value={novoNome}
            onChange={(e) => setNovoNome(e.target.value)}
          />
          <input
            placeholder="Telefone"
            value={novoTel}
            onChange={(e) => setNovoTel(e.target.value)}
          />
          <button onClick={addPublicador} disabled={!novoNome}>
            Adicionar
          </button>
        </div>
        <ul>
          {publicadores.map((p) => (
            <li key={p.id}>
              {p.nome}
              {p.telefone ? ` — ${p.telefone}` : ""}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
