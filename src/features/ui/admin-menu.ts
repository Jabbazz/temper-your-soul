import { RARITIES, RARITY_STATS, isRarity, type Rarity } from '../items/rarity';
import { requireElement } from './dom';

/** Menu a tendina degli strumenti di sviluppo nel menu principale. Non conosce le regole: espone solo i comandi. */
export class AdminMenu {
  private readonly root = requireElement<HTMLDetailsElement>('admin-menu');
  private readonly rarity = requireElement<HTMLSelectElement>('admin-rarity');
  private readonly items = requireElement<HTMLButtonElement>('admin-items');
  private readonly bestiary = requireElement<HTMLButtonElement>('admin-bestiary');
  private readonly world = requireElement<HTMLButtonElement>('admin-world');

  constructor(enabled: boolean, handlers: {
    readonly onGrantItems: (rarity: Rarity) => void;
    readonly onUnlockBestiary: () => void;
    readonly onOpenWorld: () => void;
  }) {
    this.root.classList.toggle('hidden', !enabled);
    this.rarity.replaceChildren(...RARITIES.map((rarity) => new Option(RARITY_STATS[rarity].label, rarity)));
    this.rarity.value = 'legendary';
    this.items.addEventListener('click', () => {
      if (isRarity(this.rarity.value)) handlers.onGrantItems(this.rarity.value);
    });
    this.bestiary.addEventListener('click', handlers.onUnlockBestiary);
    this.world.addEventListener('click', handlers.onOpenWorld);
  }

  /** I comandi che toccano zaino e bestiario servono un personaggio già creato; la prova del mondo resta sempre apribile. */
  setAvailable(available: boolean): void {
    this.items.disabled = !available;
    this.bestiary.disabled = !available;
  }
}
