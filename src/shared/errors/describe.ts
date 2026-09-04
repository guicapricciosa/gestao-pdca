/**
 * Translates command failures (PostgreSQL exceptions raised by the domain
 * commands, PostgREST and network errors) into messages a person can act on.
 * Raw SQL or provider text never reaches the interface; the original message
 * is logged server-side by the caller.
 */
const RULES: readonly (readonly [RegExp, string])[] = [
  [
    /optimistic concurrency conflict|stale version|stale proposal version/i,
    "Alguém alterou este registo entretanto. Confirma os dados actualizados e volta a tentar.",
  ],
  [
    /insufficient permission for the complete proposed scope/i,
    "Não tens autoridade sobre todo o âmbito proposto. Escolhe apenas departamentos, serviços e restaurantes que cobres.",
  ],
  [
    /must already have (meeting )?access|adjust scope or create an explicit grant/i,
    "Essa pessoa ainda não tem acesso a este registo. Ajusta o âmbito ou pede um acesso explícito antes de a atribuir.",
  ],
  [
    /only the current chair can publish/i,
    "Só o Chair actual pode publicar esta reunião.",
  ],
  [
    /all agenda items require an outcome/i,
    "Todos os itens da agenda precisam de um resultado (discutido, adiado ou fechado) antes de publicar.",
  ],
  [
    /linked (task|pdca) is incomplete/i,
    "Há Tasks ou PDCAs criados nesta reunião sem Owner, Responsible ou prazo. Completa-os antes de publicar.",
  ],
  [
    /linked object is no longer accessible/i,
    "Um dos objectos ligados deixou de estar acessível. Remove a ligação ou corrige o âmbito.",
  ],
  [
    /production task requires owner, responsible and due date/i,
    "Para sair de rascunho, a Task precisa de Owner, Responsible e prazo.",
  ],
  [
    /production pdca requires/i,
    "Para sair de rascunho, o PDCA precisa de problema, objectivo, Owner, Responsible e prazo.",
  ],
  [
    /blocked (task|pdca) requires an active blocker/i,
    "Regista primeiro o bloqueio; só depois o estado pode passar a bloqueado.",
  ],
  [
    /cannot complete a task with active blockers/i,
    "Resolve os bloqueios activos antes de concluir.",
  ],
  [
    /pdca completion requires act, actual result, closure notes and no blockers/i,
    "Para concluir o PDCA: fase ACT, resultado real, notas de fecho e nenhum bloqueio activo.",
  ],
  [
    /invalid (task|pdca|meeting) status transition/i,
    "Essa mudança de estado não é permitida a partir do estado actual.",
  ],
  [
    /reopening reason is required|cancellation reason is required|reason is required|a reason is required/i,
    "Indica o motivo para continuar.",
  ],
  [/proposal already reviewed/i, "Esta proposta já foi revista por alguém."],
  [
    /proposal is stale/i,
    "A reunião mudou depois desta proposta ter sido gerada. Gera as propostas de novo.",
  ],
  [
    /findings are recommendations/i,
    "As recomendações não são executáveis; apenas se podem dispensar.",
  ],
  [
    /email already invited|email_exists|already been registered/i,
    "Já existe uma conta com esse email. Usa «Reenviar convite» ou a recuperação de palavra-passe.",
  ],
  [
    /invite failed|over_email_send_rate_limit|rate limit/i,
    "O envio do email de convite falhou (limite de envios atingido). Espera uns minutos e tenta de novo.",
  ],
  [
    /at least one restaurant is required/i,
    "Escolhe pelo menos um restaurante, ou muda o âmbito para «Todos» ou «Nenhum».",
  ],
  [
    /unknown (role|organizational unit|restaurant)/i,
    "O papel, o departamento ou o restaurante escolhido não pertence a esta empresa.",
  ],
  [
    /not found or access denied|access denied|permission denied|not owned/i,
    "Sem permissão para esta operação, ou o registo já não está acessível.",
  ],
  [
    /fetch failed|econnrefused|network|timeout|502|503|upstream/i,
    "O servidor não respondeu. Tenta novamente dentro de instantes.",
  ],
  [
    /end must be after start/i,
    "A hora de fim tem de ser depois da hora de início.",
  ],
  [
    /too small|at least 2 character|title.*length/i,
    "O título precisa de ter entre 2 e 240 caracteres.",
  ],
  [
    /violates check constraint|invalid input syntax|value too long/i,
    "Alguns valores não são válidos. Revê o formulário e tenta de novo.",
  ],
];

export function describeCommandError(
  message: string | null | undefined,
): string {
  const text = message ?? "";
  for (const [pattern, friendly] of RULES)
    if (pattern.test(text)) return friendly;
  return "Não foi possível concluir a operação. Se o problema persistir, contacta o Support & IT.";
}
