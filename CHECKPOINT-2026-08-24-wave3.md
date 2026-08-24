# Vral Graphics — checkpoint wave 3 · 2026-08-24

## RESULTADO

**PARTIAL**

GitHub `main` continua `c365d2b`. A URL pública continua velha. O Lovable deste projeto estava ligado ao repo errado (`vral-glimpse`); isso foi desconectado na interface autenticada. Reconectar `vral-graphics` parou em “No installations available”. E-mail/flyer foi provado só em sandbox local. Cloud/Postgres não foi criado. Nenhum cliente real foi contactado.

## URL

https://vral-vision-spark.lovable.app

## SHA

- local / origin: `c365d2b966e10204eaf4d282379183b5cd77b75a`
- vivo: não é `c365d2b` (copy “Printing for Less.” / `591 1017`)

## Lead / CRM / e-mail

- Lead persistido em produção: BLOCKED (Field Mode não está no ar)
- CRM: BLOCKED (nenhuma linha Postgres; adapter sem relay)
- E-mail/flyer: **SANDBOX REAL nesta máquina** — `delivery/outbox/*.eml` com o flyer original, destinatário de teste `mike+test@example.test`, 0 chamadas de provedor. Não foi enviado a prospect.

## QuickBooks

BLOCKED. A URL viva não tem checkout QuickBooks. Nenhuma tela Intuit de consentimento apareceu para deixar aberta.

## Provas

- Lovable/GitHub: `checkpoint-proofs/release-portal/` (15 settings glimpse, 19 disconnect, 22/30 no installations, 25 oauth error)
- Live stale 390/768/1440 EN/ES: `checkpoint-proofs/live-verify/`
- Sandbox e-mail: `delivery/PROOF.md` + outbox gitignored

## Bloqueios que sobreviveram a tentativa concreta

1. Lovable Settings → Git: este projeto estava em `vralmedia/vral-glimpse`. Depois do disconnect, Connect GitHub mostra **No installations available** mesmo com o app `lovable.dev` instalado no GitHub (All repositories). Refresh não listou instalação. Precisa o workspace Lovable enxergar a instalação e ligar **somente** `vralmedia/vral-graphics` / `main`, puxando GitHub → Lovable, sem empurrar a cópia velha para o GitHub.
