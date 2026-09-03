# Guia de demonstração e validação de permissões

Ambiente local, dados fictícios de desenvolvimento. Nada aqui é produção.

## Arrancar

```bash
npm install
supabase start
supabase db reset
npm run dev
```

- Aplicação: http://127.0.0.1:3000 (redirecciona para `/login` ou `/my-work`)
- Supabase Studio: http://127.0.0.1:54323
- Mailpit (emails locais): http://127.0.0.1:54324
- AI: desligada por omissão. Para experimentar o Meeting Assistant sem chave,
  cria `.env.local` a partir de `.env.example` e define `AI_PROVIDER=fake`.

Se depois de `supabase db reset` todos os logins falharem, lê "Local
troubleshooting" no README (Kong com rota antiga do GoTrue).

## Utilizadores de desenvolvimento

Password de todos: `DevelopmentOnly123!`

| Perfil                  | Email                             | Papel                                             | Âmbito efectivo                                           |
| ----------------------- | --------------------------------- | ------------------------------------------------- | --------------------------------------------------------- |
| CEO                     | ceo@example.test                  | Global Executive                                  | Tudo                                                      |
| André Março             | andre.marco@example.test          | Global Executive (Expansion & Management Support) | Tudo                                                      |
| Gui Rainho              | gui.rainho@example.test           | Support & IT Director                             | Support & IT × todos os restaurantes                      |
| Mafalda Zuzarte         | mafalda.zuzarte@example.test      | Marketing Director                                | Marketing × todos os restaurantes                         |
| Sara Barradas           | sara.barradas@example.test        | Happy People Director                             | Happy People × todos os restaurantes                      |
| Margarida Vilarinho     | margarida.vilarinho@example.test  | Commercial Director                               | Commercial × todos os restaurantes                        |
| João Novo               | joao.novo@example.test            | DOL Director                                      | Todos os departamentos × restaurantes A–H (herdados)      |
| Tiago Carvalho          | tiago.carvalho@example.test       | DOL Subdirector                                   | Restaurantes A, B (Supervisor A) e C, E, F (Supervisor B) |
| Mariana Seabra          | mariana.seabra@example.test       | DOL Subdirector                                   | Restaurante D                                             |
| Mónica Gomes            | monica.gomes@example.test         | DOL Subdirector                                   | Restaurantes C (secundário), G e H                        |
| Ricardo Torrão          | ricardo.torrao@example.test       | HACCP (serviço partilhado)                        | HACCP × todos os restaurantes                             |
| Ana Serrano             | ana.serrano@example.test          | Management Control & Purchasing                   | Serviço × todos os restaurantes                           |
| André Stoffel           | andre.stoffel@example.test        | Maintenance                                       | Serviço × todos os restaurantes                           |
| Bruno Henriques         | bruno.henriques@example.test      | DAF                                               | Serviço × todos os restaurantes                           |
| Supervisor Operations A | supervisor.ops.a@example.test     | Operations Supervisor                             | Restaurantes A e B                                        |
| Supervisor Operations B | supervisor.ops.b@example.test     | Operations Supervisor                             | Restaurantes C, E e F                                     |
| Restaurant Manager A    | manager.a@example.test            | Restaurant Manager                                | Restaurante A                                             |
| Restaurant Manager B    | manager.b@example.test            | Restaurant Manager                                | Restaurante B                                             |
| Kitchen Supervisor A    | kitchen.supervisor.a@example.test | Kitchen Supervisor                                | Restaurantes A e B (cozinha)                              |
| Kitchen Manager A       | kitchen.manager.a@example.test    | Kitchen Manager                                   | Restaurante A (cozinha)                                   |

Para mudar de perfil: "Terminar sessão" no fundo da barra lateral e entrar com
outro email. Cada página volta a aplicar as permissões no servidor; não há
cache de sessão entre perfis.

## Dados de demonstração

Criados pelo seed através dos comandos de domínio, por isso têm auditoria,
histórico e ligações reais:

- 16 Tasks (rascunho, abertas, em curso, bloqueada, em espera, em revisão,
  concluídas, várias atrasadas e uma que vence hoje);
- 6 PDCAs (rascunho sem problema/objectivo, aberto, dois em curso com fases DO
  e PLAN, um bloqueado com atraso, um concluído com evidência);
- 5 Decisions (quatro activas; uma em rascunho e **restrita** do Happy People);
- 2 Meeting Series ("Weekly Operations" do DOL, "Management Meeting" do CEO)
  com 7 sessões: duas fechadas, uma publicada, uma **a decorrer agora**, uma
  **em revisão** à espera do CEO e duas agendadas;
- comentários, bloqueios, adiamentos de prazo e itens de agenda adiados.

## Fluxo recomendado

1. Entrar como CEO. My Work mostra os totais, o que precisa de atenção e a
   reunião "Management Meeting · Setembro" à espera de revisão.
2. Abrir Tasks e filtrar por "Só atrasados" ou por restaurante.
3. Abrir um PDCA (por exemplo "Tempo de espera ao almoço no Restaurant B"):
   está bloqueado e atrasado; o painel Execution Validator explica porquê.
4. Criar uma Task e um PDCA novos (Tasks → Nova task).
5. Abrir Meetings, filtrar "All" e entrar em "Weekly Operations · esta semana"
   → Meeting Mode. Marcar temas como discutidos, adicionar notas, criar uma
   Task com as ações rápidas e ligar um PDCA existente.
6. Carregar em Review, abrir "Rever e publicar" e publicar. A Task criada passa
   de DRAFT a OPEN e aparece em My Work de quem ficou Responsible.
7. Terminar sessão e repetir o passo 1 com outro perfil (abaixo).

## Roteiro de permissões

**CEO (ceo@example.test)**
Vê tudo: 16 Tasks, 6 PDCAs, 5 Decisions (incluindo a restrita), as 7 sessões
e as duas séries. Pode publicar as sessões de que é Chair (Management Meeting).

**Support & IT Director (gui.rainho@example.test)**
Vê só o que está no âmbito Support & IT: as duas Tasks de IT (impressoras do
Restaurant C, contrato de internet do Restaurant D), nenhum PDCA, nenhuma
Decision e as sessões do Management Meeting (participante, com Support & IT no
âmbito). Não vê a Decision restrita do Happy People nem as reuniões do DOL.
Ao criar uma Task, só consegue escolher o departamento Support & IT.

**Restaurant Manager A (manager.a@example.test)**
Vê o que toca ao Restaurant A, em qualquer domínio: o PDCA do desperdício e as
suas Tasks, o exaustor da cozinha (Maintenance), a formação HACCP, as Tasks
transversais a todos os restaurantes (preçário, fecho de contas, KPIs) e todas
as sessões cujo âmbito inclui o Restaurant A (Weekly Operations e Management
Meeting). Não vê nada exclusivo dos Restaurants B a H (por exemplo o PDCA do
tempo de espera no B nem a escala de férias do B).
My Work mostra-o como Responsible do desperdício e das suas Tasks.

**HACCP (ricardo.torrao@example.test)**
Vê o PDCA das auditorias HACCP, a formação de segurança alimentar, a Task de
calendarização criada na reunião de direção, a Decision do checklist digital e
as sessões do Management Meeting. Não vê Tasks de IT, Maintenance ou DOL nem
nada de Marketing ou Happy People, mesmo em restaurantes que cobre.

**Sara Barradas (sara.barradas@example.test)**
Criou a Decision restrita "Rever política de gorjetas" mas **não a vê**: no
modelo implementado, RESTRICTED exige a permissão `security.restricted.read` (excepto para quem criou o objecto, que mantém acesso enquanto a sua atribuição cobrir o objecto — sem grant silencioso)
ou um acesso explícito, e a role de director de departamento não a tem. Só o
CEO e o André Março a vêem. É um ponto a decidir (ver "problemas conhecidos").

Nota: `npm run test:e2e` altera dados (expira temporariamente atribuições,
cria registos "E2E …"). Corre `supabase db reset` antes de uma demonstração.

Em todos os casos as listas, filtros, pesquisa, My Work, Meeting Mode e o
Meeting Assistant aplicam exactamente as mesmas regras: se um item não aparece,
também não aparece em nenhum outro ecrã.
