/**
 * High-performance Chunk
 * Flat Uint16Array storage, YZX layout, modern height (-64 … 319)
 */

export class Chunk {
  readonly x: number;
  readonly z: number;
  private blocks: Uint16Array;
  private readonly sizeX = 16;
  private readonly sizeZ = 16;
  private readonly sizeY = 384;
  readonly minY = -64;
  readonly maxY = 320;
  private dirty = false;

  constructor(x: number, z: number) {
    this.x = x;
    this.z = z;
    this.blocks = new Uint16Array(this.sizeX * this.sizeY * this.sizeZ);
  }

  private idx(lx: number, y: number, lz: number): number {
    const ly = y - this.minY;
    return (ly * 256) + (lz * 16) + lx;
  }

  inBounds(lx: number, y: number, lz: number): boolean {
    return lx >= 0 && lx < 16 && lz >= 0 && lz < 16 && y >= this.minY && y < this.maxY;
  }

  getBlock(lx: number, y: number, lz: number): number {
    if (!this.inBounds(lx, y, lz)) return 0;
    return this.blocks[this.idx(lx, y, lz)];
  }

  setBlock(lx: number, y: number, lz: number, id: number): void {
    if (!this.inBounds(lx, y, lz)) return;
    this.blocks[this.idx(lx, y, lz)] = id;
    this.dirty = true;
  }

  /** Bulk load (e.g. from network palette) */
  load(data: ArrayLike<number>): void {
    if (data.length === this.blocks.length) {
      this.blocks.set(data);
      this.dirty = false;
    }
  }

  /** Fill a vertical column (useful for flat worlds / testing) */
  fillColumn(lx: number, lz: number, fromY: number, toY: number, id: number): void {
    for (let y = fromY; y <= toY; y++) this.setBlock(lx, y, lz, id);
  }

  get isDirty() { return this.dirty; }
  markClean() { this.dirty = false; }
}
