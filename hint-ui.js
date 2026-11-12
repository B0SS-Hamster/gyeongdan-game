'use strict';
let hintWorker=null,hintGeneration=0,hintResult=null;
const hintCard=document.querySelector('#hint-card'),hintText=document.querySelector('#hint-text'),hintTitle=document.querySelector('#hint-title'),hintPlace=document.querySelector('#hint-place');
function clearHint(){hintGeneration++;if(hintWorker){hintWorker.terminate();hintWorker=null}hintBusy=false;hintOpen=false;hintPoint=null;hintResult=null;hintCard.classList.add('hidden');hintPlace.disabled=true;document.querySelectorAll('[data-hint]').forEach(b=>b.disabled=false)}
function hintSnapshot(){return {current,radii:levels.map(l=>l.radius),rewards:mergeRewards.slice(),physics:{...physics},ceiling:ceilingLine,grace:overflowGraceFrames,limit:overflowLimitFrames,balls:balls.map(b=>({level:b.level,x:b.body.position.x,y:b.body.position.y,vx:b.body.velocity.x,vy:b.body.velocity.y,angle:b.body.angle,spin:b.body.angularVelocity,sleeping:b.body.isSleeping,age:b.age,overflowFrames:b.overflowFrames}))}}
function explainHint(r){
 const location=Math.round(r.x/6),reasons=[];
 if(r.allUnsafe)reasons.push('시험한 위치 모두에서 상단 초과가 예상됩니다. 아래 위치도 안전한 수를 보장하지 못합니다.');
 else if(r.lost)reasons.push('상단을 넘을 위험이 있습니다.');
 if(r.merges)reasons.push(`합성 ${r.merges}회, +${r.gain.toLocaleString()}점이 예측됩니다.`);
 else reasons.push('바로 합성되는 위치가 확인되지 않아 쌓인 높이와 빈 공간을 우선했습니다.');
 reasons.push(`예측한 최고 높이는 박스의 약 ${Math.max(0,Math.round(r.height/6))}%입니다.`);
 if(r.height<=r.lowestHeight+8)reasons.push('비교한 위치 중 쌓인 높이가 낮은 편입니다.');
 if(r.opportunities)reasons.push('이웃 단계 경단이 가까워 후속 합성으로 이어질 여지도 평가했습니다.');
 return `왼쪽에서 ${location}% 지점. ${reasons.join(' ')} ${r.tested}곳을 1.5초씩 시험한 현재 한 수의 근사 추천이며, 다음 경단이나 장기 최적해는 알 수 없습니다.`;
}
async function requestHint(){
 if(ended){hintCard.classList.remove('hidden');hintTitle.textContent='게임이 끝났어요';hintText.textContent='새 게임을 시작한 뒤 힌트를 눌러 주세요.';hintPlace.disabled=true;return}
 if(hintBusy||hintOpen)return;closeMobilePanels();activeTouch=null;
 hintBusy=true;hintOpen=true;hintResult=null;hintPoint=null;const id=++hintGeneration,state=hintSnapshot();
 hintCard.classList.remove('hidden');hintTitle.textContent='놓을 위치를 비교하고 있어요';hintText.textContent='현재 판을 잠시 멈추고 후보 위치를 시험합니다.';hintPlace.disabled=true;document.querySelectorAll('[data-hint]').forEach(b=>b.disabled=true);
 const progress=(n,total)=>{if(id===hintGeneration)hintTitle.textContent=`위치 비교 중 ${n} / ${total}`};
 const finish=result=>{if(id!==hintGeneration)return;hintBusy=false;hintResult=result;hintPoint=result.x;hintTitle.textContent=result.allUnsafe?'상단 초과 주의':'이 위치를 추천해요';hintText.textContent=explainHint(result);hintPlace.disabled=false;document.querySelectorAll('[data-hint]').forEach(b=>b.disabled=false);if(hintWorker){hintWorker.terminate();hintWorker=null}};
 const fail=()=>{if(id!==hintGeneration)return;hintBusy=false;hintOpen=false;hintTitle.textContent='이번 힌트를 계산하지 못했어요';hintText.textContent='판은 그대로입니다. 잠시 뒤 다시 눌러 주세요.';document.querySelectorAll('[data-hint]').forEach(b=>b.disabled=false)};
 const fallback=async()=>{try{const positions=GyeongdanHints.candidates(state),results=[];for(const x of positions){await new Promise(resolve=>setTimeout(resolve,0));if(id!==hintGeneration)return;results.push(GyeongdanHints.rollout(state,x));progress(results.length,positions.length)}finish(GyeongdanHints.summarize(results))}catch(error){fail()}};
 try{hintWorker=new Worker('hint-worker.js');hintWorker.onmessage=e=>{if(e.data.id!==id||id!==hintGeneration)return;if(e.data.error){hintWorker.terminate();hintWorker=null;fallback()}else if(e.data.result)finish(e.data.result);else progress(e.data.progress,e.data.total)};hintWorker.onerror=e=>{e.preventDefault();if(id!==hintGeneration)return;if(hintWorker)hintWorker.terminate();hintWorker=null;fallback()};hintWorker.postMessage({id,state})}catch(error){fallback()}
}
function drawHintOverlay(){if(hintPoint===null||ended)return;ctx.save();ctx.strokeStyle='#a9ffbc';ctx.lineWidth=3;ctx.setLineDash([10,5]);ctx.beginPath();ctx.moveTo(hintPoint,4);ctx.lineTo(hintPoint,600);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#163e2b';const labelX=Math.max(31,Math.min(569,hintPoint));ctx.fillRect(labelX-29,12,58,25);ctx.fillStyle='#b8ffce';ctx.font='bold 14px sans-serif';ctx.textAlign='center';ctx.fillText('추천',labelX,30);ctx.restore()}
document.querySelectorAll('[data-hint]').forEach(b=>b.onclick=requestHint);
document.querySelector('#hint-close').onclick=clearHint;
hintPlace.onclick=()=>{if(hintBusy||!hintResult||ended)return;const x=hintResult.x;clearHint();aim=x;lastDrop=-Infinity;drop()};
