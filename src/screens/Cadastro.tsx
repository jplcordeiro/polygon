import { useState, useCallback, useEffect } from "react";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import { useControl } from "react-map-gl/mapbox";
import { BaseMap } from "../map/BaseMap";
import type { ViewState } from "../map/BaseMap";
import { criarTerritorio } from "../lib/territorios";

// Registra o mapbox-gl-draw como controle do mapa e reporta o polígono desenhado.
function DrawControl({ onChange }: { onChange: (p: GeoJSON.Polygon | null) => void }) {
  useControl<MapboxDraw>(
    () =>
      new MapboxDraw({
        displayControlsDefault: false,
        controls: { polygon: true, trash: true },
      }),
    // onAdd
    (evt) => {
      // O tipo do mapa aqui não declara os eventos custom "draw.*".
      const map = evt.map as unknown as {
        on: (ev: string, cb: (e: { features?: GeoJSON.Feature[] }) => void) => void;
      };
      const upd = (e: { features?: GeoJSON.Feature[] }) => {
        const f = e.features?.[0];
        onChange(f ? (f.geometry as GeoJSON.Polygon) : null);
      };
      map.on("draw.create", upd);
      map.on("draw.update", upd);
      map.on("draw.delete", () => onChange(null));
    },
  );
  return null;
}

export function Cadastro() {
  const [numero, setNumero] = useState("");
  const [nome, setNome] = useState("");
  const [polygon, setPolygon] = useState<GeoJSON.Polygon | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [inicial, setInicial] = useState<ViewState | undefined>(undefined);
  const [mapaPronto, setMapaPronto] = useState(false);
  const onChange = useCallback((p: GeoJSON.Polygon | null) => setPolygon(p), []);

  // Centraliza o mapa na localização do usuário ao abrir a tela de cadastro.
  useEffect(() => {
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
      () => setMapaPronto(true), // permissão negada / erro → usa o padrão
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }, []);

  async function salvar() {
    if (!numero || !polygon) return;
    setSalvando(true);
    try {
      await criarTerritorio({ numero, nome: nome || undefined, limites: polygon });
      setNumero("");
      setNome("");
      setPolygon(null);
      alert("Território salvo.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      alert(
        msg.includes("duplicate")
          ? "Já existe um território com esse número."
          : "Erro ao salvar.",
      );
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div style={{ display: "grid", gridTemplateRows: "auto 1fr", height: "100dvh" }}>
      <div style={{ display: "flex", gap: 8, padding: 8 }}>
        <input
          placeholder="Número*"
          value={numero}
          onChange={(e) => setNumero(e.target.value)}
        />
        <input
          placeholder="Nome (opcional)"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />
        <button onClick={salvar} disabled={!numero || !polygon || salvando}>
          Salvar
        </button>
      </div>
      {mapaPronto ? (
        <BaseMap showLocation initialViewState={inicial}>
          <DrawControl onChange={onChange} />
        </BaseMap>
      ) : (
        <div style={{ display: "grid", placeItems: "center", height: "100%" }}>
          Obtendo sua localização…
        </div>
      )}
    </div>
  );
}
