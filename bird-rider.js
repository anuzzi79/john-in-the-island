(()=>{
  let ridingBird=null;
  let grabCooldown=0;
  let grabSequenceT=0;
  let grabStartY=0;
  let grabFlightYaw=0;

  function nearestReachableBird(maxDistance=4.5){
    let best=null,bestD=Infinity;
    for(const animal of animals){
      if(animal.kind!=='bird'||animal.riderControlled||animal.disabled||!animal.g.visible)continue;
      const dx=animal.g.position.x-john.position.x;
      const dy=animal.g.position.y-(john.position.y+2.2);
      const dz=animal.g.position.z-john.position.z;
      const d=Math.hypot(dx,dy,dz);
      if(d<bestD){bestD=d;best=animal;}
    }
    return bestD<maxDistance?best:null;
  }

  function setHangingPose(active){
    if(typeof leftArm!=='undefined'&&typeof rightArm!=='undefined'){
      if(active){
        leftArm.rotation.set(-3.05,0,-.25);
        rightArm.rotation.set(-3.05,0,.25);
        if(typeof leftElbow!=='undefined'&&typeof rightElbow!=='undefined'){
          leftElbow.rotation.x=.4;
          rightElbow.rotation.x=.4;
        }
      }else if(typeof resetSlidePose==='function'){
        resetSlidePose();
      }else{
        leftArm.rotation.set(0,0,0);rightArm.rotation.set(0,0,0);
        if(typeof leftElbow!=='undefined'&&typeof rightElbow!=='undefined'){
          leftElbow.rotation.x=0;
          rightElbow.rotation.x=0;
        }
      }
    }
    if(active){
      leg1.rotation.x=.42;leg2.rotation.x=-.28;
      if(typeof leg1Knee!=='undefined'&&typeof leg2Knee!=='undefined'){
        leg1Knee.rotation.x=.55;
        leg2Knee.rotation.x=.4;
      }
      john.rotation.x=0;
      john.rotation.z=0;
    }
  }

  function attachToBird(bird){
    if(!bird||ridingBird||grabCooldown>0)return false;
    if(typeof spendFishForNoronha==='function'&&!spendFishForNoronha())return false;
    ridingBird=bird;
    bird.noronhaRideTarget=new THREE.Vector3(-115,heightAt(-115,40)+8,40);
    bird.noronhaRideT=0;
    bird.riderControlled=true;
    bird.originalScale=bird.originalScale||bird.g.scale.clone();
    if(!bird.isRiggedHawk)bird.g.scale.copy(bird.originalScale).multiplyScalar(1.65);
    airborne=false;verticalVelocity=0;jumpPushX=jumpPushZ=0;
    grabSequenceT=0;
    grabStartY=bird.g.position.y;
    grabFlightYaw=bird.g.rotation.y;
    // Nel momento dell'aggancio conserviamo la direzione orizzontale del volo.
    // Il falco non deve ruotare verticalmente per adattarsi a John.
    bird.g.rotation.order='YXZ';
    bird.g.rotation.set(0,grabFlightYaw,0);
    if(bird.flightDirection){
      bird.flightDirection.y=0;
      if(bird.flightDirection.lengthSq()>.000001)bird.flightDirection.normalize();
    }
    bird.flapBoost=1;
    setHangingPose(true);
    document.getElementById('status').textContent='John afferra il falco: reggiti!';
    return true;
  }

  function releaseBird(){
    if(!ridingBird)return false;
    const bird=ridingBird;
    bird.riderControlled=false;
    if(bird.originalScale&&!bird.isRiggedHawk)bird.g.scale.copy(bird.originalScale);
    ridingBird=null;
    setHangingPose(false);
    airborne=true;
    verticalVelocity=2.8;
    jumpPushX=Math.sin(yaw)*4.2;
    jumpPushZ=Math.cos(yaw)*4.2;
    grabCooldown=.95;
    document.getElementById('status').textContent='John lascia il falco!';
    return true;
  }

  function toggleBirdRide(){
    if(ridingBird)return releaseBird();
    return false;
  }

  function updateGrabSequence(dt,t,bird){
    grabSequenceT+=dt;
    const duration=1.65;
    bird.flapBoost=Math.max(bird.flapBoost||0,1-grabSequenceT/duration);

    // Durante tutta la presa iniziale il corpo resta orizzontale e conserva
    // l'azimut di volo precedente. Cambia solo la quota del flight frame.
    bird.g.rotation.order='YXZ';
    bird.g.rotation.x=0;
    bird.g.rotation.y=grabFlightYaw;
    bird.g.rotation.z=0;

    if(grabSequenceT<.38){
      const u=grabSequenceT/.38;
      bird.g.position.y=grabStartY-THREE.MathUtils.smoothstep(u,0,1)*1.35;
    }else if(grabSequenceT<duration){
      const u=(grabSequenceT-.38)/(duration-.38);
      const recovery=THREE.MathUtils.smoothstep(u,0,1);
      bird.g.position.y=THREE.MathUtils.lerp(grabStartY-1.35,grabStartY+.45,recovery);
    }else{
      document.getElementById('status').textContent='Falco sotto controllo — guidalo!';
      return false;
    }
    return true;
  }

  function updateBirdRide(dt,t,inputX,inputY,yawValue,pitchValue){
    grabCooldown=Math.max(0,grabCooldown-dt);

    if(!ridingBird&&airborne&&grabCooldown<=0){
      const bird=nearestReachableBird();
      if(bird)attachToBird(bird);
    }

    if(!ridingBird)return false;
    const bird=ridingBird;
    const before=bird.g.position.clone();

    if(grabSequenceT<1.65){
      updateGrabSequence(dt,t,bird);
    }else{
      if(bird.noronhaRideTarget){
        bird.noronhaRideT+=dt;
        const toTarget=bird.noronhaRideTarget.clone().sub(bird.g.position);
        const d=Math.hypot(toTarget.x,toTarget.z);
        if(d<3.5||bird.noronhaRideT>18){
          bird.g.position.copy(bird.noronhaRideTarget);
          releaseBird();
          john.position.set(-115,heightAt(-115,40),40);
          document.getElementById('status').textContent='Noronha raggiunta: isola premio sbloccata!';
          return true;
        }
        const dir=new THREE.Vector3(toTarget.x,0,toTarget.z).normalize();
        const speed=13.5;
        bird.g.position.x+=dir.x*speed*dt;
        bird.g.position.z+=dir.z*speed*dt;
        const desiredY=Math.max(heightAt(bird.g.position.x,bird.g.position.z)+8,THREE.MathUtils.lerp(bird.g.position.y,bird.noronhaRideTarget.y,.025));
        bird.g.position.y=THREE.MathUtils.lerp(bird.g.position.y,desiredY,.08);
        if(typeof orientHawkAlongVelocity==='function'&&bird.isRiggedHawk)orientHawkAlongVelocity(bird,dir.x*speed,0,dir.z*speed,0,.2);
        bird.flapBoost=.45;
      }else{
      const forward=-inputY;
      const side=-inputX;
      const fx=Math.sin(yawValue),fz=Math.cos(yawValue);
      const rx=Math.cos(yawValue),rz=-Math.sin(yawValue);
      let vx=fx*forward+rx*side;
      let vz=fz*forward+rz*side;
      const horizontalInput=Math.hypot(vx,vz);
      if(horizontalInput>.01){vx/=horizontalInput;vz/=horizontalInput;}
      const speed=horizontalInput>.01?10.5:2.2;
      bird.g.position.x+=vx*speed*dt;
      bird.g.position.z+=vz*speed*dt;
      const ground=heightAt(bird.g.position.x,bird.g.position.z);
      const climb=horizontalInput>.01?Math.max(-1,Math.min(1,-Math.sin(pitchValue)))*6.6:0;
      bird.g.position.y+=climb*dt;
      bird.g.position.y=Math.max(ground+5.1,Math.min(40,bird.g.position.y));

      const actualVx=(bird.g.position.x-before.x)/Math.max(dt,.001);
      const actualVy=(bird.g.position.y-before.y)/Math.max(dt,.001);
      const actualVz=(bird.g.position.z-before.z)/Math.max(dt,.001);
      if(typeof orientHawkAlongVelocity==='function'&&bird.isRiggedHawk){
        const bank=-side*.28;
        orientHawkAlongVelocity(bird,actualVx,actualVy,actualVz,bank,.2);
      }else if(horizontalInput>.01){
        bird.g.rotation.y=Math.atan2(actualVx,actualVz);
        bird.g.rotation.x=-Math.atan2(actualVy,Math.max(.001,Math.hypot(actualVx,actualVz)));
        bird.g.rotation.z=THREE.MathUtils.lerp(bird.g.rotation.z,-side*.28,.12);
      }
      bird.flapBoost=horizontalInput>.01?.25:0;
      }
    }

    if(!bird.isRiggedHawk){
      const phase=t*8.5;
      const left=bird.g.children[1],right=bird.g.children[2];
      if(left&&right){
        const flap=Math.sin(phase)*1.05;
        left.rotation.z=.18+flap;right.rotation.z=-.18-flap;
      }
    }

    // John è un carico sospeso: resta verticale e centrato sotto il falco.
    john.position.set(bird.g.position.x,bird.g.position.y-3.05,bird.g.position.z);
    john.rotation.y=bird.g.rotation.y;
    john.rotation.x=0;
    john.rotation.z=0;
    setHangingPose(true);
    leg1.rotation.x=.30+Math.sin(t*4)*.13;
    leg2.rotation.x=-.20+Math.sin(t*4+1.1)*.13;
    if(typeof leg1Knee!=='undefined'&&typeof leg2Knee!=='undefined'){
      leg1Knee.rotation.x=.5+Math.sin(t*4)*.1;
      leg2Knee.rotation.x=.35+Math.sin(t*4+1.1)*.1;
    }
    return true;
  }

  window.toggleBirdRide=toggleBirdRide;
  window.updateBirdRide=updateBirdRide;
  window.isRidingBird=()=>!!ridingBird;
})();