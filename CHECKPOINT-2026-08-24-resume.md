# Vral Graphics — checkpoint resume 2026-08-24

## Classificação

**PARTIAL**

O pacote local está provado. A URL pública e o projeto Lovable `0c4c6418-ebcd-4d69-a801-e39aaaccb18a` não acompanham nem o commit local nem o `origin/main`. Deploy não foi declarado.

## Roster e preset

- `maestri list` no começo e no fim: só `Terminal`. Nenhum agente, nota ou portal conectado.
- Pedido de executores: `Codex 5.6 Luna xhigh fast`.
- Presets reais do Maestri: `Claude Code`, `Codex`, `Antigravity`, `OpenCode`, `Shell`.
- Codex CLI local: `codex-cli 0.149.1`, modelo padrão `gpt-5.6-sol`, esforço `high`.
- O preset pedido não existe. Nenhum agente foi recrutado. O orquestrador Grok 4.6 xhigh executou as cinco fatias sem escrita sobreposta.

## Estado git

- Repo: `/Users/seujao/aura-engine/vral-graphics`
- Branch: `main`
- HEAD local no início desta retomada: `9b90fbcc0ae02f6b33fe809405a91d56c1faba1b`
- `origin/main` / GitHub público: `69e9b60718a1137a46bc7d5b6d72f9c6e3607065`
- Local está 4 commits à frente de `origin/main` (checkpoint + ajustes de Field Mode, testes e copy). Nada foi enviado ao GitHub nesta rodada.
- URL pública: `https://vral-vision-spark.lovable.app`
- Projeto Lovable: `0c4c6418-ebcd-4d69-a801-e39aaaccb18a`

## Testes

- `node --check app.js` passou.
- `node --check i18n.js` passou.
- `node --test backend/test/*.test.js tests/payments/*.test.js`: **22/22** passaram.
- `git diff --check` passou.
- Servidor local desta rodada: `http://127.0.0.1:4526/` (a porta 4522 já estava ocupada e respondia vazio).

## Provas de browser (novas)

Pasta commitada: `checkpoint-proofs/resume-2026-08-24/` (cópia de trabalho também em `proofs/resume-2026-08-24/`, ignorada pelo git)

Locais desktop/mobile:

- `local-desktop-1440-landing.png`
- `local-desktop-1440-es.png`
- `local-desktop-1440-field.png`
- `local-desktop-1440-specials-2500.png` — impressão `$139.00`, frente `$75.00`, verso `$10.00`, base `$139.00`, imposto `$9.73`, total `$233.73`
- `local-desktop-1440-brief-ready.png` — jornada completa, “Nothing has been sent yet.”
- `local-desktop-1440-reload.png` — “Continue your print job?”
- `local-mobile-390-landing.png`
- `local-mobile-390-desk.png`
- `local-mobile-390-specials.png`
- `local-mobile-390-field.png`

URL pública (atrasada):

- `live-desktop-1440-stale.png`
- `live-mobile-390-stale.png`

Log: `checkpoint-proofs/resume-2026-08-24/qa.json`

Jornada local comprovada: CTA → produto → finalidade → arte → contato → revisão. EN/ES no fluxo ativo (`app.js`, `i18n.js` não carrega). E-mail inválido bloqueado. Field Mode bloqueado sem relay. Popup do WhatsApp bloqueado cai no recado do Mike `+1 (786) 461-7465`. Offline impede abrir WhatsApp. Reload restaura o brief neste navegador. Nenhum WhatsApp, e-mail ou mensagem foi enviado.

## Integrações

| Peça | Classificação | Prova |
|---|---|---|
| Landing local estática | REAL | `http://127.0.0.1:4526/` + screenshots |
| Copy EN/ES ativa | REAL | troca EN/ES na página local |
| Link `wa.me/17864617465` | REAL (não enviado) | construído no brief; popup/offline testados sem envio |
| Field Mode / captura de lead na página pública | BLOCKED | copy explícita + screenshot |
| `POST /api/leads` em produção | BLOCKED | sem `VG_FORM_API_KEY`, origin e storage durável |
| CRM webhook | BLOCKED | `VG_CRM_WEBHOOK_URL` vazio; testes recusam sucesso inventado |
| Relay de e-mail/flyer | BLOCKED | `VG_FLYER_EMAIL_WEBHOOK_URL` vazio |
| Gateway de pagamento | BLOCKED | checkout 503 sem adapter |
| Webhook de pagamento | BLOCKED | exige HMAC e repositório atômico |
| QuickBooks | BLOCKED | faltam `QUICKBOOKS_REALM_ID` e `QUICKBOOKS_ACCESS_TOKEN`; se existissem, o default seria sandbox |
| GitHub `vralmedia/vral-graphics` | REAL | API pública, `main` = `69e9b60` |
| Lovable  `0c4c6418-ebcd-4d69-a801-e39aaaccb18a` ↔ GitHub | BLOCKED | MCP Lovable fora; URL viva ainda em “Printing for Less.” e WhatsApp `591 1017` |
| Site público | REAL, conteúdo atrasado | HTTP 200, screenshots live |

## Bloqueios

1. Lovable não está ligado ao GitHub `vralmedia/vral-graphics`. A URL pública não tem o slogan, o telefone do Mike, Field Mode nem Specials desta base.
2. Produção ainda sem storage durável, chave do form, origin, CRM, e-mail e gateway.
3. QuickBooks e checkout continuam sem credencial. Nada foi inventado.

## Risco residual

O atalho “Skip to print desk” ainda pode cobrir o título de Field Mode em captura de página inteira. Não muda a jornada nem os números.

## Um próximo passo

No Lovable, abrir o projeto `0c4c6418-ebcd-4d69-a801-e39aaaccb18a`, conectar o repositório `vralmedia/vral-graphics`, confirmar a branch `main`, publicar o commit local desta pasta (hoje `9b90fbc` ou o commit deste checkpoint) e repetir o smoke test na URL pública até ela mostrar “Quality Printing for Less.” e Mike `+1 (786) 461-7465`.
