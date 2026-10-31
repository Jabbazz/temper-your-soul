---
name: tys-collabora
description: Flusso di collaborazione di Temper your soul tra il fork dell'utente e il progetto di Jabbaz. Usare all'inizio di ogni lavoro (allineamento con Jabbazz/temper-your-soul), alla fine (verify, commit, push sul fork) e quando l'utente chiede di "salvare", "aggiornare da Jabbaz", "proporre a Jabbaz" o aprire una pull/merge request.
---

# Collaborare su Temper your soul

Il progetto principale è `Jabbazz/temper-your-soul` (proprietario Jabbaz). L'utente lavora sul fork `hocosaproduzione-dotcom/temper-your-soul`. Remoti: `origin` = Jabbaz (sola lettura), `fork` = fork (pubblicazione, `remote.pushDefault=fork`). Regole complete in `README.md` («Prima di lavorare») e in `docs/prompt-di-progetto.md`.

## All'inizio

1. Comunica in italiano obiettivo e incremento previsto.
2. Controlla cartella e stato: `git rev-parse --show-toplevel`, `git status --short --branch`.
3. `git fetch origin` e `git log --oneline HEAD..origin/main`:
   - nessun commit nuovo: prosegui;
   - commit nuovi: leggi i messaggi e il diff dei file che toccherai, poi `git merge origin/main` (mai `reset --hard`, mai rebase di commit già pubblicati, mai stash automatici). In caso di conflitto spiega all'utente cosa confligge e proponi la risoluzione, senza scartare il lavoro di nessuno;
   - dopo l'unione: `npm ci` se è cambiato `package-lock.json`, poi `npm run verify`.
4. Per una proposta nuova crea un ramo dedicato a partire da `origin/main` aggiornato: `git switch -c feature/<tema> origin/main`. Se la cartella ha modifiche non salvate di un altro ramo, usa una worktree (`git worktree add ../temper-your-soul-<tema> -b feature/<tema> origin/main`) invece di cambiare ramo.

## Durante

- Aggiorna l'utente spesso con frasi brevi: risultati, ostacoli, cambi di piano.
- Dopo ogni modifica: `npm run verify` (deve uscire con 0).

## Alla fine (solo con il permesso dell'utente)

1. `git status` e `git diff --stat`: niente `dist/`, `node_modules/`, file temporanei o dati personali.
2. Commit in italiano, descrittivo (cosa e perché), con la riga di attribuzione richiesta dall'ambiente.
3. `git fetch origin`: se `origin/main` è avanzato, unisci e riverifica prima di pubblicare.
4. `git push` (va sul fork); al primo push del ramo `git push -u fork <ramo>`. Mai `--force`.
5. Pull request, solo se l'utente la chiede:

   ```bash
   gh pr create --repo Jabbazz/temper-your-soul --base main --head hocosaproduzione-dotcom:<ramo> --title "<titolo in italiano>" --body-file <file>
   ```

   Corpo: cosa cambia, perché, verifiche automatiche e nel browser, cosa provare a mano, decisioni richieste a Jabbaz. Termina con la riga di attribuzione richiesta dall'ambiente.
6. Riporta ramo, hash e link della pull request.

## Da non fare

- Pubblicare su `origin` (non è permesso e non va tentato), force push, cancellare rami altrui.
- Aggiornare le dipendenze insieme ad altre modifiche.
- Dichiarare "provato" ciò che solo l'utente può confermare giocando.
