(()=>{
  const fishStatus=document.getElementById('status');
  let fishCount=0;
  const fish=[];
  const hud=document.createElement('div');
  hud.id='fishHud';
  hud.style.cssText='position:fixed;left:12px;top:62px;z-index:7;color:#fff;background:#173244cc;border:1px solid #ffffff33;border-radius:12px;padding:8px 11px;font:700 13px Arial,sans-serif;backdrop-filter:blur(5px)';
  document.body.appendChild(hud);

  function updateHud(){
    hud.textContent=`Pesci: ${fishCount}/3`;
  }

  function makeFish(x,z,index){
    const y=-.7+.12*Math.sin(index);
    const g=new THREE.Group();
    const mat=new THREE.MeshStandardMaterial({color:index%2?0xffc44f:0x4fd6ff,roughness:.65});
    const body=new THREE.Mesh(new THREE.SphereGeometry(.22,8,6),mat);
    body.scale.set(1.45,.55,.65);
    const tail=new THREE.Mesh(new THREE.ConeGeometry(.16,.32,3),mat);
    tail.rotation.z=Math.PI/2;
    tail.position.x=-.33;
    g.add(body,tail);
    g.position.set(x,y,z);
    g.userData={homeX:x,homeZ:z,phase:Math.random()*Math.PI*2,caught:false};
    scene.add(g);
    fish.push(g);
  }

  const spots=[
    [58,4],[61,-8],[55,15],[42,-35],[-52,18],[-58,-4],[-38,-48],[20,59],
    [68,6],[70,-12],[63,18],[-64,8]
  ];
  spots.forEach((p,i)=>makeFish(p[0],p[1],i));
  updateHud();

  function updateFishGameplay(dt,t,johnSwimming){
    for(const f of fish){
      if(f.userData.caught)continue;
      const u=f.userData;
      f.position.x=u.homeX+Math.sin(t*1.4+u.phase)*1.15;
      f.position.z=u.homeZ+Math.cos(t*1.1+u.phase)*.75;
      f.position.y=-.7+Math.sin(t*2.2+u.phase)*.08;
      f.rotation.y=Math.atan2(Math.cos(t*1.4+u.phase),Math.sin(t*1.1+u.phase));
      if(johnSwimming&&Math.hypot(f.position.x-john.position.x,f.position.z-john.position.z)<1.35){
        u.caught=true;
        f.visible=false;
        fishCount=Math.min(3,fishCount+1);
        updateHud();
        if(fishStatus)fishStatus.textContent=fishCount>=3?'Pesci pronti: cerca un falco per Noronha':'Pesce preso!';
      }
    }
    if(johnSwimming){
      john.rotation.x=THREE.MathUtils.lerp(john.rotation.x,-.18,.08);
      body.position.y=2.12+Math.sin(t*5)*.03;
      leg1.rotation.x=.35+Math.sin(t*6)*.28;
      leg2.rotation.x=.35+Math.sin(t*6+Math.PI)*.28;
      if(typeof leg1Knee!=='undefined'&&typeof leg2Knee!=='undefined'){
        leg1Knee.rotation.x=.45;
        leg2Knee.rotation.x=.45;
      }
      if(typeof leftArm!=='undefined'&&typeof rightArm!=='undefined'){
        leftArm.rotation.x=-.8+Math.sin(t*6)*.35;
        rightArm.rotation.x=-.8+Math.sin(t*6+Math.PI)*.35;
      }
    }
  }

  function spendFishForNoronha(){
    if(fishCount<3){
      if(fishStatus)fishStatus.textContent=`Servono 3 pesci per convincere il falco (${fishCount}/3)`;
      return false;
    }
    fishCount-=3;
    updateHud();
    if(fishStatus)fishStatus.textContent='Falco nutrito: volo premio verso Noronha!';
    return true;
  }

  window.updateFishGameplay=updateFishGameplay;
  window.spendFishForNoronha=spendFishForNoronha;
  window.getFishCount=()=>fishCount;
})();
