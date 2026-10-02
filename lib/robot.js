// Metal Monster – shared 3D model for both designs.
//   metal_monster.html: crank + rod shovel (no gears) + overhead hammer
// Units: cm.  Axes: x = right, y = up, z = forward (robot front = +z).
// Angles written as "from +z toward +y" (the side view, front to the right).
'use strict';
const HEADLESS = typeof document==='undefined' || !!(typeof window!=='undefined' && window.HEADLESS);

// ============================================================ setup
const view=document.getElementById('view');
const renderer=new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputEncoding=THREE.sRGBEncoding;
renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.05;
view.insertBefore(renderer.domElement,view.firstChild);

const scene=new THREE.Scene();
scene.background=new THREE.Color(0x0e1116);
scene.fog=new THREE.Fog(0x0e1116,260,700);
const camera=new THREE.PerspectiveCamera(38,1,1,2000);
camera.position.set(64,46,76);
const controls=new THREE.OrbitControls(camera,renderer.domElement);
controls.target.set(0,9,0); controls.enableDamping=true; controls.maxPolarAngle=Math.PI*0.495;
controls.minDistance=12; controls.maxDistance=420;

scene.add(new THREE.HemisphereLight(0xbfd4ff,0x20242c,0.75));
const sun=new THREE.DirectionalLight(0xffffff,1.0); sun.position.set(60,130,80); sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048);
Object.assign(sun.shadow.camera,{left:-100,right:100,top:100,bottom:-100,near:10,far:400}); sun.shadow.bias=-0.0006;
scene.add(sun);
const rim=new THREE.DirectionalLight(0x6ea8ff,0.4); rim.position.set(-80,40,-60); scene.add(rim);

const floor=new THREE.Mesh(new THREE.PlaneGeometry(1400,1400),new THREE.MeshStandardMaterial({color:0x1b2028,roughness:.95}));
floor.rotation.x=-Math.PI/2; floor.receiveShadow=true; scene.add(floor);
const grid=new THREE.GridHelper(400,40,0x3a4556,0x262d38); grid.position.y=0.03; scene.add(grid);

// ============================================================ materials / helpers
const std=(c,r=.6,m=.1,o={})=>new THREE.MeshStandardMaterial(Object.assign({color:c,roughness:r,metalness:m},o));
const M={
  frame:std(0x2b3038,.6,.25), deck:std(0xb3261e,.5,.1), white:std(0xeeeeea,.65,0), blue:std(0x1e5bd6,.4,.3),
  print:std(0xff7a1a,.5,.05), blade:std(0x18b6a8,.45,.05), bladeD:std(0x0f8a80,.5,.05),
  wood:std(0xd0a468,.85,0), wood2:std(0xa87a3e,.85,0), ply:std(0xc9a26b,.85,0),
  steel:std(0xc3cad5,.3,.95), pacf:std(0x30343c,.5,.2), alu:std(0xb9c0c9,.35,.85), brass:std(0xc9a44a,.35,.8),
  bolt:std(0x9aa1ab,.35,.9), blackOx:std(0x2a2d31,.4,.7), bronze:std(0xb07a3a,.4,.7), chain:std(0x7a808a,.35,.9),
  motor:std(0x1b1e23,.5,.5), cap:std(0x8a94a3,.35,.8), rubber:std(0x0c0c0d,.95,0), tpu:std(0x3a3f46,.9,0),
  battery:std(0x2b6cff,.5,0), pcb:std(0x1f8a4c,.6,.1), red:std(0xd23b3b,.55,.1), redD:std(0x8f2626,.6,.1),
  sensor:std(0x7a2bd6,.5,.1), band:std(0xe8b23a,.9,0), petg:std(0x9aa3ad,.55,.05),
  led:new THREE.MeshBasicMaterial({color:0xff3030})
};
const rad=d=>d*Math.PI/180, deg=r=>r*180/Math.PI;

// every mesh is tagged with a part name and a rigid group, used by the labels and the clash check
let CUR={part:'',grp:'chassis',noClash:false};
function P(part,grp,noClash=false){CUR={part,grp:grp||CUR.grp,noClash};}
function mesh(geo,mat,parent,x=0,y=0,z=0){const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;m.userData={part:CUR.part,grp:CUR.grp,noClash:CUR.noClash};if(parent)parent.add(m);return m;}
const box=(w,h,d,mat,p,x,y,z)=>mesh(new THREE.BoxGeometry(w,h,d),mat,p,x,y,z);
const GC={}; const cg=(k,f)=>GC[k]||(GC[k]=f());
function cylX(r,len,mat,p,x,y,z,seg=32){const g=cg('cx'+r+'_'+len+'_'+seg,()=>{const g=new THREE.CylinderGeometry(r,r,len,seg);g.rotateZ(Math.PI/2);return g;});return mesh(g,mat,p,x,y,z);}
function cylY(r,len,mat,p,x,y,z,seg=24){return mesh(cg('cy'+r+'_'+len+'_'+seg,()=>new THREE.CylinderGeometry(r,r,len,seg)),mat,p,x,y,z);}
const V2d=(a,b)=>new THREE.Vector2(a,b);
function circlePath(cz,cy,r,n=28){const h=new THREE.Path();h.absarc(cz,cy,r,0,Math.PI*2,true);return h;}
function slotPath(z0,y0,z1,y1,r){const a=Math.atan2(y1-y0,z1-z0),h=new THREE.Path();h.absarc(z0,y0,r,a+Math.PI/2,a+Math.PI*1.5,false);h.absarc(z1,y1,r,a-Math.PI/2,a+Math.PI/2,false);h.closePath();return h;}
// profile drawn in (z,y) and extruded along x, centred on x=0; holes = THREE.Path list
function profileGeo(pts,width,holes=[]){
  const s=new THREE.Shape(pts.map(p=>V2d(p[0],p[1])));holes.forEach(h=>s.holes.push(h));
  const g=new THREE.ExtrudeGeometry(s,{depth:width,bevelEnabled:false,curveSegments:24});
  g.rotateY(-Math.PI/2); g.translate(width/2,0,0); return g;
}
function shapeGeoX(shape,width){const g=new THREE.ExtrudeGeometry(shape,{depth:width,bevelEnabled:false,curveSegments:24});g.rotateY(-Math.PI/2);g.translate(width/2,0,0);return g;}
// horizontal plate: outline in (x,z), bottom at y0, thickness t
function plateGeo(pts,t,holes=[]){const s=new THREE.Shape(pts.map(p=>V2d(p[0],-p[1])));holes.forEach(h=>s.holes.push(h));
  const g=new THREE.ExtrudeGeometry(s,{depth:t,bevelEnabled:false,curveSegments:20});g.rotateX(-Math.PI/2);return g;}
function ringX(ro,ri,len,mat,p,x,y,z){const g=cg('rg'+ro+'_'+ri+'_'+len,()=>{const s=new THREE.Shape();s.absarc(0,0,ro,0,Math.PI*2,false);s.holes.push(circlePath(0,0,ri));return shapeGeoX(s,len);});return mesh(g,mat,p,x,y,z);}
function arcPts(cz,cy,r,a0,a1,n=16){const o=[];for(let i=0;i<=n;i++){const a=rad(a0+(a1-a0)*i/n);o.push([cz+r*Math.cos(a),cy+r*Math.sin(a)]);}return o;}
// roller-chain sprocket, #25 (pitch 0.635 cm, roller 0.33 cm)
const PITCH=.635,ROLLER=.33;
const sprR=n=>PITCH/(2*Math.sin(Math.PI/n));
function sprocketShape(n,holeR,light=[],hex=false){
  const R=sprR(n),Ro=R+.28,rs=ROLLER/2+.01,s=new THREE.Shape(),pts=[];
  for(let i=0;i<n;i++){const t=i*2*Math.PI/n,cz=R*Math.cos(t),cy=R*Math.sin(t);
    for(let k=0;k<=8;k++){const ps=t-Math.PI/2-rad(12)-(Math.PI+rad(-24))*k/8;pts.push([cz+rs*Math.cos(ps),cy+rs*Math.sin(ps)]);}
    const tt=t+Math.PI/n;pts.push([Ro*Math.cos(tt-.03),Ro*Math.sin(tt-.03)],[Ro*Math.cos(tt+.03),Ro*Math.sin(tt+.03)]);}
  s.setFromPoints(pts.map(p=>V2d(p[0],p[1])));s.holes.push(hex?hexPath(0,0):circlePath(0,0,holeR));light.forEach(h=>s.holes.push(h));return s;
}
// fasteners: head bearing face at pos, shank goes along +axis*dir for `grip`, nut (optional) at the far end
function bolt(p,pos,axis,dir,grip,d=.3,o={}){
  const keep=CUR;P(o.part||'Bolt M'+Math.round(d*10),CUR.grp,!o.clash);
  const g=new THREE.Group();g.position.set(pos[0],pos[1],pos[2]);p.add(g);
  if(axis==='x')g.rotation.z=dir>0?-Math.PI/2:Math.PI/2;else if(axis==='z')g.rotation.x=dir>0?Math.PI/2:-Math.PI/2;else if(dir<0)g.rotation.x=Math.PI;
  const head=o.head||'socket',mat=o.mat||M.bolt;
  if(head==='socket')mesh(cg('bs'+d,()=>new THREE.CylinderGeometry(d*.8,d*.8,d,16)),mat,g,0,-d/2,0);
  else if(head==='hex')mesh(cg('bh'+d,()=>new THREE.CylinderGeometry(d*.95,d*.95,d*.7,6)),mat,g,0,-d*.35,0);
  else if(head==='csk')mesh(cg('bk'+d,()=>new THREE.CylinderGeometry(d,d,.04,16)),mat,g,0,-.02,0);
  if(o.washer)mesh(cg('bw'+d,()=>new THREE.CylinderGeometry(d*1.1,d*1.1,.06,16)),M.steel,g,0,head==='csk'?-.03:-.03,0);
  const L=grip+(o.nut?d*.9:0)+.1;
  if(!o.noShank)mesh(cg('bl'+d+'_'+L,()=>new THREE.CylinderGeometry(d*.5,d*.5,L,10)),M.bolt,g,0,L/2,0);
  if(o.nut){if(o.washer)mesh(cg('bw'+d,()=>new THREE.CylinderGeometry(d*1.1,d*1.1,.06,16)),M.steel,g,0,grip+.03,0);
    mesh(cg('bn'+d,()=>new THREE.CylinderGeometry(d*.95,d*.95,d*.8,6)),o.nutMat||M.bolt,g,0,grip+d*.4+(o.washer?.06:0),0);}
  CUR=keep;return g;
}
// GA25-370 gear motor: gearbox face at faceX, body goes to dir (+1/-1 along x); returns nothing
// JGA25-370 (datasheet): gearbox Ø25 × L (≈19 mm for 133/170 rpm), motor Ø24.4 × 30.8, rear boss Ø6.5 × 4,
// shaft Ø4 with a 3.5 mm D-flat over the outer 8 mm, 11.5 mm from the face incl. a Ø7 × 2.5 boss, 2 × M3 mounting holes 17 mm apart
const GA={L:1.9,motor:3.08,rear:.4,shaft:1.15,flat:.8,boss:.25,holes:.85};
function ga25(p,y,z,faceX,dir,name){
  const keep=CUR;
  P(name+' – GA25 gearbox');cylX(1.25,GA.L,M.cap,p,faceX+dir*GA.L/2,y,z);
  for(const s of[-1,1])cylX(.15,.05,M.bolt,p,faceX+dir*.02,y,z+s*GA.holes,8).userData.noClash=true;       // gearbox screws (leave them in)
  P(name+' – 370 motor');cylX(1.22,GA.motor,M.motor,p,faceX+dir*(GA.L+GA.motor/2),y,z);
  P(name+' – rear boss');cylX(.325,GA.rear,M.cap,p,faceX+dir*(GA.L+GA.motor+GA.rear/2),y,z,16);
  P(name+' – terminals',CUR.grp,true);for(const s of[-1,1])box(.1,.45,.25,M.brass,p,faceX+dir*(GA.L+GA.motor+.2),y+s*.75,z);
  P(name+' – output shaft Ø4 D',CUR.grp,true);cylX(.35,GA.boss,M.brass,p,faceX-dir*GA.boss/2,y,z,16);cylX(.2,GA.shaft,M.steel,p,faceX-dir*GA.shaft/2,y,z,12);
  CUR=keep;
}
// Hex coupler (user's part): brass, 2 set screws on the Ø4 GA25 shaft (add a 4→6 sleeve if the bore is 6 mm), Ø11.5 × 11 mm round sleeve with 2 set screws + 12 mm A/F × 7 mm hex, M4 thread in the hex end
const CPL={len:1.8,hexL:.7,hexAF:1.2,sleeveD:1.15,bore:.6};
const HEX_R=CPL.hexAF/Math.sqrt(3);
function hexCoupler(p,xs,dir,clash=true){   // xs = sleeve end (motor side), dir = towards the hex
  const keep=CUR;P('Hex coupler 18 mm (12 mm hex)',CUR.grp,!clash);
  const sl=CPL.len-CPL.hexL;
  cylX(CPL.sleeveD/2,sl,M.brass,p,xs+dir*sl/2,0,0,24);
  mesh(cg('cplhex',()=>{const g=new THREE.CylinderGeometry(HEX_R,HEX_R,CPL.hexL,6);g.rotateZ(Math.PI/2);g.rotateX(Math.PI/6);return g;}),M.brass,p,xs+dir*(sl+CPL.hexL/2),0,0);
  P('Coupler set screw',CUR.grp,true);box(.3,.08,.3,M.blackOx,p,xs+dir*.35,CPL.sleeveD/2,0);box(.3,.3,.08,M.blackOx,p,xs+dir*.35,0,CPL.sleeveD/2);
  CUR=keep;
}
function hexPath(cz,cy,R=HEX_R+.01){const h=new THREE.Path();for(let k=0;k<=6;k++){const a=Math.PI/3*k;k?h.lineTo(cz+R*Math.cos(a),cy+R*Math.sin(a)):h.moveTo(cz+R*Math.cos(a),cy+R*Math.sin(a));}return h;}
const anchor=(p,x,y,z)=>{const o=new THREE.Object3D();o.position.set(x,y,z);p.add(o);return o;};

// ============================================================ kit sizes
// >>> KIT SIZES (cm): edit these to match your competition kit, then reload <<<
const CFG={
  overallW:26.3,     // measured: outside of the left tyre to outside of the right tyre
  boxLen:22.0,       // box outside length (side panels 220 mm)
  wallT:1.5,         // panel thickness (15 mm)
  wallBottom:2.0,    // measured: ground to the bottom of the floor (= bottom of the panels)
  floorT:.5,         // measured: floor (base plate) thickness
  wallTop:9.5,       // top of the panels = wallBottom + 7.5
  wheelR:4.3,        // wheel radius (Ø86 × 39)
  wheelW:3.9,        // wheel width (39 mm)
  wheelGap:.3,       // measured: wheel ↔ side panel; the coupler sits recessed inside the wheel hub
  frontToAxle:6,     // measured: front wheel axle to the front end of the box
  lidT:.5,           // red lid thickness
  lidW:20,           // measured: red lid width (overhangs the 17.9 cm box)
  lidOpen:2,         // measured: front of the box left open by the lid
};
CFG.boxW=CFG.overallW-2*(CFG.wheelW+CFG.wheelGap);   // 17.9 cm
CFG.wheelZ=CFG.boxLen/2-CFG.frontToAxle;             // wheel axle distance from centre (front/back)
CFG.lidLen=CFG.boxLen-CFG.lidOpen;
const W_OUT=CFG.boxW/2, W_IN=W_OUT-CFG.wallT, WALL_X=(W_OUT+W_IN)/2;          // side panel faces
const WHEEL_X=W_OUT+CFG.wheelGap+CFG.wheelW/2, WHEEL_OUT=WHEEL_X+CFG.wheelW/2;
const BLADE_HW=WHEEL_OUT+.9;                                                     // blade covers the wheels
const BL2=CFG.boxLen/2, DECK_Y=CFG.wallTop+.1, DECK_TOP=DECK_Y+CFG.lidT;
const FLOOR_TOP=CFG.wallBottom+CFG.floorT, EXT_TOP=FLOOR_TOP+.6;   // top of the base plate / of the printed front plate
const POCKET=1.2;                         // motor pocket depth in the side panel (leaves a 3 mm web)

// ---- key layout numbers (see the Check tab)
const H={y:2.0,z:13};                     // shovel hinge = dead axle
const TILT=8.6;                           // blade rest angle, tip on the floor
const SMA=112, SMC=5.5;                   // shovel motor axis: 5.5 cm from the hinge at 112°
const SM={y:H.y+SMC*Math.sin(rad(SMA)),z:H.z+SMC*Math.cos(rad(SMA))};
const PLATE_X0=3.3,PLATE_X1=3.8;    // shovel motor 5 mm face plate: 11.5 mm shaft → 6 mm inside the coupler sleeve, set screws on the D-flat
const SM_END=PLATE_X1+GA.L+GA.motor+GA.rear, NOTCH_R=1.4;
// bolt holes: clearance radii (M2.5 / M3 / M3.5 / M4) and the shared bolt positions of the front plate (x,z)
const HM25=.14,HM3=.17,HM35=.2,HM4=.225;
const EXT_BOLTS=[[-3.4,8.2],[-3.4,9.3],[3.4,8.2],[3.4,9.3]];                 // front plate -> base plate
const FOOT_X=4.25,FOOT_DZ=[-.6,.3];                                            // motor bracket foot -> front plate (+ base plate)
const FOOT_BOLTS=[-1,1].flatMap(s=>FOOT_DZ.map(dz=>[s*FOOT_X,SM.z+dz]));
const CHEEK_BOLTS=[[8.4,FLOOR_TOP+.7],[8.4,4.7]];                             // cheek -> side wall (z,y), M4
const ph=(x,z,r)=>circlePath(x,-z,r);                                          // hole in a plateGeo plate at (x,z)   // shovel motor end; past W_IN it goes through a notch in the side wall
const HP={y:DECK_TOP+5.8,z:-1.5};         // hammer pivot, 5.8 cm above the lid
const DOGC=22.2;                          // dog-clutch contact angle (2 pins Ø5 at r=13 mm)
// crank + rod linkage
const CR_R=3.75,ROD_L=5.5,LUG_RHO=6.0;   // solved so the crank clears the blade, the lid and the drive motors

// ============================================================ robot
const robot=new THREE.Group(); scene.add(robot);
const body=new THREE.Group(); robot.add(body);
const wheels=[];

// ---------------- kit box: base plate, walls, rear wall
P('Kit base plate (plywood)','chassis');
{const pts=[[-W_IN,-BL2+CFG.wallT],[W_IN,-BL2+CFG.wallT],[W_IN,BL2]];
 pts.push([-W_IN,BL2]);
 mesh(plateGeo(pts,CFG.floorT,[...EXT_BOLTS,...FOOT_BOLTS.filter(b=>b[1]+HM3<BL2)].map(b=>ph(b[0],b[1],HM3))),M.wood,body,0,CFG.wallBottom,0);}
const pocketZ=[CFG.wheelZ,-CFG.wheelZ], motorY=CFG.wheelR;
function wallShape(){
  const y0=CFG.wallBottom,y1=CFG.wallTop,h=y1-y0;
  const out=[[-BL2,y0],[BL2,y0]];
  if(SM_END>W_IN-.1)out.push([BL2,SM.y-NOTCH_R],...arcPts(SM.z,SM.y,NOTCH_R,-90,-270,16),[BL2,SM.y+NOTCH_R]);   // U-notch: shovel motor passes through
  out.push([BL2,y1],[-BL2,y1]);
  const sh=new THREE.Shape(out.map(q=>V2d(q[0],q[1])));
  const rows=[y0+h*.2,y0+h*.5,y0+h*.8];
  for(let i=0,z=-8.4;z<=8.5;z+=2.4,i++)rows.forEach((y,j)=>{
    if(pocketZ.some(pz=>Math.abs(z-pz)<2&&Math.abs(y-motorY)<2))return;       // around the motor pockets
    if(z>8&&y<5.4)return;                                                      // cheek bolts
    const hp=new THREE.Path();
    if((i+j)%2===0)hp.absarc(z,y,.62,0,Math.PI*2,true);
    else{const q=.55;hp.moveTo(z-q,y-q);hp.lineTo(z-q,y+q);hp.lineTo(z+q,y+q);hp.lineTo(z+q,y-q);hp.lineTo(z-q,y-q);}
    sh.holes.push(hp);});
  CHEEK_BOLTS.forEach(([z,y])=>sh.holes.push(circlePath(z,y,HM4)));
  return sh;
}
for(const s of[-1,1]){
  // inner layer with Ø26 through-pockets for the GA25 gearboxes, outer 4 mm web with the shaft hole
  P('Kit side wall','chassis');
  const inner=wallShape();pocketZ.forEach(pz=>inner.holes.push(circlePath(pz,motorY,1.3)));
  mesh(shapeGeoX(inner,POCKET),M.white,body,s*(W_IN+POCKET/2),0,0);
  const outer=wallShape();pocketZ.forEach(pz=>{outer.holes.push(circlePath(pz,motorY,.42));for(const dy of[-.85,.85])outer.holes.push(circlePath(pz,motorY+dy,HM3));});
  mesh(shapeGeoX(outer,CFG.wallT-POCKET),M.white,body,s*(W_OUT-(CFG.wallT-POCKET)/2),0,0);
}
P(`Kit rear panel ${Math.round(20*W_IN)}×75×15`);box(2*W_IN,CFG.wallTop-CFG.wallBottom,CFG.wallT,M.white,body,0,(CFG.wallTop+CFG.wallBottom)/2,-BL2+CFG.wallT/2);
// (the kit front panel is left off: the shovel mechanism lives there)

// ---------------- drive: 4 x GA25 133 rpm in wall pockets + 12 mm hex adapters
function makeWheel(){
  const g=new THREE.Group(),R=CFG.wheelR,W=CFG.wheelW,N=20;
  P('Wheel Ø86 × 39','chassis');
  cylX(R-.35,W,M.rubber,g,0,0,0,40);
  const knob=new THREE.CylinderGeometry(.3,.4,.45,8);
  for(let i=0;i<N;i++)for(const [xo,ph] of[[-W*.32,0],[0,.5],[W*.32,0]]){
    const p=new THREE.Object3D();p.rotation.x=(i+ph)*Math.PI*2/N;g.add(p);mesh(knob,M.rubber,p,xo,R-.225,0).userData.noClash=true;}
  cylX(R*.63,W+.2,M.blue,g,0,0,0,32);
  return g;
}
const driveMotors=new THREE.Group(); body.add(driveMotors);
for(const s of[-1,1])for(const zc of pocketZ){
  const face=s*(W_IN+POCKET);
  ga25(driveMotors,motorY,zc,face,-s,'Drive motor');
  P('Drive motor','chassis');
  for(const dy of[-.85,.85])bolt(driveMotors,[s*W_OUT,motorY+dy,zc],'x',-s,CFG.wallT-POCKET+.4,.3,{head:'csk'});
  const w=makeWheel(); w.position.set(s*WHEEL_X,motorY,zc); robot.add(w); wheels.push(w);
  // hex coupler: sleeve on the GA25 shaft between panel and wheel, hex in the wheel hub, M4 screw from outside
  hexCoupler(w,s*(W_OUT+.05-WHEEL_X),s,false);
  bolt(w,[s*(CFG.wheelW/2-.2),0,0],'x',-s,CFG.wheelW/2-.2+(WHEEL_X-W_OUT-.05-CPL.len)+.9,.4,{head:'hex',washer:true,part:'M4 wheel screw'});
}

// ---------------- electronics
const elec=new THREE.Group(); body.add(elec);
P('Battery 3S LiPo','chassis');box(3.8,2.6,6.6,M.battery,elec,0,FLOOR_TOP+1.3,-1.3);
box(3.6,.05,5.7,std(0xffffff,.6,0),elec,0,FLOOR_TOP+2.62,-1.3).userData.noClash=true;
P('Controller + drivers');box(8,.4,6,M.pcb,elec,0,FLOOR_TOP+4.5,-1);
box(3,.9,2.4,M.frame,elec,-2.8,FLOOR_TOP+5.1,-1); box(3,.9,2.4,M.frame,elec,2.8,FLOOR_TOP+5.1,-1);
P('Receiver');box(2.4,1,1.8,M.redD,elec,0,FLOOR_TOP+5.15,-6);

// ---------------- lid + doubler
const deckG=new THREE.Group(); robot.add(deckG);
function roundRectGeo(w,l,t,r,notch,holes=[]){   // notch {w,d}: cut-out in the middle of the front edge
  const s=new THREE.Shape(),x=-w/2,y=-l/2;
  s.moveTo(x+r,y);if(notch){s.lineTo(-notch.w/2,y);s.lineTo(-notch.w/2,y+notch.d);s.lineTo(notch.w/2,y+notch.d);s.lineTo(notch.w/2,y);}s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+l-r);s.quadraticCurveTo(x+w,y+l,x+w-r,y+l);
  s.lineTo(x+r,y+l);s.quadraticCurveTo(x,y+l,x,y+l-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);holes.forEach(h=>s.holes.push(h));
  const g=new THREE.ExtrudeGeometry(s,{depth:t,bevelEnabled:false});g.rotateX(-Math.PI/2);return g;
}
const LID_Z0=-BL2, LID_Z1=-BL2+CFG.lidLen;
// the cranks swing up to 4.3 cm around the shovel motor axis -> 52 mm wide notch in the front edge of the lid + doubler
const LID_NOTCH={w:5.2,z:7.0};
const LID_HOLES=[];   // [x,z,r] of every bolt through the lid; the lid + doubler are built after the hammer (buildLid)
function buildLid(){
  const cz=(LID_Z0+LID_Z1)/2;
  P('Kit lid (red)','chassis');mesh(roundRectGeo(CFG.lidW,CFG.lidLen,CFG.lidT,1.4,LID_NOTCH&&{w:LID_NOTCH.w,d:LID_Z1-LID_NOTCH.z},LID_HOLES.map(([x,z,r])=>circlePath(x,cz-z,r))),M.deck,deckG,0,DECK_Y,cz);
  const z0=LID_Z0+CFG.wallT+.05,zf=LID_Z1-.3,xw=W_IN-.1,nw=LID_NOTCH&&LID_NOTCH.w/2,pts=[[-xw,z0],[xw,z0],[xw,zf]];
  if(LID_NOTCH)pts.push([nw,zf],[nw,LID_NOTCH.z],[-nw,LID_NOTCH.z],[-nw,zf]);
  pts.push([-xw,zf]);
  const inDoubler=([x,z,r])=>Math.abs(x)+r<xw&&z-r>z0&&z+r<zf&&!(LID_NOTCH&&Math.abs(x)<nw+r&&z+r>LID_NOTCH.z);
  P('Lid doubler 4 mm ply');mesh(plateGeo(pts,.4,LID_HOLES.filter(inDoubler).map(([x,z,r])=>ph(x,z,r))),M.ply,deckG,0,DECK_Y-.4,0);
}
P('Lid');for(const sx of[-WALL_X,WALL_X])for(const sz of[-9.6,-5.6,3.8]){bolt(deckG,[sx,DECK_TOP,sz],'y',-1,CFG.lidT+1.2,.3,{head:'socket'});LID_HOLES.push([sx,sz,HM3]);}
P('Kill switch');box(1.3,.8,1.8,M.rubber,deckG,-6.4,DECK_TOP+.4,-8.5);
{const sw=mesh(new THREE.CylinderGeometry(.18,.18,1,8),M.steel,deckG,-6.4,DECK_TOP+1.1,-8.5);sw.rotation.z=.35;sw.userData.noClash=true;}
box(6,.03,3,M.white,deckG,-1.5,DECK_TOP+.02,-8.2).userData.noClash=true;

// ============================================================ SHOVEL (front)
// fixed part: front extension plate, 2 cheek plates, dead axle + collars, 2 motor brackets + motors
const shovelFixed=new THREE.Group(); robot.add(shovelFixed);
P('Front extension plate (print)','chassis');
{const pts=[[-4.7,7.6],[4.7,7.6],[4.7,11.5]];
 pts.push([2.5,11.5],[2.5,9.0],[-2.5,9.0],[-2.5,11.5]);                 // cranks + rods pass through the front
 pts.push([-4.7,11.5]);
 mesh(plateGeo(pts,.6,[...EXT_BOLTS,...FOOT_BOLTS].map(b=>ph(b[0],b[1],HM3))),M.petg,shovelFixed,0,FLOOR_TOP,0);
 for(const [sx,sz] of EXT_BOLTS)bolt(shovelFixed,[sx,EXT_TOP,sz],'y',-1,.6+CFG.floorT,.3,{nut:true});}
// cheek plates: bolted to the inside of the walls, carry the axle
const CHEEK_X=W_IN-.3;
{const pts=[[7.6,FLOOR_TOP],[BL2,FLOOR_TOP],[BL2,1.4],[11.9,1.4]];
 pts.push(...arcPts(H.z,H.y,1.3,208,360+115,30));
 pts.push([12.4,5.3],[7.6,5.3]);
 P('Cheek plate (print)','chassis');
 for(const s of[-1,1]){mesh(profileGeo(pts,.6,[circlePath(H.z,H.y,.4),...CHEEK_BOLTS.map(([z,y])=>circlePath(z,y,HM4))]),M.petg,shovelFixed,s*CHEEK_X,0,0);
   for(const [z,y] of CHEEK_BOLTS)bolt(shovelFixed,[s*W_OUT,y,z],'x',-s,CFG.wallT+.6,.4,{head:'csk',nut:true,washer:true});}}
P('Hinge axle Ø8 steel rod','chassis',true);cylX(.4,2*(BLADE_HW+.9),M.steel,shovelFixed,0,H.y,H.z,20);
P('Shaft collar Ø8','chassis');
for(const s of[-1,1]){for(const xc of[W_IN-.6-.4-.02,W_IN+.4+.02,BLADE_HW+.45])ringX(.8,.4,.8,M.blackOx,shovelFixed,s*xc,H.y,H.z);}

// motor brackets (printed L) + GA25 170 rpm, both designs use the same place
for(const s of[-1,1]){
  P('Shovel motor bracket (print)','chassis');
  const BR=1.35;   // 17 mm screw spacing: 3.3 mm of plastic above the top screw
  const pts=[[SM.z-BR,EXT_TOP],[SM.z+BR,EXT_TOP],[SM.z+BR,SM.y],...arcPts(SM.z,SM.y,BR,0,180,12),[SM.z-BR,EXT_TOP]];
  mesh(profileGeo(pts,PLATE_X1-PLATE_X0,[circlePath(SM.z,SM.y,.4),circlePath(SM.z,SM.y-.85,HM3),circlePath(SM.z,SM.y+.85,HM3)]),M.pacf,shovelFixed,s*(PLATE_X0+PLATE_X1)/2,0,0);
  {const xc=s*(PLATE_X1+4.7)/2,hw=(4.7-PLATE_X1)/2;   // foot, built around its own centre (the print list sorts parts by side)
   mesh(plateGeo([[-hw,SM.z-BR],[hw,SM.z-BR],[hw,SM.z+.56],[-hw,SM.z+.56]],.5,FOOT_DZ.map(dz=>ph(s*FOOT_X-xc,SM.z+dz,HM3))),M.pacf,shovelFixed,xc,EXT_TOP,0);}
  mesh(profileGeo([[SM.z-1.1,EXT_TOP+.5],[SM.z+.56,EXT_TOP+.5],[SM.z-1.1,EXT_TOP+2.6]],.4),M.pacf,shovelFixed,s*(PLATE_X1+.2),0,0);
  for(const dz of FOOT_DZ)bolt(shovelFixed,[s*FOOT_X,EXT_TOP+.5,SM.z+dz],'y',-1,SM.z+dz<BL2?1.1+CFG.floorT:1.1,.3,{nut:true});
  for(const dy of[-.85,.85])bolt(shovelFixed,[s*PLATE_X0,SM.y+dy,SM.z],'x',s,PLATE_X1-PLATE_X0+.4,.3,{head:'csk'});
  ga25(shovelFixed,SM.y,SM.z,s*PLATE_X1,s,'Shovel motor');
  P('Hall sensor','chassis',true);box(.15,.45,.35,M.sensor,shovelFixed,s*(PLATE_X0-.08),SM.y-2.2,SM.z-.4);
}
// rotating outputs: hex coupler on the GA25 shaft, crank on its 12 mm hex
const outs=[];
for(const s of[-1,1]){
  const o=new THREE.Group();o.position.set(0,SM.y,SM.z);shovelFixed.add(o);outs.push({g:o,s});
  const g=s<0?'outL':'outR', HX0=PLATE_X0-.05-CPL.len, HXC=HX0+CPL.hexL/2;   // hex from HX0 to HX0+0.7
  P('Hex coupler 18 mm (12 mm hex)',g);hexCoupler(o,s*(PLATE_X0-.05),-s);
  bolt(o,[s*HX0,0,0],'x',s,.9,.4,{head:'hex',washer:false,clash:true,part:'M4 screw + washer into coupler'});
  {
    P('Crank arm 37.5 mm (10 mm print, hex socket)',s<0?'outL':'outR');
    const al=Math.acos((1.1-.55)/CR_R),sh=new THREE.Shape(),pts=[];
    pts.push(...arcPts(0,0,1.1,deg(al),360-deg(al),16));pts.push(...arcPts(CR_R,0,.55,-deg(al),deg(al),10));
    sh.setFromPoints(pts.map(p=>V2d(p[0],p[1])));sh.holes.push(circlePath(CR_R,0,.16));sh.holes.push(hexPath(0,0));
    mesh(shapeGeoX(sh,CPL.hexL),M.print,o,s*HXC,0,0);
    const sh2=new THREE.Shape(sh.getPoints());sh2.holes.push(circlePath(CR_R,0,.16));sh2.holes.push(circlePath(0,0,.47));
    mesh(shapeGeoX(sh2,.3),M.print,o,s*(HX0-.15),0,0);                       // counterbore Ø9.4 × 3 mm for the M4 head
    P('Crank pin M3 shoulder bolt',s<0?'outL':'outR',true);
    bolt(o,[s*(HX0+CPL.hexL),0,CR_R],'x',-s,CPL.hexL+.3+.1+.4,.3,{head:'socket',nut:true,washer:true,clash:true,part:'Crank pin M3 shoulder bolt'});
    P('Magnet (home)',s<0?'outL':'outR',true);cylX(.2,.1,M.steel,o,s*(HX0+CPL.hexL+.05),0,-1.6,10);
  }
}

// blade (rotating about the dead axle)
const shovelPivot=new THREE.Group(); shovelPivot.position.set(0,H.y,H.z); robot.add(shovelPivot);
const bladeG=new THREE.Group(); bladeG.rotation.x=rad(TILT); shovelPivot.add(bladeG);
P('Shovel blade (PETG / PA-CF print)','blade');
mesh(profileGeo([[1.5,.3],[1.5,-.3],[10.5,-.3],[13,.05],[10.5,.3]],2*BLADE_HW),M.blade,bladeG);
P('Blade side wall','blade');
for(const s of[-1,1]) mesh(profileGeo([[.6,.3],[.6,4.6],[4,4.6],[12.5,.3]],.6),M.bladeD,bladeG,s*(BLADE_HW-.3),0,0);
P('Blade hinge knuckle (on axle)','blade');
const KN=[[W_IN+.9,W_IN+1.75],[BLADE_HW-1.0,BLADE_HW]];
for(const s of[-1,1])for(const [a,b] of KN){ringX(.9,.42,b-a,M.bladeD,bladeG,s*(a+b)/2,0,0);
  mesh(profileGeo([[.5,-.3],[1.6,-.3],[1.6,.3],[.5,.8]],b-a),M.bladeD,bladeG,s*(a+b)/2,0,0);}
P('Grip strip','blade',true);
for(const sx of[-10,-5,5,10]) box(2,.05,8,M.rubber,bladeG,sx,.32,6.5);

let lugAnchor=null;
// connecting rods
const rods=[];
{
  const sh=new THREE.Shape(),pts=[...arcPts(0,0,.45,90,270,10),...arcPts(ROD_L,0,.45,-90,90,10)];
  sh.setFromPoints(pts.map(p=>V2d(p[0],p[1])));sh.holes.push(circlePath(0,0,.16));sh.holes.push(circlePath(ROD_L,0,.16));
  const geo=shapeGeoX(sh,.4);
  for(const s of[-1,1]){P('Connecting rod 5.5 cm (5 mm print / 3 mm alu)',s<0?'rodL':'rodR');const m=mesh(geo,M.print,robot,s*.85,0,0);rods.push({m,s});}
}

// ============================================================ HAMMER (top)
const hammerFixed=new THREE.Group(); robot.add(hammerFixed);
const UP_X0=2.45,UP_X1=3.35;
P('Hammer upright 9 mm ply','chassis');
const RET_A=[0,1,2].map(k=>rad(90+k*120)), ANG_Z=[-3.8,1.2];   // retainer screws (r 15.5 mm), alu angle positions
{const pts=[[-5.5,DECK_TOP],[2.5,DECK_TOP],[1.5,HP.y],[1.0,HP.y+2],[-4,HP.y+2],[-4.5,HP.y]];
 const upHoles=[circlePath(HP.z,HP.y,1.3),...RET_A.map(a=>circlePath(HP.z+1.55*Math.cos(a),HP.y+1.55*Math.sin(a),HM25)),...ANG_Z.map(z=>circlePath(z,DECK_TOP+1.2,HM35))];
 const ret=new THREE.Shape();ret.absarc(0,0,1.8,0,Math.PI*2,false);ret.holes.push(circlePath(0,0,.8));RET_A.forEach(a=>ret.holes.push(circlePath(1.55*Math.cos(a),1.55*Math.sin(a),HM25)));
 for(const s of[-1,1]){mesh(profileGeo(pts,UP_X1-UP_X0,upHoles),M.wood,hammerFixed,s*(UP_X0+UP_X1)/2,0,0);
   P('6000-2RS bearing (10×26×8)');ringX(1.3,.5,.8,M.steel,hammerFixed,s*(UP_X0+UP_X1)/2,HP.y,HP.z);
   P('Bearing retainer (print)');mesh(shapeGeoX(ret,.25),M.pacf,hammerFixed,s*(UP_X1+.125),HP.y,HP.z);
   for(const a of RET_A){bolt(hammerFixed,[s*(UP_X1+.25),HP.y+1.55*Math.sin(a),HP.z+1.55*Math.cos(a)],'x',-s,.8,.25);}
   // aluminium angle brackets, bolted through lid + doubler
   P('Alu angle 20×20×2','chassis');
   for(const zc of ANG_Z)for(const side of[-1,1]){
     const xf=side>0?UP_X1:UP_X0, out=side>0?1:-1;   // outer or inner face of the upright
     const g=new THREE.Group();g.position.set(s*xf,DECK_TOP,zc);hammerFixed.add(g);
     mesh(profileGeo([[-1.2,0],[1.2,0],[1.2,2],[-1.2,2]],.2,[circlePath(0,1.2,HM35)]),M.alu,g,s*out*.1,0,0);
     mesh(plateGeo([[-1,-1.2],[1,-1.2],[1,1.2],[-1,1.2]],.2,[ph(s*out*.3,0,HM35)]),M.alu,g,s*out*1.0,0,0);
     LID_HOLES.push([s*xf+s*out*1.3,zc,HM35]);
     bolt(g,[s*out*1.3,.2,0],'y',-1,.2+CFG.lidT+.4,.35,{nut:true,washer:true});
     if(side>0)bolt(g,[s*out*.2,1.2,0],'x',-s*out,.4+(UP_X1-UP_X0),.35,{nut:true});
   }
   P('Hammer upright 9 mm ply','chassis');}}
P('Hammer shaft Ø10 steel','chassis',true);cylX(.5,10.55,M.steel,hammerFixed,.125,HP.y,HP.z,20);

// hammer arm + head (rotating group 'hammer')
const hammerRot=new THREE.Group(); hammerRot.position.set(0,HP.y,HP.z); robot.add(hammerRot);
P('Hammer hub (print, clamps shaft)','hammer');cylX(2.2,2.0,M.wood2,hammerRot,0,0,0,32);
bolt(hammerRot,[0,0,-2.2],'z',1,4.4,.4,{nut:true,part:'Cross bolt M4 through shaft'});
P('Hammer arm 2 × 9 mm ply','hammer');
const armPts=[[-1.8,.9],[1.8,.9],[1.27,-20.5],[-1.27,-20.5]];          // goes 2.5 cm into the head
const ARM_BOLTS=[-4,-10,-16], HEAD_BOLTS=[3.25,2.0];                        // arm-plate bolts; head bolts (head frame y) through the arm ends
for(const s of[-1,1]) mesh(profileGeo(armPts,.9,[circlePath(0,0,.5),...[...ARM_BOLTS,...HEAD_BOLTS.map(y=>y-22)].map(y=>circlePath(0,y,HM4))]),M.wood,hammerRot,s*1.45,0,0);
P('Arm spacer (print)','hammer');
for(const y of[-7,-13]) box(2,1.6,2.4,M.wood2,hammerRot,0,y,0);
for(const y of ARM_BOLTS) bolt(hammerRot,[-1.9,y,0],'x',1,3.8,.4,{nut:true,washer:true});
const head=new THREE.Group(); head.position.set(0,-22,0); hammerRot.add(head);
const headHoles=()=>[-4.5,4.5].map(x=>ph(x,0,HM4));
P('Hammer head (PETG 60 %)','hammer');mesh(plateGeo([[-6.5,-3.5],[6.5,-3.5],[6.5,3.5],[-6.5,3.5]],8,headHoles()),M.print,head,0,-4,0);
P('TPU strike pad','hammer');for(const sz of[-1,1]){box(11,6,.7,M.tpu,head,0,0,sz*3.85);}
P('Head cheek 6 mm ply','hammer');for(const y of[-4.6,4.0])mesh(plateGeo([[-6.7,-3.7],[6.7,-3.7],[6.7,3.7],[-6.7,3.7]],.6,headHoles()),M.wood2,head,0,y,0);
for(const sx of[-4.5,4.5])bolt(head,[sx,4.6,0],'y',-1,9.2,.4,{nut:true,washer:true});
for(const y of HEAD_BOLTS)bolt(head,[-1.9,y,0],'x',1,3.8,.4,{nut:true});
// drive disc with pin (keyed to shaft) – half of the dog clutch
P('Drive disc + pin (dog clutch)','hammer');cylX(1.8,.35,M.alu,hammerRot,3.875,0,0,28);cylX(.25,.4,M.steel,hammerRot,4.25,1.3,0,14);
bolt(hammerRot,[3.875,0,-1.8],'z',1,1.3,.3,{part:'Collar clamp screw'});
// band crank (left end of shaft)
P('Band crank (alu)','hammer');
{const pts=[...arcPts(0,-3.2,.55,180,360,8),...arcPts(0,0,.9,0,180,10)];mesh(profileGeo(pts,.6,[circlePath(0,0,.5)]),M.alu,hammerRot,-4.45,0,0);}
P('Band pin','hammer',true);cylX(.2,1.0,M.steel,hammerRot,-4.95,-3.2,0,10);
P('Shaft collar Ø10','hammer');ringX(.9,.5,.5,M.blackOx,hammerRot,-3.9,0,0);ringX(.9,.5,.45,M.blackOx,hammerRot,5.125,0,0);

// 48T sprocket, free on the shaft (bronze bush) with the dog pin
const dogG=new THREE.Group(); dogG.position.set(0,HP.y,HP.z); hammerFixed.add(dogG);
const RBIG=sprR(48),RSM=sprR(12),CHAIN_X=4.59;
P('48T #25 sprocket (free on bush)','dog');
{const light=[];for(let k=0;k<6;k++){const a=k*Math.PI/3;light.push(circlePath(2.9*Math.cos(a),2.9*Math.sin(a),.8));}
 mesh(shapeGeoX(sprocketShape(48,.7,light),.28),M.steel,dogG,CHAIN_X,0,0);}
P('Bronze bush 10×14','dog');ringX(.7,.5,.5,M.bronze,dogG,4.65,0,0);
P('Dog pin','dog');cylX(.25,.4,M.steel,dogG,4.25,1.3,0,14);

// hammer motor: position solved so the #25 chain is exactly 56 links
const CHAIN_N=56;
function chainLen(C){const b=Math.asin((RBIG-RSM)/C);return 2*Math.sqrt(C*C-(RBIG-RSM)**2)+RBIG*(Math.PI+2*b)+RSM*(Math.PI-2*b);}
let CC=7;for(let i=0;i<60;i++){CC+=(CHAIN_N*PITCH-chainLen(CC))/2;}
const MDIR=Math.atan2(-4.2,-6.0);   // direction from the pivot, (dy,dz)
const MOT={y:HP.y+CC*Math.sin(MDIR),z:HP.z+CC*Math.cos(MDIR)};
const HM_HEX0=CHAIN_X-.14, HM_PL0=HM_HEX0+CPL.len+.05, HM_PL1=HM_PL0+.5;   // hex starts at the sprocket's inner face
P('Hammer motor bracket (print, slotted)','chassis');
{const BR=1.35,BX=[HM_PL0-.35,HM_PL0+2.3],BDZ=[-.8,.8];
 const pts=[[MOT.z-BR,DECK_TOP],[MOT.z+BR,DECK_TOP],[MOT.z+BR,MOT.y],...arcPts(MOT.z,MOT.y,BR,0,180,12)];
 mesh(profileGeo(pts,HM_PL1-HM_PL0,[circlePath(MOT.z,MOT.y,.4),circlePath(MOT.z,MOT.y-.85,HM3),circlePath(MOT.z,MOT.y+.85,HM3)]),M.pacf,hammerFixed,(HM_PL0+HM_PL1)/2,0,0);
 // base: 4 slots (±2 mm along z) to tension the chain
 mesh(plateGeo([[HM_PL0-.8,MOT.z-BR],[HM_PL0+2.75,MOT.z-BR],[HM_PL0+2.75,MOT.z+BR],[HM_PL0-.8,MOT.z+BR]],.3,
   BX.flatMap(bx=>BDZ.map(dz=>slotPath(bx,-(MOT.z+dz-.2),bx,-(MOT.z+dz+.2),HM3)))),M.pacf,hammerFixed,0,DECK_TOP,0);
 P('Motor saddle + zip tie (print)','chassis');box(.7,.35,2.2,M.pacf,hammerFixed,HM_PL0+3.15,DECK_TOP+.175,MOT.z);
 P('Hammer motor bracket (print, slotted)','chassis');
 for(const dz of BDZ)for(const bx of BX){
   LID_HOLES.push([bx,MOT.z+dz,HM3]);
   if(bx<W_IN-.2)bolt(hammerFixed,[bx,DECK_TOP+.3,MOT.z+dz],'y',-1,.3+CFG.lidT+.4,.3,{washer:true,nut:true,part:'M3×16 through lid + doubler (slotted)'});
   else bolt(hammerFixed,[bx,DECK_TOP+.3,MOT.z+dz],'y',-1,.3+CFG.lidT+1.7,.3,{washer:true,part:'M3×25 wood screw through lid into the side panel top'});}
 for(const dy of[-.85,.85])bolt(hammerFixed,[HM_PL0,MOT.y+dy,MOT.z],'x',1,HM_PL1-HM_PL0+.4,.3,{head:'csk'});}
ga25(hammerFixed,MOT.y,MOT.z,HM_PL1,1,'Hammer motor');
const mspG=new THREE.Group();mspG.position.set(0,MOT.y,MOT.z);hammerFixed.add(mspG);
P('12T #25 sprocket (print PA, hex hub)','msp');mesh(shapeGeoX(sprocketShape(12,0,[],true),.28),M.print,mspG,CHAIN_X,0,0);
{const hs=new THREE.Shape();hs.absarc(0,0,.85,0,Math.PI*2,false);hs.holes.push(hexPath(0,0));const hl=HM_HEX0+CPL.hexL-(CHAIN_X+.14);mesh(shapeGeoX(hs,hl),M.print,mspG,CHAIN_X+.14+hl/2,0,0);}
P('Hex coupler 18 mm (12 mm hex)','msp');hexCoupler(mspG,HM_PL0-.05,-1);
bolt(mspG,[HM_HEX0,0,0],'x',1,.9,.4,{head:'hex',washer:true,part:'M4 screw + washer into coupler'});
// chain: 56 links along the real path
const chainLinks=[];let chainPath=null;
{P('#25 roller chain, 56 links','chain');
 const c1={z:HP.z,y:HP.y,r:RBIG},c2={z:MOT.z,y:MOT.y,r:RSM};
 const d=Math.hypot(c2.z-c1.z,c2.y-c1.y),phi=Math.atan2(c2.y-c1.y,c2.z-c1.z),del=Math.acos((c1.r-c2.r)/d);
 // path travelled clockwise (the sense of +rotation.x): big arc, tangent, small arc, tangent
 const segs=[];const at=(c,a)=>[c.z+c.r*Math.cos(a),c.y+c.r*Math.sin(a)];
 segs.push({t:'arc',c:c1,a0:phi-del,a1:phi+del-2*Math.PI});
 segs.push({t:'line',p0:at(c1,phi+del),p1:at(c2,phi+del)});
 segs.push({t:'arc',c:c2,a0:phi+del,a1:phi-del});
 segs.push({t:'line',p0:at(c2,phi-del),p1:at(c1,phi-del)});
 segs.forEach(s=>s.len=s.t==='arc'?Math.abs(s.a1-s.a0)*s.c.r:Math.hypot(s.p1[0]-s.p0[0],s.p1[1]-s.p0[1]));
 const total=segs.reduce((a,s)=>a+s.len,0);
 chainPath=function(sv){sv=((sv%total)+total)%total;for(const s of segs){if(sv<=s.len){const u=sv/s.len;
   if(s.t==='arc'){const a=s.a0+(s.a1-s.a0)*u;return at(s.c,a);}return[s.p0[0]+(s.p1[0]-s.p0[0])*u,s.p0[1]+(s.p1[1]-s.p0[1])*u];}sv-=s.len;}return at(c1,phi-del);};
 chainPath.total=total;
 chainPath.phase=(((phi-del)%(2*Math.PI/48))+2*Math.PI)%(2*Math.PI/48)*RBIG;
 { // small sprocket phase: angle of a roller on the small arc when dog=0
   const s0=segs[0].len+segs[1].len;let k=Math.ceil((s0-chainPath.phase)/PITCH);const sv=chainPath.phase+k*PITCH-s0;
   chainPath.mspPhase=(phi+del)-sv/RSM; }
 const plate=new THREE.BoxGeometry(.08,.5,PITCH+.2),roller=new THREE.CylinderGeometry(ROLLER/2,ROLLER/2,.32,10);roller.rotateZ(Math.PI/2);
 for(let i=0;i<CHAIN_N;i++){const g=new THREE.Group();hammerFixed.add(g);
   const off=(i%2?.26:.2);mesh(plate,M.chain,g,CHAIN_X-off,0,0);mesh(plate,M.chain,g,CHAIN_X+off,0,0);mesh(roller,M.steel,g,CHAIN_X,0,-PITCH/2);
   chainLinks.push(g);}
}
// over-centre bands: crank on the shaft (left) -> anchor post on the lid
P('Band anchor post (print)','chassis');
box(.8,1.4,1,M.pacf,hammerFixed,-4.95,DECK_TOP+.7,HP.z);
P('Band anchor post (print)','chassis',true);cylX(.2,1.1,M.steel,hammerFixed,-4.95,DECK_TOP+1.2,HP.z,10);
bolt(hammerFixed,[-4.95,DECK_TOP,HP.z],'y',-1,CFG.lidT+.4,.3,{nut:true});LID_HOLES.push([-4.95,HP.z,HM3]);
const bands=[];
{P('Rubber bands (×2–4)','bands',true);for(const bx of[-4.75,-5.15]){const m=mesh(new THREE.CylinderGeometry(.12,.12,1,8),M.band,robot);bands.push({m,bx});}}
function updateBands(){
  const f=rad(S.hammer),ty=HP.y-3.2*Math.cos(f),tz=HP.z-3.2*Math.sin(f);
  for(const b of bands){const A=new THREE.Vector3(b.bx,ty,tz),B=new THREE.Vector3(b.bx,DECK_TOP+1.2,HP.z),d=B.clone().sub(A),L=d.length();
    b.m.position.copy(A).add(B).multiplyScalar(.5);b.m.scale.set(1,L,1);b.m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());}
}

// hard stops (TPU padded posts, through-bolted into the lid doubler)
function armLowEdge(a,r){ // lowest arm-edge point at radius r for hammer angle a (deg): [z,y]
  const hw=1.8-(r-.6)*(.5/18.9),out=[];
  for(const e of[-hw,hw]){const yl=-r,zl=e,f=rad(a);out.push([HP.z+yl*Math.sin(f)+zl*Math.cos(f),HP.y+yl*Math.cos(f)-zl*Math.sin(f)]);}
  return out[0][1]<out[1][1]?out[0]:out[1];
}
let REST=70, FRONT_STOP=window.FRONT_STOP||284;   // front stop angle, checked by the clash sweep (Check tab)
function stopPost(a,zWant,name){
  let yTop=1e9;
  for(let r=1;r<19;r+=.01){const p=armLowEdge(a,r);if(Math.abs(p[0]-zWant)<=.6)yTop=Math.min(yTop,p[1]);}
  const best=[zWant,yTop-.01],hgt=best[1]-DECK_TOP-.35;
  P(name,'chassis');mesh(plateGeo([[-2.2,-.6],[2.2,-.6],[2.2,.6],[-2.2,.6]],hgt,[ph(-1.5,0,HM3),ph(1.5,0,HM3)]),M.pacf,hammerFixed,0,DECK_TOP,best[0]);
  P('TPU stop pad','chassis');box(4.4,.35,1.2,M.tpu,hammerFixed,0,DECK_TOP+hgt+.175,best[0]);
  P(name,'chassis');for(const sx of[-1.5,1.5]){bolt(hammerFixed,[sx,DECK_TOP,best[0]],'y',-1,CFG.lidT+.4,.3,{nut:true,head:'hex'});LID_HOLES.push([sx,best[0],HM3]);}
  return best;
}
const REAR_STOP_P=stopPost(REST,-8.9,'Rear stop post (print)');
const FRONT_STOP_P=stopPost(FRONT_STOP,5.6,'Front stop post (print)');
buildLid();
P('Hall sensor (hammer home)','chassis',true);box(.15,.4,.5,M.sensor,hammerFixed,UP_X1+.08,HP.y-2.3,HP.z);

// ---------------- overlays: envelope + footprint
const envelope=new THREE.Group(); robot.add(envelope);
{const g=new THREE.BoxGeometry(55,30,55);
 const e=new THREE.LineSegments(new THREE.EdgesGeometry(g),new THREE.LineBasicMaterial({color:0xffcc33}));
 const f=new THREE.Mesh(g,new THREE.MeshBasicMaterial({color:0xffcc33,transparent:true,opacity:.045,depthWrite:false,side:THREE.BackSide}));
 envelope.add(e,f); envelope.position.y=15;}
const footprint=new THREE.Group(); robot.add(footprint); footprint.visible=false;
{const pts=[[-W_OUT,-BL2],[W_OUT,-BL2],[W_OUT,BL2],[-W_OUT,BL2],[-W_OUT,-BL2]].map(p=>new THREE.Vector3(p[0],.08,p[1]));
 footprint.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:0x5be08a})));
 const pl=new THREE.Mesh(new THREE.PlaneGeometry(CFG.boxW,CFG.boxLen),new THREE.MeshBasicMaterial({color:0x5be08a,transparent:true,opacity:.12}));pl.rotation.x=-Math.PI/2;pl.position.y=.06;footprint.add(pl);}

// ============================================================ linkage kinematics
// crank angle k (deg, 0 = rest) -> blade lift (deg). Lug position on the blade (LUG_REL) is found once.
var LUG_REL=0; let V2K=null;
function solveLinkage(){
  const pin=f=>[SM.z+CR_R*Math.cos(f),SM.y+CR_R*Math.sin(f)];
  const lugAng=(f,sgn)=>{const p=pin(f),dz=p[0]-H.z,dy=p[1]-H.y,d=Math.hypot(dz,dy),c=(LUG_RHO*LUG_RHO+d*d-ROD_L*ROD_L)/(2*LUG_RHO*d);
    return Math.abs(c)>1?null:Math.atan2(dy,dz)+sgn*Math.acos(c);};
  for(const sgn of[-1,1]){const A=[];let ok=true;
    for(let k=0;k<=720;k++){const a=lugAng(rad(k/2),sgn);if(a===null){ok=false;break;}A.push(deg(a));}
    if(!ok)continue;
    for(let i=1;i<A.length;i++){while(A[i]-A[i-1]>180)A[i]-=360;while(A[i]-A[i-1]<-180)A[i]+=360;}
    const mn=Math.min(...A),mx=Math.max(...A),iRest=A.indexOf(mn);
    const rel=mn+TILT;
    if(rel<3||rel>60)continue;
    const table=[];for(let k=0;k<=720;k++)table.push(A[(iRest+k)%720]-mn);
    return {sgn,restCrank:iRest/2,rel,table,span:mx-mn,kMax:table.indexOf(Math.max(...table.slice(0,720)))/2};
  }
  return null;
}
V2K=solveLinkage();LUG_REL=V2K.rel;
function bladeFor(k){if(!V2K)return 0;k=((k%360)+360)%360*2;const i=Math.floor(k),f=k-i;return V2K.table[i]+(V2K.table[Math.min(i+1,720)]-V2K.table[i])*f;}
const KMAX=V2K?V2K.kMax:0;

// (the ribs need LUG_REL, so they are built here)
{
  P('Blade rib with lug (print)','blade');
  const lu=LUG_RHO*Math.cos(rad(LUG_REL)),lv=LUG_RHO*Math.sin(rad(LUG_REL));
  for(const s of[-1,1]){
    const pts=[[.5,.3],[lu+1.1,.3],[lu+.62,lv],...arcPts(lu,lv,.62,0,180,10).slice(1),[1.2,1.0],[.5,.9]];
    mesh(profileGeo(pts,.5,[circlePath(lu,lv,.16)]),M.print,bladeG,s*.35,0,0);
    ringX(.9,.42,.5,M.print,bladeG,s*.35,0,0);
  }
  bolt(bladeG,[-1.05,lv,lu],'x',1,2.1,.3,{nut:true,clash:true,part:'Lug pin M3×30 (one bolt through both rods + ribs)'});
  lugAnchor=anchor(bladeG,0,lv,lu);
}

// ============================================================ opponent dummy (front = -z)
const enemy=new THREE.Group(); scene.add(enemy); enemy.visible=false;
const enemyWheels=[];
P('Opponent','enemy',true);
box(16,4,22,M.red,enemy,0,0,0);
box(18,1.5,17,M.redD,enemy,0,2.75,1.5);
mesh(profileGeo([[-14,-2.8],[-10,-2.8],[-10,2]],19),M.redD,enemy);
box(2.5,.4,1,M.led,enemy,0,3.6,4);
for(const s of[-1,1])for(const zc of[7,-7]){const w=new THREE.Group();w.position.set(s*9,-.5,zc);enemy.add(w);
  cylX(3,2,M.rubber,w,0,0,0,28);cylX(1.6,2.2,M.pacf,w,0,0,0,20);box(2.3,.4,.7,M.steel,w,0,1.4,0);enemyWheels.push(w);}

// ============================================================ FX
const flash=new THREE.Mesh(new THREE.SphereGeometry(1,20,14),new THREE.MeshBasicMaterial({color:0xffc060,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false}));
scene.add(flash);
const NSP=70,spPos=new Float32Array(NSP*3),spVel=new Float32Array(NSP*3),spLife=new Float32Array(NSP);
const spGeo=new THREE.BufferGeometry();spGeo.setAttribute('position',new THREE.BufferAttribute(spPos,3));
const sparks=new THREE.Points(spGeo,new THREE.PointsMaterial({color:0xffb347,size:1.1,transparent:true,opacity:.95,depthWrite:false,blending:THREE.AdditiveBlending}));
sparks.frustumCulled=false;scene.add(sparks);
for(let i=0;i<NSP;i++)spPos[i*3+1]=-999;
let shake=0,flashT=0,flashPos=new THREE.Vector3();
function impact(p,n=40,power=1){
  flashPos.copy(p);flashT=1;shake=Math.max(shake,.9*power);
  for(let k=0;k<n;k++){const i=(Math.random()*NSP)|0;spPos.set([p.x,p.y,p.z],i*3);
    const a=Math.random()*Math.PI*2,u=Math.random(),sp=(20+Math.random()*50)*power;
    spVel.set([Math.cos(a)*sp*(1-u*.4),(15+Math.random()*45)*power,Math.sin(a)*sp*(1-u*.4)],i*3);spLife[i]=.5+Math.random()*.5;}
}
function stepFx(dt){
  for(let i=0;i<NSP;i++){if(spLife[i]>0){spLife[i]-=dt;spVel[i*3+1]-=150*dt;
    for(let k=0;k<3;k++)spPos[i*3+k]+=spVel[i*3+k]*dt;
    if(spPos[i*3+1]<.1){spPos[i*3+1]=.1;spVel[i*3+1]*=-.3;}}else spPos[i*3+1]=-999;}
  spGeo.attributes.position.needsUpdate=true;
  if(flashT>0){flashT=Math.max(0,flashT-dt*4);flash.position.copy(flashPos);flash.scale.setScalar(1+(1-flashT)*9);flash.material.opacity=flashT*.7;}else flash.material.opacity=0;
  shake*=Math.pow(.02,dt);
}

// ============================================================ state / animation
const S={x:0,z:0,yaw:0,shovel:0,crank:0,hammer:REST,dog:REST-DOGC};
let spin=0;
const FRONT_ZONE=220,SHOVEL_SAFE=40;
let interlockMsg='';
const _a=new THREE.Vector3(),_b=new THREE.Vector3();
function updateRods(){
  robot.updateMatrixWorld(true);
  for(const r of rods){
    const o=outs.find(o=>o.s===r.s).g;
    _a.set(r.s*.85,0,CR_R);o.localToWorld(_a);robot.worldToLocal(_a);
    lugAnchor.getWorldPosition(_b);robot.worldToLocal(_b);
    const dz=_b.z-_a.z,dy=_b.y-_a.y;
    r.m.position.set(r.s*.85,_a.y,_a.z);r.m.rotation.set(-Math.atan2(dy,dz),0,0);r.m.scale.set(1,1,Math.hypot(dz,dy)/ROD_L);
  }
}
function apply(){
  robot.position.set(S.x,0,S.z); robot.rotation.y=S.yaw;
  S.shovel=bladeFor(S.crank);outs.forEach(o=>o.g.rotation.x=-rad(V2K.restCrank+S.crank));
  shovelPivot.rotation.x=-rad(S.shovel);
  hammerRot.rotation.x=rad(S.hammer); dogG.rotation.x=rad(S.dog); mspG.rotation.x=rad(S.dog)*48/12-chainPath.mspPhase;
  const off=rad(S.dog)*RBIG+chainPath.phase;
  chainLinks.forEach((g,i)=>{const s0=off+i*PITCH,p0=chainPath(s0),p1=chainPath(s0+PITCH);
    g.position.set(0,(p0[1]+p1[1])/2,(p0[0]+p1[0])/2);g.rotation.x=-Math.atan2(p1[1]-p0[1],p1[0]-p0[0]);});
  updateBands();
  for(const w of wheels)w.rotation.x=spin;
  updateRods();
  hud();
}
function hud(){
  const el=document.getElementById('hud');if(!el)return;
  const hz=S.hammer>FRONT_ZONE?'front':(S.hammer>110?'overhead':'rear');
  el.innerHTML=`Shovel <b>${S.shovel.toFixed(0)}°</b>`+` (crank ${S.crank.toFixed(0)}°)`+` · Hammer <b>${S.hammer.toFixed(0)}°</b> (${hz}) · dog ${(((S.dog%360)+360)%360).toFixed(0)}°`+(interlockMsg?`<br><span class="warn">INTERLOCK: ${interlockMsg}</span>`:'');
}
let tweens=[];
const E={lin:u=>u,out:u=>1-Math.pow(1-u,3),in:u=>Math.pow(u,2.2),sine:u=>-(Math.cos(Math.PI*u)-1)/2};
const lerp=(a,b,u)=>a+(b-a)*u;
const speedSel=document.getElementById('speed');
function tw(dur,fn,ease=E.sine,kind='seq'){return new Promise(res=>tweens.push({dur,t:0,fn,ease,kind,res}));}
const wait=s=>tw(s,()=>{},E.lin);
function stepTweens(dt){
  const ts=speedSel?parseFloat(speedSel.value):1;
  for(const t of tweens.slice()){t.t+=dt*(t.kind==='cam'?1:ts);const u=Math.min(t.t/t.dur,1);t.fn(t.ease(u));
    if(u>=1){tweens.splice(tweens.indexOf(t),1);t.res();}}
}
function cancelSeq(){tweens=tweens.filter(t=>t.kind==='cam');}
function driveTo(z){spin+=(z-S.z)/CFG.wheelR;S.z=z;}
function toast(t,ms=1200){const el=document.getElementById('toast');if(!el)return;el.textContent=t;el.classList.add('on');clearTimeout(toast.h);toast.h=setTimeout(()=>el.classList.remove('on'),ms);}
function placeEnemy(x,y,z,tilt=0){enemy.visible=true;enemy.scale.set(1,1,1);enemy.rotation.set(rad(tilt),0,0);enemy.position.set(x,y,z);}
function headContact(front){const p=new THREE.Vector3(0,0,front?-3.5:3.5);head.updateWorldMatrix(true,false);return head.localToWorld(p);}
function hitAngle(yt,front=true){
  const f=phi=>front?HP.y-22*Math.cos(phi)+3.5*Math.sin(phi):HP.y-22*Math.cos(phi)-3.5*Math.sin(phi);
  let lo=front?rad(230):rad(50),hi=front?rad(300):rad(130);
  for(let i=0;i<40;i++){const m=(lo+hi)/2;if(front){f(m)>yt?lo=m:hi=m;}else{f(m)>yt?hi=m:lo=m;}}
  return deg((lo+hi)/2);
}
function resetScene(){
  cancelSeq();Object.assign(S,{x:0,z:0,yaw:0,shovel:0,crank:0,hammer:REST,dog:REST-DOGC});interlockMsg='';
  enemy.visible=false;spin=0;apply();syncSliders();
}
async function squash(){await tw(.09,u=>{enemy.scale.y=1-.18*u;},E.out);await tw(.35,u=>{enemy.scale.y=.82+.18*u;},E.out);}

// --- shovel moves
async function shovelUp(dur){await tw(dur,u=>{S.crank=lerp(0,KMAX,u);apply();},E.out);}
async function shovelDown(dur){await tw(dur,u=>{S.crank=lerp(KMAX,360,u);apply();},E.sine);S.crank=0;apply();}
// --- hammer moves (dog clutch: the motor only pushes; the hammer runs ahead on its own)
async function push(to,dur,ease=E.sine){const from=S.hammer,dir=Math.sign(to-from),o=S.dog-(from-dir*DOGC);
  await tw(dur,u=>{S.hammer=lerp(from,to,u);S.dog=S.hammer-dir*DOGC+o;apply();},ease);}
async function swing(to,dur,ease=E.in){const from=S.hammer;await tw(dur,u=>{S.hammer=lerp(from,to,u);apply();},ease);}
async function dogTo(to,dur){const from=S.dog;await tw(dur,u=>{S.dog=lerp(from,to,u);apply();},E.sine);}
async function rearmToRear(){ // hammer is in front: dog goes round, pushes it back over the top, it drops onto the rear stop
  toast('Re-arm',900);
  const c=S.hammer+DOGC;let t=c;while(t>S.dog)t-=360;await dogTo(t,.9);
  await push(176,1.3);await swing(REST,.5);await swing(REST+3,.08,E.out);await swing(REST,.1,E.out);
  let d=REST-DOGC;while(d<S.dog)d+=360;await dogTo(d,.9);
}
async function flipMove(){
  const ez=enemy.position.z;
  const lift=shovelUp(.32);
  const flip=wait(.08).then(()=>tw(1.05,u=>{
    enemy.rotation.x=Math.PI*(1-Math.pow(1-u,2));enemy.position.y=3.5+22*Math.sin(Math.PI*u);enemy.position.z=ez+20*u;
    for(const w of enemyWheels)w.rotation.x+=.6;},E.lin));
  impact(new THREE.Vector3(0,3,S.z+26),30,.7);
  await Promise.all([lift,flip]);
}
async function seqFlip(){
  resetScene();placeEnemy(0,3.5,62);toast('Approach',900);
  await wait(.4);
  await tw(1.5,u=>driveTo(lerp(0,30,u)),E.sine);
  toast('FLIP!',900);await flipMove();
  impact(new THREE.Vector3(0,.5,enemy.position.z),50,1.2);squash();toast('K.O.',1800);
  await shovelDown(.35);
}
async function frontStrike(topY){
  const hit=hitAngle(topY,true);
  toast('Motor pushes the hammer over the top',1500);
  await push(186,1.6);                       // GA25 through 4:1 chain, stretches the bands
  await swing(hit,.42);                      // bands + gravity: hammer runs away from the dog
  impact(headContact(true),60,1.4);squash();
  const z0=enemy.position.z;tw(.3,u=>{enemy.position.z=z0+3*u;},E.out);
  await swing(hit-5,.14,E.out);await swing(hit,.2,E.in);
  await wait(.5);
}
async function seqFront(){
  resetScene();placeEnemy(0,6.2,28,3);toast('Hammer – front',900);
  await wait(.4);await frontStrike(9.7);toast('SMASH',900);await wait(.4);await rearmToRear();
}
async function seqRear(){
  resetScene();placeEnemy(0,6,-22.5,-4);toast('Hammer – rear',900);
  await wait(.4);
  await push(186,1.6);await swing(FRONT_STOP,.42);await swing(FRONT_STOP-3,.08,E.out);await swing(FRONT_STOP,.1,E.out);
  await wait(.3);toast('Motor pushes it back over the top',1500);
  let t=S.hammer+DOGC;while(t>S.dog)t-=360;await dogTo(t,.9);
  const hit=hitAngle(9.5,false);
  await push(174,1.4);await swing(hit,.42);
  impact(headContact(false),60,1.4);squash();
  const z0=enemy.position.z;tw(.3,u=>{enemy.position.z=z0-3*u;},E.out);
  await swing(hit+5,.14,E.out);await swing(hit,.2,E.in);toast('SMASH',900);
  await wait(.6);enemy.visible=false;await swing(REST,.3);
  let d=REST-DOGC;while(d<S.dog)d+=360;await dogTo(d,.9);
}
async function seqCombo(){
  resetScene();placeEnemy(0,3.5,62);toast('Combo',900);
  await wait(.4);
  await tw(1.4,u=>driveTo(lerp(0,30,u)),E.sine);
  await flipMove();
  impact(new THREE.Vector3(0,.5,enemy.position.z),40,1);squash();toast('FLIPPED',1000);
  await shovelDown(.35);
  const ex=enemy.position.z,targetZ=ex-27,z0=S.z;
  await tw(1.3,u=>{driveTo(lerp(z0,targetZ,u));enemy.position.y=lerp(3.5,6.2,u);enemy.rotation.x=Math.PI-rad(5)*u;},E.sine);
  await wait(.3);await frontStrike(9.2);toast('K.O.',1800);await rearmToRear();
}
const SEQ={flip:seqFlip,front:seqFront,rear:seqRear,combo:seqCombo,reset:async()=>{resetScene();}};

// ============================================================ clash check (sweeps every moving part)
// Surface points of one part are tested against the solid of every other rigid group.
// A hit counts only if the point is at least 0.06 cm inside (touching faces are OK).
const ALLOW=new Set(['48T #25 sprocket (free on bush)|#25 roller chain, 56 links','12T #25 sprocket (print PA, hex hub)|#25 roller chain, 56 links']);
function prep(m){
  const g=m.geometry;if(g.userData.T)return g.userData;
  const pos=g.attributes.position,idx=g.index,n=idx?idx.count:pos.count,T=new Float32Array(n*3);
  for(let i=0;i<n;i++){const k=idx?idx.getX(i):i;T[i*3]=pos.getX(k);T[i*3+1]=pos.getY(k);T[i*3+2]=pos.getZ(k);}
  let area=0;const A=[];for(let t=0;t<n;t+=3){const ax=T[t*3],ay=T[t*3+1],az=T[t*3+2],bx=T[t*3+3]-ax,by=T[t*3+4]-ay,bz=T[t*3+5]-az,cx=T[t*3+6]-ax,cy=T[t*3+7]-ay,cz=T[t*3+8]-az;
    const a=.5*Math.hypot(by*cz-bz*cy,bz*cx-bx*cz,bx*cy-by*cx);A.push(a);area+=a;}
  const sp=Math.max(.22,Math.sqrt(area/2500)),Sm=[];
  for(let t=0,j=0;t<n;t+=3,j++){const cnt=Math.max(1,Math.round(A[j]/(sp*sp)));
    for(let c=0;c<cnt;c++){let u=Math.random(),v=Math.random();if(u+v>1){u=1-u;v=1-v;}
      for(let d=0;d<3;d++)Sm.push(T[t*3+d]+(T[t*3+3+d]-T[t*3+d])*u+(T[t*3+6+d]-T[t*3+d])*v);}}
  g.computeBoundingBox();g.userData.T=T;g.userData.S=new Float32Array(Sm);return g.userData;
}
function insideGeo(g,x,y,z){
  const bb=g.boundingBox;if(x<bb.min.x||x>bb.max.x||y<bb.min.y||y>bb.max.y||z<bb.min.z||z>bb.max.z)return false;
  const T=g.userData.T,dx=1,dy=.000123,dz=.000237;let hits=0;
  for(let t=0;t<T.length;t+=9){
    const e1x=T[t+3]-T[t],e1y=T[t+4]-T[t+1],e1z=T[t+5]-T[t+2],e2x=T[t+6]-T[t],e2y=T[t+7]-T[t+1],e2z=T[t+8]-T[t+2];
    const px=dy*e2z-dz*e2y,py=dz*e2x-dx*e2z,pz=dx*e2y-dy*e2x,det=e1x*px+e1y*py+e1z*pz;if(Math.abs(det)<1e-12)continue;
    const inv=1/det,sx=x-T[t],sy=y-T[t+1],sz=z-T[t+2],u=(sx*px+sy*py+sz*pz)*inv;if(u<0||u>1)continue;
    const qx=sy*e1z-sz*e1y,qy=sz*e1x-sx*e1z,qz=sx*e1y-sy*e1x,v=(dx*qx+dy*qy+dz*qz)*inv;if(v<0||u+v>1)continue;
    if((e2x*qx+e2y*qy+e2z*qz)*inv>0)hits++;}
  return hits%2===1;
}
const TOL=.06;
function deepInside(g,x,y,z){if(!insideGeo(g,x,y,z))return false;
  for(const [a,b,c] of[[TOL,0,0],[-TOL,0,0],[0,TOL,0],[0,-TOL,0],[0,0,TOL],[0,0,-TOL]])if(!insideGeo(g,x+a,y+b,z+c))return false;return true;}
function clashMeshes(){const L=[];robot.traverse(o=>{if(o.isMesh&&o.userData&&o.userData.part&&!o.userData.noClash){
  let v=true,p=o;while(p){if(p.visible===false)v=false;p=p.parent;}if(v&&o!==envelope)L.push(o);}});return L;}
function clashState(found,label,staticToo){
  robot.updateMatrixWorld(true);
  const L=clashMeshes(),inv=new THREE.Matrix4(),v=new THREE.Vector3();
  const bbs=L.map(m=>{prep(m);return new THREE.Box3().setFromObject(m).expandByScalar(-.03);});
  for(let i=0;i<L.length;i++)for(let j=0;j<L.length;j++){
    const a=L[i],b=L[j];if(i===j)continue;const ga=a.userData.grp,gb=b.userData.grp;
    if(ga===gb&&!(staticToo&&ga==='chassis'))continue;if(ga===gb&&a.userData.part===b.userData.part)continue;
    if(ga==='chassis'&&gb==='chassis'&&!staticToo)continue;
    const key=a.userData.part+'|'+b.userData.part,rkey=b.userData.part+'|'+a.userData.part;
    if(ALLOW.has(key)||ALLOW.has(rkey))continue;
    if(!bbs[i].intersectsBox(bbs[j]))continue;
    const S_=a.geometry.userData.S;inv.copy(b.matrixWorld).invert();let cnt=0,ex=null;
    for(let k=0;k<S_.length;k+=3){v.set(S_[k],S_[k+1],S_[k+2]).applyMatrix4(a.matrixWorld);
      const w=v.clone().applyMatrix4(inv);if(deepInside(b.geometry,w.x,w.y,w.z)){cnt++;if(!ex)ex=v.clone();if(cnt>3)break;}}
    if(cnt){const k2=[key,rkey].sort()[0];const f=found[k2]||(found[k2]={a:a.userData.part,b:b.userData.part,ga,gb,states:[],ex});f.states.push(label);}
  }
}
async function clashCheck(progress){
  const found={},save={...S};const steps=[];
  steps.push(()=>{Object.assign(S,{shovel:0,crank:0,hammer:REST,dog:REST-DOGC});apply();clashState(found,'static (rest)',true);});
  for(let k=0;k<360;k+=6)steps.push(()=>{S.crank=k;S.hammer=REST;S.dog=REST-DOGC;apply();clashState(found,'crank '+k+'° (blade '+S.shovel.toFixed(0)+'°)');});
  for(let h=REST;h<=FRONT_STOP;h+=3)steps.push(()=>{S.crank=0;S.shovel=0;S.hammer=h;S.dog=h-DOGC;apply();clashState(found,'hammer '+h+'°');});
  steps.push(()=>{S.hammer=FRONT_STOP;S.dog=FRONT_STOP-DOGC;apply();clashState(found,'hammer '+FRONT_STOP+'° (front stop)');});
  for(const h of[REST,120,160,200,FRONT_ZONE])steps.push(()=>{S.crank=KMAX;S.hammer=h;S.dog=h-DOGC;apply();clashState(found,'shovel up + hammer '+h+'°');});
  for(let d=0;d<360;d+=15)steps.push(()=>{S.crank=0;S.shovel=0;S.hammer=REST;S.dog=REST-DOGC-d;if(Math.abs(((S.dog-S.hammer)%360+360)%360-180)<180-DOGC-1){apply();clashState(found,'dog free '+d+'°');}});
  for(let i=0;i<steps.length;i++){steps[i]();if(progress)await progress(i+1,steps.length);}
  Object.assign(S,save);apply();
  return Object.values(found);
}
// first hammer angle (>220°) that touches the shovel parts with the shovel down
async function frontLimit(){
  const save={...S},found={};let lim=null;
  for(let h=250;h<=310&&lim===null;h+=1){S.crank=0;S.shovel=0;S.hammer=h;S.dog=h-DOGC;apply();const f={};clashState(f,'h');
    const hh=Object.values(f).filter(x=>(x.ga==='hammer'||x.gb==='hammer')&&!/stop/i.test(x.a+x.b));if(hh.length)lim={h,parts:hh.map(x=>x.ga==='hammer'?x.b:x.a)};}
  Object.assign(S,save);apply();return lim;
}

// ============================================================ shovel print list (sizes measured from the model)
const f1=v=>(v*10).toFixed(1).replace(/\.0$/,''), f0=v=>(v*10).toFixed(0);
const LUG_TXT=`rib lug Ø3.2 hole at ${f0(LUG_RHO)} mm from the axle, ${LUG_REL.toFixed(1)}° above the blade line`;
const PRINT_PARTS=[
  {id:'P1',name:'Blade',qty:1,
   parts:['Shovel blade (PETG / PA-CF print)','Blade side wall','Blade hinge knuckle (on axle)','Blade rib with lug (print)'],
   what:'The flat scoop that slides under the other robot. The 2 fins on top (the "ribs") are printed with it – the rods pull on them.',
   holes:()=>['4 hinge rings with an 8.4 mm hole for the steel axle',`one 3.2 mm hole in each fin for the rod bolt (${f0(LUG_RHO)} mm from the axle)`],
   mat:'PLA+',infill:'40 % (100 % at the hinge rings)'},
  {id:'P2',name:'Side plate',qty:2,side:true,parts:['Cheek plate (print)'],
   what:'Holds the steel axle of the blade. One inside the left box wall, one inside the right.',
   holes:()=>['8.2 mm hole for the axle','2 holes 4.3 mm for M4 bolts through the box wall'],mat:'PLA+',infill:'100 %'},
  {id:'P3',name:'Front plate',qty:1,parts:['Front extension plate (print)'],
   what:'Flat plate screwed on top of the front of the base plate. The 2 motor brackets stand on it.',
   holes:()=>['4 holes 3.2 mm to screw it to the base','4 holes 3.2 mm for the bracket feet','1 slot at the front for the cranks and rods'],mat:'PLA+',infill:'100 %'},
  {id:'P4',name:'Motor bracket',qty:2,side:true,parts:['Shovel motor bracket (print)'],
   what:'Holds one shovel motor. The motor screws onto the upright wall, the foot screws onto the front plate.',
   holes:()=>["8 mm hole for the motor's round nose",'2 holes 3.2 mm for the motor screws (17 mm apart)','2 holes 3.2 mm in the foot'],mat:'PLA+',infill:'100 %'},
  {id:'P5',name:'Crank',qty:2,side:true,parts:['Crank arm 37.5 mm (10 mm print, hex socket)'],
   what:'The arm the motor turns. It sits on the brass coupler.',
   holes:()=>['12 mm hexagon hole for the coupler, 7 mm deep','round pocket 9.5 mm × 3 mm deep so the M4 screw head sits flush',`3.2 mm hole for the rod bolt, ${f1(CR_R)} mm from the centre`],mat:'PLA+',infill:'100 %'},
  {id:'P6',name:'Rod',qty:2,side:true,parts:['Connecting rod 5.5 cm (5 mm print / 3 mm alu)'],
   what:'Connects the crank to the fin on the blade. When the crank turns, it pulls the blade up.',
   holes:()=>[`2 holes 3.2 mm, ${f0(ROD_L)} mm apart`],mat:'PLA+',infill:'100 %'},
];
// what is still to be measured: what to highlight + yellow measuring arrows in the model (robot coordinates, cm)
const HXR=PLATE_X0-.05-CPL.len;   // right shovel coupler: hex from HXR to HXR+0.7
const MEAS=[
  {id:'M1',short:'printer height',q:'Your printer: the maximum print height (Z). Bed 260 × 260 and PLA+ are known',now:'260 × 260 × 250 (Z not measured), PLA+',
   why:'The blade is the biggest part – if it does not fit, I split it in 2 halves.',show:()=>PRINT_PARTS[0].parts,
   dims:()=>[[[-BLADE_HW,.6,H.z+13.4],[BLADE_HW,.6,H.z+13.4],`blade width ${f0(2*BLADE_HW)} mm`]],dir:[.4,.9,.8]},
  {id:'M2',short:'hex depth in wheel',q:'Wheel: how deep the 12 mm hexagon seat is inside the hub, from the inner face of the wheel',now:`${f1(W_OUT+.05+CPL.len-CPL.hexL-(WHEEL_X-CFG.wheelW/2))} mm`,
   why:'Sets how far the coupler goes into the wheel and the length of the M4 wheel screw.',show:()=>['Wheel Ø86 × 39',{p:'Hex coupler 18 mm (12 mm hex)',g:'chassis'}],
   dims:()=>[[[WHEEL_X-CFG.wheelW/2,motorY+1.4,CFG.wheelZ],[W_OUT+.05+CPL.len-CPL.hexL,motorY+1.4,CFG.wheelZ],`hex seat ${f1(W_OUT+.05+CPL.len-CPL.hexL-(WHEEL_X-CFG.wheelW/2))} mm ?`]],dir:[.3,.5,1]},
  {id:'M3',short:'coupler thread',q:'Brass coupler: the screw thread in the hexagon end – M3 or M4?',now:'M4',
   why:'Sets the screw that holds the wheel, the crank and the sprocket on the coupler.',show:()=>[{p:'Hex coupler 18 mm (12 mm hex)',g:'outR'},{p:'Hex coupler 18 mm (12 mm hex)',g:'outL'}],
   dims:()=>[],dir:[.6,.6,.7]},
  {id:'M4',short:'pin bolts',q:'What you can buy for the 2 crank pins and the rod-to-blade pin: M3 shoulder bolts, or plain M3 bolts? (axle: Ø8 smooth rod ✔, M8 threaded rod + nuts as backup)',now:'M3 shoulder bolts',
   why:'Sets the hole sizes in the crank, the rods and the blade fins.',show:()=>['Crank pin*','Lug pin*'],
   dims:()=>[],dir:[.4,.6,1]},
  {id:'M5',short:'test print',q:'Test print: print one hexagon hole, one 8 mm hole and one 3 mm hole and tell me how they fit',now:'holes 0.2 mm bigger than the part',
   why:'Every hole in every part uses this.',show:()=>['Crank arm*','Connecting rod*','Blade hinge knuckle (on axle)'],
   dims:()=>[],dir:[.6,.6,.8]},
];
function printRows(){
  robot.updateMatrixWorld(true);
  const inv=new THREE.Matrix4(),rel=new THREE.Matrix4(),v=new THREE.Vector3();
  return PRINT_PARTS.map(pp=>{
    let ms=[];robot.traverse(o=>{if(o.isMesh&&pp.parts.includes(o.userData.part))ms.push(o);});
    if(pp.side)ms=ms.filter(m=>m.position.x>0);
    if(!ms.length)return {pp,dims:null};
    const root=ms.length===1?ms[0]:ms[0].parent;          // single mesh: measure in its own frame
    inv.copy(root.matrixWorld).invert();
    const bb=new THREE.Box3();
    for(const m of ms){rel.multiplyMatrices(inv,m.matrixWorld);const pa=m.geometry.attributes.position;
      for(let i=0;i<pa.count;i++){v.fromBufferAttribute(pa,i).applyMatrix4(rel);bb.expandByPoint(v);}}
    const sz=bb.getSize(new THREE.Vector3());
    return {pp,dims:[sz.x,sz.y,sz.z].map(d=>d*10).sort((a,b)=>b-a)};
  });
}
function fitsBed(d,bed){const P=[[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]];return P.some(p=>d[0]<=bed[p[0]]&&d[1]<=bed[p[1]]&&d[2]<=bed[p[2]]);}

// ============================================================ UI (skipped when headless)
const sS=document.getElementById('sShovel'),sH=document.getElementById('sHammer'),sE=document.getElementById('sExp');
function syncSliders(){if(!sS)return;sS.value=S.crank;sH.value=S.hammer;}
const labelsEl=document.createElement('div');view.appendChild(labelsEl);
let LABELS=[];const DYN=[];
if(!HEADLESS){
  document.querySelectorAll('[data-seq]').forEach(b=>b.onclick=()=>SEQ[b.dataset.seq]());
  sS.max=360;sH.min=REST;sH.max=FRONT_STOP;
  sS.oninput=()=>{cancelSeq();let v=+sS.value;interlockMsg='';
    const lift=bladeFor(v);
    if(S.hammer>FRONT_ZONE&&lift>SHOVEL_SAFE){v=S.crank;interlockMsg='hammer is in the front zone – shovel blocked above 40°';}
    S.crank=v;sS.value=v;apply();};
  sH.oninput=()=>{cancelSeq();let v=+sH.value;interlockMsg='';
    if(S.shovel>SHOVEL_SAFE&&v>FRONT_ZONE){v=FRONT_ZONE;interlockMsg='shovel is raised – hammer blocked from the front zone';}
    const d=v-S.hammer;S.hammer=v;S.dog+=d;sH.value=v;apply();};

  // explode view
  const expParts=[
    {o:deckG,d:[0,12,0]},{o:hammerRot,d:[0,30,0]},{o:hammerFixed,d:[0,20,0]},
    {o:shovelPivot,d:[0,0,18]},{o:shovelFixed,d:[0,4,9]},{o:elec,d:[0,5,0]},
    ...outs.map(o=>({o:o.g,d:[o.s*6,0,0]})),{o:dogG,d:[5,0,0]},{o:mspG,d:[5,0,0]},
    ...wheels.map(w=>({o:w,d:[Math.sign(w.position.x)*12,0,0]}))
  ];
  expParts.forEach(p=>p.b=p.o.position.clone());
  sE.oninput=()=>{const k=sE.value/100;expParts.forEach(p=>p.o.position.set(p.b.x+p.d[0]*k,p.b.y+p.d[1]*k,p.b.z+p.d[2]*k));
    chainLinks.forEach(c=>c.visible=k===0);rods.forEach(r=>r.m.visible=k===0);bands.forEach(b=>b.m.visible=k===0);apply();};

  const tgl=(id,fn)=>{const b=document.getElementById(id);if(!b)return;b.onclick=()=>{b.classList.toggle('on');fn(b.classList.contains('on'));};};
  tgl('tEnv',v=>envelope.visible=v);tgl('tFoot',v=>footprint.visible=v);
  tgl('tXray',v=>{for(const m of[M.frame,M.deck,M.white,M.ply]){m.transparent=v;m.opacity=v?.18:1;m.depthWrite=!v;m.needsUpdate=true;}});
  tgl('tHam',v=>{hammerFixed.visible=v;hammerRot.visible=v;bands.forEach(b=>b.m.visible=v);});
  tgl('tLbl',v=>labelsEl.style.display=v?'block':'none');
  const VIEWS={iso:[[64,46,76],[0,9,0]],top:[[0,135,.1],[0,0,0]],side:[[120,22,0],[0,12,0]],front:[[0,26,118],[0,10,0]],rear:[[0,26,-118],[0,10,0]],
    shovel:[[34,22,44],[0,5,11]],hammer:[[36,34,-10],[3,14,-2]],drive:[[42,8,22],[6,4,5]]};
  document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{
    const [p,t]=VIEWS[b.dataset.view];const p0=camera.position.clone(),t0=controls.target.clone();
    tw(.8,u=>{camera.position.set(lerp(p0.x,p[0],u),lerp(p0.y,p[1],u),lerp(p0.z,p[2],u));controls.target.set(lerp(t0.x,t[0],u),lerp(t0.y,t[1],u),lerp(t0.z,t[2],u));},E.sine,'cam');});

  // labels
  const L=[
    ['1','Shovel blade',anchor(bladeG,0,3,8)],
    ['2','Dead axle Ø8 + knuckles',anchor(shovelFixed,BLADE_HW+.8,H.y+.9,H.z)],
    ['3','Crank 37.5 + rod 55 mm',anchor(outs[0].g,-1.8,1.5,2)],
    ['4','2× GA25 170 rpm on L-brackets',anchor(shovelFixed,-6.6,SM.y+1.4,SM.z)],
    ['5','Hex coupler 18 mm (12 mm hex)',anchor(outs[1].g,2.7,1.0,0)],
    ['6','Printed cheek plates → side panels (M4)',anchor(shovelFixed,-CHEEK_X,5.4,9)],
    ['7','Hammer arm 2× ply',anchor(hammerRot,0,-11,-1.6)],
    ['8','Hammer head + TPU pads',anchor(head,0,4.8,0)],
    ['9','Uprights + 6000 bearings',anchor(hammerFixed,-2.9,HP.y+2.2,HP.z)],
    ['10','GA25 + #25 chain 12T→48T',anchor(hammerFixed,9.5,MOT.y+1.4,MOT.z)],
    ['11','Dog clutch (free sprocket)',anchor(dogG,4.4,2.2,0)],
    ['12','Over-centre bands',anchor(hammerFixed,-5.2,DECK_TOP+2,HP.z)],
    ['13','Stop posts (TPU)',anchor(hammerFixed,0,FRONT_STOP_P[1]+.5,FRONT_STOP_P[0])],
    ['14','Drive: GA25 in panel pocket + hex coupler',anchor(robot,W_OUT+.2,motorY+2.6,CFG.wheelZ+2.3)],
  ];
  LABELS=L.map(([n,t,a])=>{const d=document.createElement('div');d.className='lbl';d.innerHTML=`<i>${n}</i><span>${t}</span>`;labelsEl.appendChild(d);return{d,a};});

  document.querySelectorAll('#tabs button').forEach(b=>b.onclick=()=>{
    document.querySelectorAll('#tabs button').forEach(x=>x.classList.toggle('on',x===b));
    document.querySelectorAll('.pg').forEach(p=>p.classList.toggle('on',p.id===b.dataset.pg));
  });

  // URL options, e.g. metal_monster.html#view=shovel&xray=1&hammer=180&shovel=40&exp=60&lbl=0
  const Q=Object.fromEntries(location.hash.slice(1).split('&').filter(Boolean).map(kv=>kv.split('=')));
  if(Q.view&&VIEWS[Q.view]){camera.position.set(...VIEWS[Q.view][0]);controls.target.set(...VIEWS[Q.view][1]);}
  if(Q.xray==='1')document.getElementById('tXray').click();
  if(Q.lbl==='0')document.getElementById('tLbl').click();
  if(Q.env==='0')document.getElementById('tEnv').click();
  if(Q.hammer){const v=+Q.hammer;S.dog+=v-S.hammer;S.hammer=v;}
  if(Q.shovel)S.crank=+Q.shovel;
  if(Q.exp){sE.value=Q.exp;sE.oninput();}
  syncSliders();
  if(Q.tab){const t=document.querySelector(`#tabs button[data-pg="${Q.tab}"]`);if(t)t.click();}
  if(Q.instant==='1')window.__instantCam=true;
  if(Q.mark){setTimeout(()=>{const r=[...document.querySelectorAll('.pickrow')].find(r=>r.querySelector('.pnum,.mnum').textContent===Q.mark);if(r){r.click();r.scrollIntoView({block:'nearest'});}},400);}
  if(Q.check==='1')setTimeout(()=>document.getElementById('runClash').click(),300);

  // ---- highlight a part / show a measurement in the 3D view
  const M_HI=new THREE.MeshStandardMaterial({color:0xff8a1a,emissive:0xff5a00,emissiveIntensity:.5,roughness:.5});
  const M_GHOST=new THREE.MeshStandardMaterial({color:0x7d8a99,transparent:true,opacity:.1,depthWrite:false});
  const dimG=new THREE.Group();robot.add(dimG);
  const lineMat=new THREE.LineBasicMaterial({color:0xffd23f,depthTest:false}),arrMat=new THREE.MeshBasicMaterial({color:0xffd23f,depthTest:false});
  const match=(o,n)=>typeof n==='string'?(n.endsWith('*')?o.userData.part.startsWith(n.slice(0,-1)):o.userData.part===n):(o.userData.part===n.p&&o.userData.grp===n.g);
  function clearHi(){
    robot.traverse(o=>{if(o.isMesh&&o.userData.mat0){o.material=o.userData.mat0;delete o.userData.mat0;}});
    dimG.clear();DYN.forEach(d=>d.d.remove());DYN.length=0;LABELS.forEach(l=>l.d.style.display='');
    document.querySelectorAll('.pickrow').forEach(r=>r.classList.remove('sel'));
  }
  function dimLine(a,b,text,off){
    const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),len=A.distanceTo(B);
    const l=new THREE.Mesh(new THREE.CylinderGeometry(.07,.07,Math.max(len-.5,.01),8),arrMat);l.renderOrder=999;
    l.position.copy(A).add(B).multiplyScalar(.5);l.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),B.clone().sub(A).normalize());dimG.add(l);
    for(const [P,Q] of[[A,B],[B,A]]){const c=new THREE.Mesh(new THREE.ConeGeometry(.18,.5,12),arrMat);c.renderOrder=999;
      c.position.copy(P).add(Q.clone().sub(P).normalize().multiplyScalar(.25));c.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),P.clone().sub(Q).normalize());dimG.add(c);}
    addMarker(A.clone().add(B).multiplyScalar(.5).add(new THREE.Vector3(...(off||[0,0,0]))),'',text,true);
  }
  function addMarker(pos,num,text,isDim){
    const o=new THREE.Object3D();o.position.copy(pos);dimG.add(o);
    const d=document.createElement('div');d.className='lbl'+(isDim?' dimlbl':'');d.innerHTML=(num?`<i>${num}</i>`:'')+`<span>${text}</span>`;labelsEl.appendChild(d);DYN.push({d,a:o});
  }
  function highlight(names,opt={}){
    clearHi();const hit=[];
    robot.traverse(o=>{if(!o.isMesh||o.userData.part===undefined||o.userData.part==='')return;
      o.userData.mat0=o.material;if(names.some(n=>match(o,n))){o.material=M_HI;hit.push(o);}else o.material=M_GHOST;});
    LABELS.forEach(l=>l.d.style.display='none');
    robot.updateMatrixWorld(true);
    const box=new THREE.Box3();hit.forEach(m=>box.expandByObject(m));
    (opt.dims||[]).forEach(([a,b,t,off])=>{dimLine(a,b,t,off);box.expandByPoint(robot.localToWorld(new THREE.Vector3(...a)));box.expandByPoint(robot.localToWorld(new THREE.Vector3(...b)));});
    if(opt.num&&hit.length){const c=box.getCenter(new THREE.Vector3());addMarker(robot.worldToLocal(c.clone()).add(new THREE.Vector3(0,box.getSize(new THREE.Vector3()).y/2+.8,0)),opt.num,opt.title);}
    if(!box.isEmpty()){const c=box.getCenter(new THREE.Vector3()),r=box.getSize(new THREE.Vector3()).length();
      const dir=opt.dir?new THREE.Vector3(...opt.dir).normalize():camera.position.clone().sub(controls.target).normalize();
      const pTo=c.clone().add(dir.multiplyScalar(Math.max(20,r*1.6))),p0=camera.position.clone(),t0=controls.target.clone();
      if(window.__instantCam){camera.position.copy(pTo);controls.target.copy(c);}
      else tw(.7,u=>{camera.position.lerpVectors(p0,pTo,u);controls.target.lerpVectors(t0,c,u);},E.sine,'cam');}
  }
  // ---- print parts tab
  const pl=document.getElementById('printList'),ml=document.getElementById('measList');
  if(pl){
    const ids=['bedX','bedY','bedZ'],inp=ids.map(i=>document.getElementById(i));
    try{const sv=JSON.parse(localStorage.getItem('mmBed')||'null');if(sv)inp.forEach((e,i)=>e.value=sv[i]);}catch(e){}
    const draw=()=>{const bed=inp.map(e=>+e.value||0);try{localStorage.setItem('mmBed',JSON.stringify(bed));}catch(e){}
      let h='';
      printRows().forEach((r,i)=>{const d=r.dims,ok=d&&fitsBed(d,bed),pp=r.pp;
        h+=`<div class="pickrow" data-i="${i}"><div class="prh"><i class="pnum">${pp.id}</i><b>${pp.name}</b><span class="pq">× ${pp.qty}</span><span class="psz">${d?d.map(x=>x.toFixed(0)).join(' × ')+' mm':''}</span><span class="${ok?'ok':'bad'}">${ok?'✔ fits':'✖ too big – split'}</span></div>
          <div class="pw">${pp.what}</div><ul>${pp.holes().map(x=>`<li>${x}</li>`).join('')}</ul><div class="pm">Plastic: ${pp.mat} · Fill: ${pp.infill}</div></div>`;});
      pl.innerHTML=h;
      pl.querySelectorAll('.pickrow').forEach(row=>row.onclick=()=>{const pp=PRINT_PARTS[+row.dataset.i];const was=row.classList.contains('sel');clearHi();if(was)return;
        highlight(pp.parts,{num:pp.id,title:pp.name+' × '+pp.qty});row.classList.add('sel');});};
    inp.forEach(e=>e.oninput=draw);draw();
  }
  if(ml){
    ml.innerHTML=MEAS.map((m,i)=>`<div class="pickrow meas" data-i="${i}"><div class="prh"><i class="mnum">${m.id}</i><b>${m.q}</b></div>
      <div class="pw">I use now: <b>${m.now}</b> – ${m.why}</div><button class="showbtn">Show in 3D</button></div>`).join('');
    ml.querySelectorAll('.pickrow').forEach(row=>row.onclick=()=>{const m=MEAS[+row.dataset.i];const was=row.classList.contains('sel');clearHi();if(was)return;
      highlight(m.show(),{dims:m.dims(),dir:m.dir,num:m.id,title:m.short});row.classList.add('sel');});
  }
  const clr=document.getElementById('clearHi');if(clr)clr.onclick=()=>{clearHi();const v=VIEWS.iso;const p0=camera.position.clone(),t0=controls.target.clone();
    tw(.7,u=>{camera.position.lerpVectors(p0,new THREE.Vector3(...v[0]),u);controls.target.lerpVectors(t0,new THREE.Vector3(...v[1]),u);},E.sine,'cam');};
  document.querySelectorAll('#tabs button').forEach(b=>b.addEventListener('click',()=>clearHi()));

  // clash check button
  const cb=document.getElementById('runClash'),co=document.getElementById('clashOut');
  if(cb)cb.onclick=async()=>{cancelSeq();cb.disabled=true;
    const res=await clashCheck(async(i,n)=>{co.textContent=`Checking… ${i}/${n} poses`;await new Promise(r=>setTimeout(r,0));});
    const lim=await frontLimit();
    let h='';
    if(!res.length)h+=`<p class="ok">✔ No clashes in 60 crank + ${Math.floor((FRONT_STOP-REST)/3)+1} hammer + interlock + dog poses.</p>`;
    else{h+=`<p class="bad">✖ ${res.length} clash(es):</p><table><tr><th>Part</th><th>hits</th><th>where</th></tr>`;
      res.forEach(r=>{h+=`<tr><td>${r.a}<br>↔ ${r.b}</td><td>${r.states.length}</td><td>${r.states.slice(0,3).join(', ')}${r.states.length>3?' …':''}</td></tr>`;});h+='</table>';}
    h+=lim?`<p>Without the front stop the hammer would first touch <b>${[...new Set(lim.parts)].join(', ')}</b> at <b>${lim.h}°</b>. The stop is at <b>${FRONT_STOP}°</b> (margin ${lim.h-FRONT_STOP}°).</p>`:`<p>Hammer clears the shovel parts up to 310°.</p>`;
    co.innerHTML=h;cb.disabled=false;co.scrollIntoView({block:'end'});};
}
const tv=new THREE.Vector3();
function updateLabels(W,Hh){
  for(const l of LABELS.concat(DYN)){l.a.getWorldPosition(tv);tv.project(camera);
    if(tv.z>1||tv.z<-1){l.d.style.visibility='hidden';continue;}
    l.d.style.visibility='visible';l.d.style.transform=`translate(${(tv.x*.5+.5)*W+8}px,${(-tv.y*.5+.5)*Hh-10}px)`;}
}

// ============================================================ loop
function resize(){const W=view.clientWidth,Hh=view.clientHeight;renderer.setSize(W,Hh,false);camera.aspect=W/Hh;camera.updateProjectionMatrix();}
apply();
if(!HEADLESS){
  new ResizeObserver(resize).observe(view);resize();
  const clock=new THREE.Clock();
  (function loop(){
    requestAnimationFrame(loop);
    const dt=Math.min(clock.getDelta(),.05);
    stepTweens(dt);stepFx(dt);controls.update();
    const off=new THREE.Vector3((Math.random()-.5),(Math.random()-.5),(Math.random()-.5)).multiplyScalar(shake*2.2);
    camera.position.add(off);renderer.render(scene,camera);camera.position.sub(off);
    updateLabels(view.clientWidth,view.clientHeight);
  })();
}
