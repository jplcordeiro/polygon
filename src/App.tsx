import { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useSession } from "./auth/useSession";
import { Login } from "./auth/Login";
import { NovaSenha } from "./auth/NovaSenha";
import { AdminContext, ehAdmin, inicioDe } from "./auth/papel";
import { Gestao } from "./screens/Gestao";
import { Cadastro } from "./screens/Cadastro";
import { Campo } from "./screens/Campo";
import { MarcarQuadras } from "./screens/MarcarQuadras";
import { Mapa } from "./screens/Mapa";
import { Calendario } from "./screens/Calendario";
import { Publicadores } from "./screens/Publicadores";
import { LocatorSeal } from "./components/LocatorSeal";
import { AppShell } from "./components/AppShell";

function AppBoot() {
  return (
    <main
      className="grid min-h-dvh place-items-center px-4"
      role="status"
      aria-label="Carregando polygon"
    >
      <div className="flex flex-col items-center">
        <LocatorSeal tracing />
        <h1 className="mt-6 text-2xl font-semibold tracking-tight text-jwblue-deep">
          polygon
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          Territórios de campo da congregação
        </p>
      </div>
    </main>
  );
}

export default function App() {
  const { session, loading, recuperando, fimDaRecuperacao } = useSession();
  const userId = session?.user.id;
  const [admin, setAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    setAdmin(null);
    if (userId) ehAdmin(userId).then(setAdmin, () => setAdmin(false));
  }, [userId]);

  if (loading) return <AppBoot />;
  if (!session) return <Login />;
  if (recuperando) return <NovaSenha onPronto={fimDaRecuperacao} />;
  if (admin === null) return <AppBoot />;
  return (
    <AdminContext.Provider value={admin}>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/mapa" element={<Mapa />} />
          <Route path="/calendario" element={<Calendario />} />
          {admin && (
            <>
              <Route path="/" element={<Gestao />} />
              <Route path="/publicadores" element={<Publicadores />} />
            </>
          )}
        </Route>
        <Route path="/campo/:id" element={<Campo />} />
        {admin && (
          <>
            <Route path="/cadastro" element={<Cadastro />} />
            <Route path="/cadastro/:id" element={<Cadastro />} />
            <Route
              path="/saida/:saidaId/territorio/:territorioId"
              element={<MarcarQuadras />}
            />
          </>
        )}
        <Route path="*" element={<Navigate to={inicioDe(admin)} replace />} />
      </Routes>
    </AdminContext.Provider>
  );
}
