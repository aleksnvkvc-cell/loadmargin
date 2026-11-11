/* SOURCE FILE. Pages load the .min.js next to it: after editing, run  sh tools/minify.sh  */
/* Shared page script for load-calculator, how-it-works and news: nav, reveal, assistant answers and the load calculator.
   Pages load assets/page.min.js. After editing this file run tools/minify.sh. */
/* ── IntersectionObserver shim ──────────────────────────────────────
   iOS before 12.2 and older Android WebView have no IntersectionObserver.
   Constructing one there throws, which would kill every line of script
   after it. This stand-in reveals everything immediately and counts every
   counter to its final value: no animation, but a working page. */
if (typeof window.IntersectionObserver === 'undefined') {
  window.IntersectionObserver = function (cb) {
    this.observe = function (el) {
      try { cb([{ isIntersecting: true, target: el }], this); } catch (e) {}
    };
    this.unobserve = function () {};
    this.disconnect = function () {};
  };
}

const TARGET_MARGIN = 0.15;      // 15% is the accept threshold
const THIN_MARGIN   = 0.05;      // below 5% = reject
const MILES_PER_DAY = 500;

const $  = id => document.getElementById(id);
const money = n => (n<0?'-$':'$') + Math.abs(Math.round(n)).toLocaleString('en-US');
const money2 = n => '$' + n.toFixed(2);
const num = id => { const v = parseFloat($(id).value); return isFinite(v) && v>=0 ? v : 0; };

/* ─────────── year ─────────── */
$('yr').textContent = new Date().getFullYear();

/* ─────────── nav ─────────── */
function toggleNav(){
  const l=$('navLinks'), b=$('navTog');
  const open=l.classList.toggle('open');
  b.classList.toggle('open',open);
  b.setAttribute('aria-expanded',open?'true':'false');
  b.setAttribute('aria-label',open?'Close menu':'Open menu');
}
document.querySelectorAll('.nav-links a').forEach(a=>a.addEventListener('click',()=>{
  if($('navLinks').classList.contains('open')) toggleNav();
}));
let lastY=0;
addEventListener('scroll',()=>{
  const y=scrollY;
  $('nav').classList.toggle('scrolled', y>20);
  if(Math.abs(y-lastY)>60){ lastY=y; markActive(); }
},{passive:true});
function markActive(){
  const links=[...document.querySelectorAll('.nav-link')];
  let cur='';
  document.querySelectorAll('section[id]').forEach(s=>{ if(scrollY>=s.offsetTop-140) cur=s.id; });
  links.forEach(a=>a.classList.toggle('active', a.getAttribute('href')==='#'+cur));
}

/* ─────────── reveal on scroll ─────────── */
const io=new IntersectionObserver(es=>es.forEach(e=>{
  if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); }
}),{threshold:.12,rootMargin:'0px 0px -60px 0px'});
const observeReveals=()=>document.querySelectorAll('.rv:not(.in)').forEach(el=>io.observe(el));

/* ─────────── animated counters ─────────── */
const cio=new IntersectionObserver(es=>es.forEach(e=>{
  if(!e.isIntersecting) return;
  const el=e.target, to=+el.dataset.count, suf=el.dataset.suffix||'';
  let t0=null;
  const step=ts=>{ t0=t0||ts; const p=Math.min((ts-t0)/1100,1);
    el.textContent=Math.round(to*(1-Math.pow(1-p,3)))+suf;
    if(p<1) requestAnimationFrame(step); };
  requestAnimationFrame(step); cio.unobserve(el);
}),{threshold:.5});
document.querySelectorAll('[data-count]').forEach(el=>cio.observe(el));

/* ═══════════ CALCULATOR ═══════════ */
let payMode='mile';
function setPayMode(m){
  payMode=m;
  $('segMile').classList.toggle('on',m==='mile');
  $('segPct').classList.toggle('on',m==='pct');
  if(m==='mile'){
    $('payLabel').textContent='Driver pay rate'; $('payPre').textContent='$';
    $('paySuf').textContent='/mi'; $('payBox').classList.add('has-pre');
    if(parseFloat($('pay').value)>5) $('pay').value='0.62';
    $('pay').step='0.01';
  }else{
    $('payLabel').textContent='Driver share of line haul'; $('payPre').textContent='';
    $('paySuf').textContent='%'; $('payBox').classList.remove('has-pre');
    if(parseFloat($('pay').value)<5) $('pay').value='27';
    $('pay').step='1';
  }
  calc();
}

function flash(el){ el.classList.add('flash'); setTimeout(()=>el.classList.remove('flash'),260); }

function setHero(t,sub,cls){
  const h=$('hVerdict'); if(!h) return;
  h.className='hc-verdict '+cls;
  $('hVText').textContent=t; $('hVSub').textContent=sub;
}
function calc(){
  const rate=num('rate'), loaded=num('loaded'), dead=num('deadhead');
  const diesel=num('fuel'), mpg=Math.max(num('mpg'),0.1);
  const payRate=num('pay'), fixedCpm=num('fixedcpm'), maintCpm=num('maint'), extras=num('extras');

  const miles=loaded+dead;
  const gal=miles/mpg;
  const fuelCost=gal*diesel;
  const driver=payMode==='mile' ? miles*payRate : rate*payRate/100;
  const maint=miles*maintCpm;
  const fixed=miles*fixedCpm;
  const cost=fuelCost+driver+maint+fixed+extras;
  const net=rate-cost;
  const margin=rate>0 ? net/rate : 0;
  const days=Math.max(Math.ceil(miles/MILES_PER_DAY),1);

  $('oRev').textContent=money(rate);
  $('oFuel').textContent=money(fuelCost);
  $('oGal').textContent=miles?`· ${gal.toFixed(0)} gal`:'';
  $('oDriver').textContent=money(driver);
  $('oMaint').textContent=money(maint);
  $('oFixed').textContent=money(fixed);
  $('oExtra').textContent=money(extras);
  $('oTotal').textContent=money(cost);

  const np=$('netProfit'), mp=$('marginPct');
  np.textContent=money(net); flash(np);
  mp.textContent=(margin*100).toFixed(1)+'%'; flash(mp);
  np.style.color = net>0 ? 'var(--green)' : 'var(--red)';
  mp.style.color = margin>=TARGET_MARGIN ? 'var(--green)' : margin>=THIN_MARGIN ? 'var(--amber)' : 'var(--red)';

  $('rpm').textContent   = miles ? money2(rate/miles) : '—';
  $('berpm').textContent = miles ? money2(cost/miles) : '—';
  $('perday').textContent= money(net/days);

  const bar=$('marginBar');
  bar.style.width=Math.max(0,Math.min(margin/0.35*100,100)).toFixed(1)+'%';
  bar.style.background = margin>=TARGET_MARGIN
    ? 'linear-gradient(90deg,#2AA873,var(--green))'
    : margin>=THIN_MARGIN ? 'linear-gradient(90deg,#B98422,var(--amber))'
    : 'linear-gradient(90deg,#B8412F,var(--red))';

  /* The hero card shows the same numbers: it is the engine, not a mock-up. */
  if($('hNet')){
    $('hRate').textContent   = money(rate);
    $('hMiles').textContent  = miles.toLocaleString();
    $('hRpm').textContent    = miles ? money2(rate/miles) : '—';
    $('hBe').textContent     = miles ? money2(cost/miles) : '—';
    $('hNet').textContent    = money(net);
    $('hMargin').textContent = (margin*100).toFixed(1)+'%';
    $('hNet').style.color    = net>0 ? 'var(--green)' : 'var(--red)';
    $('hMargin').style.color = margin>=TARGET_MARGIN ? 'var(--green)'
                             : margin>=THIN_MARGIN ? 'var(--amber)' : 'var(--red)';
  }

  /* red / green flags: quick rules of thumb */
  const F=$('flags');
  if(F){
    const red=[], green=[], pct=x=>(x*100).toFixed(0)+'%';
    const dhp=miles?dead/miles:0, fuelShare=rate>0?fuelCost/rate:0, feeShare=rate>0?extras/rate:0;
    const spread=miles?(rate-cost)/miles:0;
    if(rate<=0||miles<=0){ F.innerHTML=''; }
    else{
      if(net<0) red.push('Rate is below your break-even ('+money2(cost/miles)+'/mi)');
      else if(margin<TARGET_MARGIN) red.push('Margin '+pct(margin)+', under your '+pct(TARGET_MARGIN)+' target');
      else green.push('Clears your '+pct(TARGET_MARGIN)+' target ('+pct(margin)+')');
      if(dhp>0.15) red.push('Deadhead is '+pct(dhp)+' of all miles');
      else if(dhp<=0.10) green.push('Low deadhead ('+pct(dhp)+' of miles)');
      if(fuelShare>0.35) red.push('Fuel eats '+pct(fuelShare)+' of the rate');
      if(feeShare>0.05) red.push('Tolls and fees are '+pct(feeShare)+' of the rate');
      if(spread>=0.30) green.push(money2(spread)+'/mi above break-even');
      const flag=c=>'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 21V4M5 4h11l-2 4 2 4H5"/></svg>';
      F.innerHTML=(red.length?'<ul class="fl-red">'+red.map(x=>'<li>'+flag()+x+'</li>').join('')+'</ul>':'')
                 +(green.length?'<ul class="fl-green">'+green.map(x=>'<li>'+flag()+x+'</li>').join('')+'</ul>':'');
    }
  }

  if($('miniRes')){
    const lab=margin>=TARGET_MARGIN?'ACCEPT':margin>=THIN_MARGIN?'NEGOTIATE':net>=0?'REJECT':'LOSING';
    $('mvV').textContent=lab; $('mvV').className='mv '+(lab==='ACCEPT'?'ok':lab==='NEGOTIATE'?'mid':'bad');
    $('mvN').textContent=money(net); $('mvM').textContent=(margin*100).toFixed(1)+'%';
  }
  const v=$('verdict'), need=cost/(1-TARGET_MARGIN);
  v.className='verdict';
  if(margin>=TARGET_MARGIN){
    v.classList.add('v-accept'); $('vIcon').textContent='✓'; $('vText').textContent='ACCEPT';
    setHero('ACCEPT','Clears the target margin','v-accept');
    $('vSub').textContent=`Clears your ${(TARGET_MARGIN*100)|0}% target with ${money(net)} left after every cost.`;
    $('advice').innerHTML=miles?`At <b class="mono">${money2(rate/miles)}</b> a mile, counting empty miles, you are <b class="mono">${money2((rate-need)/miles)}</b> per mile above the accept line. Book it.`:`Clears your target with ${money(rate-need)} to spare.`;
  }else if(margin>=THIN_MARGIN){
    v.classList.add('v-warn'); $('vIcon').textContent='!'; $('vText').textContent='NEGOTIATE';
    setHero('NEGOTIATE','It pays, but thinly','v-warn');
    $('vSub').textContent=`It pays, but thinly. Ask for ${money(need)} to hit ${(TARGET_MARGIN*100)|0}%.`;
    $('advice').innerHTML=miles?`You need <b class="mono">${money(need-rate)}</b> more: about <b class="mono">${money2((need-rate)/miles)}</b> per mile. That is a reasonable ask on a ${miles.toFixed(0)}-mile run.`:`You need ${money(need-rate)} more.`;
  }else if(net>=0){
    v.classList.add('v-reject'); $('vIcon').textContent='✕'; $('vText').textContent='REJECT';
    setHero('REJECT','Worth more parked','v-reject');
    $('vSub').textContent=`Only ${money(net)} for ${days} day${days>1?'s':''} of truck time. The truck is worth more sitting.`;
    $('advice').innerHTML=`Break-even is <b class="mono">${money(cost)}</b>. You would need <b class="mono">${money(need)}</b> for this to be worth the hours of service it burns.`;
  }else{
    v.classList.add('v-reject'); $('vIcon').textContent='✕'; $('vText').textContent='LOSING LOAD';
    setHero('LOSING LOAD','This load costs you money to run','v-reject');
    $('vSub').textContent=`This load costs you ${money(-net)} to run.`;
    $('advice').innerHTML=`Break-even alone is <b class="mono">${money(cost)}</b>: <b class="mono">${money(cost-rate)}</b> above the offer. Deadhead of ${dead} mi is costing <b class="mono">${money(dead*(diesel/mpg+maintCpm+fixedCpm+(payMode==='mile'?payRate:0)))}</b> of that.`;
  }
  const sl=$('sendLoad');
  if(sl){
    const pay=payMode==='mile'?`$${payRate}/mi`:`${payRate}% of rate`;
    const body=`Hi,\n\nI'd like a $49 Quick Load Check. These are the numbers I put in your calculator:\n\n`+
      `Rate offered: ${money(rate)}\nLoaded miles: ${loaded}\nDeadhead miles: ${dead}\nDiesel: $${diesel}/gal\nMPG: ${mpg}\n`+
      `Driver pay: ${pay}\nFixed cost: $${fixedCpm}/mi\nMaintenance: $${maintCpm}/mi\nTolls and fees: ${money(extras)}\n\n`+
      `Calculator result: ${$('vText').textContent}, net ${money(net)}, margin ${(margin*100).toFixed(1)}%\n\n`+
      `Origin -> destination:\nAccessorials (detention, lumper, etc.):\nWhen I need an answer:\n\nThanks,\n`;
    sl.href='mailto:aleksnvkvc@gmail.com?subject='+encodeURIComponent('Load Check request: numbers from the calculator')+'&body='+encodeURIComponent(body);
  }
}
['rate','loaded','deadhead','fuel','mpg','pay','fixedcpm','maint','extras']
  .forEach(id=>{const el=$(id); if(el) el.addEventListener('input',calc);});

/* Safari before 15.4 ignores scrollIntoView options and throws on some builds. */
function safeScroll(el){
  if(!el) return;
  try{ el.scrollIntoView({behavior:'smooth',block:'start'}); }
  catch(e){ el.scrollIntoView(true); }
}
function loadPreset(k){
  const P={
    good : {rate:3450,loaded:920,deadhead:40,fuel:6.10,mpg:7.1,pay:0.60,fixedcpm:0.42,maint:0.17,extras:60},
    bad  : {rate:1250,loaded:640,deadhead:310,fuel:6.45,mpg:5.6,pay:0.68,fixedcpm:0.61,maint:0.24,extras:180},
    reset: {rate:2400,loaded:850,deadhead:120,fuel:6.28,mpg:6.5,pay:0.62,fixedcpm:0.48,maint:0.19,extras:85}
  }[k];
  if(payMode==='pct') setPayMode('mile');
  Object.entries(P).forEach(([id,v])=>$(id).value=v);
  calc();
  safeScroll($('calculator'));
}

/* mini result bar on phones: visible while the inputs are on screen and the verdict is not */
(function(){
  const bar=$('miniRes'), form=document.querySelector('#calculator .calc-form'), out=$('verdict');
  if(!bar||!form||!out||!('IntersectionObserver' in window)) return;
  let fIn=false,oIn=false;
  const upd=()=>{const on=fIn&&!oIn; bar.classList.toggle('hide',!on); document.body.classList.toggle('mini-on',on&&matchMedia('(max-width:640px)').matches);};
  new IntersectionObserver(e=>{fIn=e[0].isIntersecting;upd();}).observe(form);
  new IntersectionObserver(e=>{oIn=e[0].isIntersecting;upd();}).observe(out);
})();

/* ═══════════ CPM BUILDER ═══════════ */
function cpm(){
  const fixedTotal=['c1','c2','c3','c4','c5','c6'].reduce((s,id)=>s+num(id),0);
  const rawMiles=num('cmiles'), miles=Math.max(rawMiles,1);
  const v=rawMiles>0?fixedTotal/miles:0;
  const el=$('cpmVal'); el.textContent=rawMiles>0?money2(v):'Enter monthly miles'; flash(el);
  $('cpmNote').innerHTML=`<b class="mono">${money(fixedTotal)}</b> of fixed cost every month ÷ <b class="mono">${miles.toLocaleString('en-US')}</b> miles. Every mile you drive carries this before a drop of fuel.`;
  return v;
}
['c1','c2','c3','c4','c5','c6','cmiles'].forEach(id=>{const el=$(id); if(el) el.addEventListener('input',cpm);});
function applyCPM(){
  $('fixedcpm').value=cpm().toFixed(2);
  calc();
  safeScroll($('calculator'));
  const box=$('fixedcpm').closest('.inp');
  box.style.transition='box-shadow .3s'; box.style.boxShadow='0 0 0 3px rgba(227,180,74,.45)';
  setTimeout(()=>box.style.boxShadow='',1400);
}

/* ═══════════ MODULES ═══════════ */
const ICONS={
  score:'<path d="M3 3v18h18"/><path d="M7 15l4-5 3 3 5-7"/>',
  cpm:'<circle cx="12" cy="12" r="9"/><path d="M12 7v10M9.5 9.5h5M9.5 14.5h5"/>',
  lane:'<path d="M4 21 8 3M20 21l-4-18M12 5v3M12 12v3M12 19v2"/>',
  driver:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  fuel:'<path d="M4 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M3 21h13M14 9h3a2 2 0 0 1 2 2v6a2 2 0 0 0 2 2"/>',
  hos:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  cust:'<path d="M3 21V9l9-6 9 6v12"/><path d="M9 21v-7h6v7"/>',
  back:'<path d="M3 12h18M3 12l5-5M3 12l5 5"/><path d="M21 6v12"/>'
};
const MODULES=[
  {i:'score',v:'score',n:'Load Profitability Scoring',tag:'live',
   d:'The engine running on this page. Rate, miles, deadhead, fuel, driver pay and overhead resolved into one accept-or-walk number.',
   long:'Scores an offer against your own cost base rather than a market average. Deadhead is treated as real cost. Driver pay is modelled per mile or as a percentage of line haul. Returns net profit, margin, all-in rate per mile, break-even rate and the exact counter-offer that would reach your target margin.'},
  {i:'cpm',v:'cpm',n:'True Cost-Per-Mile Builder',tag:'live',
   d:'Turns monthly overhead into the per-mile figure every other module depends on. Also live on this page.',
   long:'Truck and trailer payments, insurance, permits, ELD, parking and admin divided by real monthly miles. Update one premium and the number propagates to load scoring, lane analysis and the customer ledger at once, which is the whole point of keeping one cost model instead of six spreadsheets.'},
  {i:'lane',v:'lanes',n:'Lane Margin Analyzer',
   d:'Ranks the lanes you actually run by profit per truck-day, not by revenue.',
   long:'Aggregates scored loads by origin-destination pair and shows profit per truck-day, average deadhead in and out, and seasonal drift. The lane that books fastest is frequently the lane that earns least: this is where that shows up.'},
  {i:'driver',v:'drivers',n:'Driver Performance & Pay',
   d:'Cost per mile by driver: fuel burn, idle, out-of-route miles and pay model.',
   long:'Compares drivers on the costs they control: MPG, idle hours, out-of-route miles, detention exposure, and models what a pay-package change would do to your cost per mile before you announce it.'},
  {i:'fuel',v:'fuel',n:'Fuel & MPG Optimizer',
   d:'Where the diesel actually goes, and what a 0.4 MPG swing is worth annually.',
   long:'Tracks MPG by truck, driver, season and terrain. Because fuel is modelled as gallons rather than dollars, a price spike and an efficiency drop are never confused with each other. Quantifies fuel-stop routing savings across the fleet.'},
  {i:'hos',v:'hos',n:'HOS Compliance Planner',
   d:'Checks a load against the clock before you accept it, not after dispatch.',
   long:'Validates a proposed run against remaining drive time, 14-hour window, 70-hour cycle and appointment windows, and flags the loads that only work on paper. A load that forces a violation is a load that was never profitable.'},
  {i:'cust',v:'cust',n:'Customer Profitability Ledger',
   d:'Which brokers and shippers earn their keep once detention and deadhead are charged to them.',
   long:'Allocates deadhead, detention, lumper fees and payment terms to the customer that caused them. Produces a ranked list you can take into a rate negotiation.'},
  {i:'back',v:'back',n:'Deadhead & Backhaul Reducer',
   d:'Prices the empty miles and finds the return that makes the round trip work.',
   long:'Treats a round trip as one economic unit. Scores candidate backhauls against the outbound margin so a thin return that eliminates 300 empty miles is correctly valued above a fat return that adds 200.'}
];
if($('modGrid')) $('modGrid').innerHTML=MODULES.map((m,i)=>`
  <article class="card mod rv rv-d${(i%4)}" onclick="openMod(${i})" tabindex="0"
           onkeydown="if(event.key==='Enter')openMod(${i})" role="button" aria-label="${m.n} details">
    <div class="ico"><svg viewBox="0 0 24 24">${ICONS[m.i]}</svg></div>
    <h3>${m.n}</h3>
    <p>${m.d}</p>
    <div class="foot">
      <span class="tag live">Free &amp; working</span>
      <span style="font-size:.8rem;color:var(--tx-3)">Open it →</span>
    </div>
  </article>`).join('');
function openMod(i){
  const m=MODULES[i];
  $('modTitle').textContent=m.n;
  $('modPrice').innerHTML='Free, working, and running in your browser right now.';
  $('modBody').textContent=m.long;
  $('modOpen').href='app.html#'+(m.v||'dash');
  $('modOpen').className='btn btn-gold';
  $('modOpen').style.flex='1'; $('modOpen').style.minWidth='170px';
  $('modOpen').rel='';
  $('modOpen').textContent='Open this module →';
  openModal('modModal');
}


/* ═══════════ ASSISTANT ═══════════ */
/* A scripted assistant: 51 written answers matched by keyword. It costs nothing
   per message, works with no server, and never invents an answer about pricing
   or capability. When it does not know something, it says so. */
const KB=[
 /* ── what it is ── */
 {c:'Product',k:['what is','what does','what do you','purpose','about loadmargin','explain','who are you'],q:'What does LoadMargin do?',
  a:'LoadMargin turns a freight offer into a <strong>net profit number</strong> before you accept it.<br><br>It subtracts fuel (as gallons, not a guess), deadhead, driver pay, maintenance and the fixed cost of owning the truck from the rate, then returns accept, negotiate or walk: with the counter-offer already calculated.<br><br>The calculator on this page is the live engine. Try it.'},
 {c:'Product',k:['free','cost anything','catch','why free','really free'],q:'Is it really free?',
  a:'Yes. The calculator and the console are <strong>free</strong>, with no account and no card. They run in your browser, so they cost almost nothing to keep online.<br><br>What I charge for is my time: a person checking your load, starting with the $49 Load Check. The free tools are how you can check my math before you pay for anything.'},
 {c:'Product',k:['subscription','monthly','recurring','saas','per month'],q:'Is there a subscription?',
  a:'<strong>No software subscription.</strong> The calculators and the console are free.<br><br>What LoadMargin sells is help from a person: one-off services arranged by email, and optional monthly help that is invoiced month to month and can stop any month. See <a href="work.html" style="color:var(--gold)">Services</a>.'},
 {c:'Product',k:['price','pricing','how much','expensive','cost','$'],q:'How much does it cost?',
  a:'The calculators, the console and the guides are free.<br><br>Paid help is services only:<ul><li>Quick Load Check: <b>$49</b> per load</li><li>Full Cost &amp; Lane Audit: <b>$249</b></li><li>Authority Checklist Review: <b>$99</b> / New Authority Setup: <b>$349</b></li><li>Compliance Tune-up: <b>$199</b></li><li>Load Check Plan: <b>$99/month</b> / Ongoing Support: <b>$249–$799/month</b></li></ul>Everything is arranged by email and invoiced; there is no checkout on this site. <a href="work.html" style="color:var(--gold)">Services →</a>'},
 {c:'Product',k:['hire','service','audit','load check','buy','workbook','excel','spreadsheet product'],q:'What can I hire you for?',
  a:'LoadMargin sells <b>services only</b>, not files or software.<br><br>The tools on this site are free to use. If you want a person to check your numbers, start with a <b>$49 Quick Load Check</b>: send the load and your costs, get a one-page report with trip cost, cost per mile, break-even and the rate you need. <a href="work.html" style="color:var(--gold)">All services →</a>'},

 /* ── the math ── */
 {c:'The math',k:['calculate','formula','math','derive','how does it work','methodology','accurate','accuracy'],q:'How is profit calculated?',
  a:'<strong>net = rate − (fuel + driver + maintenance + fixed + fees)</strong><br><br>Where fuel = (loaded + deadhead) ÷ MPG × diesel price, driver is per-mile or a percentage of line haul, and fixed cost per mile comes from your own monthly overhead.<br><br>The full formula is printed in the Method section of this page.'},
 {c:'The math',k:['cost per mile','cpm','overhead','fixed cost','how do i calculate my cost'],q:'What is cost per mile?',
  a:'Your monthly fixed costs: truck payment, trailer, insurance, permits, ELD, parking, admin: divided by the miles you actually drive that month.<br><br>It is the money every mile owes before a drop of diesel.<br><br>The <strong>Cost-Per-Mile Builder</strong> on this page computes it and pushes it into the calculator. There is also a <a href="guide-cost-per-mile.html" style="color:var(--gold)">full written guide</a>.'},
 {c:'The math',k:['deadhead','empty','backhaul','empty miles'],q:'How is deadhead handled?',
  a:'As real cost, because it is. Empty miles burn fuel, wear tyres, consume hours of service and carry the same fixed cost per mile as loaded ones.<br><br>Try the <em>losing lane</em> preset in the calculator: 310 empty miles eat roughly a third of what looked like a workable rate.<br><br>The Backhaul module scores round trips as one economic unit, so a cheap return that kills 300 empty miles correctly beats a rich one that adds 200.'},
 {c:'The math',k:['driver pay','percentage','percent','per mile','pay model','wage','how do i pay'],q:'Per-mile or percentage driver pay?',
  a:'Both are modelled. Switch the toggle in the calculator.<br><br>Percentage pay cushions you on cheap freight and costs you on premium freight. The calculator shows that difference immediately, which matters when you are deciding which pay package to offer.<br><br>The Drivers module also has a simulator: change a pay rate and see what it would have cost across every load that driver has already run.'},
 {c:'The math',k:['margin','target','threshold','15','good margin','should i aim'],q:'What margin should we target?',
  a:'The tool defaults to <strong>15%</strong> as accept and treats under 5% as reject.<br><br>Treat those as starting points. Dedicated freight with guaranteed volume can justify less; a one-off run into a dead market should demand more.<br><br>For context: ATRI put average truckload operating margins <em>below 1%</em> for 2025. If you are clearing 15% consistently you are doing considerably better than the sector.'},
 {c:'The math',k:['detention','sitting','waiting','dock'],q:'How is detention priced?',
  a:'As lost truck-time. Detention hours are charged at the fixed cost the truck would otherwise have absorbed over those hours: fixed cost per mile times the miles it would have covered.<br><br>Four unpaid hours on a $0.52-per-mile truck running 500 miles a day is about <b>$98</b> of cost nobody invoiced for. If the customer pays detention, enter it and it counts as revenue.'},
 {c:'The math',k:['truck day','truck-day','per day','profit per day','rank lanes'],q:'Why rank by profit per truck-day?',
  a:'Because revenue ranks lanes badly.<br><br>A three-day lane paying $900 profit looks better than a one-day lane paying $500, until you notice it consumed three times the truck capacity. Per truck-day, the short lane wins at $500 against $300.<br><br>Truck-days are the scarce resource. That is what you should be ranking on.'},
 {c:'The math',k:['break even','breakeven','minimum rate','lowest rate'],q:'What is my break-even rate?',
  a:'Total cost divided by total miles, including deadhead.<br><br>With a typical single-truck cost base that lands around <b>$1.92 a mile</b> all-in. Any load offering less than that loses money on every mile it runs, including the empty ones you drove to reach it.<br><br>The calculator shows your break-even rate per mile on every load you score.'},
 {c:'The math',k:['counter','negotiate','ask for','how much should i ask'],q:'How do I work out a counter-offer?',
  a:'<strong>target_rate = total_cost ÷ (1 − target_margin)</strong><br><br>If a load costs you $1,949 all-in and you want 15%, you need $2,293. The calculator does this automatically and shows the exact figure whenever a load comes in as NEGOTIATE.<br><br>Saying "I need $2,293 on this" is worth considerably more on the phone than "that seems low".'},

 /* ── operations ── */
 {c:'Operations',k:['hos','hours of service','compliance','eld','dot','legal','11 hour','14 hour','70 hour'],q:'What about hours of service?',
  a:'The HOS Planner checks a load against remaining drive time, the 14-hour window, the 30-minute break and the 70-hour cycle <strong>before</strong> you accept it.<br><br>A load that only works by running illegal was never profitable: it was a liability with a rate attached.<br><br>It is a planning check, not an ELD. It does not model adverse conditions, the short-haul exception or the sleeper-berth split.'},
 {c:'Operations',k:['fuel','mpg','diesel','gallons','fuel cost'],q:'How is fuel modelled?',
  a:'In <strong>gallons</strong>, never in cents per mile.<br><br>fuel = (total miles ÷ MPG) × diesel price.<br><br>Keeping price and efficiency separate is diagnostic: if fuel cost per mile rises, gallons tell you instantly whether the market moved or the truck did. A blended number hides both, and they have completely different fixes.'},
 {c:'Operations',k:['customer','broker','which broker','payment terms','net 30','net 45'],q:'Which customers are actually profitable?',
  a:'The Customers module charges deadhead, detention and payment terms back to whoever caused them.<br><br>Slow payment is a real cost: money tied up at net-45 instead of net-15 costs you roughly 0.8% of the invoice at a 10% annual cost of capital. Small per load, significant per year.<br><br>The result is regularly uncomfortable: the highest-revenue broker is often not the highest-margin one.'},
 {c:'Operations',k:['which lane','lane','best lane','worst lane'],q:'Which of my lanes lose money?',
  a:'The Lanes module groups every load you have booked by origin and destination, then ranks them by profit per truck-day.<br><br>You need a reasonable number of loads before a pattern is trustworthy: twenty is a sensible minimum. Below that you are looking at noise.<br><br>Load the demo fleet in the console to see what the report looks like with 38 loads across 10 lanes.'},
 {c:'Operations',k:['fleet size','how many trucks','owner operator','one truck','small fleet','large fleet'],q:'Is this sized for my fleet?',
  a:'The math is identical at every size; the question changes.<br><br><ul><li><b>One truck:</b> should I take this load</li><li><b>Five to fifty:</b> which dispatcher is booking break-even freight</li><li><b>Hundreds:</b> which lane, customer and division combination leaks margin systematically</li></ul>The console has no truck limit. Add as many as you run.'},

 /* ── using it ── */
 {c:'Using it',k:['start','get started','begin','first step','how do i start','setup'],q:'How do I get started?',
  a:'About ten minutes, and most of it is finding your real monthly overhead.<br><br><ol style="margin-left:1rem"><li>Open the <b>Cost-Per-Mile Builder</b> and enter your monthly fixed costs</li><li>Click <em>Apply to calculator</em></li><li>Score a load you already ran and compare against your own books</li></ol>If it doesn\'t match your books, email me.'},
 {c:'Using it',k:['data','privacy','secure','security','gdpr','store','upload','cloud','where does my data go'],q:'Where does my data go?',
  a:'<strong>Nowhere.</strong> Everything runs in your browser. Open your dev tools, watch the Network tab, and use the calculator: there is no outbound request carrying your figures.<br><br>The console stores your fleet in your browser\'s local storage. It never reaches me, which also means I can\'t recover it. Export a backup from <em>Fleet &amp; Data</em>.'},
 {c:'Using it',k:['lose data','backup','export','recover','clear','delete'],q:'What happens if I clear my browser?',
  a:'Your fleet data is gone, and I can\'t restore it: I never had a copy.<br><br>That is the honest cost of not uploading your data. Use <em>Fleet &amp; Data → Export backup</em> and keep the JSON file somewhere safe. Import restores it exactly.<br><br>There is also a CSV export if you want the loads in a spreadsheet.'},
 {c:'Using it',k:['mobile','phone','app','ipad','tablet','install','download'],q:'Does it work on a phone?',
  a:'Yes: nothing to install. It runs in the browser and is built mobile-first, usable one-handed in the cab.<br><br>That is deliberate: the decision has to be made while the broker is still on the line, not back at the desk.'},
 {c:'Using it',k:['multiple user','team','share','dispatcher','colleague','same data'],q:'Can my whole team use it?',
  a:'Each person can use the console on their own device for free, but <strong>the data does not sync between them</strong> — it lives in each browser separately.<br><br>For now, the workaround is the export/import backup: one person maintains the cost model and shares the JSON file.<br><br>Shared accounts are the obvious next thing to build. They don\'t exist yet.'},
 {c:'Using it',k:['integrat','tms','load board','api','connect','import','dat','sync'],q:'Do you integrate with our TMS?',
  a:'<strong>No, not today.</strong> There is no TMS or load-board integration.<br><br>You enter loads manually, or import a backup file. Bulk import from a TMS export and an API are on the roadmap, not in the product.'},
 {c:'Using it',k:['spreadsheet','excel','sheet','different','why not','already have'],q:'Why not just use a spreadsheet?',
  a:'Spreadsheets do the arithmetic fine. They fail at three things:<ul><li>They live on one laptop.</li><li>They go stale the moment your insurance renews: silently.</li><li>Nobody opens them while a broker is holding.</li></ul>That is why the calculator runs in the browser and is free to use whenever a load comes in.'},

 /* ── free tools ── */
 {c:'Free tools',k:['calculator','calculators','tools','free tool','what tools','other calculator'],q:'What free calculators are there?',
  a:'Fourteen, all free and all running in your browser:<ul><li><b>Load calculator</b> — accept, negotiate or reject a single offer</li><li><b>Cost-per-mile builder</b> — your real number, in four minutes</li><li><b>ETA &amp; hours-of-service</b> — when you arrive, and whether you make it legally</li><li><b>Fuel surcharge</b> — recovery, and the gap against fuel you actually burn</li><li><b>Deadhead &amp; backhaul</b> — is a cheap return better than running empty</li><li><b>Owner-operator take-home</b> — gross to what reaches you</li><li><b>Detention</b> — what an hour at a dock really costs</li><li><b>IFTA quarterly</b> — fleet mpg, taxable gallons, net tax</li><li><b>Factoring APR</b> — the annualised cost of not waiting</li><li><b>Maintenance reserve</b> — twelve months of spend into a per-mile figure</li><li><b>DOT audit check</b> — review your file the way a roadside or compliance review would</li><li><b>Trip safety check</b> — hours of service, sleep, night driving and route risks before you accept a load</li><li><b>Trip fuel cost</b> — trip gallons and diesel cost, including empty miles and idling</li><li><b>Per diem</b> — days-away deductions at the IRS rate, and roughly how much tax they save</li></ul>Thirteen of them are on the <a href="calculators.html" style="color:var(--gold)">tools page</a>; the load calculator has its own page.'},
 {c:'Free tools',k:['fuel surcharge','fsc','surcharge','doe','peg','diesel index'],q:'How does the fuel surcharge calculator work?',
  a:'It takes the DOE weekly index, the base price your contract assumes and the peg mpg, and gives you <span class="mono">(index − base) ÷ peg</span> per loaded mile.<br><br>Then it does the part nobody else shows: the fuel you <em>actually</em> burn on <b>total</b> miles at your <b>real</b> mpg, and the gap between the two. A surcharge never covered all your fuel and was never meant to.<br><br><a href="calc-fuel-surcharge.html" style="color:var(--gold)">Open it</a> · <a href="guide-fuel-surcharge.html" style="color:var(--gold)">read the guide</a>'},
 {c:'Free tools',k:['ifta','fuel tax','quarterly','jurisdiction','taxable gallon'],q:'Can it work out my IFTA?',
  a:'There is an <a href="calc-ifta.html" style="color:var(--gold)">IFTA estimator</a> for up to five jurisdictions. It computes fleet mpg from your totals, distributes taxable gallons per state, and nets that against what you bought there.<br><br>It is for planning, not for filing. Rates change every quarter and are published by the member jurisdictions: file from the current published rates, never from a remembered figure.'},
 {c:'Free tools',k:['factoring','factor','quick pay','quickpay','advance','apr','cash flow'],q:'Should I use factoring?',
  a:'That is arithmetic, not ideology, and the <a href="calc-factoring.html" style="color:var(--gold)">factoring calculator</a> does it.<br><br>Factoring at 3% against a 30-day payer is a <b>39% annual cost of capital</b>. That sounds fatal until you notice the comparison is not against a bank loan you cannot get: it is against not running the load at all.<br><br>The question is simply whether cash is actually your constraint. If you are turning down loads because the money has not arrived, factor. If you have working capital and factor out of habit, you are giving away 3% of every invoice for nothing.'},
 {c:'Free tools',k:['detention','dock','waiting','dwell','wait time','sitting'],q:'What does detention actually cost?',
  a:'About <b>$144 an hour</b> with the example cost base, against the $40–$75 the market pays.<br><br>Roughly $27 of that is direct: driver pay and idle fuel. The rest is the 53 miles you can no longer drive today, because the 14-hour window does not pause for a slow receiver.<br><br>The <a href="calc-detention.html" style="color:var(--gold)">detention calculator</a> also tells you how much extra to charge a facility with a known dwell problem, before you accept.'},
 {c:'Free tools',k:['maintenance','repair','reserve','breakdown','wear','tyre','tire'],q:'How should I budget maintenance?',
  a:'As a <b>reserve</b>, not as last month\'s invoices. Maintenance arrives in lumps: eleven quiet months and then a $9,400 week, so a model built on recent bills is wrong in both directions.<br><br>Take twelve months of everything (tyres, PM, brakes, aftertreatment, roadside, trailer), divide by twelve months of miles, and charge that per mile every month. For most trucks it lands between <b>15 and 25 cents</b>.<br><br><a href="calc-maintenance.html" style="color:var(--gold)">Build your figure</a> · <a href="guide-maintenance.html" style="color:var(--gold)">read the guide</a>'},

 /* ── learning ── */
 {c:'Learn',k:['guide','guides','article','read','learn','explain','documentation','blog'],q:'Where can I learn the method?',
  a:'There are <b>sixty-six written guides</b> and a 36-term glossary, all free and none gated behind an email:<ul><li>The numbers: cost per mile, deadhead, fuel, maintenance, detention, negotiation, driver pay</li><li>Compliance: hours of service, ELD, IFTA, IRP, UCR, 2290, CSA, cargo claims, the Clearinghouse, audits, inspections</li><li>Operations: finding loads, rate cons, dispatchers, trailer types, tires, trip planning, accessorials</li><li>Business: authority, LLC vs S-corp, buying a truck, financing, tax, insurance, hiring your first driver</li></ul>Every figure in them is either derived in front of you or attributed to a source you can check.<br><br><a href="guides.html" style="color:var(--gold)">Browse the guides →</a>'},
 {c:'Learn',k:['authority','mc number','usdot','start trucking','own authority','lease on','startup cost'],q:'What does getting authority cost?',
  a:'The FMCSA filing fee is <b>$300</b> and the USDOT number is free. The first year is <b>twelve to forty thousand</b>, and insurance is 70–80% of the difference.<br><br>The number nobody budgets is working capital: you pay for fuel today and get paid in 30–45 days, so a typical single truck is about <b>$8,600 in the hole</b> in week four before a dollar arrives.<br><br>The <a href="guide-authority.html" style="color:var(--gold)">authority guide</a> itemises all of it, and compares honestly against leasing on.'},
 {c:'Learn',k:['fraud','scam','double broker','double-broker','identity','safer','vet','verify broker','not paying'],q:'How do I check a broker is real?',
  a:'Fifteen minutes, same routine every time. The step that catches the most: <b>call the phone number listed on SAFER, not the one in the email.</b> Whoever is impersonating a broker controls the email: they do not control what FMCSA has on file.<br><br>Also check the operation classification actually says <em>Broker</em>. A company with carrier-only authority arranging your load is, by definition, unauthorised brokering, and the money chain behind you has no legal basis.<br><br><a href="guide-broker-fraud.html" style="color:var(--gold)">The full routine →</a>'},
 {c:'Learn',k:['negotiate','negotiation','counter','ask for more','broker call','haggle','push back'],q:'How do I negotiate a better rate?',
  a:'Have the number before the call. Three of them, actually: variable break-even, full break-even, and your target rate.<br><br><span class="mono">target = cost ÷ (1 − margin)</span> — a division, not an addition. Every carrier who "adds 20%" is running at 16.7%.<br><br>Then state a number. "I need $2,550 on that" is a position; "that\'s a little low" is an invitation to explain why it is not. And never ask <em>"what can you do?"</em> — it concedes the anchor.<br><br><a href="guide-negotiation.html" style="color:var(--gold)">The whole approach →</a>'},
 {c:'Learn',k:['glossary','term','jargon','definition','what does mean','abbreviation','acronym'],q:'What do all these freight terms mean?',
  a:'There is a <a href="glossary.html" style="color:var(--gold)">36-term glossary</a> covering everything used on this site: deadhead, detention, accessorials, RPM, all-in rate, truck-day, TONU, peg mpg, and the rest.<br><br>Defined without jargon, with the arithmetic included where the arithmetic is the actual meaning.'},

 {c:'Learn',k:['csa','safety score','basic','inspection','dot inspection','roadside','sms','percentile'],q:'What is a CSA score and does it matter?',
  a:'It is a <b>percentile</b>, not a grade: a ranking against carriers your size. A score of 80 in Vehicle Maintenance means 80% of comparable carriers have a better record than you.<br><br>It matters because of money rather than regulation: <b>92% of trucking underwriters price insurance off it</b>. Approaching a threshold costs 10\u201330%; crossing one costs 30\u201350%.<br><br>The useful part: violations carry a 3\u00d7 multiplier for six months, 2\u00d7 to twelve, 1\u00d7 to twenty-four, then vanish. A bad score is temporary if you actually fix the cause.<br><br><a href="guide-csa.html" style="color:var(--gold)">The seven BASICs and the thresholds \u2192</a>'},
 {c:'Learn',k:['insurance','premium','liability','cargo insurance','physical damage','bobtail','underwriter','coverage'],q:'What should insurance cost me?',
  a:'For an owner-operator with their own authority in 2026: <b>$4,800\u2013$10,800</b> liability only, <b>$10,800\u2013$21,600+</b> for a full package, and <b>$21,600\u2013$42,000+</b> on a new authority or a blemished record.<br><br>The thing most people get wrong is timing. Almost everything that sets your price: clean record, no lapses, accurate classification, CSA score: was decided in the twelve months <em>before</em> the quote. Shopping harder at renewal moves it far less than a clean year does.<br><br>And never let a policy lapse. On the next quote that reads worse than a minor claim.<br><br><a href="guide-insurance.html" style="color:var(--gold)">What each coverage does, and nine ways to lower it \u2192</a>'},
 {c:'Learn',k:['tax','taxes','per diem','irs','deduction','quarterly','self-employment','write off','accountant','s-corp','llc'],q:'How much should I set aside for tax?',
  a:'<b>25\u201330% of net profit</b>, moved to a separate account the week the settlement lands, not calculated in April.<br><br>Self-employment tax alone is <b>15.3%</b>, because you pay both halves of Social Security and Medicare. On $70,000 of profit that is about $9,890 before any income tax.<br><br>The deduction most drivers underclaim is <b>per diem</b>: $80 a full day away from home, 80% deductible for DOT-regulated drivers, and you need proof of the <em>days</em>, not receipts for meals: your ELD already has it. 280 nights is roughly $17,920 deductible.<br><br><a href="guide-taxes.html" style="color:var(--gold)">Quarterly dates, what is deductible, and when an S-corp pays \u2192</a>'},
 {c:'Learn',k:['lease purchase','lease-purchase','rent to own','walk away','lease truck','no money down'],q:'Is a lease-purchase worth it?',
  a:'Sometimes, and the difference is about nine clauses, not the advertised gross.<br><br>Run the arithmetic first. A lease driver can gross three times a company driver and take home <em>less</em>, because the gross is real and the deductions are the whole story. Ask for <b>twelve weeks of actual settlement statements from three current drivers</b>. A carrier running an honest programme can produce them.<br><br>On \u201cwalk-away lease\u201d: OOIDA, who read these contracts constantly, say they have <em>never seen one</em>. Find the actual clause, not the recruiter\u2019s description of it.<br><br><a href="guide-lease-purchase.html" style="color:var(--gold)">The eleven clauses to read before signing \u2192</a>'},
 {c:'Learn',k:['weight','overweight','axle','scale','tandem','80000','bridge formula','payload','heavy'],q:'How do I stop getting overweight tickets?',
  a:'Almost every overweight ticket is a <b>distribution</b> problem, not a loading one: under 80,000 gross with one axle group over.<br><br>Three limits apply at once: <b>12,000 lb</b> steer, <b>34,000 lb</b> drives, <b>34,000 lb</b> trailer. They add to exactly 80,000, so there is no slack anywhere.<br><br>The fix at the scale: drives heavy \u2192 slide the trailer tandems <b>forward</b>; trailer heavy \u2192 slide them <b>back</b>. Roughly 250\u2013400 lb per hole. And fuel <em>before</em> you scale: 300 gallons is about 2,100 lb, mostly on the steer and drives.<br><br><a href="guide-weight.html" style="color:var(--gold)">Working out your real payload \u2192</a>'},

 {c:'Learn',k:['cargo claim','claim','damaged freight','carmack','damage','shortage','bill of lading','bol','released value','salvage'],q:'How do I handle a cargo claim?',
  a:'Check <b>the date first</b>. The claimant has nine months from delivery to file a written claim: past that it is time-barred and needs no defence at all.<br><br>Then acknowledge it within <b>30 days</b> and decide within <b>120</b>, even if you intend to deny. Ignoring a claim is a violation in itself.<br><br>Most claims are actually won or lost at pickup. A clean bill of lading hands the claimant their first element: that the freight was in good condition when you took it. Two minutes of looking, a written exception and a timestamped photograph is the highest-value habit in this whole area.<br><br><a href="guide-cargo-claims.html" style="color:var(--gold)">The five defences and the full timeline \u2192</a>'},
 {c:'Learn',k:['eld','elog','e-log','logbook','exempt','exemption','short haul','short-haul','150 air','paper log','pre-2000'],q:'Do I have to run an ELD?',
  a:'Probably: the exemptions are narrower than people think, and they are <b>daily tests</b>, not a status you hold.<br><br>The common one is short-haul: within <b>150 air miles</b> of your reporting location, released within <b>14 hours</b>, 11 hours driving, back to the same yard. Fail any part on any day and that day needed a record of duty status.<br><br>The most misunderstood one: the pre-2000 exemption is the <b>engine</b> model year off the engine plate, not the truck\u2019s year and not the build date. Photograph the plate and keep it in the cab.<br><br><a href="guide-eld.html" style="color:var(--gold)">Every exemption, and what you still have to keep \u2192</a>'},
 {c:'Learn',k:['clearinghouse','drug test','alcohol test','random testing','consortium','ctpa','c/tpa','sap','return to duty','downgrade','cdl downgrade'],q:'What do I have to do about the Clearinghouse?',
  a:'Two things, and the second is the one people miss.<br><br><b>Join a consortium.</b> An owner-operator cannot run their own random testing: you must designate a C/TPA in the Clearinghouse. Roughly $50\u2013$150 a year.<br><br><b>Run the annual query by 5 January</b> for the previous year, on yourself, and keep the confirmation. It takes minutes and it is the most-missed obligation in the whole area: missed mostly by people with nothing to hide.<br><br>Since 18 November 2024 the stakes changed: a driver in prohibited status has the commercial privilege <b>downgraded by the state</b>, on top of losing the job.<br><br><a href="guide-clearinghouse.html" style="color:var(--gold)">The six test types and the return-to-duty process \u2192</a>'},

 {c:'Learn',k:['new entrant','safety audit','audit','dot audit','corrective action','cap','revoked','driver qualification','dq file'],q:'How do I pass the new entrant safety audit?',
  a:'Treat it as an inspection of your <b>filing</b>, not your truck. It happens within your first 12 months and there are <b>sixteen violations that fail it on their own</b> \u2014 five of them drug and alcohol programme failures, and the most common is simply not being in a consortium.<br><br>Build four folders on day one: driver qualification (including one on yourself), drug and alcohol, vehicle maintenance, hours of service. Then self-audit by taking each automatic failure and pointing at the document that disproves it.<br><br>If you do fail, you get <b>60 days</b> as a property carrier to remedy it. Miss that and the authority is revoked, not suspended.<br><br><a href="guide-new-entrant-audit.html" style="color:var(--gold)">The sixteen failures and a ninety-day plan \u2192</a>'},
 {c:'Learn',k:['fuel buying','cheap fuel','fuel card','pump price','net of tax','fuel stop','idling','idle','detour','discount fuel'],q:'How do I buy fuel cheaper?',
  a:'Stop comparing pump prices. Under IFTA the tax comes back to you, so the only comparable number is <b>pump price minus that state\u2019s fuel tax</b>, and state diesel taxes differ by far more than the price signs do. The stop with the cheapest sign is regularly not the cheapest fuel.<br><br>Then check the detour before you take it: <span class="mono">break-even miles = (gallons \u00d7 price difference) \u00f7 your cost per mile</span>. A twelve-mile detour at $1.85 CPM costs $22.20 to save $8.40.<br><br>And the biggest lever is not the buy at all. Going from 6.5 to 7.0 mpg over 100,000 miles saves about <b>$3,956</b> \u2014 more than any fuel card deal.<br><br><a href="guide-fuel-buying.html" style="color:var(--gold)">The full method, plus idling costed per mile \u2192</a>'},

 /* ── trust ── */
 {c:'Trust',k:['trust','believe','prove','verify','check','how do i know'],q:'Why should I trust the numbers?',
  a:'Do not. Verify them.<br><br>The formula is <a href="about.html#method" style="color:var(--gold)">printed in full</a>. The calculator is free and unlimited. Put in a load you already ran and check the result against your own books.<br><br>The reports I do for clients use exactly the same formula.'},
 {c:'Trust',k:['who built','company','team','behind','founder','registered'],q:'Who is behind this?',
  a:'<b>One person, not a company.</b> Aleksandar Novakovi\u0107, in Smederevo, Serbia. There is no registered legal entity behind this, and the <a href="legal.html#who" style="color:var(--gold)">legal information page</a> says so in full rather than hiding it behind corporate wording.<br><br>Paid services are agreed and invoiced by email, directly with him.<br><br>You will notice this site has no customer count, no "revenue tracked" figure and no testimonials. Those would have to be invented, and anyone senior enough to matter can tell.'},
 {c:'Trust',k:['refund','guarantee','money back','return'],q:'What is the refund policy?',
  a:'There is nothing to buy on this site, so there is no store refund policy.<br><br>For services, the scope and price are agreed by email before any work starts, and you pay by invoice before the report is sent. If I can\'t deliver what we agreed, you get your money back in full. The $49 Load Check is also refunded if the report doesn\'t help you decide on that load. See the <a href="refunds.html" style="color:var(--gold)">refund page</a>.'},
 {c:'Trust',k:['support','help','contact','email','talk','call','sales','person','bug'],q:'How do I reach a human?',
  a:'Email <a href="mailto:aleksnvkvc@gmail.com" style="color:var(--gold)">aleksnvkvc@gmail.com</a>. It comes straight to me.<br><br>If a calculation looks wrong, tell me which page and what you entered, and I\'ll check it.'},
];

const CHIP_GROUPS=[
 ['Product',   ['Is it really free?','Is there a subscription?','How much does it cost?','What can I hire you for?','What does LoadMargin do?']],
 ['Free tools',['What free calculators are there?','How does the fuel surcharge calculator work?','What does detention actually cost?','Should I use factoring?','Can it work out my IFTA?','How should I budget maintenance?']],
 ['The math',  ['How is profit calculated?','What is cost per mile?','How is deadhead handled?','What is my break-even rate?','How do I work out a counter-offer?','What margin should we target?','Per-mile or percentage driver pay?','How is detention priced?','Why rank by profit per truck-day?']],
 ['Operations',['What about hours of service?','How is fuel modelled?','Which of my lanes lose money?','Which customers are actually profitable?','Is this sized for my fleet?']],
 ['Learn',     ['Where can I learn the method?','How do I buy fuel cheaper?','How do I pass the new entrant safety audit?','Do I have to run an ELD?','What do I have to do about the Clearinghouse?','How do I handle a cargo claim?','What should insurance cost me?','How much should I set aside for tax?','What is a CSA score and does it matter?','Is a lease-purchase worth it?','How do I stop getting overweight tickets?','How do I negotiate a better rate?','How do I check a broker is real?','What does getting authority cost?','What do all these freight terms mean?']],
 ['Using it',  ['How do I get started?','Where does my data go?','What happens if I clear my browser?','Can my whole team use it?','Do you integrate with our TMS?','Does it work on a phone?','Why not just use a spreadsheet?']],
 ['Trust',     ['Why should I trust the numbers?','Who is behind this?','What is the refund policy?','How do I reach a human?']],
];
let CHIP_CAT='Product';

let asstStarted=false;
function openAsst(){
  $('asst').classList.add('show'); $('asstFab').style.display='none';
  if(!asstStarted){
    asstStarted=true;
    bot("Hi: I'm the LoadMargin assistant. I answer <strong>51 written questions</strong> about the method, the numbers and the products, instantly and without a form.<br><br>Pick a category below, or just type what you want to know.");
    renderChips();
  }
  setTimeout(()=>$('asstInput').focus(),260);
}
function closeAsst(){ $('asst').classList.remove('show'); $('asstFab').style.display='grid'; }
function renderChips(){
  const cats=CHIP_GROUPS.map(([c])=>
    `<button class="chip cat${c===CHIP_CAT?' on':''}" type="button" onclick="setChipCat('${c}')">${c}</button>`).join('');
  const qs=(CHIP_GROUPS.find(g=>g[0]===CHIP_CAT)||CHIP_GROUPS[0])[1];
  $('asstChips').innerHTML=
    `<div class="chip-cats">${cats}</div>`+
    `<div class="chip-qs">${qs.map(c=>
      `<button class="chip" type="button" onclick="askAsst(${JSON.stringify(c).replace(/"/g,'&quot;')})">${c}</button>`).join('')}</div>`;
}
function setChipCat(c){ CHIP_CAT=c; renderChips(); }
function push(cls,html){
  const d=document.createElement('div'); d.className='msg '+cls; d.innerHTML=html;
  $('asstBody').appendChild(d); $('asstBody').scrollTop=$('asstBody').scrollHeight; return d;
}
const bot=h=>push('bot',h);
function typing(){
  const d=document.createElement('div'); d.className='typing'; d.innerHTML='<i></i><i></i><i></i>';
  $('asstBody').appendChild(d); $('asstBody').scrollTop=$('asstBody').scrollHeight; return d;
}
function match(q){
  const s=q.toLowerCase();
  let best=null,score=0;
  KB.forEach(e=>{
    let sc=0;
    e.k.forEach(k=>{ if(s.includes(k)) sc+=k.length; });
    if(s.includes(e.q.toLowerCase().slice(0,18))) sc+=30;
    if(sc>score){score=sc;best=e;}
  });
  return score>=2?best:null;
}
function askAsst(preset){
  const inp=$('asstInput');
  const q=(preset||inp.value).trim();
  if(!q) return;
  inp.value='';
  push('me',q.replace(/[<>]/g,''));
  const t=typing();
  setTimeout(()=>{
    t.remove();
    const hit=match(q);
    if(hit) bot(hit.a);
    else bot("I don't have a written answer for that one. I cover 51 questions and I would rather say so than invent something about pricing or capability.<br><br>Two things that will get you further: the <strong>Q&amp;A section</strong> on this page goes deeper, and <a href='mailto:aleksnvkvc@gmail.com' style='color:var(--gold)'>emailing a person</a> gets you anything I cannot answer.<br><br><em>Try a category below, or ask about: cost per mile, deadhead, fuel surcharges, detention, IFTA, factoring, broker vetting, hours of service, refunds or data privacy.</em>");
    $('asstBody').scrollTop=$('asstBody').scrollHeight;
  }, 380+Math.random()*380);
}

/* ═══════════ MODALS ═══════════ */
function openModal(id){ $(id).classList.add('show'); document.body.style.overflow='hidden'; }
function closeModal(id){
  $(id).classList.remove('show'); document.body.style.overflow='';
  if(id==='demoModal'){ const v=$('demoVideo'); if(v){ v.pause(); } }
}
function openContact(){ openModal('contactModal');  }
function openDemo(){ openModal('demoModal'); }
addEventListener('click',e=>{ if(e.target.classList.contains('modal')) closeModal(e.target.id); });
addEventListener('keydown',e=>{
  if(e.key!=='Escape') return;
  document.querySelectorAll('.modal.show').forEach(m=>closeModal(m.id));
  if($('asst').classList.contains('show')) closeAsst();
});


/* ═══════════ INIT ═══════════ */
if($('rate')) calc(); if($('c1')) cpm();
observeReveals();
markActive();
