# Vral Graphics — checkpoint Luna 2026-08-24

## RESULTADO

**PARTIAL**

Quatro Lunas `gpt-5.6-luna high fast` rodaram em paralelo. Backend e pagamentos avançaram com testes verdes. A URL pública continua atrasada. Lovable não está ligado ao GitHub. CRM, e-mail e QuickBooks Payments continuam BLOCKED sem credencial real.

## SHA

- Local no despacho: `4790dbd`
- origin/main no despacho: `69e9b60`
- SHA deste checkpoint: preencher no commit (ver `git log -1`)
- URL viva: `https://vral-vision-spark.lovable.app` — HTTP 200, copy velha, SHA vivo não corresponde ao local

## Roster

- Orquestrador: Grok 4.6 xhigh (`Terminal`)
- Executores: `VG-RELEASE`, `VG-LEADS`, `VG-PAYMENTS`, `VG-VERIFY`
- Preset Maestri: `Codex` + comando `codex --model gpt-5.6-luna -c model_reasoning_effort="high"`
- Confirmado na TUI: `gpt-5.6-luna high fast`

## Arquivos desta onda

- `backend/**` — persistência JSONL, fila/retry, adapters BLOCKED sem URL
- `server/payments/**` + `tests/payments/**` — catálogo flyer, checkout QuickBooks BLOCKED, webhook, reconciliação
- `checkpoint-proofs/wave-luna-2026-08-24/`
- `backend/STATUS.md`, `server/payments/STATUS.md`, `release/STATUS.md`
- Landing pública não reconstruída (`index.html` / `app.js` / `styles.css` / `i18n.js` sem mudança de produto)

## Testes

- `node --check app.js` / `i18n.js` / `backend/server.js` / `server/payments/checkout.js`
- `node --test backend/test/*.test.js tests/payments/*.test.js` → **33/33**
- `git diff --check` passou
- Segredos: nenhum `.env` real no tree; placeholders só em `.env.example`

## Provas

- Local 390/768/1440 em `checkpoint-proofs/wave-luna-2026-08-24/`
- Live ainda “Printing for Less.” e `591 1017`

## Matriz

| Peça | Classe |
|---|---|
| Landing local | REAL |
| GitHub SSH `vralmedia/vral-graphics` | REAL |
| Site público Lovable | REAL, conteúdo atrasado |
| Link WhatsApp Mike | REAL, não enviado |
| Persistência de lead (local JSONL) | SANDBOX |
| Auth/CORS do form em produção | BLOCKED |
| CRM | BLOCKED |
| E-mail/flyer | BLOCKED |
| Field Mode público | BLOCKED |
| Catálogo Specials server-side | REAL (código) |
| Checkout QuickBooks | BLOCKED |
| Webhook/pedidos atômicos | BLOCKED |
| QuickBooks OAuth | SANDBOX/BLOCKED (default sandbox, sem realm/token) |
| Lovable ↔ GitHub | BLOCKED |

## Até cinco bloqueios humanos

1. Lovable: conectar `0c4c6418-ebcd-4d69-a801-e39aaaccb18a` ao repo `vralmedia/vral-graphics` / `main`.
2. Gerar `VG_FORM_API_KEY` e `VG_FORM_ALLOWED_ORIGIN` no secret store (nunca no frontend).
3. Ligar relay CRM real em `VG_CRM_WEBHOOK_URL`.
4. Ligar relay de e-mail/flyer com o flyer anexo em `VG_FLYER_EMAIL_WEBHOOK_URL`.
5. Intuit: Connect to QuickBooks (Sandbox) e guardar realm + token no servidor.

## Próximo passo único

No Lovable, Settings → GitHub → conectar `vralmedia/vral-graphics` branch `main` e republicar até a URL mostrar “Quality Printing for Less.” e Mike `+1 (786) 461-7465`.
