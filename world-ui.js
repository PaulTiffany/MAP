// Optional human controls for the same command boundary exposed to agents.
// No object behavior or independent animation loop belongs in this module.
import { forestConfig } from './scene-config.js';

export function createWorldUI({manifest,observe,dispatch,setDirectorEnabled,isDirectorEnabled,requestFrame}) {
  const $=id=>document.getElementById(id);
  const panel=$('sticker-panel'), guide=$('path-guides'), ctx=guide.getContext('2d');
  const buttons=[];
  let serial=0, available=false;
  const commandId=()=>`human:${Date.now()}:${++serial}`;
  function setOpen(open) {
    panel.hidden=!open;
    document.body.classList.toggle('directing',open);
    $('direct-button').setAttribute('aria-expanded',String(open));
    (open?$('close-stickers'):$('direct-button')).focus({preventScroll:true});
    if(open) refresh();
  }
  const explanations={busy:'That object is finishing its current action. Try again shortly.',
    paused:'The forest is paused. Resume motion before directing an object.',
    cooldown:'Let that call settle for a moment.',unavailable:'Animated graphics are unavailable on this device.',
    'stale-revision':'The world changed. Inspect it again before retrying.'};
  function send(def) {
    const receipt=dispatch({id:commandId(),object:def.object,action:def.action,args:def.args??{}});
    $('command-status').textContent=receipt.ok
      ? `${def.label}. Accepted · ${def.object} · revision ${receipt.revision}. Ambient choices are off.`
      : explanations[receipt.reason]??`Not applied: ${receipt.reason}.`;
    refresh();requestFrame();
    return receipt;
  }
  for(const def of manifest.controls??[]) {
    const button=document.createElement('button');button.type='button';button.textContent=def.label;
    button.dataset.object=def.object;button.dataset.action=def.action;
    button.addEventListener('click',()=>send(def));$('sticker-actions').append(button);buttons.push(button);
  }
  $('direct-button').addEventListener('click',()=>setOpen(panel.hidden));
  $('close-stickers').addEventListener('click',()=>setOpen(false));
  panel.addEventListener('keydown',event=>{if(event.key==='Escape'){event.stopPropagation();setOpen(false);}});
  $('director-button').addEventListener('click',()=>{
    setDirectorEnabled(!isDirectorEnabled());
    $('command-status').textContent=isDirectorEnabled()?'Ambient choices resumed.':'Your turn. Active actions will finish.';
    refresh();
  });
  $('show-paths').addEventListener('change',()=>{guide.hidden=!$('show-paths').checked;requestFrame();});
  $('stream-flow').addEventListener('change',event=>{
    send({label:'Stream energy changed',object:'water',action:'set-flow',args:{value:Number(event.target.value)}});
  });
  $('stream-flow').addEventListener('input',event=>{$('stream-flow-label').value=`${Math.round(Number(event.target.value)*100)}%`;});
  $('world-details').addEventListener('toggle',()=>refresh());
  function refresh() {
    $('director-button').setAttribute('aria-pressed',String(isDirectorEnabled()));
    $('director-button').textContent=isDirectorEnabled()?'Ambient choices on':'Ambient choices off';
    buttons.forEach(button=>{button.disabled=!available;});
    $('stream-flow').disabled=!available;$('director-button').disabled=!available;
    if(panel.hidden) return;
    const state=observe();
    if(document.activeElement!==$('stream-flow')) {
      $('stream-flow').value=String(state.effects.flow);
      $('stream-flow-label').value=`${Math.round(state.effects.flow*100)}%`;
    }
    if($('world-details').open) $('world-readout').textContent=JSON.stringify({
      scene:state.scene,revision:state.revision,time:Number(state.time.toFixed(2)),
      director:isDirectorEnabled()?'ambient policy':'human / external commands',
      objects:state.objects.map(({id,sticker,mode,position})=>({id,sticker,mode,position:position.map(v=>+v.toFixed(3))})),
      capabilities:state.capabilities,recent:state.history.slice(-5),
    },null,2);
  }
  function drawGuides({cover,pointer}) {
    if(guide.hidden||!ctx) return;
    const width=innerWidth,height=innerHeight;
    if(guide.width!==width||guide.height!==height){guide.width=width;guide.height=height;}
    ctx.clearRect(0,0,width,height);
    const project=([x,y])=>[
      ((x-.5-pointer[0]*.003*cover[0])*forestConfig.overscan/cover[0]+.5)*width,
      ((y-.5-pointer[1]*.002*cover[1])*forestConfig.overscan/cover[1]+.5)*height,
    ];
    const colors=['#e9e3a7','#eab77d','#b7d4df','#cadcb2'];
    Object.entries(manifest.paths).forEach(([name,path],index)=>{
      const points=path.points.map(project);ctx.strokeStyle=colors[index%colors.length];ctx.fillStyle=ctx.strokeStyle;
      ctx.lineWidth=1;ctx.setLineDash([4,6]);ctx.beginPath();ctx.moveTo(...points[0]);
      for(let n=0;n<points.length-1;n++){
        const a=points[Math.max(0,n-1)],b=points[n],c=points[n+1],d=points[Math.min(points.length-1,n+2)];
        ctx.bezierCurveTo(b[0]+(c[0]-a[0])/6,b[1]+(c[1]-a[1])/6,c[0]-(d[0]-b[0])/6,c[1]-(d[1]-b[1])/6,...c);
      }
      ctx.stroke();ctx.setLineDash([]);
      for(const point of points){ctx.beginPath();ctx.arc(...point,2,0,Math.PI*2);ctx.fill();}
      ctx.font='10px Arial';ctx.fillText(name,points[0][0]+8,points[0][1]-8);
    });
  }
  return {refresh,drawGuides,setAvailable(value){available=value;refresh();},close(){if(!panel.hidden)setOpen(false);}};
}
