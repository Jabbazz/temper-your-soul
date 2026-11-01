# Ritratti illustrati A

Asset generati dalla tavola «Proposta A — Fantasy compatto» scelta dall'utente. I PNG contengono trasparenza reale e vengono distribuiti localmente con il gioco; nessun servizio di generazione viene chiamato a runtime.

- `bases-a.png`: prima coppia di basi, conservata come riferimento e non caricata dal gioco.
- `class-bases-a.png`: sei basi, maschile e femminile per Guerriero, Arciere e Mago. Piedi senza stivali e mani in pose adatte alla classe.
- `archer-rest-a.png`: sostituisce le due pose dell’arciere con braccia abbassate e arco a riposo; generato con lo strumento integrato `imagegen`, usando `class-bases-a.png` come riferimento.
- `armor-a.png`: cinque armature, ciascuna nelle versioni maschile e femminile.
- `equipment-a.png`: sei armi primarie, tre oggetti secondari e tre paia di stivali.

Ritagli degli oggetti in `features/presentation/portrait-layout.ts`; collegamento delle 17 famiglie agli atlanti in `portrait-atlas.ts`. In `portrait-rig.ts` ogni posa registra mani, collo, spalle, caviglie e suole. Le armi si agganciano alla presa, gli stivali si compongono separatamente su ciascuna gamba con scala e rotazione. Dita e testa vengono ridisegnate davanti agli oggetti; le estremità inferiori delle armi lunghe passano dietro il corpo. La posa del mago viene specchiata per tenere il bastone nella primaria e il tomo nella secondaria. La versione femminile usa basi e armature proprie.

Questi asset servono alla scheda personaggio e alla selezione del corpo. I ritratti illustrati sono statici; gli sprite di combattimento restano pixel art compatta disegnata dal compositore `character-art.ts`, con animazioni e profondità proprie. Verifica geometrica e fotogrammi browser non sostituiscono l'approvazione visiva dell'utente.

Le armature sono registrate in `portrait-armor.ts` con collo, cintura e spalle per entrambi i corpi. Busto e gonna si adattano separatamente, con giunto continuo alla cintura. Gli stivali sono dietro all’indumento, così la tunica ne copre la tomaia. Le proporzioni del ritratto restano 4:5 anche sulla vista stretta.

Su tutte le pose gli stivali passano invece sotto la gamba: `cuffClipPath` taglia la base lungo gli orli dei pantaloni (`cuff` in `portrait-rig.ts`), così l’orlo ricade sullo stivale e ne nasconde l’interno e il bordo posteriore, mentre piume e fronte del gambale restano sopra i pantaloni (`overPants`). Il palmo sta dietro l’arma: davanti restano le dita del disegno originale (`primaryFingers`). Manto della meteora, egida di brace e corazza della fornace hanno la parte bassa divisa fra davanti e dietro le gambe (`ARMOR_LOWER_FRONT`). Il mantello delle canne è diviso in due: la cappa dietro il corpo e due lembi sul petto.

## Prompt della variante arciere a riposo

Use case: precise-object-edit. Create a NEW transparent sprite atlas with just TWO full-body neutral fantasy archer BASE characters, male LEFT and female RIGHT. Reference image is style and identity reference: match EXACT same detailed compact fantasy pixel illustration, male brown spiky hair, female auburn ponytail, linen sleeveless tunic, brown trousers and wrist wraps, sock feet NO boots, NO armor, NO weapons, NO bow, NO text, NO background. Both archers stand naturally at REST, weight balanced with feet moderately apart, torso 3/4 facing right. IMPORTANT both arms lowered, NOT aiming: image-right arm elbow gently bent, closed hand just outside hip at waist height to hold a relaxed vertical bow later; image-left arm relaxed with closed hand near thigh. Hands and wrists fully visible outside torso. Male sturdy, female visibly slimmer. Keep head body proportions and rendering exactly like provided bases. Leave ample transparent margin. Layout 1024x1024 square, male centered at x256, female centered at x768; each whole character from y80 hair to y940 soles. Characters must not overlap. Anatomically natural relaxed arms, no extended shooting arms. Transparent alpha background.
