
import {SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY} from './config.js';
import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';

const supabase=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{
  auth:{persistSession:true,autoRefreshToken:true}
});

const root=document.getElementById('app');
let state=null,view='home',mode='welcome',session=null;
let loading=false,notice='',pairCode='';

const h=s=>String(s??'').replace(/[&<>"']/g,c=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[c]));

const dateLabel=()=>new Date().toLocaleDateString('en-US',{
  weekday:'long',month:'short',day:'numeric'
});

function say(){
  if(!('speechSynthesis' in window)){
    toast('Voice not supported on this device');
    return;
  }
  speechSynthesis.cancel();
  const u=new SpeechSynthesisUtterance(
    'Hiii Zayd! What chores have you done so far today? Let’s earn some stars together!'
  );
  u.rate=.88;
  u.pitch=1.22;
  u.lang='en-US';
  speechSynthesis.speak(u);
}

function confetti(){
  const e=document.createElement('div');
  e.className='confetti';
  for(let i=0;i<65;i++){
    const p=document.createElement('i');
    p.style.left=Math.random()*100+'%';
    p.style.background=['#ffbf5d','#8b6de7','#ff7ca8','#63d7b0'][i%4];
    p.style.animationDelay=Math.random()*.7+'s';
    e.appendChild(p);
  }
  document.body.appendChild(e);
  setTimeout(()=>e.remove(),3500);
}

function toast(s){
  notice=s;
  render();
  setTimeout(()=>{
    if(notice===s){
      notice='';
      render();
    }
  },4500);
}

async function call(action,params={}){
  const map={
    state:['hd_state',{}],
    complete:['hd_complete',{p_chore:params.choreId}],
    undo:['hd_undo_chore',{p_chore:params.choreId}],
    request:['hd_request',{}],
    bonus:['hd_bonus',{
      p_reason:params.reason,
      p_amount:params.amount
    }],
    'pair-code':['hd_pair_code',{}],
    pair:['hd_pair',{p_code:params.code}],
    redeem:['hd_redeem',{}],
    'request-update':['hd_request_update',{
      p_id:params.id,
      p_status:params.status,
      p_description:params.description||null
    }],
    settings:['hd_settings',{p_cost:params.rewardCost}],
    'add-chore':['hd_add_chore',{
      p_title:params.title,
      p_routine:params.routine
    }],
    'remove-chore':['hd_remove_chore',{
      p_chore:params.choreId
    }]
  };

  if(!map[action])throw Error('Unknown action');

  const [fn,args]=map[action];
  const {data,error}=await supabase.rpc(fn,args);

  if(error)throw Error(error.message);
  return action==='pair-code'?{code:data}:data;
}

async function refresh(){
  try{
    state=await call('state');
    render();
  }catch(e){
    toast(e.message);
  }
}

async function act(action,params={}){
  if(loading)return;
  loading=true;
  try{
    await call(action,params);
    await refresh();
  }catch(e){
    toast(e.message);
  }finally{
    loading=false;
  }
}

function button(label,action,cls='btn full'){
  return `<button class="${cls}" data-action="${action}">${label}</button>`;
}

function welcome(){
  return `
  <div class="welcome">
    <div class="mascot">🌞</div>
    <div class="eyebrow" style="color:#9470e8">
      A little magic every day
    </div>
    <h1>Hi, Zayd! 👋</h1>
    <p>What chores have you done so far today?</p>
    <button class="voice" data-action="speak">
      🔊 Hear my greeting
    </button>
    <div class="actions">
      ${button('Let’s go! 🚀','start')}
      ${button('I’m a parent 🔐','parent-login','btn secondary full')}
    </div>
    <p class="tiny">
      Parents: pair this device once to save Zayd’s stars securely.
    </p>
  </div>`;
}

function header(){
  return `
  <div class="header">
    <div class="logo">🌈 My <span>Happy Day</span></div>
    <button class="round" data-action="speak" aria-label="Hear greeting">🔊</button>
  </div>`;
}

function taskCard(c){
  const done=state.completed.includes(c.id);
  return `
  <button class="task ${done?'done':''}"
    data-action="complete"
    data-id="${h(c.id)}"
    ${done?'disabled':''}>
    <span class="emoji">${h(c.emoji)}</span>
    <span class="name">${h(c.title)}</span>
    <span class="check">${done?'✓':''}</span>
  </button>`;
}

function kidHome(){
  const completed=state.chores.filter(
    c=>state.completed.includes(c.id)
  ).length;
  const all=state.chores.length>0&&completed===state.chores.length;
  const unlocked=state.stars>=state.rewardCost;

  return `
  ${header()}
  <section class="hero">
    <div class="eyebrow">${dateLabel()}</div>
    <h1>Hey, Zayd! 👋</h1>
    <p>What chores have you done so far?</p>
    <div class="pill">
      ✨ ${completed} of ${state.chores.length} chores done today
    </div>
  </section>

  <section class="stars">
    <div class="starhead">
      <div>
        <h3>⭐ My Star Bank</h3>
        <div class="small">Your next amazing reward</div>
      </div>
      <div class="starcount">${state.stars}/${state.rewardCost}</div>
    </div>
    <div class="bar">
      <div style="width:${Math.min(100,state.stars/state.rewardCost*100)}%"></div>
    </div>
    <div class="small">
      ${unlocked?'You unlocked a special treat! 🎉':
        `${state.rewardCost-state.stars} more stars to go! Keep shining!`}
    </div>
  </section>

  ${all?`
    <div class="banner">
      <strong>🎉 YOU DID IT! 🎉</strong>
      Awesome work today, Zayd! 🌟
    </div>`:''}

  ${unlocked?`
    <div class="banner reward">
      <div class="reward-art">🍫</div>
      <strong>Kinder Bueno Mini!</strong>
      You earned your reward! Ask a parent to approve it.
    </div>`:''}

  <div class="section-title">
    <h2>☀️ Good Morning!</h2>
    <span class="chip">Rise & shine</span>
  </div>
  ${state.chores.filter(c=>c.routine==='morning').map(taskCard).join('')}

  <div class="section-title">
    <h2>🌙 Evening Magic</h2>
    <span class="chip">Wind down</span>
  </div>
  ${state.chores.filter(c=>c.routine==='evening').map(taskCard).join('')}

  <div class="actions">
    ${button('🙋 Ask for an Extra Chore','request','btn secondary full')}
    ${button('🔊 Say Hi, Zayd!','speak','btn outline full')}
  </div>
  ${bottom('home')}`;
}

function kidRewards(){
  return `
  ${header()}
  <div class="hero">
    <div class="eyebrow">Your rewards</div>
    <h1>Star Power! ⭐</h1>
    <p>Every good deed counts.</p>
  </div>
  <div class="card" style="text-align:center">
    <div style="font-size:64px">🌟</div>
    <h1>${state.stars} / ${state.rewardCost}</h1>
    <div class="bar">
      <div style="width:${Math.min(100,state.stars/state.rewardCost*100)}%"></div>
    </div>
    <p class="muted">
      ${state.stars>=state.rewardCost?
        '🍫 Your Kinder Bueno Mini is unlocked!':
        'Keep going, superstar!'}
    </p>
  </div>
  ${state.stars>=state.rewardCost?`
    <div class="banner reward">
      <div class="reward-art">🍫</div>
      <strong>Kinder Bueno Mini!</strong>
      Parent approval needed
    </div>`:''}
  ${bottom('rewards')}`;
}

function bottom(active){
  return `
  <nav class="bottom">
    <button class="${active==='home'?'active':''}" data-action="nav-home">
      🏠<br>Chores
    </button>
    <button class="${active==='rewards'?'active':''}" data-action="nav-rewards">
      ⭐<br>Rewards
    </button>
    <button data-action="parent-login">
      🔐<br>Parents
    </button>
  </nav>`;
}

function login(){
  return `
  ${header()}
  <div class="welcome" style="padding-top:30px">
    <div class="mascot">🔐</div>
    <h1>Parent Portal</h1>
    <p>Sign in to manage Zayd’s stars.</p>
    <form id="loginForm" class="stack">
      <label class="label">Email
        <input class="field" type="email" name="email"
          required autocomplete="email" placeholder="Parent email">
      </label>
      <label class="label">Password
        <input class="field" type="password" name="password"
          required autocomplete="current-password" placeholder="Password">
      </label>
      <button class="btn full" type="submit">Sign In ✨</button>
    </form>
    <div class="actions">
      ${button('Back to Zayd','back','btn secondary full')}
    </div>
  </div>`;
}

function pair(){
  return `
  ${header()}
  <div class="welcome">
    <div class="mascot">📱</div>
    <h1>One-time Setup</h1>
    <p>Ask a parent to generate a pairing code in their dashboard.</p>
    <form id="pairForm">
      <label class="label">6-digit code
        <input class="field" name="code" maxlength="6"
          inputmode="numeric" pattern="[0-9]{6}"
          placeholder="123456" required>
      </label>
      <button class="btn full">Connect Zayd’s Device ⭐</button>
    </form>
    <div class="actions">
      ${button('Parent Sign In','parent-login','btn secondary full')}
    </div>
  </div>`;
}

function parentDashboard(){
  const pending=state.requests.filter(x=>x.status==='pending');
  const isAdmin=state.role==='admin';

  return `
  ${header()}
  <div class="hero">
    <div class="eyebrow">
      ${isAdmin?'👑 Admin':'👨‍👩‍👦 Parent'} Dashboard
    </div>
    <h1>Zayd’s Progress ⭐</h1>
    <p>Celebrate kindness, effort and helping out!</p>
  </div>

  <div class="card grid2">
    <div class="stat"><b>${state.stars}</b>Stars saved</div>
    <div class="stat">
      <b>${state.completed.length}/${state.chores.length}</b>
      Today’s chores
    </div>
  </div>

  <div class="card">
    <h3>↩️ Undo a Completed Chore</h3>
    <p class="small">
      If Zayd tapped a chore by mistake, undo it here.
      The chore becomes available again.
    </p>
    ${state.chores.filter(c=>state.completed.includes(c.id)).map(c=>`
      <div class="row listrow">
        <span>${h(c.emoji)} ${h(c.title)} (${h(c.routine)})</span>
        <button class="btn outline"
          data-action="undo-chore"
          data-id="${h(c.id)}">
          ↩️ Undo
        </button>
      </div>
    `).join('')||'<p class="small">No chores completed today.</p>'}
  </div>

  <div class="card">
    <h3>⭐ Give Bonus Stars</h3>
    <p class="small">For kindness, helping, or extra effort.</p>
    <form id="bonusForm">
      <label class="label">Reason
        <select class="field" name="reason">
          <option>Being kind ❤️</option>
          <option>Helping someone 🤝</option>
          <option>Extra chore 🧹</option>
          <option>Great behaviour 🌟</option>
        </select>
      </label>
      <label class="label">Stars
        <select class="field" name="amount">
          <option value="1">1 star</option>
          <option value="2">2 stars</option>
          <option value="3">3 stars</option>
        </select>
      </label>
      <button class="btn full">Give Bonus Stars ⭐</button>
    </form>
  </div>

  <div class="card">
    <h3>🙋 Extra Chore Requests</h3>
    ${pending.length?pending.map(r=>`
      <div class="listrow">
        <b>Zayd wants another chore!</b>
        <p class="small">${new Date(r.created_at).toLocaleString()}</p>
        <button class="btn secondary" data-action="request-assign"
          data-id="${h(r.id)}">Assign</button>
        <button class="btn outline" data-action="request-complete"
          data-id="${h(r.id)}">Mark Done +1 ⭐</button>
      </div>
    `).join(''):'<p class="small">No pending requests right now.</p>'}

    ${state.requests.filter(x=>x.status==='assigned').map(r=>`
      <div class="listrow">
        ${h(r.description)}
        <button class="btn secondary" data-action="request-complete"
          data-id="${h(r.id)}">Done +1 ⭐</button>
      </div>
    `).join('')}
  </div>

  <div class="card">
    <h3>🍫 Kinder Bueno Reward</h3>
    <p class="small">
      ${state.stars} of ${state.rewardCost} stars collected.
    </p>
    ${button(
      'Approve Reward — Spend '+state.rewardCost+' ⭐',
      'redeem',
      `btn full ${state.stars<state.rewardCost?'disabled':''}`
    )}
  </div>

  <div class="card">
    <h3>📲 Connect Zayd’s Device</h3>
    <p class="small">
      Generate a one-time code valid for 10 minutes.
      Enter it on Zayd’s iPad.
    </p>
    ${button('Generate Pairing Code','pair-code','btn secondary full')}
    ${pairCode?`
      <h1 style="text-align:center;letter-spacing:5px">
        ${h(pairCode)}
      </h1>`:''}
  </div>

  ${isAdmin?`
    <div class="card">
      <h3>👑 Admin Settings</h3>
      <form id="settingsForm">
        <label class="label">Stars needed for a reward
          <input class="field" type="number" min="1" max="1000"
            name="cost" value="${state.rewardCost}" required>
        </label>
        <button class="btn secondary full">Save Star Goal</button>
      </form>
      <div class="divider"></div>
      <form id="choreForm">
        <label class="label">New Chore
          <input class="field" name="title" maxlength="70"
            required placeholder="Help set the table">
        </label>
        <select class="field" name="routine">
          <option value="morning">Morning</option>
          <option value="evening">Evening</option>
        </select>
        <button class="btn secondary full">Add Chore</button>
      </form>
      <div class="divider"></div>
      ${state.chores.map(c=>`
        <div class="row listrow">
          <span>${h(c.emoji)} ${h(c.title)} (${h(c.routine)})</span>
          <button class="btn outline" data-action="remove-chore"
            data-id="${h(c.id)}">Remove</button>
        </div>
      `).join('')}
    </div>`:''}

  <div class="card">
    <h3>📜 Recent Star Activity</h3>
    ${(state.ledger||[]).map(l=>`
      <div class="row listrow">
        <span>${h(l.reason)}</span>
        <b>${l.delta>0?'+':''}${l.delta} ⭐</b>
      </div>
    `).join('')||'<p class="small">No activity yet.</p>'}
  </div>

  <div class="actions">
    ${button('Back to Zayd’s Chores','kid-mode','btn secondary full')}
    ${button('Sign Out','logout','btn outline full')}
  </div>`;
}

function render(){
  root.innerHTML=`
    <main class="shell">
      ${notice?`
        <div class="notice ${/error|fail|invalid|already|not |required|expired/i.test(notice)?'error':'success'}">
          ${h(notice)}
        </div>`:''}
      ${mode==='welcome'?welcome():
        mode==='pair'?pair():
        mode==='login'?login():
        mode==='parent'&&state?parentDashboard():
        state?(view==='rewards'?kidRewards():kidHome()):pair()}
    </main>`;
}

root.addEventListener('click',async e=>{
  const el=e.target.closest('[data-action]');
  if(!el)return;

  const a=el.dataset.action;
  const id=el.dataset.id;

  try{
    if(a==='speak')return say();

    if(a==='start'){
      mode=state?'child':'pair';
      render();
      if(mode==='child')await refresh();
      else say();
      return;
    }

    if(a==='parent-login'){
      mode=state?.role==='admin'||state?.role==='parent'?'parent':'login';
      render();
      if(mode==='parent')await refresh();
      return;
    }

    if(a==='back'){
      mode=session?'child':'welcome';
      render();
      return;
    }

    if(a==='nav-home'||a==='nav-rewards'){
      view=a==='nav-home'?'home':'rewards';
      render();
      return;
    }

    if(a==='kid-mode'){
      mode='child';
      render();
      await refresh();
      return;
    }

    if(a==='complete'){
      const wasDone=state?.completed.includes(id);
      await act('complete',{choreId:id});
      if(!wasDone&&state?.chores.length===state?.completed.length)
        confetti();
      return;
    }

    if(a==='request'){
      await act('request');
      toast('Your parent got your request! 🌟');
      return;
    }

    if(a==='pair-code'){
      const d=await call('pair-code');
      pairCode=d.code;
      render();
      return;
    }

    if(a==='redeem'){
      if(state.stars<state.rewardCost)return;
      if(confirm('Approve one Kinder Bueno Mini and deduct '+state.rewardCost+' stars?'))
        await act('redeem');
      return;
    }

    if(a==='request-assign'){
      const description=prompt(
        'What extra chore should Zayd do?',
        'Help set the table'
      );
      if(description)
        await act('request-update',{
          id,status:'assigned',description
        });
      return;
    }

    if(a==='request-complete'){
      await act('request-update',{id,status:'completed'});
      return;
    }

    // NEW: Parent can undo a completed chore.
    if(a==='undo-chore'){
      if(confirm('Undo this completed chore? One star will be deducted if available.')){
        await act('undo',{choreId:id});
        toast('Chore undone! ↩️');
      }
      return;
    }

    if(a==='remove-chore'){
      if(confirm('Remove this chore?'))
        await act('remove-chore',{choreId:id});
      return;
    }

    if(a==='logout'){
      await supabase.auth.signOut();
      session=null;
      state=null;
      mode='welcome';
      render();
      return;
    }
  }catch(err){
    toast(err.message);
  }
});

root.addEventListener('submit',async e=>{
  e.preventDefault();
  const f=e.target;
  const values=Object.fromEntries(new FormData(f));

  try{
    if(f.id==='loginForm'){
      const {data,error}=await supabase.auth.signInWithPassword({
        email:values.email,
        password:values.password
      });
      if(error)throw error;
      session=data.session;
      mode='parent';
      await refresh();
    }else if(f.id==='pairForm'){
      if(!session){
        const {data,error}=await supabase.auth.signInAnonymously();
        if(error)throw error;
        session=data.session;
      }
      const paired=await call('pair',{code:values.code});
      if(!paired)
        throw Error('Invalid, expired, or rate-limited pairing code');
      mode='child';
      await refresh();
      say();
    }else if(f.id==='bonusForm'){
      await act('bonus',{
        reason:values.reason,
        amount:Number(values.amount)
      });
    }else if(f.id==='settingsForm'){
      await act('settings',{
        rewardCost:Number(values.cost)
      });
    }else if(f.id==='choreForm'){
      await act('add-chore',{
        title:values.title,
        routine:values.routine
      });
    }
  }catch(err){
    toast(err.message);
  }
});

(async()=>{
  render();

  if('serviceWorker' in navigator)
    navigator.serviceWorker.register('./sw.js').catch(()=>{});

  const {data}=await supabase.auth.getSession();
  session=data.session;

  if(session){
    try{
      state=await call('state');
      mode=state.role==='child'?'child':'parent';
      render();
    }catch(e){
      mode='pair';
      render();
    }
  }else{
    render();
  }
})();
