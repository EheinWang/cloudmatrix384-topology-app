(function (g) {
  'use strict';
  const C = { servers:48, dies:16, planes:7, asics:16, ubLane:28, nominalLane:25, sio:270, hbm:1600, roce:25 };
  function endpoint(id) {
    const m = /^n(\d+):d(\d+)$/.exec(id);
    if (!m || +m[1]<1 || +m[1]>48 || +m[2]>15) throw new Error('无效设备：'+id);
    return {id,host:+m[1],die:+m[2],chip:Math.floor(+m[2]/2)};
  }
  const compare=(a,b)=>{const x=endpoint(a),y=endpoint(b);return x.host-y.host||x.die-y.die};
  const uniq=xs=>[...new Set(xs)].sort(compare);
  const label=id=>{const e=endpoint(id);return `N${String(e.host).padStart(2,'0')}.D${e.die}`};
  function estimate(options) {
    const o=Object.assign({sources:[],targets:[],mode:'pairs',transport:'ub',rate:'paper',planes:7,bytes:64*1024*1024,background:'none',backgroundPct:0},options);
    if (!Number.isInteger(+o.planes)||+o.planes<1||+o.planes>7) throw new Error('有效平面必须为1–7');
    if (!Number.isFinite(+o.bytes)||+o.bytes<=0||+o.bytes>2**50) throw new Error('消息大小超出范围');
    if (!['ub','roce'].includes(o.transport)||!['paper','nominal'].includes(o.rate)) throw new Error('未知速率模型');
    if (!['none','disjoint','endpoint','uplink'].includes(o.background)) throw new Error('未知背景流量模型');
    if (+o.backgroundPct<0||+o.backgroundPct>100) throw new Error('占用比例范围为0–100%');
    const A=uniq(o.sources),B=uniq(o.targets),U=uniq([...A,...B]);
    const collective=['alltoall','ring','allreduce'].includes(o.mode);
    if (collective && U.length<2) throw new Error('至少选择两个die');
    if (!collective && (!A.length||!B.length)) throw new Error('请分别选择发送组A与接收组B');
    if (!collective && A.some(id=>B.includes(id))) throw new Error('发送与接收组不能包含相同die');
    if (o.mode==='p2p' && (A.length!==1||B.length!==1)) throw new Error('单die点对点需要A、B各一个die；可改用逐die配对');
    if (['pairs','duplex'].includes(o.mode) && A.length!==B.length) throw new Error('逐die配对需要A、B数量相同，按节点号/die号配对');
    if (o.mode==='fanout'&&A.length!==1) throw new Error('一对多需要恰好一个发送die');
    if (o.mode==='fanin'&&B.length!==1) throw new Error('多对一需要恰好一个接收die');
    if (!['p2p','pairs','duplex','fanout','fanin','alltoall','ring','allreduce'].includes(o.mode)) throw new Error('未知传输模式');
    const lane=o.rate==='paper'?C.ubLane:C.nominalLane, perDie=lane*o.planes, perNode=perDie*16;
    const residual=1-o.backgroundPct/100;
    const resources=new Map(), hostUp=new Map(), hostDown=new Map();
    const paths={sio:0,local:0,cross:0,roce:0};let total=0,count=0,crossBytes=0;const samples=[];
    function add(key,bytes,capacity,description,type) {
      let r=resources.get(key);
      if (!r){r={key,bytes:0,capacity,description,type};resources.set(key,r)}
      r.bytes+=bytes;
    }
    function roleCap(cap){return o.background==='endpoint'?cap*residual:cap}
    function plus(map,key,value){map.set(key,(map.get(key)||0)+value)}
    function flow(x,y,bytes) {
      if (x===y)return;
      const a=endpoint(x),b=endpoint(y);let path='cross';
      if(o.transport==='roce')path='roce';
      else if(a.host===b.host&&a.chip===b.chip)path='sio';
      else if(a.host===b.host)path='local';
      paths[path]++;count++;total+=bytes;
      if(samples.length<64)samples.push({from:x,to:y,bytes,path});
      add(x+':hbm',bytes,C.hbm,label(x)+' HBM读＋写','hbm');add(y+':hbm',bytes,C.hbm,label(y)+' HBM读＋写','hbm');
      if(path==='roce') {
        add(x+':roce-tx',bytes,roleCap(C.roce),label(x)+' RoCE发送','roce');
        add(y+':roce-rx',bytes,roleCap(C.roce),label(y)+' RoCE接收','roce');
      } else if(path==='sio') {
        add(x+':sio-tx',bytes,roleCap(C.sio),label(x)+' → 同封装die（SIO）','sio');
        add(y+':sio-rx',bytes,roleCap(C.sio),label(y)+' SIO接收','sio');
      } else {
        add(x+':ub-tx',bytes,roleCap(perDie),label(x)+' UB发送（'+o.planes+'平面）','endpoint');
        add(y+':ub-rx',bytes,roleCap(perDie),label(y)+' UB接收（'+o.planes+'平面）','endpoint');
        if(path==='cross'){plus(hostUp,a.host,bytes);plus(hostDown,b.host,bytes);crossBytes+=bytes}
      }
    }
    if(['p2p','pairs','duplex'].includes(o.mode))A.forEach((a,i)=>{flow(a,B[i],o.bytes);if(o.mode==='duplex')flow(B[i],a,o.bytes)});
    if(o.mode==='fanout')B.forEach(b=>flow(A[0],b,o.bytes));
    if(o.mode==='fanin')A.forEach(a=>flow(a,B[0],o.bytes));
    if(o.mode==='alltoall')for(const a of U)for(const b of U)if(a!==b)flow(a,b,o.bytes/(U.length-1));
    if(['ring','allreduce'].includes(o.mode))U.forEach((a,i)=>flow(a,U[(i+1)%U.length],o.mode==='allreduce'?o.bytes*2*(U.length-1)/U.length:o.bytes));
    const upCap=perNode*(o.background==='uplink'?residual:1);
    for(const [h,b] of hostUp)add('n'+h+':uplink-tx',b,upCap,'N'+h+' 共享跨机上行','uplink');
    for(const [h,b] of hostDown)add('n'+h+':uplink-rx',b,upCap,'N'+h+' 共享跨机下行','uplink');
    // With uniform splitting each active plane/ASIC link sees B/(planes*16).
    // Their time bound is identical to B/(planes*16*lane); do not multiply this bound twice.
    const rs=[...resources.values()].map(r=>Object.assign(r,{seconds:r.capacity===0?Infinity:r.bytes/(r.capacity*1e9)})).sort((a,b)=>b.seconds-a.seconds);
    const time=Math.max(...rs.map(r=>r.seconds),0), aggregate=time===Infinity?0:total/time/1e9;
    const bottlenecks=rs.filter(r=>time===Infinity?r.seconds===Infinity:Math.abs(r.seconds-time)<=Math.max(1e-15,time*1e-8));
    const notes=[
      '理论是序列化时间下界，忽略协议/SDMA/软件/同步/排队；不是应用完成时间预测。',
      'UB跨机假设流量均匀分布在所选平面和各平面的16颗L2芯片；不指定实际选路或die到a/b绑定。',
      'HBM预算采用数据实际读写HBM且无缓存命中的简化假设；同封装SIO与UB的共享DMA内部约束未知。',
      '每条流按die计量；选择整颗NPU会展开两个die，逐die配对时两条流各传完整消息。'
    ];
    if(o.rate==='nominal')notes.push('标称口径将每die/平面按200Gbps计算，是独立参考上界，不能与论文224Gbps口径混算。');
    if(o.transport==='roce')notes.push('RoCE结果仅为已知NPU端口注入上界；外部交换拓扑、收敛比和拥塞未知，未预测端到端可达带宽。');
    if(o.background==='disjoint')notes.push('其他节点仅相互通信：理想无阻塞模型不扣减选中端点容量；真实共享缓冲/选路/CPU流量的隔离性未验收。');
    if(o.background==='endpoint'||o.background==='uplink')notes.push('背景占用比例是你输入的假设，施加于所有选中相关资源；不是监控读数或46节点实测。');
    if(o.mode==='duplex')notes.push('聚合带宽统计A→B和B→A实际字节之和，不可拿双向总和与单向196GB/s比较。');
    if(o.mode==='alltoall')notes.push('消息大小表示每die发送给其他die的总量，均匀分给N−1个对端；不含自拷贝。');
    if(o.mode==='fanout')notes.push('一对多按独立unicast复制计算，每条边均发送完整消息；未假设硬件multicast。');
    if(o.mode==='allreduce')notes.push('仅对指定逻辑ring：每rank发送2(N−1)/N×S字节；未预测HCCL的选路、层级算法和归约计算。');
    return {options:o,sources:A,targets:B,endpoints:U,flows:count,samples,totalBytes:total,crossBytes,paths,seconds:time,aggregateGBps:aggregate,
      algorithmGBps:o.mode==='allreduce'&&Number.isFinite(time)?o.bytes/time/1e9:null,
      capacities:{dieUbGBps:perDie,npuUbGBps:2*perDie,l1UplinkGBps:16*lane,nodeUplinkGBps:perNode,asicPortGBps:lane,sioGBps:C.sio,roceDieGBps:25},
      bottlenecks:bottlenecks.slice(0,8),bottleneckCount:bottlenecks.length,resources:rs.slice(0,16),notes};
  }
  const api={estimate,endpoint,label,compare,constants:C};g.CMModel=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
