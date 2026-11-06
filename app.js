(()=>{'use strict';
let db={matches:[],active:null},user=null,ready=false,remote=null,matchListeners=new Map(),busy=false;
const app=firebase.initializeApp(window.COURTSIDE_FIREBASE_CONFIG);const auth=firebase.auth(),rtdb=firebase.database();const root=rtdb.ref('matchStatsV13');const operatorUid=window.COURTSIDE_ALLOWED_OPERATOR_UID;
const showSync=(msg,ok)=>{const el=document.getElementById('syncStatus');el.textContent=msg;el.className=ok===true?'ok':ok===false?'fail':''};
async function mutateMatch(id,fn){if(!ready||!user)return;try{const ref=root.child('matches/'+id);const result=await ref.transaction(cur=>{if(!cur)return;const copy=JSON.parse(JSON.stringify(cur));const changed=fn(copy);if(changed===false)return;copy.updatedAt=Date.now();return copy},undefined,false);if(result.committed)showSync('● Tersinkron',true);else toast('Data belum berubah. Coba lagi.')}catch(e){showSync('● Gagal sinkron',false);toast('Gagal menyimpan: '+e.message)}}
async function mutateCurrent(fn){const m=match();if(m)await mutateMatch(m.id,fn)}

let clockOffset=0,latestClock=null,clockBusy=false,clockResetWarning=false;
rtdb.ref('.info/serverTimeOffset').on('value',s=>{clockOffset=Number(s.val())||0});
let side='both',selected={home:null,away:null},subMode={home:false,away:false},subOut={home:null,away:null},clockState=null;
const $=id=>document.getElementById(id),save=()=>render(),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),toast=t=>{const e=$('toast');e.textContent=t;e.classList.add('show');setTimeout(()=>e.classList.remove('show'),2200)},page=p=>{document.querySelectorAll('.page').forEach(e=>e.classList.toggle('active',e.id===p));document.querySelectorAll('nav button').forEach(e=>e.classList.toggle('active',e.dataset.page===p));render();window.scrollTo(0,0)};
document.querySelectorAll('[data-page]').forEach(e=>e.onclick=()=>page(e.dataset.page));document.querySelectorAll('[data-go]').forEach(e=>e.onclick=()=>page(e.dataset.go));
const parseNames=s=>[...new Set(s.split(/[\n,]/).map(v=>v.trim()).filter(Boolean))];const statKeys=['p2m','p2a','p3m','p3a','ftm','fta','oreb','dreb','ast','stl','blk','to','pf'];const fresh=n=>({id:crypto.randomUUID(),name:n,playing:false,seconds:0,stats:Object.fromEntries(statKeys.map(k=>[k,0]))});
function match(){return db.matches.find(m=>m.id===db.active)}function points(p){return 2*p.stats.p2m+3*p.stats.p3m+p.stats.ftm}function sum(m,s){return m[s].reduce((a,p)=>a+points(p),0)}function fmt(t){return `${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,'0')}`}
async function create(){if(!ready)return toast('Login terlebih dahulu');const home=parseNames($('homeRoster').value),away=parseNames($('awayRoster').value);$('createError').textContent='';if(!home.length||!away.length){$('createError').textContent='Masukkan setidaknya satu pemain untuk masing-masing tim.';return}if(home.length>40||away.length>40){$('createError').textContent='Maksimal 40 pemain per tim.';return}const m={id:crypto.randomUUID(),created:Date.now(),type:$('matchType').value,title:$('matchTitle').value.trim(),homeName:$('homeName').value.trim()||'HOME',awayName:$('awayName').value.trim()||'AWAY',home:home.map((n,i)=>({...fresh(n),playing:i<5})),away:away.map((n,i)=>({...fresh(n),playing:i<5})),status:'active',events:[],coverage:'partial',clockCheckpoint:null};try{await root.child('matches/'+m.id).set(m);await root.child('active').set(m.id);db.active=m.id;side='both';page('live');toast('Pertandingan dibuat dan tersinkron')}catch(e){toast('Gagal membuat match: '+e.message)}}
$('createMatch').onclick=create;document.querySelectorAll('[data-team]').forEach(e=>e.onclick=()=>{side=e.dataset.team;$('operatorModeText').textContent=side.toUpperCase();renderLive()});
async function statAction(team,key,hit){const m=match(),id=selected[team],p=m?.[team].find(x=>x.id===id);if(!p)return toast('Pilih pemain aktif dahulu');if(!p.playing)return toast('Pemain sedang cadangan');await mutateCurrent(cur=>{if(cur.status!=='active')return false;const q=cur[team]?.find(x=>x.id===id);if(!q?.playing)return false;if(key==='p2'){q.stats.p2a++;if(hit)q.stats.p2m++}else if(key==='p3'){q.stats.p3a++;if(hit)q.stats.p3m++}else if(key==='ft'){q.stats.fta++;if(hit)q.stats.ftm++}else q.stats[key]++;cur.events=cur.events||[];cur.events.push({id:crypto.randomUUID(),at:Date.now(),team,playerId:id,key,hit,operator:user.uid});return true})}
async function undo(team){const m=match();if(!m)return;await mutateCurrent(cur=>{if(cur.status!=='active')return false;const i=(cur.events||[]).map(e=>e.team).lastIndexOf(team);if(i<0)return false;const e=cur.events[i],p=cur[team]?.find(x=>x.id===e.playerId);if(!p)return false;cur.events.splice(i,1);if(['p2','p3','ft'].includes(e.key)){p.stats[e.key+'a']=Math.max(0,p.stats[e.key+'a']-1);if(e.hit)p.stats[e.key+'m']=Math.max(0,p.stats[e.key+'m']-1)}else p.stats[e.key]=Math.max(0,p.stats[e.key]-1);return true})}
function toggleSub(team){const m=match();if(!m||m.status!=='active')return;subMode[team]=!subMode[team];subOut[team]=null;renderLive()}
function pickPlayer(team,id){const m=match(),p=m?.[team].find(x=>x.id===id);if(!p)return;if(!subMode[team]){selected[team]=id;return renderLive()}
if(!subOut[team]){if(!p.playing)return toast('Pilih pemain ON COURT yang akan keluar');subOut[team]=id;return renderLive()}
if(p.id===subOut[team]){subOut[team]=null;return renderLive()}
if(p.playing){subOut[team]=p.id;return renderLive()}
const outId=subOut[team],inId=p.id;const outgoing=m[team].find(x=>x.id===outId);if(!outgoing?.playing)return toast('Pemain keluar tidak valid');selected[team]=inId;subOut[team]=null;subMode[team]=false;(async()=>{await settleMinutes();await mutateCurrent(cur=>{if(cur.status!=='active')return false;const a=cur[team].find(x=>x.id===outId),b=cur[team].find(x=>x.id===inId);if(!a?.playing||!b||b.playing)return false;a.playing=false;b.playing=true;return true});toast(outgoing.name+' ↔ '+p.name)})()}
function panel(m,team){const arr=m[team],isHome=team==='home',name=m[team+'Name'],on=arr.filter(p=>p.playing),off=arr.filter(p=>!p.playing),disabled=m.status!=='active';const playerButton=p=>`<button class="player-btn ${p.playing?'active':''} ${selected[team]===p.id&&!subMode[team]?'selected':''} ${subOut[team]===p.id?'sub-out':''} ${subMode[team]&&!p.playing?'sub-target':''}" data-pick="${team}|${p.id}" title="${esc(p.name)}">${esc(p.name)}</button>`;const buttons=[['2PT ✓','p2',1,'good'],['2PT ✕','p2',0,'bad'],['3PT ✓','p3',1,'good'],['3PT ✕','p3',0,'bad'],['FT ✓','ft',1,'good'],['FT ✕','ft',0,'bad'],['OREB','oreb',1,''],['DREB','dreb',1,''],['AST','ast',1,''],['STL','stl',1,''],['BLK','blk',1,''],['TO','to',1,'bad'],['PF','pf',1,'bad']];return `<article class="team-panel"><h3 class="${isHome?'blue':'red'}">${isHome?'● HOME':'● AWAY'} — ${esc(name)}</h3><div class="sub-title">ON COURT · ${on.length} PEMAIN</div><div class="sub-toolbar"><button class="secondary sub-toggle ${subMode[team]?'sub-on':''}" ${disabled?'disabled':''} data-sub-toggle="${team}">${subMode[team]?'✕ BATAL SUB':'⇄ QUICK SUB'}</button><small>${subMode[team]?(subOut[team]?'Sekarang tap pemain BENCH untuk masuk':'Tap pemain ON COURT yang akan keluar'):'Aktifkan Quick Sub untuk pergantian 2 tap'}</small></div><div class="roster-grid">${on.map(playerButton).join('')}</div><div class="sub-title">BENCH · ${off.length} PEMAIN</div><div class="roster-grid">${off.map(playerButton).join('')||'<small class="muted">Tidak ada cadangan</small>'}</div><div class="sub-title">STAT INPUT · ${esc(arr.find(p=>p.id===selected[team])?.name||'Pilih pemain')}</div><div class="stat-actions">${buttons.map(([label,key,hit,cls])=>`<button ${disabled?'disabled':''} class="${cls}" data-stat="${team}|${key}|${hit}">${label}</button>`).join('')}<button ${disabled?'disabled':''} data-undo="${team}">↶ UNDO</button></div></article>`}
function table(m,team){const rows=[...m[team]].sort((a,b)=>points(b)-points(a)||a.name.localeCompare(b.name,'id')).map(p=>{const s=p.stats;return `<tr><td>${esc(p.name)}</td><td>${points(p)}</td><td>${s.p2m}/${s.p2a}</td><td>${s.p3m}/${s.p3a}</td><td>${s.ftm}/${s.fta}</td><td>${s.oreb+s.dreb}</td><td>${s.ast}</td><td>${s.stl}</td><td>${s.blk}</td><td>${s.to}</td><td>${s.pf}</td><td>${fmt(p.seconds||0)}</td></tr>`}).join('');return `<h3>${esc(m[team+'Name'])}</h3><div class="table-wrap"><table><thead><tr><th>Player</th><th>PTS</th><th>2PT</th><th>3PT</th><th>FT</th><th>REB</th><th>AST</th><th>STL</th><th>BLK</th><th>TO</th><th>PF</th><th>MIN*</th></tr></thead><tbody>${rows}</tbody></table></div>`}
function renderLive(){const m=match();$('liveTitle').textContent=m?m.homeName+' vs '+m.awayName:'Belum ada pertandingan';$('liveMeta').textContent=m?`${m.type} · ${new Date(m.created).toLocaleString('id-ID')} · ${m.status==='active'?'Berlangsung':'Selesai'}`:'Buat pertandingan untuk mulai mencatat.';$('finishMatch').disabled=!m||m.status!=='active';$('homeLabel').textContent=m?.homeName||'HOME';$('awayLabel').textContent=m?.awayName||'AWAY';$('homePoints').textContent=m?sum(m,'home'):0;$('awayPoints').textContent=m?sum(m,'away'):0;document.querySelectorAll('[data-team]').forEach(b=>b.classList.toggle('selected',b.dataset.team===side));$('livePanels').className='panels '+(side==='both'?'':'one');$('livePanels').innerHTML=m?(side==='both'?panel(m,'home')+panel(m,'away'):panel(m,side)):'<div class="card">Belum ada pertandingan. Buka menu New Match.</div>';$('boxScore').innerHTML=m?table(m,'home')+table(m,'away'):'Belum ada data';document.querySelectorAll('[data-pick]').forEach(b=>b.onclick=()=>{const [t,id]=b.dataset.pick.split('|');pickPlayer(t,id)});document.querySelectorAll('[data-stat]').forEach(b=>b.onclick=()=>{const [t,k,v]=b.dataset.stat.split('|');statAction(t,k,Number(v))});document.querySelectorAll('[data-sub-toggle]').forEach(b=>b.onclick=()=>toggleSub(b.dataset.subToggle));document.querySelectorAll('[data-undo]').forEach(b=>b.onclick=()=>undo(b.dataset.undo))}
$('finishMatch').onclick=async()=>{const m=match();if(!m||!confirm('Selesaikan pertandingan ini? Data tetap ada di History.'))return;await settleMinutes();await mutateCurrent(cur=>{if(cur.status!=='active')return false;cur.status='finished';return true});try{await root.child('active').transaction(v=>v===m.id?null:undefined)}catch{}page('history')};
function render(){const m=match();$('countMatches').textContent=db.matches.length;$('currentName').textContent=m?`${m.homeName} vs ${m.awayName}`:'Belum ada';renderLive();$('historyList').innerHTML=db.matches.length?db.matches.map(m=>`<div class="history-item"><div><small>${esc(m.type)} · ${new Date(m.created).toLocaleString('id-ID')} · ${m.status==='active'?'AKTIF':'SELESAI'}</small><h3>${esc(m.homeName)} <span class="blue">${sum(m,'home')}</span> : <span class="red">${sum(m,'away')}</span> ${esc(m.awayName)}</h3><small>${esc(m.title||'Tanpa judul')} · Statistik ${m.coverage==='partial'?'parsial':'tersedia'}</small></div><div class="history-actions"><button class="secondary" data-open="${m.id}">Buka</button><button class="secondary delete-match" data-delete="${m.id}">Hapus</button></div></div>`).join(''):'<div class="card muted">Belum ada riwayat pertandingan.</div>';document.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>{db.active=b.dataset.open;render();page('live')});document.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>deleteMatch(b.dataset.delete))}
$('exportCSV').onclick=()=>{const m=match();if(!m)return toast('Belum ada pertandingan');const rows=[['Team','Player','PTS','2PM','2PA','3PM','3PA','FTM','FTA','OREB','DREB','AST','STL','BLK','TO','PF','MIN_SECONDS']];for(const t of ['home','away'])for(const p of m[t]){const s=p.stats;rows.push([m[t+'Name'],p.name,points(p),...statKeys.map(k=>s[k]),p.seconds])}const csv='\ufeff'+rows.map(r=>r.map(x=>'"'+String(x).replaceAll('"','""')+'"').join(',')).join('\r\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.download='match-stats-'+m.id.slice(0,8)+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};
// Game Clock is strictly read-only: no score, period or clock writes to /matches/main/state.
// One atomic RTDB transaction on the stats match checkpoint ensures multiple operator devices
// cannot double-count elapsed game seconds. Seconds are assigned to the on-court lineup.
function clockPosition(d){if(!d||!Number.isFinite(Number(d.gameSec)))return null;
 const now=Date.now()+clockOffset, synced=Number(d.syncedAt)||now;
 const elapsed=d.gameRunning?Math.max(0,(now-synced)/1000):0;
 return {period:Number(d.period)||1,sec:Math.max(0,Number(d.gameSec)-elapsed),running:!!d.gameRunning};}
function displayClock(){const c=clockPosition(latestClock);if(!c){$('clockText').textContent='--:--';$('quarterText').textContent='Q–';$('clockStatus').textContent='Menunggu Game Clock';return}
 $('clockText').textContent=fmt(Math.ceil(c.sec));$('quarterText').textContent='Q'+c.period;
 $('clockStatus').textContent=clockResetWarning?'⚠ Clock di-reset: buat pertandingan statistik baru':c.running?'● RUNNING · LIVE':'● PAUSED · LIVE';}
async function settleMinutes(){const m=match(),pos=clockPosition(latestClock);if(!m||m.status!=='active'||!pos||clockBusy)return;
 clockBusy=true;
 try{await mutateMatch(m.id,cur=>{if(cur.status!=='active')return false;
 const old=cur.clockCheckpoint;
 // First sample is a baseline, not time played before tracking began.
 if(!old){cur.clockCheckpoint=pos;return true}
 if(old.resetDetected){clockResetWarning=true;return false}
 if(pos.period<old.period || (pos.period===old.period && pos.sec>old.sec+3)){
   cur.clockCheckpoint={...old,resetDetected:true};clockResetWarning=true;return true;
 }
 if(pos.period!==old.period){cur.clockCheckpoint=pos;return true}
 const delta=Math.max(0,old.sec-pos.sec);
 // The game clock itself is the source of truth; no elapsed wall-clock timer is accumulated.
 if(delta<0.08)return false;
 for(const t of ['home','away'])for(const player of cur[t]||[])if(player.playing)player.seconds=Math.max(0,Number(player.seconds)||0)+delta;
 cur.clockCheckpoint=pos;return true;
 });}finally{clockBusy=false}}
let clockTimer=null,clockRef=null;
function connectClock(){if(clockTimer)clearInterval(clockTimer);if(clockRef)clockRef.off();
 const id=window.COURTSIDE_SCOREBOARD_MATCH||'main';clockRef=rtdb.ref('matches/'+id+'/state');
 clockRef.on('value',snap=>{latestClock=snap.val();displayClock();settleMinutes()},e=>{$('clockStatus').textContent='Clock tidak terhubung: '+e.message});
 clockTimer=setInterval(()=>{displayClock();settleMinutes()},1200);}
$('connectClock').onclick=connectClock;
async function deleteMatch(id){const m=db.matches.find(x=>x.id===id);if(!m)return;
 if(m.status==='active')return toast('Selesaikan pertandingan LIVE sebelum menghapus.');
 if(!confirm('Hapus permanen '+m.homeName+' vs '+m.awayName+'?\nSemua statistik pertandingan ini akan dihapus dari Firebase. Game Clock tidak terpengaruh.'))return;
 try{await root.child('matches/'+id).remove();if(db.active===id)db.active=null;schedulePublicProjection();toast('Riwayat pertandingan dihapus');}catch(e){toast('Gagal menghapus: '+e.message)}}

// Public projection: NEVER copy the full match or private stat fields.
// The public RTDB path contains only the active lineup and PTS/REB/AST.
const publicRef=rtdb.ref('publicMatchStats/activeMatch');
let publicationTimer=null;
function schedulePublicProjection(){
  if(!ready||!user)return;
  clearTimeout(publicationTimer);
  publicationTimer=setTimeout(publishPublicProjection,350);
}
async function publishPublicProjection(){
  if(!ready||!user)return;
  const activeId=await root.child('active').once('value').then(s=>s.val()).catch(()=>null);
  const current=db.matches.find(m=>m.id===activeId&&m.status==='active');
  if(!current){
    // Clear only if this publication still belongs to a match no longer active.
    await publicRef.transaction(v=>v&&(!activeId||v.matchId!==activeId)?null:undefined,undefined,false).catch(()=>{});
    return;
  }
  const makeSide=t=>(current[t]||[]).filter(p=>p.playing).slice(0,5).map(p=>({
    name:String(p.name||'').slice(0,64),
    pts:2*(Number(p.stats?.p2m)||0)+3*(Number(p.stats?.p3m)||0)+(Number(p.stats?.ftm)||0),
    reb:(Number(p.stats?.oreb)||0)+(Number(p.stats?.dreb)||0),
    ast:Number(p.stats?.ast)||0
  }));
  const payload={matchId:current.id,homeName:String(current.homeName||'HOME').slice(0,64),awayName:String(current.awayName||'AWAY').slice(0,64),home:makeSide('home'),away:makeSide('away'),updatedAt:firebase.database.ServerValue.TIMESTAMP};
  await publicRef.transaction(v=>{
    // A delayed update from an older match must not replace the current match.
    if(v&&v.matchId!==current.id&&Number(v.updatedAt||0)>Number(current.created||0))return;
    return payload;
  },undefined,false).catch(e=>console.warn('Public projection:',e.message));
}

function listen(){root.child('matches').off();root.child('active').off();root.child('matches').on('value',snap=>{const val=snap.val()||{};db.matches=Object.values(val).sort((a,b)=>(b.created||0)-(a.created||0));render();schedulePublicProjection();showSync('● Tersinkron',true)},e=>{showSync('● Izin database ditolak',false);toast(e.message)});root.child('active').on('value',snap=>{const active=snap.val();if(active){db.active=active;render();schedulePublicProjection()}else if(!db.matches.some(m=>m.id===db.active&&m.status==='active')){db.active=null;render();schedulePublicProjection()}},e=>showSync('● Gagal membaca match',false))}
$('loginBtn').onclick=async()=>{const email=$('loginEmail').value.trim(),password=$('loginPassword').value;$('loginError').textContent='';try{const cred=await auth.signInWithEmailAndPassword(email,password);if(cred.user.uid!==operatorUid){await auth.signOut();throw Error('Akun ini tidak memiliki izin operator.')} }catch(e){$('loginError').textContent=e.message}};
$('logoutBtn').onclick=()=>auth.signOut();
auth.onAuthStateChanged(async u=>{if(u&&u.uid===operatorUid){user=u;ready=true;$('authGate').hidden=true;$('sessionBar').hidden=false;$('sessionText').textContent='Operator · '+(u.email||'');listen();connectClock()}else{user=null;ready=false;$('authGate').hidden=false;$('sessionBar').hidden=true;root.off();root.child('matches').off();root.child('active').off();if(clockTimer)clearInterval(clockTimer);if(clockRef)clockRef.off();latestClock=null;db={matches:[],active:null};render();if(u)await auth.signOut()}});
render();if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
})();
