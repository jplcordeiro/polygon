# polygon
Repositório para facilitar a organização e localização dos territórios de campo da congregação

## Deploy

O app é publicado na Vercel a partir da branch `main`: cada push dispara `npm run build`
e publica o `dist/`. Produção: https://polygon-sandy.vercel.app

As variáveis de ambiente ficam no painel da Vercel (Settings → Environment Variables),
nos ambientes Production e Preview:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_MAPBOX_TOKEN`

O `SUPABASE_ACCESS_TOKEN` do `.env` **não** vai para lá — é credencial de administrador
e não participa do build.

O `vercel.json` reescreve qualquer rota não encontrada para o `index.html`. Sem isso,
abrir uma rota profunda direto na barra de endereço (`/campo/3`) devolveria 404: o
roteamento é do react-router, e o CDN não sabe disso.

### Token do Mapbox

O token vai no bundle público, então qualquer pessoa consegue lê-lo. A proteção prevista
é a restrição por URL (account.mapbox.com → Tokens → URL restrictions), que hoje **não
está configurada**: o token responde a qualquer origem. Ao configurá-la, a lista precisa
incluir o domínio de produção **e** os endereços de desenvolvimento (`npm run dev` em
`localhost:3000` e `npm run all` na LAN em `:3001`) — senão o mapa para de renderizar
localmente. O sintoma de uma URL faltando na lista é mapa em branco, sem mensagem de
erro.
