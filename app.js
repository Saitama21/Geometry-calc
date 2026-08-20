import { CALCULATORS, MATERIALS, THREADS, round } from './calculations.js';

const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];
const app = $('#app');
const main = $('#main');
const backBtn = $('#backBtn');
const titleEl = $('#screenTitle');
const subEl = $('#screenSubtitle');

const STORAGE = {
  projects:'cnc-geometry-projects-v1',
  theme:'cnc-geometry-theme-v1',
  tools:'cnc-geometry-tools-v1',
  profile:'cnc-geometry-profile-v1',
  topbar:'cnc-geometry-topbar-v2'
};

const state = {
  view:'home',
  homeScroll:0,
  calc:null,
  values:{},
  result:null,
  currentProjectId:null,
  theme:localStorage.getItem(STORAGE.theme) || 'dark'
};
app.dataset.theme = state.theme;

function isIPhone14ProProfile(){
  const standalone=matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
  const w=Math.min(screen.width,screen.height);
  const h=Math.max(screen.width,screen.height);
  return standalone && w===393 && h===852 && Math.round(devicePixelRatio)===3;
}
const DEVICE_PROFILE=isIPhone14ProProfile()?'iphone14pro':'generic';
document.documentElement.classList.toggle('device-iphone14pro',DEVICE_PROFILE==='iphone14pro');
applyTopbarSettings();

const calcDefs = [
  {id:'division', icon:'C°', title:'Деление окружности', desc:'Индексация оси C на любое число позиций', badge:'C-axis', fields:[
    f('count','Количество позиций','number',6,'Сколько равных делений',1,360,1),
    f('start','Стартовый угол C','number',0,'Первая позиция, °',-360,360,.1),
    s('direction','Направление','cw',[['cw','CW / по часовой'],['ccw','CCW / против часовой']])
  ]},
  {id:'pcd', icon:'◎', title:'Болтовая окружность', desc:'PCD → X/Y и углы C для отверстий', badge:'X/Y/C', fields:[
    f('pcd','Диаметр PCD','number',60,'Диаметр окружности центров, мм',.1,2000,.1),
    f('count','Количество отверстий','number',6,'Равномерно по окружности',1,360,1),
    f('start','Стартовый угол','number',0,'°',-360,360,.1),
    f('cx','Смещение центра X₀','number',0,'мм',-1000,1000,.01),
    f('cy','Смещение центра Y₀','number',0,'мм',-1000,1000,.01),
    s('direction','Направление','cw',[['cw','CW'],['ccw','CCW']])
  ]},
  {id:'lobes', icon:'✿', title:'Лепестки / контур', desc:'Фигурная окружность, центры дуг и компенсация', badge:'R/C', preset:'handle', fields:[
    f('stockDia','Заготовка Ø','number',62,'Исходный наружный диаметр, мм',.1,1000,.1),
    f('baseDia','Базовый диаметр Ø','number',50,'Впадины между лепестками, мм',.1,1000,.1),
    f('outerDia','Наружный диаметр Ø','number',62,'По вершинам лепестков, мм',.1,1000,.1),
    f('count','Количество лепестков','number',6,'Равномерно по C',2,60,1),
    f('lobeR','Радиус лепестка R','number',11,'Радиус выпуклой дуги, мм',.1,500,.1),
    f('toolDia','Диаметр фрезы Ø','number',8,'Для компенсации траектории',.1,100,.1),
    f('start','Стартовый угол C','number',0,'°',-360,360,.1),
    s('direction','Направление','cw',[['cw','CW'],['ccw','CCW']])
  ]},
  {id:'flats', icon:'▰', title:'Лыски', desc:'Глубина съёма и позиции C по размеру между лысками', badge:'AF', fields:[
    f('stockDia','Заготовка Ø','number',50,'мм',.1,1000,.1),
    f('acrossFlats','Размер по лыскам','number',46,'мм',.1,1000,.1),
    f('count','Количество лысок','number',2,'2 / 4 / 6…',1,60,1),
    f('toolDia','Диаметр фрезы Ø','number',8,'мм',.1,100,.1),
    f('start','Стартовый угол C','number',0,'°',-360,360,.1),
    s('direction','Направление','cw',[['cw','CW'],['ccw','CCW']])
  ]},
  {id:'polygon', icon:'⬡', title:'Многоугольник', desc:'Квадрат, шестигранник и произвольное N', badge:'N-gon', fields:[
    f('stockDia','Заготовка Ø','number',50,'мм',.1,1000,.1),
    f('sides','Количество граней','number',6,'3 и больше',3,60,1),
    f('acrossFlats','Размер по граням S','number',42,'мм',.1,1000,.1),
    f('toolDia','Диаметр фрезы Ø','number',8,'мм',.1,100,.1),
    f('start','Стартовый угол C','number',0,'°',-360,360,.1),
    s('direction','Направление','cw',[['cw','CW'],['ccw','CCW']])
  ]},
  {id:'slots', icon:'⌗', title:'Пазы по окружности', desc:'Радиальные или тангенциальные пазы по PCD', badge:'C/Y', fields:[
    f('pcd','PCD центров пазов Ø','number',50,'мм',.1,1000,.1),
    f('count','Количество пазов','number',6,'',1,120,1),
    f('length','Длина паза','number',10,'мм',.1,500,.1),
    f('width','Ширина паза','number',8,'мм',.1,500,.1),
    f('depth','Глубина','number',3,'мм',.1,500,.1),
    f('toolDia','Диаметр фрезы Ø','number',6,'мм',.1,100,.1),
    f('start','Стартовый угол C','number',0,'°',-360,360,.1),
    s('orientation','Ориентация','radial',[['radial','Радиальная'],['tangent','Тангенциальная']]),
    s('direction','Направление','cw',[['cw','CW'],['ccw','CCW']])
  ]},
  {id:'holes', icon:'⊙', title:'Радиальные отверстия', desc:'Повторяющиеся отверстия и C-позиции', badge:'Drill', fields:[
    f('pcd','PCD Ø','number',50,'мм',.1,1000,.1),
    f('count','Количество отверстий','number',6,'',1,360,1),
    f('diameter','Сверло Ø','number',6,'мм',.1,100,.1),
    f('depth','Глубина','number',10,'мм',.1,500,.1),
    f('start','Стартовый угол C','number',0,'°',-360,360,.1),
    s('direction','Направление','cw',[['cw','CW'],['ccw','CCW']])
  ]},
  {id:'thread', icon:'↯', title:'Сверление / резьба', desc:'Сверло под метрическую резьбу, S и F метчика', badge:'M', fields:[
    s('thread','Резьба','M8',Object.keys(THREADS).map(k=>[k,k.replace('_','.')])),
    f('pitch','Шаг P','number',1.25,'Можно изменить для мелкого шага',.1,6,.05),
    s('material','Материал','aisi304',Object.entries(MATERIALS).map(([k,m])=>[k,m.name])),
    f('maxRpm','Ограничение S','number',4000,'Максимальные обороты станка',100,50000,10)
  ]},
  {id:'arc', icon:'⌒', title:'Дуга по 2 точкам + R', desc:'Центр дуги, I/J и G2/G3', badge:'G2/G3', fields:[
    f('x1','Начало X1','number',0,'мм',-10000,10000,.01), f('y1','Начало Y1','number',0,'мм',-10000,10000,.01),
    f('x2','Конец X2','number',30,'мм',-10000,10000,.01), f('y2','Конец Y2','number',20,'мм',-10000,10000,.01),
    f('radius','Радиус R','number',25,'мм',.01,10000,.01),
    s('side','Сторона центра','left',[['left','Слева от хорды'],['right','Справа от хорды']]),
    s('direction','Направление','cw',[['cw','G2 / CW'],['ccw','G3 / CCW']])
  ]},
  {id:'linear', icon:'⋯', title:'Линейный массив', desc:'Ряд отверстий под произвольным углом', badge:'X/Y', fields:[
    f('count','Количество точек','number',5,'',1,500,1), f('step','Шаг','number',20,'мм',.001,10000,.01),
    f('x0','Старт X₀','number',0,'мм',-10000,10000,.01), f('y0','Старт Y₀','number',0,'мм',-10000,10000,.01),
    f('angle','Угол ряда','number',0,'°',-360,360,.1)
  ]},
  {id:'cutting', icon:'⌁', title:'Режимы фрезерования', desc:'Vc → S, fz → F, безопасная/рабочая/производительная', badge:'S/F', fields:[
    s('material','Материал','aisi304',Object.entries(MATERIALS).map(([k,m])=>[k,m.name])),
    f('toolDia','Фреза Ø','number',8,'мм',.1,200,.1), f('teeth','Количество зубьев z','number',4,'',1,20,1),
    f('vc','Vc вручную','number',75,'м/мин; 0 не использовать',0,1000,1), f('fz','fz вручную','number',.03,'мм/зуб',.001,1,.001),
    f('ap','Глубина ap','number',1,'мм',.05,50,.05), f('maxRpm','Ограничение S','number',4000,'об/мин',100,50000,10),
    s('strategy','Стратегия','work',[['safe','Безопасная'],['work','Рабочая'],['prod','Производительная']])
  ]}
];

function f(name,label,type,value,hint='',min='',max='',step='any'){return {name,label,type,value,hint,min,max,step}}
function s(name,label,value,options){return {name,label,type:'select',value,options}}
function calcDef(id){return calcDefs.find(x=>x.id===id)}

function setHeader(title, subtitle='FULL • Offline', back=false){
  titleEl.textContent=title; subEl.textContent=subtitle; backBtn.hidden=!back;
}
function esc(s=''){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function getProjects(){try{return JSON.parse(localStorage.getItem(STORAGE.projects)||'[]')}catch{return []}}
function saveProjects(p){localStorage.setItem(STORAGE.projects,JSON.stringify(p))}
function getTools(){try{return JSON.parse(localStorage.getItem(STORAGE.tools)||'[]')}catch{return []}}
function saveTools(t){localStorage.setItem(STORAGE.tools,JSON.stringify(t))}
function getProfile(){try{return JSON.parse(localStorage.getItem(STORAGE.profile)||'null')||{machine:'Tengyue CK52PT‑Y',control:'SINUMERIK 828D / ShopTurn',maxRpm:4000}}catch{return {machine:'Tengyue CK52PT‑Y',control:'SINUMERIK 828D / ShopTurn',maxRpm:4000}}}
function saveProfile(p){localStorage.setItem(STORAGE.profile,JSON.stringify(p))}
function uid(){return (crypto.randomUUID?.()||`${Date.now()}-${Math.random()}`).slice(0,18)}

function toast(msg){
  const n=$('#toastTemplate').content.firstElementChild.cloneNode(true); n.textContent=msg; document.body.append(n); requestAnimationFrame(()=>n.classList.add('show')); setTimeout(()=>{n.classList.remove('show');setTimeout(()=>n.remove(),220)},1800)
}

function setDock(nav){$$('.dock-item').forEach(b=>b.classList.toggle('active',b.dataset.nav===nav))}
function goto(view, calc=null){document.body.classList.toggle('focus-mode',view==='calc'||view==='result'); state.view=view; state.calc=calc; state.result=null; state.currentProjectId=null; render(); window.scrollTo({top:0,behavior:'instant'})}

function render(){
  document.body.classList.toggle('focus-mode',state.view==='calc'||state.view==='result');
  if(state.view==='home') return renderHome();
  if(state.view==='calc') return renderCalc();
  if(state.view==='result') return renderResult();
  if(state.view==='projects') return renderProjects();
  if(state.view==='tools') return renderTools();
  if(state.view==='profile') return renderProfile();
}

function renderHome(){
  setHeader('CNC Geometry','FULL • Offline',false); setDock('home');
  const cards=calcDefs.map(c=>`<button class="calc-card" data-calc="${c.id}"><span class="badge">${esc(c.badge||'')}</span><div class="calc-icon">${c.icon}</div><strong>${esc(c.title)}</strong><small>${esc(c.desc)}</small></button>`).join('');
  main.innerHTML=`
    <section class="hero glass">
      <div class="eyebrow">CNC • GEOMETRY • SINUMERIK</div>
      <h1>Геометрия, координаты и режимы — в одном офлайн‑калькуляторе.</h1>
      <p>Ось C, болтовые окружности, лепестки, лыски, многоугольники, пазы, сверление, резьба, дуги и режимы фрезерования. Результат — формула, схема, таблица и данные для переноса в стойку.</p>
      <div class="hero-actions"><button class="btn btn-primary" data-calc="lobes">✿ Открыть лепестки</button><button class="btn" id="openHandlePreset">⌁ Пример: ручка Ø50 M8</button></div>
    </section>
    <section class="preset-card glass" id="handlePreset">
      <img src="./assets/sample-handle-drawing.jpeg" alt="Пример чертежа ручки"/>
      <div><strong>Ручка Ø50 M8</strong><small>6 лепестков • R11 • пример расчёта по твоему чертежу</small></div><span class="chev">›</span>
    </section>
    <div class="section-head"><div><h2>Расчёты</h2></div><p>${calcDefs.length} рабочих модулей</p></div>
    <section class="calc-grid">${cards}</section>
    <div class="section-head"><h2>Что хранится локально</h2><p>без сервера</p></div>
    <section class="settings-card glass warning"><strong>Офлайн PWA.</strong> Проекты, инструмент, профиль станка и настройки сохраняются в памяти устройства. После первой загрузки приложение работает без интернета.</section>`;
  $$('[data-calc]').forEach(b=>b.onclick=()=>openCalc(b.dataset.calc));
  $('#openHandlePreset').onclick=()=>openPreset('handle'); $('#handlePreset').onclick=()=>openPreset('handle');
}

function defaultValues(def){return Object.fromEntries(def.fields.map(x=>[x.name,x.value]))}
function openCalc(id, values=null, projectId=null){
  if(state.view==='home') state.homeScroll=window.scrollY;
  const def=calcDef(id); if(!def)return; state.calc=id; state.values={...defaultValues(def),...(values||{})}; state.currentProjectId=projectId; state.view='calc'; render();
}
function openPreset(name){
  if(name==='handle') openCalc('lobes',{stockDia:62,baseDia:50,outerDia:62,count:6,lobeR:11,toolDia:8,start:0,direction:'cw'});
}

function fieldHtml(field, value){
  if(field.type==='select') return `<select class="field" name="${field.name}">${field.options.map(([v,t])=>`<option value="${esc(v)}" ${String(v)===String(value)?'selected':''}>${esc(t)}</option>`).join('')}</select>`;
  // iOS Safari can place the caret before an existing value in <input type="number">.
  // Use a text input with numeric keyboard so selectionStart/setSelectionRange works reliably.
  if(field.type==='number') return `<input class="field numeric-field" name="${field.name}" type="text" value="${esc(value)}" inputmode="decimal" pattern="-?[0-9]*[.,]?[0-9]*" data-min="${field.min}" data-max="${field.max}" data-step="${field.step}" autocomplete="off"/>`;
  return `<input class="field" name="${field.name}" type="${field.type}" value="${esc(value)}"/>`;
}

function bindNumericCaretEnd(root=document){
  $$('.numeric-field',root).forEach(input=>{
    const caretToEnd=()=>{
      const end=input.value.length;
      try{input.setSelectionRange(end,end)}catch{}
    };
    input.addEventListener('focus',()=>{
      requestAnimationFrame(caretToEnd);
      setTimeout(caretToEnd,40); // iOS may move the caret after the focus event.
    });
    input.addEventListener('pointerup',()=>setTimeout(caretToEnd,0));
  });
}
function renderCalc(){
  const def=calcDef(state.calc); setHeader(def.title,'Ввод параметров',true); setDock('home');
  const rows=def.fields.map(x=>`<div class="form-row"><label>${esc(x.label)}${x.hint?`<small>${esc(x.hint)}</small>`:''}</label>${fieldHtml(x,state.values[x.name])}</div>`).join('');
  const preview=state.calc==='lobes'?`<section class="preset-card glass"><img src="./assets/sample-handle-drawing.jpeg" alt="Чертёж"/><div><strong>Пример геометрии</strong><small>Калькулятор универсальный — значения можно менять под любую деталь.</small></div><span class="chev">⌕</span></section>`:'';
  main.innerHTML=`${preview}<form id="calcForm"><section class="form-card glass">${rows}</section>
    <section class="warning"><strong>Проверка геометрии включена.</strong> Калькулятор предупредит, если исходные размеры противоречат друг другу или инструмент физически не подходит.</section>
    <div class="form-footer"><button class="btn btn-primary" type="submit">▦ Рассчитать</button></div></form>`;
  bindNumericCaretEnd($('#calcForm'));
  $('#calcForm').onsubmit=e=>{e.preventDefault(); const fd=new FormData(e.currentTarget); const values=Object.fromEntries(fd.entries()); def.fields.forEach(x=>{if(x.type==='number') values[x.name]=Number(String(values[x.name]).replace(',','.'))}); state.values=values; try{state.result=CALCULATORS[state.calc](values);state.view='result';render();window.scrollTo({top:0,behavior:'instant'})}catch(err){toast(err.message||'Ошибка расчёта')}};
}

function summaryHtml(result){return result.summary.map(([k,v])=>`<div class="result-line"><div class="r-icon">⌁</div><div><strong>${esc(k)}</strong><p class="accent">${esc(v)}</p></div></div>`).join('')}
function tableHtml(result){return `<div class="table-wrap"><table class="data-table"><thead><tr>${result.columns.map(c=>`<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${result.rows.map(r=>`<tr>${r.map(c=>`<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`}
function kpiHtml(kpis=[]){return kpis.length?`<div class="kpi-row">${kpis.map(([k,v])=>`<div class="kpi"><strong>${esc(v)}</strong><small>${esc(k)}</small></div>`).join('')}</div>`:''}

function renderResult(){
  const r=state.result; const def=calcDef(state.calc); setHeader('Результат расчёта',def.title,true); setDock('home');
  const warnings=(r.warnings||[]).map(w=>`<div class="warning ${w.includes('не получить')?'error-box':''}"><strong>${w.includes('не получить')?'Проверь размеры':'Важно'}.</strong> ${esc(w)}</div>`).join('');
  main.innerHTML=`
    <section class="result-card glass"><div class="eyebrow">${esc(r.title)}</div><h2 style="margin:6px 0 4px">${esc(r.headline)}</h2><p style="margin:0;color:var(--muted);font-size:12px">${esc(r.formula)}</p>${kpiHtml(r.kpis)}</section>
    ${warnings}
    <section class="result-grid">
      <section class="result-card glass"><div class="section-head" style="margin:0 0 8px"><h2>Результат</h2><p>расчёт</p></div><div class="result-summary">${summaryHtml(r)}</div></section>
      <section class="result-card glass"><div class="section-head" style="margin:0 0 8px"><h2>Схема</h2><p>вид сверху</p></div><div class="diagram">${renderDiagram(r.diagram)}</div></section>
      <section class="result-card glass wide"><div class="section-head" style="margin:0 0 8px"><h2>Координаты / шаг</h2><p>${r.rows.length} строк</p></div>${tableHtml(r)}</section>
      <section class="result-card glass wide"><div class="section-head" style="margin:0 0 8px"><h2>Для стойки</h2><p>копируемые данные</p></div><div class="code-box" id="codeBox">${esc(r.gcode||'')}</div><div class="hero-actions"><button class="btn" id="copyBtn">⧉ Копировать</button></div></section>
      <section class="result-card glass wide"><div class="section-head" style="margin:0 0 8px"><h2>Действия</h2><p>локально</p></div><div class="action-grid"><button class="btn btn-primary" id="saveProject">＋ Сохранить проект</button><button class="btn" id="pngBtn">▧ PNG карточка</button><button class="btn" id="pdfBtn">PDF / печать</button><button class="btn" id="newBtn">＋ Новый расчёт</button></div></section>
    </section>`;
  $('#copyBtn').onclick=async()=>{try{await navigator.clipboard.writeText(r.gcode||'');toast('Скопировано')}catch{toast('Не удалось скопировать')}};
  $('#saveProject').onclick=()=>saveCurrentProject(); $('#pngBtn').onclick=()=>exportPng(); $('#pdfBtn').onclick=()=>window.print(); $('#newBtn').onclick=()=>openCalc(state.calc);
}

function saveCurrentProject(){
  const projects=getProjects(); const existing=state.currentProjectId&&projects.find(p=>p.id===state.currentProjectId); const name=prompt('Название проекта',existing?.name || `${state.result.title} • ${new Date().toLocaleDateString('ru-RU')}`); if(!name)return;
  const item={id:existing?.id||uid(),name,calc:state.calc,values:state.values,result:state.result,updated:Date.now()}; const next=projects.filter(p=>p.id!==item.id); next.unshift(item); saveProjects(next.slice(0,100)); state.currentProjectId=item.id; toast('Проект сохранён локально');
}

function renderProjects(){
  setHeader('Проекты','Сохранено локально',false); setDock('projects'); const ps=getProjects();
  main.innerHTML=`<section class="hero glass"><div class="eyebrow">LOCAL STORAGE</div><h1>Сохранённые расчёты</h1><p>Открывай проект, меняй исходные размеры и пересчитывай без повторного заполнения.</p></section>${ps.length?ps.map(p=>`<section class="project-item glass"><div class="project-icon">${calcDef(p.calc)?.icon||'▦'}</div><div class="project-open" data-id="${p.id}"><strong>${esc(p.name)}</strong><small>${esc(calcDef(p.calc)?.title||p.calc)} • ${new Date(p.updated).toLocaleString('ru-RU')}</small></div><div class="project-menu"><button class="mini-btn project-open" data-id="${p.id}">›</button><button class="mini-btn delete-project" data-id="${p.id}">×</button></div></section>`).join(''):`<section class="empty glass"><div class="big">▣</div><strong>Проектов пока нет</strong>Сохрани любой результат — он появится здесь.</section>`}`;
  $$('.project-open').forEach(x=>x.onclick=()=>{const p=getProjects().find(p=>p.id===x.dataset.id); if(p)openCalc(p.calc,p.values,p.id)});
  $$('.delete-project').forEach(x=>x.onclick=()=>{if(confirm('Удалить проект?')){saveProjects(getProjects().filter(p=>p.id!==x.dataset.id));renderProjects()}});
}

function renderTools(){
  setHeader('Инструмент','Локальный список',false); setDock('tools'); const tools=getTools();
  main.innerHTML=`<section class="hero glass"><div class="eyebrow">MY TOOL</div><h1>Фрезы и сверла</h1><p>Мини‑шкаф для быстрых расчётов. Здесь можно хранить диаметр, число зубьев и тип инструмента.</p><div class="hero-actions"><button class="btn btn-primary" id="addTool">＋ Добавить инструмент</button></div></section>
  ${tools.length?tools.map(t=>`<section class="project-item glass"><div class="project-icon">${t.type==='drill'?'⌁':'⌗'}</div><div><strong>${esc(t.name)}</strong><small>${esc(t.type==='drill'?'Сверло':'Фреза')} • Ø${esc(t.dia)} ${t.teeth?`• z${esc(t.teeth)}`:''}</small></div><button class="mini-btn delete-tool" data-id="${t.id}">×</button></section>`).join(''):`<section class="empty glass"><div class="big">⌁</div><strong>Шкаф пуст</strong>Добавь свои фрезы и сверла.</section>`}`;
  $('#addTool').onclick=()=>showToolSheet(); $$('.delete-tool').forEach(b=>b.onclick=()=>{saveTools(getTools().filter(t=>t.id!==b.dataset.id));renderTools()});
}
function showToolSheet(){
  const wrap=document.createElement('div');wrap.className='sheet-backdrop';wrap.innerHTML=`<div class="sheet glass"><h3>Добавить инструмент</h3><form id="toolForm"><div class="form-row"><label>Тип</label><select class="field" name="type"><option value="mill">Фреза</option><option value="drill">Сверло</option></select></div><div class="form-row"><label>Название</label><input class="field" name="name" value="Фреза Ø8"/></div><div class="form-row"><label>Диаметр Ø</label><input class="field" name="dia" type="number" step="0.1" value="8"/></div><div class="form-row"><label>Зубьев z</label><input class="field" name="teeth" type="number" step="1" value="4"/></div><div class="hero-actions"><button class="btn btn-primary" type="submit">Сохранить</button><button class="btn" type="button" id="cancelSheet">Отмена</button></div></form></div>`;document.body.append(wrap);$('#cancelSheet',wrap).onclick=()=>wrap.remove();wrap.onclick=e=>{if(e.target===wrap)wrap.remove()};$('#toolForm',wrap).onsubmit=e=>{e.preventDefault();const v=Object.fromEntries(new FormData(e.currentTarget).entries());const tools=getTools();tools.unshift({id:uid(),...v,dia:Number(v.dia),teeth:Number(v.teeth)});saveTools(tools);wrap.remove();renderTools()};
}

function topbarDefaults(){
  if(DEVICE_PROFILE==='iphone14pro') return {inset:0,height:75,padX:13,padBottom:0,radius:34,border:1};
  return {inset:6,height:66,padX:12,padBottom:10,radius:24,border:1};
}
function getTopbarSettings(){
  const defaults=topbarDefaults();
  try{return {...defaults,...JSON.parse(localStorage.getItem(STORAGE.topbar)||'{}')}}catch{return defaults}
}
function applyTopbarSettings(v=getTopbarSettings()){
  const root=document.documentElement;
  root.style.setProperty('--topbar-inset',`${v.inset}px`);
  root.style.setProperty('--topbar-base-height',`${v.height}px`);
  root.style.setProperty('--topbar-pad-x',`${v.padX}px`);
  root.style.setProperty('--topbar-pad-bottom',`${v.padBottom}px`);
  root.style.setProperty('--topbar-radius',`${v.radius}px`);
  root.style.setProperty('--topbar-border',`${v.border}px`);
}
function saveTopbarSettings(v){localStorage.setItem(STORAGE.topbar,JSON.stringify(v));applyTopbarSettings(v)}
function topbarMode(){return matchMedia('(display-mode: standalone)').matches||navigator.standalone?'standalone':'browser'}
function topbarReport(v){
  const r=document.querySelector('.topbar')?.getBoundingClientRect();
  const vv=window.visualViewport;
  const css=getComputedStyle(document.documentElement);
  return [
    `mode: ${topbarMode()}`,
    `device profile: ${DEVICE_PROFILE}`,
    `DPR: ${devicePixelRatio}`,
    `screen: ${screen.width}×${screen.height}`,
    `avail: ${screen.availWidth}×${screen.availHeight}`,
    `inner: ${innerWidth}×${innerHeight}`,
    `client: ${document.documentElement.clientWidth}×${document.documentElement.clientHeight}`,
    `visualViewport: ${vv?`${vv.width.toFixed(1)}×${vv.height.toFixed(1)} offsetTop=${vv.offsetTop.toFixed(1)}`:'n/a'}`,
    `safe: top=${css.getPropertyValue('--safe-top').trim()} bottom=${css.getPropertyValue('--safe-bottom').trim()}`,
    r?`topbar rect: left=${r.left.toFixed(1)} right=${r.right.toFixed(1)} top=${r.top.toFixed(1)} bottom=${r.bottom.toFixed(1)} w=${r.width.toFixed(1)} h=${r.height.toFixed(1)}`:'topbar rect: n/a',
    r?`gap left/right: ${r.left.toFixed(1)} / ${(innerWidth-r.right).toFixed(1)}px`:'',
    `calibrated: inset=${v.inset}px height=${v.height}px padX=${v.padX}px bottomPad=${v.padBottom}px radius=${v.radius}px border=${v.border}px`
  ].filter(Boolean).join('\n');
}

function renderProfile(){
  setHeader('Профиль','Станок и интерфейс',false); setDock('profile'); const p=getProfile(); const tv=getTopbarSettings();
  main.innerHTML=`<section class="hero glass"><div class="eyebrow">MACHINE PROFILE</div><h1>${esc(p.machine)}</h1><p>${esc(p.control)}</p></section>
    <section class="settings-card glass"><div class="form-row"><label>Станок<small>Подпись в профиле</small></label><input id="machineInput" class="field" value="${esc(p.machine)}"/></div><div class="form-row"><label>Стойка</label><input id="controlInput" class="field" value="${esc(p.control)}"/></div><div class="form-row"><label>Макс. обороты S</label><input id="rpmInput" class="field" type="number" value="${esc(p.maxRpm)}"/></div></section>
    <section class="settings-card glass"><div class="section-head" style="margin:0 0 8px"><h2>Тема</h2><p>интерфейс</p></div><div class="segment"><button data-theme-choice="dark" class="${state.theme==='dark'?'active':''}">Тёмная</button><button data-theme-choice="light" class="${state.theme==='light'?'active':''}">Светлая</button></div></section>
    <section class="settings-card glass topdiag" id="topDiag">
      <div class="diag-title"><h2>Диагностика верха</h2><small>LIVE</small></div>
      <div class="warning"><strong>Только верхняя панель.</strong> Ползунки меняют её сразу. Dock и расчёты не затрагиваются.</div>
      <div class="topdiag-preview"><div class="topdiag-preview-bar" id="topDiagPreview"><div class="mini-ico">←</div><div class="mini-mark">⚙︎</div><div class="mini-title"><strong>Результат расчёта</strong><small>Лепестки / контур</small></div><div class="mini-ico">◐</div><div class="mini-ico">⋯</div></div></div>
      ${[['inset','Отступ от краёв / ширина',0,24,1,tv.inset],['height','Высота основы',48,90,1,tv.height],['padX','Внутренний отступ слева/справа',6,24,1,tv.padX],['padBottom','Нижний внутренний отступ',0,24,1,tv.padBottom],['radius','Скругление',0,34,1,tv.radius],['border','Толщина рамки',0,3,.5,tv.border]].map(([k,l,min,max,step,val])=>`<div class="diag-slider"><div class="diag-slider-head"><span>${l}</span><output id="out-${k}">${val}px</output></div><input type="range" data-topdiag="${k}" min="${min}" max="${max}" step="${step}" value="${val}"></div>`).join('')}
      <pre class="diag-report" id="topDiagReport"></pre>
      <div class="diag-actions"><button class="btn btn-primary" id="saveTopbar">Сохранить верх</button><button class="btn" id="resetTopbar">Сбросить</button></div>
    </section>
    <div class="hero-actions"><button class="btn btn-primary" id="saveProfile">Сохранить профиль</button><button class="btn btn-danger" id="clearData">Очистить локальные данные</button></div>`;
  $$('[data-theme-choice]').forEach(b=>b.onclick=()=>setTheme(b.dataset.themeChoice));
  let live={...tv};
  const update=()=>{
    applyTopbarSettings(live);
    $$('[data-topdiag]').forEach(r=>{const o=$(`#out-${r.dataset.topdiag}`);if(o)o.textContent=`${r.value}px`});
    const preview=$('#topDiagPreview'); if(preview){preview.style.marginLeft=`${Math.min(live.inset,18)}px`;preview.style.marginRight=`${Math.min(live.inset,18)}px`;preview.style.height=`${Math.max(44,Math.min(76,live.height-10))}px`;preview.style.paddingLeft=`${live.padX}px`;preview.style.paddingRight=`${live.padX}px`;preview.style.borderRadius=`0 0 ${live.radius}px ${live.radius}px`;preview.style.borderWidth=`${live.border}px`;}
    const rep=$('#topDiagReport'); if(rep)requestAnimationFrame(()=>rep.textContent=topbarReport(live));
  };
  $$('[data-topdiag]').forEach(r=>r.oninput=()=>{live[r.dataset.topdiag]=Number(r.value);update()});
  $('#saveTopbar').onclick=()=>{saveTopbarSettings(live);toast('Настройки верхней панели сохранены');update()};
  $('#resetTopbar').onclick=()=>{live={...topbarDefaults()};saveTopbarSettings(live);renderProfile();toast('Верхняя панель сброшена')};
  $('#saveProfile').onclick=()=>{saveProfile({machine:$('#machineInput').value,control:$('#controlInput').value,maxRpm:Number($('#rpmInput').value)||4000});toast('Профиль сохранён')};
  $('#clearData').onclick=()=>{if(confirm('Удалить проекты, инструмент и профиль?')){Object.values(STORAGE).forEach(k=>localStorage.removeItem(k));location.reload()}};
  update();
}

function setTheme(t){state.theme=t;app.dataset.theme=t;localStorage.setItem(STORAGE.theme,t);if(state.view==='profile')renderProfile()}

function renderDiagram(d){
  if(!d)return '<svg viewBox="0 0 320 220"><text x="160" y="110" text-anchor="middle">Нет схемы</text></svg>';
  const base=`<svg viewBox="0 0 320 260" role="img" aria-label="Схема расчёта">`;
  const grid=`<g stroke="rgba(140,150,160,.18)" stroke-width="1"><line x1="20" y1="130" x2="300" y2="130"/><line x1="160" y1="15" x2="160" y2="245"/></g>`;
  const c={x:160,y:130};
  if(d.type==='division'){
    const R=92,n=d.count; let s=base+grid+`<circle cx="160" cy="130" r="${R}" fill="none" class="soft-stroke"/>`;
    for(let i=0;i<n;i++){const a=(d.start+(d.direction==='ccw'?-1:1)*i*360/n-90)*Math.PI/180,x=c.x+R*Math.cos(a),y=c.y+R*Math.sin(a);s+=`<line x1="160" y1="130" x2="${x}" y2="${y}" stroke="rgba(255,196,0,.58)"/><circle cx="${x}" cy="${y}" r="3.2" fill="var(--yellow)"/><text x="${c.x+(R+16)*Math.cos(a)}" y="${c.y+(R+16)*Math.sin(a)}" text-anchor="middle">${round((d.start+(d.direction==='ccw'?-1:1)*i*360/n+360)%360,2)}°</text>`}return s+'</svg>'
  }
  if(d.type==='pcd'||d.type==='holes'){
    const pts=d.points||Array.from({length:d.count},(_,i)=>{const a=(d.start+i*360/d.count)*Math.PI/180;return{x:Math.cos(a),y:Math.sin(a)}});let s=base+grid+`<circle cx="160" cy="130" r="90" fill="none" stroke-dasharray="5 5" class="soft-stroke"/>`;
    pts.forEach((p,i)=>{const maxR=d.radius||1,x=c.x+90*(p.x/(maxR||1)),y=c.y-90*(p.y/(maxR||1));s+=`<circle cx="${x}" cy="${y}" r="7" fill="none" stroke="var(--yellow)" stroke-width="2"/><text x="${x}" y="${y-11}" text-anchor="middle">${i+1}</text>`});return s+'</svg>'
  }
  if(d.type==='lobes'){
    const scale=92/(d.outerR||1);let s=base+grid+`<circle cx="160" cy="130" r="${d.baseR*scale}" fill="none" stroke-dasharray="5 4" class="soft-stroke"/>`;
    const pathPts=[];for(let i=0;i<360;i++){const a=i*Math.PI/180;let max=-Infinity;for(const p of d.centers){const cx=p.x,cy=p.y;const ux=Math.cos(a),uy=Math.sin(a);const dot=cx*ux+cy*uy,disc=d.lobeR*d.lobeR-(cx*cx+cy*cy-dot*dot);if(disc>=0)max=Math.max(max,dot+Math.sqrt(disc))}const rr=Math.max(d.baseR,max);pathPts.push([c.x+rr*scale*Math.cos(a),c.y-rr*scale*Math.sin(a)])}s+=`<path d="M ${pathPts.map(p=>p.join(' ')).join(' L ')} Z" fill="rgba(255,196,0,.06)" stroke="var(--yellow)" stroke-width="2"/>`;d.centers.forEach(p=>{s+=`<circle cx="${c.x+p.x*scale}" cy="${c.y-p.y*scale}" r="2.5" fill="var(--yellow)"/>`});s+=`<text x="160" y="244" text-anchor="middle">R лепестка ${round(d.lobeR)} • ${d.count} шт.</text>`;return s+'</svg>'
  }
  if(d.type==='flats'){
    const R=92,off=R*(d.flatOffset/d.stockR);let pts=[];for(let i=0;i<d.count;i++){const a=(d.start+i*360/d.count-90)*Math.PI/180;const nx=Math.cos(a),ny=Math.sin(a),tx=-ny,ty=nx;const half=Math.sqrt(Math.max(0,R*R-off*off));pts.push([[c.x+off*nx+half*tx,c.y+off*ny+half*ty],[c.x+off*nx-half*tx,c.y+off*ny-half*ty]])}let s=base+grid+`<circle cx="160" cy="130" r="92" fill="none" class="soft-stroke"/>`;pts.forEach(p=>s+=`<line x1="${p[0][0]}" y1="${p[0][1]}" x2="${p[1][0]}" y2="${p[1][1]}" stroke="var(--yellow)" stroke-width="3"/>`);return s+'</svg>'
  }
  if(d.type==='polygon'){
    const n=d.sides,R=92*(d.polyR/d.stockR),pts=Array.from({length:n},(_,i)=>{const a=(d.start+i*360/n-90)*Math.PI/180;return[c.x+R*Math.cos(a),c.y+R*Math.sin(a)]});return base+grid+`<circle cx="160" cy="130" r="92" fill="none" class="soft-stroke"/><polygon points="${pts.map(p=>p.join(',')).join(' ')}" fill="rgba(255,196,0,.07)" stroke="var(--yellow)" stroke-width="2"/>`+'</svg>'
  }
  if(d.type==='slots'){
    let s=base+grid+`<circle cx="160" cy="130" r="90" fill="none" stroke-dasharray="5 5" class="soft-stroke"/>`;for(let i=0;i<d.count;i++){const a=(d.start+i*360/d.count-90)*Math.PI/180,x=c.x+90*Math.cos(a),y=c.y+90*Math.sin(a),rot=d.orientation==='tangent'?(d.start+i*360/d.count):d.start+i*360/d.count+90;s+=`<rect x="${x-16}" y="${y-5}" width="32" height="10" rx="5" fill="rgba(255,196,0,.07)" stroke="var(--yellow)" transform="rotate(${rot} ${x} ${y})"/>`}return s+'</svg>'
  }
  if(d.type==='thread'){
    return base+`<g transform="translate(70 35)"><path d="M85 8 L128 72 L105 72 L120 184 L62 184 L77 72 L54 72 Z" fill="rgba(255,196,0,.07)" stroke="var(--yellow)" stroke-width="2"/><line x1="91" y1="10" x2="91" y2="184" stroke-dasharray="5 5" class="soft-stroke"/><text x="90" y="210" text-anchor="middle">M${round(d.diameter)} • P${round(d.pitch)}</text><text x="90" y="228" text-anchor="middle">сверло Ø${round(d.drill)}</text></g>`+'</svg>'
  }
  if(d.type==='arc'){
    const xs=[d.x1,d.x2,d.cx],ys=[d.y1,d.y2,d.cy],minX=Math.min(...xs)-d.R,maxX=Math.max(...xs)+d.R,minY=Math.min(...ys)-d.R,maxY=Math.max(...ys)+d.R,sc=Math.min(250/(maxX-minX||1),190/(maxY-minY||1));const map=(x,y)=>[35+(x-minX)*sc,225-(y-minY)*sc];const [cx,cy]=map(d.cx,d.cy),[x1,y1]=map(d.x1,d.y1),[x2,y2]=map(d.x2,d.y2);let a1=Math.atan2(y1-cy,x1-cx),a2=Math.atan2(y2-cy,x2-cx),r=d.R*sc;let sweep=d.direction==='ccw'?1:0;return base+`<circle cx="${cx}" cy="${cy}" r="3" fill="var(--yellow)"/><path d="M ${x1} ${y1} A ${r} ${r} 0 0 ${sweep} ${x2} ${y2}" fill="none" stroke="var(--yellow)" stroke-width="3"/><line x1="${cx}" y1="${cy}" x2="${x1}" y2="${y1}" class="soft-stroke"/><line x1="${cx}" y1="${cy}" x2="${x2}" y2="${y2}" class="soft-stroke"/><text x="${cx}" y="${cy-9}" text-anchor="middle">CENTER</text>`+'</svg>'
  }
  if(d.type==='linear'){
    const pts=d.points,maxX=Math.max(...pts.map(p=>p.x)),minX=Math.min(...pts.map(p=>p.x)),maxY=Math.max(...pts.map(p=>p.y)),minY=Math.min(...pts.map(p=>p.y)),sc=Math.min(250/(maxX-minX||1),170/(maxY-minY||1));let s=base+grid;pts.forEach((p,i)=>{const x=35+(p.x-minX)*sc,y=215-(p.y-minY)*sc;s+=`<circle cx="${x}" cy="${y}" r="7" fill="none" stroke="var(--yellow)"/><text x="${x}" y="${y-12}" text-anchor="middle">${i+1}</text>`});return s+'</svg>'
  }
  if(d.type==='cutting'){
    return base+`<g transform="translate(60 28)"><rect x="80" y="15" width="40" height="155" rx="8" fill="rgba(255,196,0,.07)" stroke="var(--yellow)" stroke-width="2"/><path d="M80 50 C120 70 80 90 120 110 C80 130 120 150 80 170" fill="none" stroke="var(--yellow)" stroke-width="5"/><path d="M45 92 A58 58 0 1 1 145 48" fill="none" stroke="rgba(160,170,180,.5)" stroke-width="2"/><text x="98" y="204" text-anchor="middle">Ø${round(d.toolDia)} • z${d.teeth}</text><text x="98" y="222" text-anchor="middle">S ${d.rpm} • F ${d.feed}</text></g>`+'</svg>'
  }
  return base+grid+'</svg>';
}

function exportPng(){
  const r=state.result; const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=1600;const x=canvas.getContext('2d');x.fillStyle='#0b0d0f';x.fillRect(0,0,1200,1600);x.fillStyle='#ffc400';x.fillRect(0,0,1200,18);x.fillStyle='#fff';x.font='700 54px -apple-system, Arial';x.fillText('CNC Geometry',70,105);x.font='700 40px -apple-system, Arial';wrapCanvas(x,r.title,70,175,1060,50);x.fillStyle='#ffc400';x.font='700 34px -apple-system, Arial';wrapCanvas(x,r.headline,70,275,1060,44);x.fillStyle='#9aa3ad';x.font='26px -apple-system, Arial';wrapCanvas(x,r.formula,70,360,1060,36);let y=460;r.summary.forEach(([k,v])=>{x.fillStyle='#161a1f';roundRect(x,60,y,1080,110,24);x.fill();x.fillStyle='#fff';x.font='700 26px -apple-system, Arial';x.fillText(k,90,y+42);x.fillStyle='#ffc400';x.font='24px -apple-system, Arial';wrapCanvas(x,String(v),90,y+78,1010,30);y+=125});x.fillStyle='#9aa3ad';x.font='22px -apple-system, Arial';x.fillText('Сформировано офлайн • CNC Geometry FULL',70,1540);const a=document.createElement('a');a.download=`cnc-${state.calc}-${Date.now()}.png`;a.href=canvas.toDataURL('image/png');a.click();toast('PNG создан')
}
function wrapCanvas(ctx,text,x,y,max,line){const words=String(text).split(' ');let cur='';for(const w of words){const t=cur?cur+' '+w:w;if(ctx.measureText(t).width>max&&cur){ctx.fillText(cur,x,y);cur=w;y+=line}else cur=t}if(cur)ctx.fillText(cur,x,y);return y}
function roundRect(ctx,x,y,w,h,r){ctx.beginPath();ctx.roundRect?ctx.roundRect(x,y,w,h,r):(ctx.rect(x,y,w,h));}

backBtn.onclick=()=>{if(state.view==='result'){state.view='calc';render();window.scrollTo({top:0,behavior:'instant'})}else if(state.view==='calc'){state.view='home';render();requestAnimationFrame(()=>window.scrollTo({top:state.homeScroll||0,behavior:'instant'}))}else goto('home')};
$('#themeBtn').onclick=()=>setTheme(state.theme==='dark'?'light':'dark');
$('#settingsBtn').onclick=()=>goto('profile');
$$('.dock-item').forEach(b=>b.onclick=()=>goto(b.dataset.nav));

if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}))}
render();
