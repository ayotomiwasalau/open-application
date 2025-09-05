
/**
 * TommyJumper (polished "real look" pass)
 * - hand‑drawn paper grid background
 * - classic green/moving/broken/white platforms
 * - jumper with stripes + snout
 * - power‑ups (jetpack, shield) rendered like the original
 * - UFO enemy
 * Uses existing DOM elements/IDs from index.html.
 */

let canvas, ctx, rafId=null;
// Tune physics by device type: slower mobile, medium tablet, faster desktop
function computeDeviceScales(){
  if (typeof window === 'undefined') return {ACC:1, MAX:1, JUMP:1, GRAV:1, MOVE:1, ANIM:1, device:'desktop'};
  const isCoarse = (window.matchMedia?.('(pointer: coarse)').matches || 'ontouchstart' in window);
  const w = Math.max(window.innerWidth || 0, document.documentElement?.clientWidth || 0);
  if (isCoarse && w <= 600) {
    // Mobile: noticeable slowdown, longer airtime
    return {ACC:0.75, MAX:0.75, JUMP:0.70, GRAV:0.50, MOVE:0.75, ANIM:0.75, device:'mobile'};
  }
  if (isCoarse && w <= 1024) {
    // Tablet: slightly slower than desktop
    return {ACC:0.90, MAX:0.90, JUMP:0.85, GRAV:0.70, MOVE:0.90, ANIM:0.90, device:'tablet'};
  }
  // Desktop: a bit snappier
  return {ACC:1.15, MAX:1.15, JUMP:1.05, GRAV:1.00, MOVE:1.10, ANIM:1.00, device:'desktop'};
}
const SCALES = computeDeviceScales();
const DEVICE = SCALES.device;
// Increase score gain per vertical ascent (1.0 = 1 point per pixel ascended)
const SCORE_FACTOR = 3.0; // base points per unit of ascent (more responsive)
const PLATFORM_LAND_POINTS = 25; // base points for landing on a normal platform
const ENEMY_DEFEAT_POINTS = 150; // defeating an enemy
const POWERUP_POINTS = 50; // picking any power-up
const PLATFORM_PASS_POINTS = 10; // crossing to a higher platform line
const JETPACK_PLATFORM_EQUIV = 4; // jetpack counts as 4 platforms worth of score
const JETPACK_BONUS_POINTS = JETPACK_PLATFORM_EQUIV * PLATFORM_LAND_POINTS;
let projectiles=[];
let isShooting=false; // auto-shoot state
let prevJumperY=0; // for crossing detection
// Keep last final results for submissions/leaderboard
let lastFinalScore=0, lastFinalLevel=1, lastFinalTime=0;
let paused=false;

// ========= WORLD =========
const WORLD = {
  width: 400,
  height: 600,
  gravity: 0.28 * SCALES.GRAV,
  jumpVel: -10.8 * SCALES.JUMP,
  maxScrollTriggerY: 260,
  platformGapMin: 55,
  platformGapMax: 85,
  platformCount: 16,
  wrapMargin: 24,
};

// HUD / state
let score = 0, maxHeight = 0, level = 1, started=false, running=false, startMs=0, elapsedSec=0;
let heightScore = 0, bonusScore = 0; // keep height-based and bonus scores separated

// ========= INPUT =========
const keys = {left:false, right:false};
addEventListener('keydown', e=>{
  if (e.code==='ArrowLeft'||e.code==='KeyA') keys.left=true;
  if (e.code==='ArrowRight'||e.code==='KeyD') keys.right=true;
  if (e.code==='Space') {
    if (!running && started) { restart(); }
    e.preventDefault();
  }
});
addEventListener('keyup', e=>{
  if (e.code==='ArrowLeft'||e.code==='KeyA') keys.left=false;
  if (e.code==='ArrowRight'||e.code==='KeyD') keys.right=false;
});

// Touch controls for mobile (tap/hold left or right half) and on-screen buttons
function setupTouchControls(){
  const el = document.getElementById('gameCanvas');
  if(!el) return;
  const setDir = (clientX)=>{
    const rect = el.getBoundingClientRect();
    const mid = rect.left + rect.width/2;
    keys.left = clientX < mid;
    keys.right = clientX >= mid;
  };
  const clearDir = ()=>{ keys.left=false; keys.right=false; };
  const prevent = (e)=>{ e.preventDefault(); };

  el.addEventListener('touchstart', (e)=>{ prevent(e); setDir(e.touches[0].clientX); }, {passive:false});
  el.addEventListener('touchmove',  (e)=>{ prevent(e); setDir(e.touches[0].clientX); }, {passive:false});
  el.addEventListener('touchend',   (e)=>{ prevent(e); clearDir(); }, {passive:false});
  el.addEventListener('touchcancel',(e)=>{ prevent(e); clearDir(); }, {passive:false});

  const leftBtn=document.getElementById('btnLeft');
  const rightBtn=document.getElementById('btnRight');
  const shootBtn=document.getElementById('btnShoot');
  const pressLeft=(e)=>{ e?.preventDefault(); keys.left=true; keys.right=false; };
  const pressRight=(e)=>{ e?.preventDefault(); keys.right=true; keys.left=false; };
  const clear=(e)=>{ e?.preventDefault(); keys.left=false; keys.right=false; };
  if(leftBtn){
    leftBtn.addEventListener('touchstart', pressLeft, {passive:false});
    leftBtn.addEventListener('touchend', clear, {passive:false});
    leftBtn.addEventListener('mousedown', pressLeft);
    leftBtn.addEventListener('mouseup', clear);
    leftBtn.addEventListener('mouseleave', clear);
  }
  if(rightBtn){
    rightBtn.addEventListener('touchstart', pressRight, {passive:false});
    rightBtn.addEventListener('touchend', clear, {passive:false});
    rightBtn.addEventListener('mousedown', pressRight);
    rightBtn.addEventListener('mouseup', clear);
    rightBtn.addEventListener('mouseleave', clear);
  }
  if(shootBtn){
    const fire=(e)=>{ e?.preventDefault(); shoot(); };
    shootBtn.addEventListener('touchstart', fire, {passive:false});
    shootBtn.addEventListener('mousedown', fire);
  }
}

// ========= RANDOM =========
const rand=(a,b)=>Math.random()*(b-a)+a;
const randi=(a,b)=>Math.floor(rand(a,b));

// ========= OBJECTS =========
class TommyJumper{
  constructor(){
    this.w=46; this.h=46;
    this.x=WORLD.width/2-this.w/2;
    this.y=WORLD.height-120;
    this.vx=0; this.vy=0;
    this.facing=1;
    this.jetpack=0;  // frames
    this.shield=0;   // frames
  }
  update(){
    const accel=0.55 * SCALES.ACC, maxSpeed=(3.8 + level*0.12) * SCALES.MAX;
    if(keys.left){ this.vx-=accel; this.facing=-1; }
    else if(keys.right){ this.vx+=accel; this.facing=1; }
    else { this.vx*=0.9; }
    this.vx=Math.max(-maxSpeed, Math.min(maxSpeed, this.vx));

    if(this.jetpack>0){ this.vy=-12.8 * SCALES.JUMP; this.jetpack--; }
    else { this.vy += WORLD.gravity*(1+(level-1)*0.08); }

    this.x+=this.vx; this.y+=this.vy;
    if(this.x>WORLD.width+WORLD.wrapMargin) this.x=-this.w;
    if(this.x<-this.w-WORLD.wrapMargin) this.x=WORLD.width;

    if(-this.y>maxHeight){
      maxHeight=-this.y;
      heightScore = Math.floor(maxHeight * SCORE_FACTOR);
    }
    if(this.shield>0) this.shield--;
  }
  jump(str= WORLD.jumpVel){ this.vy=str; }
  draw(ctx){
    const x=Math.floor(this.x), y=Math.floor(this.y);
    ctx.save(); ctx.translate(x+this.w/2, y+this.h/2); if(this.facing===-1) ctx.scale(-1,1);

    // Character: stylized kid (brown skin, navy shirt)
    const skinFill = '#8d5524';
    const skinStroke = '#5d3a1a';
    const shirt = '#1e3a8a';
    const pants = '#0b1324';
    const shoe = '#111827';

    // head
    roundedRect(ctx,-12,-28,24,24,8,true,true,skinStroke,skinFill);
    // hair (top fringe)
    ctx.fillStyle='#1f2937';
    for(let i=-10;i<=8;i+=4){ ctx.fillRect(i,-30,3,6); }
    // eyes (look up when shooting)
    ctx.fillStyle='#111827';
    ctx.beginPath(); ctx.arc(-5, isShooting? -20 : -18, 2.5, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(5, isShooting? -20 : -18, 2.5, 0, Math.PI*2); ctx.fill();
    // mouth (centered, used as muzzle)
    ctx.fillStyle='#1f2937'; ctx.beginPath(); ctx.arc(0,-12,2.5,0,Math.PI*2); ctx.fill();

    // torso (shirt)
    roundedRect(ctx,-14,-6,28,24,6,true,true,'#0b162b',shirt);
    // arms
    ctx.strokeStyle=skinStroke; ctx.lineWidth=3;
    ctx.beginPath(); ctx.moveTo(-14,-2); ctx.lineTo(-18,6); ctx.moveTo(14,-2); ctx.lineTo(18,6); ctx.stroke();
    // legs
    ctx.strokeStyle=shoe; ctx.lineWidth=3;
    ctx.beginPath(); ctx.moveTo(-8,20); ctx.lineTo(-8,26); ctx.moveTo(8,20); ctx.lineTo(8,26); ctx.stroke();

    // jetpack flames
    if(this.jetpack>0){
      ctx.fillStyle='#ff5722'; flame(-22,6,-30,18,-16,14); ctx.fillStyle='#ffc107'; flame(-20,8,-26,16,-16,13);
    }
    // shield aura
    if(this.shield>0){
      ctx.strokeStyle='rgba(76,175,80,0.55)'; ctx.lineWidth=4; ctx.beginPath(); ctx.arc(0,0,28,0,Math.PI*2); ctx.stroke();
    }
    ctx.restore();
    function flame(ax,ay,bx,by,cx,cy){ ctx.beginPath(); ctx.moveTo(ax,ay); ctx.lineTo(bx,by); ctx.lineTo(cx,cy); ctx.closePath(); ctx.fill(); }
  }
}

const PTYPE={GREEN:'green',BROWN:'brown',WHITE:'white',MOVING:'moving'};
class Platform{
  constructor(x,y,type=PTYPE.GREEN){
    this.x=x; this.y=y;
    this.w=68; this.h=16;
    this.type=type;
    this.broken=false; // for brown breakable platforms
    this.breakT=0;     // break animation progress
    this.scored=false; // prevent repeated landing score on same platform
    this.vx=(type===PTYPE.MOVING)? (Math.random()<0.5?-1:1)*rand(0.6,1.2)*SCALES.MOVE:0;
    this.spring=(type===PTYPE.WHITE)?{dy:-18,active:true}:null;
    this.power=null; // 'jetpack' | 'shield'
  }
  update(){
    if(this.type===PTYPE.MOVING && !this.broken){
      this.x+=this.vx;
      if(this.x<10 || this.x+this.w>WORLD.width-10) this.vx*=-1;
    }
    // sinking / breaking animation for brown platforms
    if(this.type===PTYPE.BROWN && this.broken){
      this.breakT = Math.min(1.5, this.breakT + 0.08 * SCALES.ANIM); // progress
      this.y += (1.5 + this.breakT * 2.2) * SCALES.ANIM; // fall down faster over time
    }
  }
  draw(ctx){
    // Base
    const fillStroke=(x,y,w,h,fill,stroke)=>{
      roundedRect(ctx,x,y,w,h,8,true,true,stroke,fill);
      // glossy line
      ctx.fillStyle='rgba(255,255,255,0.38)';
      ctx.fillRect(x+6,y+2,w-12,3);
      // texture
      ctx.strokeStyle='rgba(0,0,0,0.13)'; ctx.lineWidth=2;
      ctx.beginPath();
      for(let i=8;i<w-8;i+=12){ ctx.moveTo(x+i,y+this.h-5); ctx.lineTo(x+i+6,y+this.h-5); }
      ctx.stroke();
    };
    if(this.type===PTYPE.BROWN && this.broken){
      // draw visibly broken halves diverging with a gap
      const gap = Math.min(14, this.breakT * 14);
      const drop = this.breakT * 6;
      const halfW = Math.floor(this.w/2) - 4;
      // left half
      fillStroke(this.x, this.y+drop, halfW, this.h, '#8d6e63', '#5d4037');
      // right half
      fillStroke(this.x + halfW + gap, this.y+drop*0.9, this.w - halfW - gap, this.h, '#8d6e63', '#5d4037');
      // cracking line accent
      ctx.strokeStyle='#4e342e'; ctx.lineWidth=3;
      ctx.beginPath(); ctx.moveTo(this.x+halfW+2, this.y+2); ctx.lineTo(this.x+halfW+2+gap-4, this.y+this.h-2); ctx.stroke();
    } else {
      if(this.type===PTYPE.GREEN) fillStroke(this.x,this.y,this.w,this.h,'#7ed957','#2f4f1a');
      if(this.type===PTYPE.MOVING) fillStroke(this.x,this.y,this.w,this.h,'#7ed957','#2e7d32');
      if(this.type===PTYPE.BROWN)  fillStroke(this.x,this.y,this.w,this.h,'#8d6e63','#5d4037');
      if(this.type===PTYPE.WHITE){
        // Draw a trampoline: colored frame with dark elastic bed
        const frameColor = '#3f51b5';
        const frameStroke = '#1a237e';
        const bedColor = '#1f2a44';
        // outer frame
        roundedRect(ctx,this.x,this.y,this.w,this.h,10,true,true,frameStroke,frameColor);
        // inner bed (slightly inset)
        const inset=4;
        roundedRect(ctx,this.x+inset,this.y+inset,this.w-inset*2,this.h-inset*2,8,true,false,'#00000000',bedColor);
        // small spring legs hint below
        ctx.strokeStyle=frameStroke; ctx.lineWidth=2;
        ctx.beginPath();
        ctx.moveTo(this.x+10, this.y+this.h);
        ctx.lineTo(this.x+10, this.y+this.h+4);
        ctx.moveTo(this.x+this.w-10, this.y+this.h);
        ctx.lineTo(this.x+this.w-10, this.y+this.h+4);
        ctx.stroke();
      }
    }

    if(this.type===PTYPE.BROWN && !this.broken){
      ctx.strokeStyle='#4e342e'; ctx.lineWidth=3;
      ctx.beginPath(); ctx.moveTo(this.x+this.w*0.55,this.y+2); ctx.lineTo(this.x+this.w*0.45,this.y+this.h-2); ctx.stroke();
    }
    // For trampoline (white) we skip the old X spring icon
    if(this.spring && this.type!==PTYPE.WHITE){
      const sx=this.x+this.w/2-6, sy=this.y-10;
      ctx.strokeStyle='#616161'; ctx.lineWidth=3;
      ctx.beginPath(); ctx.moveTo(sx,sy+10); ctx.lineTo(sx+12,sy); ctx.moveTo(sx+12,sy+10); ctx.lineTo(sx,sy); ctx.stroke();
    }
    // Power-up icons
    if(this.power==='jetpack') drawBottleIcon(ctx,this.x+this.w-18,this.y-20);
    if(this.power==='shield')  drawShieldIcon(ctx,this.x+12,this.y-22);
  }
}

class UFO{
  constructor(x,y){ this.x=x; this.y=y; this.w=64; this.h=28; this.vx=rand(0.8,1.6)*(Math.random()<0.5?-1:1)*SCALES.MOVE; }
  update(){ this.x+=this.vx; if(this.x<-40||this.x>WORLD.width-24) this.vx*=-1; }
  draw(ctx){
    ctx.save(); ctx.globalAlpha=0.9;
    // beam
    ctx.fillStyle='rgba(255,235,59,0.2)';
    ctx.beginPath(); ctx.moveTo(this.x+10,this.y+18); ctx.lineTo(this.x+this.w-10,this.y+18);
    ctx.lineTo(this.x+this.w/2+36,this.y+120); ctx.lineTo(this.x+this.w/2-36,this.y+120); ctx.closePath(); ctx.fill();
    // saucer
    roundedRect(ctx,this.x,this.y, this.w,16,8,true,true,'#4e6b2a','#99c76b');
    roundedRect(ctx,this.x+10,this.y-10, this.w-20,20,10,true,true,'#567d3a','#b2df8a');
    ctx.restore();
  }
}

// Monster enemy with simple horizontal pacing and cartoony look
class Monster{
  constructor(x,y){
    this.x=x; this.y=y; this.w=48; this.h=34;
    this.vx=(Math.random()<0.5?-1:1)*rand(0.6,1.2)*SCALES.MOVE;
    this.flip=false;
  }
  update(){
    this.x+=this.vx; if(this.x<6||this.x+this.w>WORLD.width-6){ this.vx*=-1; this.flip=!this.flip; }
  }
  draw(ctx){
    ctx.save(); if(this.flip){ ctx.translate(this.x+this.w/2,0); ctx.scale(-1,1); ctx.translate(-(this.x+this.w/2),0);} 
    // body
    roundedRect(ctx,this.x,this.y,this.w,this.h,10,true,true,'#2f3e1a','#6cab3b');
    // spots
    ctx.fillStyle='rgba(0,0,0,0.2)';
    for(let i=0;i<4;i++) ctx.fillRect(this.x+8+i*8,this.y+this.h-10,4,4);
    // eyes
    ctx.fillStyle='#ffd54f'; ctx.beginPath(); ctx.arc(this.x+14,this.y+12,6,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(this.x+30,this.y+12,6,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#1b1b1b'; ctx.beginPath(); ctx.arc(this.x+14,this.y+12,3,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(this.x+30,this.y+12,3,0,Math.PI*2); ctx.fill();
    // mouth
    ctx.fillStyle='#1b1b1b'; roundedRect(ctx,this.x+16,this.y+20,16,6,3,true,false,'#1b1b1b','#1b1b1b');
    ctx.restore();
  }
}

// ========= HELPERS =========
function roundedRect(ctx,x,y,w,h,r,fill,stroke,strokeColor='#333', fillColor='#fff'){
  ctx.beginPath(); ctx.moveTo(x+r,y);
  ctx.arcTo(x+w,y,x+w,y+h,r);
  ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r);
  ctx.arcTo(x,y,x+w,y,r);
  ctx.closePath();
  if(fill){ ctx.fillStyle = fillColor; ctx.fill(); }
  if(stroke){ ctx.strokeStyle=strokeColor; ctx.lineWidth=3; ctx.stroke(); }
}
function rectsOverlap(ax,ay,aw,ah,bx,by,bw,bh){ return ax<bx+bw && ax+aw>bx && ay<by+bh && ay+ah>by; }

// ========= PROJECTILES =========
function shoot(){
  // spawn from mouth (center of face)
  const mouthX = jumper.x + jumper.w/2;
  const mouthY = jumper.y + jumper.h/2 - 20;
  const vx = 0; // straight up
  const vy = -8.5; // speed upward
  projectiles.push({x: mouthX, y: mouthY, w: 6, h: 12, vx, vy, life: 120});
}

function updateProjectiles(){
  for(const p of projectiles){ p.x += p.vx; p.y += p.vy; p.life--; }
  // remove offscreen/expired
  projectiles = projectiles.filter(p=> p.y > -20 && p.life>0);
  // collide with enemies
  for(const p of projectiles){
    // hit UFOs
    for(const u of ufos){
      if(rectsOverlap(p.x, p.y, p.w, p.h, u.x, u.y, u.w, u.h)){
        u.hit = (u.hit||0)+1; p.life=0;
      }
    }
    // hit Monsters
    for(const m of monsters){
      if(rectsOverlap(p.x, p.y, p.w, p.h, m.x, m.y, m.w, m.h)){
        m.hit = (m.hit||0)+1; p.life=0;
      }
    }
  }
  // remove killed enemies (1 hit for now) and award points
  let defeated=0; const nextU=[]; const nextM=[];
  for(const u of ufos){ if(u.hit>=1) defeated++; else nextU.push(u); }
  for(const m of monsters){ if(m.hit>=1) defeated++; else nextM.push(m); }
  if(defeated>0) bonusScore += defeated * ENEMY_DEFEAT_POINTS;
  ufos = nextU; monsters = nextM;
}

function drawProjectiles(){
  ctx.fillStyle='#444';
  for(const p of projectiles){ ctx.fillRect(Math.floor(p.x), Math.floor(p.y), p.w, p.h); }
}

// Icons
function drawBottleIcon(ctx,x,y){
  ctx.save(); ctx.translate(x,y);
  ctx.fillStyle='#f6e04b'; roundedRect(ctx,-7,0,14,20,6,true,true,'#827717','#f6e04b');
  ctx.fillStyle='#9e9e9e'; roundedRect(ctx,-4,-6,8,8,2,true,true,'#616161','#bdbdbd');
  ctx.restore();
}
function drawShieldIcon(ctx,x,y){
  ctx.save(); ctx.translate(x,y);
  ctx.fillStyle='rgba(76,175,80,0.35)'; ctx.beginPath(); ctx.arc(0,0,12,0,Math.PI*2); ctx.fill();
  roundedRect(ctx,-6,-9,12,14,6,true,true,'#2e7d32','#7cb342');
  ctx.restore();
}

// ========= CONTAINERS =========
let jumper; let platforms=[]; let ufos=[]; let monsters=[];

// ========= SETUP =========
function init(){
  canvas=document.getElementById('gameCanvas'); if(!canvas) return;
  ctx=canvas.getContext('2d'); canvas.width=WORLD.width; canvas.height=WORLD.height;
  document.getElementById('startGame')?.addEventListener('click', start);
  document.getElementById('restartGame')?.addEventListener('click', restart);
  document.getElementById('submitScore')?.addEventListener('click', submitScore);
  // Pause/End buttons
  document.getElementById('btnPause')?.addEventListener('click', ()=>{
    paused = !paused;
    const btn = document.getElementById('btnPause');
    if(paused){ if(btn) btn.textContent='Resume'; }
    else { if(btn) btn.textContent='Pause'; if(running) loop(); }
  });
  document.getElementById('btnEnd')?.addEventListener('click', ()=>{ if(running) gameOver(); });
  setupTouchControls();
  resetState(); drawTitleCard();
}
function resetState(){
  jumper=new TommyJumper(); platforms=[]; ufos=[]; monsters=[];
  score=0; heightScore=0; bonusScore=0; maxHeight=0; level=1; elapsedSec=0;
  // Clear last-final values so a new run starts from zero and submits fresh
  lastFinalScore=0; lastFinalLevel=1; lastFinalTime=0;
  // generate initial platforms
  let lastY=WORLD.height-20;
  for(let i=0;i<WORLD.platformCount;i++){
    const type=i===0?PTYPE.GREEN:spawnPlatformType();
    const px=randi(20,WORLD.width-88);
    const p=new Platform(px,lastY,type);
    // first few: simpler types
    if(i>1 && Math.random()<0.2 && type===PTYPE.WHITE) p.power = (Math.random()<0.5?'jetpack':'shield');
    platforms.push(p);
    lastY-=randi(WORLD.platformGapMin,WORLD.platformGapMax);
  }
  platforms[0].x=WORLD.width/2- platforms[0].w/2; platforms[0].y=WORLD.height-50;
  jumper.y=platforms[0].y - jumper.h;

  hide('#gameOver'); show('#startScreen');
  started=false; running=false;
  if(rafId){ cancelAnimationFrame(rafId); rafId=null; }
  // Ensure the HUD immediately shows zeros before the next run begins
  updateHUD();
  render();
}
function start(){ hide('#startScreen'); started=true; running=true; startMs=performance.now(); loop(); }
function restart(){ hide('#gameOver'); resetState(); start(); }

// ========= LOOP =========
function loop(){ if(!running) return; rafId=requestAnimationFrame(loop); update(); render(); elapsedSec=Math.floor((performance.now()-startMs)/1000); updateHUD(); }
function update(){
  if(paused) { return; }
  const lastY = jumper.y; // for crossing detection
  jumper.update(); platforms.forEach(p=>p.update()); ufos.forEach(u=>u.update()); monsters.forEach(m=>m.update()); updateProjectiles();
  // auto-shoot when a monster above is close in vertical range
  const target = monsters.find(m => m.y < jumper.y - 40 && Math.abs(m.x - jumper.x) < 60);
  if(target){
    if(!isShooting){ isShooting=true; shoot(); }
  } else {
    isShooting=false;
  }
  // scroll when high
  if(jumper.y < WORLD.maxScrollTriggerY){
    const dy=WORLD.maxScrollTriggerY - jumper.y;
    jumper.y += dy; platforms.forEach(p=>p.y+=dy); ufos.forEach(u=>u.y+=dy); monsters.forEach(m=>m.y+=dy);
    spawnIfNeeded();
    platforms = platforms.filter(p=>p.y < WORLD.height+60);
    ufos = ufos.filter(u=>u.y < WORLD.height+80);
    monsters = monsters.filter(m=>m.y < WORLD.height+80);
  }
  // platform landing
  if(jumper.vy>0){
    for(const p of platforms){
      if(p.broken && p.type===PTYPE.BROWN) continue;
      if(rectsOverlap(jumper.x+8, jumper.y+jumper.h-6, jumper.w-16, 8, p.x, p.y, p.w, p.h)){
        if(p.type===PTYPE.BROWN){ p.broken=true; p.breakT=0.01; /* start break animation */ continue; }
        jumper.jump();
        if(!p.scored){
          // base points per platform landing
          let pts = PLATFORM_LAND_POINTS;
          // higher-value platforms: spring (white) boosts you higher -> higher score
          if(p.spring && p.spring.active) pts += 50; // extra for spring bounce
          if(p.type===PTYPE.MOVING) pts += 10;       // moving platforms slightly harder
          bonusScore += pts;
          p.scored=true;
        }
        if(p.spring && p.spring.active){
          // Reduce spring power further on mobile to avoid over-bouncy feel
          const springScale = (DEVICE==='mobile') ? 0.75 : (DEVICE==='tablet' ? 0.9 : 1.0);
          jumper.jump(p.spring.dy * springScale);
          p.spring.active=false;
        }
        // pick power-up on contact
        if(p.power==='jetpack'){
          jumper.jetpack = 160; p.power=null;
          bonusScore += POWERUP_POINTS + JETPACK_BONUS_POINTS; // base power-up + 4-platform bonus
        }
        if(p.power==='shield'){ jumper.shield = 420; p.power=null; bonusScore += POWERUP_POINTS; }
      }
    }
  }
  // reward crossing up past the center between frames (promotes moving to higher platforms)
  if(lastY > jumper.y){
    // approximate number of platform gaps crossed this frame
    const dy = lastY - jumper.y;
    const crosses = Math.floor(dy / ((WORLD.platformGapMin + WORLD.platformGapMax) / 2));
    if(crosses > 0) bonusScore += crosses * PLATFORM_PASS_POINTS;
  }
  // enemy collision
  for(const u of ufos){
    if(rectsOverlap(jumper.x+6, jumper.y+6, jumper.w-12, jumper.h-12, u.x, u.y, u.w, u.h)){
      if(jumper.shield>0){ jumper.shield=0; jumper.vy=-8; jumper.vx*=-1; } else { gameOver(); }
    }
  }
  for(const m of monsters){
    if(rectsOverlap(jumper.x+6, jumper.y+6, jumper.w-12, jumper.h-12, m.x, m.y, m.w, m.h)){
      if(jumper.shield>0){ jumper.shield=0; jumper.vy=-8; jumper.vx*=-1; } else { gameOver(); }
    }
  }
  if(jumper.y > WORLD.height+60) gameOver();
}
function render(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  drawPaperBackground(ctx,canvas.width,canvas.height);
  platforms.forEach(p=>p.draw(ctx));
  ufos.forEach(u=>u.draw(ctx));
  monsters.forEach(m=>m.draw(ctx));
  drawProjectiles();
  jumper.draw(ctx);
  // toggle play controls visibility
  const pc = document.getElementById('playControls');
  if(pc) pc.style.display = (running && !document.getElementById('gameOver')?.classList.contains('hidden')) ? 'none' : (running ? 'flex' : 'none');
  // recompute total score/level; values are shown in the yellow tiles via updateHUD()
  score = heightScore + bonusScore;
  level = 1 + Math.floor(score/1000);
}
function drawPaperBackground(ctx,w,h){
  // warm off-white base
  ctx.fillStyle='#f7f2e4'; ctx.fillRect(0,0,w,h);
  // grid in light peach/brown
  ctx.strokeStyle='#e9dcc3'; ctx.lineWidth=1;
  for(let x=0;x<w;x+=24){ ctx.beginPath(); ctx.moveTo(x+0.5,0); ctx.lineTo(x+0.5,h); ctx.stroke(); }
  for(let y=0;y<h;y+=24){ ctx.beginPath(); ctx.moveTo(0,y+0.5); ctx.lineTo(w,y+0.5); ctx.stroke(); }
}
function spawnIfNeeded(){
  let highest=Math.min(...platforms.map(p=>p.y));
  while(highest>-60){
    highest -= randi(WORLD.platformGapMin, WORLD.platformGapMax);
    const p=new Platform(randi(10, WORLD.width-78), highest, spawnPlatformType());
    if(Math.random()<0.2 && p.type===PTYPE.WHITE) p.power = (Math.random()<0.55?'jetpack':'shield');
    platforms.push(p);
    if(Math.random()<Math.min(0.02+level*0.002,0.06) && level>=2){ ufos.push(new UFO(randi(10,WORLD.width-70), highest - randi(60,180))); }
    if(Math.random()<Math.min(0.03+level*0.003,0.09) && level>=3){ monsters.push(new Monster(randi(10,WORLD.width-58), highest - randi(40,140))); }
  }
}
function spawnPlatformType(){
  const r=Math.random();
  const movingChance=Math.min(0.1 + level*0.02, 0.3);
  const brownChance =Math.min(0.05 + level*0.02, 0.25);
  const whiteChance =0.12;
  if(r<movingChance) return PTYPE.MOVING;
  if(r<movingChance+brownChance) return PTYPE.BROWN;
  if(r<movingChance+brownChance+whiteChance) return PTYPE.WHITE;
  return PTYPE.GREEN;
}

// ========= HUD / OVERLAYS =========
function $(id){ return document.getElementById(id); }
function updateHUD(){ $('score').textContent=score; $('level').textContent=level; $('time').textContent=`${elapsedSec}s`; }
function show(sel){ const el=document.querySelector(sel); if(el) el.classList.remove('hidden'); }
function hide(sel){ const el=document.querySelector(sel); if(el) el.classList.add('hidden'); }
function drawTitleCard(){
  ctx.clearRect(0,0,canvas.width,canvas.height); drawPaperBackground(ctx,canvas.width,canvas.height);
  const p=new Platform(canvas.width/2-34, canvas.height-70, PTYPE.GREEN); p.draw(ctx);
  const d=new TommyJumper(); d.x=canvas.width/2-d.w/2; d.y=p.y-d.h; d.draw(ctx);
}
function gameOver(){
  running=false; started=true; if(rafId){ cancelAnimationFrame(rafId); rafId=null; }
  const fs=$('finalScore'), fl=$('finalLevel'), ft=$('finalTime');
  // Persist the final values for submission/local storage
  lastFinalScore = score;
  lastFinalLevel = level;
  lastFinalTime = elapsedSec;
  if(fs) fs.textContent=lastFinalScore; if(fl) fl.textContent=lastFinalLevel; if(ft) ft.textContent=`${lastFinalTime}s`;
  show('#gameOver'); tryStoreLocalScore('Player', lastFinalScore);
}
function tryStoreLocalScore(name,score){
  try{ const key='tommyjumper_local_scores'; const arr=JSON.parse(localStorage.getItem(key)||'[]'); arr.push({name,score,ts:Date.now()}); arr.sort((a,b)=>b.score-a.score); localStorage.setItem(key, JSON.stringify(arr.slice(0,50))); }catch{}
}
async function submitScore(){
  const nameEl=$('playerName'); const playerName=(nameEl?.value||'').trim()||'Anonymous';
  // Use the last finalized results to ensure we submit non-zero after the game ends
  const submitScoreVal = lastFinalScore || score;
  const submitLevelVal = lastFinalLevel || level;
  const submitTimeVal = lastFinalTime || elapsedSec;
  tryStoreLocalScore(playerName, submitScoreVal);
  try{ const res=await fetch('/submit-score',{method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({player_name:playerName,score:submitScoreVal,level:submitLevelVal,time:submitTimeVal,game_duration:submitTimeVal})}); 
       if(res.ok){ alert('Score submitted!'); if(nameEl) nameEl.value=''; } else { alert('Saved locally. Backend unreachable.'); } } 
  catch(e){ console.warn(e); alert('Saved locally. Backend unreachable.'); }
}
addEventListener('load', init);
