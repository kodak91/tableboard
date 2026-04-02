import { useState, useEffect, useRef, useCallback } from "react";

// ═══════════════════════════════════════════
// Y's Table — Multi-Game Platform
// ═══════════════════════════════════════════

const POLL = 1200;
const sleep = ms => new Promise(r => setTimeout(r, ms));

const PC  = ['#f59e0b','#34d399','#818cf8','#f87171','#fb923c','#a78bfa','#38bdf8','#4ade80'];
const PBG = ['rgba(245,158,11,.13)','rgba(52,211,153,.13)','rgba(129,140,248,.13)','rgba(248,113,113,.13)','rgba(251,146,60,.13)','rgba(167,139,250,.13)','rgba(56,189,248,.13)','rgba(74,222,128,.13)'];
const PBD = ['rgba(245,158,11,.4)','rgba(52,211,153,.4)','rgba(129,140,248,.4)','rgba(248,113,113,.4)','rgba(251,146,60,.4)','rgba(167,139,250,.4)','rgba(56,189,248,.4)','rgba(74,222,128,.4)'];

const GAME_LIST = [
  { id:'yacht',    emoji:'🎲', name:'Yacht Dice',       desc:'주사위로 점수를 겨루는 클래식 야추', min:1, max:4 },
  { id:'liar',     emoji:'🃏', name:'Liar Game',         desc:'숨겨진 라이어를 찾아라! 파티 추리 게임', min:3, max:8 },
  { id:'buckshot', emoji:'🔫', name:'Buckshot Roulette', desc:'딜러와의 전략형 러시안 룰렛. AI와 1대1', min:1, max:1 },
];

function makePid()   { return 'p'+Date.now().toString(36)+Math.random().toString(36).slice(2,5); }
function makeRoom()  { return Math.random().toString(36).slice(2,8).toUpperCase(); }
function randItem(a) { return a[Math.floor(Math.random()*a.length)]; }
function shuffle(a)  { return [...a].sort(()=>Math.random()-.5); }

// ── Storage helpers ───────────────────────────────────────────────────────────
async function stGet(key) {
  try { const r=await window.storage.get(key,true); return r?JSON.parse(r.value):null; } catch { return null; }
}
async function stSet(key, val) {
  try { await window.storage.set(key,JSON.stringify(val),true); return true; } catch { return false; }
}
async function stDel(key) { try { await window.storage.delete(key,true); } catch {} }
async function stGetRetry(key, n=4) {
  for (let i=0;i<n;i++) { const v=await stGet(key); if(v) return v; if(i<n-1) await sleep(600); }
  return null;
}

// ── Shared Lobby ──────────────────────────────────────────────────────────────
function RoomLobby({ roomId, game, myPid, gameMinPlayers, onStart, onLeave }) {
  const [copied, setCopied] = useState(false);
  const isHost = game?.host===myPid;
  const canStart = isHost && (game?.players?.length||0) >= gameMinPlayers;
  const copyCode = () => { navigator.clipboard.writeText(roomId).then(()=>{ setCopied(true); setTimeout(()=>setCopied(false),2000); }); };
  if (!game) return <div style={{textAlign:'center',color:'#5a6a4a',padding:20}}>연결 중...</div>;
  return (
    <div>
      <p style={{fontSize:'.78rem',color:'#4a5a3a',marginBottom:7}}>친구에게 코드를 공유하세요:</p>
      <div style={{background:'rgba(0,0,0,.35)',border:'1px solid rgba(201,168,76,.2)',borderRadius:9,padding:'10px 12px',display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
        <span style={{fontFamily:"'Cinzel',serif",fontSize:'1.55rem',fontWeight:900,color:'#f0c040',letterSpacing:'.2em',flex:1}}>{roomId}</span>
        <button onClick={copyCode} style={{padding:'5px 10px',borderRadius:6,background:copied?'rgba(74,222,128,.1)':'rgba(201,168,76,.15)',border:`1px solid ${copied?'#4ade80':'rgba(201,168,76,.25)'}`,color:copied?'#4ade80':'#c9a84c',fontFamily:"'Cinzel',serif",fontSize:'.68rem',cursor:'pointer'}}>
          {copied?'✓ 복사':'복사'}
        </button>
      </div>
      <div style={{fontFamily:"'Cinzel',serif",fontSize:'.62rem',letterSpacing:'.16em',textTransform:'uppercase',color:'#4a5a3a',marginBottom:7}}>
        참가자 ({game.players.length}/{GAME_LIST.find(g=>g.id===game.gameId)?.max||4})
      </div>
      {game.players.map((p,i)=>(
        <div key={p.id} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 12px',borderRadius:7,background:PBG[i],marginBottom:4,fontWeight:600}}>
          <span style={{width:7,height:7,borderRadius:'50%',background:PC[i],display:'inline-block',flexShrink:0}}/>
          <span style={{color:PC[i]}}>{p.name}</span>
          {p.id===game.host&&<span style={{marginLeft:'auto',fontSize:'.58rem',padding:'2px 6px',borderRadius:9,fontFamily:"'Cinzel',serif",background:PBG[i],color:PC[i],border:`1px solid ${PC[i]}40`}}>방장</span>}
          {p.id===myPid&&p.id!==game.host&&<span style={{marginLeft:'auto',fontSize:'.58rem',color:'#5a6a4a'}}>나</span>}
        </div>
      ))}
      <div style={{marginTop:14,display:'flex',flexDirection:'column',gap:8,alignItems:'center'}}>
        {isHost ? (
          <div style={{width:'100%',textAlign:'center'}}>
            <button onClick={onStart} disabled={!canStart}
              style={{padding:'11px 0',width:'100%',background:canStart?'linear-gradient(135deg,#9a7000,#f0c040,#9a7000)':'rgba(100,100,80,.3)',border:'none',borderRadius:9,fontFamily:"'Cinzel',serif",fontWeight:700,fontSize:'.82rem',color:canStart?'#0c0900':'#5a6a4a',cursor:canStart?'pointer':'not-allowed'}}>
              게임 시작 ({game.players.length}명)
            </button>
            {!canStart&&<div style={{fontSize:'.72rem',color:'#5a4a3a',marginTop:5}}>최소 {gameMinPlayers}명 필요</div>}
          </div>
        ) : (
          <p style={{textAlign:'center',color:'#3a5030',fontSize:'.83rem'}}>
            <span style={{display:'inline-block',width:6,height:6,borderRadius:'50%',background:'#4ade80',marginRight:5,animation:'pulse 2s infinite'}}/>
            방장이 시작하기를 기다리는 중...
          </p>
        )}
        <button onClick={onLeave} style={{padding:'6px 12px',background:'rgba(180,40,40,.2)',border:'1px solid rgba(240,80,80,.2)',color:'#f87171',borderRadius:7,fontFamily:"'Cinzel',serif",fontSize:'.7rem',cursor:'pointer'}}>나가기</button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// YACHT DICE
// ══════════════════════════════════════════════════════
const Y_CATS = [
  {id:'ones',sec:'upper'},{id:'twos',sec:'upper'},{id:'threes',sec:'upper'},
  {id:'fours',sec:'upper'},{id:'fives',sec:'upper'},{id:'sixes',sec:'upper'},
  {id:'threeOfAKind',sec:'lower',hint:'합계'},{id:'fourOfAKind',sec:'lower',hint:'합계'},
  {id:'fullHouse',sec:'lower',hint:'25pt'},{id:'smallStraight',sec:'lower',hint:'30pt'},
  {id:'largeStraight',sec:'lower',hint:'40pt'},{id:'yahtzee',sec:'lower',hint:'50pt'},
  {id:'chance',sec:'lower',hint:'합계'},
];
const Y_LABELS = {ones:'Aces',twos:'Deuces',threes:'Threes',fours:'Fours',fives:'Fives',sixes:'Sixes',threeOfAKind:'3 of a Kind',fourOfAKind:'4 of a Kind',fullHouse:'Full House',smallStraight:'Sm. Straight',largeStraight:'Lg. Straight',yahtzee:'YAHTZEE!',chance:'Chance'};
const Y_UP = ['ones','twos','threes','fours','fives','sixes'];
const Y_LO = ['threeOfAKind','fourOfAKind','fullHouse','smallStraight','largeStraight','yahtzee','chance'];
const PIPS = {1:[[50,50]],2:[[28,28],[72,72]],3:[[28,28],[50,50],[72,72]],4:[[28,28],[72,28],[28,72],[72,72]],5:[[28,28],[72,28],[50,50],[28,72],[72,72]],6:[[28,22],[72,22],[28,50],[72,50],[28,78],[72,78]]};
const DS=54,DH=27;
const FPOS={1:`translateZ(${DH}px)`,2:`rotateX(-90deg) translateZ(${DH}px)`,3:`rotateY(90deg) translateZ(${DH}px)`,4:`rotateY(-90deg) translateZ(${DH}px)`,5:`rotateX(90deg) translateZ(${DH}px)`,6:`rotateY(180deg) translateZ(${DH}px)`};
const SHOW={1:'rotateX(0deg) rotateY(0deg)',2:'rotateX(90deg) rotateY(0deg)',3:'rotateX(0deg) rotateY(-90deg)',4:'rotateX(0deg) rotateY(90deg)',5:'rotateX(-90deg) rotateY(0deg)',6:'rotateX(0deg) rotateY(180deg)'};

function d6() { return Math.floor(Math.random()*6)+1; }
function yNewDice() { return [d6(),d6(),d6(),d6(),d6()]; }
function yNoHeld()  { return [false,false,false,false,false]; }

function yScore(id,dice) {
  const cnt={}; dice.forEach(v=>{cnt[v]=(cnt[v]||0)+1;});
  const cv=Object.values(cnt),sum=dice.reduce((a,b)=>a+b,0),idx=Y_UP.indexOf(id);
  if(idx>=0) return dice.filter(v=>v===idx+1).length*(idx+1);
  if(id==='threeOfAKind')  return cv.some(c=>c>=3)?sum:0;
  if(id==='fourOfAKind')   return cv.some(c=>c>=4)?sum:0;
  if(id==='fullHouse')     { const s=[...cv].sort((a,b)=>a-b); return s.length===2&&s[0]===2&&s[1]===3?25:0; }
  if(id==='smallStraight') { const u=[...new Set(dice)].sort((a,b)=>a-b).join(''); return ['1234','2345','3456'].some(s=>u.includes(s))?30:0; }
  if(id==='largeStraight') { const u=[...new Set(dice)].sort((a,b)=>a-b).join(''); return u==='12345'||u==='23456'?40:0; }
  if(id==='yahtzee') return cv.length===1?50:0;
  if(id==='chance')  return sum;
  return 0;
}
function yTotal(sc) { const up=Y_UP.reduce((s,id)=>s+(sc[id]??0),0); return up+(up>=63?35:0)+Y_LO.reduce((s,id)=>s+(sc[id]??0),0); }
function yGameOver(players) { return players.every(p=>Y_CATS.every(c=>p.scores[c.id]!==undefined)); }

function PipFace({val}) {
  return (
    <svg width={DS-10} height={DS-10} viewBox="0 0 100 100" style={{position:'absolute'}}>
      {(PIPS[val]||PIPS[1]).map(([cx,cy],i)=><circle key={i} cx={cx} cy={cy} r={9} fill="#1a0800" opacity={.88}/>)}
    </svg>
  );
}
function Die3D({val,held,holdable,onToggle,rolling}) {
  const cube={width:DS,height:DS,position:'relative',transformStyle:'preserve-3d',transform:rolling?undefined:(SHOW[val]||SHOW[1]),transition:rolling?'none':'transform .55s cubic-bezier(.34,1.56,.64,1)',animation:rolling?'diceRoll .2s infinite linear':'none'};
  const face=(fv)=>({position:'absolute',width:DS,height:DS,borderRadius:9,background:held?'linear-gradient(145deg,#fff8e0,#f5e8b0)':'linear-gradient(145deg,#faf5e4,#ede0c0)',display:'flex',alignItems:'center',justifyContent:'center',backfaceVisibility:'hidden',WebkitBackfaceVisibility:'hidden',border:'1.5px solid rgba(0,0,0,.06)',transform:FPOS[fv]});
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:0}}>
      <div style={{position:'relative',cursor:holdable?'pointer':'default'}} onClick={holdable?onToggle:undefined}>
        {held&&<div style={{position:'absolute',inset:-4,borderRadius:13,border:'2.5px solid #f59e0b',boxShadow:'0 0 16px rgba(245,158,11,.5)',zIndex:10,pointerEvents:'none'}}/>}
        <div style={{perspective:'220px'}}>
          <div style={cube}>{[1,2,3,4,5,6].map(fv=><div key={fv} style={face(fv)}><PipFace val={fv}/></div>)}</div>
        </div>
      </div>
      <div style={{width:held?22:DS-10,height:7,background:'radial-gradient(ellipse,rgba(0,0,0,.35),transparent 70%)',borderRadius:'50%',marginTop:held?6:3,transition:'all .3s'}}/>
    </div>
  );
}
function EmptySlot() {
  return <div style={{width:DS,height:DS,borderRadius:10,border:'2px dashed rgba(201,168,76,.15)',display:'flex',alignItems:'center',justifyContent:'center'}}><div style={{width:DS-22,height:DS-22,borderRadius:6,background:'rgba(201,168,76,.03)'}}/></div>;
}
function YScoreTable({player,pots,canScore,onScore}) {
  const sc=player.scores,upSum=Y_UP.reduce((s,id)=>s+(sc[id]??0),0),bonus=upSum>=63?35:0;
  function cell(id) {
    if(sc[id]!==undefined) return <span style={{color:'#e0d4b0'}}>{sc[id]}</span>;
    if(pots&&pots[id]!==undefined) return pots[id]>0?<span style={{color:'#5ab83a'}}>+{pots[id]}</span>:<span style={{color:'#5a3525'}}>0</span>;
    return <span style={{color:'#252515'}}>—</span>;
  }
  const rs=(id)=>({cursor:(canScore&&sc[id]===undefined)?'pointer':'default',background:'rgba(0,0,0,.18)'});
  const hv=(id)=>{ if(!canScore||sc[id]!==undefined) return {}; return {onMouseEnter:e=>{e.currentTarget.style.background='rgba(201,168,76,.1)';},onMouseLeave:e=>{e.currentTarget.style.background='rgba(0,0,0,.18)';}}; };
  return (
    <table style={{width:'100%',borderCollapse:'separate',borderSpacing:'0 2px',fontSize:'.81rem'}}><tbody>
      <tr><td colSpan={2} style={{padding:'5px 7px 2px',fontFamily:"'Cinzel',serif",fontSize:'.58rem',letterSpacing:'.16em',color:'#4a5a3a',textTransform:'uppercase'}}>▲ Upper</td></tr>
      {Y_CATS.filter(c=>c.sec==='upper').map(cat=>(
        <tr key={cat.id} style={rs(cat.id)} {...hv(cat.id)} onClick={(canScore&&sc[cat.id]===undefined)?()=>onScore(cat.id):undefined}>
          <td style={{padding:'5px 7px',borderRadius:'5px 0 0 5px',color:'#b8a880',fontWeight:600}}>{Y_LABELS[cat.id]}</td>
          <td style={{padding:'5px 7px',borderRadius:'0 5px 5px 0',textAlign:'right',fontWeight:700,minWidth:36}}>{cell(cat.id)}</td>
        </tr>
      ))}
      <tr><td style={{padding:'3px 7px',fontSize:'.73rem',color:'#5a6a4a'}}>합계</td><td style={{padding:'3px 7px',textAlign:'right',fontSize:'.73rem',color:upSum>=63?'#f59e0b':'#5a6a4a'}}>{upSum}/63</td></tr>
      <tr><td style={{padding:'3px 7px',fontSize:'.73rem',color:bonus?'#f59e0b':'#382818'}}>보너스 +35</td><td style={{padding:'3px 7px',textAlign:'right',fontSize:'.73rem',fontWeight:700,color:bonus?'#f59e0b':upSum>=63?'#5ab83a':'#382818'}}>{bonus?'+35':upSum>=63?'✓':`${63-upSum} 부족`}</td></tr>
      <tr><td colSpan={2} style={{padding:'5px 7px 2px',fontFamily:"'Cinzel',serif",fontSize:'.58rem',letterSpacing:'.16em',color:'#4a5a3a',textTransform:'uppercase'}}>▼ Lower</td></tr>
      {Y_CATS.filter(c=>c.sec==='lower').map(cat=>(
        <tr key={cat.id} style={rs(cat.id)} {...hv(cat.id)} onClick={(canScore&&sc[cat.id]===undefined)?()=>onScore(cat.id):undefined}>
          <td style={{padding:'5px 7px',borderRadius:'5px 0 0 5px',color:cat.id==='yahtzee'&&sc[cat.id]===50?'#f59e0b':'#b8a880',fontWeight:600}}>{Y_LABELS[cat.id]}{cat.hint&&<span style={{fontSize:'.62rem',color:'#3a4a2a',marginLeft:3}}>({cat.hint})</span>}</td>
          <td style={{padding:'5px 7px',borderRadius:'0 5px 5px 0',textAlign:'right',fontWeight:700,minWidth:36}}>{cell(cat.id)}</td>
        </tr>
      ))}
      <tr style={{borderTop:'1px solid rgba(201,168,76,.12)'}}>
        <td style={{padding:'6px 7px',fontFamily:"'Cinzel',serif",fontWeight:700,color:'#c9a84c'}}>총점</td>
        <td style={{padding:'6px 7px',textAlign:'right',fontFamily:"'Cinzel',serif",fontWeight:900,fontSize:'1.05rem',color:'#e8dcc8'}}>{yTotal(sc)}</td>
      </tr>
    </tbody></table>
  );
}
function YPlayerCube({player,colorIdx,isActive,isMine}) {
  const t=yTotal(player.scores),up=Y_UP.reduce((s,id)=>s+(player.scores[id]??0),0),done=Y_CATS.filter(c=>player.scores[c.id]!==undefined).length;
  return (
    <div style={{flex:'1 1 0',minWidth:68,maxWidth:110,padding:'9px 7px',borderRadius:10,background:PBG[colorIdx],border:`1px solid ${isActive?PBD[colorIdx]:'rgba(255,255,255,.05)'}`,boxShadow:isActive?`0 0 12px ${PBG[colorIdx]}`:'none',textAlign:'center',transition:'all .3s'}}>
      <div style={{fontFamily:"'Cinzel',serif",fontWeight:700,fontSize:'.72rem',color:PC[colorIdx],whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{player.name}{isMine?' (나)':''}</div>
      <div style={{fontFamily:"'Cinzel',serif",fontWeight:900,fontSize:'1.15rem',color:PC[colorIdx],lineHeight:1.1,marginTop:2}}>{t}</div>
      <div style={{fontSize:'.6rem',color:'#4a5a3a',marginTop:2}}>{done}/13{up>=63&&<span style={{color:'#f59e0b',marginLeft:4}}>✦</span>}</div>
      <div style={{height:3,borderRadius:2,background:'rgba(255,255,255,.07)',marginTop:4,overflow:'hidden'}}><div style={{height:'100%',width:`${Math.min(up/63*100,100)}%`,background:`linear-gradient(90deg,${PC[colorIdx]}60,${PC[colorIdx]})`,transition:'width .6s',borderRadius:2}}/></div>
      {isActive&&<div style={{fontFamily:"'Cinzel',serif",fontSize:'.56rem',color:PC[colorIdx],marginTop:3}}>▶ 차례</div>}
    </div>
  );
}
function YachtBoard({game,myPid,isSolo,onRoll,onHold,onScore,onReset}) {
  const [rolling,setRolling]=useState(false),[animDice,setAnimDice]=useState([1,1,1,1,1]),[showY,setShowY]=useState(false),[tab,setTab]=useState(0);
  const tickRef=useRef(null);
  const ci=game.currentPlayerIndex,curP=game.players[ci],isMyTurn=isSolo||curP.id===myPid,rolled=game.rollsLeft<3;
  const myP=isSolo?curP:game.players.find(p=>p.id===myPid),others=isSolo?[]:game.players.filter(p=>p.id!==myPid);
  const canHold=isMyTurn&&rolled&&game.rollsLeft>0,pots=(isMyTurn&&rolled)?Object.fromEntries(Y_CATS.map(c=>[c.id,yScore(c.id,game.dice)])):null;
  const heldCount=game.held.filter(Boolean).length;
  const doRoll=()=>{ if(!isMyTurn||game.rollsLeft<=0||rolling) return; setRolling(true); tickRef.current=setInterval(()=>setAnimDice(game.dice.map((v,i)=>game.held[i]?v:d6())),80); setTimeout(()=>{ clearInterval(tickRef.current); setRolling(false); onRoll(); },820); };
  useEffect(()=>()=>clearInterval(tickRef.current),[]);
  const doScore=(id)=>{ if(id==='yahtzee'&&yScore(id,game.dice)===50){setShowY(true);setTimeout(()=>setShowY(false),2400);} onScore(id); };
  return (
    <div style={{maxWidth:620,margin:'0 auto'}}>
      {showY&&<div style={{position:'fixed',inset:0,display:'flex',alignItems:'center',justifyContent:'center',pointerEvents:'none',zIndex:999}}><div style={{fontFamily:"'Cinzel',serif",fontSize:'clamp(3rem,10vw,5.5rem)',fontWeight:900,background:'linear-gradient(135deg,#b8860b,#ffd700,#f0c040)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text',animation:'yflash 2.4s ease forwards',filter:'drop-shadow(0 0 30px rgba(255,200,0,.6))'}}>YAHTZEE!</div></div>}
      <div style={{display:'flex',gap:6,marginBottom:9,overflowX:'auto',paddingBottom:2}}>{game.players.map((p,i)=><YPlayerCube key={p.id} player={p} colorIdx={i} isActive={i===ci} isMine={!isSolo&&p.id===myPid}/>)}</div>
      <div style={{textAlign:'center',padding:'8px 14px',borderRadius:9,marginBottom:9,fontFamily:"'Cinzel',serif",fontSize:'.9rem',fontWeight:700,background:PBG[ci],border:`1px solid ${PBD[ci]}`,color:PC[ci],boxShadow:`0 0 16px ${PBG[ci]}`}}>
        {isMyTurn?(isSolo?`🎲 ${curP.name}의 차례`:'🎲 내 차례!'):`${curP.name}의 차례`}
      </div>
      <div style={{background:'rgba(10,18,10,.65)',border:'1px solid rgba(180,140,40,.12)',borderRadius:12,padding:'12px 10px',marginBottom:9}}>
        <div style={{marginBottom:9}}>
          <div style={{fontFamily:"'Cinzel',serif",fontSize:'.56rem',letterSpacing:'.18em',textTransform:'uppercase',color:heldCount>0?'#c9a84c':'#3a4a2a',textAlign:'center',marginBottom:6,transition:'color .3s'}}>{heldCount>0?`🔒 고정 (${heldCount})`:'— 고정 없음 —'}</div>
          <div style={{display:'flex',gap:7,justifyContent:'center',minHeight:DS+18,alignItems:'center',padding:'7px 4px',borderRadius:8,background:heldCount>0?'rgba(245,158,11,.05)':'rgba(0,0,0,.1)',border:`1px solid ${heldCount>0?'rgba(245,158,11,.14)':'rgba(255,255,255,.03)'}`,transition:'all .3s'}}>
            {game.dice.map((val,i)=>game.held[i]?<Die3D key={i} val={rolling?animDice[i]:val} held={true} holdable={canHold} onToggle={()=>onHold(i)} rolling={false}/>:<EmptySlot key={i}/>)}
          </div>
        </div>
        <div style={{display:'flex',gap:7,justifyContent:'center',minHeight:DS+22,alignItems:'center',padding:'9px 4px',borderRadius:8,background:'rgba(0,0,0,.14)'}}>
          {game.dice.map((val,i)=>game.held[i]?<div key={i} style={{width:DS,height:DS+18}}/>:<Die3D key={i} val={rolling?animDice[i]:val} held={false} holdable={canHold} onToggle={()=>onHold(i)} rolling={rolling}/>)}
        </div>
        <div style={{textAlign:'center',marginTop:12}}>
          <button onClick={doRoll} disabled={!isMyTurn||game.rollsLeft<=0||rolling} style={{padding:'11px 36px',background:'linear-gradient(135deg,#7a5200,#f0c040,#7a5200)',border:'none',borderRadius:50,fontFamily:"'Cinzel',serif",fontWeight:900,fontSize:'.9rem',color:'#0c0900',letterSpacing:'.1em',boxShadow:'0 4px 16px rgba(200,160,0,.25)',cursor:!isMyTurn||game.rollsLeft<=0||rolling?'not-allowed':'pointer',opacity:!isMyTurn||game.rollsLeft<=0?0.38:1}}>
            {rolling?'🎲 굴리는 중...':game.rollsLeft===3?'🎲 주사위 굴리기!':'🎲 다시 굴리기'}
          </button>
          <div style={{marginTop:5,fontSize:'.74rem',color:'#4a5a3a',letterSpacing:'.1em',textTransform:'uppercase'}}>남은 기회 {game.rollsLeft>0?'◆ '.repeat(game.rollsLeft).trim():'—'} ({game.rollsLeft}회)</div>
          <div style={{marginTop:3,fontSize:'.72rem',color:'#405038',minHeight:14}}>
            {isMyTurn&&rolled&&game.rollsLeft>0&&'클릭으로 주사위 고정·해제 → 위 트레이'}
            {isMyTurn&&rolled&&game.rollsLeft===0&&'굴리기 완료 — 아래에서 점수를 선택하세요'}
            {isMyTurn&&!rolled&&'주사위를 굴려 시작하세요'}
            {!isMyTurn&&`${curP.name}의 차례입니다...`}
          </div>
        </div>
      </div>
      {others.length>0&&(
        <div style={{display:'flex',gap:5,marginBottom:8,overflowX:'auto'}}>
          <button onClick={()=>setTab(0)} style={{padding:'4px 11px',borderRadius:6,border:`1px solid ${tab===0?'rgba(201,168,76,.4)':'rgba(180,140,40,.15)'}`,background:tab===0?'rgba(201,168,76,.1)':'transparent',color:tab===0?'#c9a84c':'#6a7a5a',fontFamily:"'Cinzel',serif",fontSize:'.67rem',cursor:'pointer',whiteSpace:'nowrap'}}>내 점수표</button>
          {others.map((p,i)=>{ const oi=game.players.findIndex(pl=>pl.id===p.id); return <button key={p.id} onClick={()=>setTab(i+1)} style={{padding:'4px 11px',borderRadius:6,border:`1px solid ${tab===i+1?PBD[oi]:'rgba(180,140,40,.15)'}`,background:tab===i+1?PBG[oi]:'transparent',color:tab===i+1?PC[oi]:'#6a7a5a',fontFamily:"'Cinzel',serif",fontSize:'.67rem',cursor:'pointer',whiteSpace:'nowrap'}}>{p.name}</button>; })}
        </div>
      )}
      {(tab===0||isSolo)&&myP&&<div style={{background:'rgba(10,18,10,.65)',border:'1px solid rgba(180,140,40,.12)',borderRadius:12,padding:14}}><YScoreTable player={myP} pots={pots} canScore={isMyTurn&&rolled} onScore={doScore}/></div>}
      {!isSolo&&tab>0&&others[tab-1]&&(
        <div style={{background:'rgba(10,18,10,.65)',border:'1px solid rgba(180,140,40,.12)',borderRadius:12,padding:14,opacity:.88}}>
          <div style={{marginBottom:7,fontFamily:"'Cinzel',serif",fontSize:'.68rem',letterSpacing:'.12em',color:PC[game.players.findIndex(pl=>pl.id===others[tab-1].id)]}}>{others[tab-1].name}의 점수표</div>
          <YScoreTable player={others[tab-1]}/>
        </div>
      )}
      <div style={{textAlign:'center',marginTop:11}}><button onClick={onReset} style={{padding:'6px 12px',background:'rgba(180,40,40,.2)',border:'1px solid rgba(240,80,80,.2)',color:'#f87171',borderRadius:7,fontFamily:"'Cinzel',serif",fontSize:'.7rem',cursor:'pointer'}}>게임 초기화</button></div>
    </div>
  );
}
function YachtResults({game,onReset}) {
  const ranked=[...game.players].map(p=>({...p,t:yTotal(p.scores)})).sort((a,b)=>b.t-a.t),wi=game.players.findIndex(p=>p.id===ranked[0].id);
  return (
    <div style={{maxWidth:440,margin:'0 auto',textAlign:'center'}}>
      <div style={{background:'rgba(18,32,16,.75)',border:'1px solid rgba(180,140,40,.18)',borderRadius:14,padding:24}}>
        <div style={{fontSize:'2.6rem',lineHeight:1,marginBottom:5}}>🏆</div>
        <div style={{fontFamily:"'Cinzel',serif",fontSize:'1.75rem',fontWeight:900,color:PC[wi]}}>{ranked[0].name}</div>
        <div style={{fontSize:'.82rem',color:'#5a6a4a',marginBottom:16}}>{ranked[0].t}점</div>
        <div style={{display:'flex',justifyContent:'center',gap:8,marginBottom:18,flexWrap:'wrap'}}>
          {ranked.map((p,i)=>{ const ci=game.players.findIndex(pl=>pl.id===p.id); return <div key={p.id} style={{padding:'12px 14px',borderRadius:11,minWidth:82,background:PBG[ci],border:`1px solid ${PBD[ci]}`}}><div style={{fontSize:'1.35rem'}}>{['🥇','🥈','🥉','4️⃣'][i]}</div><div style={{fontFamily:"'Cinzel',serif",fontSize:'.78rem',fontWeight:700,color:PC[ci],marginTop:2}}>{p.name}</div><div style={{fontSize:'1.1rem',fontWeight:900,color:PC[ci]}}>{p.t}</div></div>; })}
        </div>
        <button onClick={onReset} style={{padding:'10px 24px',background:'linear-gradient(135deg,#9a7000,#f0c040,#9a7000)',border:'none',borderRadius:9,fontFamily:"'Cinzel',serif",fontWeight:700,fontSize:'.82rem',color:'#0c0900',cursor:'pointer'}}>새 게임</button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// LIAR GAME
// ══════════════════════════════════════════════════════
const LIAR_CATS = {
  '🍜 음식':   ['김치찌개','비빔밥','삼겹살','치킨','라면','떡볶이','냉면','불고기','갈비','순두부찌개','해물파전','오므라이스'],
  '🐾 동물':   ['강아지','고양이','호랑이','코끼리','기린','펭귄','고릴라','돌고래','독수리','토끼','여우','늑대'],
  '💼 직업':   ['의사','선생님','요리사','경찰관','소방관','변호사','프로그래머','유튜버','아이돌','운동선수','우주비행사','기자'],
  '🌍 나라':   ['일본','프랑스','브라질','호주','이탈리아','스페인','캐나다','멕시코','이집트','그리스','태국','터키'],
  '⚽ 스포츠': ['축구','농구','야구','테니스','수영','골프','배구','탁구','복싱','스키','서핑','태권도'],
  '🎬 엔터':   ['어벤져스','기생충','오징어게임','도깨비','범죄도시','해리포터','라라랜드','인터스텔라','BTS','블랙핑크','아이유','뉴진스'],
  '🛍️ 브랜드': ['애플','나이키','스타벅스','레고','삼성','현대자동차','구글','카카오','쿠팡','배달의민족','네이버','유튜브'],
  '📍 장소':   ['에펠탑','남산타워','경복궁','한강공원','제주도','홍대','강남역','해운대','롯데월드','인사동','북촌','동대문'],
  '🌿 자연':   ['태풍','무지개','눈사태','번개','안개','폭설','가뭄','홍수','지진','황사','오로라','해일'],
  '🎭 행동':   ['달리기','요리하기','낚시하기','등산하기','게임하기','노래하기','그림그리기','책읽기','쇼핑하기','운동하기','여행가기','사진찍기'],
};
const LIAR_CAT_KEYS=Object.keys(LIAR_CATS);
const DISCUSS_SEC=30,DISCUSS_ROUNDS=2;

function TimerRing({sec,total=DISCUSS_SEC}) {
  const pct=Math.max(0,sec/total),r=26,circ=2*Math.PI*r,color=sec>10?'#4ade80':sec>5?'#f59e0b':'#f87171';
  return (
    <div style={{position:'relative',width:68,height:68,flexShrink:0}}>
      <svg width={68} height={68} style={{transform:'rotate(-90deg)'}}>
        <circle cx={34} cy={34} r={r} fill="none" stroke="rgba(255,255,255,.07)" strokeWidth={5}/>
        <circle cx={34} cy={34} r={r} fill="none" stroke={color} strokeWidth={5} strokeDasharray={circ} strokeDashoffset={circ*(1-pct)} style={{transition:'stroke-dashoffset .9s linear,stroke .3s'}}/>
      </svg>
      <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Cinzel',serif",fontSize:'1.2rem',fontWeight:900,color}}>{sec}</div>
    </div>
  );
}

function LiarGame({roomId,myPid,initialGame,onExit}) {
  const [game,setGame]=useState(initialGame),[timer,setTimer]=useState(DISCUSS_SEC),[myVote,setMyVote]=useState(null),[guess,setGuess]=useState(''),[catChoice,setCatChoice]=useState(null),[voted,setVoted]=useState(false);
  const timerRef=useRef(null);
  const skey=`yst-liar-${roomId}`;
  const sync=useCallback(async()=>{ const v=await stGet(skey); if(v) setGame(v); },[skey]);
  const write=useCallback(async(st)=>{ await stSet(skey,st); setGame(st); },[skey]);
  const read=useCallback(()=>stGet(skey),[skey]);
  useEffect(()=>{ sync(); const t=setInterval(sync,POLL); return ()=>clearInterval(t); },[sync]);
  useEffect(()=>{
    clearInterval(timerRef.current);
    if(game?.phase==='discuss') {
      const elapsed=(Date.now()-game.turnStart)/1000,remaining=Math.max(0,DISCUSS_SEC-elapsed);
      setTimer(Math.round(remaining));
      timerRef.current=setInterval(()=>setTimer(t=>{ if(t<=1){ clearInterval(timerRef.current); if(game.players[game.speakerIdx]?.id===myPid) advanceSpeaker(); return 0; } return t-1; }),1000);
    }
    return ()=>clearInterval(timerRef.current);
  },[game?.phase,game?.turnStart,game?.speakerIdx]);

  const startGame=async()=>{
    if(!catChoice) return;
    const cur=await read(); if(!cur||cur.host!==myPid) return;
    const words=LIAR_CATS[catChoice],keyword=randItem(words),shuffled=shuffle(cur.players),liarId=shuffled[0].id;
    await write({...cur,phase:'reveal',category:catChoice,keyword,liarId,speakerIdx:0,round:1,turnStart:Date.now(),votes:{},accusedId:null,liarGuess:null,liarWin:null});
  };
  const startDiscuss=async()=>{ const cur=await read(); if(!cur||cur.host!==myPid) return; await write({...cur,phase:'discuss',turnStart:Date.now()}); };
  const advanceSpeaker=async()=>{
    const cur=await read(); if(!cur||cur.phase!=='discuss') return;
    const nextIdx=cur.speakerIdx+1;
    if(nextIdx>=cur.players.length) {
      if(cur.round>=DISCUSS_ROUNDS) await write({...cur,phase:'vote',speakerIdx:0,turnStart:0});
      else await write({...cur,round:cur.round+1,speakerIdx:0,turnStart:Date.now()});
    } else await write({...cur,speakerIdx:nextIdx,turnStart:Date.now()});
  };
  const submitVote=async()=>{
    if(!myVote) return; const cur=await read(); if(!cur) return;
    const newVotes={...cur.votes,[myPid]:myVote},allVoted=cur.players.every(p=>newVotes[p.id]);
    if(allVoted) {
      const tally={}; Object.values(newVotes).forEach(v=>{tally[v]=(tally[v]||0)+1;});
      const accused=Object.entries(tally).sort((a,b)=>b[1]-a[1])[0][0];
      if(accused===cur.liarId) await write({...cur,votes:newVotes,accusedId:accused,phase:'guess'});
      else await write({...cur,votes:newVotes,accusedId:accused,liarWin:true,phase:'result'});
    } else await write({...cur,votes:newVotes});
    setVoted(true);
  };
  const submitGuess=async()=>{
    if(!guess.trim()) return; const cur=await read(); if(!cur) return;
    const correct=guess.trim().replace(/\s/g,'').toLowerCase()===cur.keyword.replace(/\s/g,'').toLowerCase();
    await write({...cur,liarGuess:guess.trim(),liarWin:!correct,phase:'result'});
  };
  const resetGame=async()=>{ await stDel(skey); onExit(); };

  if(!game) return <div style={{textAlign:'center',padding:20,color:'#5a6a4a'}}>동기화 중...</div>;
  const myIdx=game.players.findIndex(p=>p.id===myPid),isHost=game.host===myPid,isLiar=game.liarId===myPid;
  const curSpeaker=game.players[game.speakerIdx],isMyTurn=game.phase==='discuss'&&curSpeaker?.id===myPid;

  if(game.phase==='catselect') return (
    <div style={{maxWidth:420,margin:'0 auto'}}>
      <div style={{background:'rgba(18,32,16,.75)',border:'1px solid rgba(180,140,40,.18)',borderRadius:14,padding:20}}>
        <div style={{fontFamily:"'Cinzel',serif",fontSize:'.66rem',letterSpacing:'.18em',textTransform:'uppercase',color:'#5a6a4a',marginBottom:12}}>카테고리 선택</div>
        {isHost ? (<>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:7,marginBottom:14}}>
            {LIAR_CAT_KEYS.map(k=><button key={k} onClick={()=>setCatChoice(k)} style={{padding:'9px 8px',borderRadius:8,border:`1px solid ${catChoice===k?'rgba(201,168,76,.5)':'rgba(180,140,40,.15)'}`,background:catChoice===k?'rgba(201,168,76,.12)':'rgba(0,0,0,.2)',color:catChoice===k?'#f0c040':'#9a8a7a',fontSize:'.82rem',cursor:'pointer',textAlign:'left'}}>{k}</button>)}
          </div>
          <button onClick={startGame} disabled={!catChoice} style={{width:'100%',padding:'11px',background:catChoice?'linear-gradient(135deg,#9a7000,#f0c040,#9a7000)':'rgba(80,70,40,.4)',border:'none',borderRadius:9,fontFamily:"'Cinzel',serif",fontWeight:700,fontSize:'.82rem',color:catChoice?'#0c0900':'#5a5030',cursor:catChoice?'pointer':'not-allowed'}}>게임 시작!</button>
        </>) : <div style={{textAlign:'center',color:'#4a5a3a',fontSize:'.88rem',padding:'20px 0'}}><span style={{display:'inline-block',width:7,height:7,borderRadius:'50%',background:'#4ade80',marginRight:6,animation:'pulse 2s infinite'}}/>방장이 카테고리를 선택 중...</div>}
        <div style={{textAlign:'center',marginTop:12}}><button onClick={resetGame} style={{padding:'5px 10px',background:'rgba(180,40,40,.2)',border:'1px solid rgba(240,80,80,.2)',color:'#f87171',borderRadius:7,fontFamily:"'Cinzel',serif",fontSize:'.68rem',cursor:'pointer'}}>나가기</button></div>
      </div>
    </div>
  );

  if(game.phase==='reveal') return (
    <div style={{maxWidth:400,margin:'0 auto',textAlign:'center'}}>
      <div style={{background:'rgba(18,32,16,.75)',border:`2px solid ${isLiar?'rgba(248,113,113,.5)':'rgba(52,211,153,.5)'}`,borderRadius:14,padding:28}}>
        <div style={{fontSize:'3rem',marginBottom:10}}>{isLiar?'🎭':'🔍'}</div>
        <div style={{fontFamily:"'Cinzel',serif",fontSize:'1.1rem',fontWeight:700,color:isLiar?'#f87171':'#34d399',marginBottom:6}}>{isLiar?'당신은 라이어!':'일반 플레이어'}</div>
        {isLiar ? <div style={{fontSize:'.85rem',color:'#8a7a6a',lineHeight:1.6,padding:'12px 16px',background:'rgba(248,113,113,.07)',borderRadius:9,marginBottom:14}}>카테고리: <strong style={{color:'#f87171'}}>{game.category}</strong><br/>주제어를 모릅니다. 들키지 마세요!<br/><span style={{fontSize:'.75rem',color:'#6a5a4a'}}>투표에서 지목되면 주제어를 맞출 기회가 있습니다</span></div>
        : <div style={{fontSize:'.85rem',color:'#8a7a6a',lineHeight:1.6,padding:'12px 16px',background:'rgba(52,211,153,.07)',borderRadius:9,marginBottom:14}}>카테고리: <strong style={{color:'#34d399'}}>{game.category}</strong><br/>주제어: <strong style={{fontSize:'1.4rem',color:'#e8dcc8',display:'block',marginTop:4}}>{game.keyword}</strong><span style={{fontSize:'.73rem',color:'#6a7a5a'}}>라이어가 눈치채지 못하게 힌트를 주세요</span></div>}
        {isHost ? <button onClick={startDiscuss} style={{padding:'10px 22px',background:'linear-gradient(135deg,#9a7000,#f0c040,#9a7000)',border:'none',borderRadius:9,fontFamily:"'Cinzel',serif",fontWeight:700,fontSize:'.82rem',color:'#0c0900',cursor:'pointer'}}>토론 시작</button>
        : <div style={{fontSize:'.8rem',color:'#4a5a3a'}}><span style={{display:'inline-block',width:6,height:6,borderRadius:'50%',background:'#4ade80',marginRight:5,animation:'pulse 2s infinite'}}/>방장이 토론을 시작할 때까지 기다리세요</div>}
      </div>
    </div>
  );

  if(game.phase==='discuss') return (
    <div style={{maxWidth:500,margin:'0 auto'}}>
      <div style={{background:'rgba(18,32,16,.75)',border:'1px solid rgba(180,140,40,.18)',borderRadius:14,padding:18}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
          <div style={{fontFamily:"'Cinzel',serif",fontSize:'.75rem',color:'#c9a84c'}}>{game.round}라운드 / {DISCUSS_ROUNDS}라운드</div>
          <div style={{fontSize:'.72rem',color:'#5a6a4a'}}>카테고리: {game.category}</div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:14,padding:'14px',borderRadius:11,background:isMyTurn?PBG[myIdx]:'rgba(0,0,0,.2)',border:`1px solid ${isMyTurn?PBD[myIdx]:'rgba(255,255,255,.05)'}`,marginBottom:12,transition:'all .3s'}}>
          <TimerRing sec={timer}/>
          <div style={{flex:1}}>
            <div style={{fontFamily:"'Cinzel',serif",fontSize:'1rem',fontWeight:700,color:isMyTurn?PC[myIdx]:'#c0b090'}}>{isMyTurn?'🎤 내 차례!':curSpeaker?.name}</div>
            <div style={{fontSize:'.78rem',color:'#5a6a4a',marginTop:2}}>{isMyTurn?'주제어에 대해 힌트를 주세요':'발언 중...'}</div>
            {!isLiar&&!isMyTurn&&<div style={{fontSize:'.72rem',color:'#4a6a3a',marginTop:3}}>주제어: <strong style={{color:'#9aD874'}}>{game.keyword}</strong></div>}
            {isLiar&&<div style={{fontSize:'.72rem',color:'#f87171',marginTop:3}}>⚠ 라이어 — 들키지 마세요!</div>}
          </div>
        </div>
        <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:12}}>
          {game.players.map((p,i)=><div key={p.id} style={{padding:'5px 10px',borderRadius:7,background:PBG[i],border:`1px solid ${game.speakerIdx===i?PBD[i]:'rgba(255,255,255,.04)'}`,fontSize:'.75rem',color:PC[i],fontWeight:game.speakerIdx===i?700:400}}>{game.speakerIdx===i&&'🎤 '}{p.name}</div>)}
        </div>
        {isMyTurn&&<button onClick={advanceSpeaker} style={{width:'100%',padding:'10px',background:'linear-gradient(135deg,#9a7000,#f0c040,#9a7000)',border:'none',borderRadius:9,fontFamily:"'Cinzel',serif",fontWeight:700,fontSize:'.82rem',color:'#0c0900',cursor:'pointer'}}>발언 완료 →</button>}
      </div>
    </div>
  );

  if(game.phase==='vote') {
    const totalVotes=Object.keys(game.votes).length,myVotedAlready=!!game.votes[myPid]||voted;
    return (
      <div style={{maxWidth:420,margin:'0 auto'}}>
        <div style={{background:'rgba(18,32,16,.75)',border:'1px solid rgba(180,140,40,.18)',borderRadius:14,padding:20}}>
          <div style={{fontFamily:"'Cinzel',serif",fontSize:'.9rem',fontWeight:700,color:'#c9a84c',textAlign:'center',marginBottom:4}}>🗳️ 라이어를 지목하세요</div>
          <div style={{fontSize:'.75rem',color:'#5a6a4a',textAlign:'center',marginBottom:14}}>투표 완료: {totalVotes} / {game.players.length}</div>
          {!myVotedAlready ? (<>
            <div style={{display:'flex',flexDirection:'column',gap:7,marginBottom:14}}>
              {game.players.filter(p=>p.id!==myPid).map((p,i)=>{ const oi=game.players.findIndex(pl=>pl.id===p.id); return <button key={p.id} onClick={()=>setMyVote(p.id)} style={{padding:'11px 14px',borderRadius:9,border:`2px solid ${myVote===p.id?PBD[oi]:'rgba(255,255,255,.06)'}`,background:myVote===p.id?PBG[oi]:'rgba(0,0,0,.2)',color:myVote===p.id?PC[oi]:'#9a8a7a',fontFamily:"'Cinzel',serif",fontSize:'.88rem',fontWeight:700,cursor:'pointer',textAlign:'left',transition:'all .15s'}}>{myVote===p.id?'▶ ':''}{p.name}</button>; })}
            </div>
            <button onClick={submitVote} disabled={!myVote} style={{width:'100%',padding:'11px',background:myVote?'linear-gradient(135deg,#9a7000,#f0c040,#9a7000)':'rgba(80,70,40,.4)',border:'none',borderRadius:9,fontFamily:"'Cinzel',serif",fontWeight:700,fontSize:'.82rem',color:myVote?'#0c0900':'#5a5030',cursor:myVote?'pointer':'not-allowed'}}>투표 완료</button>
          </>) : <div style={{textAlign:'center',padding:'20px 0',color:'#5a6a4a',fontSize:'.88rem'}}><span style={{display:'inline-block',width:7,height:7,borderRadius:'50%',background:'#4ade80',marginRight:6,animation:'pulse 2s infinite'}}/>투표 완료! 다른 플레이어 대기 중... ({totalVotes}/{game.players.length})</div>}
        </div>
      </div>
    );
  }

  if(game.phase==='guess') {
    const accused=game.players.find(p=>p.id===game.accusedId);
    return (
      <div style={{maxWidth:420,margin:'0 auto',textAlign:'center'}}>
        <div style={{background:'rgba(18,32,16,.75)',border:'1px solid rgba(248,113,113,.3)',borderRadius:14,padding:24}}>
          <div style={{fontSize:'2.5rem',marginBottom:8}}>🎯</div>
          <div style={{fontFamily:"'Cinzel',serif",fontSize:'1rem',fontWeight:700,color:'#f87171',marginBottom:4}}>{accused?.name}이(가) 라이어로 지목되었습니다!</div>
          <div style={{fontSize:'.82rem',color:'#8a7a6a',marginBottom:16}}>카테고리: <strong style={{color:'#c9a84c'}}>{game.category}</strong></div>
          {isLiar ? (<>
            <div style={{fontSize:'.85rem',color:'#e8dcc8',marginBottom:12}}>주제어를 맞추면 역전 승리! 한 번의 기회입니다.</div>
            <input value={guess} onChange={e=>setGuess(e.target.value)} onKeyDown={e=>e.key==='Enter'&&submitGuess()} placeholder="주제어를 입력하세요..." style={{width:'100%',background:'rgba(0,0,0,.4)',border:'1px solid rgba(180,140,40,.25)',borderRadius:8,color:'#e8dcc8',padding:'10px 14px',fontFamily:"'Rajdhani',sans-serif",fontSize:'.95rem',outline:'none',marginBottom:10,textAlign:'center'}}/>
            <button onClick={submitGuess} disabled={!guess.trim()} style={{width:'100%',padding:'11px',background:guess.trim()?'linear-gradient(135deg,#9a7000,#f0c040,#9a7000)':'rgba(80,70,40,.4)',border:'none',borderRadius:9,fontFamily:"'Cinzel',serif",fontWeight:700,fontSize:'.82rem',color:guess.trim()?'#0c0900':'#5a5030',cursor:guess.trim()?'pointer':'not-allowed'}}>정답 제출</button>
          </>) : <div style={{fontSize:'.85rem',color:'#5a6a4a'}}><span style={{display:'inline-block',width:6,height:6,borderRadius:'50%',background:'#4ade80',marginRight:5,animation:'pulse 2s infinite'}}/>라이어가 주제어를 추측 중입니다...</div>}
        </div>
      </div>
    );
  }

  if(game.phase==='result') {
    const liarPlayer=game.players.find(p=>p.id===game.liarId),accusedPlayer=game.players.find(p=>p.id===game.accusedId),liarsWin=game.liarWin,correctGuess=game.liarGuess&&game.liarGuess.toLowerCase().replace(/\s/g,'')===game.keyword.toLowerCase().replace(/\s/g,'');
    return (
      <div style={{maxWidth:440,margin:'0 auto',textAlign:'center'}}>
        <div style={{background:'rgba(18,32,16,.75)',border:`1px solid ${liarsWin?'rgba(248,113,113,.3)':'rgba(52,211,153,.3)'}`,borderRadius:14,padding:24}}>
          <div style={{fontSize:'2.8rem',marginBottom:8}}>{liarsWin?'😈':'🎉'}</div>
          <div style={{fontFamily:"'Cinzel',serif",fontSize:'1.2rem',fontWeight:900,color:liarsWin?'#f87171':'#34d399',marginBottom:4}}>{liarsWin?'라이어 승리!':'시민 승리!'}</div>
          <div style={{fontSize:'.8rem',color:'#6a7a5a',marginBottom:16,lineHeight:1.7}}>
            {!game.accusedId&&'라이어를 찾지 못했습니다.'}
            {game.accusedId&&game.accusedId!==game.liarId&&`${accusedPlayer?.name}을(를) 지목했지만 라이어가 아니었습니다.`}
            {game.accusedId===game.liarId&&!correctGuess&&`${accusedPlayer?.name}이(가) 라이어! 하지만 주제어를 맞추지 못했습니다.`}
            {game.accusedId===game.liarId&&correctGuess&&`라이어가 "${game.liarGuess}"로 주제어를 맞췄습니다!`}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:18,textAlign:'left'}}>
            <div style={{padding:'12px',borderRadius:10,background:'rgba(248,113,113,.08)',border:'1px solid rgba(248,113,113,.2)'}}><div style={{fontSize:'.62rem',letterSpacing:'.12em',textTransform:'uppercase',color:'#f87171',marginBottom:4}}>🎭 라이어</div><div style={{fontFamily:"'Cinzel',serif",fontWeight:700,color:'#f87171'}}>{liarPlayer?.name}</div>{game.liarGuess&&<div style={{fontSize:'.72rem',color:'#8a6a6a',marginTop:3}}>추측: {game.liarGuess}</div>}</div>
            <div style={{padding:'12px',borderRadius:10,background:'rgba(201,168,76,.08)',border:'1px solid rgba(201,168,76,.2)'}}><div style={{fontSize:'.62rem',letterSpacing:'.12em',textTransform:'uppercase',color:'#c9a84c',marginBottom:4}}>🔑 주제어</div><div style={{fontFamily:"'Cinzel',serif",fontWeight:700,color:'#f0c040'}}>{game.keyword}</div><div style={{fontSize:'.72rem',color:'#8a7a4a',marginTop:3}}>{game.category}</div></div>
          </div>
          <div style={{marginBottom:16,textAlign:'left'}}>
            <div style={{fontFamily:"'Cinzel',serif",fontSize:'.62rem',letterSpacing:'.14em',textTransform:'uppercase',color:'#5a6a4a',marginBottom:7}}>투표 결과</div>
            {game.players.map((p,i)=>{ const votedFor=game.votes[p.id],vTarget=game.players.find(pl=>pl.id===votedFor); return <div key={p.id} style={{display:'flex',alignItems:'center',gap:8,padding:'5px 10px',borderRadius:6,background:'rgba(0,0,0,.15)',marginBottom:3}}><span style={{width:7,height:7,borderRadius:'50%',background:PC[i],display:'inline-block',flexShrink:0}}/><span style={{fontSize:'.8rem',color:PC[i],flex:1}}>{p.name}</span><span style={{fontSize:'.75rem',color:'#6a7a5a'}}>→ {vTarget?.name||'?'}</span></div>; })}
          </div>
          <div style={{display:'flex',gap:8,justifyContent:'center'}}>
            <button onClick={resetGame} style={{padding:'9px 20px',background:'linear-gradient(135deg,#9a7000,#f0c040,#9a7000)',border:'none',borderRadius:9,fontFamily:"'Cinzel',serif",fontWeight:700,fontSize:'.8rem',color:'#0c0900',cursor:'pointer'}}>새 게임</button>
            <button onClick={onExit} style={{padding:'9px 16px',background:'transparent',border:'1px solid rgba(180,140,40,.3)',borderRadius:9,fontFamily:"'Cinzel',serif",fontWeight:700,fontSize:'.78rem',color:'#9a8a6a',cursor:'pointer'}}>홈으로</button>
          </div>
        </div>
      </div>
    );
  }
  return null;
}

// ══════════════════════════════════════════════════════
// BUCKSHOT ROULETTE
// ══════════════════════════════════════════════════════

const BSI = {
  cuffs:  {e:'🔗',n:'수갑',  d:'상대 다음 턴 스킵'},
  cig:    {e:'🚬',n:'담배',  d:'체력 1 회복'},
  beer:   {e:'🍺',n:'맥주',  d:'현재 탄환 배출'},
  saw:    {e:'🪚',n:'톱',    d:'다음 발사 데미지 2배'},
  glass:  {e:'🔍',n:'돋보기',d:'현재 탄환 확인'},
  phone:  {e:'📱',n:'전화기',d:'미래 탄환 1개 확인'},
  invert: {e:'🔄',n:'인버터',d:'현재 탄환 반전'},
  pills:  {e:'💊',n:'알약',  d:'50%: +2체력 또는 -1체력'},
};
const BSI_KEYS = Object.keys(BSI);

function bsRem(arr, v) { const i=arr.indexOf(v); return i<0?arr:[...arr.slice(0,i),...arr.slice(i+1)]; }

function bsLoad(n) {
  const total=Math.min(2+Math.floor(n/2)*2,8);
  const live=Math.max(1,Math.min(total-1,1+Math.floor(Math.random()*(total-1))));
  return {ch:shuffle([...Array(live).fill(true),...Array(total-live).fill(false)]),live,blank:total-live};
}

function bsItems(existing, count) {
  const r=[...existing];
  for(let i=0;i<count&&r.length<8;i++) r.push(BSI_KEYS[Math.floor(Math.random()*BSI_KEYS.length)]);
  return r;
}

function bsLoadForRound(round, reloadNum) {
  if(round===1) {
    if(reloadNum===1) return {ch:shuffle([true,false,false]),live:1,blank:2};
    return {ch:shuffle([true,true,true,false,false]),live:3,blank:2};
  }
  return bsLoad(reloadNum);
}

function bsInitRound(round, roundResults) {
  const hp=round===1?2:round===2?4:6;
  const {ch,live,blank}=bsLoadForRound(round,1);
  const itemsPerReload=round===1?0:round===2?2:4;
  const si=itemsPerReload>0?bsItems([],Math.min(itemsPerReload,8)):[];
  return {
    phase:'player_turn',round,roundResults:roundResults||[],
    revealId:Date.now(),revealVisible:true,
    revealDisplay:round===3?shuffle([...ch]):null,
    subReload:1,ch,live,blank,
    sawedOff:false,
    pHP:hp,pMax:hp,dHP:hp,dMax:hp,
    pItems:[...si],dItems:[...si],
    pCuffed:false,dCuffed:false,
    knownBullet:null,winner:null,
    pDefiUsed:false,dDefiUsed:false,
    pDefiLocked:false,dDefiLocked:false,
    reload:1,
  };
}

function bsInit() { return bsInitRound(1,[]); }

// Dealer AI — runs outside component to avoid closure issues
async function runDealer(initGs, setGs, pushLog, setThinking) {
  let g={...initGs};
  const prob = ()=> g.ch.length>0 ? g.live/g.ch.length : 0;
  const hasDoc = g.round<3;

  await sleep(700);

  // 1. Heal if low HP
  if(g.dHP<=Math.ceil(g.dMax*0.35)&&g.dItems.includes('cig')) {
    g={...g,dHP:Math.min(g.dHP+1,g.dMax),dItems:bsRem(g.dItems,'cig')};
    pushLog('딜러가 담배를 피웁니다... 체력+1 🚬','info'); setGs({...g}); await sleep(900);
  } else if(g.dHP<=1&&g.dItems.includes('pills')) {
    const lucky=Math.random()>0.5;
    if(lucky){g.dMax+=2;g.dHP=Math.min(g.dHP+2,g.dMax);}else{g.dHP=Math.max(g.dHP-1,0);}
    g.dItems=bsRem(g.dItems,'pills');
    pushLog(lucky?'딜러 알약 복용 — 체력+2 💊':'딜러 알약 복용 — 체력-1 💊','info'); setGs({...g}); await sleep(900);
    if(g.round===3&&g.dHP<=2&&g.dHP>0) g={...g,dDefiLocked:true};
    if(g.dHP<=0){
      if(!g.dDefiUsed&&!g.dDefiLocked){
        g={...g,dHP:1,dDefiUsed:true}; pushLog('⚡ 제세동기 발동! 딜러 체력 1 회복','warn'); setGs({...g}); await sleep(900);
      } else {
        const nr=[...g.roundResults,{round:g.round,winner:'player'}];
        setGs({...g,phase:g.round<3?'round_win':'game_over',winner:'player',roundResults:nr});
        setThinking(false); return;
      }
    }
  }

  // 2. Use glass to get info
  if(!g.knownBullet&&g.dItems.includes('glass')&&Math.random()<0.85) {
    g={...g,knownBullet:{isLive:g.ch[0]},dItems:bsRem(g.dItems,'glass')};
    pushLog('딜러가 돋보기를 꺼냅니다... 🔍','info'); setGs({...g}); await sleep(1100);
  }

  const known=g.knownBullet;

  // 3. Invert if known blank
  if(known&&!known.isLive&&g.dItems.includes('invert')&&Math.random()<0.9) {
    g={...g,ch:[true,...g.ch.slice(1)],live:g.live+1,blank:g.blank-1,knownBullet:{isLive:true},dItems:bsRem(g.dItems,'invert')};
    pushLog('딜러가 인버터를 사용합니다! 🔄','warn'); setGs({...g}); await sleep(900);
  }

  // 4. Saw if live bullet expected
  const nowKnown=g.knownBullet;
  if((nowKnown?.isLive||prob()>0.65)&&!g.sawedOff&&g.dItems.includes('saw')&&Math.random()<0.8) {
    g={...g,sawedOff:true,dItems:bsRem(g.dItems,'saw')};
    pushLog('딜러가 총신을 절단합니다! 🪚','warn'); setGs({...g}); await sleep(900);
  }

  // 5. Cuff player opportunistically
  if(!g.pCuffed&&g.dItems.includes('cuffs')&&Math.random()<0.65) {
    g={...g,pCuffed:true,dItems:bsRem(g.dItems,'cuffs')};
    pushLog('딜러가 수갑을 채웁니다! 🔗','warn'); setGs({...g}); await sleep(900);
  }

  // SHOOT
  await sleep(500);
  const kn=g.knownBullet;
  const shootSelf = kn ? !kn.isLive : prob()<0.4;
  const target=shootSelf?'dealer':'player';
  const bullet=g.ch[0];
  const dmg=bullet?(g.sawedOff?2:1):0;
  g={...g,ch:g.ch.slice(1),live:bullet?g.live-1:g.live,blank:bullet?g.blank:g.blank-1,sawedOff:false,knownBullet:null};

  if(bullet) {
    if(target==='player'){g.pHP-=dmg;pushLog(`💥 딜러 → 플레이어! 데미지 ${dmg}`,'hit');}
    else{g.dHP-=dmg;pushLog(`💥 딜러 자신을 쏩니다... 데미지 ${dmg}`,'hit');}
  } else {
    pushLog(target==='dealer'?'딸깍 — 딜러 공탄! 추가 행동 ⚪':'딸깍 — 공탄 ⚪','blank');
  }
  // 라운드 3: HP ≤ 2 시 제세동기 잠금
  if(g.round===3){if(g.pHP<=2&&g.pHP>0)g={...g,pDefiLocked:true};if(g.dHP<=2&&g.dHP>0)g={...g,dDefiLocked:true};}
  setGs({...g}); await sleep(500);

  // 플레이어 사망 체크
  if(g.pHP<=0){
    if(!g.pDefiUsed&&!g.pDefiLocked){
      g={...g,pHP:1,pDefiUsed:true}; pushLog('⚡ 제세동기 발동! 체력 1 회복','warn'); setGs({...g}); await sleep(900);
    } else {setGs({...g,phase:'game_over',winner:'dealer'}); setThinking(false); return;}
  }
  // 딜러 사망 체크
  if(g.dHP<=0){
    if(!g.dDefiUsed&&!g.dDefiLocked){
      g={...g,dHP:1,dDefiUsed:true}; pushLog('⚡ 제세동기 발동! 딜러 체력 1 회복','warn'); setGs({...g}); await sleep(900);
    } else {
      const nr=[...g.roundResults,{round:g.round,winner:'player'}];
      setGs({...g,phase:g.round<3?'round_win':'game_over',winner:'player',roundResults:nr});
      setThinking(false); return;
    }
  }

  // Reload check
  if(g.ch.length===0) {
    const itemsPerReload=g.round===1?0:g.round===2?2:4;
    const newSubReload=g.subReload+1;
    const {ch,live,blank}=bsLoadForRound(g.round,newSubReload);
    const prevPHP=g.pHP,prevDHP=g.dHP;
    const newPHP=hasDoc?Math.min(g.pHP+1,g.pMax):g.pHP;
    const newDHP=hasDoc?Math.min(g.dHP+1,g.dMax):g.dHP;
    const revDisp=g.round===3?shuffle([...ch]):null;
    g={...g,ch,live,blank,subReload:newSubReload,reload:g.reload+1,
      pHP:newPHP,dHP:newDHP,
      pItems:bsItems(g.pItems,Math.min(itemsPerReload,8-g.pItems.length)),
      dItems:bsItems(g.dItems,Math.min(itemsPerReload,8-g.dItems.length)),
      revealId:Date.now(),revealVisible:true,revealDisplay:revDisp};
    const docMsg=hasDoc&&(newPHP>prevPHP||newDHP>prevDHP)?' 의사의 도움으로 체력+1':'';
    pushLog(`탄창 비어있음 — 재장전!${docMsg}`,'reload'); setGs(g); await sleep(1400);
  }

  // Dealer blank self-shot = extra turn
  if(!bullet&&target==='dealer') {
    pushLog('딜러 공탄 자가격발 — 딜러 추가 행동!','info');
    const cont={...g,phase:'dealer_turn'}; setGs(cont); await sleep(700);
    await runDealer(cont,setGs,pushLog,setThinking); return;
  }

  // Player cuffed? Skip player, dealer acts again
  if(g.pCuffed) {
    pushLog('수갑으로 플레이어 스킵!','info');
    const skip={...g,pCuffed:false,phase:'dealer_turn'}; setGs(skip); await sleep(700);
    await runDealer(skip,setGs,pushLog,setThinking); return;
  }

  setThinking(false);
  setGs({...g,phase:'player_turn'});
}

function HPBar({hp,max,color}) {
  return (
    <div style={{display:'flex',gap:3,alignItems:'center',flexWrap:'wrap'}}>
      {Array(max).fill(0).map((_,i)=>(
        <div key={i} style={{width:14,height:14,borderRadius:3,background:i<hp?color:'rgba(255,255,255,.07)',border:`1px solid ${i<hp?color:'rgba(255,255,255,.1)'}`,transition:'all .3s',boxShadow:i<hp?`0 0 4px ${color}50`:''}}/>
      ))}
    </div>
  );
}

function BuckshotGame({onExit}) {
  const [gs,setGs]=useState(null);
  const [log,setLog]=useState([]);
  const [thinking,setThinking]=useState(false);
  const [flash,setFlash]=useState(null);
  const [hovItem,setHovItem]=useState(null);

  const pushLog=useCallback((text,type='info')=>setLog(l=>[...l.slice(-4),{text,type,id:Date.now()+Math.random()}]),[]);
  const doFlash=(type)=>{ setFlash(type); setTimeout(()=>setFlash(null),700); };

  // 탄환 정보 3초 공개 후 자동 숨김
  useEffect(()=>{
    if(!gs?.revealVisible) return;
    const id=gs.revealId;
    const t=setTimeout(()=>{
      setGs(prev=>{if(!prev||prev.revealId!==id)return prev;return {...prev,revealVisible:false};});
    },3000);
    return ()=>clearTimeout(t);
  },[gs?.revealId]);

  const useItem=(itemId)=>{
    if(!gs||gs.phase!=='player_turn'||thinking) return;
    let g={...gs};
    if(!g.pItems.includes(itemId)) return;
    g.pItems=bsRem(g.pItems,itemId);
    switch(itemId) {
      case 'cig':
        g.pHP=Math.min(g.pHP+1,g.pMax);
        pushLog('담배를 피웁니다... 체력+1 🚬','info'); break;
      case 'pills': {
        const lucky=Math.random()>0.5;
        if(lucky){g.pMax+=2;g.pHP=Math.min(g.pHP+2,g.pMax);}else{g.pHP=Math.max(g.pHP-1,0);}
        pushLog(lucky?'알약 — 행운! 체력+2 💊':'알약 — 불행... 체력-1 💊',lucky?'info':'warn');
        if(g.round===3&&g.pHP<=2&&g.pHP>0) g={...g,pDefiLocked:true};
        if(g.pHP<=0){
          if(!g.pDefiUsed&&!g.pDefiLocked){
            g={...g,pHP:1,pDefiUsed:true}; pushLog('⚡ 제세동기 발동! 체력 1 회복','warn');
          } else {setGs({...g,phase:'game_over',winner:'dealer'}); return;}
        }
        break;
      }
      case 'beer': {
        const ejected=g.ch[0]; g.ch=g.ch.slice(1); g.live-=ejected?1:0; g.blank-=ejected?0:1; g.knownBullet=null;
        pushLog(`맥주로 탄환 배출! ${ejected?'🔴실탄':'⚪공탄'}이었습니다 🍺`,'info');
        if(g.ch.length===0){
          const hasDoc=g.round<3;
          const itemsPerReload=g.round===1?0:g.round===2?2:4;
          const newSubReload=g.subReload+1;
          const {ch,live,blank}=bsLoadForRound(g.round,newSubReload);
          const prevPHP=g.pHP,prevDHP=g.dHP;
          const newPHP=hasDoc?Math.min(g.pHP+1,g.pMax):g.pHP;
          const newDHP=hasDoc?Math.min(g.dHP+1,g.dMax):g.dHP;
          const revDisp=g.round===3?shuffle([...ch]):null;
          g={...g,ch,live,blank,subReload:newSubReload,reload:g.reload+1,
            pHP:newPHP,dHP:newDHP,
            pItems:bsItems(g.pItems,Math.min(itemsPerReload,8-g.pItems.length)),
            dItems:bsItems(g.dItems,Math.min(itemsPerReload,8-g.dItems.length)),
            revealId:Date.now(),revealVisible:true,revealDisplay:revDisp};
          const docMsg=hasDoc&&(newPHP>prevPHP||newDHP>prevDHP)?' 의사의 도움으로 체력+1':'';
          pushLog(`탄창 비어있음 — 재장전!${docMsg}`,'reload');
        }
        break;
      }
      case 'saw': g.sawedOff=true; pushLog('총신 절단! 다음 발사 데미지 2배 🪚','warn'); break;
      case 'glass': g.knownBullet={isLive:g.ch[0]}; pushLog(`돋보기로 확인 — 현재 탄환: ${g.ch[0]?'🔴실탄':'⚪공탄'} 🔍`,'info'); break;
      case 'phone': {
        const fi=Math.floor(Math.random()*g.ch.length);
        pushLog(`전화기 — ${fi+1}번째 탄환: ${g.ch[fi]?'🔴실탄':'⚪공탄'} 📱`,'info'); break;
      }
      case 'invert':
        g.ch=[!g.ch[0],...g.ch.slice(1)]; if(g.ch[0]){g.live++;g.blank--;}else{g.live--;g.blank++;}
        g.knownBullet=g.knownBullet?{isLive:!g.knownBullet.isLive}:null;
        pushLog(`인버터 — 탄환 반전! 이제 ${g.ch[0]?'🔴실탄':'⚪공탄'} 🔄`,'info'); break;
      case 'cuffs': g.dCuffed=true; pushLog('딜러에게 수갑! 다음 딜러 턴 스킵 🔗','info'); break;
      default: break;
    }
    setGs({...g});
  };

  const playerShoot=(target)=>{
    if(!gs||gs.phase!=='player_turn'||thinking) return;
    const bullet=gs.ch[0],dmg=bullet?(gs.sawedOff?2:1):0;
    let g={...gs,ch:gs.ch.slice(1),live:bullet?gs.live-1:gs.live,blank:bullet?gs.blank:gs.blank-1,sawedOff:false,knownBullet:null};
    if(bullet) {
      doFlash(target==='dealer'?'hit-d':'hit-p');
      if(target==='dealer'){g.dHP-=dmg;pushLog(`💥 딜러 피격! 데미지 ${dmg}`,'hit');}
      else{g.pHP-=dmg;pushLog(`💥 자신을 쏩니다! 데미지 ${dmg}`,'hit');}
    } else {
      doFlash('blank');
      pushLog(target==='player'?'딸깍 — 공탄! 한 번 더 ⚪':'딸깍 — 딜러에게 공탄 ⚪','blank');
    }
    // 라운드 3: HP ≤ 2 시 제세동기 잠금
    if(g.round===3){if(g.pHP<=2&&g.pHP>0)g={...g,pDefiLocked:true};if(g.dHP<=2&&g.dHP>0)g={...g,dDefiLocked:true};}

    // 플레이어 사망 체크
    if(g.pHP<=0){
      if(!g.pDefiUsed&&!g.pDefiLocked){
        g={...g,pHP:1,pDefiUsed:true}; pushLog('⚡ 제세동기 발동! 체력 1 회복','warn'); setGs({...g}); return;
      }
      setGs({...g,phase:'game_over',winner:'dealer'}); return;
    }
    // 딜러 사망 체크
    if(g.dHP<=0){
      if(!g.dDefiUsed&&!g.dDefiLocked){
        g={...g,dHP:1,dDefiUsed:true}; pushLog('⚡ 제세동기 발동! 딜러 체력 1 회복','warn'); setGs({...g}); return;
      }
      const nr=[...g.roundResults,{round:g.round,winner:'player'}];
      if(g.round<3){setGs({...g,phase:'round_win',roundResults:nr});return;}
      setGs({...g,phase:'game_over',winner:'player',roundResults:nr}); return;
    }

    // Reload
    if(g.ch.length===0) {
      const hasDoc=g.round<3;
      const itemsPerReload=g.round===1?0:g.round===2?2:4;
      const newSubReload=g.subReload+1;
      const {ch,live,blank}=bsLoadForRound(g.round,newSubReload);
      const prevPHP=g.pHP,prevDHP=g.dHP;
      const newPHP=hasDoc?Math.min(g.pHP+1,g.pMax):g.pHP;
      const newDHP=hasDoc?Math.min(g.dHP+1,g.dMax):g.dHP;
      const revDisp=g.round===3?shuffle([...ch]):null;
      const revId=Date.now();
      g={...g,ch,live,blank,subReload:newSubReload,reload:g.reload+1,
        pHP:newPHP,dHP:newDHP,
        pItems:bsItems(g.pItems,Math.min(itemsPerReload,8-g.pItems.length)),
        dItems:bsItems(g.dItems,Math.min(itemsPerReload,8-g.dItems.length)),
        revealId:revId,revealVisible:true,revealDisplay:revDisp};
      const docMsg=hasDoc&&(newPHP>prevPHP||newDHP>prevDHP)?' 의사의 도움으로 체력+1':'';
      pushLog(`탄창 비어있음 — 재장전!${docMsg}`,'reload'); setGs(g);
      const next=(!bullet&&target==='player')?'player_turn':g.dCuffed?'player_turn':'dealer_turn';
      setTimeout(()=>{
        if(next==='dealer_turn'){
          const ds={...g,dCuffed:false,phase:'dealer_turn'}; setGs(ds); setThinking(true);
          runDealer(ds,setGs,pushLog,setThinking);
        } else setGs(prev=>({...prev,dCuffed:false,phase:'player_turn'}));
      },1400);
      return;
    }

    if(!bullet&&target==='player'){setGs({...g,phase:'player_turn'});return;}

    if(g.dCuffed){
      pushLog('딜러 수갑으로 턴 스킵! 🔗','info');
      setGs({...g,dCuffed:false,phase:'player_turn'}); return;
    }

    const ds={...g,phase:'dealer_turn'}; setGs(ds); setThinking(true);
    runDealer(ds,setGs,pushLog,setThinking);
  };

  // Intro screen
  if(!gs) return (
    <div style={{maxWidth:400,margin:'0 auto'}}>
      <div style={{background:'rgba(15,8,5,.92)',border:'1px solid rgba(200,80,40,.25)',borderRadius:14,padding:24}}>
        <div style={{textAlign:'center',marginBottom:18}}>
          <div style={{fontSize:'3rem',lineHeight:1,marginBottom:8}}>🔫</div>
          <div style={{fontFamily:"'Cinzel',serif",fontSize:'1.1rem',fontWeight:900,color:'#d07050',letterSpacing:'.1em',marginBottom:6}}>BUCKSHOT ROULETTE</div>
          <div style={{fontSize:'.8rem',color:'#7a6a5a',lineHeight:1.7}}>딜러와의 전략형 러시안 룰렛.<br/>아이템을 활용해 확률을 통제하세요.</div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,marginBottom:18}}>
          {BSI_KEYS.map(k=>(
            <div key={k} style={{padding:'7px 9px',borderRadius:7,background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.06)'}}>
              <span style={{marginRight:5}}>{BSI[k].e}</span><span style={{fontSize:'.73rem',color:'#c0a070',fontWeight:600}}>{BSI[k].n}</span>
              <div style={{fontSize:'.62rem',color:'#6a5a4a',marginTop:1}}>{BSI[k].d}</div>
            </div>
          ))}
        </div>
        <div style={{background:'rgba(255,255,255,.03)',borderRadius:8,padding:'9px 12px',marginBottom:14,fontSize:'.7rem',color:'#6a5a4a',lineHeight:1.8}}>
          <div style={{color:'#9a8060',fontWeight:600,marginBottom:4}}>3라운드 구성</div>
          <div>R1: 라이프 2 · 아이템 없음 · 의사O · 탄환 1+2</div>
          <div>R2: 라이프 4 · 장전당 2개 · 의사O</div>
          <div>R3: 라이프 6 · 장전당 4개 · 의사X · 탄환정보 비공개</div>
          <div style={{color:'#f87171',marginTop:3,fontSize:'.65rem'}}>한 라운드라도 패배하면 게임 종료</div>
        </div>
        <div style={{display:'flex',gap:8,justifyContent:'center'}}>
          <button onClick={()=>{setGs(bsInit());setLog([]);setThinking(false);}} style={{padding:'11px 26px',background:'linear-gradient(135deg,#6a1c0c,#c03020,#6a1c0c)',border:'none',borderRadius:9,fontFamily:"'Cinzel',serif",fontWeight:700,fontSize:'.85rem',color:'#ffe0d0',cursor:'pointer',letterSpacing:'.06em'}}>게임 시작</button>
          <button onClick={onExit} style={{padding:'10px 18px',background:'transparent',border:'1px solid rgba(180,140,40,.3)',borderRadius:9,fontFamily:"'Cinzel',serif",fontWeight:700,fontSize:'.8rem',color:'#9a8a6a',cursor:'pointer'}}>뒤로</button>
        </div>
      </div>
    </div>
  );

  // Game over screen
  if(gs.phase==='game_over') {
    const won=gs.winner==='player';
    const finalVic=won&&gs.round===3;
    return (
      <div style={{maxWidth:380,margin:'0 auto',textAlign:'center'}}>
        <div style={{background:'rgba(15,8,5,.92)',border:`1px solid ${won?'rgba(52,211,153,.3)':'rgba(248,113,113,.3)'}`,borderRadius:14,padding:28}}>
          <div style={{fontSize:'3rem',lineHeight:1,marginBottom:8}}>{finalVic?'🏆':won?'🎉':'💀'}</div>
          <div style={{fontFamily:"'Cinzel',serif",fontSize:'1.3rem',fontWeight:900,color:won?'#34d399':'#f87171',marginBottom:4}}>{finalVic?'최종 승리!':won?'승리!':'패배...'}</div>
          <div style={{fontSize:'.8rem',color:'#6a7a5a',marginBottom:4}}>{finalVic?'3라운드 모두 클리어!':won?'딜러를 처치했습니다!':won?'딜러를 처치했습니다!':'HP가 바닥났습니다.'}</div>
          <div style={{fontSize:'.72rem',color:'#4a5a4a',marginBottom:20}}>라운드 {gs.round} | 총 {gs.reload}번 재장전</div>
          <div style={{display:'flex',gap:8,justifyContent:'center'}}>
            <button onClick={()=>{setGs(bsInit());setLog([]);setThinking(false);}} style={{padding:'10px 22px',background:'linear-gradient(135deg,#6a1c0c,#c03020,#6a1c0c)',border:'none',borderRadius:9,fontFamily:"'Cinzel',serif",fontWeight:700,fontSize:'.82rem',color:'#ffe0d0',cursor:'pointer'}}>처음부터</button>
            <button onClick={onExit} style={{padding:'9px 16px',background:'transparent',border:'1px solid rgba(180,140,40,.3)',borderRadius:9,fontFamily:"'Cinzel',serif",fontWeight:700,fontSize:'.78rem',color:'#9a8a6a',cursor:'pointer'}}>홈으로</button>
          </div>
        </div>
      </div>
    );
  }

  // 라운드 승리 화면
  if(gs.phase==='round_win') {
    const nextRound=gs.round+1;
    const nextHP=[0,2,4,6][nextRound];
    const nextItems=[0,0,2,4][nextRound];
    return (
      <div style={{maxWidth:380,margin:'0 auto',textAlign:'center'}}>
        <div style={{background:'rgba(15,8,5,.92)',border:'1px solid rgba(52,211,153,.3)',borderRadius:14,padding:28}}>
          <div style={{fontSize:'2.5rem',lineHeight:1,marginBottom:8}}>🎉</div>
          <div style={{fontFamily:"'Cinzel',serif",fontSize:'1.2rem',fontWeight:900,color:'#34d399',marginBottom:4}}>라운드 {gs.round} 클리어!</div>
          <div style={{fontSize:'.8rem',color:'#4a7a5a',marginBottom:16}}>라운드 {nextRound}로 진행합니다</div>
          <div style={{background:'rgba(255,255,255,.04)',borderRadius:9,padding:'12px 16px',marginBottom:18,textAlign:'left',fontSize:'.76rem'}}>
            <div style={{fontFamily:"'Cinzel',serif",fontSize:'.65rem',color:'#8a7a5a',letterSpacing:'.12em',marginBottom:8}}>ROUND {nextRound} 정보</div>
            <div style={{color:'#c0a070',marginBottom:3}}>체력: {nextHP} HP</div>
            <div style={{color:'#c0a070',marginBottom:3}}>아이템: 장전당 {nextItems}개</div>
            <div style={{color:'#c0a070',marginBottom:3}}>의사의 도움: {nextRound<3?'있음':'없음'}</div>
            {nextRound===3&&<div style={{color:'#f59e0b',marginTop:6,fontSize:'.7rem'}}>⚠ 탄환 정보 비공개 · HP≤2 시 제세동기 비활성</div>}
          </div>
          <button onClick={()=>{setGs(bsInitRound(nextRound,gs.roundResults));setLog([]);setThinking(false);}}
            style={{padding:'11px 28px',background:'linear-gradient(135deg,#6a1c0c,#c03020,#6a1c0c)',border:'none',borderRadius:9,fontFamily:"'Cinzel',serif",fontWeight:700,fontSize:'.85rem',color:'#ffe0d0',cursor:'pointer',letterSpacing:'.05em'}}>
            라운드 {nextRound} 시작
          </button>
        </div>
      </div>
    );
  }

  const isPlayerTurn=gs.phase==='player_turn';
  const liveProb=gs.ch.length>0?gs.live/gs.ch.length:0;
  const logColors={hit:'#f87171',blank:'#818cf8',reload:'#f59e0b',warn:'#fb923c',info:'#6a8a6a'};

  return (
    <div style={{maxWidth:440,margin:'0 auto',userSelect:'none'}}>
      {/* Flash overlay */}
      {flash&&<div style={{position:'fixed',inset:0,pointerEvents:'none',zIndex:998,background:flash==='hit-d'?'rgba(248,113,113,.12)':flash==='hit-p'?'rgba(248,113,113,.22)':'rgba(180,180,255,.07)',animation:'bsFlash .55s ease forwards'}}/>}

      {/* ── DEALER ZONE (top) ── */}
      <div style={{background:'rgba(20,6,4,.88)',border:'1px solid rgba(180,60,30,.22)',borderRadius:'12px 12px 0 0',padding:'12px 14px 10px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
          <div>
            <div style={{fontFamily:"'Cinzel',serif",fontSize:'.62rem',letterSpacing:'.14em',color:'#c05040',marginBottom:5}}>
              {thinking?'🤔 딜러 행동 중...':'🎩 딜러'}
            </div>
            <HPBar hp={gs.dHP} max={gs.dMax} color='#f87171'/>
            <div style={{fontSize:'.65rem',color:'#7a5050',marginTop:3}}>{gs.dHP} / {gs.dMax} HP</div>
          </div>
          <div style={{fontSize:thinking?'2.4rem':'1.9rem',transition:'font-size .3s',filter:thinking?'drop-shadow(0 0 8px rgba(248,113,113,.4))':'none',animation:thinking?'dealerPulse .7s infinite alternate':'none'}}>
            {thinking?'🎭':'🤖'}
          </div>
        </div>
        {/* Dealer items (face-down) */}
        <div style={{display:'flex',gap:5,flexWrap:'wrap',minHeight:38}}>
          {gs.dItems.map((item,i)=>(
            <div key={i} style={{width:36,height:36,borderRadius:6,background:'rgba(180,50,30,.15)',border:'1px solid rgba(180,60,30,.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.1rem',transition:'all .3s'}}>
              {thinking&&i===0?BSI[item].e:'🂠'}
            </div>
          ))}
          {gs.dItems.length===0&&<div style={{fontSize:'.65rem',color:'#5a3a3a',padding:'4px 0'}}>아이템 없음</div>}
        </div>
      </div>

      {/* ── TABLE ZONE (middle) ── */}
      <div style={{background:'rgba(8,12,8,.92)',border:'1px solid rgba(180,140,40,.12)',borderLeft:'1px solid rgba(180,140,40,.12)',borderRight:'1px solid rgba(180,140,40,.12)',padding:'10px 14px'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
          {/* Shotgun */}
          <div style={{textAlign:'center',minWidth:60}}>
            <div style={{fontSize:'1.9rem',filter:gs.sawedOff?'drop-shadow(0 0 6px rgba(245,158,11,.7))':'none',transition:'filter .3s'}}>
              {gs.sawedOff?'🔫✂️':'🔫'}
            </div>
            {gs.sawedOff&&<div style={{fontSize:'.58rem',color:'#f59e0b',letterSpacing:'.06em'}}>✂ 절단됨</div>}
          </div>

          {/* Bullet display */}
          <div style={{textAlign:'center',flex:1}}>
            {/* 라운드 3 공개 시: 순서 섞인 컬러 탄환 표시 */}
            {gs.revealVisible&&gs.round===3&&gs.revealDisplay&&(
              <div style={{display:'flex',gap:3,justifyContent:'center',marginBottom:4,flexWrap:'wrap'}}>
                {gs.revealDisplay.map((b,i)=>(
                  <div key={i} style={{width:9,height:16,borderRadius:2,
                    background:b?'#ef4444':'#6b7280',
                    border:`1px solid ${b?'rgba(239,68,68,.6)':'rgba(107,114,128,.5)'}`,
                    transition:'all .3s'}}/>
                ))}
              </div>
            )}
            {/* 일반 탄환 아이콘 (라운드 3 공개 중엔 숨김) */}
            {!(gs.revealVisible&&gs.round===3)&&(
              <div style={{display:'flex',gap:3,justifyContent:'center',marginBottom:4,flexWrap:'wrap'}}>
                {gs.ch.map((b,i)=>(
                  <div key={i} style={{width:9,height:16,borderRadius:2,
                    background:i===0&&gs.knownBullet?(gs.knownBullet.isLive?'#ef4444':'#6b7280'):'rgba(255,255,255,.15)',
                    border:`1px solid ${i===0&&gs.knownBullet?(gs.knownBullet.isLive?'rgba(239,68,68,.8)':'rgba(107,114,128,.7)'):'rgba(255,255,255,.18)'}`,
                    boxShadow:i===0&&gs.knownBullet?.isLive?'0 0 6px rgba(239,68,68,.6)':'none',
                    transition:'all .3s'}}/>
                ))}
              </div>
            )}
            {/* 개수 텍스트: 라운드 1,2 공개 중에만 표시 */}
            {gs.revealVisible&&gs.round<3&&(
              <div style={{fontSize:'.63rem',color:'#5a6a4a'}}>🔴 {gs.live} | ⚪ {gs.blank} | 남은 {gs.ch.length}발</div>
            )}
            {gs.revealVisible&&gs.round===3&&(
              <div style={{fontSize:'.62rem',color:'#f59e0b'}}>⚠ 탄환 정보 비공개</div>
            )}
            {!gs.revealVisible&&(
              <div style={{fontSize:'.63rem',color:'#3a4a3a'}}>— 정보 숨겨짐 —</div>
            )}
            {gs.knownBullet&&<div style={{fontSize:'.62rem',color:gs.knownBullet.isLive?'#f87171':'#818cf8',marginTop:2}}>▲ 현재: {gs.knownBullet.isLive?'🔴실탄':'⚪공탄'}</div>}
          </div>

          {/* Stats */}
          <div style={{textAlign:'right',minWidth:60,fontSize:'.65rem',color:'#5a6a4a'}}>
            <div style={{fontFamily:"'Cinzel',serif",fontSize:'.68rem',color:'#c9a84c',fontWeight:700,marginBottom:2}}>R{gs.round}</div>
            <div>장전 {gs.reload}회</div>
            {gs.revealVisible&&gs.round<3&&(
              <div style={{color:liveProb>0.6?'#f87171':liveProb>0.35?'#f59e0b':'#34d399',marginTop:2,fontWeight:700}}>
                실탄 {Math.round(liveProb*100)}%
              </div>
            )}
          </div>
        </div>

        {/* Event log */}
        <div style={{minHeight:54,display:'flex',flexDirection:'column',gap:2}}>
          {log.slice(-3).map(l=>(
            <div key={l.id} style={{fontSize:'.7rem',padding:'3px 7px',borderRadius:5,
              background:l.type==='hit'?'rgba(248,113,113,.1)':l.type==='blank'?'rgba(129,140,248,.08)':l.type==='reload'?'rgba(245,158,11,.08)':l.type==='warn'?'rgba(251,146,60,.08)':'rgba(255,255,255,.04)',
              color:logColors[l.type]||'#7a8a6a',animation:'fadeIn .2s ease'}}>
              {l.text}
            </div>
          ))}
        </div>
      </div>

      {/* ── PLAYER ZONE (bottom) ── */}
      <div style={{background:'rgba(4,12,8,.88)',border:'1px solid rgba(52,211,153,.15)',borderRadius:'0 0 12px 12px',padding:'12px 14px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
          <div>
            <div style={{fontFamily:"'Cinzel',serif",fontSize:'.62rem',letterSpacing:'.14em',color:'#34d399',marginBottom:5}}>
              👤 나 {isPlayerTurn?'— 내 차례':''}
            </div>
            <HPBar hp={gs.pHP} max={gs.pMax} color='#34d399'/>
            <div style={{fontSize:'.65rem',color:'#3a6a4a',marginTop:3}}>{gs.pHP} / {gs.pMax} HP</div>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:4,alignItems:'flex-end'}}>
            {gs.pCuffed&&<div style={{fontSize:'.72rem',color:'#f59e0b',padding:'3px 8px',borderRadius:6,background:'rgba(245,158,11,.1)',border:'1px solid rgba(245,158,11,.2)'}}>🔗 수갑</div>}
            {gs.round===3&&(
              <div style={{fontSize:'.62rem',padding:'2px 7px',borderRadius:5,
                background:gs.pDefiUsed||gs.pDefiLocked?'rgba(248,113,113,.08)':'rgba(52,211,153,.08)',
                border:`1px solid ${gs.pDefiUsed||gs.pDefiLocked?'rgba(248,113,113,.2)':'rgba(52,211,153,.2)'}`,
                color:gs.pDefiUsed||gs.pDefiLocked?'#f87171':'#34d399'}}>
                ⚡ {gs.pDefiUsed?'사용됨':gs.pDefiLocked?'비활성':'대기'}
              </div>
            )}
          </div>
        </div>

        {/* Player items */}
        <div style={{display:'flex',gap:5,flexWrap:'wrap',marginBottom:10,position:'relative'}}>
          {gs.pItems.map((item,i)=>(
            <div key={i} style={{position:'relative'}}>
              <button onClick={()=>useItem(item)} disabled={!isPlayerTurn||thinking}
                onMouseEnter={()=>setHovItem(i)} onMouseLeave={()=>setHovItem(null)}
                style={{width:40,height:40,borderRadius:8,border:'1px solid rgba(52,211,153,.2)',background:'rgba(20,40,25,.85)',fontSize:'1.25rem',cursor:isPlayerTurn&&!thinking?'pointer':'default',transition:'all .15s',outline:'none',boxShadow:isPlayerTurn&&!thinking?'0 2px 6px rgba(0,0,0,.4)':'none',opacity:isPlayerTurn&&!thinking?1:.55}}>
                {BSI[item].e}
              </button>
              {hovItem===i&&(
                <div style={{position:'absolute',bottom:'110%',left:'50%',transform:'translateX(-50%)',background:'rgba(0,0,0,.92)',border:'1px solid rgba(180,140,40,.3)',borderRadius:7,padding:'5px 9px',fontSize:'.68rem',color:'#e0d4b0',whiteSpace:'nowrap',zIndex:100,pointerEvents:'none'}}>
                  <strong style={{color:'#c9a84c'}}>{BSI[item].n}</strong><br/>{BSI[item].d}
                </div>
              )}
            </div>
          ))}
          {Array(Math.max(0,8-gs.pItems.length)).fill(0).map((_,i)=>(
            <div key={`ep${i}`} style={{width:40,height:40,borderRadius:8,border:'1px dashed rgba(52,211,153,.08)',background:'rgba(52,211,153,.02)'}}/>
          ))}
        </div>

        {/* Action buttons */}
        {isPlayerTurn&&!thinking&&(
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
            <button onClick={()=>playerShoot('dealer')}
              style={{padding:'12px 8px',background:'linear-gradient(135deg,#6a1008,#c02020,#6a1008)',border:'none',borderRadius:9,fontFamily:"'Cinzel',serif",fontWeight:700,fontSize:'.82rem',color:'#ffe0d0',cursor:'pointer',letterSpacing:'.04em',boxShadow:'0 3px 10px rgba(180,20,20,.3)'}}>
              🔫 딜러 공격
            </button>
            <button onClick={()=>playerShoot('player')}
              style={{padding:'12px 8px',background:'linear-gradient(135deg,#202008,#606018,#202008)',border:'none',borderRadius:9,fontFamily:"'Cinzel',serif",fontWeight:700,fontSize:'.82rem',color:'#e8d870',cursor:'pointer',letterSpacing:'.04em',boxShadow:'0 3px 10px rgba(100,100,10,.2)'}}>
              🔫 자신 공격
            </button>
          </div>
        )}
        {(!isPlayerTurn||thinking)&&(
          <div style={{textAlign:'center',padding:'12px 0',fontSize:'.78rem',color:'#3a5040'}}>
            <span style={{display:'inline-block',width:6,height:6,borderRadius:'50%',background:'#f87171',marginRight:6,animation:'pulse 1.2s infinite'}}/>
            딜러 행동 중...
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// ROOT APP
// ══════════════════════════════════════════════════════
export default function App() {
  const [screen,   setScreen]   = useState('hub');
  const [gameId,   setGameId]   = useState(null);
  const [pid]                   = useState(makePid);
  const [name,     setName]     = useState('');
  const [roomId,   setRoomId]   = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [err,      setErr]      = useState('');
  const [joining,  setJoining]  = useState(false);
  const [solo,     setSolo]     = useState(null);
  const [multi,    setMulti]    = useState(null);

  const skey = roomId&&gameId ? `yst-${gameId}-${roomId}` : null;

  const syncM=useCallback(async()=>{ if(!skey) return; const v=await stGet(skey); if(v) setMulti(v); },[skey]);
  const writeM=useCallback(async(st)=>{ if(!skey) return; await stSet(skey,st); setMulti(st); },[skey]);
  const readM=useCallback(()=>skey?stGet(skey):Promise.resolve(null),[skey]);

  useEffect(()=>{ if(!skey) return; syncM(); const t=setInterval(syncM,POLL); return ()=>clearInterval(t); },[syncM,skey]);
  useEffect(()=>{
    if(screen==='multi-lobby'&&['catselect','playing','reveal','discuss'].includes(multi?.phase)) setScreen('playing');
  },[multi?.phase,screen]);

  // Solo Yacht
  const startSoloYacht=()=>{ if(!name.trim()) return; setSolo({gameId:'yacht',phase:'playing',players:[{id:'solo',name:name.trim(),scores:{}}],currentPlayerIndex:0,dice:yNewDice(),held:yNoHeld(),rollsLeft:3}); setScreen('playing'); };
  const soloYachtRoll=()=>setSolo(g=>({...g,dice:g.dice.map((v,i)=>g.held[i]?v:d6()),rollsLeft:g.rollsLeft-1}));
  const soloYachtHold=(i)=>setSolo(g=>{const h=[...g.held];h[i]=!h[i];return{...g,held:h};});
  const soloYachtScore=(id)=>setSolo(g=>{const pts=yScore(id,g.dice),np=[{...g.players[0],scores:{...g.players[0].scores,[id]:pts}}],over=Y_CATS.every(c=>np[0].scores[c.id]!==undefined);return{...g,players:np,phase:over?'finished':'playing',dice:yNewDice(),held:yNoHeld(),rollsLeft:3};});

  // Multi: create
  const createRoom=async()=>{
    if(!name.trim()) return;
    const id=makeRoom(),key=`yst-${gameId}-${id}`;
    const st={gameId,phase:'lobby',host:pid,players:[{id:pid,name:name.trim(),scores:{}}],currentPlayerIndex:0,dice:yNewDice(),held:yNoHeld(),rollsLeft:3};
    const ok=await stSet(key,st);
    if(!ok){setErr('방 생성에 실패했습니다.');return;}
    setRoomId(id); setMulti(st); setErr(''); setScreen('multi-lobby');
  };

  // Multi: join (with retries)
  const joinRoom=async()=>{
    if(!name.trim()||!joinCode.trim()) return;
    const id=joinCode.trim().toUpperCase(); setJoining(true); setErr('');
    const key=`yst-${gameId}-${id}`,cur=await stGetRetry(key,4); setJoining(false);
    if(!cur){setErr('방을 찾을 수 없습니다. 코드를 다시 확인하세요.');return;}
    if(cur.phase!=='lobby'){setErr('이미 게임이 시작된 방입니다.');return;}
    const maxP=GAME_LIST.find(g=>g.id===gameId)?.max||4;
    if(cur.players.length>=maxP){setErr('방이 가득 찼습니다.');return;}
    if(!cur.players.find(p=>p.id===pid)){
      const updated={...cur,players:[...cur.players,{id:pid,name:name.trim(),scores:{}}]};
      await stSet(key,updated); setMulti(updated);
    } else setMulti(cur);
    setRoomId(id); setErr(''); setScreen('multi-lobby');
  };

  const startMultiYacht=async()=>{ const cur=await readM(); if(!cur||cur.host!==pid) return; await writeM({...cur,phase:'playing',dice:yNewDice(),held:yNoHeld(),rollsLeft:3}); setScreen('playing'); };
  const startMultiLiar=async()=>{ const cur=await readM(); if(!cur||cur.host!==pid) return; await writeM({...cur,phase:'catselect'}); setScreen('playing'); };
  const multiYachtRoll=async()=>{ const cur=await readM(); if(!cur||cur.players[cur.currentPlayerIndex]?.id!==pid) return; await writeM({...cur,dice:cur.dice.map((v,i)=>cur.held[i]?v:d6()),rollsLeft:cur.rollsLeft-1}); };
  const multiYachtHold=async(i)=>{ const cur=await readM(); if(!cur||cur.players[cur.currentPlayerIndex]?.id!==pid) return; const h=[...cur.held];h[i]=!h[i];await writeM({...cur,held:h}); };
  const multiYachtScore=async(id)=>{ const cur=await readM(); if(!cur) return; const pi=cur.players.findIndex(p=>p.id===pid); if(pi<0||cur.players[pi].scores[id]!==undefined) return; const pts=yScore(id,cur.dice),np=cur.players.map((p,i)=>i===pi?{...p,scores:{...p.scores,[id]:pts}}:p),over=yGameOver(np),next=(cur.currentPlayerIndex+1)%cur.players.length; await writeM({...cur,players:np,phase:over?'finished':'playing',currentPlayerIndex:over?cur.currentPlayerIndex:next,dice:yNewDice(),held:yNoHeld(),rollsLeft:3}); };
  const leaveRoom=async()=>{ if(skey) await stDel(skey); setMulti(null); setRoomId(''); setJoinCode(''); setScreen('game-select'); };
  const resetAndExit=()=>{ setSolo(null); setMulti(null); setRoomId(''); setJoinCode(''); setScreen('game-select'); };

  const card={background:'rgba(18,32,16,.75)',border:'1px solid rgba(180,140,40,.18)',borderRadius:14,padding:20,backdropFilter:'blur(10px)'};
  const inp={background:'rgba(0,0,0,.4)',border:'1px solid rgba(180,140,40,.25)',borderRadius:8,color:'#e8dcc8',padding:'10px 14px',fontFamily:"'Rajdhani',sans-serif",fontSize:'.95rem',outline:'none',width:'100%'};
  const btnG={padding:'10px 22px',background:'linear-gradient(135deg,#9a7000,#f0c040,#9a7000)',border:'none',borderRadius:9,fontFamily:"'Cinzel',serif",fontWeight:700,fontSize:'.82rem',color:'#0c0900',cursor:'pointer',letterSpacing:'.05em'};
  const btnO={padding:'9px 18px',background:'transparent',border:'1px solid rgba(180,140,40,.3)',borderRadius:9,fontFamily:"'Cinzel',serif",fontWeight:700,fontSize:'.8rem',color:'#9a8a6a',cursor:'pointer'};
  const sLbl={fontFamily:"'Cinzel',serif",fontSize:'.63rem',letterSpacing:'.18em',textTransform:'uppercase',color:'#5a6a4a'};
  const curGame=GAME_LIST.find(g=>g.id===gameId);

  return (
    <div style={{minHeight:'100vh',padding:'12px 10px',background:'radial-gradient(ellipse 100% 55% at 50% 0%,#1a3318 0%,#060c06 65%)',fontFamily:"'Rajdhani',sans-serif",color:'#e8dcc8'}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&family=Rajdhani:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:#060c06;}
        ::-webkit-scrollbar{width:4px;height:4px;}::-webkit-scrollbar-track{background:transparent;}::-webkit-scrollbar-thumb{background:#3a4a3a;border-radius:2px;}
        @keyframes diceRoll{0%{transform:rotateX(0) rotateY(0) rotateZ(0);}15%{transform:rotateX(180deg) rotateY(90deg) rotateZ(45deg);}30%{transform:rotateX(90deg) rotateY(270deg) rotateZ(90deg);}45%{transform:rotateX(270deg) rotateY(180deg) rotateZ(200deg);}60%{transform:rotateX(360deg) rotateY(360deg) rotateZ(270deg);}75%{transform:rotateX(180deg) rotateY(450deg) rotateZ(310deg);}100%{transform:rotateX(540deg) rotateY(630deg) rotateZ(360deg);}}
        @keyframes yflash{0%,100%{opacity:0;transform:scale(.5);}15%,85%{opacity:1;transform:scale(1.05);}50%{transform:scale(1);}}
        @keyframes bsFlash{0%{opacity:.9;}100%{opacity:0;}}
        @keyframes dealerPulse{0%{transform:scale(1);}100%{transform:scale(1.12);}}
        @keyframes pulse{0%,100%{opacity:1;}50%{opacity:.4;}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:translateY(0);}}
      `}</style>

      {/* Header */}
      <div style={{textAlign:'center',marginBottom:14}}>
        <div onClick={()=>setScreen('hub')} style={{fontFamily:"'Cinzel',serif",fontSize:'clamp(1.6rem,5.5vw,2.6rem)',fontWeight:900,letterSpacing:'.08em',background:'linear-gradient(135deg,#a07010,#ffd700,#daa520,#f0c040,#a07010)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text',lineHeight:1,cursor:'pointer'}}>
          Y's Table
        </div>
        <div style={{fontSize:'.65rem',letterSpacing:'.3em',textTransform:'uppercase',color:'#3a5030',marginTop:2}}>
          {curGame&&screen!=='hub'&&screen!=='game-select'?`${curGame.emoji} ${curGame.name}`:'Game Platform'}
        </div>
      </div>

      {/* HUB */}
      {screen==='hub'&&(
        <div style={{maxWidth:420,margin:'0 auto',animation:'fadeIn .3s ease'}}>
          <div style={card}>
            <div style={{...sLbl,textAlign:'center',marginBottom:16}}>어떤 게임을 플레이할까요?</div>
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {GAME_LIST.map(g=>(
                <div key={g.id} onClick={()=>{setGameId(g.id);setScreen('game-select');}} style={{padding:'16px 18px',borderRadius:12,border:'1px solid rgba(180,140,40,.15)',background:'rgba(0,0,0,.22)',cursor:'pointer',display:'flex',alignItems:'center',gap:14}}>
                  <div style={{fontSize:'2rem',lineHeight:1,flexShrink:0}}>{g.emoji}</div>
                  <div style={{flex:1}}>
                    <div style={{fontFamily:"'Cinzel',serif",fontSize:'.95rem',fontWeight:700,color:'#c9a84c'}}>{g.name}</div>
                    <div style={{fontSize:'.72rem',color:'#5a6a4a',marginTop:3}}>{g.desc}</div>
                  </div>
                  <div style={{color:'#3a4a3a',fontSize:'1.1rem'}}>›</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* GAME SELECT */}
      {screen==='game-select'&&curGame&&(
        <div style={{maxWidth:380,margin:'0 auto',animation:'fadeIn .3s ease'}}>
          <div style={card}>
            <div style={{...sLbl,marginBottom:12}}>{curGame.emoji} {curGame.name}</div>
            {curGame.id==='buckshot' ? (
              <div style={{textAlign:'center',padding:'16px 0'}}>
                <div style={{fontSize:'.82rem',color:'#7a6a5a',marginBottom:16,lineHeight:1.7}}>AI 딜러와 1대1 전략 대결.<br/>멀티플레이 미지원 — 솔로 전용</div>
                <button onClick={()=>setScreen('playing')} style={{...btnG,padding:'13px 36px',background:'linear-gradient(135deg,#6a1c0c,#c03020,#6a1c0c)',color:'#ffe0d0'}}>🔫 AI 대전 시작</button>
              </div>
            ) : (
              <div style={{display:'grid',gridTemplateColumns:curGame.min>1?'1fr':'1fr 1fr',gap:10,marginBottom:10}}>
                {curGame.min===1&&(
                  <div onClick={()=>setScreen('solo-setup')} style={{padding:'20px 12px',borderRadius:11,border:'1px solid rgba(180,140,40,.15)',background:'rgba(0,0,0,.22)',cursor:'pointer',textAlign:'center'}}>
                    <div style={{fontSize:'1.8rem',lineHeight:1,marginBottom:6}}>🎲</div>
                    <div style={{fontFamily:"'Cinzel',serif",fontSize:'.88rem',fontWeight:700,color:'#c9a84c',marginBottom:3}}>1인 모드</div>
                    <div style={{fontSize:'.7rem',color:'#5a6a4a'}}>혼자서 플레이</div>
                  </div>
                )}
                <div onClick={()=>setScreen('multi-setup')} style={{padding:'20px 12px',borderRadius:11,border:'1px solid rgba(180,140,40,.15)',background:'rgba(0,0,0,.22)',cursor:'pointer',textAlign:'center'}}>
                  <div style={{fontSize:'1.8rem',lineHeight:1,marginBottom:6}}>👥</div>
                  <div style={{fontFamily:"'Cinzel',serif",fontSize:'.88rem',fontWeight:700,color:'#c9a84c',marginBottom:3}}>멀티플레이</div>
                  <div style={{fontSize:'.7rem',color:'#5a6a4a'}}>최대 {curGame.max}인</div>
                </div>
              </div>
            )}
            <button style={{...btnO,marginTop:curGame.id==='buckshot'?12:0}} onClick={()=>setScreen('hub')}>← 뒤로</button>
          </div>
        </div>
      )}

      {/* SOLO SETUP */}
      {screen==='solo-setup'&&curGame&&(
        <div style={{maxWidth:340,margin:'0 auto',animation:'fadeIn .3s ease'}}>
          <div style={card}>
            <div style={{...sLbl,marginBottom:10}}>1인 모드 — {curGame.name}</div>
            <input style={inp} placeholder="닉네임 입력" value={name} maxLength={12} onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&startSoloYacht()}/>
            <div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:12}}>
              <button style={btnO} onClick={()=>setScreen('game-select')}>뒤로</button>
              <button style={{...btnG,opacity:name.trim()?1:.4}} onClick={startSoloYacht} disabled={!name.trim()}>시작!</button>
            </div>
          </div>
        </div>
      )}

      {/* MULTI SETUP */}
      {screen==='multi-setup'&&curGame&&(
        <div style={{maxWidth:360,margin:'0 auto',animation:'fadeIn .3s ease'}}>
          <div style={card}>
            <div style={{...sLbl,marginBottom:10}}>멀티플레이 — {curGame.name}</div>
            <input style={inp} placeholder="내 닉네임" value={name} maxLength={12} onChange={e=>setName(e.target.value)}/>
            <button style={{...btnG,width:'100%',padding:'11px',marginTop:10,opacity:name.trim()?1:.4}} onClick={createRoom} disabled={!name.trim()}>🏠 방 만들기</button>
            <div style={{borderTop:'1px solid rgba(180,140,40,.1)',margin:'12px 0'}}/>
            <div style={{fontSize:'.78rem',color:'#5a6a4a',marginBottom:7}}>또는 방 코드로 입장:</div>
            <div style={{display:'flex',gap:7}}>
              <input style={{...inp,flex:1,letterSpacing:'.15em',fontFamily:"'Cinzel',serif",textTransform:'uppercase'}} placeholder="코드 6자리" value={joinCode} maxLength={6} onChange={e=>setJoinCode(e.target.value.toUpperCase())} onKeyDown={e=>e.key==='Enter'&&joinRoom()}/>
              <button style={{...btnO,padding:'10px 14px',opacity:(name.trim()&&joinCode.length>=6&&!joining)?1:.4}} onClick={joinRoom} disabled={!name.trim()||joinCode.length<6||joining}>{joining?'..':'입장'}</button>
            </div>
            {err&&<p style={{color:'#f87171',fontSize:'.78rem',marginTop:7}}>{err}</p>}
            {joining&&<p style={{color:'#5a8a6a',fontSize:'.78rem',marginTop:5}}>방을 찾는 중... (최대 4회 시도)</p>}
            <div style={{marginTop:12}}><button style={btnO} onClick={()=>setScreen('game-select')}>뒤로</button></div>
          </div>
        </div>
      )}

      {/* MULTI LOBBY */}
      {screen==='multi-lobby'&&multi&&(
        <div style={{maxWidth:360,margin:'0 auto',animation:'fadeIn .3s ease'}}>
          <div style={card}>
            <div style={{...sLbl,marginBottom:10}}>대기실 — {curGame?.name}</div>
            <RoomLobby roomId={roomId} game={multi} myPid={pid} gameMinPlayers={curGame?.min||1} onStart={gameId==='liar'?startMultiLiar:startMultiYacht} onLeave={leaveRoom}/>
          </div>
        </div>
      )}

      {/* PLAYING: Solo Yacht */}
      {screen==='playing'&&solo?.gameId==='yacht'&&solo.phase==='playing'&&(
        <YachtBoard game={solo} myPid="solo" isSolo={true} onRoll={soloYachtRoll} onHold={soloYachtHold} onScore={soloYachtScore} onReset={resetAndExit}/>
      )}
      {screen==='playing'&&solo?.gameId==='yacht'&&solo.phase==='finished'&&(
        <YachtResults game={solo} onReset={resetAndExit}/>
      )}

      {/* PLAYING: Multi Yacht */}
      {screen==='playing'&&multi?.gameId==='yacht'&&multi.phase==='playing'&&(
        <YachtBoard game={multi} myPid={pid} isSolo={false} onRoll={multiYachtRoll} onHold={multiYachtHold} onScore={multiYachtScore} onReset={leaveRoom}/>
      )}
      {screen==='playing'&&multi?.gameId==='yacht'&&multi.phase==='finished'&&(
        <YachtResults game={multi} onReset={leaveRoom}/>
      )}

      {/* PLAYING: Multi Liar */}
      {screen==='playing'&&multi?.gameId==='liar'&&(
        <LiarGame roomId={roomId} myPid={pid} initialGame={multi} onExit={()=>{leaveRoom();setScreen('hub');}}/>
      )}

      {/* PLAYING: Buckshot (solo AI) */}
      {screen==='playing'&&gameId==='buckshot'&&!solo&&!multi&&(
        <BuckshotGame onExit={()=>{setGameId(null);setScreen('game-select');}}/>
      )}

    </div>
  );
}
