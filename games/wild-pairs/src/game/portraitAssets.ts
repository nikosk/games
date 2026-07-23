import badgerUrl from '../../assets/images/badger.webp?url';
import bearUrl from '../../assets/images/bear.webp?url';
import beaverUrl from '../../assets/images/beaver.webp?url';
import boarUrl from '../../assets/images/boar.webp?url';
import deerUrl from '../../assets/images/deer.webp?url';
import foxUrl from '../../assets/images/fox.webp?url';
import frogUrl from '../../assets/images/frog.webp?url';
import hareUrl from '../../assets/images/hare.webp?url';
import hedgehogUrl from '../../assets/images/hedgehog.webp?url';
import lynxUrl from '../../assets/images/lynx.webp?url';
import martenUrl from '../../assets/images/marten.webp?url';
import otterUrl from '../../assets/images/otter.webp?url';
import owlUrl from '../../assets/images/owl.webp?url';
import rabbitUrl from '../../assets/images/rabbit.webp?url';
import raccoonUrl from '../../assets/images/raccoon.webp?url';
import squirrelUrl from '../../assets/images/squirrel.webp?url';
import stoatUrl from '../../assets/images/stoat.webp?url';
import wolfUrl from '../../assets/images/wolf.webp?url';
import type { Animal } from './rules';

export const PORTRAIT_URLS: Record<Animal, string> = {
  rabbit: rabbitUrl,
  hedgehog: hedgehogUrl,
  fox: foxUrl,
  frog: frogUrl,
  badger: badgerUrl,
  deer: deerUrl,
  owl: owlUrl,
  squirrel: squirrelUrl,
  otter: otterUrl,
  bear: bearUrl,
  wolf: wolfUrl,
  raccoon: raccoonUrl,
  beaver: beaverUrl,
  lynx: lynxUrl,
  boar: boarUrl,
  hare: hareUrl,
  marten: martenUrl,
  stoat: stoatUrl,
};

export function portraitTextureKey(animal: Animal): string {
  return `portrait-${animal}`;
}
