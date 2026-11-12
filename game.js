'use strict';
const names=['박쥐단','사마귀단','쥐단','뱀단','호랑이단','돼지단','곰단','자서귀단','황요호단','산군대호단','백운단'];
// Radius is measured in board coordinates (600 × 600). The collision circle and
// visible sprite share the same center; spriteScale compensates for PNG padding.
// Reference screenshot: inner box ≈ 820 × 820 px; source game sprites: 74…332 px.
const referenceDiameters=[74,94,104,122,152,184,200,230,266,298,332];
const levels=referenceDiameters.map(diameter=>({radius:diameter*600/820/2,spriteScale:512/490}));
const physics={gravity:0.0126,friction:0.12,frictionStatic:0.5,airDrag:0.006,restitution:0.08,rollingDrag:0.994,maxSpin:0.18,substeps:4};
const engine=Matter.Engine.create({enableSleeping:true,positionIterations:8,velocityIterations:8});
engine.gravity.y=1;engine.gravity.scale=physics.gravity;
const mergeQueue=[];
function resetWorld(){
 Matter.Composite.clear(engine.world,false);Matter.Engine.clear(engine);mergeQueue.length=0;
 const material={isStatic:true,friction:0.06,restitution:0.04,slop:0.02};
 Matter.Composite.add(engine.world,[Matter.Bodies.rectangle(300,640,800,80,material),Matter.Bodies.rectangle(-40,250,80,1100,material),Matter.Bodies.rectangle(640,250,80,1100,material)]);
}
function collectMerges(event){for(const pair of event.pairs){const a=pair.bodyA.plugin.gameBall,b=pair.bodyB.plugin.gameBall;if(a&&b&&a.level===b.level&&a.level<10)mergeQueue.push([a,b])}}
Matter.Events.on(engine,'collisionStart',collectMerges);Matter.Events.on(engine,'collisionActive',collectMerges);
const ceilingLine=8;
const overflowGraceFrames=20,overflowLimitFrames=45;
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
function reset(){resetWorld();balls=[];score=0;current=randomLevel();aim=300;ended=false;danger=0;lastDrop=-Infinity;overlay.classList.add('hidden');updateScore()}
function makeBall(level,x,y,vx=0,vy=0){
 const r=levels[level].radius;
 const b={level,r,x:Math.max(r,Math.min(600-r,x)),y:Math.min(600-r,y),vx,vy,angle:0,spin:0,age:0,overflowFrames:0};
 b.body=Matter.Bodies.circle(b.x,b.y,r,{density:0.001,friction:physics.friction,frictionStatic:physics.frictionStatic,frictionAir:physics.airDrag,restitution:physics.restitution,slop:0.02,sleepThreshold:35},40);
 b.body.plugin.gameBall=b;Matter.Body.setVelocity(b.body,{x:vx,y:vy});Matter.Composite.add(engine.world,b.body);return b;
}
function drop(){if(mobilePanelOpen||ended||performance.now()-lastDrop<200)return;const r=levels[current].radius;balls.push(makeBall(current,aim,r+4,0,0.8));current=randomLevel();lastDrop=performance.now()}
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
 for(let step=0;step<physics.substeps;step++){
  Matter.Engine.update(engine,1000/60/physics.substeps);
  // Contact resistance dissipates rotation without inventing spin on every overlap.
  const touching=new Set();
  for(const pair of engine.pairs.list)if(pair.isActive){touching.add(pair.bodyA);touching.add(pair.bodyB)}
  for(const b of balls){const body=b.body;if(body.isSleeping)continue;
   let spin=Math.max(-physics.maxSpin,Math.min(physics.maxSpin,body.angularVelocity));
   if(touching.has(body))spin*=physics.rollingDrag;
   Matter.Body.setAngularVelocity(body,spin);
  }
  flushMerges();
 }
 for(const b of balls){b.x=b.body.position.x;b.y=b.body.position.y;b.vx=b.body.velocity.x;b.vy=b.body.velocity.y;b.angle=b.body.angle;b.spin=b.body.angularVelocity;b.age++}
 checkOverflow();
}
function flushMerges(){
 if(!mergeQueue.length)return;
 const consumed=new Set(),created=[];
 for(const [a,b] of mergeQueue){
  if(consumed.has(a)||consumed.has(b)||!balls.includes(a)||!balls.includes(b))continue;
  consumed.add(a);consumed.add(b);
  const x=(a.body.position.x+b.body.position.x)/2,y=(a.body.position.y+b.body.position.y)/2;
  const vx=(a.body.velocity.x+b.body.velocity.x)/2,vy=(a.body.velocity.y+b.body.velocity.y)/2;
  Matter.Composite.remove(engine.world,a.body);Matter.Composite.remove(engine.world,b.body);
  const merged=makeBall(a.level+1,x,y,vx*.65,Math.max(-1,Math.min(1,vy*.3)));
  Matter.Body.setAngle(merged.body,(a.body.angle+b.body.angle)/2);created.push(merged);score+=mergeRewards[a.level];
 }
 mergeQueue.length=0;
 if(consumed.size){balls=balls.filter(b=>!consumed.has(b)).concat(created);updateScore()}
}
// A ball remaining above the line loses even if the stack keeps jittering.
// Track each ball separately so unrelated brief crossings cannot accumulate.
function checkOverflow(){
 danger=0;
 for(const b of balls){
  if(b.age>=overflowGraceFrames && b.y-b.r<=ceilingLine)b.overflowFrames=(b.overflowFrames||0)+1;
  else b.overflowFrames=0;
  danger=Math.max(danger,b.overflowFrames);
 }
 if(!ended && danger>=overflowLimitFrames){
  ended=true;activeTouch=null;
  document.querySelector('#final').textContent=score.toLocaleString();
  overlay.classList.remove('hidden');
 }
}
function sprite(level,x,y,angle=0,opacity=1){const image=spriteCache[level];if(!image)return;const size=levels[level].radius*2*levels[level].spriteScale;ctx.save();ctx.globalAlpha=opacity;ctx.translate(x,y);ctx.rotate(angle);ctx.drawImage(image,-size/2,-size/2,size,size);ctx.restore()}
let renderedAim=null,renderedEnded=null;
function draw(){const heldRadius=levels[current].radius;const dropX=Math.max(heldRadius,Math.min(600-heldRadius,aim));if(dropX!==renderedAim){dropper.style.left=(dropX/6)+'%';renderedAim=dropX}if(ended!==renderedEnded){dropper.classList.toggle('is-ended',ended);renderedEnded=ended}ctx.clearRect(0,0,600,600);ctx.save();ctx.strokeStyle=danger?'#ff9d85':'#fbe6bd88';ctx.setLineDash([7,7]);ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(8,ceilingLine);ctx.lineTo(592,ceilingLine);ctx.stroke();ctx.restore();if(!ended){const r=levels[current].radius,x=Math.max(r,Math.min(600-r,aim));ctx.save();ctx.setLineDash([]);ctx.lineWidth=2;ctx.strokeStyle='#fff1cce6';ctx.beginPath();ctx.moveTo(x,r*2+4);ctx.lineTo(x,600);ctx.stroke();ctx.restore();sprite(current,x,r+4,0,.8)}for(const b of balls)sprite(b.level,b.x,b.y,b.angle)}
function frame(t){if(!lastTime)lastTime=t;acc+=Math.min(50,t-lastTime);lastTime=t;let stepped=false;while(acc>=1000/60){if(!ended&&!mobilePanelOpen)tick();acc-=1000/60;stepped=true}if(stepped)draw();requestAnimationFrame(frame)}reset();requestAnimationFrame(frame);





