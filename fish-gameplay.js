(()=>{
  const fishStatus=document.getElementById('status');
  let fishCount=0;
  let lastJohnX=0,lastJohnZ=0,swimYaw=0,swimPitch=0,swimDepthY=-.35,wasSwimming=false,keyDive=false,keyRise=false;
  const fish=[];
  let waterFxReady=false,waterSurfacePatch=null,waterVeil=null,waterRings=[],seabedPatch=null,seabedObjects=[],johnMaterialState=[],waterCanvasFilter=null;
  const waterTint=new THREE.Color(0x9eeaff);
  addEventListener('keydown',e=>{
    if(e.code==='ShiftLeft'||e.code==='ShiftRight'||e.code==='ControlLeft'||e.code==='ControlRight')keyDive=true;
    if(e.code==='KeyE')keyRise=true;
  });
  addEventListener('keyup',e=>{
    if(e.code==='ShiftLeft'||e.code==='ShiftRight'||e.code==='ControlLeft'||e.code==='ControlRight')keyDive=false;
    if(e.code==='KeyE')keyRise=false;
  });

  function seaFloorAt(x,z){
    if(typeof globalSeaFloorAt==='function')return globalSeaFloorAt(x,z)-.22;
    const r=Math.hypot(x,z);
    const open=Math.max(0,r-58);
    const islandSlope=-1.65-open*.2-Math.max(0,r-86)*.18;
    const nor=Math.hypot(x-104,z+18),car=Math.hypot(x+115,z-40);
    const localShelf=Math.max(-5.5,-1.55-Math.max(0,Math.min(nor-38,car-54))*.18);
    const rough=Math.sin(x*.17+z*.041)*.55+Math.cos(z*.13)*.42+Math.sin((x-z)*.071)*.35;
    return Math.max(-52,Math.min(islandSlope,localShelf)+rough);
  }

  function updateSeabedPatch(t,active){
    if(!seabedPatch)return;
    seabedPatch.visible=active;
    if(!active)return;
    seabedPatch.position.set(john.position.x,0,john.position.z);
    const sp=seabedPatch.geometry.attributes.position;
    for(let i=0;i<sp.count;i++){
      const wx=john.position.x+sp.getX(i),wz=john.position.z+sp.getZ(i);
      const edge=Math.max(Math.abs(sp.getX(i)),Math.abs(sp.getZ(i)))/41;
      const blend=THREE.MathUtils.smoothstep(edge,.72,1);
      sp.setY(i,seaFloorAt(wx,wz)+(1-blend)*(Math.sin(wx*.23+t*.55)*.05+Math.cos(wz*.19-t*.4)*.04));
    }
    sp.needsUpdate=true;
    seabedPatch.geometry.computeVertexNormals();
  }


  function updateSeabedObjects(t,active){
    for(const g of seabedObjects){
      g.visible=active;
      if(!active)continue;
      const ox=g.userData.ox,oz=g.userData.oz;
      const wx=john.position.x+ox,wz=john.position.z+oz;
      g.position.set(wx,seaFloorAt(wx,wz)+.05,wz);
      g.rotation.y=g.userData.spin+Math.sin(t*.35+ox)*.08;
      const s=.8+.2*Math.sin((wx+wz)*.07);
      g.scale.setScalar(s);
    }
  }

  function updateUnderwaterCamera(dt,t,active,yawValue=0,pitchValue=.35){
    const waterY=-.72+.04*Math.sin(t*2.2+john.position.x*.08);
    if(!active)return;
    const camUnder=john.position.y<waterY-2.1;
    const dist=camUnder?6.4:7.6;
    const desiredY=camUnder?Math.min(waterY-.28,john.position.y+2.25):john.position.y+4.6;
    const camPos=new THREE.Vector3(john.position.x-Math.sin(yawValue)*dist,desiredY,john.position.z-Math.cos(yawValue)*dist);
    camera.position.lerp(camPos,.18);
    camera.lookAt(john.position.x,john.position.y+1.1,john.position.z);
    if(waterSurfacePatch){
      waterSurfacePatch.material.opacity=camUnder?.48:.34;
      waterSurfacePatch.renderOrder=camUnder?45:18;
    }
    if(waterVeil){
      waterVeil.material.opacity=camUnder?.18+.04*Math.sin(t*5.1):.11+.035*Math.sin(t*4.8);
    }
  }
  function updateUnderwaterMovement(dt,t,johnSwimming,inputX=0,inputY=0,yawValue=0,pitchValue=.35){
    if(!johnSwimming){
      wasSwimming=false;
      swimDepthY=-.35;
      swimPitch=THREE.MathUtils.lerp(swimPitch,0,.16);
      return;
    }
    const floorY=seaFloorAt(john.position.x,john.position.z)+.72;
    if(!wasSwimming){
      swimDepthY=Math.max(floorY,Math.min(-.35,john.position.y));
      wasSwimming=true;
    }
    const horizontalInput=Math.min(1,Math.hypot(inputX,inputY));
    let vertical=0;
    if(horizontalInput>.05)vertical+=Math.max(-1,Math.min(1,-Math.sin(pitchValue-.35)))*4.4;
    if(keyDive)vertical-=4.6;
    if(keyRise)vertical+=4.8;
    swimDepthY+=vertical*dt;
    swimDepthY=Math.max(floorY,Math.min(-.32,swimDepthY));
    if(swimDepthY<=floorY+.05&&fishStatus)fishStatus.textContent='John tocca il fondo del mare';
    else if(vertical>.2&&fishStatus)fishStatus.textContent='John risale verso la superficie';
    john.position.y=swimDepthY+Math.sin(t*3.2)*.035;
    swimPitch=THREE.MathUtils.lerp(swimPitch,Math.max(-.55,Math.min(.55,vertical*.11)),.14);
  }

  function initWaterEffects(){
    if(waterFxReady)return;
    waterFxReady=true;
    const surfaceGeo=new THREE.PlaneGeometry(42,42,48,48);
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
    const seabedGeo=new THREE.PlaneGeometry(82,82,44,44);
    seabedGeo.rotateX(-Math.PI/2);
    const seabedMat=new THREE.MeshStandardMaterial({color:0x2f6f63,roughness:1,metalness:0,flatShading:true,vertexColors:false,transparent:true,opacity:.72,depthWrite:false});
    seabedPatch=new THREE.Mesh(seabedGeo,seabedMat);
    seabedPatch.receiveShadow=true;
    seabedPatch.visible=false;
    scene.add(seabedPatch);
    const rockMat=new THREE.MeshStandardMaterial({color:0x4f6158,roughness:1,flatShading:true});
    const coralMats=[new THREE.MeshStandardMaterial({color:0xd88b77,roughness:.9,flatShading:true}),new THREE.MeshStandardMaterial({color:0x8fbf9f,roughness:.9,flatShading:true}),new THREE.MeshStandardMaterial({color:0xd8c36e,roughness:.9,flatShading:true})];
    const grassMat=new THREE.MeshStandardMaterial({color:0x2d7b62,roughness:.95,flatShading:true});
    for(let i=0;i<46;i++){
      const g=new THREE.Group();
      const kind=i%5;
      if(kind<2){
        const r=new THREE.Mesh(new THREE.DodecahedronGeometry(.35+(i%4)*.12,0),rockMat);
        r.scale.set(1.2+(i%3)*.35,.55+(i%5)*.12,.85+(i%2)*.25);
        r.castShadow=true;g.add(r);
      }else if(kind<4){
        const stem=new THREE.Mesh(new THREE.CylinderGeometry(.04,.08,.55+(i%3)*.18,5),coralMats[i%coralMats.length]);
        stem.position.y=.28;stem.castShadow=true;g.add(stem);
        for(let j=0;j<3;j++){
          const arm=new THREE.Mesh(new THREE.CylinderGeometry(.025,.04,.34,5),stem.material);
          arm.position.set((j-1)*.16,.48+j*.05,0);arm.rotation.z=(j-1)*.55;arm.castShadow=true;g.add(arm);
        }
      }else{
        for(let j=0;j<5;j++){
          const blade=new THREE.Mesh(new THREE.ConeGeometry(.035,.55+(j%3)*.18,4),grassMat);
          blade.position.set((j-2)*.08,.26,Math.sin(j)*.06);blade.rotation.z=(j-2)*.18;blade.castShadow=true;g.add(blade);
        }
      }
      const a=i*2.399,r=6+((i*7)%34);
      g.userData={ox:Math.cos(a)*r,oz:Math.sin(a)*r,spin:(i%7)*.21};
      g.visible=false;
      scene.add(g);
      seabedObjects.push(g);
    }
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


  function updateBirdUnderwaterVisibility(active){
    if(typeof animals==='undefined')return;
    for(const animal of animals){
      if(!animal||animal.kind!=='bird'||!animal.g)continue;
      if(active){
        if(animal.__underwaterWasVisible===undefined)animal.__underwaterWasVisible=animal.g.visible;
        animal.g.visible=false;
        if(animal.visual)animal.visual.visible=false;
      }else if(animal.__underwaterWasVisible!==undefined){
        animal.g.visible=animal.disabled?false:animal.__underwaterWasVisible;
        if(animal.visual)animal.visual.visible=animal.g.visible;
        delete animal.__underwaterWasVisible;
      }
    }
  }
  function updateWaterEffects(dt,t,johnSwimming,yawValue=0,pitchValue=.35){
    initWaterEffects();
    const active=!!johnSwimming;
    waterSurfacePatch.visible=active;
    waterVeil.visible=active;
    updateSeabedPatch(t,active);
    updateSeabedObjects(t,active);
    waterRings.forEach(r=>r.visible=active);
    setJohnUnderwaterLook(active,t);
    updateBirdUnderwaterVisibility(active);
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
    updateUnderwaterCamera(dt,t,active,yawValue,pitchValue);
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

  function updateFishGameplay(dt,t,johnSwimming,inputX=0,inputY=0,yawValue=0,pitchValue=.35){
    updateUnderwaterMovement(dt,t,johnSwimming,inputX,inputY,yawValue,pitchValue);
    updateWaterEffects(dt,t,johnSwimming,yawValue,pitchValue);
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
      if(johnSwimming&&Math.hypot(f.position.x-john.position.x,f.position.z-john.position.z,f.position.y-john.position.y)<1.55){
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
      john.rotation.set(-Math.PI/2+swimPitch,0,swimYaw);
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

  window.requestSwimRise=()=>{keyRise=true;setTimeout(()=>{keyRise=false},720);return true;};
  window.updateFishGameplay=updateFishGameplay;
  window.spendFishForNoronha=spendFishForNoronha;
  window.getFishCount=()=>fishCount;
})();
