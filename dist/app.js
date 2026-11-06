(() => {
'use strict';
const $=id=>document.getElementById(id),M=CMModel,D=CM_DATA,NS='http://www.w3.org/2000/svg';
const planeColors=['#567ec3','#47899b','#9671b3','#ba8261','#627ba5','#66927b','#927a99'];
const state={sources:['n48:d0'],targets:['n42:d0'],group:'sources',granularity:'die',host:48,layout:'logical',mode:'pairs',operation:'read',transport:'ub',rate:'paper',planes:7,bytes:67108864,background:'none',backgroundPct:0,planeFocus:'all',allLinks:false,cpuLinks:false};
let autoFit=true;let result=null,positions={},drag=null,view={x:0,y:0,k:1},world={w:3180,h:2090},toastTimer;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function el(type,attrs={},text){const n=document.createElementNS(NS,type);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);if(text!==undefined)n.textContent=text;return n}
function add(parent,type,attrs,text){const n=el(type,attrs,text);parent.appendChild(n);return n}
function fmt(n,d=2){return Number.isFinite(n)?n.toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d}):'∞'}
function bytes(n){if(n>=2**30)return fmt(n/2**30)+' GiB';if(n>=2**20)return fmt(n/2**20)+' MiB';return fmt(n/2**10)+' KiB'}
function toast(text){$('toast').textContent=text;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),2600)}
function applyView(){$('viewport').setAttribute('transform',`translate(${view.x} ${view.y}) scale(${view.k})`)}
function fit(){autoFit=true;const r=$('svgShell').getBoundingClientRect();view.k=Math.min((r.width-30)/world.w,(r.height-35)/world.h);view.x=(r.width-world.w*view.k)/2;view.y=10;applyView()}
function zoom(f,x,y){autoFit=false;const r=$('svgShell').getBoundingClientRect();x??=r.width/2;y??=r.height/2;const k=Math.max(.09,Math.min(4.5,view.k*f));view.x=x-(x-view.x)*k/view.k;view.y=y-(y-view.y)*k/view.k;view.k=k;applyView()}
function focusHost(h){autoFit=false;const p=positions['n'+h],r=$('svgShell').getBoundingClientRect();view.k=Math.min((r.width-45)/p.w,(r.height-50)/p.h,2);view.x=(r.width-p.w*view.k)/2-p.x*view.k;view.y=(r.height-p.h*view.k)/2-p.y*view.k;applyView()}
function serverPosition(h){if(state.layout==='racks'){const rack=Math.floor((h-1)/4),slot=(h-1)%4;return {x:25+(rack%6)*525,y:475+Math.floor(rack/6)*1140+slot*263,w:495,h:245}}return {x:25+((h-1)%8)*394,y:430+Math.floor((h-1)/8)*268,w:366,h:245}}
function l2Position(p,b){if(state.layout==='racks'){const rack=Math.floor(b/2);return{x:25+rack*790+(p%4)*190,y:55+Math.floor(p/4)*120+(b%2)*50,w:177,h:43}}return {x:25+p*450+(b%2)*209,y:75+Math.floor(b/2)*60,w:198,h:47}}
function drawTopology(){
 positions={};const root=$('nodes'),back=$('backdrops');root.replaceChildren();back.replaceChildren();world=state.layout==='racks'?{w:3190,h:2730}:{w:3175,h:2070};
 if(state.layout==='racks'){
  for(let r=0;r<4;r++){add(back,'rect',{x:15+r*790,y:12,width:777,height:327,rx:12,fill:'#eaf0f5',stroke:'#cfdae3'});add(root,'text',{x:32+r*790,y:37,'font-size':17,class:'rack-title'},`通信柜示意 ${r+1} · 每平面2台 / 共14台`)}
  for(let r=0;r<12;r++){const x=15+(r%6)*525,y=434+Math.floor(r/6)*1140;add(back,'rect',{x,y,width:518,height:1122,rx:12,fill:'#eef3f6',stroke:'#cddbe4'});add(root,'text',{x:x+18,y:y+25,'font-size':17,class:'rack-title'},`计算柜示意 ${r+1} · 4台服务器`)}
 }else{
  for(let p=0;p<7;p++){const x=15+p*450;add(back,'rect',{x,y:12,width:433,height:321,rx:12,fill:'#edf3f7',stroke:'#ccdbe5'});add(root,'text',{x:x+14,y:43,'font-size':20,fill:planeColors[p],'font-weight':650},`平面 P${p+1} · 8箱体 / 16芯片`)}
 }
 for(let p=0;p<7;p++)for(let b=0;b<8;b++){
  const q=l2Position(p,b);positions[`p${p}b${b}`]=q;
  const group=add(root,'g',{class:'device-click','data-kind':'l2','data-plane':p,'data-box':b});
  add(group,'rect',{x:q.x,y:q.y,width:q.w,height:q.h,rx:5,fill:'#fff',stroke:planeColors[p],'stroke-width':1.5});
  add(group,'text',{x:q.x+7,y:q.y+16,'font-size':12,fill:'#3f6075'},`L2 P${p+1} / B${b+1}`);
  for(let a=0;a<2;a++){let ax=q.x+q.w-87+a*40;add(group,'rect',{x:ax,y:q.y+8,width:34,height:30,rx:3,fill:'#e2eaf7',stroke:'#bacce3'});add(group,'text',{x:ax+17,y:q.y+28,'font-size':13,'text-anchor':'middle',fill:planeColors[p]},a?'b':'a');positions[`p${p}a${b*2+a}`]={x:ax+17,y:q.y+q.h}}
  add(group,'text',{x:q.x+7,y:q.y+34,'font-size':9,class:'svg-sub'},'48 QSFP-DD · 2子接口/口');
 }
 const ry=state.layout==='logical'?350:366;positions.roceCloud={x:world.w/2,y:ry+12};add(root,'rect',{x:world.w/2-300,y:ry-3,width:600,height:29,rx:6,fill:'#fff3e3',stroke:'#dfc298'});add(root,'text',{x:world.w/2,y:ry+16,'font-size':14,'text-anchor':'middle',fill:'#986b31'},'外部RoCE网络 · 仅逻辑出口，实际交换拓扑未知');
 if(state.layout==='logical')add(root,'text',{x:30,y:401,'font-size':21,fill:'#3f6075'},'48台服务器 · 每台7 L1 / 4 CPU / 8 NPU（16 die） · 线表示可达连接，并非实测选路');
 for(let h=1;h<=48;h++){
  const q=serverPosition(h),nx=q.x,ny=q.y,w=q.w;positions['n'+h]=q;
  const g=add(root,'g',{'data-host':h});add(back,'rect',{x:nx,y:ny,width:w,height:q.h,rx:9,fill:'#fff',stroke:'#bfced8','stroke-width':h===state.host?2.6:1.2,class:h===state.host?'server-focus':''});
  add(g,'text',{x:nx+13,y:ny+23,'font-size':18,'font-weight':700,class:'node-label','data-kind':'host','data-host':h},`N${String(h).padStart(2,'0')}`);
  add(g,'text',{x:nx+w-14,y:ny+22,'font-size':11,'text-anchor':'end',class:'svg-sub'},'8 × 910C / 4 × CPU');
  for(let p=0;p<7;p++){const x=nx+14+p*(w-28)/7,pw=(w-35)/7-3;positions[`n${h}p${p}`]={x:x+pw/2,y:ny+45};const z=add(g,'g',{'data-kind':'l1','data-host':h,'data-plane':p,class:'device-click'});add(z,'rect',{x,y:ny+35,width:pw,height:22,rx:3,fill:'#e5edf9',stroke:planeColors[p]});add(z,'text',{x:x+pw/2,y:ny+50,'font-size':10,'text-anchor':'middle',fill:planeColors[p]},'L1·'+(p+1))}
  for(let c=0;c<4;c++){const x=nx+14+c*(w-28)/4;positions[`n${h}cpu${c}`]={x:x+(w-40)/8,y:ny+80};const z=add(g,'g',{'data-kind':'cpu','data-host':h,'data-cpu':c,class:'device-click'});add(z,'rect',{x,y:ny+69,width:(w-40)/4,height:22,rx:3,fill:'#f0e9f5',stroke:'#c9b4d8'});add(z,'text',{x:x+(w-40)/8,y:ny+84,'font-size':11,'text-anchor':'middle',fill:'#866698'},'CPU'+c)}
  for(let chip=0;chip<8;chip++){
   const cw=(w-45)/4,x=nx+12+(chip%4)*(cw+7),y=ny+104+Math.floor(chip/4)*54;
   add(g,'rect',{x,y,width:cw,height:48,rx:5,class:'npu-outline'});
   add(g,'text',{x:x+cw/2,y:y+13,'font-size':10,'text-anchor':'middle',class:'svg-sub'},'NPU '+chip);
   for(let a=0;a<2;a++){const d=chip*2+a,id=`n${h}:d${d}`,dw=(cw-13)/2,dx=x+4+a*(dw+5);positions[id]={x:dx+dw/2,y:y+33};const z=add(g,'g',{'data-kind':'die','data-id':id,class:'device-click'});add(z,'rect',{x:dx,y:y+21,width:dw,height:20,rx:3,class:'die-rect'+(state.sources.includes(id)?' die-source':state.targets.includes(id)?' die-target':'')});add(z,'text',{x:dx+dw/2,y:y+35,'text-anchor':'middle','font-size':11,fill:'#355368'},'D'+d)}
   add(g,'line',{x1:x+cw/2-3,y1:y+32,x2:x+cw/2+3,y2:y+32,stroke:'#986aa8','stroke-width':2});
  }
  positions[`n${h}eth`]={x:nx+w/2,y:ny+226};
  const e=add(g,'g',{'data-kind':'eth','data-host':h,class:'device-click'});add(e,'rect',{x:nx+12,y:ny+216,width:w-24,height:20,rx:4,fill:'#fff4e6',stroke:'#e1c69f'});add(e,'text',{x:nx+w/2,y:ny+230,'font-size':10,'text-anchor':'middle',fill:'#a26f2e'},'参数面 CDR · 8 × 400G → 外部RoCE网络（拓扑未知）');
 }
 drawLinks();applyView();
}
function drawLinks(){
 const root=$('links');root.replaceChildren();const fragment=document.createDocumentFragment();
 const all=new Set([...state.sources,...state.targets]);const selectedHosts=new Set([...all].map(id=>M.endpoint(id).host));const ps=Array.from({length:7},(_,i)=>i).filter(p=>state.planeFocus==='all'||p===+state.planeFocus);
 const ubDie=new Set(),crossHosts=new Set(),sioEdges=[];
 if(result)for(const f of result.samples){
  if(['local','cross'].includes(f.path)){ubDie.add(f.from);ubDie.add(f.to)}
  if(f.path==='cross'){crossHosts.add(M.endpoint(f.from).host);crossHosts.add(M.endpoint(f.to).host)}
  if(f.path==='sio')sioEdges.push(f);
 }
 if(result&&result.flows>64&&['alltoall','ring','allreduce'].includes(state.mode)){for(const id of all)ubDie.add(id);if(selectedHosts.size>1)for(const h of selectedHosts)crossHosts.add(h)}
 function line(a,b,color,opacity=.4,width=1.3,bend=80){if(!a||!b)return;add(fragment,'path',{d:`M${a.x},${a.y} C${a.x},${a.y-bend} ${b.x},${b.y+bend} ${b.x},${b.y}`,stroke:color,'stroke-opacity':opacity,'stroke-width':width,fill:'none',class:'chartline'})}
 for(let h=1;h<=48;h++){
  if(!state.allLinks&&!selectedHosts.has(h))continue;
  for(const p of ps){
   const origin=positions[`n${h}p${p}`];
   if(state.allLinks||(state.transport==='ub'&&crossHosts.has(h)))for(let a=0;a<16;a++)line(origin,positions[`p${p}a${a}`],planeColors[p],state.allLinks?.045:.23,state.allLinks?.8:1.6);
   for(let d=0;d<16;d++)if(state.allLinks||ubDie.has(`n${h}:d${d}`))line(positions[`n${h}:d${d}`],origin,planeColors[p],state.allLinks?.10:.57,1.4,35);
   if(state.cpuLinks)for(let c=0;c<4;c++)line(positions[`n${h}cpu${c}`],origin,'#bd6976',.4,1.1,20);
  }
  if(state.cpuLinks)for(let c=0;c<4;c++)for(let d=c+1;d<4;d++)line(positions[`n${h}cpu${c}`],positions[`n${h}cpu${d}`],'#9279a5',.5,1.5,20);
  if(state.transport==='roce'&&selectedHosts.has(h)){
   for(const id of all)if(M.endpoint(id).host===h)line(positions[id],positions[`n${h}eth`],'#c98b3c',.7,2,20);
   line(positions[`n${h}eth`],positions.roceCloud,'#c98b3c',.38,2.5);
  }
 }
 for(const f of sioEdges)line(positions[f.from],positions[f.to],'#8d5ba8',.9,3,8);
 root.appendChild(fragment);
}
function select(ids){const key=state.group,other=key==='sources'?'targets':'sources';const remove=ids.every(id=>state[key].includes(id));state[key]=remove?state[key].filter(id=>!ids.includes(id)):Msort([...state[key],...ids]);state[other]=state[other].filter(id=>!ids.includes(id));update()}
function Msort(ids){return [...new Set(ids)].sort(M.compare)}
function selectDie(id){const e=M.endpoint(id);state.host=e.host;$('host').value=e.host;select(state.granularity==='npu'?[`n${e.host}:d${e.chip*2}`,`n${e.host}:d${e.chip*2+1}`]:[id])}
function drawPicker(){const h=state.host;$('diePicker').innerHTML=Array.from({length:8},(_,c)=>`<div class="npu-pick"><button class="chip-label" data-chip="${c}" title="选择NPU ${c}的两个die">NPU ${c}</button><div class="die-pair">${[c*2,c*2+1].map(d=>{const id=`n${h}:d${d}`;return `<button class="die-button ${state.sources.includes(id)?'source':state.targets.includes(id)?'target':''}" data-id="${id}" aria-pressed="${state.sources.includes(id)||state.targets.includes(id)}" aria-label="节点${h} NPU${c} die${d}">D${d}</button>`}).join('')}</div></div>`).join('');$('cpuPicker').innerHTML=[0,1,2,3].map(c=>`<button data-cpu="${c}">CPU ${c} · DRAM</button>`).join('')+'<button data-eth="1">CDR / 8 RoCE口</button>'}
function inspect(kind,h,p,b,c){let title='',text='';
 if(kind==='cpu'){title=`N${h} · CPU ${c} / DRAM`;text='每CPU约160GB/s单向UB总量（论文）。图中CPU↔L1的8×30G是30GB/s的图示原始速率，不能将七条相加视为可用带宽。机内四socket为full-mesh NUMA；CPU之间每条线的带宽尚未确认。跨机Host内存DMA尚无有效实测带宽。'}
 if(kind==='l1'){title=`N${h} · L1 平面${+p+1}`;text='下接16个die，每die在此平面28GB/s；上接对应平面的16颗L2芯片，每条28GB/s，共448GB/s。上行包装为8个QSFP-DD笼口，每口双子接口。CPU也接入此层；没有证据证明CPU与NPU额外注入可超出共享上行。'}
 if(kind==='l2'){title=`L2 · P${+p+1}/B${+b+1}`;text='一台LingQu 630：两颗ASIC a/b，每颗连接48个节点。论文口径每ASIC端口28GB/s，每ASIC合计1344GB/s，每箱体2688GB/s单向端口总量。手册端口标称400G=2×200G全双工。此编号为逻辑编排，尚未取得现场端口表。'}
 if(kind==='eth'){title=`N${h} · 参数面RoCE`;text='8个400G笼口，经混合板4颗CDR接8个NPU；每个NPU有两个die，各自200Gbps RDMA接口。外部RoCE交换机不是上方56台UB设备。已测窗口NPU RoCE所查计数不增长，不等于链路不存在或所有应用都不用它。'}
 if(kind==='die'){const e=M.endpoint(h);title=M.label(h)+' · NPU '+e.chip;text='独立die：HBM 64GB / 标称1600GB/s，UB 7×28=196GB/s单向；同封装另一die的SIO连接270GB/s单向；RoCE接口200Gbps=25GB/s。两die到L2 a/b芯片的固定接线和实际选路未确认。'}
 $('inspector').innerHTML=`<h4>${esc(title)}</h4><p>${esc(text)}</p><p class="fine">来源：论文v2 §3.3 / Atlas A3白皮书 / LingQu指南</p>`;
}
function readControls(){for(const key of ['mode','operation','transport','rate','background'])state[key]=$(key).value;state.planes=+$('planes').value;state.backgroundPct=+$('backgroundPct').value;state.bytes=+$('size').value*({KiB:1024,MiB:1048576,GiB:1073741824}[$('sizeUnit').value]);$('planesValue').textContent=state.planes+' / 7';$('bgValue').textContent=state.backgroundPct+'%';$('backgroundPct').disabled=!['endpoint','uplink'].includes(state.background);$('planes').disabled=state.transport==='roce';$('rate').disabled=state.transport==='roce';$('operation').disabled=['ring','alltoall','allreduce'].includes(state.mode);$('sizeLabel').textContent=state.mode==='alltoall'?'每die总发送量':state.mode==='allreduce'?'每rank张量大小':'每条die流消息';}
function renderResult(){
 try{result=M.estimate(state)}catch(e){result=null;$('result').innerHTML=`<div class="warning">${esc(e.message)}</div><p class="note">可选择左侧示例，或调整发送/接收组。</p>`;return}
 const r=result,c=r.capacities,duplex=state.mode==='duplex';let path='';
 if(r.paths.cross)path+='源die → L1 → L2 → 目的L1 → 目的die';
 if(r.paths.local)path+=(path?'<br>':'')+'同机跨NPU：die → L1 → die';
 if(r.paths.sio)path+=(path?'<br>':'')+'同封装：die → SIO → die';
 if(r.paths.roce)path='die → CDR → 外部RoCE网络 → CDR → die';
 const us=r.seconds*1e6;const timeLabel=us>1000?fmt(us/1000)+' ms':fmt(us)+' μs';
 let ref=D.measured.find(v=>v.study==='2026-11-03'&&v.variant==='matched_cross'&&v.dies===r.sources.length&&v.bytes===state.bytes&&v.operation===state.operation);
 if(!ref&&r.sources.length===1)ref=D.measured.find(v=>v.study==='2026-11-03'&&v.variant==='sizes'&&v.dies===1&&v.bytes===state.bytes&&v.operation===state.operation);
 if(!ref&&r.sources.length===16)ref=D.measured.find(v=>v.variant==='longwindow'&&v.bytes===state.bytes&&v.operation===state.operation);
 const canRef=state.transport==='ub'&&state.mode==='pairs'&&r.paths.cross===r.flows;
 $('result').innerHTML=`<div class="result-overview"><span class="result-status">${state.transport==='roce'?'仅端点注入上界':'理想序列化上界'}${duplex?' · 双向合计':''}</span><div class="result-main">${fmt(r.aggregateGBps,r.aggregateGBps>999?0:2)} <small>GB/s</small></div><div class="result-label">${duplex?'双向各实际传输字节的合计':'全部有向流实际发送字节的聚合'}<br>不是每条流都能独占此数值</div><div class="result-secondary"><div><b>${timeLabel}</b><span>理想传输时间下界</span></div><div><b>${r.flows.toLocaleString()}</b><span>有向流 · ${bytes(r.totalBytes)}总量</span></div></div></div>
 <div class="result-section"><div class="path">${path}</div><p class="fine">${['ring','alltoall','allreduce'].includes(state.mode)?'集合通信采用指定逻辑流量模型，不假设具体DMA读写指令。':state.mode==='duplex'?'对等双向传输：分别累计两个方向的数据量。':state.operation==='read'?'远端读：接收方发起，数据从A到B。':'远端写：发送方发起，数据从A到B。'}读写的物理上界相同，实际协议与SDMA效率可能不同。</p>${r.algorithmGBps!==null?`<p class="note"><b>Ring算法带宽 S/t：${fmt(r.algorithmGBps)} GB/s</b><br>上方聚合值统计ring网络字节，口径不同。</p>`:''}
 <h4>当前限制资源</h4>${r.bottlenecks.slice(0,3).map(v=>`<div class="bottleneck">${esc(v.description)}<br><b>${fmt(v.capacity)} GB/s</b> · ${bytes(v.bytes)}</div>`).join('')}${r.bottleneckCount>3?`<p class="fine">共${r.bottleneckCount}个资源具有相同下界</p>`:''}
 <h4>基础容量 · 单向</h4><p class="note">每die UB ${fmt(c.dieUbGBps,0)} GB/s<br>整NPU双die ${fmt(c.npuUbGBps,0)} GB/s<br>每节点UB上行 ${fmt(c.nodeUplinkGBps,0)} GB/s</p>
 ${canRef&&ref?`<h4>同型历史${state.operation==='read'?'读':'写'}拷贝参考</h4><p class="note"><b>${fmt(ref.gbps)} GB/s</b>（${fmt(ref.min)}–${fmt(ref.max)}）<br>${ref.dies}对die · ${bytes(ref.bytes)} · 2026-11-03<br>仅历史配置参考，未验证当前选中节点。</p>`:''}</div>
 <div class="result-notes">${r.notes.filter((v,i)=>i<2||v.includes('背景')||v.includes('其他节点')||v.includes('RoCE结果')||v.includes('消息大小')||v.includes('ring')).map(v=>`<p class="note">${esc(v)}</p>`).join('')}</div>`;
}
function update(draw=true){readControls();$('sourceCount').textContent=state.sources.length+' die';$('targetCount').textContent=state.targets.length+' die';$('sourceNames').textContent=state.sources.map(M.label).join(', ')||'未选择';$('targetNames').textContent=state.targets.map(M.label).join(', ')||'未选择';renderResult();drawPicker();if(draw)drawTopology()}
function preset(name){state.sources=[];state.targets=[];$('mode').value='pairs';$('operation').value='read';$('transport').value='ub';$('size').value=64;$('sizeUnit').value='MiB';$('planes').value=7;$('background').value='none';$('backgroundPct').value=0;
 if(name==='pair'){state.sources=['n48:d0'];state.targets=['n42:d0']}
 if(name==='chip'){state.sources=['n48:d0','n48:d1'];state.targets=['n42:d0','n42:d1']}
 if(name==='node'||name==='all'){state.sources=Array.from({length:16},(_,d)=>`n48:d${d}`);state.targets=Array.from({length:16},(_,d)=>`n42:d${d}`);if(name==='all')$('mode').value='alltoall'}
 if(name==='sio'){state.sources=['n48:d0'];state.targets=['n48:d1']}
 if(name==='local'){state.sources=['n48:d0'];state.targets=['n48:d2']}
 if(name==='hotspot'){state.sources=[45,46,47,48].map(h=>`n${h}:d0`);state.targets=['n42:d0'];$('mode').value='fanin'}
 if(name==='ring'){state.sources=['n48:d0','n48:d1'];state.targets=['n42:d0','n42:d1'];$('mode').value='allreduce'}
 state.host=48;$('host').value=48;update();inspect('die',state.sources[0]);toast('已载入示例；每条die流的数据量独立计算')}
function evidence(){
 const rows=[['die ↔ L1，每平面','224Gbps = 28GB/s','论文v2 §3.3.1','每die7路，共196GB/s'],['NPU ↔ L1，每平面','8×56G = 448Gbps = 56GB/s','组网图＋论文双die','合并两die；不是单die56GB/s'],['L1 ↔ L2，每ASIC子链路','28GB/s（论文） / 200G（手册标称）','论文图5＋LingQu逻辑图','8笼口=16子链路；对应16颗L2芯片'],['单个L1上行总量','16×28 = 448GB/s','论文v2 §3.3.2','7 L1 → 3136GB/s / 节点'],['L2箱体全部端口总量','48×2×28 = 2688GB/s','同上，算术推导','是所有端口合计，不是一对节点专享'],['CPU ↔ L1，图中红线','8×30G = 30GB/s（图示算术）','Atlas开局指导书图3-48','CPU端点总量约160GB/s，不能合成210GB/s'],['同封装die ↔ die','270GB/s / 方向','论文v2图3','不需要L2；硬件上限不是SDMA实测'],['每die ↔ RoCE','200Gbps = 25GB/s','论文v2 §3.3.1','双die合并为NPU400G，CDR不提供UB交换'],['CPU ↔ CPU，机内','未知逐边速率','论文确认full-mesh NUMA','不拿CPU UB总量替代私有互联速率'],['跨节点CPU DRAM访问','无有效现场带宽测量','HiXL/EMS描述＋本机尝试','需显式注册/授权/同步；不证明透明缓存一致性']];
 $('capacityTable').innerHTML='<div class="table-scroll"><table><thead><tr><th>图中链路</th><th>每方向容量</th><th>依据</th><th>边界</th></tr></thead><tbody>'+rows.map(r=>'<tr>'+r.map((v,i)=>`<td>${i===1?'<b>':''}${esc(v)}${i===1?'</b>':''}</td>`).join('')+'</tr>').join('')+'</tbody></table></div>';
 const levels={confirmed:'文档确认',inference:'图示推导',derived:'算术推导',bounded:'部分确认 / 边界保留',measured:'实测观测'};
 $('facts').innerHTML=D.facts.map(f=>`<article class="fact"><span class="badge">${levels[f.level]}</span><h3>${esc(f.title)}</h3><p>${esc(f.text)}</p><small>依据：${f.sources.join(' · ')}</small></article>`).join('');
 const ms=D.measured.filter(x=>(x.variant==='longwindow')||(x.variant==='matched_cross'&&[1048576,16777216,134217728].includes(x.bytes))||(x.study==='2026-11-04'&&x.variant==='cross'));
 $('measurements').innerHTML='<div class="table-scroll"><table><thead><tr><th>实验</th><th>并发／大小</th><th>方向</th><th>payload GB/s</th><th>三次范围</th></tr></thead><tbody>'+ms.map(v=>`<tr><td>${esc(v.study)} · ${v.variant==='longwindow'?'16die长窗口':v.streams?v.streams+' streams':'单die跨机'}</td><td>${v.dies}对 / ${bytes(v.bytes)}</td><td>${v.operation===state.operation?'读':'写'}</td><td><b>${fmt(v.gbps)}</b></td><td>${fmt(v.min)}–${fmt(v.max)}</td></tr>`).join('')+'</tbody></table></div>';
 $('sources').innerHTML=D.sources.map(s=>`<article class="source-card"><b>${s.id} · ${esc(s.title)}</b><p>${esc(s.pages||s.scope)}</p><p>${esc(s.file)}</p>${s.url?`<a href="${esc(s.url)}" target="_blank" rel="noopener">查看公开原文 ↗</a>`:''}<p>${esc(s.scope)}</p></article>`).join('');
}
for(let h=1;h<=48;h++)$('host').add(new Option('N'+String(h).padStart(2,'0'),h));$('host').value=48;
for(let p=0;p<7;p++)$('planeFocus').add(new Option('平面 '+(p+1),p));
for(const b of document.querySelectorAll('.tab'))b.addEventListener('click',()=>{document.querySelectorAll('.tab,.page').forEach(x=>x.classList.remove('active'));b.classList.add('active');$(b.dataset.tab).classList.add('active');if(b.dataset.tab==='explore')fit()});
$('preset').addEventListener('change',e=>preset(e.target.value));
$('group').addEventListener('click',e=>{const b=e.target.closest('[data-group]');if(!b)return;state.group=b.dataset.group;for(const x of $('group').children)x.classList.toggle('active',x===b)});
$('granularity').addEventListener('change',e=>state.granularity=e.target.value);
for(const id of ['mode','operation','transport','rate','size','sizeUnit','planes','background','backgroundPct'])$(id).addEventListener('input',()=>{update(false);drawLinks()});
$('clearA').onclick=()=>{state.sources=[];update()};$('clearB').onclick=()=>{state.targets=[];update()};
$('host').onchange=e=>{state.host=+e.target.value;drawPicker();drawTopology()};$('focusNode').onclick=()=>focusHost(state.host);$('selectNode').onclick=()=>{const ids=Array.from({length:16},(_,d)=>`n${state.host}:d${d}`),other=state.group==='sources'?'targets':'sources';state[state.group]=Msort([...state[state.group],...ids]);state[other]=state[other].filter(id=>!ids.includes(id));update()};
$('diePicker').onclick=e=>{const die=e.target.closest('[data-id]'),chip=e.target.closest('[data-chip]');if(die){selectDie(die.dataset.id);inspect('die',die.dataset.id)}else if(chip)select([0,1].map(a=>`n${state.host}:d${+chip.dataset.chip*2+a}`))};
$('cpuPicker').onclick=e=>{if(e.target.dataset.cpu!==undefined)inspect('cpu',state.host,0,0,+e.target.dataset.cpu);if(e.target.dataset.eth)inspect('eth',state.host)};
for(const id of ['allLinks','cpuLinks'])$(id).onchange=e=>{state[id]=e.target.checked;drawLinks()};$('planeFocus').onchange=e=>{state.planeFocus=e.target.value;drawLinks()};
$('layout').onchange=e=>{state.layout=e.target.value;drawTopology();fit();$('canvasHint').textContent=state.layout==='racks'?'典型12＋4机柜示意 · 节点编号到实际柜位未核验':'示意布局 · 未核验实际机柜位置与端口接线表'};
$('zoomIn').onclick=()=>zoom(1.45);$('zoomOut').onclick=()=>zoom(1/1.45);$('fit').onclick=fit;
$('topology').addEventListener('wheel',e=>{e.preventDefault();const r=$('topology').getBoundingClientRect();zoom(Math.exp(-e.deltaY*.0015),e.clientX-r.left,e.clientY-r.top)},{passive:false});
$('topology').addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,vx:view.x,vy:view.y,target:e.target,moved:false};$('topology').setPointerCapture(e.pointerId)});
$('topology').addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.abs(dx)+Math.abs(dy)>4)drag.moved=true;if(drag.moved){autoFit=false;view.x=drag.vx+dx;view.y=drag.vy+dy;applyView()}});
$('topology').addEventListener('pointerup',e=>{if(!drag)return;const d=drag;drag=null;if(d.moved)return;const t=d.target.closest('[data-kind]');if(!t)return;const k=t.dataset.kind;if(k==='die'){selectDie(t.dataset.id);inspect('die',t.dataset.id)}else if(k==='host'){state.host=+t.dataset.host;$('host').value=state.host;drawPicker();focusHost(state.host)}else inspect(k,+t.dataset.host,+t.dataset.plane,+t.dataset.box,+t.dataset.cpu)});
$('topology').addEventListener('pointercancel',()=>drag=null);
$('export').onclick=()=>{if(!result){toast('请先配置有效场景');return}const data={appVersion:D.version,created:new Date().toISOString(),scenario:state,result,assumptions:result.notes,sources:D.sources,nonFiniteNote:'Infinity is serialized as string when a resource is fully occupied.'};const blob=new Blob([JSON.stringify(data,(k,v)=>typeof v==='number'&&!Number.isFinite(v)?String(v):v,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='CM384-bandwidth-scenario.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};
new ResizeObserver(()=>{if(autoFit&&$('explore').classList.contains('active'))fit()}).observe($('svgShell'));
evidence();update();fit();inspect('die','n48:d0');
window.CM_APP={state,get result(){return result},preset,fit,focusHost};
})();
