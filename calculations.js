export const THREADS = {
  M2:{d:2,p:0.4},M2_5:{d:2.5,p:0.45},M3:{d:3,p:0.5},M4:{d:4,p:0.7},M5:{d:5,p:0.8},M6:{d:6,p:1},
  M8:{d:8,p:1.25},M10:{d:10,p:1.5},M12:{d:12,p:1.75},M14:{d:14,p:2},M16:{d:16,p:2},M18:{d:18,p:2.5},M20:{d:20,p:2.5},M22:{d:22,p:2.5},M24:{d:24,p:3},M27:{d:27,p:3},M30:{d:30,p:3.5}
};

export const MATERIALS = {
  pa6:{name:'Полиамид PA6', group:'N', vcMill:180, vcDrill:70, fz:0.06},
  alu:{name:'Алюминий', group:'N', vcMill:250, vcDrill:90, fz:0.07},
  brass:{name:'Латунь', group:'N', vcMill:180, vcDrill:70, fz:0.06},
  c45:{name:'Сталь C45', group:'P', vcMill:130, vcDrill:24, fz:0.04},
  '40x':{name:'40Х', group:'P', vcMill:110, vcDrill:20, fz:0.035},
  aisi304:{name:'AISI 304', group:'M', vcMill:75, vcDrill:14, fz:0.03},
  aisi316:{name:'AISI 316L', group:'M', vcMill:65, vcDrill:12, fz:0.025}
};

export const round = (n, d=3) => Number(Number(n).toFixed(d));
export const rad = deg => deg * Math.PI / 180;
export const deg = r => r * 180 / Math.PI;
export const normAngle = a => ((a % 360) + 360) % 360;
export const rpmFromVc = (vc, dia) => dia > 0 ? Math.round((1000 * vc) / (Math.PI * dia)) : 0;
export const feedFromFz = (rpm, teeth, fz) => Math.round(rpm * Math.max(1,teeth) * fz);

function requirePositive(obj, keys){
  for(const k of keys){ if(!(Number(obj[k]) > 0)) throw new Error(`Параметр «${k}» должен быть больше 0.`); }
}
function angles(n,start=0,direction='cw'){
  n = Math.max(1,Math.floor(Number(n)));
  const step = 360/n;
  const sign = direction === 'ccw' ? -1 : 1;
  return Array.from({length:n},(_,i)=>normAngle(Number(start)+sign*i*step));
}
function xyOnRadius(r,a,cx=0,cy=0){ return {x:round(cx+r*Math.cos(rad(a))), y:round(cy+r*Math.sin(rad(a)))}; }

export function calcDivision(v){
  requirePositive(v,['count']);
  const n = Math.floor(Number(v.count));
  const as = angles(n,Number(v.start||0),v.direction);
  const step = 360/n;
  return {
    title:'Деление окружности / ось C',
    headline:`Шаг C = ${round(step,4)}°`,
    formula:`360° / ${n} = ${round(step,4)}°`,
    summary:[
      ['Индексация оси C', as.map(a=>`${round(a,4)}°`).join(', ')],
      ['Направление', v.direction==='ccw'?'CCW / против часовой':'CW / по часовой'],
      ['Стартовый угол', `${round(Number(v.start||0),4)}°`]
    ],
    columns:['Поз.','Ось C, °','Шаг, °'],
    rows:as.map((a,i)=>[i+1,round(a,4),round(step,4)]),
    diagram:{type:'division',count:n,start:Number(v.start||0),direction:v.direction},
    gcode:as.map(a=>`C=${round(a,4)}`).join('\n')
  };
}

export function calcPCD(v){
  requirePositive(v,['pcd','count']);
  const n=Math.floor(Number(v.count)), r=Number(v.pcd)/2, cx=Number(v.cx||0), cy=Number(v.cy||0);
  const as=angles(n,Number(v.start||0),v.direction), step=360/n;
  const pts=as.map((a,i)=>({i:i+1,a,...xyOnRadius(r,a,cx,cy)}));
  return {
    title:'Болтовая окружность PCD',
    headline:`${n} отв. по PCD Ø${round(v.pcd)}`,
    formula:`X = X₀ + R·cos(C), Y = Y₀ + R·sin(C), R=${round(r)}`,
    summary:[['Шаг',`${round(step,4)}°`],['Центр',`X₀=${round(cx)}, Y₀=${round(cy)}`],['Радиус расположения',`${round(r)} мм`]],
    columns:['№','C, °','X, мм','Y, мм'],
    rows:pts.map(p=>[p.i,round(p.a,4),p.x,p.y]),
    diagram:{type:'pcd',count:n,start:Number(v.start||0),radius:r,points:pts,pcd:Number(v.pcd)},
    gcode:pts.map(p=>`X=${p.x} Y=${p.y} ; C=${round(p.a,4)}°`).join('\n')
  };
}

export function calcLobes(v){
  requirePositive(v,['baseDia','count','lobeR','outerDia','toolDia']);
  const n=Math.floor(Number(v.count));
  const rb=Number(v.baseDia)/2, ro=Number(v.outerDia)/2, rl=Number(v.lobeR), rt=Number(v.toolDia)/2;
  if(ro < rb) throw new Error('Наружный диаметр должен быть не меньше базового.');
  if(rl <= (ro-rb)/2) throw new Error('R лепестка слишком мал для заданной высоты лепестка.');
  const rc = ro - rl; // center radius of each convex circular lobe
  if(rc < 0) throw new Error('R лепестка больше наружного радиуса — геометрия невозможна.');
  const as=angles(n,Number(v.start||0),v.direction), step=360/n;
  const centers=as.map((a,i)=>({i:i+1,a,...xyOnRadius(rc,a)}));
  const stock=Number(v.stockDia||v.outerDia), stockR=stock/2;
  const depth=Math.max(0,stockR-rb);
  const compR=rl+rt;
  const issues=[];
  if(stock < Number(v.outerDia)) issues.push(`Заготовка Ø${round(stock)} меньше наружного Ø${round(v.outerDia)} — лепестки из такой заготовки не получить.`);
  if(Number(v.baseDia)===Number(v.outerDia)) issues.push('Базовый и наружный диаметры равны: высота лепестка получается 0.');
  return {
    title:'Лепестки / фигурная окружность',
    headline:`${n} лепестков • шаг ${round(step,4)}°`,
    formula:`Rц = Dнаруж/2 − Rлеп = ${round(rc)} мм; Rтраектории = Rлеп + Rфрезы = ${round(compR)} мм`,
    summary:[['Базовый Ø',`Ø${round(v.baseDia)} мм`],['Наружный Ø',`Ø${round(v.outerDia)} мм`],['Высота лепестка',`${round(ro-rb)} мм`],['Центры дуг',`R=${round(rc)} мм`],['Компенсированный радиус дуги',`${round(compR)} мм`]],
    columns:['Лепесток','C, °','X центра, мм','Y центра, мм'],
    rows:centers.map(p=>[p.i,round(p.a,4),p.x,p.y]),
    diagram:{type:'lobes',count:n,start:Number(v.start||0),baseR:rb,outerR:ro,lobeR:rl,centerR:rc,centers},
    warnings:issues,
    kpis:[['Шаг C',`${round(step,4)}°`],['R фрезы',`${round(rt)} мм`],['Съём по радиусу',`${round(depth)} мм`]],
    gcode:centers.map(p=>`; Лепесток ${p.i}\nC=${round(p.a,4)} ; центр дуги X=${p.x} Y=${p.y} R=${round(compR)}`).join('\n')
  };
}

export function calcFlats(v){
  requirePositive(v,['stockDia','acrossFlats','count','toolDia']);
  const R=Number(v.stockDia)/2, af=Number(v.acrossFlats), n=Math.floor(Number(v.count)), rt=Number(v.toolDia)/2;
  if(af > 2*R) throw new Error('Размер по лыскам больше диаметра заготовки.');
  const depth=R-af/2, as=angles(n,Number(v.start||0),v.direction), step=360/n;
  return {
    title:'Лыски',headline:`${n} лысок • глубина ${round(depth)} мм`,
    formula:`h = D/2 − S/2 = ${round(R)} − ${round(af/2)} = ${round(depth)} мм`,
    summary:[['Заготовка',`Ø${round(v.stockDia)} мм`],['Размер по лыскам',`${round(af)} мм`],['Положение центра фрезы',`${round(af/2 + rt)} мм от оси`]],
    columns:['Лыска','C, °','Съём, мм','Центр фрезы от оси, мм'],
    rows:as.map((a,i)=>[i+1,round(a,4),round(depth),round(af/2+rt)]),
    diagram:{type:'flats',count:n,start:Number(v.start||0),stockR:R,flatOffset:af/2},
    gcode:as.map((a,i)=>`; Лыска ${i+1}\nC=${round(a,4)} ; глубина=${round(depth)} мм`).join('\n')
  };
}

export function calcPolygon(v){
  requirePositive(v,['sides','acrossFlats','stockDia','toolDia']);
  const n=Math.floor(Number(v.sides)), af=Number(v.acrossFlats), stockR=Number(v.stockDia)/2;
  if(n<3) throw new Error('У многоугольника должно быть минимум 3 стороны.');
  if(af > Number(v.stockDia)) throw new Error('Размер по граням больше диаметра заготовки.');
  const inR=af/2, circR=inR/Math.cos(Math.PI/n), side=2*circR*Math.sin(Math.PI/n), depth=stockR-inR;
  const as=angles(n,Number(v.start||0),v.direction);
  return {
    title:'Многоугольник',headline:`${n}-угольник • S=${round(af)} мм`,
    formula:`Rопис = (S/2) / cos(π/${n}) = ${round(circR)} мм`,
    summary:[['Размер по граням',`${round(af)} мм`],['Расчётная сторона',`${round(side)} мм`],['Описанный Ø',`Ø${round(circR*2)} мм`],['Глубина съёма',`${round(depth)} мм`]],
    columns:['Грань','C, °','Съём, мм'],rows:as.map((a,i)=>[i+1,round(a,4),round(depth)]),
    diagram:{type:'polygon',sides:n,start:Number(v.start||0),stockR,polyR:circR},
    gcode:as.map((a,i)=>`; Грань ${i+1}\nC=${round(a,4)} ; съём=${round(depth)} мм`).join('\n')
  };
}

export function calcSlots(v){
  requirePositive(v,['count','pcd','length','width','depth','toolDia']);
  const n=Math.floor(Number(v.count)), r=Number(v.pcd)/2, as=angles(n,Number(v.start||0),v.direction), step=360/n;
  if(Number(v.toolDia)>Number(v.width)) throw new Error('Диаметр фрезы больше ширины паза.');
  const centers=as.map((a,i)=>({i:i+1,a,...xyOnRadius(r,a)}));
  const extra=Math.max(0,(Number(v.width)-Number(v.toolDia))/2);
  return {
    title:'Пазы по окружности',headline:`${n} пазов • PCD Ø${round(v.pcd)}`,
    formula:`Шаг = 360°/${n} = ${round(step,4)}°`,
    summary:[['Паз',`${round(v.length)} × ${round(v.width)} × ${round(v.depth)} мм`],['Фреза',`Ø${round(v.toolDia)} мм`],['Боковое смещение для ширины',`±${round(extra)} мм`],['Ориентация',v.orientation==='tangent'?'Тангенциальная':'Радиальная']],
    columns:['Паз','C, °','X центра','Y центра'],rows:centers.map(p=>[p.i,round(p.a,4),p.x,p.y]),
    diagram:{type:'slots',count:n,start:Number(v.start||0),radius:r,orientation:v.orientation,slotL:Number(v.length),slotW:Number(v.width)},
    gcode:centers.map(p=>`; Паз ${p.i}\nC=${round(p.a,4)} X=${p.x} Y=${p.y}`).join('\n')
  };
}

export function calcRadialHoles(v){
  requirePositive(v,['count','pcd','diameter','depth']);
  const n=Math.floor(Number(v.count)),r=Number(v.pcd)/2,as=angles(n,Number(v.start||0),v.direction),step=360/n;
  const pts=as.map((a,i)=>({i:i+1,a,...xyOnRadius(r,a)}));
  return {
    title:'Радиальные отверстия',headline:`${n} отв. Ø${round(v.diameter)} • шаг ${round(step,4)}°`,formula:`360°/${n}=${round(step,4)}°`,
    summary:[['PCD',`Ø${round(v.pcd)} мм`],['Глубина',`${round(v.depth)} мм`],['Диаметр сверла',`Ø${round(v.diameter)} мм`]],
    columns:['№','C, °','X','Y'],rows:pts.map(p=>[p.i,round(p.a,4),p.x,p.y]),diagram:{type:'holes',count:n,start:Number(v.start||0),radius:r,holeDia:Number(v.diameter)},
    gcode:pts.map(p=>`C=${round(p.a,4)} ; X=${p.x} Y=${p.y} ; DRILL Ø${round(v.diameter)} Z-${round(v.depth)}`).join('\n')
  };
}

export function calcThread(v){
  const key=String(v.thread||'M8').replace('.','_');
  const t=THREADS[key]; if(!t) throw new Error('Неизвестный размер резьбы.');
  const pitch=Number(v.pitch||t.p), drill=round(t.d-pitch,2), mat=MATERIALS[v.material]||MATERIALS.c45;
  const rpm=Math.min(Number(v.maxRpm||4000),rpmFromVc(mat.vcDrill,drill));
  const feed=round(rpm*pitch,1);
  return {
    title:'Сверление / метрическая резьба',headline:`${String(v.thread).replace('_','.')} • сверло ≈ Ø${drill}`,
    formula:`Ø сверла ≈ D − P = ${t.d} − ${pitch} = ${drill} мм`,
    summary:[['Материал',mat.name],['Шаг резьбы',`${pitch} мм`],['Сверло под резьбу',`Ø${drill} мм`],['Ориентир оборотов сверления',`${rpm} об/мин`],['Подача синхронного метчика',`${feed} мм/мин`]],
    columns:['Параметр','Значение'],rows:[['Номинальный Ø',t.d],['Шаг P, мм',pitch],['Сверло, мм',drill],['S сверление, об/мин',rpm],['F метчик, мм/мин',feed]],
    diagram:{type:'thread',diameter:t.d,drill,pitch},warnings:['Режимы — стартовый ориентир. Для конкретного сверла/метчика сверяйся с производителем инструмента и условиями СОЖ.'],
    gcode:`; ${String(v.thread).replace('_','.')}\n; Сверло Ø${drill}\nS=${rpm}\n; Резьба: P=${pitch}, синхронная подача ≈ ${feed} мм/мин`
  };
}

export function calcArc(v){
  const x1=Number(v.x1),y1=Number(v.y1),x2=Number(v.x2),y2=Number(v.y2),R=Number(v.radius);
  requirePositive({radius:R},['radius']);
  const dx=x2-x1,dy=y2-y1,q=Math.hypot(dx,dy);
  if(q===0) throw new Error('Начальная и конечная точки совпадают.');
  if(q>2*R) throw new Error('Радиус слишком мал: хорда длиннее диаметра дуги.');
  const mx=(x1+x2)/2,my=(y1+y2)/2,h=Math.sqrt(Math.max(0,R*R-(q*q)/4));
  const nx=-dy/q,ny=dx/q, sign=v.side==='right'?-1:1;
  const cx=mx+sign*h*nx,cy=my+sign*h*ny;
  const a1=normAngle(deg(Math.atan2(y1-cy,x1-cx))),a2=normAngle(deg(Math.atan2(y2-cy,x2-cx)));
  let sweep=v.direction==='ccw'?normAngle(a1-a2):normAngle(a2-a1);
  return {title:'Дуга по двум точкам и R',headline:`Центр X${round(cx)} Y${round(cy)}`,formula:`h = √(R² − (L/2)²) = ${round(h)} мм`,summary:[['Хорда',`${round(q)} мм`],['Центр',`X=${round(cx)}, Y=${round(cy)}`],['Угол дуги',`${round(sweep,3)}°`],['Направление',v.direction==='ccw'?'CCW':'CW']],columns:['Точка','X','Y','Угол, °'],rows:[['Начало',x1,y1,round(a1,3)],['Центр',round(cx),round(cy),'—'],['Конец',x2,y2,round(a2,3)]],diagram:{type:'arc',x1,y1,x2,y2,cx,cy,R,direction:v.direction},gcode:`G${v.direction==='ccw'?'3':'2'} X=${x2} Y=${y2} I=${round(cx-x1)} J=${round(cy-y1)}`};
}

export function calcLinearArray(v){
  requirePositive(v,['count','step']);
  const n=Math.floor(Number(v.count)),a=Number(v.angle||0),step=Number(v.step),x0=Number(v.x0||0),y0=Number(v.y0||0);
  const pts=Array.from({length:n},(_,i)=>({i:i+1,x:round(x0+i*step*Math.cos(rad(a))),y:round(y0+i*step*Math.sin(rad(a)))}));
  return {title:'Линейный массив отверстий',headline:`${n} позиций • шаг ${round(step)} мм`,formula:`Xᵢ=X₀+i·P·cos(α), Yᵢ=Y₀+i·P·sin(α)`,summary:[['Старт',`X=${x0}, Y=${y0}`],['Угол ряда',`${round(a)}°`],['Общая длина',`${round((n-1)*step)} мм`]],columns:['№','X','Y'],rows:pts.map(p=>[p.i,p.x,p.y]),diagram:{type:'linear',points:pts},gcode:pts.map(p=>`X=${p.x} Y=${p.y}`).join('\n')};
}

export const CALCULATORS = {
  division: calcDivision,
  pcd: calcPCD,
  lobes: calcLobes,
  flats: calcFlats,
  polygon: calcPolygon,
  slots: calcSlots,
  holes: calcRadialHoles,
  thread: calcThread,
  arc: calcArc,
  linear: calcLinearArray
};

export function calcCutting(v){
  requirePositive(v,['toolDia','teeth']);
  const mat=MATERIALS[v.material]||MATERIALS.c45;
  const strategy=v.strategy||'work';
  const factor=strategy==='safe'?0.78:strategy==='prod'?1.12:1;
  const vc=Number(v.vc||mat.vcMill)*factor;
  const fz=Number(v.fz||mat.fz)*(strategy==='safe'?0.85:strategy==='prod'?1.08:1);
  const rawRpm=rpmFromVc(vc,Number(v.toolDia));
  const rpm=Math.min(Number(v.maxRpm||4000),rawRpm);
  const feed=feedFromFz(rpm,Number(v.teeth),fz);
  const ap=Number(v.ap||Math.max(.2,Number(v.toolDia)*.12));
  return {
    title:'Режимы фрезерования',headline:`S ${rpm} об/мин • F ${feed} мм/мин`,
    formula:`S = 1000·Vc/(π·D); F = S·z·fz`,
    summary:[['Материал',mat.name],['Стратегия',strategy==='safe'?'Безопасная':strategy==='prod'?'Производительная':'Рабочая'],['Vc',`${round(vc,1)} м/мин`],['fz',`${round(fz,3)} мм/зуб`],['ap',`${round(ap,2)} мм`]],
    columns:['Параметр','Значение'],rows:[['D фрезы, мм',Number(v.toolDia)],['Зубьев',Number(v.teeth)],['Vc, м/мин',round(vc,1)],['S, об/мин',rpm],['fz, мм/зуб',round(fz,3)],['F, мм/мин',feed],['ap, мм',round(ap,2)]],
    diagram:{type:'cutting',toolDia:Number(v.toolDia),teeth:Number(v.teeth),rpm,feed},warnings:['Это стартовые режимы для расчёта. Финальные значения зависят от конкретной фрезы, вылета, жёсткости, охлаждения и рекомендаций производителя.'],gcode:`S=${rpm}\nF=${feed}\n; Vc=${round(vc,1)} m/min, fz=${round(fz,3)} mm/tooth, ap=${round(ap,2)} mm`
  };
}
CALCULATORS.cutting = calcCutting;
