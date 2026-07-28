(()=>{
  const fishStatus=document.getElementById('status');
  let fishCount=0;
  let lastJohnX=0,lastJohnZ=0,swimYaw=0;
  const fish=[];
  let waterFxReady=false,waterSurfacePatch=null,waterVeil=null,waterRings=[],johnMaterialState=[],waterCanvasFilter=null;
  const waterTint=new THREE.Color(0x9eeaff);

  function initWaterEffects(){
    if(waterFxReady)return;
    waterFxReady=true;
    const surfaceGeo=new THREE.PlaneGeometry(9.5,9.5,30,30);
    surfaceGeo.rotateX(-Math.PI/2);
    surfaceGeo.userData.base=Array.from(surfaceGeo.attributes.position.array);
    const surfaceMat=new THREE.MeshStandardMaterial({color:0x7fefff,roughness:.08,metalness:.02,transparent:true,opacity:.34,side:THREE.DoubleSide,depthWrite:false});
    waterSurfacePatch=new THREE.Mesh(surfaceGeo,surfaceMat);
    waterSurfacePatch.renderOrder=18;
    waterSurfacePatch.visible=false;
    scene.add(waterSurfacePatch);
    for(let i=0;i<3;i++){
      const ring=new THREE.Mesh(new THREE.RingGeometry(1.1+i*.65,1.18+i*.65,48),new THREE.MeshBasicMaterial({color:0xd7fbff,transparent:true,opacity:.2-i*.04,side:THREE.DoubleSide,depthWrite:false}));
      ring.rotation.x=-Math.PI/2;
      ring.renderOrder=19;
      ring.visible=false;
      scene.add(ring);
      waterRings.push(ring);
    }
    waterVeil=new THREE.Mesh(new THREE.PlaneGeometry(5.6,3.4,18,10),new THREE.MeshBasicMaterial({color:0x9eeaff,transparent:true,opacity:.14,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending}));
    waterVeil.renderOrder=40;
    waterVeil.visible=false;
    scene.add(waterVeil);
    waterCanvasFilter=renderer.domElement.style.filter||'';
    john.traverse(o=>{
      if(!o.isMesh||!o.material)return;
      const mats=Array.isArray(o.material)?o.material:[o.material];
      mats.forEach(m=>johnMaterialState.push({m,color:m.color?m.color.clone():null,opacity:m.opacity,transparent:m.transparent,depthWrite:m.depthWrite,roughness:m.roughness,emissive:m.emissive?m.emissive.clone():null,emissiveIntensity:m.emissiveIntensity}));
    });
  }

  function setJohnUnderwaterLook(active,t){
    for(const st of johnMaterialState){
      const m=st.m;
      if(active){
        if(st.color&&m.color)m.color.copy(st.color).lerp(waterTint,.3+.04*Math.sin(t*3.7));
        m.transparent=true;
        m.opacity=Math.min(st.opacity,.82+.035*Math.sin(t*5.1));
        m.depthWrite=false;
        if(typeof m.roughness==='number')m.roughness=.32;
        if(st.emissive&&m.emissive){m.emissive.set(0x14566a);m.emissiveIntensity=.08;}
      }else{
        if(st.color&&m.color)m.color.copy(st.color);
        m.opacity=st.opacity;
        m.transparent=st.transparent;
        m.depthWrite=st.depthWrite;
        if(typeof st.roughness==='number')m.roughness=st.roughness;
        if(st.emissive&&m.emissive){m.emissive.copy(st.emissive);m.emissiveIntensity=st.emissiveIntensity;}
      }
      m.needsUpdate=true;
    }
    if(active){
      john.scale.set(1+.018*Math.sin(t*7.3),1+.012*Math.cos(t*5.9),1+.022*Math.sin(t*6.4+1.1));
    }else{
      john.scale.lerp(new THREE.Vector3(1,1,1),.18);
    }
  }

  function updateWaterEffects(dt,t,johnSwimming){
    initWaterEffects();
    const active=!!johnSwimming;
    waterSurfacePatch.visible=active;
    waterVeil.visible=active;
    waterRings.forEach(r=>r.visible=active);
    setJohnUnderwaterLook(active,t);
    renderer.domElement.style.filter=active?'saturate(1.13) contrast(.96) blur(.45px)':waterCanvasFilter;
    if(!active)return;
    const waterY=-.72+.04*Math.sin(t*2.2+john.position.x*.08);
    waterSurfacePatch.position.set(john.position.x,waterY,john.position.z);
    const sp=waterSurfacePatch.geometry.attributes.position,base=waterSurfacePatch.geometry.userData.base;
    for(let i=0;i<sp.count;i++){
      const x=base[i*3],z=base[i*3+1];
      sp.setZ(i,Math.sin(x*1.7+t*2.8)*.055+Math.cos(z*1.25+t*2.1)*.045+Math.sin((x+z)*.9+t*3.5)*.025);
    }
    sp.needsUpdate=true;
    waterSurfacePatch.geometry.computeVertexNormals();
    for(let i=0;i<waterRings.length;i++){
      const ring=waterRings[i];
      ring.position.set(john.position.x,waterY+.012*(i+1),john.position.z);
      const pulse=1+((t*.38+i*.22)%1)*.55;
      ring.scale.set(pulse,pulse,pulse);
      ring.material.opacity=(.22-i*.045)*(1-((pulse-1)/.55));
    }
    const mid=new THREE.Vector3().copy(john.position).lerp(camera.position,.42);
    waterVeil.position.copy(mid);
    waterVeil.lookAt(camera.position);
    waterVeil.material.opacity=.11+.035*Math.sin(t*4.8);
  }

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
    updateWaterEffects(dt,t,johnSwimming);
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
      john.rotation.set(-Math.PI/2,0,swimYaw);
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
