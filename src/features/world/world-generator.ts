import { clamp } from '../../core/vec2';
import { TERRAIN_WALKABLE, worldHeightTiles, type WorldBiome, type WorldDefinition, type WorldTerrain } from './world-definition';
import { hash01, valueNoise } from './world-noise';

const SALT = { border: 1, coast: 2, pond: 3, ruin: 4, wall: 5, phase: 6, pondEdge: 7, wallRow: 8 } as const;

/**
 * Regole di generazione del mondo: ogni risposta dipende solo dal seme e dalle coordinate, quindi un blocco si può
 * generare da solo, in qualunque ordine, e risulta identico su server e client.
 *
 * Il terreno è definito sui vertici della griglia dei tile (da 0 a larghezza/altezza comprese): un tile prende
 * l'aspetto dai suoi quattro angoli, come vogliono i tileset a raccordo.
 */
export class WorldGenerator {
  readonly widthTiles: number;
  readonly heightTiles: number;
  /** Riga in cui finisce ogni fascia, esclusa. */
  private readonly biomeEnds: readonly number[];
  /** Righe e colonne (in vertici) delle strade secondarie. */
  readonly roadRows: readonly number[];
  readonly roadColumns: readonly number[];
  private readonly segments = new Map<number, boolean>();

  constructor(readonly definition: WorldDefinition) {
    this.widthTiles = definition.widthTiles;
    this.heightTiles = worldHeightTiles(definition);
    let end = 0;
    this.biomeEnds = definition.biomes.map(biome => (end += biome.rows));
    const rows: number[] = [];
    for (let row = definition.roads.rowOffset; row < this.heightTiles - 4; row += definition.roads.rowSpacing) rows.push(row);
    this.roadRows = rows;
    this.roadColumns = definition.roads.columns.map(fraction => Math.round(fraction * this.widthTiles));
  }

  /** Indice della fascia di un vertice; il confine oscilla di qualche tile per non essere una riga dritta. */
  biomeIndexAt(vx: number, vy: number): number {
    const { seed, borderWobble, biomes } = this.definition;
    for (let i = 0; i < biomes.length - 1; i++) {
      const shift = Math.round((valueNoise(seed, vx / 24, i, SALT.border) - 0.5) * 2 * borderWobble);
      if (vy < this.biomeEnds[i]! + shift) return i;
    }
    return biomes.length - 1;
  }

  biomeAt(vx: number, vy: number): WorldBiome {
    return this.definition.biomes[this.biomeIndexAt(vx, vy)]!;
  }

  /**
   * Colonna (in tile intere) del centro del sentiero principale a una data riga: tratti dritti di `stretch` righe,
   * ognuno spostato a lato di al più `shift` tile; il primo parte dritto dalla radura.
   */
  mainPathCenter(vy: number): number {
    const section = this.mainPathSection(vy);
    if (section <= 0) return Math.round(this.widthTiles / 2);
    const { mainPath, seed } = this.definition;
    return Math.round(this.widthTiles / 2 + (hash01(seed, section, 0, SALT.phase) - 0.5) * 2 * mainPath.shift);
  }

  private mainPathSection(vy: number): number {
    return Math.floor((vy - this.definition.spawn.row) / this.definition.mainPath.stretch);
  }

  /**
   * Vero se il vertice è strada; con `gap` > 0, anche se dista meno di `gap` tile da una strada. Le strade sono
   * dritte e allineate alla griglia, di larghezza costante: il sentiero principale scende a tratti verticali uniti da
   * gomiti orizzontali, le strade secondarie sono righe e colonne fisse che si incrociano ad angolo retto.
   */
  isRoad(vx: number, vy: number, gap = 0): boolean {
    const { spawn, mainPath, roads } = this.definition;
    if (Math.abs(vx - this.widthTiles / 2) <= spawn.half + gap && Math.abs(vy - spawn.row) <= spawn.half + gap) return true;
    const width = mainPath.halfWidth + gap;
    if (vy >= spawn.row && Math.abs(vx - this.mainPathCenter(vy)) <= width) return true;
    // Il gomito fra due tratti: una striscia orizzontale lunga quanto lo spostamento, centrata sulla riga di passaggio.
    const bend = Math.round((vy - spawn.row) / mainPath.stretch);
    if (bend >= 1) {
      const row = spawn.row + bend * mainPath.stretch, before = this.mainPathCenter(row - 1), after = this.mainPathCenter(row);
      if (Math.abs(vy - row) <= width && vx >= Math.min(before, after) - width && vx <= Math.max(before, after) + width) return true;
    }
    const reach = roads.halfWidth + gap;
    for (const column of this.roadColumns) if (Math.abs(vx - column) <= reach) return true;
    if (vx < roads.edgeGap - gap || vx > this.widthTiles - roads.edgeGap + gap) return false;
    for (const row of this.roadRows) if (Math.abs(vy - row) <= reach) return true;
    return false;
  }

  private isCoast(vx: number, vy: number): boolean {
    const { seed, coast } = this.definition;
    return vx <= coast.min + coast.wobble * valueNoise(seed, vy / 18, 0, SALT.coast)
      || vx >= this.widthTiles - coast.min - coast.wobble * valueNoise(seed, vy / 18, 1, SALT.coast);
  }

  private isPond(vx: number, vy: number): boolean {
    const { seed, ponds, borderWobble } = this.definition;
    // Due ottave: la grande decide dove sta lo stagno, la piccola ne frastaglia la riva.
    const shape = valueNoise(seed, vx / ponds.scale, vy / ponds.scale, SALT.pond) * 0.65 + valueNoise(seed, vx * 3 / ponds.scale, vy * 3 / ponds.scale, SALT.pondEdge) * 0.35;
    if (shape <= ponds.threshold) return false;
    // Niente stagni a cavallo di un confine di fascia né accanto a una strada: mancherebbe il tile di raccordo.
    for (let i = 0; i < this.biomeEnds.length - 1; i++) if (Math.abs(vy - this.biomeEnds[i]!) <= ponds.borderGap + borderWobble) return false;
    return !this.isRoad(vx, vy, ponds.roadGap);
  }

  /** Terreno di un vertice. Fuori dalla mappa vale il vertice più vicino sul bordo. */
  terrainAtVertex(vertexX: number, vertexY: number): WorldTerrain {
    const vx = clamp(vertexX, 0, this.widthTiles), vy = clamp(vertexY, 0, this.heightTiles);
    const natural = this.naturalTerrain(vx, vy);
    // Le mura stanno solo sul suolo: mai su strade, acqua o lava.
    return natural !== 'road' && TERRAIN_WALKABLE[natural] && this.isWall(vx, vy) ? 'wall' : natural;
  }

  /** Il terreno senza le costruzioni: costa, strade, stagni e suolo della fascia. */
  private naturalTerrain(vx: number, vy: number): WorldTerrain {
    const biome = this.biomeAt(vx, vy), liquid = biome.liquid ?? 'water';
    if (this.isCoast(vx, vy)) return liquid;
    if (this.isRoad(vx, vy)) return 'road';
    if (this.isPond(vx, vy)) return liquid;
    return biome.ground;
  }

  /**
   * Mura in rovina: tratti lungo le righe e le colonne di una griglia, che si incrociano e fanno angolo. Un tratto
   * c'è o manca per intero, così i varchi sono sempre larghi abbastanza da passarci. I tratti orizzontali sono
   * spessi due vertici (sommità e facciata), quelli verticali uno; ogni vertice di mura ne ha quindi un altro sopra
   * o sotto, come richiede il tileset a parete alta.
   */
  private isWall(vx: number, vy: number): boolean {
    const { grid, segment } = this.definition.ruins, half = segment / 2;
    if (vx % grid === 0 && this.segmentStands(vx, Math.floor((vy + half) / segment), true)) return true;
    return vy % grid <= 1 && this.segmentStands(Math.floor((vx + half) / segment), vy - (vy % grid), false);
  }

  /** Un tratto verticale è (colonna, indice lungo le righe); uno orizzontale è (indice lungo le colonne, riga). */
  private segmentStands(a: number, b: number, vertical: boolean): boolean {
    const key = (a * 8192 + b) * 2 + (vertical ? 1 : 0);
    let stands = this.segments.get(key);
    if (stands === undefined) {
      stands = this.computeSegment(a, b, vertical);
      if (this.segments.size > 50000) this.segments.clear();
      this.segments.set(key, stands);
    }
    return stands;
  }

  private computeSegment(a: number, b: number, vertical: boolean): boolean {
    const { seed, ruins } = this.definition, half = ruins.segment / 2;
    if (hash01(seed, a, b, vertical ? SALT.wall : SALT.wallRow) >= ruins.fill) return false;
    for (let k = 0; k < ruins.segment; k++) for (let thick = 0; thick < (vertical ? 1 : 2); thick++) {
      const vx = vertical ? a : a * ruins.segment - half + k, vy = vertical ? b * ruins.segment - half + k : b + thick;
      if (vx < ruins.fromColumn * this.widthTiles || vx > this.widthTiles - ruins.edgeGap || vy < ruins.edgeGap || vy > this.heightTiles - ruins.edgeGap) return false;
      if (valueNoise(seed, vx / ruins.scale, vy / ruins.scale, SALT.ruin) <= ruins.threshold) return false;
      // Solo su suolo pieno di una sola fascia: accanto a strade, acqua o a un confine mancherebbe il tile di raccordo.
      const ground = this.biomeAt(vx, vy).ground;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (this.naturalTerrain(vx + dx, vy + dy) !== ground) return false;
    }
    return true;
  }
}
