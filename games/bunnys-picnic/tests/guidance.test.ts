import {describe,it,expect} from 'vitest';
import {freshProgress,advance,type Progress,type Action} from '../src/state';
import {guidance} from '../src/guidance';
const act=(p:Progress,...actions:Action[])=>actions.reduce(advance,p);
describe('wordless guidance',()=>{
 it('shows the cloth first, and routes missing tools through the garden',()=>{
  let p=freshProgress();expect(guidance(p).id).toBe('cloth');
  p=act(p,{type:'cloth'},{type:'travel',room:'pond'});
  expect(guidance(p)).toMatchObject({actor:'duck',goal:10,tool:1,route:['garden','shed']});
  expect(guidance(p).target).toEqual([115,852]);
 });
 it('points at the actual occupied inventory slot and remaining leaf clump',()=>{
  let p=act(freshProgress(),{type:'cloth'},{type:'travel',room:'shed'},{type:'collect',tool:'plank'},{type:'collect',tool:'net'},{type:'travel',room:'garden'},{type:'travel',room:'pond'});
  expect(guidance(p).source).toEqual([800,868]);
  p=act(p,{type:'duck'},{type:'travel',room:'garden'},{type:'travel',room:'nook'},{type:'bridge'},{type:'leaf',index:0});
  expect(guidance(p)).toMatchObject({actor:'hedgehog',source:[1295,555],target:[1360,395]});
 });
 it('shows the basket dependency visually and never mutates progress',()=>{
  const p=act(freshProgress(),{type:'cloth'},{type:'travel',room:'orchard'},{type:'box'});
  const before=JSON.stringify(p);expect(guidance(p)).toMatchObject({goal:2,route:['garden','nook']});
  expect(JSON.stringify(p)).toBe(before);
 });
 it('targets an unfilled place and sends completed rooms home',()=>{
  const p:Progress={...freshProgress(),cloth:true,plankTaken:true,netTaken:true,bridge:true,leaves:[true,true,true],duck:true,box:true,basketPlaced:true,apples:true,plates:[true,false,true,true]};
  expect(guidance(p)).toMatchObject({id:'plates',target:[950,595]});
  expect(guidance({...p,room:'pond'})).toMatchObject({route:['garden']});
  expect(guidance({...p,plates:[true,true,true,true],served:[true,true,false,true]})).toMatchObject({id:'sharing',target:[640,750]});
 });
});
