(()=>{
  const NEAR_RADIUS=28;
  const CHECK_EVERY_MS=1200;
  let checks=0;

  function birdFlightY(x,z,offset=6.5){
    return Math.max(.65,heightAt(x,z))+offset;
  }

  function johnIsUnderwater(){
    return typeof isSwimmableWater==='function'&&isSwimmableWater(john.position.x,john.position.z)&&john.position.y<-.45;
  }

  function placeNearJohn(hawk,index){
    if(!hawk||!hawk.g||!hawk.velocity)return;
    const angle=(performance.now()*.00035)+(index*Math.PI);
    const distance=10+index*5;
    const x=john.position.x+Math.cos(angle)*distance;
    const z=john.position.z+Math.sin(angle)*distance;
    const y=birdFlightY(x,z,6.5+index*1.4);
    hawk.g.position.set(x,y,z);

    const targetAngle=angle+1.1+(Math.random()-.5)*1.2;
    const targetDistance=14+Math.random()*12;
    const tx=john.position.x+Math.cos(targetAngle)*targetDistance;
    const tz=john.position.z+Math.sin(targetAngle)*targetDistance;
    hawk.target=new THREE.Vector3(tx,birdFlightY(tx,tz,7+Math.random()*4),tz);
    hawk.targetAge=0;

    const direction=hawk.target.clone().sub(hawk.g.position).setY(0);
    if(direction.lengthSq()<.001)direction.set(0,0,1);
    direction.normalize();
    const speed=hawk.cruiseSpeed||6.5;
    hawk.velocity.set(direction.x*speed,0,direction.z*speed);
    hawk.lastVelocity.copy(hawk.velocity);
    hawk.flightDirection.copy(direction);
    hawk.g.visible=true;
    hawk.visual.visible=true;
  }

  const timer=setInterval(()=>{
    checks++;
    if(johnIsUnderwater())return;
    const hawks=(window.johnHawks||[]).filter(h=>h&&h.g&&h.isRiggedHawk);
    if(!hawks.length){
      if(checks>100)clearInterval(timer);
      return;
    }

    const nearby=hawks.filter(h=>{
      const dx=h.g.position.x-john.position.x;
      const dz=h.g.position.z-john.position.z;
      return Number.isFinite(dx)&&Number.isFinite(dz)&&Math.hypot(dx,dz)<=NEAR_RADIUS;
    });

    if(nearby.length===0)placeNearJohn(hawks[0],0);
    if(nearby.length<2&&hawks[1]&&!hawks[1].riderControlled)placeNearJohn(hawks[1],1);

    for(const animal of animals){
      if(animal.kind==='bird'&&!animal.isRiggedHawk){
        animal.disabled=true;
        animal.g.visible=false;
      }
    }
  },CHECK_EVERY_MS);

  const SWOOP_MIN_INTERVAL_MS=11000;
  const SWOOP_MAX_INTERVAL_MS=15000;
  const SWOOP_ALTITUDE_OFFSET=3.8;
  const SWOOP_LOW_ALTITUDE_FLOOR=2.0;
  const SWOOP_DURATION_MS=4500;
  const SWOOP_DEFAULT_ALTITUDE_FLOOR=5.2;

  function attemptSwoop(){
    if(typeof john==='undefined'||johnIsUnderwater())return;
    const candidates=(window.johnHawks||[]).filter(h=>h&&h.g&&h.isRiggedHawk&&!h.riderControlled&&!h.swooping);
    if(!candidates.length)return;
    const hawk=candidates[Math.floor(Math.random()*candidates.length)];
    const angle=Math.random()*Math.PI*2;
    const distance=2+Math.random()*1.5;
    const tx=john.position.x+Math.cos(angle)*distance;
    const tz=john.position.z+Math.sin(angle)*distance;
    const ty=birdFlightY(tx,tz,SWOOP_ALTITUDE_OFFSET);
    hawk.swooping=true;
    hawk.minAltitudeOffset=SWOOP_LOW_ALTITUDE_FLOOR;
    hawk.target=new THREE.Vector3(tx,ty,tz);
    hawk.targetAge=0;
    setTimeout(()=>{
      hawk.minAltitudeOffset=SWOOP_DEFAULT_ALTITUDE_FLOOR;
      hawk.swooping=false;
    },SWOOP_DURATION_MS);
  }

  function scheduleSwoop(){
    const delay=SWOOP_MIN_INTERVAL_MS+Math.random()*(SWOOP_MAX_INTERVAL_MS-SWOOP_MIN_INTERVAL_MS);
    setTimeout(()=>{
      attemptSwoop();
      scheduleSwoop();
    },delay);
  }
  scheduleSwoop();
})();