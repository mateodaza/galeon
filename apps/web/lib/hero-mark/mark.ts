/**
 * Geometry of the master mark, prepared for the hero engraving.
 *
 * Generated from research/logo/final/constants.json (cuts.master) by
 * research/round5/port/gen.py. Units are the logo's 64-unit square, y down,
 * angles in degrees clockwise from 3 o'clock. Do not edit by hand: rebuild
 * the logo, then regenerate.
 *
 * - O, I: the moon lies inside O and outside I.
 * - S, X: the water band lies between S and O; the wave slit is inside S and
 *   outside X.
 * - parts: one path per ink part (the master crescent split at circle S, and
 *   the two sails).
 * - viewBox: a square centred on the ink box, 2.16 R wide. The canvas engine
 *   places the mark exactly here, so a static SVG with this viewBox lines up.
 */

export type Point = readonly [number, number]

export interface Circle {
  readonly c: Point
  readonly r: number
}

export type PartId = 'moon' | 'water' | 'main' | 'jib'

export interface SailSpec {
  readonly id: 'main' | 'jib'
  readonly luffX: number
  readonly dir: 1 | -1
  readonly tone: { readonly luff: number; readonly leech: number }
}

export type ConstructionStep =
  | { readonly stage: number; readonly kind: 'circle'; readonly centre: Point; readonly r: number }
  | { readonly stage: number; readonly kind: 'line'; readonly from: Point; readonly to: Point }
  | { readonly stage: number; readonly kind: 'point'; readonly at: Point }

export interface PlateGeometry {
  readonly O: Circle
  readonly I: Circle
  readonly S: Circle
  readonly X: Circle
  readonly wall: number
  readonly axisDeg: number
  readonly upperHornDeg: number
  readonly wave: { readonly depth: number; readonly fromDeg: number; readonly toDeg: number }
  readonly parts: Readonly<Record<PartId, string>>
  readonly sails: readonly SailSpec[]
  readonly mast: { readonly xLeft: number; readonly xRight: number }
  readonly inkBox: readonly [number, number, number, number]
  readonly viewBox: string
  readonly construction: readonly ConstructionStep[]
}

export const PLATE: PlateGeometry = {
  O: {
    c: [33.375, 31.0],
    r: 28.0,
  },
  I: {
    c: [39.0771, 27.7079],
    r: 23.0842,
  },
  S: {
    c: [32.63, 27.3383],
    r: 29.4,
  },
  X: {
    c: [31.6607, 28.5423],
    r: 27.9,
  },
  wall: 11.5,
  axisDeg: 30.0,
  upperHornDeg: -67.0,
  wave: {
    depth: 2.5967,
    fromDeg: -17,
    toDeg: 166,
  },
  parts: {
    moon: 'M44.3155 5.2259A28.0 28.0 0 0 0 9.1263 45.0A29.4 29.4 0 0 0 20.0938 53.9316A27.9 27.9 0 0 0 53.8689 45.4303A23.0842 23.0842 0 1 1 44.3155 5.2259Z',
    water: 'M61.1663 34.4123A28.0 28.0 0 0 1 9.1263 45.0A29.4 29.4 0 0 0 61.1663 34.4123Z',
    main: 'M32.625 18.4L32.625 48.305A21.584 21.584 0 0 0 49.21 46.766C38.834 45.858 33.817 35.445 32.625 18.4Z',
    jib: 'M31.125 23.72L31.125 47.774A21.584 21.584 0 0 1 26.697 45.389C27.593 38.145 29.107 30.734 31.125 23.72Z',
  },
  sails: [
    {
      id: 'main',
      luffX: 32.625,
      dir: 1,
      tone: {
        luff: 0.6,
        leech: 0.3,
      },
    },
    {
      id: 'jib',
      luffX: 31.125,
      dir: -1,
      tone: {
        luff: 0.5,
        leech: 0.62,
      },
    },
  ],
  mast: {
    xLeft: 31.125,
    xRight: 32.625,
  },
  inkBox: [5.375, 3.0, 61.1663, 59.0],
  viewBox: '3.031 0.760 60.480 60.480',
  construction: [
    { stage: 1, kind: 'circle', centre: [33.375, 31.0], r: 28.0 },
    { stage: 1, kind: 'circle', centre: [39.0771, 27.7079], r: 23.0842 },
    { stage: 1, kind: 'line', from: [38.5712, 28.0], to: [61.0878, 15.0] },
    { stage: 2, kind: 'circle', centre: [32.63, 27.3383], r: 29.4 },
    { stage: 2, kind: 'circle', centre: [31.6607, 28.5423], r: 27.9 },
    { stage: 3, kind: 'circle', centre: [39.0771, 27.7079], r: 21.5842 },
    { stage: 3, kind: 'line', from: [32.625, 18.4], to: [32.625, 48.3052] },
    { stage: 3, kind: 'line', from: [31.125, 23.72], to: [31.125, 47.7738] },
    { stage: 4, kind: 'point', at: [44.3155, 5.2259] },
    { stage: 4, kind: 'point', at: [61.1663, 34.4123] },
    { stage: 4, kind: 'point', at: [53.8689, 45.4303] },
    { stage: 4, kind: 'point', at: [20.0938, 53.9316] },
    { stage: 4, kind: 'point', at: [9.1263, 45.0] },
    { stage: 4, kind: 'point', at: [49.2103, 46.7656] },
    { stage: 4, kind: 'point', at: [26.6969, 45.3887] },
  ],
}
