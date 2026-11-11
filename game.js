'use strict';
const names=['박쥐단','사마귀단','쥐단','뱀단','호랑이단','돼지단','곰단','자서귀단','황요호단','산군대호단','백운단'];
// Radius is measured in board coordinates (600 × 600). The collision circle and
// visible sprite share the same center; spriteScale compensates for PNG padding.
// Reference screenshot: inner box ≈ 820 × 820 px; source game sprites: 74…332 px.
const referenceDiameters=[74,94,104,122,152,184,200,230,266,298,332];
const levels=referenceDiameters.map(diameter=>({radius:diameter*600/820/2,spriteScale:512/490}));
const ceilingLine=8;
const dropper=document.querySelector('#dropper');
const spriteCache=[];
const images=names.map((name,i)=>{const image=new Image();image.onload=()=>{const tile=document.createElement('canvas');const size=Math.ceil(levels[i].radius*2*levels[i].spriteScale);tile.width=tile.height=size;tile.getContext('2d').drawImage(image,0,0,size,size);spriteCache[i]=tile};image.src=`assets/${String(i+1).padStart(2,'0')}_${name}.png`;return image});
const canvas=document.querySelector('#game'),ctx=canvas.getContext('2d');
const scoreEl=document.querySelector('#score'),bestEl=document.querySelector('#best'),overlay=document.querySelector('#overlay');
const catalog=document.querySelector('#catalog');
// Points are indexed by the two source sprites, shared by the guide and scoring.
const mergeRewards=[10,21,45,120,360,1120,3580,11600,38000,125000];
names.slice(0,-1).forEach((name,i)=>{
 const row=document.createElement('div');row.className='recipe';
 const label=document.createElement('span');label.className='recipe-name';label.textContent=name;
 const equation=document.createElement('div');equation.className='recipe-equation';
 for(const part of [i,'+',i,'→',i+1]){
  if(typeof part==='number'){const img=document.createElement('img');img.src=images[part].src;img.alt=names[part];equation.append(img)}
  else{const symbol=document.createElement('span');symbol.textContent=part;equation.append(symbol)}
 }
 const points=document.createElement('strong');points.className='recipe-points';points.textContent='+'+mergeRewards[i].toLocaleString();
 row.append(label,equation,points);catalog.append(row);
});
const milestones=[130000,100000,60000,45000,30000,12000,7000,1500], icons=['✺','✧','▣','◉','✧','▣','♧','◉'];
const milestonesEl=document.querySelector('#milestones');
milestones.forEach((value,i)=>{const row=document.createElement('div');row.className='milestone';row.innerHTML=`<span class="icon">${icons[i]}</span><span>${value.toLocaleString()}</span><span class="check"></span>`;milestonesEl.append(row)});
let balls=[],score=0,best=0,current=0,aim=300,ended=false,lastDrop=-Infinity,danger=0,lastTime=0,acc=0;
try{best=Number(localStorage.getItem('gyeongdan-best'))||0}catch(e){}bestEl.textContent=best.toLocaleString();
function randomLevel(){return Math.floor(Math.random()*4)}
function updateScore(){scoreEl.textContent=score.toLocaleString();for(const [i,row] of [...milestonesEl.children].entries()){const hit=score>=milestones[i];row.classList.toggle('reached',hit);row.querySelector('.check').textContent=hit?'✓':''}if(score>best){best=score;bestEl.textContent=best.toLocaleString();try{localStorage.setItem('gyeongdan-best',best)}catch(e){}}}
function reset(){balls=[];score=0;current=randomLevel();aim=300;ended=false;danger=0;lastDrop=-Infinity;overlay.classList.add('hidden');updateScore()}
function makeBall(level,x,y,vx=0,vy=0){const r=levels[level].radius;return {level,r,x:Math.max(r,Math.min(600-r,x)),y:Math.min(600-r,y),vx,vy,angle:0,spin:0,age:0}}
function drop(){if(mobilePanelOpen||ended||performance.now()-lastDrop<200)return;const r=levels[current].radius;balls.push(makeBall(current,aim,r+4,0,5));current=randomLevel();lastDrop=performance.now()}
function setAim(e){const rect=canvas.getBoundingClientRect();aim=Math.max(0,Math.min(600,(e.clientX-rect.left)*600/rect.width))}
let activeTouch=null;
canvas.addEventListener('pointerdown',e=>{
 if(e.pointerType==='touch'||e.pointerType==='pen'){
  if(activeTouch!==null||mobilePanelOpen||ended)return;
  activeTouch=e.pointerId;setAim(e);canvas.setPointerCapture(e.pointerId);
 }else{setAim(e);drop()}
});
canvas.addEventListener('pointermove',e=>{if(e.pointerType==='mouse'||e.pointerId===activeTouch)setAim(e)});
canvas.addEventListener('pointerup',e=>{
 if(e.pointerId!==activeTouch)return;
 setAim(e);activeTouch=null;drop();
 if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);
});
canvas.addEventListener('pointercancel',e=>{if(e.pointerId===activeTouch)activeTouch=null});
canvas.addEventListener('lostpointercapture',e=>{if(e.pointerId===activeTouch)activeTouch=null});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeMobilePanels();document.querySelectorAll('.dialog').forEach(d=>d.classList.add('hidden'));return}if(mobilePanelOpen||document.querySelector('.dialog:not(.hidden)'))return;if(['ArrowLeft','ArrowRight',' ','ArrowDown'].includes(e.key)){e.preventDefault();if(e.key==='ArrowLeft')aim=Math.max(0,aim-24);if(e.key==='ArrowRight')aim=Math.min(600,aim+24);if(e.key===' '||e.key==='ArrowDown')drop()}});
for(const id of ['restart','newgame','again'])document.querySelector('#'+id).addEventListener('click',reset);
document.querySelector('#help').onclick=()=>document.querySelector('#help-dialog').classList.remove('hidden');document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>document.getElementById(b.dataset.close).classList.add('hidden'));document.querySelectorAll('.dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d)d.classList.add('hidden')}));

let mobilePanelOpen=false;
const recipePanel=document.querySelector('.recipe-panel');
const recordsPanel=document.querySelector('#records-dialog');
const panelShade=document.querySelector('#mobile-shade');
function closeMobilePanels(){mobilePanelOpen=false;recipePanel.classList.remove('mobile-open');recordsPanel.classList.add('hidden');panelShade.classList.add('hidden')}
document.querySelector('#mobile-catalog').onclick=()=>{closeMobilePanels();mobilePanelOpen=true;recipePanel.classList.add('mobile-open');panelShade.classList.remove('hidden')};
document.querySelector('#mobile-records').onclick=()=>{closeMobilePanels();document.querySelector('#record-current').textContent=score.toLocaleString();document.querySelector('#record-best').textContent=best.toLocaleString();mobilePanelOpen=true;recordsPanel.classList.remove('hidden');panelShade.classList.remove('hidden')};
document.querySelectorAll('[data-mobile-close]').forEach(b=>b.onclick=closeMobilePanels);panelShade.onclick=closeMobilePanels;
document.addEventListener('visibilitychange',()=>{lastTime=0;acc=0});

function tick(){
 const used=new Set(),merges=[];
 // Four small physics steps prevent small sprites from tunneling through others.
 for(let step=0;step<4;step++){
  for(const b of balls){if(used.has(b))continue;b.vy+=.22;b.vx*=.998;b.vy=Math.min(b.vy,22);b.x+=b.vx/4;b.y+=b.vy/4;b.spin=Math.max(-.018,Math.min(.018,b.spin));b.angle+=b.spin/4;b.spin*=.965;if(Math.abs(b.spin)<.00005)b.spin=0;
   if(b.x<b.r){b.x=b.r;b.vx=Math.abs(b.vx)*.06;b.spin*=.75}if(b.x>600-b.r){b.x=600-b.r;b.vx=-Math.abs(b.vx)*.06;b.spin*=.75}
   if(b.y>600-b.r){b.y=600-b.r;if(b.vy>0)b.vy=-b.vy*.02;b.vx*=.92;b.spin+=(b.vx/b.r-b.spin)*.08;b.spin*=.85;if(Math.abs(b.vy)<.1)b.vy=0}}
  for(let i=0;i<balls.length;i++)for(let j=i+1;j<balls.length;j++){
   const a=balls[i],b=balls[j];if(used.has(a)||used.has(b))continue;let dx=b.x-a.x,dy=b.y-a.y;const sum=a.r+b.r;if(Math.abs(dx)>=sum||Math.abs(dy)>=sum||dx*dx+dy*dy>=sum*sum)continue;let d=Math.sqrt(dx*dx+dy*dy);if(d<.001){dx=.001;dy=0;d=.001}
   if(a.level===b.level&&a.level<10){used.add(a);used.add(b);merges.push({level:a.level+1,x:(a.x+b.x)/2,y:(a.y+b.y)/2,vx:(a.vx+b.vx)/2,vy:Math.min(0,(a.vy+b.vy)/2)});continue}
   const nx=dx/d,ny=dy/d,over=a.r+b.r-d,ma=a.r*a.r,mb=b.r*b.r,total=ma+mb;a.x-=nx*over*mb/total;a.y-=ny*over*mb/total;b.x+=nx*over*ma/total;b.y+=ny*over*ma/total;
   const rel=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;if(rel<0){const impulse=-1.02*rel/(1/ma+1/mb);a.vx-=impulse*nx/ma;a.vy-=impulse*ny/ma;b.vx+=impulse*nx/mb;b.vy+=impulse*ny/mb;const tangent=(b.vx-a.vx)*(-ny)+(b.vy-a.vy)*nx;const friction=Math.max(-impulse*.25,Math.min(impulse*.25,-tangent/(1/ma+1/mb)));
    a.vx-=friction*(-ny)/ma;a.vy-=friction*nx/ma;b.vx+=friction*(-ny)/mb;b.vy+=friction*nx/mb;
    a.spin+=tangent*.00008;b.spin+=tangent*.00008}
   a.spin*=.94;b.spin*=.94;
  }
 }
 for(const b of balls)b.age++;
 if(merges.length){balls=balls.filter(b=>!used.has(b));for(const m of merges){balls.push(makeBall(m.level,m.x,m.y,m.vx,m.vy));score+=mergeRewards[m.level-1]}updateScore()}
 if(balls.some(b=>b.age>120&&b.y-b.r<ceilingLine&&Math.abs(b.vy)<1.5))danger++;else danger=Math.max(0,danger-2);
 if(danger>150){ended=true;document.querySelector('#final').textContent=score.toLocaleString();overlay.classList.remove('hidden')}
}
function sprite(level,x,y,angle=0,opacity=1){const image=spriteCache[level];if(!image)return;const size=levels[level].radius*2*levels[level].spriteScale;ctx.save();ctx.globalAlpha=opacity;ctx.translate(x,y);ctx.rotate(angle);ctx.drawImage(image,-size/2,-size/2,size,size);ctx.restore()}
let renderedAim=null,renderedEnded=null;
function draw(){const heldRadius=levels[current].radius;const dropX=Math.max(heldRadius,Math.min(600-heldRadius,aim));if(dropX!==renderedAim){dropper.style.left=(dropX/6)+'%';renderedAim=dropX}if(ended!==renderedEnded){dropper.classList.toggle('is-ended',ended);renderedEnded=ended}ctx.clearRect(0,0,600,600);ctx.save();ctx.strokeStyle=danger?'#ff9d85':'#fbe6bd88';ctx.setLineDash([7,7]);ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(8,ceilingLine);ctx.lineTo(592,ceilingLine);ctx.stroke();ctx.restore();if(!ended){const r=levels[current].radius,x=Math.max(r,Math.min(600-r,aim));ctx.save();ctx.setLineDash([]);ctx.lineWidth=2;ctx.strokeStyle='#fff1cce6';ctx.beginPath();ctx.moveTo(x,r*2+4);ctx.lineTo(x,600);ctx.stroke();ctx.restore();sprite(current,x,r+4,0,.8)}for(const b of balls)sprite(b.level,b.x,b.y,b.angle)}
function frame(t){if(!lastTime)lastTime=t;acc+=Math.min(50,t-lastTime);lastTime=t;let stepped=false;while(acc>=1000/60){if(!ended&&!mobilePanelOpen)tick();acc-=1000/60;stepped=true}if(stepped)draw();requestAnimationFrame(frame)}reset();requestAnimationFrame(frame);


