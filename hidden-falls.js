(()=>{
  const waterMat=new THREE.MeshStandardMaterial({color:0x32c8e6,transparent:true,opacity:.82,roughness:.14,metalness:.03,side:THREE.DoubleSide});
  const foamMat=new THREE.MeshBasicMaterial({color:0xf2fdff,transparent:true,opacity:.88});
  const stoneMat=new THREE.MeshStandardMaterial({color:0x59665d,roughness:1});
  const darkStoneMat=new THREE.MeshStandardMaterial({color:0x26352f,roughness:1});

  const lip={x:20,z:-12};

  function terrainGradient(x,z){
    const e=.45;
    return {
      dx:(heightAt(x+e,z)-heightAt(x-e,z))/(2*e),
      dz:(heightAt(x,z+e)-heightAt(x,z-e))/(2*e)
    };
  }

  function traceDownhill(startX,startZ,steps,stepSize){
    const pts=[];
    let x=startX,z=startZ;
    for(let i=0;i<steps;i++){
      pts.push([x,z]);
      const g=terrainGradient(x,z);
      let dx=-g.dx,dz=-g.dz;
      const len=Math.hypot(dx,dz);
      if(len<.025){dx=.55;dz=-.85;}else{dx/=len;dz/=len;}
      dx=dx*.82+.18*.45;
      dz=dz*.82-.18*.9;
      const n=Math.hypot(dx,dz)||1;
      x+=dx/n*stepSize;
      z+=dz/n*stepSize;
      if(Math.hypot(x,z)>63)break;
    }
    return pts;
  }

  function ribbonFromTerrain(points,width,material,yOffset=.08){
    const verts=[];
    for(let i=0;i<points.length;i++){
      const [x,z]=points[i];
      const prev=points[Math.max(0,i-1)],next=points[Math.min(points.length-1,i+1)];
      const dx=next[0]-prev[0],dz=next[1]-prev[1],len=Math.hypot(dx,dz)||1;
      const nx=-dz/len,nz=dx/len;
      const leftX=x+nx*width,leftZ=z+nz*width;
      const rightX=x-nx*width,rightZ=z-nz*width;
      verts.push(leftX,heightAt(leftX,leftZ)+yOffset,leftZ,rightX,heightAt(rightX,rightZ)+yOffset,rightZ);
    }
    const indices=[];
    for(let i=0;i<points.length-1;i++){
      const a=i*2,b=a+1,c=a+2,d=a+3;
      indices.push(a,b,c,b,d,c);
    }
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
    geo.setIndex(indices);geo.computeVertexNormals();
    return new THREE.Mesh(geo,material.clone());
  }

  const upperPath=traceDownhill(8,-2,18,1.05);
  upperPath.push([lip.x,lip.z]);
  const upperStream=ribbonFromTerrain(upperPath,.78,waterMat,.1);
  scene.add(upperStream);

  const topY=heightAt(lip.x,lip.z)+.18;
  const impactX=21.5,impactZ=-15.8;
  const impactY=heightAt(impactX,impactZ)+.12;
  const fallHeight=Math.max(3.5,topY-impactY);
  const waterfall=new THREE.Mesh(new THREE.PlaneGeometry(2.8,fallHeight,1,18),waterMat.clone());
  waterfall.position.set((lip.x+impactX)/2,(topY+impactY)/2,(lip.z+impactZ)/2);
  const dz=impactZ-lip.z,dx=impactX-lip.x;
  waterfall.rotation.y=Math.atan2(dx,dz);
  waterfall.rotation.x=-Math.atan2(Math.hypot(dx,dz),fallHeight);
  scene.add(waterfall);

  const impactPool=new THREE.Mesh(new THREE.CircleGeometry(2.15,36),waterMat.clone());
  impactPool.rotation.x=-Math.PI/2;
  impactPool.scale.set(1.15,.78,1);
  impactPool.position.set(impactX,impactY,impactZ);
  scene.add(impactPool);

  const runoffPath=traceDownhill(impactX+.7,impactZ-.4,56,.92);
  const runoff=ribbonFromTerrain(runoffPath,.62,waterMat,.075);
  scene.add(runoff);

  const allPath=upperPath.concat(runoffPath);
  for(let i=2;i<allPath.length;i+=3){
    const [x,z]=allPath[i],prev=allPath[Math.max(0,i-1)],next=allPath[Math.min(allPath.length-1,i+1)];
    const dx=next[0]-prev[0],dz=next[1]-prev[1],len=Math.hypot(dx,dz)||1;
    const nx=-dz/len,nz=dx/len;
    for(const side of[-1,1]){
      const rx=x+nx*(1.05+Math.random()*.65)*side;
      const rz=z+nz*(1.05+Math.random()*.65)*side;
      const s=.4+Math.random()*.85;
      const rock=new THREE.Mesh(new THREE.DodecahedronGeometry(s,0),Math.random()>.2?stoneMat:darkStoneMat);
      rock.position.set(rx,heightAt(rx,rz)+s*.4,rz);
      rock.scale.y=.65;rock.rotation.set(Math.random(),Math.random(),Math.random());
      scene.add(rock);
    }
  }

  const caveDark=new THREE.Mesh(new THREE.CircleGeometry(1.8,26),new THREE.MeshBasicMaterial({color:0x06110d}));
  caveDark.position.set(lip.x-2.2,impactY+1.6,lip.z-.85);
  caveDark.rotation.y=.18;
  scene.add(caveDark);

  const spray=[];
  for(let i=0;i<30;i++){
    const s=new THREE.Mesh(new THREE.SphereGeometry(.1+Math.random()*.16,7,5),foamMat);
    s.position.set(impactX+(Math.random()-.5)*3.8,impactY+.18+Math.random()*1.15,impactZ+(Math.random()-.5)*3.2);
    s.userData={baseY:s.position.y,phase:Math.random()*Math.PI*2};
    scene.add(s);spray.push(s);
  }

  function johnMakeArm(side){
    const shoulder=new THREE.Group();
    shoulder.position.set(side*.72,2.925,0);
    const upper=new THREE.Mesh(new THREE.CapsuleGeometry(.15,.4,4,8),shirt);
    upper.position.y=-.35;
    upper.castShadow=true;
    shoulder.add(upper);
    const elbow=new THREE.Group();
    elbow.position.y=-.7;
    shoulder.add(elbow);
    const forearm=new THREE.Mesh(new THREE.CapsuleGeometry(.12,.4,4,8),skin);
    forearm.position.y=-.32;
    forearm.castShadow=true;
    elbow.add(forearm);
    return {shoulder,elbow};
  }
  const johnArmL=johnMakeArm(-1),johnArmR=johnMakeArm(1);
  const leftArm=johnArmL.shoulder,rightArm=johnArmR.shoulder,leftElbow=johnArmL.elbow,rightElbow=johnArmR.elbow;
  john.add(leftArm,rightArm);

  const slideRoute=[];
  upperPath.forEach(([x,z])=>slideRoute.push({x,z,y:heightAt(x,z)+.12}));
  slideRoute.push({x:lip.x,z:lip.z,y:topY});
  slideRoute.push({x:impactX,z:impactZ,y:impactY+.08});
  runoffPath.slice(1,22).forEach(([x,z])=>slideRoute.push({x,z,y:heightAt(x,z)+.1}));

  let sliding=false,slideIndex=0,slideProgress=0,slideEscapeCooldown=0;
  window.isSlidingWaterfall=()=>sliding;

  function nearestSlideIndex(){
    let best=-1,bestD=Infinity;
    for(let i=0;i<slideRoute.length-1;i++){
      const p=slideRoute[i];
      const d=Math.hypot(john.position.x-p.x,john.position.z-p.z);
      if(d<bestD){bestD=d;best=i;}
    }
    return bestD<1.25?best:-1;
  }

  function resetSlidePose(){
    john.rotation.x=0;
    john.rotation.z=0;
    leftArm.rotation.set(0,0,0);
    rightArm.rotation.set(0,0,0);
    leftElbow.rotation.x=0;
    rightElbow.rotation.x=0;
    leg1Knee.rotation.x=0;
    leg2Knee.rotation.x=0;
  }

  function escapeWaterSlide(){
    if(!sliding)return false;
    const a=slideRoute[slideIndex];
    const b=slideRoute[Math.min(slideIndex+1,slideRoute.length-1)];
    let dirX=b.x-a.x,dirZ=b.z-a.z;
    const len=Math.hypot(dirX,dirZ)||1;
    dirX/=len;dirZ/=len;
    sliding=false;
    slideEscapeCooldown=1.15;
    slideIndex=0;
    slideProgress=0;
    resetSlidePose();
    if(typeof jumpPushX!=='undefined'){
      const side=Math.random()>.5?1:-1;
      jumpPushX=(-dirZ*side+dirX*.25)*5.4;
      jumpPushZ=(dirX*side+dirZ*.25)*5.4;
    }
    document.getElementById('status').textContent='John è saltato fuori dalla cascata!';
    return true;
  }

  function updateWaterSlide(dt,t){
    slideEscapeCooldown=Math.max(0,slideEscapeCooldown-dt);
    if(slideEscapeCooldown>0)return false;

    if(!sliding){
      const nearest=nearestSlideIndex();
      if(nearest>=0&&!airborne){
        sliding=true;
        slideIndex=nearest;
        slideProgress=0;
        verticalVelocity=0;
        document.getElementById('status').textContent='John sta scivolando nella cascata! Premi JUMP per uscire';
      }else{
        resetSlidePose();
        return false;
      }
    }

    const current=slideRoute[slideIndex],next=slideRoute[Math.min(slideIndex+1,slideRoute.length-1)];
    const segmentLength=Math.max(.2,Math.hypot(next.x-current.x,next.y-current.y,next.z-current.z));
    const steepness=Math.max(0,current.y-next.y);
    slideProgress+=(4.5+steepness*2.4)*dt/segmentLength;

    while(slideProgress>=1&&slideIndex<slideRoute.length-2){
      slideProgress-=1;
      slideIndex++;
    }

    const a=slideRoute[slideIndex],b=slideRoute[Math.min(slideIndex+1,slideRoute.length-1)];
    const u=Math.min(1,slideProgress);
    john.position.set(
      THREE.MathUtils.lerp(a.x,b.x,u),
      THREE.MathUtils.lerp(a.y,b.y,u),
      THREE.MathUtils.lerp(a.z,b.z,u)
    );

    const dirX=b.x-a.x,dirY=b.y-a.y,dirZ=b.z-a.z;
    john.rotation.y=Math.atan2(dirX,dirZ);
    john.rotation.x=Math.max(-1.15,Math.min(.15,Math.atan2(-dirY,Math.hypot(dirX,dirZ))-.42));
    john.rotation.z=Math.sin(t*7)*.08;

    leftArm.rotation.z=-1.25+Math.sin(t*6)*.12;
    rightArm.rotation.z=1.25-Math.sin(t*6+.8)*.12;
    leftArm.rotation.x=.25;
    rightArm.rotation.x=.25;
    leftElbow.rotation.x=.6;
    rightElbow.rotation.x=.6;
    leg1.rotation.x=.75+Math.sin(t*8)*.16;
    leg2.rotation.x=.48+Math.sin(t*8+1.2)*.16;
    leg1Knee.rotation.x=.9+Math.sin(t*8)*.1;
    leg2Knee.rotation.x=.75+Math.sin(t*8+1.2)*.1;

    if(slideIndex>=slideRoute.length-2&&slideProgress>=.96){
      sliding=false;
      slideIndex=0;
      slideProgress=0;
      resetSlidePose();
      document.getElementById('status').textContent='John è arrivato a valle!';
      return false;
    }
    return true;
  }

  let found=false;
  function tick(){
    requestAnimationFrame(tick);
    const t=performance.now()*.001;
    upperStream.material.opacity=.77+Math.sin(t*2.1)*.04;
    runoff.material.opacity=.76+Math.sin(t*2.4)*.035;
    waterfall.material.opacity=.73+Math.sin(t*5.1)*.08;
    impactPool.material.opacity=.75+Math.sin(t*1.5)*.04;
    spray.forEach(s=>s.position.y=s.userData.baseY+Math.sin(t*4+s.userData.phase)*.16);
    const d=Math.hypot(john.position.x-impactX,john.position.z-impactZ);
    if(d<11&&!found){found=true;document.getElementById('status').textContent='Hai scoperto il torrente della cascata!';}
  }
  tick();
})();
