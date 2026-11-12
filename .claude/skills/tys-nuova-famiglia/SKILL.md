---
name: tys-nuova-famiglia
description: Ricetta per aggiungere una famiglia di oggetti (e la sua skill) a Temper your soul - dati della skill, classe, costo mana, icone, aspetto, suono, pool di bottino, salvataggi e test. Usare quando si crea un nuovo oggetto, arma, armatura o abilità.
---

# Aggiungere una famiglia di oggetti

Riferimenti: `AGENTS.md` (Convenzioni → Contenuti → Oggetti) e `docs/game-design.md`. L'id della famiglia è salvato nei salvataggi dei giocatori: **mai rinominarlo**.

## Checklist

1. **Skill**: `SkillDefinition` in `items/item-skills.ts` o `items/dungeon-item-skills.ts` (id, nome e descrizione in italiano, ricarica, `visual`, effetto). Se serve un nuovo tipo di effetto: caso in `skills/skill-effects.ts`, in `Effects.onSkillCast` e nel catalogo audio; test del comportamento.
2. **Famiglia**: voce in `items/item-families.ts` (slot, nome, skill, origine `exclusiveTo` se di set).
3. **Classe richiesta**: `items/item-classes.ts`.
4. **Mana**: costo in `SPELL_MANA` (`skills/mana.ts`).
5. **Icone**: oggetto (`presentation/item-sprites.ts`) e spell (`presentation/skill-icons.ts`), prodotte con PixelLab MCP secondo `tys-grafica-pixellab` e `docs/canone-grafico.md`, collegate ai registri esistenti.
6. **Aspetto**: seguire `tys-grafica-pixellab` e `docs/canone-grafico.md` prima di produrre. Il corpo dei personaggi non si rigenera per un oggetto: l'arma primaria è un livello separato che ruota verso il mouse, armatura e stivali ricolorano il corpo con il materiale del pezzo. Servono la voce in `SHADOW_EQUIPMENT` (`presentation/shadow-equipment.ts`: materiale e disegno dell'oggetto) e quella in `WEARABLES` (`presentation/character-art.ts`: strato dei ritratti illustrati); un test controlla che ogni famiglia sia in `WEARABLES`. Proiettili, zone e scatti restano nei registri `presentation/looks/`. Le armi e gli altri equipaggiamenti saranno rifatti in una sessione dedicata: concordare con l'utente prima di generare.
7. **Suono**: associa il `visual` a un suono per materiale in `SKILL_SOUNDS` (e in `ZONE_SOUNDS` se crea zone) di `audio/audio-catalog.ts`; il test del catalogo fallisce se manca.
8. **Bottino**: voce esplicita nei pool di `loot/loot-tables.ts` (non derivarla da `exclusiveTo`).
9. **Salvataggi**: nessuna migrazione serve per una famiglia nuova; servono per rarità o slot nuovi (`SAVE_VERSION`).
10. **Test**: i test generici di oggetti, icone, mana e audio coprono la nuova voce; aggiungi test per il comportamento specifico e provali con una mutazione.
11. **Documentazione**: tabella delle famiglie in `docs/game-design.md`, valori marcati come provvisori.

`npm run verify` verde e prova nel browser (zaino, tooltip, partita) prima di dichiarare finito.
