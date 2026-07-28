(()=>{
  const fishStatus=document.getElementById('status');
  let fishCount=0;
  let lastJohnX=0,lastJohnZ=0,swimYaw=0;
  const fish=[];
  const hud=document.createElement('div');
  hud.id='fishHud';
  hud.style.cssText='position:fixed;left:12px;top:62px;z-index:7;color:#fff;background:#173244cc;border:1px solid #ffffff33;border-radius:12px;padding:8px 11px;font:700 13px Arial,sans-serif;backdrop-filter:blur(5px)';
  document.body.appendChild(hud);

  function updateHud(){
    hud.textContent=`Pesci: ${fishCount}/3`;
  }

  function makeFish(x,z,index){
    const y=-1.55+.12*Math.sin(index);
    const g=new THREE.Group();
    const mat=new THREE.MeshStandardMaterial({color:index%2?0xffc44f:0x4fd6ff,roughness:.38,emissive:index%2?0x4a2600:0x00384a,emissiveIntensity:.28});
    const body=new THREE.Mesh(new THREE.SphereGeometry(.22,8,6),mat);
    body.scale.set(1.75,.62,.72);
    const tail=new THREE.Mesh(new THREE.ConeGeometry(.19,.38,3),mat);
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
    const dx=john.position.x-lastJohnX,dz=john.position.z-lastJohnZ;
    if(johnSwimming&&Math.hypot(dx,dz)>.015)swimYaw=Math.atan2(-dx,-dz);
    lastJohnX=john.position.x;lastJohnZ=john.position.z;
    for(const f of fish){
      if(f.userData.caught)continue;
      const u=f.userData;
      f.position.x=u.homeX+Math.sin(t*1.4+u.phase)*1.15;
      f.position.z=u.homeZ+Math.cos(t*1.1+u.phase)*.75;
      f.position.y=-1.55+Math.sin(t*2.2+u.phase)*.12;
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
      const stroke=t*6.8,strokeL=Math.sin(stroke),strokeR=Math.sin(stroke+Math.PI),kick=Math.sin(t*10.5);
      john.rotation.order='XYZ';
      john.rotation.set(-Math.PI/2,swimYaw,0);
      body.position.y=2.18+Math.sin(t*4.4)*.035;
      body.rotation.x=0;
      body.rotation.y=0;
      body.rotation.z=THREE.MathUtils.lerp(body.rotation.z,Math.sin(stroke*.5)*.05,.12);
      head.position.y=THREE.MathUtils.lerp(head.position.y,3.25,.1);
      head.rotation.x=THREE.MathUtils.lerp(head.rotation.x,-.28,.12);
      head.rotation.y=THREE.MathUtils.lerp(head.rotation.y,Math.sin(stroke*.5)*.06,.12);
      leg1.rotation.x=.16+kick*.25;
      leg2.rotation.x=.16-kick*.25;
      leg1.rotation.z=-.08;
      leg2.rotation.z=.08;
      if(typeof leg1Knee!=='undefined'&&typeof leg2Knee!=='undefined'){
        leg1Knee.rotation.x=.22+Math.max(0,-kick)*.45;
        leg2Knee.rotation.x=.22+Math.max(0,kick)*.45;
      }
      if(typeof leftArm!=='undefined'&&typeof rightArm!=='undefined'){
        leftArm.rotation.x=-1.25+strokeL*.82;
        rightArm.rotation.x=-1.25+strokeR*.82;
        leftArm.rotation.y=.2*Math.cos(stroke);
        rightArm.rotation.y=-.2*Math.cos(stroke);
        leftArm.rotation.z=-.55+.28*Math.max(0,strokeL);
        rightArm.rotation.z=.55-.28*Math.max(0,strokeR);
        if(typeof leftElbow!=='undefined'&&typeof rightElbow!=='undefined'){
          leftElbow.rotation.x=.42+Math.max(0,-strokeL)*.9;
          rightElbow.rotation.x=.42+Math.max(0,-strokeR)*.9;
        }
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
