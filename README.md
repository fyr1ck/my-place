# My Place

Site pessoal, interface inspirada no iOS. Uma intro de boas-vindas aparece e some sozinha
em ~3s (clique ou tecla pula), depois entram o widget "Tocando agora" do Spotify (fixo no
canto esquerdo) e a area principal com as secoes:

| secao | o que da para fazer |
| ----- | ------------------- |
| **Inicio** | painel de widgets: relogio, tempo, e um resumo de cada secao (toque leva para ela) |
| **Calendario** | ano inteiro, semana de segunda a domingo; clique num dia para anotar o que tem nele |
| **Tarefas** | lista com data opcional, marcar como feita, limpar concluidas |
| **Anotacoes** | varias notas com titulo e texto, salvas automaticamente |
| **Arquivos** | arraste arquivos (ficam no navegador), baixe ou apague |
| **Rotina** | itens com horario; os checks valem para o dia de hoje |
| **Academia** | treinos com exercicios (series, reps, carga) e registro de treinos feitos |

No canto direito fica o **perfil**: clique na foto redonda ou no icone de camera da capa para
subir uma imagem ou gif do aparelho; o nome e a bio sao campos — clique e escreva. Em telas
menores que 1360px o perfil vai para o topo do conteudo.

Enquadramento da foto e da capa (as duas funcionam igual):

| gesto | o que faz |
| ----- | --------- |
| arrastar | posiciona a imagem dentro do recorte |
| roda do mouse | zoom de 1x a 4x |
| duplo clique | volta ao centro, sem zoom |
| clique (na foto) | troca a imagem |

A posicao fica salva em `mp.profileView` e e reiniciada quando voce sobe uma imagem nova.

O botao de paleta, no canto direito do card, abre as duas cores do widget (topo e base) — o
card vira um gradiente de cima para baixo. "Cor padrao" volta ao cinza translucido original.
Fica salvo em `mp.profileColors`.

O site sempre abre no **Inicio**. Tudo comeca vazio. Os dados ficam **nesta maquina**: textos no `localStorage` e arquivos no
IndexedDB do navegador — nada sai daqui e nada e enviado para nenhum servidor.

## Acesso

O site e restrito a um unico e-mail, definido em `auth.js`:

```js
const EMAIL = 'joao.jhcc19@gmail.com';
```

No primeiro acesso a tela pede esse e-mail e uma senha nova. Dali em diante a tela de
cadastro nunca mais aparece nesse navegador — so o campo de senha, com o e-mail fixo — e
voce entra direto nas proximas vezes (a sessao fica salva ate clicar em "Sair", no popover
de cor do perfil).

A senha e guardada como **hash SHA-256 com sal** em `mp.auth`; a senha em texto nunca e
salva. **Nao existe recuperacao de senha**: se esquecer, apague a chave `mp.auth` no
DevTools (Application > Local Storage) e cadastre de novo.

> Importante: essa trava roda no navegador, entao ela **esconde a interface, nao protege os
> dados**. Quem abrir o site em outro navegador cai na tela de cadastro e, se souber o
> e-mail, consegue criar um acesso — mas veria o site **vazio**, porque todo o conteudo fica
> no navegador de quem escreveu, nunca num servidor. Para barrar de verdade no Vercel, use
> Settings > Deployment Protection no projeto.

## Rodar

```bash
python serve.py
```

Depois abra **http://127.0.0.1:5173**.

O `serve.py` manda `Cache-Control: no-store`, entao editar um arquivo e dar F5 ja mostra a
versao nova (com `python -m http.server` o Chrome guardava o CSS/JS em cache e era preciso
Ctrl+Shift+R toda vez).

O login do Spotify **nao funciona** abrindo `index.html` direto (`file://`) — precisa ser
por `http://127.0.0.1:5173`.

## Conectar o Spotify (uma vez so)

1. Entre em https://developer.spotify.com/dashboard e clique em **Create app**
   (nome e descricao podem ser qualquer coisa).
2. Em **Redirect URIs**, adicione exatamente:

   ```
   http://127.0.0.1:5173/
   ```

3. Em **APIs used**, marque **Web API**. Salve.
4. Copie o **Client ID** do app.
5. No site, cole o Client ID no campo do widget, clique em **Salvar** e depois em
   **Conectar Spotify**. Autorize na tela do Spotify.

O Client ID e os tokens ficam no `localStorage` do navegador — nada sai da sua maquina
alem das chamadas para a API do Spotify.

## Publicar no Vercel

E um site estatico, sem build: basta importar a pasta no Vercel (framework "Other").
Ja estao no repo:

- `vercel.json` — revalidacao de cache (evita versao velha depois do deploy) e `noindex`
- `.vercelignore` — deixa o `serve.py` e o `.claude` fora do deploy
- `robots.txt` — pede para os buscadores nao indexarem

Depois do primeiro deploy, faltam duas coisas suas:

1. **Spotify**: adicione `https://SEU-PROJETO.vercel.app/` nos Redirect URIs do app no
   Spotify Developer Dashboard. O codigo monta o redirect a partir do endereco atual,
   entao nao ha nada para mudar no site — mas o endereco novo precisa estar cadastrado la.
2. **Seus dados nao vao junto.** Tudo fica no navegador e o endereco muda
   (`127.0.0.1:5173` -> `seu-projeto.vercel.app`), que para o navegador e outro site. O que
   voce escreveu local continua local; no Vercel voce comeca de novo (inclusive o cadastro
   de senha e o Client ID do Spotify).

## Celular

Em telas de ate 760px o perfil e o player saem da lateral e viram **dois icones no topo
direito**: o do perfil mostra sua foto, o do player mostra a capa do que esta tocando.
Tocar em um deles abre o card no meio da tela com um zoom que sai do proprio icone; toque
no fundo escuro (ou Esc) para fechar. A barra de abas fica embaixo, so com os icones.

## Rotinas de treino

Os cinco treinos da semana (segunda a sexta) ficam em `routines.js`, com serie, faixa de
repeticoes, descanso e grupo muscular de cada exercicio. Eles sao importados **uma vez por
navegador** — a marca fica em `mp.gymSeed`:

- apagar um treino na tela **nao** faz ele voltar no proximo F5;
- para mudar os treinos, edite `routines.js` e suba o `SEED_VERSION` (`v1` -> `v2`), que
  a importacao roda de novo e acrescenta o que estiver faltando;
- por isso eles tambem aparecem sozinhos no Vercel, sem voce digitar nada la.

## Tempo

O widget usa a **Open-Meteo** (gratuita, sem chave de API) para o clima e a
**BigDataCloud** para o nome da cidade — as duas direto do navegador, nada de servidor
nem de segredo no codigo.

- A localizacao vem do `navigator.geolocation`. Se voce negar a permissao (ou ela falhar),
  cai na ultima coordenada aceita e, na falta dela, na cidade padrao definida em
  `weather.js`:

  ```js
  const FALLBACK = { lat: -23.5505, lon: -46.6333, city: 'Sao Paulo' };
  ```

- Atualiza a cada 15 minutos e tambem quando voce volta para a aba com dado velho.
- O ultimo resultado fica em `mp.weather`, entao o widget abre preenchido e so depois
  busca o dado novo. Sem rede, ele mostra o ultimo dado avisando "sem conexao"; sem rede e
  sem cache, mostra o erro com "Tentar de novo".
- Icone e cor mudam conforme a condicao (sol, lua, nuvem, neblina, garoa, chuva, neve,
  tempestade), seguindo os codigos WMO.

## Detalhes

- Autenticacao: OAuth **PKCE** (nao usa client secret, entao roda 100% no navegador).
- Escopos: `user-read-currently-playing`, `user-read-playback-state`, `user-modify-playback-state`.
- O widget consulta a API a cada 5s e interpola a barra de progresso localmente.
- Da para arrastar a barra para avancar na musica, mexer no volume e trocar de aparelho
  pelo botao redondo da direita.
- Play/pause/avancar/volume/trocar aparelho exigem **Spotify Premium** (limitacao da API).
  Ver a musica tocando funciona em conta gratuita.
- `?demo=1` mostra o layout com uma faixa ficticia, sem precisar conectar.

## Arquivos

| arquivo          | o que faz                                       |
| ---------------- | ----------------------------------------------- |
| `index.html`     | estrutura da pagina                             |
| `styles.css`     | intro + widget do Spotify                       |
| `app.css`        | interface principal (abas, cards, listas)       |
| `hero.js`        | tempo da intro (aparece, segura 3s, some)       |
| `spotify.js`     | login PKCE, polling e controles do player       |
| `auth.js`        | tela de acesso (e-mail unico + senha em hash)    |
| `store.js`       | base comum: DOM, datas, localStorage, IndexedDB |
| `mobile.js`      | icones do celular e abertura dos cards          |
| `weather.js`     | widget de tempo (Open-Meteo + geolocalizacao)   |
| `routines.js`    | os treinos da semana, importados uma vez        |
| `profile.js`     | foto, capa, nome e bio do perfil                |
| `app.js`         | barra de abas e troca de secao                  |
| `modules/*.js`   | um arquivo por secao (`home.js` e o painel)     |

Para zerar uma secao: abra o console do navegador e apague a chave dela
(`mp.tasks`, `mp.notes`, `mp.calendar`, `mp.routine`, `mp.routineLog`, `mp.gym`,
`mp.gymLog`, `mp.profile`, `mp.profileView`, `mp.profileColors`). O acesso fica em
`mp.auth` / `mp.session`.
