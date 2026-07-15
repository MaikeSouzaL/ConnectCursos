# Conect Cursos

**Plataforma PWA de gestão para instituições de ensino** — *Conectada ao seu futuro.*

Sistema único com três experiências por papel: **Administração** (web), **Professor** e **Aluno** (mobile-first). Cobre alunos, turmas, cursos, professores, **presença por QR Code (entrada/saída)**, **agendamento e aluguel de salas** e um **módulo financeiro completo** (fluxo de caixa, contas a pagar/receber, impostos e relatórios).

> Backend real em **Supabase** (Postgres com RLS, Auth, Storage, Realtime e Edge Functions), em dois ambientes — [dev e produção](#-dois-bancos-dev-e-produção).

---

## ✨ Principais recursos

### Administração (web)
- **Dashboard** com KPIs, gráficos, agenda do dia e alertas de inadimplência/faltas.
- **Alunos, Turmas, Cursos, Professores** — cadastro, listas com busca, ordenação e paginação, perfis detalhados.
- **Matrícula em turma** no cadastro do aluno (mensalidade calculada automaticamente).
- **Salas & Agenda** — calendário semanal, reservas e **aluguel de salas** para terceiros; CRUD de salas.
- **Chamadas & QR** — **terminal de balcão** em tela cheia e folha **imprimível** com o mesmo QR fixo, registros de entrada/saída e chamada por turma (o professor também marca entrada e saída).
- **Financeiro & Relatórios** (8 seções): visão geral + DRE, **fluxo de caixa**, **contas a receber/pagar com aging**, **impostos (Simples Nacional / DAS)**, **notas fiscais**, **relatório anual** e lançamentos — com exportação CSV.
- **Configurações**, tema claro/escuro, busca global (`Ctrl/⌘ K`) e central de notificações.

### Aluno (mobile)
Home com status do dia, **escanear QR de entrada/saída** (com **fila offline** que sincroniza ao reconectar), histórico de presença, mensalidade (Pix) e perfil.

### Professor (mobile)
Minhas turmas, chamada, **escanear meu QR**, agenda e agendamento de salas, e status do aluguel.

### Acesso e onboarding
Login por **e-mail + senha**. O admin pré-cadastra professores/alunos, o sistema **gera uma senha temporária**, e no primeiro acesso o app **força a troca de senha**.

---

## 🧱 Stack

- **Vite** + **React 19** + **TypeScript**
- **Tailwind CSS v4** + componentes estilo **shadcn/ui** (sobre Radix)
- **PWA** (`vite-plugin-pwa`), instalável e com service worker
- **Recharts** (gráficos), **React Router**, **Zustand**, **React Hook Form + Zod**, **html5-qrcode**

Design system dark-first documentado em [`STYLEGUIDE.md`](STYLEGUIDE.md).

---

## 🚀 Como rodar

```bash
npm install
cp .env.example .env   # preencha com o projeto de DEV (ver abaixo)
npm run dev            # desenvolvimento em http://localhost:5173
npm run build          # build de produção + PWA
npm run preview        # pré-visualiza o build
npm test               # testes (Vitest)
npm run typecheck      # tsc -b
```

> Para checar tipos use **`npm run typecheck`**, nunca `npx tsc --noEmit`: o
> `tsconfig.json` da raiz é só um arquivo de `references`, com `"files": []`.
> O `--noEmit` obedece e não checa **nenhum** arquivo — passa sempre, inclusive
> com o app quebrado.

O primeiro acesso de uma instalação nova cria o administrador pela própria tela
de login; ele então cadastra professores e alunos, que recebem senha temporária
e trocam no 1º acesso.

---

## 🗄️ Dois bancos: dev e produção

São **dois projetos Supabase separados**, com o mesmo schema:

| Ambiente | Projeto | Quem usa |
| --- | --- | --- |
| **Desenvolvimento** | `ConectCursos-Dev` (`ztqaehwxlblvqxjcixvp`) | seu `.env` local — `npm run dev` |
| **Produção** | `ConectCursos` (`uimuifgbeubrvvpbzvrl`) | variáveis de ambiente da Vercel |

**A regra:** o `.env` local aponta para o **dev** e nada mais. É o mesmo código
nos dois lados — apontar o local para a produção significa mexer no banco real
da escola achando que é teste.

Duas travas ajudam:

- `src/lib/supabase.ts` **não tem fallback**. Sem as variáveis, o app para com
  um erro dizendo o que falta, em vez de silenciosamente cair na produção.
- Fora da produção, um selo **DEV** aparece no cabeçalho das três telas
  (admin, professor e aluno).

### Mudanças de schema

Toda alteração é um arquivo em `supabase/migrations/`, aplicado **primeiro no
dev** e só depois na produção — nunca só num lado, ou os ambientes divergem e o
deploy quebra.

> **A migration vai na frente do push.** O código pode *depender* do schema sem
> parecer que depende: um `.upsert(..., { onConflict: 'a,b,c' })` vira um
> `ON CONFLICT (a,b,c)`, e o Postgres exige um índice único que case com esse
> alvo — sem ele, `42P10` em tempo de execução, que nenhum typecheck pega.
> Subir o código antes da migration deixa a produção quebrada até ela chegar.

Para conferir se estão iguais:

```sql
-- rode nos dois; o hash tem que bater
select md5(string_agg(a, E'\n' order by a)) from (
  select table_name||'.'||column_name||':'||data_type||':'||is_nullable a
    from information_schema.columns where table_schema='public'
  union all select 'policy:'||schemaname||'.'||tablename||'.'||policyname
    from pg_policies where schemaname in ('public','storage')
  union all select 'func:'||n.nspname||'.'||p.proname
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname in ('private','public') and p.prokind='f'
  union all select 'index:'||schemaname||'.'||indexname
    from pg_indexes where schemaname='public'
) t;
```

As **edge functions não entram no hash** acima — e é fácil elas divergirem sem
ninguém notar, porque nada avisa. Hoje são quatro: `create-admin`,
`admin-create-user`, `admin-update-user` e `send-push`.

Para conferir, compare o **`ezbr_sha256`** de cada uma nos dois projetos (a API
de management devolve na listagem de functions). Ele é derivado do conteúdo do
bundle: mesmo código nos dois lados = mesmo hash, mesmo com project id e número
de versão diferentes. Hashes diferentes = código diferente, ponto.

> O que o hash **não** responde é se o deployado bate com este repositório —
> não há como gerar o mesmo hash a partir do arquivo local. Enquanto o deploy
> for manual, a única garantia é redeployar do repositório para os dois
> ambientes na mesma passada.

> O projeto de dev é do plano free: ele hiberna depois de ~1 semana parado.
> Se o `npm run dev` não conectar, reative no painel do Supabase.

### Testando no celular

**Câmera exige HTTPS.** `getUserMedia` (a selfie) e o scanner de QR só rodam em
contexto seguro. `localhost` conta como seguro; `http://192.168.x.x` **não**.
Isso decide qual caminho usar:

| Quero testar | Como |
| --- | --- |
| **Selfie, QR, PWA instalável** | Push na branch `dev` → a Vercel gera um **Preview** em HTTPS. As variáveis de Preview apontam para o banco de **dev**, então o selo DEV aparece e o banco real não é tocado. |
| **Layout, textos, navegação** | `npm run dev:celular` → abre no Wi-Fi (`http://SEU-IP:5173`), com HMR. Sem câmera. |

No Windows, o `dev:celular` costuma exigir liberar a porta 5173 no firewall na
primeira vez.

---

## 📌 Escopo e próximos passos

**Fora do escopo (exigem integração fiscal):** emissão oficial de **NF-e/NFS-e**
(SEFAZ/prefeitura), **SPED/ECD/ECF** e apuração/pagamento do **DAS** (PGDAS-D).
O sistema entrega hoje toda a **gestão e os relatórios financeiros** para o contador.

---

<sub>Feito com 💛 para a Conect Cursos.</sub>
