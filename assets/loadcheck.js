/* $49 Load Check: when a visitor clicks a Load Check email button, download the
   load form (Excel) and show a bubble that says what they got and what to do next.
   Static site: nothing is sent from here; the visitor emails the form themselves. */
(function(){
  var FORM='LoadMargin_Load_Check_Form.xlsx';
  var EMAIL='aleksnvkvc@gmail.com';
  var SUBJ='Quick Load Check request';
  var BODY_FILE="Hi,\n\nI'd like a $49 Quick Load Check. The filled-in load form is attached.\n\nThanks,\n";

  function mailto(body){ return 'mailto:'+EMAIL+'?subject='+encodeURIComponent(SUBJ)+'&body='+encodeURIComponent(body); }

  function download(){
    var a=document.createElement('a'); a.href=FORM; a.download=FORM; a.style.display='none';
    document.body.appendChild(a); a.click(); setTimeout(function(){ a.remove(); },500);
  }

  var css='.lc-back{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:1000;display:flex;align-items:flex-end;justify-content:center;padding:16px}'+
  '@media(min-width:640px){.lc-back{align-items:center}}'+
  '.lc-box{position:relative;width:min(100%,460px);background:#141416;color:#eef2fb;border:1px solid #38383d;border-radius:14px;padding:22px 20px 18px;box-shadow:0 24px 70px rgba(0,0,0,.6);font-family:Barlow,Inter,system-ui,sans-serif;line-height:1.5;animation:lcIn .25s ease}'+
  '@keyframes lcIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}'+
  '.lc-box h2{font-size:21px;margin:0 30px 6px 0;line-height:1.2}'+
  '.lc-box .lc-sub{color:#aab0bf;font-size:14px;margin:0 0 14px}'+
  '.lc-box ol{margin:0 0 16px;padding-left:20px;font-size:15px}.lc-box li{margin:6px 0}.lc-box b{color:#fff}'+
  '.lc-btn{display:flex;align-items:center;justify-content:center;width:100%;padding:13px 16px;border-radius:8px;font-weight:700;font-size:15px;text-decoration:none;margin-top:8px;cursor:pointer;border:1px solid transparent}'+
  '.lc-pri{background:#ff7a1a;color:#1a0b00}.lc-sec{background:transparent;color:#eef2fb;border-color:#4a4a50}'+
  '.lc-alt{display:block;text-align:center;margin-top:12px;font-size:13px;color:#aab0bf}.lc-alt a{color:#f5c542}'+
  '.lc-x{position:absolute;top:10px;right:12px;background:none;border:0;color:#aab0bf;font-size:24px;line-height:1;cursor:pointer}'+
  'html[data-theme="light"] .lc-box{background:#fff;color:#0e1b45;border-color:#d8dbe3}html[data-theme="light"] .lc-box b{color:#0e1b45}'+
  'html[data-theme="light"] .lc-box .lc-sub,html[data-theme="light"] .lc-alt{color:#55607a}html[data-theme="light"] .lc-sec{color:#0e1b45;border-color:#c9cdd8}html[data-theme="light"] .lc-alt a{color:#9a5b00}';

  function show(origHref){
    if(!document.getElementById('lcCss')){ var st=document.createElement('style'); st.id='lcCss'; st.textContent=css; document.head.appendChild(st); }
    var back=document.createElement('div'); back.className='lc-back'; back.setAttribute('role','dialog'); back.setAttribute('aria-modal','true'); back.setAttribute('aria-labelledby','lcTitle');
    back.innerHTML=
      '<div class="lc-box">'+
        '<button class="lc-x" type="button" aria-label="Close">&times;</button>'+
        '<h2 id="lcTitle">Your load form is downloading</h2>'+
        '<p class="lc-sub">File: <b>'+FORM+'</b> (Excel). Check your Downloads folder.</p>'+
        '<ol>'+
          '<li>Open it and fill in the <b>yellow cells</b>. Rough numbers are fine; leave blank what you don\'t know.</li>'+
          '<li>Email it to <b>'+EMAIL+'</b>. The button below opens the email for you; just attach the file.</li>'+
          '<li>I reply with a <b>$49 PayPal invoice</b>. After payment you get the one-page report within 2 business days.</li>'+
        '</ol>'+
        '<a class="lc-btn lc-pri" href="'+mailto(BODY_FILE)+'">Open the email</a>'+
        '<button class="lc-btn lc-sec" type="button" data-dl>Download the form again</button>'+
        '<span class="lc-alt">On a phone? <a href="'+origHref.replace(/"/g,'&quot;')+'">Skip the form and answer in the email</a></span>'+
      '</div>';
    document.body.appendChild(back);
    var prev=document.activeElement;
    function close(){ back.remove(); document.removeEventListener('keydown',esc); if(prev&&prev.focus) prev.focus(); }
    function esc(e){ if(e.key==='Escape') close(); }
    back.addEventListener('click',function(e){ if(e.target===back) close(); });
    back.querySelector('.lc-x').addEventListener('click',close);
    back.querySelector('[data-dl]').addEventListener('click',download);
    document.addEventListener('keydown',esc);
    back.querySelector('.lc-pri').focus();
  }

  document.addEventListener('click',function(e){
    var a=e.target.closest&&e.target.closest('a[href^="mailto:"]');
    if(!a||a.closest('.lc-box')) return;
    var h=a.getAttribute('href')||'';
    if(h.indexOf('subject=Quick%20Load%20Check')===-1) return;
    /* On phones an Excel download is a dead end: let the email open straight away. */
    if(window.matchMedia&&matchMedia('(pointer:coarse)').matches) return;
    e.preventDefault();
    download();
    show(h);
  });
})();
