import assert from 'node:assert/strict';
import {calcDivision,calcPCD,calcLobes,calcFlats,calcPolygon,calcSlots,calcRadialHoles,calcThread,calcArc,calcLinearArray,calcCutting,calcSphereCube} from './calculations.js';

const sphereCube=calcSphereCube({stockDia:25,sphereDia:24,toolWidth:4,stepZ:2,finishAllowance:.2,neckDia:10,acrossFlats:20,millDia:8,start:0,direction:'cw'});
assert.equal(sphereCube.kpis[0][1],'2 мм');
assert.equal(sphereCube.tables[1].rows.length,4);
assert.deepEqual(sphereCube.tables[1].rows.map(r=>r[1]),[0,90,180,270]);
assert.ok(sphereCube.diagram.gapDeg>0);

assert.deepEqual(calcDivision({count:6,start:0,direction:'cw'}).rows.map(r=>r[1]),[0,60,120,180,240,300]);
assert.equal(calcPCD({pcd:60,count:4,start:0,cx:0,cy:0,direction:'cw'}).rows[0][2],30);
assert.equal(calcLobes({stockDia:62,baseDia:50,outerDia:62,count:6,lobeR:11,toolDia:8,start:0,direction:'cw'}).rows.length,6);
assert.equal(calcFlats({stockDia:50,acrossFlats:46,count:2,toolDia:8,start:0,direction:'cw'}).rows[0][2],2);
assert.equal(calcPolygon({stockDia:50,sides:6,acrossFlats:42,toolDia:8,start:0,direction:'cw'}).rows.length,6);
assert.equal(calcSlots({pcd:50,count:6,length:10,width:8,depth:3,toolDia:6,start:0,orientation:'radial',direction:'cw'}).rows.length,6);
assert.equal(calcRadialHoles({pcd:50,count:6,diameter:6,depth:10,start:0,direction:'cw'}).rows.length,6);
assert.equal(calcThread({thread:'M8',pitch:1.25,material:'aisi304',maxRpm:4000}).rows[2][1],6.75);
assert.equal(calcArc({x1:0,y1:0,x2:30,y2:20,radius:25,side:'left',direction:'cw'}).rows.length,3);
assert.equal(calcLinearArray({count:5,step:20,x0:0,y0:0,angle:0}).rows[4][1],80);
assert.ok(calcCutting({material:'aisi304',toolDia:8,teeth:4,vc:75,fz:.03,ap:1,maxRpm:4000,strategy:'work'}).rows.some(r=>r[0]==='S, об/мин'));
console.log('OK: 15/15 calculator regression checks');
