(() => {
'use strict';
const $=id=>document.getElementById(id);
const canvas=$('game'),ctx=canvas.getContext('2d');
const distanceEl=$('distance'),scoreEl=$('score'),materialsEl=$('materials'),bestEl=$('best');
const digestBar=$('digestBar'),gasBar=$('gasBar'),digestText=$('digestText'),gasText=$('gasText');
const fartBtn=$('fartBtn'),fartState=$('fartState'),overlay=$('overlay'),finalStats=$('finalStats'),evoText=$('evoText'),restartBtn=$('restartBtn'),toast=$('toast');

const FART_COST=25, MAX_GAS=100, MAX_DIGEST=100;
let W=0,H=0,DPR=1,last=0,running=true,pointerY=null;
let distance=0,biomass=0,materials=0,digest=0,gas=0,speed=215,surge=0,fartPulse=0,spawnT=0,foodT=0,probeT=10,worldTime=0;
let best=Number(localStorage.getItem('fartspace_best')||0);
let codex=JSON.parse(localStorage.getItem('fartspace_codex')||'{}');
bestEl.textContent=`BEST ${best}`;
const player={x:150,y:300,vy:0,r:20,rot:0,pulse:0};
const objects=[],particles=[],stars=[];
const rnd=(a,b)=>a+Math.random()*(b-a),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

function resize(){DPR=Math.min(2,devicePixelRatio||1);W=innerWidth;H=innerHeight;canvas.width=Math.floor(W*DPR);canvas.height=Math.floor(H*DPR);ctx.setTransform(DPR,0,0,DPR,0,0);player.x=Math.max(92,Math.min(160,W*.15));if(!last)player.y=H/2;stars.length=0;for(let i=0;i<160;i++)stars.push({x:Math.random()*W,y:Math.random()*H,z:Math.random(),s:.35+Math.random()*1.7});}
addEventListener('resize',resize);resize();
function toastMsg(msg){toast.textContent=msg;toast.classList.add('show');clearTimeout(toast._t);toast._t=setTimeout(()=>toast.classList.remove('show'),1800)}

function reset(){distance=0;biomass=0;materials=0;digest=0;gas=0;speed=215;surge=0;fartPulse=0;spawnT=.7;foodT=.25;probeT=rnd(12,20);worldTime=0;player.y=H/2;player.vy=0;player.rot=0;objects.length=0;particles.length=0;overlay.style.display='none';running=true;last=performance.now();syncHUD();toastMsg('Primitive cell initialized. Collect matter to build gas.');}

function spawnAsteroid(){const r=rnd(17,44);objects.push({type:'asteroid',x:W+r+30,y:rnd(55,H-55),r,vy:rnd(-11,11),rot:rnd(0,6.28),spin:rnd(-.65,.65),dead:false});}
function spawnCollectible(){const roll=Math.random();let type='particle';if(roll>.43&&roll<=.67)type='bean';else if(roll>.67&&roll<=.81)type='chili';else if(roll>.81&&roll<=.91)type='taco';else if(roll>.91)type='screw';const r={particle:7,bean:12,chili:12,taco:16,screw:11}[type];objects.push({type,x:W+40,y:rnd(68,H-68),r,phase:rnd(0,6.28),rot:rnd(0,6.28),dead:false});}
function spawnProbe(){objects.push({type:'voyager',x:W+90,y:rnd(120,H-120),r:25,phase:0,dead:false,seen:false});}

function addDigest(amount,label){const before=digest;digest=clamp(digest+amount,0,MAX_DIGEST);const accepted=Math.round(digest-before);if(accepted>0)toastMsg(`${label} → +${accepted} digestion matter`);else toastMsg('Digestive storage full');}
function collect(o){o.dead=true;player.pulse=1;
  if(o.type==='particle'){biomass+=1;addDigest(5,'Particle');}
  if(o.type==='bean'){biomass+=3;addDigest(24,'Beans');}
  if(o.type==='chili'){biomass+=4;addDigest(18,'Chili');}
  if(o.type==='taco'){biomass+=7;addDigest(30,'Taco');}
  if(o.type==='screw'){materials+=1;addDigest(10,'Metal debris');}
  for(let i=0;i<13;i++)particles.push({x:o.x,y:o.y,vx:rnd(-95,95),vy:rnd(-95,95),life:rnd(.3,.7),size:rnd(2,5),kind:o.type==='screw'?'metal':'spark'});
}

function fart(){if(!running)return;if(gas<FART_COST){toastMsg(`Need ${FART_COST-gas|0} more stored gas`);return;}gas-=FART_COST;surge=1.05;fartPulse=1;player.vy*=.5;for(const o of objects){if(o.type==='asteroid'){const dx=o.x-player.x,dy=o.y-player.y,d=Math.hypot(dx,dy);if(dx>-20&&dx<270&&d<290){o.x+=Math.max(42,275-d)*1.28;o.vy+=dy/(d||1)*125;o.rot+=1.4;}}}for(let i=0;i<38;i++)particles.push({x:player.x-17,y:player.y+rnd(-7,7),vx:rnd(-330,-95),vy:rnd(-78,78),life:rnd(.28,.8),size:rnd(2,8),kind:'gas'});syncHUD();}
fartBtn.addEventListener('pointerdown',e=>{e.preventDefault();fart()});addEventListener('keydown',e=>{if(e.code==='Space'){e.preventDefault();running?fart():reset()}if(!running&&e.code==='Enter')reset()});restartBtn.onclick=reset;
canvas.addEventListener('pointerdown',e=>{pointerY=e.clientY;canvas.setPointerCapture?.(e.pointerId)});canvas.addEventListener('pointermove',e=>{if(e.buttons||e.pointerType==='touch')pointerY=e.clientY});canvas.addEventListener('pointerup',()=>pointerY=null);canvas.addEventListener('pointercancel',()=>pointerY=null);

function die(){running=false;best=Math.max(best,Math.floor(distance));localStorage.setItem('fartspace_best',String(best));bestEl.textContent=`BEST ${best}`;finalStats.textContent=`Distance ${Math.floor(distance)} km · Biomass ${biomass} · Materials ${materials} · Gas left ${Math.floor(gas)}`;const stage=biomass<22?'Primitive cell':biomass<55?'Digestive microbe':biomass<110?'Gas-adapted protocell':'Early cosmic microorganism';evoText.textContent=`Current evolutionary direction: ${stage}`;overlay.style.display='flex';}

function syncHUD(){distanceEl.textContent=`${Math.floor(distance).toLocaleString()} km`;scoreEl.textContent=`BIO ${biomass}`;materialsEl.textContent=`MAT ${materials}`;digestBar.style.width=`${digest}%`;gasBar.style.width=`${gas}%`;digestText.textContent=`${Math.floor(digest)}`;gasText.textContent=`${Math.floor(gas)}/100`;const ready=gas>=FART_COST;fartBtn.disabled=!ready;fartState.textContent=ready?`${Math.floor(gas/FART_COST)} READY`:'NEED GAS';}

function update(dt){if(!running)return;worldTime+=dt;surge=Math.max(0,surge-dt);fartPulse=Math.max(0,fartPulse-dt*2.5);player.pulse=Math.max(0,player.pulse-dt*3.4);
  const target=pointerY==null?player.y:pointerY,accel=(target-player.y)*11.2-player.vy*6.1;player.vy=clamp(player.vy+accel*dt,-340,340);player.y=clamp(player.y+player.vy*dt,34,H-34);player.rot+=(player.vy*.00055-player.rot)*dt*6;
  if(digest>0&&gas<MAX_GAS){const digestionRate=4.6;const processed=Math.min(digest,digestionRate*dt,MAX_GAS-gas);digest-=processed;gas+=processed;}
  const worldSpeed=speed+Math.min(130,distance*.05)+(surge>0?175:0);distance+=worldSpeed*dt*.055;
  spawnT-=dt;foodT-=dt;probeT-=dt;if(spawnT<=0){spawnAsteroid();spawnT=rnd(.68,1.28)*Math.max(.58,1-distance/2600)}if(foodT<=0){spawnCollectible();foodT=rnd(.38,.88)}if(probeT<=0){spawnProbe();probeT=rnd(22,38)}
  for(const s of stars){s.x-=worldSpeed*dt*(.05+s.z*.34);if(s.x<-4){s.x=W+4;s.y=Math.random()*H}}
  for(const o of objects){o.x-=worldSpeed*dt*(o.type==='voyager'?.72:1);o.phase=(o.phase||0)+dt*2;o.rot=(o.rot||0)+dt*.45;if(o.type==='asteroid'){o.y+=o.vy*dt;o.rot+=o.spin*dt}const dx=o.x-player.x,dy=o.y-player.y,d=Math.hypot(dx,dy);
    if(o.type==='asteroid'&&d<o.r+player.r-4){if(surge>.2){o.x+=120;o.vy+=dy/(d||1)*180}else die()}
    else if(['particle','bean','chili','taco','screw'].includes(o.type)&&d<o.r+player.r+6)collect(o);
    else if(o.type==='voyager'&&!o.seen&&Math.abs(dx)<110&&Math.abs(dy)<130){o.seen=true;if(!codex.voyager1){codex.voyager1=true;localStorage.setItem('fartspace_codex',JSON.stringify(codex));toastMsg('COSMIC CODEX: Voyager 1 discovered')}else toastMsg('Voyager 1 — previously catalogued')}
    if(o.x<-125)o.dead=true;
  }
  for(let i=objects.length-1;i>=0;i--)if(objects[i].dead)objects.splice(i,1);for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;p.vx*=.985;p.vy*=.985}for(let i=particles.length-1;i>=0;i--)if(particles[i].life<=0)particles.splice(i,1);syncHUD();
}

function blob(x,y,r,fill,stroke,w=2){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=w;ctx.stroke();}}
function drawAsteroid(o){ctx.save();ctx.translate(o.x,o.y);ctx.rotate(o.rot);ctx.beginPath();for(let i=0;i<9;i++){const a=i/9*Math.PI*2,rr=o.r*(.74+.24*Math.sin(i*12.91+o.r)),x=Math.cos(a)*rr,y=Math.sin(a)*rr;i?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.closePath();const g=ctx.createRadialGradient(-o.r*.3,-o.r*.35,2,0,0,o.r);g.addColorStop(0,'#9b90a4');g.addColorStop(.45,'#615971');g.addColorStop(1,'#302c3d');ctx.fillStyle=g;ctx.fill();ctx.strokeStyle='rgba(255,255,255,.15)';ctx.stroke();blob(-o.r*.2,-o.r*.05,o.r*.18,'rgba(20,17,29,.35)');ctx.restore();}
function drawCollectible(o){ctx.save();ctx.translate(o.x,o.y+Math.sin(o.phase)*3);ctx.rotate(o.type==='screw'?o.rot:0);if(o.type==='particle'){blob(0,0,6,'#76cfff');blob(0,0,2,'#eefaff')}if(o.type==='bean'){ctx.rotate(-.45);ctx.beginPath();ctx.ellipse(0,0,12,8,0,0,Math.PI*2);ctx.fillStyle='#82db72';ctx.fill();ctx.beginPath();ctx.ellipse(4,-2,7,3.5,0,0,Math.PI*2);ctx.fillStyle='#478f58';ctx.fill()}if(o.type==='chili'){ctx.rotate(.7);ctx.beginPath();ctx.moveTo(-11,0);ctx.quadraticCurveTo(3,-10,13,1);ctx.quadraticCurveTo(4,10,-11,0);ctx.fillStyle='#ff6f66';ctx.fill();ctx.fillStyle='#83df79';ctx.fillRect(-14,-2,5,4)}if(o.type==='taco'){ctx.beginPath();ctx.arc(0,2,14,Math.PI,0);ctx.lineTo(14,7);ctx.lineTo(-14,7);ctx.closePath();ctx.fillStyle='#f3cf67';ctx.fill();ctx.fillStyle='#79ce67';ctx.fillRect(-9,0,18,4);ctx.fillStyle='#ff7b61';ctx.fillRect(-6,3,12,3)}if(o.type==='screw'){ctx.fillStyle='#a9b7c9';ctx.fillRect(-8,-3,16,6);ctx.fillRect(5,-7,4,14);ctx.strokeStyle='#d9e3ee';ctx.lineWidth=1;ctx.strokeRect(-8,-3,16,6)}ctx.restore();}
function drawVoyager(o){ctx.save();ctx.translate(o.x,o.y);ctx.rotate(-.13);ctx.strokeStyle='#b9c4d8';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-28,0);ctx.lineTo(26,0);ctx.stroke();ctx.fillStyle='#d7cda2';ctx.fillRect(-7,-6,18,12);ctx.beginPath();ctx.arc(-16,0,14,-.55,.55);ctx.strokeStyle='#dae2ef';ctx.lineWidth=2;ctx.stroke();ctx.fillStyle='rgba(120,175,255,.18)';ctx.fillRect(11,-15,28,30);ctx.strokeRect(11,-15,28,30);ctx.restore();ctx.fillStyle='rgba(220,232,255,.72)';ctx.font='700 10px system-ui';ctx.fillText('VOYAGER 1',o.x-31,o.y-26);}

function drawPlayer(){ctx.save();ctx.translate(player.x,player.y);ctx.rotate(player.rot);const breathe=1+Math.sin(worldTime*3.2)*.025+player.pulse*.07;ctx.scale(breathe,breathe);
  if(fartPulse>0){const rr=36+(1-fartPulse)*85;ctx.beginPath();ctx.arc(0,0,rr,0,Math.PI*2);ctx.strokeStyle=`rgba(174,255,132,${fartPulse*.42})`;ctx.lineWidth=4;ctx.stroke();}
  ctx.beginPath();for(let i=0;i<28;i++){const a=i/28*Math.PI*2,noise=Math.sin(a*3+worldTime*1.8)*1.3+Math.sin(a*5-worldTime)*.7,rr=player.r+noise,x=Math.cos(a)*rr,y=Math.sin(a)*rr*.92;i?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.closePath();
  const g=ctx.createRadialGradient(-7,-8,2,0,0,26);g.addColorStop(0,'rgba(181,255,235,.96)');g.addColorStop(.55,'rgba(83,211,181,.85)');g.addColorStop(1,'rgba(27,102,111,.72)');ctx.fillStyle=g;ctx.fill();ctx.strokeStyle='rgba(208,255,248,.66)';ctx.lineWidth=2;ctx.stroke();
  blob(2,1,7,'rgba(54,111,133,.45)','rgba(185,245,234,.22)',1);blob(-8,-6,3.2,'rgba(198,255,154,.35)');blob(8,-7,2.4,'rgba(130,190,255,.32)');blob(-6,7,2.7,'rgba(246,222,134,.28)');
  ctx.beginPath();ctx.moveTo(-18,4);ctx.quadraticCurveTo(-29,11,-36,3);ctx.quadraticCurveTo(-30,-5,-19,-5);ctx.strokeStyle='rgba(126,232,208,.42)';ctx.lineWidth=3;ctx.stroke();ctx.restore();}

function draw(){ctx.clearRect(0,0,W,H);const ng=ctx.createRadialGradient(W*.72,H*.34,20,W*.72,H*.34,Math.max(W,H)*.55);ng.addColorStop(0,'rgba(77,105,194,.15)');ng.addColorStop(.45,'rgba(63,30,112,.07)');ng.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=ng;ctx.fillRect(0,0,W,H);for(const s of stars){ctx.globalAlpha=.25+s.z*.7;ctx.fillStyle=s.z>.7?'#dfeaff':'#9db0d8';ctx.fillRect(s.x,s.y,s.s,s.s)}ctx.globalAlpha=1;ctx.strokeStyle='rgba(130,160,255,.045)';for(let y=H*.2;y<H;y+=H*.2){ctx.beginPath();ctx.moveTo(0,y);ctx.quadraticCurveTo(W*.55,y-25,W,y+10);ctx.stroke()}for(const o of objects){if(o.type==='asteroid')drawAsteroid(o);else if(o.type==='voyager')drawVoyager(o);else drawCollectible(o)}for(const p of particles){ctx.globalAlpha=clamp(p.life/.65,0,1);blob(p.x,p.y,p.size,p.kind==='gas'?'#b8ff76':p.kind==='metal'?'#c9d4df':'#d9fbff')}ctx.globalAlpha=1;drawPlayer();if(digest>0){ctx.fillStyle='rgba(205,255,231,.5)';ctx.font='700 11px system-ui';ctx.fillText('METABOLIZING COLLECTED MATTER → GAS',18,H-38)}}
function loop(t){let dt=(t-last)/1000;last=t;dt=Math.min(.034,Math.max(0,dt||0));update(dt);draw();requestAnimationFrame(loop)}
reset();requestAnimationFrame(loop);
})();
