/** Rasterizzatore pixel art: nessun antialiasing, solo pixel interi e palette esplicite. */
export class PixelPainter {
  readonly pixels: string[][];
  constructor(readonly width: number, readonly height: number, readonly scale = 1, readonly originX = 0, readonly originY = 0) {
    this.pixels = Array.from({ length: height * scale }, () => Array<string>(width * scale).fill(''));
  }
  rect(x: number, y: number, w: number, h: number, color: string): void {
    x += this.originX; y += this.originY;
    for (let py = Math.round(y * this.scale); py < Math.round((y + h) * this.scale); py++) {
      for (let px = Math.round(x * this.scale); px < Math.round((x + w) * this.scale); px++) {
        if (this.pixels[py] && px >= 0 && px < this.width * this.scale) this.pixels[py]![px] = color;
      }
    }
  }
  /** Campionamento inverso: l'intero oggetto ruota rigidamente attorno alla presa, senza buchi da forward splatting. */
  stamp(source: PixelPainter, gripX: number, gripY: number, handX: number, handY: number, angle: number, options: { scale?: number; minY?: number; maxY?: number } = {}): void {
    const cos=Math.cos(angle),sin=Math.sin(angle),s=this.scale;
    const size=options.scale ?? 1;
    for(let y=0;y<this.height*s;y++) for(let x=0;x<this.width*s;x++) {
      const dx=(x+.5)/s-this.originX-handX,dy=(y+.5)/s-this.originY-handY;
      const sx=Math.floor((gripX+(dx*cos+dy*sin)/size)*source.scale);
      const sy=Math.floor((gripY+(-dx*sin+dy*cos)/size)*source.scale);
      if(sy/source.scale < (options.minY ?? -Infinity) || sy/source.scale >= (options.maxY ?? Infinity)) continue;
      const color=source.pixels[sy]?.[sx];if(color)this.pixels[y]![x]=color;
    }
  }
  /** Adatta un intero strato alla corporatura senza spostare la linea centrale o i piedi. */
  fit(source: PixelPainter, widthAtY: (y: number) => number): void {
    for(let y=0;y<this.height*this.scale;y++) for(let x=0;x<this.width*this.scale;x++) {
      const ly=(y+.5)/this.scale-this.originY;
      const lx=(x+.5)/this.scale-this.originX;
      const sx=Math.floor((21+(lx-21)/widthAtY(ly))*source.scale);
      const sy=Math.floor(ly*source.scale);
      const color=source.pixels[sy]?.[sx];if(color)this.pixels[y]![x]=color;
    }
  }
  line(x: number, y: number, tx: number, ty: number, color: string): void {
    const count = Math.max(Math.abs(tx - x), Math.abs(ty - y));
    for (let i = 0; i <= count; i++) {
      const t = count === 0 ? 0 : i / count;
      this.rect(Math.round(x + (tx - x) * t), Math.round(y + (ty - y) * t), 1, 1, color);
    }
  }
  poly(points: readonly (readonly [number, number])[], color: string): void {
    const ys = points.map(p => p[1]);
    for (let y = Math.min(...ys); y <= Math.max(...ys); y++) {
      const xs: number[] = [];
      points.forEach((a, i) => {
        const b = points[(i + 1) % points.length]!;
        if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) xs.push(a[0] + (y - a[1]) * (b[0] - a[0]) / (b[1] - a[1]));
      });
      xs.sort((a,b) => a-b);
      for (let i = 0; i + 1 < xs.length; i += 2) this.rect(Math.ceil(xs[i]!), y, Math.floor(xs[i+1]!) - Math.ceil(xs[i]!) + 1, 1, color);
    }
  }
}
