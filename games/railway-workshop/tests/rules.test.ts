import { describe, expect, it } from 'vitest';
import {
  cloneBoard,
  portsFor,
  rotate,
  traceRoute,
  type BoardCell,
  type TrackPiece,
} from '../src/game/rules';

function emptyBoard(width: number, height: number): BoardCell[][] {
  return Array.from({ length: height }, () => Array<BoardCell>(width).fill(null));
}

function piece(kind: TrackPiece['kind'], rotation: TrackPiece['rotation']): TrackPiece {
  return { kind, rotation };
}

describe('track pieces', () => {
  it('rotates through four quarter turns', () => {
    let track = piece('curve', 0);
    track = rotate(track);
    track = rotate(track);
    track = rotate(track);
    track = rotate(track);

    expect(track.rotation).toBe(0);
  });

  it('maps straight and curved track to edge ports', () => {
    expect(portsFor(piece('straight', 1))).toEqual([1, 3]);
    expect(portsFor(piece('curve', 3))).toEqual([3, 0]);
  });
});

describe('route tracing', () => {
  it('finds the authored route from the shed to the station', () => {
    const board = emptyBoard(8, 5);
    board[3]![0] = { ...piece('straight', 1), fixed: true };
    board[3]![1] = piece('straight', 1);
    board[3]![2] = piece('curve', 3);
    board[2]![2] = piece('straight', 0);
    board[1]![2] = piece('curve', 1);
    board[1]![3] = piece('straight', 1);
    board[1]![4] = piece('straight', 1);
    board[1]![5] = piece('straight', 1);
    board[1]![6] = piece('straight', 1);
    board[1]![7] = { ...piece('straight', 1), fixed: true };

    const result = traceRoute(board, { x: 0, y: 3 }, { x: 7, y: 1 }, 1);

    expect(result.success).toBe(true);
    expect(result.path).toHaveLength(10);
  });

  it('reports the first missing track without moving the train onto it', () => {
    const board = emptyBoard(3, 1);
    board[0]![0] = piece('straight', 1);

    const result = traceRoute(board, { x: 0, y: 0 }, { x: 2, y: 0 }, 1);

    expect(result.success).toBe(false);
    expect(result.path).toEqual([{ x: 0, y: 0, direction: 1 }]);
    expect(result.failure).toEqual({ point: { x: 1, y: 0 }, reason: 'missing-track' });
  });

  it('rejects a track that does not accept the arriving train', () => {
    const board = emptyBoard(2, 1);
    board[0]![0] = piece('straight', 0);

    const result = traceRoute(board, { x: 0, y: 0 }, { x: 1, y: 0 }, 1);

    expect(result.failure?.reason).toBe('wrong-connection');
    expect(result.path).toHaveLength(0);
  });

  it('clones boards without sharing track pieces', () => {
    const board = emptyBoard(1, 1);
    board[0]![0] = piece('curve', 0);

    const copy = cloneBoard(board);
    copy[0]![0] = rotate(copy[0]![0]!);

    expect(board[0]![0]?.rotation).toBe(0);
    expect(copy[0]![0]?.rotation).toBe(1);
  });
});
