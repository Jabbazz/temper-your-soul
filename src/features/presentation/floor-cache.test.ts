import { afterEach, expect, it, vi } from 'vitest';
import { Camera } from '../../core/camera';
import { Vec2 } from '../../core/vec2';
import { CRYPT_ARENA } from '../dungeons/crypt';
import { FLOOR_CACHE, FloorCache } from './floor-cache';

afterEach(() => vi.unstubAllGlobals());

function fixture(): { cache: FloorCache; camera: Camera; ctx: CanvasRenderingContext2D; paint: ReturnType<typeof vi.fn> } {
  vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, getContext: () => ({ translate: vi.fn() }) }) });
  const paint = vi.fn(), cache = new FloorCache(paint), camera = new Camera();
  camera.setViewSize(100, 100); camera.position = new Vec2(40, 40);
  return { cache, camera, paint, ctx: { drawImage: vi.fn() } as unknown as CanvasRenderingContext2D };
}

it('spostamenti nella stessa zona riutilizzano il pavimento; arene differenti non condividono i pixel', () => {
  const { cache, camera, paint, ctx } = fixture();
  cache.draw(ctx, CRYPT_ARENA, camera); camera.position = new Vec2(80, 60); cache.draw(ctx, CRYPT_ARENA, camera);
  expect(paint).toHaveBeenCalledTimes(1);
  cache.draw(ctx, { ...CRYPT_ARENA, id: 'different-arena' }, camera);
  expect(paint).toHaveBeenCalledTimes(2);
});

it('quando cambia la versione (per esempio arrivano i tile) i tasselli si ridipingono una volta sola', () => {
  const { cache, camera, paint, ctx } = fixture();
  cache.draw(ctx, CRYPT_ARENA, camera);
  cache.draw(ctx, CRYPT_ARENA, camera, 'tiles');
  cache.draw(ctx, CRYPT_ARENA, camera, 'tiles');
  expect(paint).toHaveBeenCalledTimes(2);
});

it('dopo una lunga esplorazione elimina i tasselli vecchi senza una cache crescente', () => {
  const { cache, camera, paint, ctx } = fixture(), visited = FLOOR_CACHE.maxChunks + 4;
  for (let i = 0; i < visited; i++) {
    camera.position = new Vec2(40 + i * FLOOR_CACHE.chunkSize, 40); cache.draw(ctx, CRYPT_ARENA, camera);
  }
  expect(paint).toHaveBeenCalledTimes(visited);
  camera.position = new Vec2(40, 40); cache.draw(ctx, CRYPT_ARENA, camera);
  expect(paint).toHaveBeenCalledTimes(visited + 1);
});
