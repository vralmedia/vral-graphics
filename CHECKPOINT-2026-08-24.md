# Vral Graphics — checkpoint 2026-08-24

## Retomada rápida

- Projeto: `/Users/seujao/aura-engine/vral-graphics`
- Branch: `main`
- Base local antes do checkpoint: `69e9b60718a1137a46bc7d5b6d72f9c6e3607065`
- GitHub: `git@github.com:vralmedia/vral-graphics.git`, `main` acompanha `origin/main`
- URL pública: `https://vral-vision-spark.lovable.app`
- Projeto Lovable confirmado pela URL: `0c4c6418-ebcd-4d69-a801-e39aaaccb18a`

## Estado salvo

Esta rodada preserva as alterações não commitadas dos agentes no mesmo commit deste checkpoint. A superfície local contém:

- landing EN/ES e jornada `#print-desk`;
- Field Mode explicitamente bloqueado sem relay/autenticação;
- Specials com cálculo de impressão, design fora da base tributável, imposto de 7% e total;
- backend de lead com validação, honeypot, Bearer, CORS exato, dedupe/idempotência e rate limit;
- adapters CRM/e-mail honestamente `BLOCKED` quando não configurados;
- checkout, webhook assinado/deduplicado e QuickBooks exigindo pagamento verificado;
- documentação e testes correspondentes.

Não há autorização para apagar o trabalho já feito. Não publicar, não enviar mensagem a cliente e não criar credenciais nesta retomada.

## Provas independentes desta rodada

- `node --check app.js` passou.
- `node --check i18n.js` passou.
- `node --test backend/test/*.test.js tests/payments/*.test.js`: **22/22** passaram.
- `git diff --check` passou.
- Ego-browser local verificou: EN/ES no fluxo ativo, Field Mode bloqueado de forma explícita, e-mail inválido bloqueado, conclusão do brief sem envio, armazenamento local do estado e cálculo final das Specials para 2.500 + frente/reverso: impressão `$139.00`, design `$75.00` + `$10.00`, base tributável `$139.00`, imposto `$9.73`, total `$233.73`.

## Estado externo comprovado

- A URL pública responde HTTP 200, mas está atrasada: ainda mostra `Printing for Less.` e WhatsApp `+1 786 591 1017`, não o contato Mike/commit local.
- O projeto Lovable é `vral-vision-spark`, público na URL acima, mas o audit interno encontrou apenas remotes Lovable, sem remote GitHub; commit Lovable atual: `194c36b2cbd2a6e724a9453bec2f5478b4a508a2`.
- O commit local `69e9b60` não existe no histórico Lovable. Não afirmar que houve deploy.

## Pendências bloqueadas

1. No Lovable, conectar o projeto exato ao repositório `vralmedia/vral-graphics`, confirmar branch `main`, verificar o commit `69e9b60` e só então redeployar.
2. No ambiente de produção, configurar storage durável, `VG_FORM_API_KEY`, `VG_FORM_ALLOWED_ORIGIN`, relay CRM, relay de e-mail/flyer e validar um lead real sem expor segredo.
3. Criar/conectar gateway e OAuth QuickBooks sandbox/produção; configurar repositório atômico de pedidos e eventos; validar webhook real.
4. Gerar novas provas desktop/mobile depois do deploy/sync. Os PNGs existentes em `proofs/red-mission/` são da versão anterior e não devem ser tratados como prova desta rodada.

## Prompt de retomada para o próximo orquestrador

Você é o orquestrador principal da missão Vral Graphics. Comece lendo este arquivo inteiro e rodando `maestri list`; não confie em resumos de agentes antigos. Use relógio absoluto de no máximo 10 minutos. Você pode ter no máximo **5 executores diretos**, sem líderes, sem agentes abaixo de agentes e sem qualquer recrutamento aninhado. Os executores devem rodar como **Codex 5.6 Luna xhigh fast**; o terminal principal será comandado pelo modelo que João escolher, atualmente Grok 4.6 xhigh. Se o preset exato não existir, não invente alias: registre o nome real disponível e pare antes de recrutar.

Objetivo: fechar e provar o pacote local e preparar a sincronização/deploy sem fingir integrações. Trabalhe em fatias com arquivos exclusivos: (1) frontend `index.html`, `styles.css`, `app.js` e provas; (2) backend `backend/**`; (3) pagamentos `server/payments/**`; (4) QA browser/responsivo e revisão read-only; (5) release/deploy/Lovable read-only. Nenhum executor pode tocar a fatia de outro. Antes de qualquer escrita, cada executor devolve o estado encontrado; depois implementa somente o necessário e roda seus testes. Não pedir ao João o que pode ser descoberto localmente ou no projeto Lovable exato.

Critérios obrigatórios: caminho CTA → produto → finalidade → arte → contato → revisão; EN/ES sem drift no fluxo ativo; Field Mode e serviços externos bloqueados honestamente; cálculo de Specials correto; reload/mobile/offline/popup bloqueado quando aplicável; `node --check`, `node --test backend/test/*.test.js tests/payments/*.test.js` e `git diff --check`; screenshot desktop/mobile novo; URL viva comparada com o commit; REAL/SANDBOX/BLOCKED por integração. Não enviar WhatsApp, e-mail ou mensagem a cliente. Não criar credenciais, não gastar dinheiro e não publicar até o estado de sincronização estar comprovado.

Ao final, o orquestrador deve salvar um novo checkpoint com arquivos, commit, testes, provas, integrações `REAL | SANDBOX | BLOCKED`, riscos e um único próximo passo. Classifique apenas `DONE`, `PARTIAL` ou `BLOCKED`. Se Lovable continuar sem GitHub conectado, deixe isso explícito e entregue a ação manual exata: conectar o projeto `0c4c6418-ebcd-4d69-a801-e39aaaccb18a` ao repo `vralmedia/vral-graphics`, confirmar `main`/`69e9b60`, redeployar e repetir o smoke test.
