import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { BaseMap } from "../map/BaseMap";
import { TerritoriosLayer } from "../map/TerritoriosLayer";
import {
  listTerritorios,
  statusTerritorio,
  boundsDeTerritorios,
  type StatusTerritorio,
} from "../lib/territorios";
import { designacoesAbertas } from "../lib/designacoes";
import type { Territorio, Designacao } from "../lib/types";
import { RadarLoader } from "../components/RadarLoader";
import { Button } from "@/components/ui/button";

const LEGENDA: { status: StatusTerritorio; cor: string; rotulo: string }[] = [
  { status: "disponivel", cor: "#5c8a76", rotulo: "Disponível" },
  { status: "designado", cor: "#486492", rotulo: "Designado" },
  { status: "inativo", cor: "#98a1ae", rotulo: "Inativo" },
];

function BotaoVoltar() {
  return (
    <Link
      to="/"
      className="absolute left-3 top-3 z-10 inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-white/90 px-2.5 text-[0.85rem] font-medium text-ink shadow-card backdrop-blur transition-colors hover:text-jwblue"
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      Territórios
    </Link>
  );
}

export function Mapa() {
  const [territorios, setTerritorios] = useState<Territorio[]>([]);
  const [abertas, setAbertas] = useState<Designacao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([listTerritorios(), designacoesAbertas()])
      .then(([t, d]) => {
        setTerritorios(t);
        setAbertas(d);
      })
      .finally(() => setCarregando(false));
  }, []);

  const statusDe = useMemo(() => {
    const abertaDe = new Map(abertas.map((d) => [d.territorio_id, d]));
    return (t: Territorio) => statusTerritorio(t, abertaDe.get(t.id));
  }, [abertas]);

  const bounds = useMemo(() => boundsDeTerritorios(territorios), [territorios]);
  const semMapa = territorios.filter((t) => !t.limites).length;

  if (carregando) return <RadarLoader texto="Abrindo o mapa…" />;

  if (!bounds)
    return (
      <div className="grid h-[100dvh] place-items-center bg-paper px-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <svg
            className="h-14 w-14 text-ink-faint"
            viewBox="0 0 100 100"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M20 34 L50 20 L80 34 L80 68 L50 82 L20 68 Z"
              stroke="currentColor"
              strokeWidth="6"
              strokeLinejoin="round"
              strokeDasharray="7 8"
            />
          </svg>
          <div className="grid gap-1">
            <h1 className="text-lg font-semibold text-ink">
              Nenhum território mapeado ainda
            </h1>
            <p className="text-[0.9rem] text-ink-soft">
              Desenhe o limite de um território para vê-lo aqui no mapa.
            </p>
          </div>
          <Button asChild>
            <Link to="/cadastro">Cadastrar território</Link>
          </Button>
        </div>
      </div>
    );

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden">
      <BaseMap bounds={bounds}>
        <TerritoriosLayer
          territorios={territorios}
          statusDe={statusDe}
          onSelect={(id) => navigate(`/campo/${id}`)}
        />
      </BaseMap>

      <BotaoVoltar />

      <div className="absolute bottom-3 left-3 z-10 grid gap-1.5 rounded-lg border border-line bg-white/90 px-3 py-2.5 shadow-card backdrop-blur">
        {LEGENDA.map((l) => (
          <div key={l.status} className="flex items-center gap-2 text-[0.8rem] text-ink">
            <span
              className="size-2.5 flex-none rounded-full"
              style={{ backgroundColor: l.cor }}
              aria-hidden="true"
            />
            {l.rotulo}
          </div>
        ))}
        {semMapa > 0 && (
          <p className="mt-1 border-t border-line pt-1.5 text-[0.72rem] text-ink-soft">
            {semMapa === 1
              ? "1 território ainda sem mapa"
              : `${semMapa} territórios ainda sem mapa`}
          </p>
        )}
      </div>
    </div>
  );
}
