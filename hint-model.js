/* One-ply physics lookahead. Locally tuned heuristics; not an optimal/MCTS solver. */
(function(root){
'use strict';
function candidates(state){
 const r=state.radii[state.current],lo=r,hi=600-r,clamp=x=>Math.max(lo,Math.min(hi,x));
 const uniform=Array.from({length:9},(_,i)=>lo+(hi-lo)*i/8);
 const targets=state.balls.filter(b=>b.level===state.current).sort((a,b)=>a.y-b.y).slice(0,5).map(b=>clamp(b.x));
 return [...new Set([...uniform,...targets].map(x=>Math.round(x*10)/10))];
}
function rollout(state,x){
 const M=root.Matter,p=state.physics,engine=M.Engine.create({enableSleeping:true,positionIterations:8,velocityIterations:8});engine.gravity.y=1;engine.gravity.scale=p.gravity;
 const material={isStatic:true,friction:.06,restitution:.04,slop:.02};
 M.Composite.add(engine.world,[M.Bodies.rectangle(300,640,800,80,material),M.Bodies.rectangle(-40,250,80,1100,material),M.Bodies.rectangle(640,250,80,1100,material)]);
 let balls=[],queue=[],merges=0,gain=0,lost=false;
 function create(level,x,y,vx,vy,angle=0,spin=0,age=0,overflow=0){const r=state.radii[level];const b={level,r,age,overflow};b.body=M.Bodies.circle(Math.max(r,Math.min(600-r,x)),Math.min(600-r,y),r,{density:.001,friction:p.friction,frictionStatic:p.frictionStatic,frictionAir:p.airDrag,restitution:p.restitution,slop:.02,sleepThreshold:35},40);b.body.plugin.hintBall=b;M.Body.setAngle(b.body,angle);M.Body.setVelocity(b.body,{x:vx,y:vy});M.Body.setAngularVelocity(b.body,spin);M.Composite.add(engine.world,b.body);return b}
 for(const b of state.balls){const copy=create(b.level,b.x,b.y,b.vx,b.vy,b.angle,b.spin,b.age,b.overflowFrames);if(b.sleeping)M.Sleeping.set(copy.body,true);balls.push(copy)}
 balls.push(create(state.current,x,state.radii[state.current]+4,0,.8));
 function collect(e){for(const pair of e.pairs){const a=pair.bodyA.plugin.hintBall,b=pair.bodyB.plugin.hintBall;if(a&&b&&a.level===b.level&&a.level<state.radii.length-1)queue.push([a,b])}}
 M.Events.on(engine,'collisionStart',collect);M.Events.on(engine,'collisionActive',collect);
 for(let frame=0;frame<90&&!lost;frame++){
  for(let step=0;step<p.substeps;step++){
   M.Engine.update(engine,1000/60/p.substeps);
   const touching=new Set();for(const pair of engine.pairs.list)if(pair.isActive){touching.add(pair.bodyA);touching.add(pair.bodyB)}
   for(const b of balls)if(!b.body.isSleeping){let spin=Math.max(-p.maxSpin,Math.min(p.maxSpin,b.body.angularVelocity));if(touching.has(b.body))spin*=p.rollingDrag;M.Body.setAngularVelocity(b.body,spin)}
   const used=new Set(),created=[];
   for(const [a,b] of queue){if(used.has(a)||used.has(b)||!balls.includes(a)||!balls.includes(b))continue;used.add(a);used.add(b);const pa=a.body.position,pb=b.body.position,va=a.body.velocity,vb=b.body.velocity;M.Composite.remove(engine.world,a.body);M.Composite.remove(engine.world,b.body);created.push(create(a.level+1,(pa.x+pb.x)/2,(pa.y+pb.y)/2,(va.x+vb.x)/2*.65,Math.max(-1,Math.min(1,(va.y+vb.y)/2*.3)),(a.body.angle+b.body.angle)/2));gain+=state.rewards[a.level];merges++}
   queue=[];if(used.size)balls=balls.filter(b=>!used.has(b)).concat(created);
  }
  for(const b of balls){b.age++;b.overflow=b.age>=state.grace&&b.body.position.y-b.r<=state.ceiling?b.overflow+1:0;if(b.overflow>=state.limit)lost=true}
 }
 const tops=balls.map(b=>b.body.position.y-b.r),height=600-Math.min(600,...tops);let opportunities=0;
 for(let i=0;i<balls.length;i++)for(let j=i+1;j<balls.length;j++){const a=balls[i],b=balls[j];if(Math.abs(a.level-b.level)!==1)continue;const d=Math.hypot(a.body.position.x-b.body.position.x,a.body.position.y-b.body.position.y);if(d<a.r+b.r+24)opportunities++}
 // Sample the silhouette: tall peaks/uneven piles leave less useful landing room.
 const surface=[];for(let sx=15;sx<600;sx+=30){let top=600;for(const b of balls){const dx=sx-b.body.position.x;if(Math.abs(dx)<b.r)top=Math.min(top,b.body.position.y-Math.sqrt(b.r*b.r-dx*dx))}surface.push(600-top)}
 const mean=surface.reduce((a,b)=>a+b,0)/surface.length,roughness=surface.reduce((s,h)=>s+Math.abs(h-mean),0)/surface.length;
 const risk=Math.max(0,height-480),value=(lost?-1000000:0)+merges*180+Math.log1p(gain)*8-height*.8-roughness*.25-risk*7+opportunities*3;
 M.Composite.clear(engine.world,false);M.Engine.clear(engine);
 return {x,gain,merges,lost,height,roughness,opportunities,value};
}
function summarize(results){const ranked=results.slice().sort((a,b)=>a.lost-b.lost||b.value-a.value||a.x-b.x);const best=ranked[0];return {...best,tested:ranked.length,allUnsafe:ranked.every(r=>r.lost),lowestHeight:Math.min(...ranked.filter(r=>!r.lost||best.lost).map(r=>r.height))}}
root.GyeongdanHints={candidates,rollout,summarize};
})(typeof globalThis!=='undefined'?globalThis:this);
