/* CASK / BARREL サービスサイトの演出（M1〜M10）。外の部品は使わない。script はこの1ファイルだけ。
   素の表示は「動きなしで全部見える」。動きを減らす設定でないときだけ html に m を付けて動かす。
   章を固定して見せる形（章に付ける p）は、その章の全部の段が窓に入りきるときだけ。入らない窓では固定せずに、
   樽の図は通り過ぎる間になぞり、段は見えたときに現れる（動きが無くなる窓を作らない）。
   head で読み、m を先に付けてから（ちらつき防止）、残りは DOM ができてから組む。失敗したら m を外す。 */
(function(){
  'use strict';
  var d=document,root=d.documentElement,w=window;
  var mq=w.matchMedia?w.matchMedia('(prefers-reduced-motion: reduce)'):{matches:false};
  if(!mq.matches)root.classList.add('m');

  function $(s,c){return (c||d).querySelector(s)}
  function $$(s,c){return Array.prototype.slice.call((c||d).querySelectorAll(s))}
  function clamp(v){return v<0?0:v>1?1:v}

  /* 計測の差し込み口。計測の道具の script が入るまでは何もしない（analytics.md 4節の名前） */
  function goal(name){try{if(typeof w.plausible==='function')w.plausible(name)}catch(e){}}

  function setup(){
    var hdr=$('.site-header'),hero=$('.hero'),shot=$('.hero-shot'),stack=$('.hero-stack');
    var wh=$('.wh'),W=null,hand=$('.hand'),H=null;
    if(wh){
      W={fig:$('.wh-fig',wh),beam:$('.beam',wh),rings:$('.rings',wh),gauge:$('.gauge b',wh),caps:$$('.cap',wh),
        casks:$$('.c',wh).map(function(g){return {el:g,x:+g.getAttribute('data-x'),miss:g.classList.contains('miss'),on:false}})};
    }
    if(hand){
      H={stage:$('.hand-grid',hand),sts:$$('.st',hand),dots:$$('.dots li',hand),fly:$('.fly',hand),cDev:$('.c-dev',hand),cWeb:$('.c-web',hand)};
    }
    var threads=$$('[data-thread]').map(function(t){return {el:t,lis:$$('li',t)}});
    var reveals=$$('[data-reveal],.hand .st');
    var rail=$('.rail'),railLis=[],railSecs=[];
    if(rail){$$('li',rail).forEach(function(li){var s=$(li.firstElementChild.getAttribute('href'));if(s){railLis.push(li);railSecs.push(s)}})}
    var darks=$$('.on-navy');
    var on=false,ticking=false,io=null,vh=0,lay={tops:[],dark:[],heroB:0,docH:0},step=-1,capI=-1,flyT=0;

    /* 固定して見せる章の全部の段が、窓（ヘッダーの下）に入りきるか */
    function fits(s){
      var st=$('.pin-stage',s);
      return $$('.label,h2,.cap,.wh-fig,.st-copy,.st-fig .frame',s).every(function(el){
        var y=0,e=el;while(e&&e!==st){y+=e.offsetTop;e=e.offsetParent}
        return y>=hdr.offsetHeight-1&&y+el.offsetHeight<=st.clientHeight+1;
      });
    }
    function capsRoom(v){
      var c=$('.caps',wh);c.style.minHeight='';
      if(v)c.style.minHeight=Math.max.apply(null,[c.offsetHeight].concat(W.caps.map(function(e){return e.offsetHeight})))+'px';
    }
    function pinned(s){return s.classList.contains('p')}
    function refit(){
      [wh,hand].forEach(function(s){
        if(!s)return;
        s.classList.remove('flow');s.classList.add('p');if(s===wh)capsRoom(true);
        if(!fits(s)){s.classList.remove('p');s.classList.add('flow');if(s===wh)capsRoom(false)}
      });
    }

    function measure(){
      refit();
      vh=w.innerHeight;var y=w.pageYOffset;
      lay.heroB=hero?hero.getBoundingClientRect().bottom+y:0;
      lay.tops=railSecs.map(function(s){return s.getBoundingClientRect().top+y});
      lay.dark=darks.map(function(s){var r=s.getBoundingClientRect();return [r.top+y,r.bottom+y]});
      lay.docH=root.scrollHeight;
    }

    /* M3・M4 貯蔵庫をなぞって読む。p は固定された章の中の進み具合（0〜1）。
       0〜56% なぞる／50% から残った樽を示す／70〜94% 近さで探す（輪が詰まる。明滅させない）／98.5% で見つかる */
    function whApply(p){
      var s=clamp(p/.56),bx=-60+s*840,i,c,lit;
      W.beam.style.setProperty('--bx',bx.toFixed(1));
      W.beam.style.setProperty('--bo',(p<.56?1:clamp(1-(p-.56)/.06)).toFixed(2));
      for(i=0;i<W.casks.length;i++){c=W.casks[i];lit=!c.miss&&bx>=c.x-8;if(lit!==c.on){c.on=lit;c.el.classList.toggle('on',lit)}}
      var n=p<.5?0:p<.7?1:2;
      if(n!==capI){capI=n;W.caps.forEach(function(e,k){e.classList.toggle('is-on',k===n)})}
      wh.classList.toggle('moved',p>.03);
      wh.classList.toggle('ph2',p>=.5);
      wh.classList.toggle('ph3',p>=.7);
      var q=clamp((p-.7)/.24);
      W.rings.style.setProperty('--rs',(2.3-1.3*q).toFixed(3));
      W.gauge.style.setProperty('--g',q.toFixed(3));
      wh.classList.toggle('found',q>=.985);
    }

    /* M5 現場の端末から事務所の画面へ。4つの段。0→1 のとき、記録の札が端末から画面へ移る */
    function box(el){var x=0,y=0,e=el;while(e&&e!==H.stage){x+=e.offsetLeft;y+=e.offsetTop;e=e.offsetParent}return {x:x,y:y,w:el.offsetWidth,h:el.offsetHeight}}
    function flyReset(){if(!H)return;var f=H.fly.style;f.transition='none';f.opacity=0;f.transform='none';f.width='10px';f.height='10px'}
    function flight(){
      hand.classList.remove('arrived');
      var a=box(H.cDev),b=box(H.cWeb),f=H.fly.style;
      f.transition='none';f.width=a.w+'px';f.height=a.h+'px';
      f.transform='translate('+a.x+'px,'+a.y+'px)';f.opacity=1;
      H.fly.getBoundingClientRect();
      f.transition='transform .95s cubic-bezier(.65,0,.35,1)';
      f.transform='translate('+b.x+'px,'+b.y+'px) scale('+(b.w/a.w)+','+(b.h/a.h)+')';
      flyT=setTimeout(function(){hand.classList.add('arrived');f.transition='opacity .35s';f.opacity=0},960);
      setTimeout(function(){if(step===1&&on){f.transition='none';f.transform='none';f.width='10px';f.height='10px'}},1400);
    }
    function handApply(p){
      var n=Math.min(H.sts.length-1,Math.floor(p*H.sts.length));if(n===step)return;
      var prev=step;step=n;
      H.sts.forEach(function(s,i){s.classList.toggle('is-on',i===n)});
      H.dots.forEach(function(li,i){li.classList.toggle('on',i<=n);li.classList.toggle('thru',i<n)});
      clearTimeout(flyT);
      if(n===1&&prev===0&&H.fly&&H.cDev&&H.cWeb){flight()}
      else{flyReset();hand.classList.toggle('arrived',n>=1)}
    }

    /* M6 線と点。見えてくるにつれて、線が点をつないでいく */
    function threadApply(t,p){
      var n=t.lis.length;if(n<2)return;
      t.lis.forEach(function(li,i){var o=p>=(i/(n-1))*.9;li.classList.toggle('on',o);if(i>0)t.lis[i-1].classList.toggle('thru',o)});
    }

    function update(){
      ticking=false;if(!on)return;
      var y=w.pageYOffset,r,i,k;
      if(hdr&&hero)hdr.classList.toggle('over',y<lay.heroB-80);
      if(shot&&stack){r=shot.getBoundingClientRect();if(r.top<vh&&r.bottom>0)stack.style.setProperty('--hp',clamp((vh-r.top)/(vh*.5)).toFixed(3))}
      if(W){
        if(pinned(wh)){r=wh.getBoundingClientRect();if(r.top<vh&&r.bottom>0)whApply(clamp(-r.top/(r.height-vh)))}
        else{r=W.fig.getBoundingClientRect();if(r.top<vh&&r.bottom>0)whApply(clamp((vh*.85-r.top)/(vh*.85+r.height-vh*.45)))}
      }
      if(H&&pinned(hand)){r=hand.getBoundingClientRect();if(r.top<vh&&r.bottom>0)handApply(clamp(-r.top/(r.height-vh)))}
      threads.forEach(function(t){var tr=t.el.getBoundingClientRect();if(tr.top<vh&&tr.bottom>0)threadApply(t,clamp((vh*.86-tr.top)/(vh*.46)))});
      if(rail&&lay.tops.length>1){
        i=0;for(k=0;k<lay.tops.length;k++){if(y+vh*.4>=lay.tops[k])i=k}
        var next=lay.tops[i+1]!==undefined?lay.tops[i+1]:lay.docH;
        var local=clamp((y+vh*.4-lay.tops[i])/(next-lay.tops[i]));
        rail.style.setProperty('--rp',Math.min(1,(i+local)/(lay.tops.length-1)).toFixed(4));
        railLis.forEach(function(li,k2){li.classList.toggle('on',k2<=i)});
        var mid=y+vh*.5,dk=false;lay.dark.forEach(function(z){if(mid>=z[0]&&mid<z[1])dk=true});
        rail.classList.toggle('dark',dk);
      }
    }
    function req(){if(!ticking){ticking=true;w.requestAnimationFrame(update)}}

    function enable(){
      on=true;root.classList.add('m');step=-1;capI=-1;
      if(W)W.casks.forEach(function(c){c.on=false;c.el.classList.remove('on')});
      measure();
      if('IntersectionObserver' in w){
        io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})},{threshold:.16,rootMargin:'0px 0px -6% 0px'});
        reveals.forEach(function(e){io.observe(e)});
      }else{reveals.forEach(function(e){e.classList.add('in')})}
      update();
    }
    function disable(){
      on=false;root.classList.remove('m');[wh,hand].forEach(function(s){if(s)s.classList.remove('p','flow')});if(W)capsRoom(false);if(hdr)hdr.classList.remove('over');
      if(io){io.disconnect();io=null}
      reveals.forEach(function(e){e.classList.remove('in')});
      clearTimeout(flyT);flyReset();
    }
    function setMotion(v){if(v){if(!on)enable()}else if(on||root.classList.contains('m')){disable()}}

    w.addEventListener('scroll',req,{passive:true});
    w.addEventListener('resize',function(){if(on){flyReset();measure();req()}});
    var hand0=false;
    ['wheel','touchstart','pointerdown','keydown'].forEach(function(n){w.addEventListener(n,function(){hand0=true},{passive:true,once:true})});
    /* 印つきの住所（#faq など）で開いたとき: 章の高さが決まり直した後、人が動かしていなければ、その印へ置き直す */
    function land(){
      var t=!hand0&&w.location.hash.length>1&&d.getElementById(decodeURIComponent(w.location.hash.slice(1)));
      if(t)t.scrollIntoView({behavior:'instant',block:'start'});
    }
    w.addEventListener('load',function(){if(on){measure();land();req()}});
    if(d.fonts&&d.fonts.ready)d.fonts.ready.then(function(){if(on){measure();land();req()}});
    if(mq.addEventListener)mq.addEventListener('change',function(){setMotion(!mq.matches)});

    /* 計測: 申し込みのボタン（data-goal）と、募集の節が画面に入ったとき（data-goal-view。1回の訪問で1回） */
    d.addEventListener('click',function(e){var a=e.target&&e.target.closest?e.target.closest('[data-goal]'):null;if(a)goal(a.getAttribute('data-goal'))});
    if('IntersectionObserver' in w){
      $$('[data-goal-view]').forEach(function(s){
        var vo=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){goal(s.getAttribute('data-goal-view'));vo.disconnect()}})},{threshold:.2});
        vo.observe(s);
      });
    }

    setMotion(!mq.matches);
  }

  function safeSetup(){try{setup()}catch(e){root.classList.remove('m');$$('.pin').forEach(function(s){s.classList.remove('p','flow')})}}
  if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',safeSetup);else safeSetup();
})();
