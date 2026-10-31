import { MUZZLE } from '../skills/mage-skills';
import type { SkillDefinition } from '../skills/skill-definition';

/** Nuove abilità: valori comuni provvisori, risolti poi dalla rarità. Nessun effetto fuori dalla simulazione. */
export const DUNGEON_ITEM_SKILLS = {
  ossuary_lantern:{id:'ossuary_lantern',name:'Luci dell’ossario',description:'Due luci lente e larghe che rallentano il bersaglio',cooldown:2.8,visual:'ossuary_light',effect:{kind:'projectile',muzzleOffset:MUZZLE,count:2,spread:.35,projectile:{team:'player',speed:200,damage:44,radius:8,lifetime:3,slowSeconds:.7,visual:'ossuary_light'}}},
  grave_boots:{id:'grave_boots',name:'Passo sepolcrale',description:'Scatto breve, con ampia finestra di invulnerabilità',cooldown:4.2,visual:'grave_step',effect:{kind:'dash',distance:110,invulnerability:.85}},
  thorn_bow:{id:'thorn_bow',name:'Doppia spina',description:'Due spine divergenti a gittata media',cooldown:.5,visual:'thorn_spike',effect:{kind:'projectile',muzzleOffset:MUZZLE,count:2,spread:.14,projectile:{team:'player',speed:490,damage:22,radius:4,lifetime:1.5,visual:'thorn_spike'}}},
  reed_mantle:{id:'reed_mantle',name:'Cerchio di rovi',description:'Un campo di rovi esplode attorno a te e rallenta',cooldown:6.2,visual:'reed_burst',effect:{kind:'ground_blast',center:'caster',zone:{team:'player',radius:145,delay:.7,damage:145,slowSeconds:1.1,visual:'reed_burst'}}},
  cinder_orb:{id:'cinder_orb',name:'Tridente di brace',description:'Tre braci rapide in un ventaglio stretto',cooldown:2.2,visual:'cinder_fragment',effect:{kind:'projectile',muzzleOffset:MUZZLE,count:3,spread:.18,projectile:{team:'player',speed:410,damage:38,radius:5,lifetime:1.3,visual:'cinder_fragment'}}},
  ember_treads:{id:'ember_treads',name:'Balzo della fornace',description:'Scatto lungo, protezione breve e recupero lento',cooldown:4.8,visual:'ember_step',effect:{kind:'dash',distance:230,invulnerability:.25}},
  glacier_mirror:{id:'glacier_mirror',name:'Frammenti speculari',description:'Cinque schegge ad ampio ventaglio che rallentano',cooldown:3.1,visual:'mirror_shard',effect:{kind:'projectile',muzzleOffset:MUZZLE,count:5,spread:.28,projectile:{team:'player',speed:540,damage:27,radius:3,lifetime:1.7,slowSeconds:.6,visual:'mirror_shard'}}},
  rime_boots:{id:'rime_boots',name:'Passo di brina',description:'Scatto medio, protezione bilanciata e recupero rapido',cooldown:2.9,visual:'rime_step',effect:{kind:'dash',distance:165,invulnerability:.4}},
} as const satisfies Readonly<Record<string,SkillDefinition>>;
