# Conect Cursos

**Plataforma PWA de gestão para instituições de ensino** — *Conectada ao seu futuro.*

Sistema único com três experiências por papel: **Administração** (web), **Professor** e **Aluno** (mobile-first). Cobre alunos, turmas, cursos, professores, **presença por QR Code (entrada/saída)**, **agendamento e aluguel de salas** e um **módulo financeiro completo** (fluxo de caixa, contas a pagar/receber, impostos e relatórios).

> Fase atual: **frontend** com camada de dados _mock_ desacoplada (persistida em `localStorage`), pronta para plugar um backend real.

---

## ✨ Principais recursos

### Administração (web)
- **Dashboard** com KPIs, gráficos, agenda do dia e alertas de inadimplência/faltas.
- **Alunos, Turmas, Cursos, Professores** — cadastro, listas com busca, ordenação e paginação, perfis detalhados.
- **Matrícula em turma** no cadastro do aluno (mensalidade calculada automaticamente).
- **Salas & Agenda** — calendário semanal, reservas e **aluguel de salas** para terceiros; CRUD de salas.
- **Chamadas & QR** — **terminal de balcão** em tela cheia com QR rotativo, registros de entrada/saída e chamada por turma.
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
npm run dev       # desenvolvimento em http://localhost:5173
npm run build     # build de produção + PWA
npm run preview   # pré-visualiza o build
```

Na tela de login há **atalhos de demonstração** para entrar como Administração, Professor ou Aluno.
Contas semente usam a senha `conect123` (admin: `admin123`).

---

## 📌 Escopo e próximos passos

A camada `src/data/services.ts` foi desenhada para trocar os dados _mock_ por uma API/Supabase **sem reescrever a UI**.

**Fora do escopo desta fase (exigem backend + integração fiscal):** autenticação real, emissão oficial de **NF-e/NFS-e** (SEFAZ/prefeitura), **SPED/ECD/ECF** e apuração/pagamento do **DAS** (PGDAS-D). O sistema entrega hoje toda a **gestão e os relatórios financeiros** para o contador.

---

<sub>Feito com 💛 para a Conect Cursos.</sub>
