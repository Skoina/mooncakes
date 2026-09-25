/* 月餅不要掉！手機試玩版 — 可離線使用。 */
(() => {
  'use strict';
  const W = 390, H = 844, GROUND = 702, TARGET = 20;
  const $ = id => document.getElementById(id);
  const canvas = $('game'), ctx = canvas.getContext('2d');
  const bgm = $('bgm'); bgm.volume = .32; bgm.loop=true;
  bgm.addEventListener('ended',()=>{if(sound){bgm.currentTime=0;music();}});
  const scenes = ['loading', 'entry', 'home', 'play', 'result', 'greeting'];
  const atlas = new Image(); atlas.src = 'assets/sprite-atlas.webp';
  const backdrop = new Image(); backdrop.src = 'assets/background/moonlit-garden.webp';
  const card = new Image(); card.src = 'assets/background/festival-card.webp';

  // Source rectangles in the approved transparent sprite atlas.
  const art = {
    black: [0, 15, 380, 360], jump: [370, 10, 290, 355],
    bully: [660, 12, 290, 360], eating: [954, 10, 300, 368],
    normal: [25, 393, 300, 298], egg: [360, 408, 280, 285],
    small: [665, 430, 218, 257], large: [927, 390, 326, 305],
    square: [20, 703, 268, 228], gold: [285, 690, 330, 260],
    tray: [590, 745, 360, 185], start: [952, 754, 300, 135],
    restart: [25, 1020, 307, 150], frame: [330, 917, 385, 330],
    lanterns: [720, 925, 250, 325], flowers: [968, 920, 283, 334]
  };
  const kinds = [
    {key:'normal', w:70, h:32}, {key:'egg', w:70, h:33},
    {key:'small', w:58, h:29}, {key:'large', w:82, h:36},
    {key:'square', w:74, h:33}, {key:'gold', w:70, h:34}
  ];
  let scene='loading', best=Number(localStorage.getItem('mooncake-best')||0);
  let endlessBest=Number(localStorage.getItem('mooncake-endless-best')||0);
  let endlessUnlocked=localStorage.getItem('mooncake-endless-unlocked')==='1'||best>=TARGET;
  let mode='normal', drops=0;
  let seen=localStorage.getItem('mooncake-tutorial')==='1';
  let sound=localStorage.getItem('mooncake-sound')!=='off', synth=null;
  let placed=0, hearts=3, combo=0, cakes=[], missed=[], falling=null, waiting=false;
  let runner=W/2, direction=1, camera=0, clock=0, last=0, ending=false, session=0;
  let wobble=0, wobbleSpeed=0, swayAmplitude=0, confetti=[], noticeTimer=0, guideTimer=0, goalTimer=0;
  const BULLY_WIDTH=83, BULLY_HEIGHT=133; // 30% narrower than the previous 119 px sprite.
  let bullyX=291, bullyY=GROUND-77, bullyJump=null;

  function part(c,key,x,y,w,h,flip=false) {
    if (!atlas.complete || !atlas.naturalWidth) return;
    const [sx,sy,sw,sh]=art[key];
    c.save(); c.translate(x,y); if(flip)c.scale(-1,1);
    c.drawImage(atlas,sx,sy,sw,sh,-w/2,-h/2,w,h); c.restore();
  }
  function paintButtons() {
    for(const [id,key] of [['enter','start'],['start','start'],['home-endless','start'],['retry','restart'],['endless','start'],['open-card','start'],['again','restart']]) {
      const b=$(id); if(!b)continue;
      let cv=b.querySelector('canvas');
      if(!cv){const label=document.createElement('span');label.className='button-label';
        while(b.firstChild)label.appendChild(b.firstChild);
        cv=document.createElement('canvas');cv.className='button-art';b.append(cv,label);b.classList.add('art-button');}
      const box=b.getBoundingClientRect(), dpr=Math.min(devicePixelRatio||1,2);
      if(box.width<1||box.height<1)continue;
      cv.width=Math.max(1,Math.round(box.width*dpr));cv.height=Math.max(1,Math.round(box.height*dpr));
      const c=cv.getContext('2d');c.setTransform(cv.width/box.width,0,0,cv.height/box.height,0,0);
      if(atlas.complete&&atlas.naturalWidth){
        let [sx,sy,sw,sh]=art[key];
        // Fill the button by cropping the source, never by stretching its artwork.
        const sourceRatio=sw/sh, targetRatio=box.width/box.height;
        if(targetRatio>sourceRatio){const crop=sw/targetRatio;sy+=(sh-crop)/2;sh=crop;}
        else{const crop=sh*targetRatio;sx+=(sw-crop)/2;sw=crop;}
        c.drawImage(atlas,sx,sy,sw,sh,0,0,box.width,box.height);
      }
    }
  }
  function paintHome(){const cv=$('home-decor');if(!cv)return;cv.width=W;cv.height=H;
    const c=cv.getContext('2d');part(c,'black',93,626,174,154);
    part(c,'bully',307,662,161,176);part(c,'tray',190,745,285,108);}
  function resize(){const rect=canvas.getBoundingClientRect(), dpr=Math.min(devicePixelRatio||1,2);
    canvas.width=Math.max(1,Math.round(rect.width*dpr));canvas.height=Math.max(1,Math.round(rect.height*dpr));
    ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);paintButtons();paintHome();}
  window.addEventListener('resize',resize);
  atlas.onload=()=>{paintButtons();paintHome();};
  function show(next){scene=next;for(const name of scenes)$(name).classList.toggle('active',name===next);
    if(next==='play')resize(); else if(next==='home'||next==='result'||next==='greeting'||next==='entry')paintButtons();}
  function ui(){$('home-best').textContent=`最高紀錄：${best} 個｜無限：${endlessBest} 個`;
    $('home-endless').classList.toggle('hidden',!endlessUnlocked);
    $('best').textContent=`${mode==='endless'?'無限 BEST':'BEST'} ${String(mode==='endless'?endlessBest:best).padStart(2,'0')}`;
    $('count').textContent=`${mode==='endless'?'無限 ':'月餅 × '}${String(placed).padStart(2,'0')}`;
    $('hearts').textContent='♥ '.repeat(hearts)+'♡ '.repeat((mode==='endless'?5:3)-hearts);
    $('sound').textContent=sound?'🔊 音樂開':'🔇 靜音';
    $('game-sound').textContent=sound?'♫':'×';
    $('end-challenge').classList.toggle('hidden',mode!=='endless');}
  function syncMusicSpeed(){
    // HTMLAudioElement playbackRate changes the real MP3, not just the synthesized effects.
    bgm.playbackRate=scene==='play'
      ?(mode==='endless'?Math.pow(1.05,placed):placed>=16&&placed<=20?1.5:1)
      :1;
  }
  async function music(){if(!sound)return false;try{await bgm.play();$('music-hint').textContent='背景音樂播放中 ♪';return true;}
    catch{$('music-hint').textContent='點一下畫面開啟音樂';return false;}}
  function toggleSound(){sound=!sound;localStorage.setItem('mooncake-sound',sound?'on':'off');
    if(sound)music();else bgm.pause();ui();}
  function tone(f,d=.12,type='sine',vol=.09){if(!sound)return;
    const pace=placed>=16&&placed<=20?1.5:1;
    try{synth??=new(window.AudioContext||window.webkitAudioContext)();if(synth.state==='suspended')synth.resume();
      const o=synth.createOscillator(),g=synth.createGain();o.type=type;
      o.frequency.setValueAtTime(f*pace,synth.currentTime);
      g.gain.setValueAtTime(vol,synth.currentTime);g.gain.exponentialRampToValueAtTime(.001,synth.currentTime+d/pace);
      o.connect(g).connect(synth.destination);o.start();o.stop(synth.currentTime+d/pace);}catch{}}
  function melody(){const pace=placed>=16&&placed<=20?1.5:1;
    [580,730,920,1170].forEach((f,i)=>setTimeout(()=>tone(f,.36),i*140/pace));}
  function banner(message){const el=$('notice');el.textContent=message;el.classList.add('show');
    clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>el.classList.remove('show'),1250);}
  function randomCake(){const n=Math.random();return n<.54?kinds[0]:n<.70?kinds[1]:n<.81?kinds[2]:n<.90?kinds[3]:n<.97?kinds[4]:kinds[5];}
  function spawn(){const kind=randomCake();falling={x:runner+direction*29,y:141-camera,vx:0,vy:0,
    w:kind.w,h:kind.h,key:kind.key,angle:0,spin:0};waiting=false;}
  function start(nextMode='normal'){session++;mode=nextMode;drops=0;clearTimeout(guideTimer);clearTimeout(goalTimer);placed=0;hearts=mode==='endless'?5:3;combo=0;
    cakes=[];missed=[];falling=null;waiting=false;runner=W/2;direction=1;camera=0;clock=0;
    wobble=0;wobbleSpeed=0;swayAmplitude=0;bullyX=291;bullyY=GROUND-77;bullyJump=null;
    ending=false;confetti=[];show('play');syncMusicSpeed();music();ui();spawn();
    $('goal-tip').classList.toggle('hidden',mode!=='normal');
    if(mode==='normal'){const id=session;goalTimer=setTimeout(()=>{if(id===session)$('goal-tip').classList.add('hidden');},3400);}
    $('tutorial').classList.toggle('hidden',seen);
    if(!seen){guideTimer=setTimeout(()=>{$('tutorial').classList.add('hidden');seen=true;
      localStorage.setItem('mooncake-tutorial','1');},4500);}
    if(mode==='endless')banner('🌕 無限中秋開始！');tone(680,.14);}
  function drop(){if(scene!=='play'||ending||!falling||falling.vy!==0)return;
    $('goal-tip').classList.add('hidden');clearTimeout(goalTimer);
    $('tutorial').classList.add('hidden');seen=true;localStorage.setItem('mooncake-tutorial','1');
    falling.x=runner+direction*29;falling.y=141-camera;
    falling.vy=75;falling.vx=placed>=10?Math.sin(clock*2)*8:0;
    if(mode==='endless')drops++;
    tone(390,.12,'triangle');}
  function miss(){if(!falling)return;hearts--;combo=0;
    falling.vy=Math.max(falling.vy,120);falling.vx+=(falling.x<W/2?-105:105);
    falling.spin=(Math.random()-.5)*3;missed.push(falling);falling=null;waiting=true;ui();
    banner(hearts?'哎呀！月餅沒接上':'月餅掉光啦！');tone(170,.24,'sawtooth',.06);
    const id=session;if(hearts<=0){ending=true;setTimeout(()=>{if(id===session)finish(false);},1000);}
    else setTimeout(()=>{if(id===session&&scene==='play')spawn();},550);}
  function land(){if(!falling)return;const below=cakes.at(-1);
    const offset=Math.abs(falling.x-(below?.x??W/2));placed++;
    syncMusicSpeed();
    combo=offset<10?combo+1:0;
    // A crooked landing briefly rocks the upper tower; centered landings stay calm.
    if(below&&offset>=7){
      wobbleSpeed+=Math.sign(falling.x-below.x)*Math.min(.9,.25+offset*.018);
      swayAmplitude=Math.min(.038,swayAmplitude+.003+offset*.0005);
    }
    falling.vx=falling.vy=0;falling.angle=Math.max(-.09,Math.min(.09,(falling.x-(below?.x??W/2))*.002));
    cakes.push(falling);startBullyJump(falling);falling=null;waiting=true;
    if(mode==='normal'&&placed>best){best=placed;localStorage.setItem('mooncake-best',best);}
    if(mode==='normal'&&placed===TARGET){endlessUnlocked=true;localStorage.setItem('mooncake-endless-unlocked','1');}
    if(mode==='endless'&&placed>endlessBest){endlessBest=placed;localStorage.setItem('mooncake-endless-best',endlessBest);}ui();
    if(combo){banner(combo>1?`✨ 完美 ×${combo}！`:'✨ 完美！');tone(970,.23);}
    else tone(460,.12,'triangle');
    if(placed===6)banner('越來越高了！');
    if(placed===11)banner('進入雲端啦！');
    if(placed===16)banner('月亮就在眼前！');
    if(mode==='normal'&&placed===TARGET){ending=true;confetti=Array.from({length:45},()=>({x:Math.random()*W,
      y:Math.random()*H,vx:(Math.random()-.5)*85,vy:-55-Math.random()*75}));melody();
      const id=session;setTimeout(()=>{if(id===session)finish(true);},1800);return;}
    const id=session;setTimeout(()=>{if(id===session&&scene==='play')spawn();},360);}
  function physics(dt){for(const b of missed){b.vy+=900*dt;b.y+=b.vy*dt;b.x+=b.vx*dt;b.angle+=b.spin*dt;}
    missed=missed.filter(b=>b.y+camera<H+150);
    if(!falling||falling.vy<=0)return;
    const b=falling, oldBottom=b.y+b.h/2;
    b.vy+=1150*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;
    const below=cakes.at(-1),plane=below?below.y-below.h/2:GROUND;
    if(oldBottom<=plane&&b.y+b.h/2>=plane){
      b.y=plane-b.h/2;
      if(!below){if(b.x>75&&b.x<315)land();else miss();}
      else {const offset=Math.abs(b.x-below.x);
        const overlap=(b.w+below.w)/2-offset;
        // The new cake must visibly sit on top of the last one, rather than
        // simply touching its edge or falling onto the tray beside the tower.
        if(overlap>=Math.min(b.w,below.w)*.6 && offset<=below.w*.42)land();
        else miss();}
    }else if(b.y>GROUND+100||b.x<-b.w||b.x>W+b.w)miss();}
  function imageBg(){if(backdrop.complete&&backdrop.naturalWidth){ctx.drawImage(backdrop,0,0,W,H);return;}
    const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#271a49');
    g.addColorStop(1,'#dc8c74');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);}
  function cake(b){const height=b.h*2.1, x=b.x,y=b.y+camera;
    ctx.save();ctx.translate(x,y);
    ctx.rotate(b.angle);
    ctx.shadowColor='#25112a8f';ctx.shadowBlur=10;ctx.shadowOffsetY=5;
    part(ctx,b.key,0,0,b.w*1.03,height);ctx.restore();}
  function startBullyJump(cake){
    const top=cake.y-cake.h/2;
    bullyJump={fromX:bullyX,fromY:bullyY,
      toX:cake.x+Math.min(22,cake.w*.3),
      toY:top-BULLY_HEIGHT/2+10,elapsed:0,duration:.58};
  }
  function updateBully(dt){if(!bullyJump)return;
    const j=bullyJump;j.elapsed=Math.min(j.duration,j.elapsed+dt);
    const t=j.elapsed/j.duration,eased=t*t*(3-2*t);
    bullyX=j.fromX+(j.toX-j.fromX)*eased;
    bullyY=j.fromY+(j.toY-j.fromY)*eased-Math.sin(Math.PI*t)*68;
    if(t>=1){bullyX=j.toX;bullyY=j.toY;bullyJump=null;}
  }
  function tray(){part(ctx,'tray',W/2,GROUND+camera+17,268,89);}
  function drawBully(){
    part(ctx,'bully',bullyX,bullyY+camera,BULLY_WIDTH,BULLY_HEIGHT);
  }
  function dog(dt){const base=(placed<5?104:placed<10?104*1.2:placed<15?104*1.2*1.2:104*1.2*1.2*1.3)*1.5;
    // The third, sixth, ninth... released cake triggers each speed increase.
    const multiplier=mode==='endless'?Math.pow(1.2,Math.floor(drops/3)):1;
    const span=W-92-68;
    const travel=(direction>0?runner-68:2*span-(runner-68))+base*multiplier*dt;
    const folded=((travel%(2*span))+(2*span))%(2*span);
    runner=68+(folded<=span?folded:2*span-folded);
    direction=folded<span?1:-1;
    const bob=Math.sin(clock*10)*3;
    part(ctx,'black',runner,111+bob,136,119,direction<0);
    ctx.fillStyle='#fff1cf';ctx.shadowColor='#1f1637';ctx.shadowBlur=4;
    ctx.font='bold 12px system-ui';ctx.textAlign='center';ctx.fillText('波皮',runner,53+bob);ctx.shadowBlur=0;}
  function draw(dt){ctx.clearRect(0,0,W,H);imageBg();
    ctx.fillStyle='#1a153634';ctx.fillRect(0,0,W,H);
    tray();
    // Rotate the entire stacked tower about the tray: even a small lean is visible near its top.
    ctx.save();ctx.translate(W/2+wobble*90,GROUND+camera);ctx.rotate(wobble);ctx.translate(-W/2,-GROUND-camera);
    for(const b of cakes)cake(b);
    if(placed)drawBully();ctx.restore();
    if(!placed)drawBully();
    for(const b of missed)cake(b);
    if(falling&&falling.vy>0)cake(falling);
    dog(dt);for(const p of confetti){ctx.fillStyle='#ffda70';ctx.beginPath();ctx.arc(p.x,p.y,2.7,0,7);ctx.fill();}}
  function finish(win){if(scene!=='play')return;show('result');syncMusicSpeed();
    const cv=$('result-dogs');cv.width=240;cv.height=120;const c=cv.getContext('2d');
    c.scale(240/310,120/155);
    if(win){part(c,'jump',87,78,142,145);part(c,'bully',224,82,118,140);}
    else{part(c,'eating',155,78,156,151);}
    $('result-title').textContent=mode==='endless'?'無限中秋挑戰！':win?'月餅塔完成！':'月餅掉光啦！';
    $('result-line').textContent=mode==='endless'?'嚕卡DUA與波皮下次再疊更高！':win?'你成功疊了 20 個月餅':'嚕卡DUA表示：掉下來也不能浪費。';
    $('result-score').textContent=placed;$('result-best').textContent=mode==='endless'?endlessBest:best;
    $('result-rank').textContent=placed>=20?'🌕 月餅之神':placed>=15?'月餅塔大師':placed>=10?'月餅高手':placed>=5?'穩穩疊':'月餅新手';
    $('result-joke').textContent=mode==='endless'?'五條命用完，再挑戰最高紀錄！':win?'看看狗狗準備的中秋祝福':'再試一次，或者先看中秋祝福';
    $('endless').classList.toggle('hidden',!win||mode==='endless');
    const btn=$('open-card'),label=btn.querySelector('.button-label');
    if(label)label.textContent='觀看祝賀 🎁';else btn.textContent='觀看祝賀 🎁';
    paintButtons();}
  function returnHome(){
    session++;ending=true;clearTimeout(guideTimer);clearTimeout(goalTimer);
    $('tutorial').classList.add('hidden');$('goal-tip').classList.add('hidden');
    ui();show('home');syncMusicSpeed();paintHome();
  }
  function frame(now){const dt=Math.min((now-last)/1000||0,.032);last=now;
    if(scene==='play'){clock+=dt;
      const steadySway=Math.sin(clock*2.7)*swayAmplitude;
      wobbleSpeed-=(wobble-steadySway)*22*dt;
      wobbleSpeed*=Math.exp(-2.8*dt);wobble+=wobbleSpeed*dt;
      wobble=Math.max(-.052,Math.min(.052,wobble));
      const desired=Math.max(0,(placed-6)*33);camera+=(desired-camera)*Math.min(1,dt*3);
      if(!ending){const n=Math.max(1,Math.ceil(dt/.012));for(let i=0;i<n;i++)physics(dt/n);}
      updateBully(dt);
      for(const p of confetti){p.x+=p.vx*dt;p.y+=p.vy*dt;}draw(dt);}
    requestAnimationFrame(frame);}
  requestAnimationFrame(frame);
  $('enter').onclick=()=>{music();show('home');paintHome();};
  $('start').onclick=()=>start('normal');$('drop').onclick=drop;
  $('home-endless').onclick=()=>{if(endlessUnlocked)start('endless');};
  for(const id of ['home-game','home-result','home-greeting'])$(id).onclick=returnHome;
  $('retry').onclick=()=>start(mode);$('again').onclick=()=>start('normal');
  $('endless').onclick=()=>start('endless');
  $('end-challenge').onclick=()=>{if(scene==='play'&&mode==='endless'){ending=true;finish(false);}};
  $('open-card').onclick=()=>show('greeting');$('sound').onclick=toggleSound;
  $('game-sound').onclick=toggleSound;
  ui();paintButtons();
  // Try automatic playback. Browsers that require a gesture show the entry button.
  setTimeout(async()=>{const playing=await music();if(scene!=='loading')return;
    show(playing||!sound?'home':'entry');paintButtons();paintHome();},900);
})();
