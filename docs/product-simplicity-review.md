# Product Simplicity Review — proposta para aprovação

Estado: **proposta**, 2026-09-03. Nada do que está aqui foi implementado.
Não altera schema, migrações, permission engine, RLS, auditoria, lifecycles nem
componentes. É uma proposta funcional; a identidade visual actual mantém-se.

Princípio central: **a complexidade pertence ao sistema, não ao utilizador.**
Tudo o que o sistema consegue inferir de forma determinística e segura, infere.
Tudo o que não é essencial para executar o trabalho fica atrás de
`Opções avançadas` ou só aparece quando o contexto o exige.

Vocabulário fixo nesta proposta: **PDCA / PDCAs**, **Owner** (mantém-se),
**Responsável** (nunca "Responsible" na UI), **Tarefa**, **Decisão**, **Reunião**.

---

## 1. Nova arquitectura de navegação

Barra lateral escura (mantém-se), três grupos, cinco entradas. Meeting Series
deixa de ser destino; recorrência gere-se dentro de Reuniões. Organização e
Administração só aparecem a quem tiver a permissão correspondente
(`organization.manage` ou `authorization.manage`), e ainda assim só quando
existir funcionalidade para lá dos dados de seed.

```
EXECUTION · Grupo Capricciosa

TRABALHO
  ◉ O meu trabalho

REUNIÕES
  ◉ Reuniões

EXECUÇÃO
  ◉ Tarefas
  ◉ PDCAs
  ◉ Decisões

(só com permissão)
ORGANIZAÇÃO
  ◉ Organização
  ◉ Administração

──────────────
CEO · Direcção
Âmbito: todos os restaurantes
Terminar sessão
```

Regras de orientação:

- a entrada activa fica destacada (já existe) e o cabeçalho de cada página diz
  onde estou com um "olho" curto: "Tarefas", "Reunião de Operações";
- todas as páginas de detalhe têm um "← Voltar a …" para a lista de origem ou
  para a reunião de onde vieram;
- o contexto do utilizador (nome, função, âmbito) fica no rodapé da barra, em
  português: "Gerente · Capricciosa Carcavelos".
- `/meeting-series` continua a existir como URL de gestão, acessível a partir
  de uma reunião ("Esta reunião repete-se semanalmente · gerir"), não do menu.

## 2. Wireframe — O meu trabalho

Uma pergunta: **o que precisa da minha atenção agora?** Sem cartões de KPI.
Os oito números actuais são substituídos por três blocos accionáveis e uma
linha de resumo em prosa. Números só quando forem o assunto (atrasados,
bloqueados).

```
quinta-feira, 3 de Setembro
O meu trabalho
Tens 2 tarefas atrasadas, 1 bloqueada e 1 reunião por validar.

┌ Precisa da minha atenção ───────────────────────────────────────┐
│ ⚠ Substituir impressoras do Restaurant C     atrasada 3 dias   →│
│ ⛔ Reparar exaustor da cozinha (Carcavelos)   bloqueada          →│
│ ● Rever KPIs de vendas de Setembro           para hoje          →│
│ ✎ Reunião de Direcção · Setembro             por validar        →│
└──────────────────────────────────────────────────────────────────┘

┌ Para eu fazer ───────────────────────┐ ┌ A acompanhar ───────────────────┐
│ (sou Responsável)                    │ │ (sou Owner ou sigo)             │
│ Standardizar doses do menu   08/09   │ │ Reduzir desperdício (PDCA) 03/10│
│ Reduzir produção de pão      hoje    │ │ Manutenção das câmaras     17/09│
│ … ver todas (6)                      │ │ … ver todas (4)                 │
└──────────────────────────────────────┘ └─────────────────────────────────┘

┌ Próximas reuniões ───────────────────────────────────────────────┐
│ Operações · semanal        seg 8 set, 10:00     sou participante │
│ Direcção · Outubro         qui 17 set, 15:00    sou Chair        │
└──────────────────────────────────────────────────────────────────┘
```

Detalhes:

- "Precisa da minha atenção" junta, por ordem: reuniões por validar (só para
  o Chair), atrasados, bloqueados, para hoje. Se estiver vazio, mostra
  "Nada urgente. Bom sinal." e o bloco encolhe.
- "Para eu fazer" = Responsável; "A acompanhar" = Owner ou Watcher, sem
  repetir o que já está em "Para eu fazer".
- O Execution Validator deixa de ser um bloco separado: os seus alertas
  determinísticos aparecem como a linha de contexto de cada item ("sem prazo",
  "sem Owner") só quando existirem. Nada de códigos (`MISSING_DUE_DATE`).
- Cada linha mostra apenas: título, contexto curto (prazo relativo ou motivo),
  seta. Estado só quando não for "em curso/aberto" (por exemplo "bloqueada").

## 3. Wireframe — lista de Tarefas

```
Tarefas                                             [ + Nova tarefa ]
Acções concretas com responsável e prazo.

[ Pesquisar…            ] [ Estado ▾ ] [ Restaurante ▾ ] [ Responsável ▾ ] [ Só atrasadas ☐ ]
                                                          Opções de filtro avançadas ▾

 Tarefa                                    Responsável        Prazo           Estado
 Substituir impressoras do Restaurant C     Gui Rainho         31/08 · atrasada  Em curso
 Reparar exaustor da cozinha                Kitchen Manager A  04/09             Bloqueada
 Rever KPIs de vendas de Setembro           CEO                hoje              Em curso
 Renovar contrato de internet               Gui Rainho         08/09             Aberta
 …
 27 tarefas · página 1 de 2                              ‹ Anterior   Seguinte ›
```

- Quatro filtros visíveis (pesquisa, estado, restaurante, responsável) e a
  caixa "só atrasadas". Prioridade, área, Owner e visibilidade ficam em
  "Opções de filtro avançadas".
- Colunas: Tarefa, Responsável, Prazo, Estado. Owner sai da lista (fica no
  detalhe). Prioridade só aparece como ponto colorido antes do título quando
  for Alta ou Crítica.
- Estados em português com a cor semântica actual.
- Estado vazio: "Ainda não há tarefas no teu âmbito. [Criar a primeira]".

## 4. Wireframe — detalhe de Tarefa

```
← Tarefas

Substituir impressoras de cozinha do Restaurant C          Em curso
Responsável Gui Rainho · Prazo 31/08 (atrasada) · Carcavelos · Suporte & IT

[ Marcar concluída ]  [ Alterar prazo ]  [ Bloquear ]  [ Mais ▾ ]

Descrição
Duas impressoras térmicas com falhas intermitentes.

Progresso
  Gui Rainho · 3 set, 18:13
  Equipamento chegou; instalação marcada para terça de manhã.
  [ Escrever uma actualização…                        ] [ Publicar ]
  📎 Anexar ficheiro

Histórico
  3 set  Estado alterado para Em curso · Gui Rainho
  3 set  Criada · Gui Rainho
  ver tudo

▸ Opções avançadas
  Owner · Prioridade · Área · Visibilidade · Colaboradores · Seguidores ·
  Dependências · Outros restaurantes · Editar título e descrição
```

- Primeiro bloco: título, estado, Responsável, prazo, restaurante e área, numa
  linha. Nada de "Versão 4", "security object", "scope".
- As acções principais são botões com verbos, não um `select` de estados:
  "Marcar concluída" (pede nota de conclusão), "Alterar prazo" (pede novo
  prazo e motivo), "Bloquear" (pede motivo; cria o bloqueio e muda o estado
  numa só acção), e "Mais" com Cancelar, Reabrir, Colocar em espera,
  Enviar para validação, Arquivar, conforme o lifecycle permitir.
- "Progresso" = comentários + anexos, com um único campo.
- Owner, colaboradores, seguidores, dependências, âmbito completo e edição
  do título ficam em "Opções avançadas" (secção colapsada, mesma página).
- O painel de validação deixa de existir como bloco; os alertas relevantes
  aparecem como uma linha discreta sob o cabeçalho ("Sem prazo definido ·
  definir") apenas quando existirem.

## 5. Wireframe — criação rápida de Tarefa

Mesmo formulário em `/tarefas/nova` e dentro da reunião. Quatro campos.

```
Nova tarefa

O que é preciso fazer? *
[ Contactar o fornecedor das câmaras                          ]

Responsável *
[ Tiago Carvalho                        ▾ ]   (só pessoas com acesso ao âmbito)

Prazo
[ 12/09/2026 ]

Onde se aplica?
[ Capricciosa Carcavelos ▾ ]   ← já preenchido pelo contexto da reunião

[ Adicionar tarefa ]        Opções avançadas ▾
```

`Opções avançadas` (colapsado): Owner (por omissão o criador), Prioridade
(Média), Área (inferida da reunião ou da atribuição do criador), Visibilidade
(Normal), Outros restaurantes, Descrição, Início, Colaboradores, Seguidores.

Inferências determinísticas:

- **Onde se aplica** = restaurantes da reunião; fora de reunião, os
  restaurantes da atribuição do criador se forem um ou dois, senão vazio com
  o selector à vista.
- **Área** = área da reunião (série) ou da atribuição principal do criador.
- **Owner** = criador (é quem responde por não deixar cair). Alterável.
- **Empresa** deixa de ser campo: existe uma; se houver várias, deriva do
  restaurante escolhido.
- A lista de Responsáveis mostra só quem tem acesso ao âmbito escolhido (é o
  que `get_assignable_profiles` já faz) e explica: "Se a pessoa não aparece,
  não tem acesso a este restaurante ou área."

## 6. Wireframe — detalhe de PDCA

```
← PDCAs

Reduzir desperdício alimentar no Restaurant A            Em curso · fase Fazer
Responsável Restaurant Manager A · Owner João Novo · Prazo 03/10 · Carcavelos · Operações

Problema
O desperdício pesado em Agosto foi 9% do custo de mercadoria…
Objectivo
Baixar o desperdício para 5% até ao fim do trimestre.

[ Avançar para Verificar → ]   [ Alterar prazo ]   [ Mais ▾ ]

Planear ✓ │ Fazer ● │ Verificar │ Actuar
─────────────────────────────────────────
Fazer
  Tarefas deste PDCA
   ✓ Pesagem diária de desperdício          Kitchen Manager A   concluída
   ● Standardizar doses do menu de almoço    Manager A           08/09
   ○ Reduzir produção de pão em 20%          Manager A           hoje
  [ + Tarefa ]

Progresso
  CEO · 3 set — Primeira semana de pesagem: 7,4%. Continuar a monitorizar.
  [ Escrever uma actualização… ] [ Publicar ]

Histórico  · ver tudo

▸ Opções avançadas
  Causa raiz · KPI · Resultado esperado · Prioridade · Impacto · Risco ·
  Visibilidade · Área · Colaboradores · Seguidores · Dependências
```

- As quatro fases são separadores; cada um mostra só o que lhe pertence:
  **Planear** (problema, objectivo, causa raiz, resultado esperado, KPI),
  **Fazer** (tarefas e bloqueios), **Verificar** (resultado real, notas de
  verificação, evidências), **Actuar** (acção correctiva, standardização,
  notas de fecho, botão "Concluir PDCA").
- O botão principal muda com a fase ("Avançar para Verificar"); voltar atrás
  está em "Mais" e pede motivo (regra actual).
- "Concluir PDCA" só na fase Actuar; se faltar resultado real, o botão explica
  o que falta em vez de falhar depois.

## 7. Wireframe — criação rápida de PDCA

```
Novo PDCA

Qual é o problema? *
[ Tempo de espera ao almoço acima de 20 minutos no Restaurant B        ]

O que queremos atingir? *
[ Espera média abaixo de 15 minutos nos dias úteis                     ]

Responsável *                      Owner *
[ Restaurant Manager B     ▾ ]     [ Tiago Carvalho          ▾ ]

Prazo
[ 30/10/2026 ]

Onde se aplica?
[ Capricciosa Cascais ▾ ]

[ Adicionar PDCA ]        Opções avançadas ▾
```

`Opções avançadas`: Título curto (por omissão, as primeiras palavras do
problema), Causa raiz ou hipótese, KPI (nome, base, meta), Resultado esperado,
Prioridade, Impacto, Risco, Visibilidade, Área, Outros restaurantes,
Colaboradores, Seguidores. O PDCA nasce em Planear e amadurece depois.

## 8. Wireframe — Decisão

Criação:

```
Nova decisão

O que ficou decidido? *
[ Fechar as esplanadas às 23h em todos os restaurantes                 ]

Onde se aplica?
[ Todos os restaurantes ▾ ]

[ Registar decisão ]        Opções avançadas ▾
   (Data da decisão · Detalhe/justificação · Decidido por · Área · Visibilidade)
```

Detalhe:

```
← Decisões
Fechar as esplanadas às 23h em todos os restaurantes          Activa
Decidida a 14/08 · Todos os restaurantes · Operações · registada por CEO

Detalhe
Decidido na reunião de direcção de Agosto para reduzir queixas de ruído…

Origem
Reunião de Direcção · Agosto → ver reunião
Acções ligadas: 1 PDCA, 2 tarefas

[ + Tarefa a partir desta decisão ]   [ Mais ▾ ] (editar, arquivar)
```

Uma decisão não precisa de Responsável: é um registo. Se quiserem uma acção,
criam uma tarefa a partir dela (fica ligada).

## 9. Fluxo completo simplificado de Reunião

Para o utilizador existem três momentos: **Abrir → Trabalhar → Terminar.**
Por baixo, o lifecycle actual (`DRAFT → SCHEDULED → IN_PROGRESS → REVIEW →
PUBLISHED → CLOSED`) mantém-se intacto, com estas correspondências:

| Momento para o utilizador                                                                                    | O que o sistema faz                                                                       |
| ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| Criar reunião (título, quando, quem, onde se aplica, repetir?)                                               | `create_meeting_session` + série se "repetir"; transição imediata `DRAFT → SCHEDULED`     |
| Abrir reunião (botão "Abrir reunião" no dia; ou automaticamente ao entrar no ecrã de reunião à hora marcada) | `SCHEDULED → IN_PROGRESS`                                                                 |
| Trabalhar (notas, temas, acções, pendentes)                                                                  | comandos actuais de agenda, notas, ligações e criação de objectos em rascunho             |
| Terminar reunião                                                                                             | `IN_PROGRESS → REVIEW`, abre o ecrã "Terminar reunião"                                    |
| Terminar e distribuir                                                                                        | `REVIEW → PUBLISHED` (activa rascunhos, snapshot) e, na mesma acção, `PUBLISHED → CLOSED` |
| Reabrir (raro, em "Mais")                                                                                    | `reopen_meeting_session` com motivo                                                       |

Estados visíveis ao utilizador: **Agendada**, **A decorrer**, **A validar**
(só o Chair vê, e só se saiu sem distribuir), **Terminada**. `PUBLISHED` deixa
de ser mostrado; existe um instante entre publicar e fechar que é interno.
`DRAFT` deixa de existir para o utilizador: uma reunião criada está agendada.
"Cancelar reunião" fica em "Mais" com motivo.

Quem pode terminar e distribuir: o Chair (regra actual, `validate_meeting_publish`).
Quem não é Chair vê o botão "Terminar reunião" desactivado com a explicação
"Só o Chair (João Novo) pode terminar esta reunião."

Antes da reunião, o ecrã de reunião já mostra agenda e pendentes anteriores;
não existe página separada de "preparação".

## 10. Wireframe — Meeting Mode (ecrã único)

```
← Reuniões                                                A decorrer há 24 min
Reunião de Operações · 3 de Setembro
Carcavelos, Cascais, Oeiras, Parque das Nações · Chair João Novo · 5 pessoas
                                                        [ Terminar reunião ]

┌ Pendentes da reunião anterior ──────────────────────────────────────┐
│ ☐ Rever proposta dos servidores          Gui · 05/09                │
│ ☐ Resolver problema do POS               Tiago · atrasado           │
│ ☐ Escalas de Outubro (adiado)            → trazer para hoje         │
└──────────────────────────────────────────────────────────────────────┘

┌ Tema actual ─────────────────────────────────────────────────────────┐
│ 1/3  Escalas de Outubro                                              │
│      Retomado da semana passada.                                     │
│      [ Discutido ✓ ]  [ Adiar ]           ‹ anterior   seguinte ›    │
│                                                                      │
│ Notas                                                                │
│ [ Escreve o que foi dito ou decidido…                              ] │
│ • Supervisor A traz as escalas revistas; falta validar o B. — João   │
│                                                                      │
│ Acções deste tema                                                    │
│ [ + Tarefa ]  [ + PDCA ]  [ + Decisão ]                              │
└──────────────────────────────────────────────────────────────────────┘

Agenda        1 Escalas de Outubro ●   2 Manutenção das câmaras   3 Inventários
              [ + tema ]

┌ Acções criadas nesta reunião ────────────────────────────────────────┐
│ Tarefa  Contactar fornecedor das câmaras    Tiago · 12/09            │
│ PDCA    Reduzir tempos de espera            sem Owner ⚠              │
│ Decisão Reforço de equipa aos fins-de-semana                         │
└──────────────────────────────────────────────────────────────────────┘
▸ Ligar um assunto já existente
```

Comportamentos:

- "+ Tarefa" abre a criação rápida (secção 5) numa folha lateral, com
  "Onde se aplica" e "Área" já preenchidos pela reunião e o tema associado
  automaticamente. Ao adicionar, aparece na lista sem sair do ecrã.
- Notas: um campo, Enter para guardar, associadas ao tema actual. Editar
  inline ao clicar.
- Tema actual avança com "seguinte"; "Discutido" marca o resultado; "Adiar"
  pede motivo curto e propõe "trazer para a próxima reunião".
- Pendentes anteriores: uma lista de checkboxes. Marcar ☑ numa tarefa
  concluída pede nota de conclusão (é a transição normal); "trazer para hoje"
  cria o item de agenda com carry-forward (já existe).
- Sem stepper de lifecycle, sem Start/Review/Publish, sem "Detalhe": a
  gestão de participantes, horário e âmbito fica em "Mais ▾" no cabeçalho.
- Nada de âmbito nas acções rápidas (herdam da reunião); só em "Opções
  avançadas".
- Se a reunião está "Agendada", o mesmo ecrã aparece com o botão
  "Abrir reunião" no lugar de "Terminar reunião"; agenda e pendentes já
  editáveis (preparação).

## 11. Wireframe — Terminar reunião

```
Terminar reunião · Reunião de Operações

Nesta reunião ficaram definidos:
   4 tarefas · 2 PDCAs · 1 decisão · 3 temas discutidos, 1 adiado

Precisa de correcção antes de distribuir
 ⚠ Tarefa "Contactar fornecedor"         Sem Responsável        [ Corrigir ]
 ⚠ PDCA "Reduzir tempos de espera"       Sem Owner              [ Corrigir ]

Pode ficar para depois
 • PDCA "Reduzir tempos de espera" ainda não tem prazo.
 • Tarefa "Escalas de Outubro" ainda não tem prazo.

Quem fica com o quê
 Tiago Carvalho     2 tarefas · 1 PDCA
 Manager A          1 tarefa
 (sem responsável)  1 tarefa ⚠

[ Voltar à reunião ]                       [ Terminar e distribuir ] (desactivado enquanto houver ⚠)
```

"Corrigir" abre a folha lateral do item com o campo em falta em foco; ao
guardar, volta a este ecrã com a lista actualizada. Depois de distribuir:

```
Reunião terminada.
4 tarefas atribuídas · 2 PDCAs criados · 1 decisão registada
As pessoas responsáveis já as vêem em "O meu trabalho".
[ Ver resumo ]  [ Voltar a Reuniões ]
```

O "Ver resumo" é a publicação (snapshot actual) apresentada em linguagem
natural; o Meeting Assistant (quando activo) pode propor o texto, sempre com
confirmação humana como hoje.

## 12. Classificação dos campos actuais

Legenda: **E** essencial (sempre visível) · **C** contextual · **A** avançado
(`Opções avançadas`) · **S** sistema (nunca na UI normal).

**Tarefa**

| Campo                                | Hoje                     | Proposta                                  |
| ------------------------------------ | ------------------------ | ----------------------------------------- |
| Título ("O que é preciso fazer?")    | E                        | E                                         |
| Responsável                          | detalhe, depois de criar | E (obrigatório na criação)                |
| Prazo                                | E                        | E (opcional; aviso se faltar)             |
| Onde se aplica (restaurantes)        | E, lista de checkboxes   | E, pré-preenchido; selector simples       |
| Descrição                            | E                        | A                                         |
| Owner                                | detalhe                  | A (por omissão = criador)                 |
| Prioridade                           | E                        | A (Média)                                 |
| Área (departamento/serviço)          | E, checkboxes            | C: inferida; A para alterar               |
| Empresa                              | E                        | S (derivada)                              |
| Visibilidade                         | E                        | A (Normal)                                |
| Início                               | E                        | A                                         |
| PDCA pai                             | oculto (URL)             | C (quando criada a partir de um PDCA)     |
| Decisão de origem                    | S                        | C (quando criada a partir de uma decisão) |
| Colaboradores / Seguidores           | detalhe                  | A                                         |
| Dependências / Bloqueios             | detalhe                  | C (botão "Bloquear"); A para dependências |
| Estado, versão, security object, IDs | detalhe                  | S (estado visível só como rótulo)         |

**PDCA**

| Campo                                              | Hoje          | Proposta                   |
| -------------------------------------------------- | ------------- | -------------------------- |
| Problema                                           | E             | E                          |
| Objectivo                                          | E             | E                          |
| Responsável                                        | detalhe       | E (obrigatório)            |
| Owner                                              | detalhe       | E (obrigatório)            |
| Prazo                                              | E             | E (opcional; aviso)        |
| Onde se aplica                                     | E             | E, pré-preenchido          |
| Título                                             | E             | A (derivado do problema)   |
| Causa raiz / hipótese                              | E             | A (separador Planear)      |
| Resultado esperado                                 | edição        | A (Planear)                |
| KPI (nome, unidade, base, meta, método, resultado) | edição        | A (Planear/Verificar)      |
| Prioridade / Impacto / Risco                       | E             | A (Média)                  |
| Fase                                               | acção própria | C (separadores no detalhe) |
| Resultado real, notas de verificação               | edição        | C (separador Verificar)    |
| Acção correctiva, standardização, notas de fecho   | edição        | C (separador Actuar)       |
| Área, Empresa, Visibilidade                        | E             | C / S / A                  |
| Colaboradores, Seguidores, Dependências            | detalhe       | A                          |
| Início                                             | E             | A                          |

**Decisão**

| Campo                                  | Hoje  | Proposta                                              |
| -------------------------------------- | ----- | ----------------------------------------------------- |
| O que ficou decidido (título)          | E     | E                                                     |
| Onde se aplica                         | E     | E, pré-preenchido                                     |
| Data da decisão                        | E     | A (hoje)                                              |
| Detalhe / justificação                 | E     | A                                                     |
| Decidido por                           | S     | A (por omissão = criador)                             |
| Área, Empresa, Visibilidade            | E     | C / S / A                                             |
| Estado (Rascunho / Activa / Arquivada) | lista | C ("Activa" implícita; rascunho só dentro de reunião) |

**Reunião**

| Campo                                        | Hoje                        | Proposta                                     |
| -------------------------------------------- | --------------------------- | -------------------------------------------- |
| Título                                       | E                           | E (sugerido: "Reunião de Operações · 8 set") |
| Início / Fim                                 | E                           | E (fim = início + 1h por omissão)            |
| Chair                                        | E                           | C (= criador; alterável)                     |
| Participantes                                | detalhe                     | E (selector múltiplo na criação)             |
| Onde se aplica                               | E, checkboxes               | E, pré-preenchido pela série ou pelo criador |
| Repetir (Não / Semanal / Quinzenal / Mensal) | inexistente (série à parte) | E                                            |
| Série                                        | E (selector)                | S (gerida pelo "Repetir")                    |
| Tipo de reunião                              | E (série)                   | A                                            |
| Descrição                                    | E                           | A                                            |
| Área, Empresa, Visibilidade                  | E                           | C / S / A                                    |
| Estado, versão, publicação, snapshot         | detalhe                     | S (estado visível como rótulo)               |

## 13. Mapa EN → PT-PT da interface actual

Camada centralizada única (`labels.ts`, uma tabela por família), consumida por
todos os componentes; nenhuma tradução inline. Códigos internos inalterados.

**Navegação e áreas**

| Actual                                                                      | Proposta                                                                  |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| My Work                                                                     | O meu trabalho                                                            |
| Meetings                                                                    | Reuniões                                                                  |
| Meeting Series                                                              | (fora do menu) Reuniões que se repetem                                    |
| Tasks / Task / Nova task                                                    | Tarefas / Tarefa / Nova tarefa                                            |
| PDCAs / PDCA                                                                | PDCAs / PDCA (mantém)                                                     |
| Decisions / Decision / Nova decisão                                         | Decisões / Decisão / Nova decisão                                         |
| Execution Core / Shared execution / Personal execution / Execution Platform | eliminar os "olhos" em inglês; usar o nome da área ou "Grupo Capricciosa" |
| Meeting Mode                                                                | Reunião (o ecrã chama-se pelo título da reunião)                          |
| Review Meeting                                                              | Terminar reunião                                                          |
| AI Assistant / AI Meeting Assistant                                         | Assistente (só quando activo)                                             |
| Execution Validator                                                         | Alertas (sem cabeçalho quando vazio)                                      |
| Terminar sessão                                                             | Terminar sessão                                                           |

**Papéis e pessoas**

| Actual                       | Proposta                                                       |
| ---------------------------- | -------------------------------------------------------------- |
| Owner                        | Owner (mantém, por decisão)                                    |
| Responsible                  | Responsável                                                    |
| Collaborator(s)              | Colaborador(es)                                                |
| Watcher(s) / Watching        | Seguidor(es) / A seguir                                        |
| Chair                        | Chair (mantém; termo conhecido) ou "Conduz a reunião" no texto |
| Participant(s)               | Participante(s)                                                |
| Assigned to me / Owned by me | Para eu fazer / A acompanhar                                   |
| Collaborating                | A colaborar                                                    |
| Sem Owner / Sem Responsible  | Sem Owner / Sem responsável                                    |

**Estados de Tarefa e PDCA**

| Código       | Rótulo       |
| ------------ | ------------ |
| DRAFT        | Rascunho     |
| OPEN         | Aberto/a     |
| PLANNED      | Planeado/a   |
| IN_PROGRESS  | Em curso     |
| BLOCKED      | Bloqueado/a  |
| WAITING      | Em espera    |
| UNDER_REVIEW | Em validação |
| COMPLETED    | Concluído/a  |
| CANCELLED    | Cancelado/a  |
| ARCHIVED     | Arquivado/a  |

(o género segue o objecto: "Tarefa concluída", "PDCA concluído")

**Estados de Reunião**

| Código      | Rótulo                                |
| ----------- | ------------------------------------- |
| DRAFT       | (não mostrado; tratado como Agendada) |
| SCHEDULED   | Agendada                              |
| IN_PROGRESS | A decorrer                            |
| REVIEW      | A validar                             |
| PUBLISHED   | (interno)                             |
| CLOSED      | Terminada                             |
| CANCELLED   | Cancelada                             |

**Estados de Decisão**: DRAFT → Por confirmar (só em reunião), ACTIVE →
Activa, ARCHIVED → Arquivada.

**Agenda**: PENDING → Por discutir, DISCUSSED → Discutido, POSTPONED →
Adiado, CLOSED → Encerrado.

**Ligações de reunião**: CREATED → Criado nesta reunião, DISCUSSED →
Discutido, REVIEWED → Revisto, FOLLOW_UP → Acompanhamento,
CLOSED_IN_MEETING → Encerrado nesta reunião.

**Prioridade, impacto, risco**: LOW → Baixa, MEDIUM → Média, HIGH → Alta,
CRITICAL → Crítica.

**Fases PDCA**: PLAN → Planear, DO → Fazer, CHECK → Verificar, ACT → Actuar
(o acrónimo PDCA mantém-se).

**Visibilidade**: NORMAL → Normal ("quem cobre o restaurante ou a área vê"),
RESTRICTED → Restrita ("só quem for autorizado explicitamente, e quem criou"),
PRIVATE → Privada ("só quem criou e quem receber acesso").

**Outros rótulos e acções**

| Actual                                                                                 | Proposta                                                                           |
| -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Start / Review / Publish Meeting / Rever e publicar                                    | Abrir reunião / Terminar reunião / Terminar e distribuir                           |
| Agendar                                                                                | (automático ao criar)                                                              |
| Guardar outcome                                                                        | Discutido / Adiar (botões)                                                         |
| Quick Task / Quick PDCA / Quick Decision                                               | + Tarefa / + PDCA / + Decisão                                                      |
| Criar Task draft / Criar PDCA draft / Criar Decision draft                             | Adicionar tarefa / Adicionar PDCA / Registar decisão                               |
| Associar existente / Associar sem duplicar                                             | Ligar um assunto já existente / Ligar                                              |
| Pending anterior                                                                       | Pendentes da reunião anterior                                                      |
| Objetos ligados                                                                        | Acções criadas nesta reunião · Assuntos ligados                                    |
| Agenda outcomes                                                                        | Temas e resultados                                                                 |
| Lifecycle / Aplicar transição / Guardar transição                                      | (substituídos por botões com verbos)                                               |
| Alterar estado                                                                         | Mais ▾ (acções permitidas)                                                         |
| Alterar scope / Scope / Default scope da série                                         | Onde se aplica                                                                     |
| Departamentos / serviços / Unidades                                                    | Área                                                                               |
| Restaurantes                                                                           | Restaurantes (mantém)                                                              |
| Attachments / Adicionar attachment / Enviar ficheiro                                   | Anexos / Anexar ficheiro                                                           |
| Comentários / Comentar                                                                 | Progresso / Publicar actualização                                                  |
| Activity                                                                               | Histórico                                                                          |
| Contexto                                                                               | Descrição                                                                          |
| Versão N                                                                               | (oculto)                                                                           |
| Prazo · atrasado / hoje                                                                | Prazo · atrasada / para hoje                                                       |
| Due today / Due this week / Overdue / Blocked / Upcoming meetings / Awaiting my review | Para hoje / Esta semana / Atrasados / Bloqueados / Próximas reuniões / Por validar |
| Precisa de atenção                                                                     | Precisa da minha atenção                                                           |
| Sem resultados autorizados                                                             | Nada para mostrar aqui                                                             |
| Filtrar / Aplicar filtros / Limpar                                                     | Filtrar / Limpar filtros                                                           |
| Todos os Chairs / Todos os participantes                                               | Qualquer Chair / Qualquer participante                                             |
| Upcoming / Past / All                                                                  | Próximas / Passadas / Todas                                                        |
| Criar próxima sessão                                                                   | Marcar próxima reunião                                                             |
| Chair por omissão / Recorrência simples                                                | Conduz habitualmente / Repete-se                                                   |
| Mudar fase PDCA / Guardar fase                                                         | Avançar para … / Voltar a …                                                        |
| Guardar atribuições                                                                    | Guardar                                                                            |
| Editar Task / Editar PDCA / Editar Decision                                            | Editar                                                                             |
| Login: "A sessão é validada pelo Supabase…"                                            | "Entra com o teu email da empresa."                                                |
| Notice: Guardado. / Não guardado.                                                      | Guardado. / Não foi possível guardar.                                              |
| Códigos de actividade (task.status.changed)                                            | só o rótulo ("Estado alterado para Em curso"); código em `title` para suporte      |
| Códigos de alerta (MISSING_DUE_DATE)                                                   | frases ("Sem prazo definido")                                                      |

## 14. Validações BLOCKING

Impedem "Terminar e distribuir" (e a saída de rascunho fora de reunião):

**Tarefa**

- sem Responsável;
- Responsável sem acesso válido ao âmbito da tarefa;
- âmbito inválido (restaurante ou área fora do que o criador cobre, ou vazio
  quando o sistema não consegue inferir);
- criador sem permissão de criação nesse âmbito;
- conflito de versão relevante (o item foi alterado durante a reunião e a
  versão apresentada já não é a actual);
- título vazio ou inválido.

**PDCA**

- sem Responsável;
- sem Owner;
- Responsável ou Owner sem acesso válido;
- sem problema ou sem objectivo (são o que define um PDCA);
- âmbito inválido; falta de permissão; conflito de versão.

**Decisão**

- texto vazio; âmbito inválido; falta de permissão.

**Reunião / segurança**

- quem termina não é o Chair;
- um assunto ligado deixou de estar acessível a quem publica;
- qualquer violação real de autorização devolvida pelos comandos (`access
denied`, `insufficient permission for the complete proposed scope`,
  `must already have access`);
- versão da reunião desactualizada (alguém mexeu entretanto).

Continuam a ser aplicadas no servidor (`validate_meeting_publish` e os
comandos de criação). A UI apenas as antecipa no ecrã "Terminar reunião" com
a mesma lista de regras, para que o utilizador nunca seja surpreendido por um
erro depois de carregar no botão.

## 15. Validações WARNING

Aparecem em "Pode ficar para depois", não impedem distribuir, e nunca
bloqueiam a criação:

- Tarefa sem prazo; PDCA sem prazo;
- Tarefa sem Owner (assume o criador; avisa só se o criador não puder ser
  Owner por falta de acesso);
- PDCA sem KPI, sem causa raiz, sem resultado esperado;
- Prioridade, impacto ou risco deixados na omissão "Média";
- sem colaboradores ou seguidores;
- tema da agenda sem resultado formal: passa a **warning**, com a regra
  determinística "temas sem resultado ficam automaticamente **Adiados** para a
  próxima reunião ao distribuir" (a regra actual exige resultado em todos;
  proposta de alteração ao domínio, ver secção 19 e o plano);
- decisão registada sem nenhuma acção ligada ("Esta decisão não gerou
  tarefas; é intencional?");
- Responsável com mais de N itens atrasados (sinal de sobrecarga, só
  informativo).

Cada aviso tem uma frase humana e, quando faz sentido, um botão para
resolver em dois cliques.

## 16. Funcionalidades a esconder sem remover do backend

| Funcionalidade                                                | Onde fica                                                                        |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Meeting Series como área                                      | dentro de Reuniões ("Repetir" na criação; "gerir repetição" no cabeçalho)        |
| Lifecycle da reunião (7 estados, transições manuais, reabrir) | 3 botões; reabrir em "Mais"                                                      |
| Estado `DRAFT` de reunião e `PUBLISHED`                       | invisíveis                                                                       |
| Publicação/snapshot                                           | "Ver resumo" na reunião terminada                                                |
| Selector de estado com todas as transições                    | botões com verbos permitidos                                                     |
| Empresa                                                       | derivada                                                                         |
| Área (departamento/serviço)                                   | inferida; avançado                                                               |
| Visibilidade                                                  | avançado, Normal por omissão                                                     |
| Versão do registo e do security object                        | oculta; usada nos formulários por baixo                                          |
| Owner em Tarefa                                               | avançado, por omissão o criador                                                  |
| Prioridade, impacto, risco                                    | avançado                                                                         |
| Colaboradores, seguidores, dependências                       | avançado no detalhe                                                              |
| Explicit grants                                               | fora da UI normal (ecrã de Administração futuro)                                 |
| Códigos de actividade e de alerta                             | rótulos em português; código como tooltip                                        |
| Painel Execution Validator                                    | linhas de alerta contextuais; painel só em "Alertas" quando houver mais de dois  |
| AI Assistant                                                  | um botão "Sugerir acções a partir das notas" dentro da reunião, só com AI activa |
| Fase do PDCA como formulário                                  | separadores no detalhe                                                           |
| Formulários de edição completos                               | "Editar" abre só o bloco relevante                                               |
| Filtros por Owner, área, prioridade                           | "Opções de filtro avançadas"                                                     |
| Participantes, horário e âmbito da reunião                    | "Mais ▾" no cabeçalho da reunião                                                 |
| Reordenar agenda com setas                                    | arrastar ou "subir/descer" em "Mais" do tema                                     |

## 17. Impacto da nova regra RESTRICTED

Regra aprovada (a implementar depois): **quem cria um objecto RESTRICTED
mantém sempre acesso ao que criou**, como parte da regra determinística de
autorização, não por explicit grant silencioso. PRIVATE continua "criador +
explicit grants".

Impacto:

- `private.can_access_security_object`: no ramo RESTRICTED, passa a devolver
  verdadeiro quando `security_objects.created_by_profile_id = actor` (além do
  caminho actual por `security.restricted.read` com âmbito, e dos grants).
  Uma condição, sem tabelas novas, sem migração de dados.
- RLS: as policies chamam essa função, logo herdam a regra sem alteração.
- Escritas: o criador passa a poder ler o seu objecto restrito; as escritas
  continuam a exigir as permissões de `update`, avaliadas com a mesma função,
  por isso o criador também passa a poder editá-lo (comportamento desejado:
  hoje a Sara nem consegue corrigir o que criou).
- Listas, pesquisa, My Work, Meeting Mode, exportações e AI usam a mesma
  função: coerência automática.
- Testes: os pgTAP actuais afirmam "Organizational scope intersection alone
  must not expose a Restricted object"; esse teste mantém-se válido (o
  criador não é "intersecção de scope"). Acrescentar testes: criador lê o seu
  restrito; outro utilizador com scope igual não lê; após transferência de
  "criador" não existe (o criador é imutável); perda de assinatura activa do
  criador (perfil inactivo) continua a negar, porque a função já rejeita
  perfis inactivos.
- Auditoria: nada muda; não há grant criado.
- Documentação: `CONTEXT.md` §16 e `docs/permissions.md` passam a dizer
  "RESTRICTED: criador, utilizadores explicitamente autorizados e
  administradores com `security.restricted.read`".
- Risco: um criador que mude de função continua a ver o objecto restrito que
  criou. É coerente com "quem criou sabe o conteúdo"; se for indesejado,
  a regra pode exigir também perfil activo na mesma empresa (já exige).

## 18. Estrutura proposta para o manual do utilizador

1. Primeiros passos (entrar, o que é a barra lateral, mudar de perfil)
2. O meu trabalho (o que significa cada bloco; o que fazer com um atraso)
3. Tarefas (criar em 30 segundos; Responsável e prazo; concluir; bloquear)
4. PDCAs (problema e objectivo; as quatro fases sem cerimónia; tarefas do PDCA)
5. Reuniões (preparar, abrir, trabalhar, terminar e distribuir; repetições)
6. Decisões (registar; ligar tarefas)
7. Permissões e visibilidade (onde se aplica, Normal/Restrita/Privada, "porque não vejo isto?")
8. Exemplos práticos (uma reunião de operações do início ao fim; um PDCA de desperdício)
9. Perguntas frequentes (não encontro uma pessoa no selector; a reunião não deixa terminar; como reabrir)

Cada capítulo com screenshots reais (script `scripts/screenshots.mjs`
alargado a cada passo) e no máximo uma página por tarefa. Regra de qualidade:
se um capítulo precisar de mais de cinco passos para criar uma tarefa numa
reunião, a UX ainda está complexa.

## 19. Riscos da simplificação

- **Inferência errada de âmbito.** Pré-preencher "Onde se aplica" com o
  restaurante da reunião pode criar tarefas no sítio errado quando a reunião
  cobre vários. Mitigação: quando a reunião cobre mais de um restaurante,
  o campo mostra-se aberto com "Todos os desta reunião" como escolha.
- **Owner implícito = criador.** Pode concentrar Owners numa pessoa (o Chair).
  Mitigação: aviso no fecho quando o Chair fica Owner de mais de N itens;
  Owner visível na lista "Quem fica com o quê".
- **Temas sem resultado passarem a warning** altera uma regra de domínio
  (`validate_meeting_publish`). Proposta: adiar automaticamente ao distribuir,
  com registo no histórico. Precisa de aprovação explícita e de migração
  (fase 5 do plano), não é UI.
- **"Terminar e distribuir" encadeia três transições** (REVIEW → PUBLISHED →
  CLOSED). Se a última falhar, a reunião fica publicada e não fechada.
  Mitigação: uma função SQL única e transaccional `finish_meeting` (aprovação
  necessária), ou tolerar o estado intermédio com "Fechar" automático na
  próxima abertura.
- **Esconder o estado da reunião** pode confundir quem esperava "publicado".
  Mitigação: o resumo da reunião terminada diz claramente "distribuída a 5
  pessoas a 3 de Setembro".
- **Perda de rastreabilidade para quem gere**: campos avançados escondidos
  são preenchidos menos vezes. Mitigação: os warnings no fecho e no detalhe
  lembram sem bloquear; o Execution Validator continua a medir.
- **Testes e2e** dependem de rótulos e códigos actuais; cada incremento tem
  de os actualizar (custo previsto).
- **Duas línguas durante a transição**: mistura temporária EN/PT. Mitigação:
  a camada de labels entra primeiro (incremento 1) e cobre tudo de uma vez.

## 20. Plano de implementação por pequenos incrementos

Cada incremento é entregável, testado (vitest, pgTAP, e2e) e não altera
schema, RLS nem lifecycles salvo onde indicado.

1. **Camada de labels PT-PT** (1 dia). `src/ui/labels.ts` com tabelas para
   estados, papéis, fases, visibilidade, relações, acções; helper
   `label(kind, code)`. Substituir todos os textos da UI; ajustar os e2e para
   usar rótulos ou `data-testid`. Sem alteração funcional.
2. **Navegação e cabeçalhos** (0,5 dia). Menu de cinco entradas, "Voltar",
   rodapé com função em português, Organização/Administração condicionais.
   Meeting Series sai do menu.
3. **O meu trabalho** (1 dia). Três blocos + linha de resumo; alertas como
   linhas de contexto; sem KPI cards.
4. **Criação rápida de Tarefa, PDCA e Decisão** (2 dias). Formulários de
   quatro campos com `Opções avançadas`; inferência de âmbito, área, Owner e
   empresa; Responsável obrigatório na Tarefa, Responsável e Owner
   obrigatórios no PDCA (validação na UI e no serviço; o domínio já exige ao
   sair de rascunho). Folha lateral reutilizável.
5. **Reunião: ecrã único** (3 dias). Pendentes anteriores com checkboxes,
   tema actual com Discutido/Adiar, notas simples, acções rápidas com contexto
   herdado, lista "Acções criadas nesta reunião"; "Abrir reunião" e "Terminar
   reunião" no lugar do lifecycle; participantes/horário/âmbito em "Mais".
   Criação de reunião com "Repetir" a gerir a série por baixo.
6. **Terminar reunião** (2 dias). Ecrã de resumo com Blocking/Warning
   calculados a partir das mesmas regras do servidor, "Corrigir" em folha
   lateral, "Terminar e distribuir" a encadear as transições. Aqui decide-se
   (aprovação separada) se se cria `finish_meeting` transaccional e se os
   temas sem resultado passam a adiados automaticamente.
7. **Detalhes de Tarefa e PDCA** (2 dias). Cabeçalho em uma linha, botões
   com verbos em vez de selector de estados, Progresso, Histórico legível,
   Opções avançadas; PDCA com separadores por fase.
8. **Listas e filtros** (1 dia). Colunas reduzidas, filtros essenciais e
   avançados, prioridade como ponto.
9. **Regra RESTRICTED** (1 dia, migração pequena + pgTAP + docs). Independente
   dos anteriores; pode entrar a qualquer momento após aprovação.
10. **Manual** (depois de 1–8): screenshots reais e texto por capítulo.

Ordem de valor: 1 → 2 → 5 → 6 → 4 → 3 → 7 → 8 → 9 → 10. Se só houver tempo
para três, fazer 1, 5 e 6: é onde a reunião deixa de ser administrativa.
