# 13. Importar gravações Plaud

As gravações Plaud são pessoais. O que sai delas entra na plataforma como
**PDCAs privados teus**, com as subtarefas ligadas e a referência à gravação,
para que a mesma acção nunca seja importada duas vezes.

## Sem copiar nada

Com o conector Plaud ligado ao Claude (Definições do Claude › Conectores ›
Plaud, com o Plaud Cloud Sync activo), basta pedir: «importa a gravação de
hoje para o PDCA». O assistente lê a gravação, extrai as acções e faz a
importação directamente, com as mesmas regras abaixo. O ecrã fica como
alternativa manual.

## Como

1. Pede ao assistente as pendências de uma gravação e depois «prepara estas
   pendências para importar no PDCA». Copia o bloco JSON.
2. Em **Definições › Importar Plaud**, cola o JSON e carrega em
   **Pré-visualizar**. A lista mostra cada acção com fase, prioridade, prazo
   e número de subtarefas; se algo estiver errado no JSON, o erro diz qual o
   campo.
3. Escolhe o **restaurante de referência** (obrigatório) e, se quiseres, a
   área. Carrega em **Importar**.

No fim vês quantos PDCAs foram criados e quantos foram ignorados por já
existirem dessa gravação.

## O que fica criado

- Um PDCA por acção, **privado**, com Owner e Responsável tu. O problema é a
  descrição da acção mais uma linha «Origem: gravação Plaud · título · data ·
  ref»; o objectivo é a nota de estado da acção.
- Uma tarefa privada por subtarefa, ligada ao PDCA.
- A fase indicada (Planear, Fazer, Verificar, Actuar). Acções marcadas
  «Done» entram na fase Actuar e ficam concluídas, com a nota «Concluído na
  gravação».
- Os restantes ficam em rascunho, como qualquer PDCA novo: activa-os quando
  fizer sentido, e muda a visibilidade em «Opções avançadas» se quiseres que
  outros os vejam.

## Formato

```json
{
  "source": {
    "provider": "plaud",
    "recording_id": "ID_DA_GRAVACAO",
    "recording_title": "Reunião diária",
    "recorded_at": "2026-08-27"
  },
  "actions": [
    {
      "title": "Investigar falha nas reservas de grupo",
      "description": "Reservas com mais de 15 pessoas avançam sem menu.",
      "phase": "Plan",
      "priority": "high",
      "start_date": "2026-08-28",
      "due_date": "2026-09-01",
      "status_note": "Por validar com operações",
      "tasks": ["Reproduzir o erro", "Corrigir", "Validar em produção"]
    }
  ]
}
```

- `title` é obrigatório; `phase` aceita `Plan`, `Do`, `Check`, `Act` ou
  `Done`; `priority` aceita `high`, `medium` ou `low`; datas em `AAAA-MM-DD`.
- `tasks` pode ter texto ou objectos com `title`.
- `source` pode vir uma vez para o lote ou em cada acção.
