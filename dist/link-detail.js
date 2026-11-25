(() => {
'use strict';
const $=id=>document.getElementById(id),NS='http://www.w3.org/2000/svg';
const colors=['#2768b2','#008576','#8860a3','#b77720','#367d94','#b64b61','#6167ac'];
const detail={host:48,chip:0,view:'first',plane:'all'};
function add(parent,tag,attrs={},text){const e=document.createElementNS(NS,tag);for(const [k,v]of Object.entries(attrs))e.setAttribute(k,v);if(text!==undefined)e.textContent=text;parent.appendChild(e);return e}
function render(){
 const svg=$('linkDetailSvg');svg.replaceChildren();
 const id0=detail.chip*2,id1=id0+1,shown=detail.view==='both'?[0,1]:[detail.view==='first'?0:1];
 const visible=Array.from({length:7},(_,i)=>i).filter(p=>detail.plane==='all'||p===+detail.plane);
 const count=shown.length*visible.length,total=shown.length*7;
 const profile=CM_APP.state.rate==='paper'?'论文UB口径：28 GB/s/方向/逻辑接口；未现场核验为物理口速率':'200G标称参考：25 GB/s/方向/子接口；不与论文口径混算';
 $('linkDialogTitle').textContent=`N${String(detail.host).padStart(2,'0')} · NPU ${detail.chip} 连接展开`;
 $('detailLinkCount').textContent=`显示 ${count} / ${total} 条UB逻辑连接`;
 $('detailRate').textContent=profile;
 $('detailDieMode').querySelector('[data-die-view=first]').textContent='只看 D'+id0;
 $('detailDieMode').querySelector('[data-die-view=second]').textContent='只看 D'+id1;
 for(const b of $('detailDieMode').children){b.classList.toggle('active',b.dataset.dieView===detail.view);b.setAttribute('aria-pressed',String(b.dataset.dieView===detail.view))}
 add(svg,'title',{id:'detailSvgTitle'},`N${detail.host} NPU${detail.chip}：${count}条可见UB逻辑连接`);
 add(svg,'desc',{id:'detailSvgDescription'},`D${id0}和D${id1}同属一个NPU；分别连接P1至P7的七颗L1。中间L1属于服务器。线不代表真实端口、SerDes lane或正在传输的流量。`);
 add(svg,'rect',{x:0,y:0,width:1040,height:600,rx:10,fill:'#f6f9fb'});
 add(svg,'text',{x:520,y:31,'text-anchor':'middle','font-size':18,'font-weight':650,fill:'#26495e'},'同一服务器的七颗L1 · 两个die各自连接全部七平面');
 const paths=add(svg,'g',{id:'detailConnectionPaths'}),boxes=add(svg,'g'),labels=add(svg,'g');
 for(let a=0;a<2;a++){
  const x=a?814:30,on=shown.includes(a),die=a?id1:id0;
  add(boxes,'rect',{x,y:60,width:196,height:448,rx:12,fill:on?'#e8f2f7':'#edf0f2',stroke:on?'#789bb2':'#ced8df','stroke-width':1.5});
  add(labels,'text',{x:x+98,y:94,'text-anchor':'middle','font-size':26,'font-weight':700,fill:on?'#24495f':'#879aa6'},'D'+die);
  add(labels,'text',{x:x+98,y:118,'text-anchor':'middle','font-size':14,fill:'#607c8d'},`NPU ${detail.chip} · ${a?'右侧示意':'左侧示意'}`);
  if(!on)add(labels,'text',{x:x+98,y:482,'text-anchor':'middle','font-size':14,fill:'#7e919e'},'当前隐藏连线');
 }
 for(let p=0;p<7;p++){
  const y=153+p*48,activePlane=visible.includes(p),color=colors[p];
  add(boxes,'rect',{x:440,y:y-18,width:160,height:36,rx:7,fill:activePlane?'#fff':'#f0f3f6',stroke:activePlane?color:'#cfdae3','stroke-width':1.7});
  add(labels,'text',{x:520,y:y+6,'text-anchor':'middle','font-size':18,'font-weight':650,fill:activePlane?color:'#8c9fab'},`L1·${p+1} / P${p+1}`);
  for(let a=0;a<2;a++){
   const die=a?id1:id0,on=shown.includes(a)&&activePlane,sx=a?814:226,tx=a?600:440;
   add(labels,'circle',{cx:sx,cy:y,r:5.5,fill:on?color:'#cbd7df',stroke:'#fff','stroke-width':1.5});
   add(labels,'text',{x:a?833:207,y:y+6,'text-anchor':a?'start':'end','font-size':16,'font-weight':650,fill:on?color:'#8e9fa9'},'P'+(p+1));
   if(!on)continue;
   const g=add(paths,'g',{'data-detail-link':`n${detail.host}:d${die}:p${p+1}`});
   const path=add(g,'path',{d:`M${sx},${y} H${tx}`,fill:'none',stroke:color,'stroke-width':3,'vector-effect':'non-scaling-stroke','data-die':die,'data-plane':p,class:'detail-ub-link'});
   add(path,'title',{},`D${die}.P${p+1} ↔ L1·${p+1}：逻辑接口`);
   add(labels,'text',{x:(sx+tx)/2,y:y-9,'text-anchor':'middle','font-size':15,'font-weight':600,fill:color,class:'detail-link-label'},`D${die}.P${p+1}`);
   add(labels,'circle',{cx:tx,cy:y,r:4,fill:color});
  }
 }
 // SIO is a separate on-package connection, never another UB plane.
 add(svg,'path',{d:'M128 509 V548 H912 V509',stroke:'#93719e','stroke-width':2,'stroke-dasharray':'6 4',fill:'none',class:'detail-sio-link'});
 add(svg,'rect',{x:333,y:532,width:374,height:29,rx:5,fill:'#f6f9fb'});
 add(svg,'text',{x:520,y:552,'text-anchor':'middle','font-size':16,fill:'#806087'},`D${id0} ↔ D${id1}：SIO独立通路，不计入UB线数`);
 add(svg,'text',{x:520,y:586,'text-anchor':'middle','font-size':14,fill:'#657e8f'},shown.length===2?'7条（左die）＋7条（右die）＝14条UB逻辑连接；L1仍只有7颗。':'每die共7条UB逻辑连接；选择“两个die”可查看整颗NPU的14条。');
}
function open(){
 const e=CMModel.endpoint(CM_APP.inspectedDie);detail.host=CM_APP.state.host;detail.chip=e.chip;
 detail.view=CM_APP.state.granularity==='npu'?'both':e.die%2?'second':'first';detail.plane='all';
 $('detailChip').value=detail.chip;$('detailPlane').value='all';render();$('linkDialog').showModal();
}
for(let c=0;c<8;c++)$('detailChip').add(new Option('NPU '+c,c));
for(let p=0;p<7;p++)$('detailPlane').add(new Option('只看 P'+(p+1),p));
$('detailChip').onchange=e=>{detail.chip=+e.target.value;render()};
$('detailPlane').onchange=e=>{detail.plane=e.target.value;render()};
$('detailDieMode').onclick=e=>{const b=e.target.closest('[data-die-view]');if(b){detail.view=b.dataset.dieView;render()}};
$('openLinkDetail').onclick=open;$('closeLinkDetail').onclick=()=>$('linkDialog').close();
$('inspector').addEventListener('click',e=>{if(e.target.closest('[data-open-link-detail]'))open()});
$('linkDialog').addEventListener('click',e=>{if(e.target!==$('linkDialog'))return;const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close()});
document.addEventListener('cm-scenario-change',()=>{if($('linkDialog').open)render()});
CM_APP.openLinkDetail=open;
})();
