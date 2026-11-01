# Generazione PixelLab

Client REST v2 ufficiale. Prima di spendere altre generazioni serve autorizzazione del proprietario. Piano iniziale: 16 VFX condivisi, poi icone in ordine di priorità. Limite della sessione: sia 39 output sia 39 generazioni addebitate. Il saldo account prevale se inferiore.

Chiave solo dalla variabile di processo `PIXELLAB_API_KEY`: mai nei sorgenti, nei prompt, negli argomenti della shell o nel browser. `.tools/` contiene ledger e risposte integrali e rimane ignorata da Git.

```powershell
python -m pip install --target .tools/python Pillow==11.3.0
python tools/arte/pixellab.py balance
python tools/arte/pixellab.py batch
```

`batch` riprende il ledger esistente, attende un solo job alla volta, scarica e normalizza gli atlanti, poi genera le icone nel budget disponibile. `poll`, `download`, `pack` riprendono fasi singole. `icons N` genera al massimo N icone entro il limite. Lock del client e sostituzione atomica del ledger/manifest impediscono sovrapposizioni e letture parziali. Le icone entrano nel manifest al termine della sequenza.

Non reinviare automaticamente richieste dall’esito ambiguo: `submitting` richiede controllo presso il provider, perché il job potrebbe essere già addebitato. Dopo una chiusura forzata controllare che nessun client sia attivo prima di rimuovere `.tools/pixellab/client.lock`. Non modificare il ledger mentre il client lavora. Non azzerarlo per aggirare il budget.

Documentazione: https://api.pixellab.ai/v2/docs . Termini: https://www.pixellab.ai/termsofservice . Credito `PixelLab-output`, senza dichiarare gli output CC0.
