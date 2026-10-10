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
function plateGeo(pts,t,holes=[]){const o=pts.map(p=>V2d(p[0],-p[1]));if(THREE.ShapeUtils.isClockWise(o))o.reverse();   // outline must be CCW or the hole walls come out inside-out
  const s=new THREE.Shape(o);holes.forEach(h=>s.holes.push(h));
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
const BLADE_HW=12.75;                     // 255 mm blade (5 mm under the 260 mm printer bed); no side walls, so wider robots still slide on
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
const FOOT_X=4.75,FOOT_DZ=[-.6,.3];                                            // motor bracket foot -> front plate (+ base plate)
const FOOT_X1=5.3, EXT_HW=5.4;            // foot outer edge (15 mm foot: the holes clear the 4 mm gusset by 3 mm), front plate half width
const FOOT_BOLTS=[-1,1].flatMap(s=>FOOT_DZ.map(dz=>[s*FOOT_X,SM.z+dz]));
const CHEEK_BOLTS=[[8.4,FLOOR_TOP+.7],[8.4,4.7]];                             // cheek -> side wall (z,y), M4
const ph=(x,z,r)=>circlePath(x,-z,r);                                          // hole in a plateGeo plate at (x,z)   // shovel motor end; past W_IN it goes through a notch in the side wall
const HP={y:DECK_TOP+5.8,z:-1.5};         // hammer pivot, 5.8 cm above the lid
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
let lidMeshes=[];
function buildLid(){
  lidMeshes.forEach(m=>deckG.remove(m));const n0=deckG.children.length;
  const HOLES=LID_HOLES.concat(typeof DRIVE_HOLES!=='undefined'?DRIVE_HOLES:[]);
  const cz=(LID_Z0+LID_Z1)/2;
  P('Kit lid (red)','chassis');mesh(roundRectGeo(CFG.lidW,CFG.lidLen,CFG.lidT,1.4,LID_NOTCH&&{w:LID_NOTCH.w,d:LID_Z1-LID_NOTCH.z},HOLES.map(([x,z,r])=>circlePath(x,cz-z,r))),M.deck,deckG,0,DECK_Y,cz);
  const z0=LID_Z0+CFG.wallT+.05,zf=LID_Z1-.3,xw=W_IN-.1,nw=LID_NOTCH&&LID_NOTCH.w/2,pts=[[-xw,z0],[xw,z0],[xw,zf]];
  if(LID_NOTCH)pts.push([nw,zf],[nw,LID_NOTCH.z],[-nw,LID_NOTCH.z],[-nw,zf]);
  pts.push([-xw,zf]);
  const inDoubler=([x,z,r])=>Math.abs(x)+r<xw&&z-r>z0&&z+r<zf&&!(LID_NOTCH&&Math.abs(x)<nw+r&&z+r>LID_NOTCH.z);
  P('Lid doubler 4 mm ply');mesh(plateGeo(pts,.4,HOLES.filter(inDoubler).map(([x,z,r])=>ph(x,z,r))),M.ply,deckG,0,DECK_Y-.4,0);
  lidMeshes=deckG.children.slice(n0);
}
P('Lid');for(const sx of[-WALL_X,WALL_X])for(const sz of[-9.6,-5.6,3.8]){bolt(deckG,[sx,DECK_TOP,sz],'y',-1,CFG.lidT+1.2,.3,{head:'socket'});LID_HOLES.push([sx,sz,HM3]);}
P('Kill switch');box(1.3,.8,1.8,M.rubber,deckG,-6.4,DECK_TOP+.4,-8.5);
{const sw=mesh(new THREE.CylinderGeometry(.18,.18,1,8),M.steel,deckG,-6.4,DECK_TOP+1.1,-8.5);sw.rotation.z=.35;sw.userData.noClash=true;}
box(6,.03,3,M.white,deckG,-1.5,DECK_TOP+.02,-8.2).userData.noClash=true;

// ============================================================ SHOVEL (front)
// fixed part: front extension plate, 2 cheek plates, dead axle + collars, 2 motor brackets + motors
const shovelFixed=new THREE.Group(); robot.add(shovelFixed);
P('Front extension plate (print)','chassis');
{const pts=[[-EXT_HW,7.6],[EXT_HW,7.6],[EXT_HW,11.5]];
 pts.push([2.5,11.5],[2.5,8.4],[-2.5,8.4],[-2.5,11.5]);                 // cranks + rods pass through the front (the Ø14 rod ends need it to z = 84)
 pts.push([-EXT_HW,11.5]);
 mesh(plateGeo(pts,.6,[...EXT_BOLTS,...FOOT_BOLTS].map(b=>ph(b[0],b[1],HM3))),M.petg,shovelFixed,0,FLOOR_TOP,0);
 for(const [sx,sz] of EXT_BOLTS)bolt(shovelFixed,[sx,EXT_TOP,sz],'y',-1,.6+CFG.floorT,.3,{nut:true});}
// cheek plates: bolted to the inside of the walls, carry the axle
const CHEEK_X=W_IN-.3;
{const pts=[[7.6,FLOOR_TOP],[BL2,FLOOR_TOP],[BL2,1.4],[11.9,1.4]];
 pts.push(...arcPts(H.z,H.y,1.3,208,360+115,30));
 pts.push([12.4,5.3],[7.6,5.3]);
 P('Cheek plate (print)','chassis');
 for(const s of[-1,1]){mesh(profileGeo(pts,.6,[circlePath(H.z,H.y,.41),...CHEEK_BOLTS.map(([z,y])=>circlePath(z,y,HM4))]),M.petg,shovelFixed,s*CHEEK_X,0,0);
   for(const [z,y] of CHEEK_BOLTS)bolt(shovelFixed,[s*W_OUT,y,z],'x',-s,CFG.wallT+.6,.4,{head:'csk',nut:true,washer:true});}}
P('Hinge axle Ø8 steel rod','chassis',true);cylX(.4,2*BLADE_HW,M.steel,shovelFixed,0,H.y,H.z,20);
P('Shaft collar Ø8','chassis');
for(const s of[-1,1]){for(const xc of[W_IN-.6-.4-.02,W_IN+.4+.02,BLADE_HW-.42])ringX(.8,.4,.8,M.blackOx,shovelFixed,s*xc,H.y,H.z);}   // outer collar tucked under the blade end

// motor brackets (printed L) + GA25 170 rpm, both designs use the same place
for(const s of[-1,1]){
  P('Shovel motor bracket (print)','chassis');
  const BR=1.35;   // 17 mm screw spacing: 3.3 mm of plastic above the top screw
  const pts=[[SM.z-BR,EXT_TOP],[SM.z+BR,EXT_TOP],[SM.z+BR,SM.y],...arcPts(SM.z,SM.y,BR,0,180,12),[SM.z-BR,EXT_TOP]];
  mesh(profileGeo(pts,PLATE_X1-PLATE_X0,[circlePath(SM.z,SM.y,.4),circlePath(SM.z,SM.y-.85,HM3),circlePath(SM.z,SM.y+.85,HM3)]),M.pacf,shovelFixed,s*(PLATE_X0+PLATE_X1)/2,0,0);
  {const xc=s*(PLATE_X1+FOOT_X1)/2,hw=(FOOT_X1-PLATE_X1)/2;   // foot, built around its own centre (the print list sorts parts by side)
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
  bolt(o,[s*(HX0-.3),0,0],'x',s,1.2,.4,{head:'csk',washer:false,clash:true,part:'M4×12 countersunk screw into coupler'});
  {
    P('Crank arm 37.5 mm (10 mm print, hex socket)',s<0?'outL':'outR');
    const al=Math.acos((1.1-.55)/CR_R),sh=new THREE.Shape(),pts=[];
    pts.push(...arcPts(0,0,1.1,deg(al),360-deg(al),16));pts.push(...arcPts(CR_R,0,.55,-deg(al),deg(al),10));
    sh.setFromPoints(pts.map(p=>V2d(p[0],p[1])));sh.holes.push(circlePath(CR_R,0,.16));sh.holes.push(hexPath(0,0));
    mesh(shapeGeoX(sh,CPL.hexL),M.print,o,s*HXC,0,0);
    // 3 mm end wall with a 90° countersink (Ø9 → Ø4.4): the M4 head clamps the crank onto the coupler end and stays below the face, where the rod passes
    const wall=(t,r)=>{const w=new THREE.Shape(sh.getPoints());w.holes.push(circlePath(CR_R,0,.16));w.holes.push(circlePath(0,0,r));return shapeGeoX(w,t);};
    mesh(wall(.23,.45),M.print,o,s*(HX0-.185),0,0);                            // countersink zone, 2.3 mm
    mesh(wall(.07,.22),M.print,o,s*(HX0-.035),0,0);                            // 0.7 mm floor with the Ø4.4 screw hole, against the coupler end
    {const g=new THREE.LatheGeometry([V2d(.22,0),V2d(.45,0),V2d(.45,.23),V2d(.22,0)],48);g.rotateZ(s*Math.PI/2);mesh(g,M.print,o,s*(HX0-.07),0,0);}   // the cone
    ringX(.275,.16,.1,M.print,o,s*(HX0-.35),0,CR_R);   // 1 mm Ø5.5 boss: the crank touches only the inner ring of the rod bearing
    bolt(o,[s*(HX0+CPL.hexL),0,CR_R],'x',-s,CPL.hexL+.3+.1+.4,.3,{head:'socket',nut:true,washer:true,clash:true,part:'Crank pin M3×20 + nyloc'});
    P('Magnet (home)',s<0?'outL':'outR',true);cylX(.2,.1,M.steel,o,s*(HX0+CPL.hexL+.05),0,-1.6,10);
  }
}

// blade (rotating about the dead axle)
const shovelPivot=new THREE.Group(); shovelPivot.position.set(0,H.y,H.z); robot.add(shovelPivot);
const bladeG=new THREE.Group(); bladeG.rotation.x=rad(TILT); shovelPivot.add(bladeG);
P('Shovel blade (PLA+ print)','blade');
// one PLA+ piece (rules: no metal on the attacking edge). The underside bevel still runs to the floor line;
// the lip ends in a blunt 1.5 mm nose instead of a knife edge, so it does not chip on the first hit.
mesh(profileGeo([[1.5,.3],[1.5,-.3],[10.5,-.3],[12.9,.036],[12.85,.186],[10.5,.3]],2*BLADE_HW),M.blade,bladeG);
P('Blade hinge knuckle (on axle)','blade');
const KN=[[W_IN+.9,W_IN+1.75],[BLADE_HW-1.8,BLADE_HW-.85]];
for(const s of[-1,1])for(const [a,b] of KN){ringX(.9,.42,b-a,M.bladeD,bladeG,s*(a+b)/2,0,0);
  mesh(profileGeo([[.5,-.3],[1.6,-.3],[1.6,.3],[.5,.8]],b-a),M.bladeD,bladeG,s*(a+b)/2,0,0);}
P('Grip strip','blade',true);
for(const sx of[-10,-5,5,10]) box(2,.05,8,M.rubber,bladeG,sx,.32,6.5);

let lugAnchor=null;
// connecting rods
const rods=[];
{
  // no M3 shoulder bolts in Egypt: a 623ZZ bearing (3×10×4) pressed into each rod end, plain M3 bolts clamp the inner rings
  const RB=.7,a=deg(Math.asin(.45/RB));   // Ø14 bosses (2 mm wall round the bearing), 9 mm body
  const sh=new THREE.Shape(),pts=[...arcPts(0,0,RB,a,360-a,20),...arcPts(ROD_L,0,RB,180+a,540-a,20)];
  sh.setFromPoints(pts.map(p=>V2d(p[0],p[1])));sh.holes.push(circlePath(0,0,.5));sh.holes.push(circlePath(ROD_L,0,.5));
  const geo=shapeGeoX(sh,.4);
  for(const s of[-1,1]){const g=s<0?'rodL':'rodR';P('Connecting rod 5.5 cm (4 mm print, 623ZZ bearings)',g);const m=mesh(geo,M.print,robot,s*.85,0,0);rods.push({m,s});
    P('623ZZ bearing 3×10×4',g);for(const z of[0,ROD_L])ringX(.5,.15,.4,M.steel,m,0,0,z);}
}

// ============================================================ HAMMER (top)
const hammerFixed=new THREE.Group(); robot.add(hammerFixed);
const UP_X0=2.45,UP_X1=3.35;
const RET_A=[0,1,2].map(k=>rad(90+k*120)), ANG_Z=[-4.0,1.0];   // retainer screws (r 15.5 mm), alu angle bolts: 15 mm from each end of the upright
// ---- hammer: one wooden stick + a small head that sticks out front and back (hits both ways)
// Laser cut from 10 mm plywood (woodwork/laser): the stick is a T (stick + middle of the head), cut twice and
// glued face to face -> 20 × 20; the head is completed by 1 side plate 64 × 25 glued on each side -> 64 × 25 × 40.
// The GA25 drives it directly, both ways, through a chain or a gear pair (no bands, no dog clutch).
const PLY=1.0;                                           // laser sheet thickness (10 mm)
const ARM_L=26, STICK={x:2*PLY,z:2.0}, HEAD={x:4*PLY,y:2.5,z:6.4};   // head centre 26 cm from the pivot (longest that keeps the start size ≤ 55 cm), bare wood ends 3.2 cm each side
const hammerRot=new THREE.Group(); hammerRot.position.set(0,HP.y,HP.z); robot.add(hammerRot);
P('Hammer stick 20×20 plywood (2 × 10 mm)','hammer');
{const y0=-1.0,y1=-(ARM_L+HEAD.y/2);for(const s of[-1,1])box(PLY,y0-y1,STICK.z,M.wood,hammerRot,s*PLY/2,(y0+y1)/2,0);}
for(const y of[-2.2,-3.4])bolt(hammerRot,[-1.65,y,0],'x',1,3.3,.4,{nut:true,part:'M4 bolt hub → stick'});
const head=new THREE.Group(); head.position.set(0,-ARM_L,0); hammerRot.add(head);
P('Hammer head – 10 mm plywood side plates','hammer');for(const s of[-1,1])box(PLY,HEAD.y,HEAD.z,M.wood2,head,s*(STICK.x/2+PLY/2),0,0);
P('Hammer stick 20×20 plywood (2 × 10 mm)','hammer');for(const s of[-1,1])for(const sz of[-1,1])   // the T ends of the 2 stick layers (between the plates)
  box(PLY,HEAD.y,(HEAD.z-STICK.z)/2,M.wood,head,s*PLY/2,0,sz*(STICK.z/2+(HEAD.z-STICK.z)/4));
bolt(head,[-HEAD.x/2,.5,0],'x',1,HEAD.x,.4,{nut:true,part:'M4 bolt head → stick'});
const WOOD_RHO=.7;   // g/cm³, beech / oak
const HD_STICK_G=Math.round(STICK.x*STICK.z*(ARM_L+HEAD.y/2-1)*WOOD_RHO);
const HD_HEAD_G=Math.round((HEAD.x*HEAD.y*HEAD.z-STICK.x*STICK.z*HEAD.y)*WOOD_RHO+4);   // + M4 bolt

// ---- drive options: #25 chain or printed module-2 spur gears. The motor sits on the same line from the pivot as before,
// at the centre distance the pair needs; the hammer-side sprocket / gear is clamped to the shaft (cross bolt through a hub).
const HD_OPTS=[
  {id:'direct',type:'direct',n1:1,n2:1},
  {id:'c12-12',type:'chain',n1:12,n2:12},{id:'c15-15',type:'chain',n1:15,n2:15},{id:'c12-18',type:'chain',n1:12,n2:18},
  {id:'c12-24',type:'chain',n1:12,n2:24},{id:'c15-30',type:'chain',n1:15,n2:30},{id:'c12-30',type:'chain',n1:12,n2:30},
  {id:'c12-36',type:'chain',n1:12,n2:36},{id:'c12-48',type:'chain',n1:12,n2:48},
  {id:'g20-20',type:'gear',n1:20,n2:20},{id:'g16-24',type:'gear',n1:16,n2:24},{id:'g15-30',type:'gear',n1:15,n2:30},
  {id:'g15-38',type:'gear',n1:15,n2:38},{id:'g15-45',type:'gear',n1:15,n2:45},
];
const HD_X0=4.45, GEAR_M=.2, GEAR_W=1.2, SPR_W=.28;          // inner face of the drive plane; module 2, 12 mm wide gears
const MDIR=Math.atan2(-4.2,-6.0);                               // motor direction from the pivot, (dy,dz)
const CC_MAX=(HP.y-(DECK_TOP+.3+1.25+.05))/-Math.sin(MDIR);    // further out the gearbox would sit on the bracket base
const sprOD=n=>PITCH*(.6+1/Math.tan(Math.PI/n));
function chainLen(C,r1,r2){const b=Math.asin((r1-r2)/C);return 2*Math.sqrt(C*C-(r1-r2)**2)+r1*(Math.PI+2*b)+r2*(Math.PI-2*b);}
function chainFit(n1,n2){   // even number of links, centre distance as close to 7 cm as fits
  const r1=sprR(n2),r2=sprR(n1),cMin=(sprOD(n1)+sprOD(n2))/2+.4;let best=null;
  const cMax=Math.min(CC_MAX,(HP.y-(DECK_TOP+sprOD(n1)/2+.2))/-Math.sin(MDIR));   // small sprocket + chain stay above the lid
  for(let n=20;n<=120;n+=2){let C=7;for(let i=0;i<80;i++){C+=(n*PITCH-chainLen(C,r1,r2))/2;if(C<r1-r2+.01)C=r1-r2+.01;}
    if(Math.abs(chainLen(C,r1,r2)-n*PITCH)>.01||C<cMin||C>cMax)continue;
    if(!best||Math.abs(C-7)<Math.abs(best.C-7))best={n,C};}
  return best;
}
// involute spur gear (20°), outline in (z,y); hole = THREE.Path list
function gearShape(z,m,holes){
  const r=m*z/2,ra=r+m,rf=r-1.25*m,rb=r*Math.cos(rad(20)),inv=a=>Math.tan(a)-a,half=Math.PI/(2*z)+inv(rad(20));
  const th=rr=>half-inv(Math.acos(Math.min(1,rb/Math.max(rr,rb)))),pts=[];
  for(let i=0;i<z;i++){const c=i*2*Math.PI/z,r0=Math.max(rf,rb),fl=[];
    for(let k=0;k<=6;k++)fl.push(r0+(ra-r0)*k/6);
    const P_=(rr,a)=>pts.push([rr*Math.cos(a),rr*Math.sin(a)]);
    P_(rf,c-th(rb));fl.forEach(rr=>P_(rr,c-th(rr)));fl.slice().reverse().forEach(rr=>P_(rr,c+th(rr)));P_(rf,c+th(rb));}
  const s=new THREE.Shape(pts.map(p=>V2d(p[0],p[1])));holes.forEach(h=>s.holes.push(h));return s;
}
function lightHoles(rOut){const o=[],ri=1.3,ro=rOut-.45;if(ro-ri<1.2)return o;const rc=(ri+ro)/2,rr=Math.min(.8,(ro-ri)/2-.1);
  for(let k=0;k<6;k++){const a=k*Math.PI/3+Math.PI/6;o.push(circlePath(rc*Math.cos(a),rc*Math.sin(a),rr));}return o;}
const hubBoltHoles=()=>[0,1,2].map(k=>{const a=k*2*Math.PI/3;return circlePath(.85*Math.cos(a),.85*Math.sin(a),HM3);});

// ---- "Direct on motor": the hammer hub sits on the GA25's brass hex coupler (like the shovel crank).
// One 12 mm plywood upright carries the motor in a Ø26 pocket (3 mm web left); 2 alu angles + 2 wood screws hold it to the lid.
const DIR_X0=2.65, DIR_T=1.2, DIR_WEB=.3;          // upright inner face 26.5 mm from the centre, 12 mm thick
const UP_PTS=()=>[[-5.5,DECK_TOP],[2.5,DECK_TOP],[1.5,HP.y],[1.0,HP.y+2],[-4,HP.y+2],[-4.5,HP.y]];
function buildDirect(D,g,big){
  const xf=DIR_X0,xo=DIR_X0+DIR_T,face=DIR_X0+DIR_WEB,DT=DECK_TOP;
  const angH=()=>ANG_Z.map(z=>circlePath(z,DT+1.2,HM4));
  P('Hammer motor upright 12 mm (print)','chassis');
  mesh(profileGeo(UP_PTS(),DIR_WEB,[circlePath(HP.z,HP.y,.4),circlePath(HP.z,HP.y-.85,HM3),circlePath(HP.z,HP.y+.85,HM3),...angH()]),M.wood,g,xf+DIR_WEB/2,0,0);
  mesh(profileGeo(UP_PTS(),DIR_T-DIR_WEB,[circlePath(HP.z,HP.y,1.3),...angH()]),M.wood,g,face+(DIR_T-DIR_WEB)/2,0,0);
  for(const dy of[-.85,.85])bolt(g,[xf,HP.y+dy,HP.z],'x',1,DIR_WEB+.4,.3,{head:'csk',part:'M3×8 countersunk GA25 → upright'});
  ga25(g,HP.y,HP.z,face,1,'Hammer motor');
  P('Alu angle 20×20×2','chassis');
  for(const zc of ANG_Z){const a=new THREE.Group();a.position.set(xo,DT,zc);g.add(a);
    mesh(profileGeo([[-1.2,0],[1.2,0],[1.2,2],[-1.2,2]],.2,[circlePath(0,1.2,HM4)]),M.alu,a,.1,0,0);
    mesh(plateGeo([[-1,-1.2],[1,-1.2],[1,1.2],[-1,1.2]],.2,[ph(.3,0,HM4)]),M.alu,a,1.0,0,0);
    DRIVE_HOLES.push([xo+1.3,zc,HM4]);
    bolt(a,[1.3,.2,0],'y',-1,.2+CFG.lidT+.4,.4,{nut:true,washer:true,part:'M4×20 angle → lid + doubler'});
    bolt(a,[.2,1.2,0],'x',-1,.2+DIR_T,.4,{nut:true,part:'M4×20 angle → upright'});}
  for(const z of[-4.5,1.5]){   // 10 mm from each end
   DRIVE_HOLES.push([xf+DIR_T/2,z,HM4]);   // from under the doubler up into the upright's bottom edge
    bolt(g,[xf+DIR_T/2,DECK_Y-.4,z],'y',1,.4+CFG.lidT+2.0,.4,{head:'csk',part:'M4×30 wood screw lid → upright edge'});}
  P('Hall sensor (hammer home)','chassis',true);box(.15,.4,.5,M.sensor,g,xf-.08,HP.y-2.3,HP.z);
  // hub: printed, 12.17 hex socket 8.5 deep on the motor side (coupler hex in the inner 7, sleeve in the outer 1.5), Ø8 counterbore from the other side for the M4 screw
  P('Hammer hub (print, hex socket)','hammer');hubMeshes(big,'hex');
  bolt(big,[-.1,0,0],'x',1,1.7,.4,{part:'M4×16 hub → coupler'});
  P('Hex coupler 18 mm (12 mm hex)','hammer');hexCoupler(big,face-.35,-1);
  Object.assign(D,{R:1,eta:.97,CC:0,MOT:{y:HP.y,z:HP.z},links:0,hx:.8,PL0:face,PL1:face,w:0,shaftL:0,
    hubName:'Hammer hub (print, hex socket)',uprightName:'Hammer motor upright 12 mm (print)',update:()=>{}});
}
// the chain / gear designs: 2 uprights with bearings, retainers and 4 angles each, a Ø10 shaft through both
function buildUprights2(g){
  const ret=new THREE.Shape();ret.absarc(0,0,1.8,0,Math.PI*2,false);ret.holes.push(circlePath(0,0,.8));RET_A.forEach(a=>ret.holes.push(circlePath(1.55*Math.cos(a),1.55*Math.sin(a),HM25)));
  const upHoles=[circlePath(HP.z,HP.y,1.3),...RET_A.map(a=>circlePath(HP.z+1.55*Math.cos(a),HP.y+1.55*Math.sin(a),HM25)),...ANG_Z.map(z=>circlePath(z,DECK_TOP+1.2,HM4))];
  for(const s of[-1,1]){P('Hammer upright 9 mm ply','chassis');mesh(profileGeo(UP_PTS(),UP_X1-UP_X0,upHoles),M.wood,g,s*(UP_X0+UP_X1)/2,0,0);
    P('6000-2RS bearing (10×26×8)','chassis');ringX(1.3,.5,.8,M.steel,g,s*(UP_X0+UP_X1)/2,HP.y,HP.z);
    P('Bearing retainer (print)','chassis');mesh(shapeGeoX(ret,.25),M.pacf,g,s*(UP_X1+.125),HP.y,HP.z);
    for(const a of RET_A)bolt(g,[s*(UP_X1+.25),HP.y+1.55*Math.sin(a),HP.z+1.55*Math.cos(a)],'x',-s,.8,.25,{part:'M2.5×10 retainer screw'});
    P('Alu angle 20×20×2','chassis');
    for(const zc of ANG_Z)for(const side of[-1,1]){
      const xf=side>0?UP_X1:UP_X0,out=side>0?1:-1;
      const a=new THREE.Group();a.position.set(s*xf,DECK_TOP,zc);g.add(a);
      mesh(profileGeo([[-1.2,0],[1.2,0],[1.2,2],[-1.2,2]],.2,[circlePath(0,1.2,HM4)]),M.alu,a,s*out*.1,0,0);
      mesh(plateGeo([[-1,-1.2],[1,-1.2],[1,1.2],[-1,1.2]],.2,[ph(s*out*.3,0,HM4)]),M.alu,a,s*out*1.0,0,0);
      DRIVE_HOLES.push([s*xf+s*out*1.3,zc,HM4]);
      bolt(a,[s*out*1.3,.2,0],'y',-1,.2+CFG.lidT+.4,.4,{nut:true,washer:true,part:'M4×20 angle → lid + doubler'});
      if(side>0)bolt(a,[s*out*.2,1.2,0],'x',-s*out,.4+(UP_X1-UP_X0),.4,{nut:true,part:'M4×20 angle → upright → angle'});}}
  P('Hall sensor (hammer home)','chassis',true);box(.15,.4,.5,M.sensor,g,UP_X1+.08,HP.y-2.3,HP.z);
}
// hammer hub in slices along the motor axis (x): left wall, middle with the open stick slot, right wall.
// Hub 33 × 33 × 55. Stick slot 20.3 (x) × 20 (z), 30 deep from the bottom; 2 × Ø4.5 stick bolts along x at 22 / 34 mm below the axis.
// The slot is the 2 × 10 mm stick + 0.3 mm (the printer makes holes ≈0.1–0.15 small) – epoxy fills the rest.
const HUB={x:1.65,top:1.5,bot:-4,slotX:(STICK.x+.03)/2,slotZ:(STICK.z+.03)/2,slotTop:-1.0,bolts:[-2.2,-3.4]};
function hubMeshes(big,mode){   // mode 'hex': hex socket 8.5 deep (motor side) + Ø4.5 + Ø8 counterbore 15.5 deep; 'bore': Ø10 through
  const box=[[-HUB.x,HUB.top],[HUB.x,HUB.top],[HUB.x,HUB.bot],[-HUB.x,HUB.bot]];
  const U=[[-HUB.x,HUB.top],[HUB.x,HUB.top],[HUB.x,HUB.bot],[HUB.slotZ,HUB.bot],[HUB.slotZ,HUB.slotTop],[-HUB.slotZ,HUB.slotTop],[-HUB.slotZ,HUB.bot],[-HUB.x,HUB.bot]];
  const bh=()=>HUB.bolts.map(y=>circlePath(0,y,HM4));
  const sl=(x0,x1,pts,holes)=>mesh(profileGeo(pts,x1-x0,holes),M.print,big,(x0+x1)/2,0,0);
  const sx=HUB.slotX;
  if(mode==='hex'){
    sl(-HUB.x,-sx,box,[circlePath(0,0,.4),...bh()]);      // left wall: counterbore + stick bolts
    sl(-sx,-.1,U,[circlePath(0,0,.4)]);                     // middle: slot open at the bottom, counterbore
    sl(-.1,.8,U,[circlePath(0,0,HM4)]);                     // middle: Ø4.5 for the screw
    sl(.8,sx,U,[hexPath(0,0)]);                             // middle: hex socket (the slot is below it)
    sl(sx,HUB.x,box,[hexPath(0,0),...bh()]);                // right wall: hex socket, 8.5 deep in all
  }else{
    sl(-HUB.x,-sx,box,[circlePath(0,0,.5),...bh()]);sl(-sx,sx,U,[circlePath(0,0,.5)]);sl(sx,HUB.x,box,[circlePath(0,0,.5),...bh()]);
  }
}
function buildShaftHub(big){   // chain / gear designs: hub with a Ø10 bore, pinned to the shaft; collars each side
  P('Hammer hub (hardwood or print)','hammer');hubMeshes(big,'bore');
  bolt(big,[0,0,-1.65],'z',1,3.3,.4,{nut:true,part:'Cross bolt M4 through hub + shaft'});
  P('Shaft collar Ø10','hammer');for(const s of[-1,1])ringX(.9,.5,.75,M.blackOx,big,s*2.05,0,0);
}

const DRIVE_HOLES=[];   // lid holes of the motor bracket (rebuilt with the drive)
let DRV=null;
function buildDrive(id){
  const opt=HD_OPTS.find(o=>o.id===id)||HD_OPTS[2];
  if(DRV){hammerFixed.remove(DRV.g);hammerRot.remove(DRV.big);}
  DRIVE_HOLES.length=0;
  const keep=CUR,g=new THREE.Group(),big=new THREE.Group();hammerFixed.add(g);hammerRot.add(big);
  if(opt.type==='direct'){const D={opt,chain:false,direct:true,g,big,chainLinks:[]};buildDirect(D,g,big);
    CUR=keep;DRV=D;if(motLbl)motLbl.position.set(DIR_X0+DIR_T+3,HP.y+1.8,HP.z);if(driveLblHook)driveLblHook();return D;}
  buildUprights2(g);buildShaftHub(big);
  const chain=opt.type==='chain',w=chain?SPR_W:GEAR_W,R=opt.n2/opt.n1;
  const fit=chain?chainFit(opt.n1,opt.n2):{n:0,C:GEAR_M*(opt.n1+opt.n2)/2};
  const CC=fit.C,MOT={y:HP.y+CC*Math.sin(MDIR),z:HP.z+CC*Math.cos(MDIR)};
  const hx=Math.max(HD_X0,HD_X0+w-CPL.hexL), PL0=hx+CPL.len+.05, PL1=PL0+.5, xc=HD_X0+w/2;
  const D={opt,chain,R,eta:chain?.9:.85,CC,MOT,links:fit.n,g,big,hx,PL0,PL1,xc,w,chainLinks:[]};
  // shaft: from the left bearing retainer to just past the drive
  const sx0=-(UP_X1+.4),sx1=HD_X0+w+.15;D.shaftL=sx1-sx0;
  P('Hammer shaft Ø10 steel','chassis',true);cylX(.5,sx1-sx0,M.steel,g,(sx0+sx1)/2,HP.y,HP.z,20);
  // hammer side: printed hub with an M4 cross bolt through the shaft, sprocket / gear bolted to it (3 × M3)
  // small hammer sprockets (< 18T) have no room for the hub screws inside the chain: printed in one piece with the hub
  D.onePiece=chain&&opt.n2<18;
  D.hubName=D.onePiece?'Hammer drive: hub of the one-piece print':'Hammer drive: hub (print or ply, M4 cross bolt)';
  D.hubR=D.onePiece?Math.min(1.2,sprR(opt.n2)-.35):1.2;   // stays inside the chain plates
  P(D.hubName,'hammer');ringX(D.hubR,.5,HD_X0-3.7,M.print,big,(3.7+HD_X0)/2,0,0);
  bolt(big,[(3.7+HD_X0)/2,0,-1.2],'z',1,2.4,.4,{nut:true,part:'Hammer drive: M4 cross bolt hub + shaft'});
  const tag=chain?`${opt.n2}T #25 sprocket`:`${opt.n2}T m2 gear`;
  D.bigName=D.onePiece?`Hammer drive: ${tag} + hub, one print (on shaft)`:chain?`Hammer drive: ${tag} (on shaft)`:`Hammer drive: ${tag} (print, on shaft)`;
  D.smallName=chain?`Hammer drive: ${opt.n1}T #25 sprocket (print PA, hex hub)`:`Hammer drive: ${opt.n1}T m2 gear (print, hex socket)`;
  P(D.bigName,'hammer');
  if(chain)mesh(shapeGeoX(sprocketShape(opt.n2,.5,D.onePiece?[]:[...lightHoles(sprR(opt.n2)),...hubBoltHoles()]),w),D.onePiece?M.print:M.steel,big,xc,0,0);
  else mesh(shapeGeoX(gearShape(opt.n2,GEAR_M,[circlePath(0,0,.5),...lightHoles(GEAR_M*opt.n2/2-GEAR_M*1.25),...hubBoltHoles()]),w),M.print,big,xc,0,0);
  if(!D.onePiece)for(let k=0;k<3;k++){const a=k*2*Math.PI/3;   // 3 × M3 from the outside into heat-set inserts in the hub
    bolt(big,[HD_X0+w,.85*Math.sin(a),.85*Math.cos(a)],'x',-1,w+.6,.3,{part:'Hammer drive: M3×10 screws into the hub'});}
  // motor side
  const msp=new THREE.Group();msp.position.set(0,MOT.y,MOT.z);g.add(msp);D.msp=msp;
  if(chain){P(`Hammer drive: ${opt.n1}T #25 sprocket (print PA, hex hub)`,'msp');mesh(shapeGeoX(sprocketShape(opt.n1,0,[],true),w),M.print,msp,xc,0,0);
    const hs=new THREE.Shape();hs.absarc(0,0,.85,0,Math.PI*2,false);hs.holes.push(hexPath(0,0));const hl=hx+CPL.hexL-(HD_X0+w);mesh(shapeGeoX(hs,hl),M.print,msp,HD_X0+w+hl/2,0,0);
    bolt(msp,[hx,0,0],'x',1,.9,.4,{head:'hex',washer:true,part:'M4 screw + washer into coupler'});}
  else{P(`Hammer drive: ${opt.n1}T m2 gear (print, hex socket)`,'msp');
    const wall=hx-HD_X0;mesh(shapeGeoX(gearShape(opt.n1,GEAR_M,[circlePath(0,0,.22)]),wall),M.print,msp,HD_X0+wall/2,0,0);
    mesh(shapeGeoX(gearShape(opt.n1,GEAR_M,[hexPath(0,0)]),CPL.hexL),M.print,msp,hx+CPL.hexL/2,0,0);
    bolt(msp,[HD_X0,0,0],'x',1,wall+.9,.4,{head:'csk',part:'M4 countersunk screw into coupler'});}
  P('Hex coupler 18 mm (12 mm hex)','msp');hexCoupler(msp,PL0-.05,-1);
  // motor bracket: 5 mm face plate + base on the lid (slotted for the chain, round holes for gears)
  P('Hammer motor bracket (print)','chassis');
  {const BR=1.35,sad=Math.min(PL1+2.65,9.55),BX=[PL0-.35,WALL_X+.4],BDZ=[-.8,.8];
   const pts=[[MOT.z-BR,DECK_TOP],[MOT.z+BR,DECK_TOP],[MOT.z+BR,MOT.y],...arcPts(MOT.z,MOT.y,BR,0,180,12)];
   mesh(profileGeo(pts,PL1-PL0,[circlePath(MOT.z,MOT.y,.4),circlePath(MOT.z,MOT.y-.85,HM3),circlePath(MOT.z,MOT.y+.85,HM3)]),M.pacf,g,(PL0+PL1)/2,0,0);
   const hole=(bx,z)=>chain?slotPath(bx,-(z-.2),bx,-(z+.2),HM3):ph(bx,z,HM3);
   mesh(plateGeo([[PL0-.8,MOT.z-BR],[sad-.4,MOT.z-BR],[sad-.4,MOT.z+BR],[PL0-.8,MOT.z+BR]],.3,BX.flatMap(bx=>BDZ.map(dz=>hole(bx,MOT.z+dz)))),M.pacf,g,0,DECK_TOP,0);
   P('Motor saddle + zip tie (print)','chassis');const sh=MOT.y-1.22-DECK_TOP;box(.7,sh,2.2,M.pacf,g,sad,DECK_TOP+sh/2,MOT.z);
   P('Hammer motor bracket (print)','chassis');
   for(const dz of BDZ)for(const bx of BX){DRIVE_HOLES.push([bx,MOT.z+dz,HM3]);
     if(bx<W_IN-.2)bolt(g,[bx,DECK_TOP+.3,MOT.z+dz],'y',-1,.3+CFG.lidT+.4,.3,{washer:true,nut:true,part:'M3×16 through lid + doubler'});
     else bolt(g,[bx,DECK_TOP+.3,MOT.z+dz],'y',-1,.3+CFG.lidT+1.7,.3,{washer:true,part:'M3×25 wood screw through lid into the side panel top'});}
   for(const dy of[-.85,.85])bolt(g,[PL0,MOT.y+dy,MOT.z],'x',1,PL1-PL0+.4,.3,{head:'csk',part:'M3×8 countersunk GA25 → bracket'});}
  ga25(g,MOT.y,MOT.z,PL1,1,'Hammer motor');
  if(chain){   // chain along the real path (big arc, tangent, small arc, tangent)
    const RB=sprR(opt.n2),RS=sprR(opt.n1),CX=HD_X0+SPR_W/2;
    P(`Hammer drive: #25 roller chain, ${fit.n} links`,'chain');
    const c1={z:HP.z,y:HP.y,r:RB},c2={z:MOT.z,y:MOT.y,r:RS};
    const d=Math.hypot(c2.z-c1.z,c2.y-c1.y),phi=Math.atan2(c2.y-c1.y,c2.z-c1.z),del=Math.acos((c1.r-c2.r)/d);
    const segs=[],at=(c,a)=>[c.z+c.r*Math.cos(a),c.y+c.r*Math.sin(a)];
    segs.push({t:'arc',c:c1,a0:phi-del,a1:phi+del-2*Math.PI});
    segs.push({t:'line',p0:at(c1,phi+del),p1:at(c2,phi+del)});
    segs.push({t:'arc',c:c2,a0:phi+del,a1:phi-del});
    segs.push({t:'line',p0:at(c2,phi-del),p1:at(c1,phi-del)});
    segs.forEach(s=>s.len=s.t==='arc'?Math.abs(s.a1-s.a0)*s.c.r:Math.hypot(s.p1[0]-s.p0[0],s.p1[1]-s.p0[1]));
    const total=segs.reduce((a,s)=>a+s.len,0);
    const path=sv=>{sv=((sv%total)+total)%total;for(const s of segs){if(sv<=s.len){const u=sv/s.len;
      if(s.t==='arc')return at(s.c,s.a0+(s.a1-s.a0)*u);return[s.p0[0]+(s.p1[0]-s.p0[0])*u,s.p0[1]+(s.p1[1]-s.p0[1])*u];}sv-=s.len;}return at(c1,phi-del);};
    const tp=2*Math.PI/opt.n2;D.phase=(((phi-del)%tp)+tp)%tp*RB;
    {const s0=segs[0].len+segs[1].len;const k=Math.ceil((s0-D.phase)/PITCH);const sv=D.phase+k*PITCH-s0;D.mspPhase=(phi+del)-sv/RS;}
    D.path=path;D.RB=RB;
    const plate=cg('chplate',()=>new THREE.BoxGeometry(.08,.5,PITCH+.2)),roller=cg('chroll',()=>{const r=new THREE.CylinderGeometry(ROLLER/2,ROLLER/2,.32,10);r.rotateZ(Math.PI/2);return r;});
    for(let i=0;i<fit.n;i++){const l=new THREE.Group();g.add(l);const off=(i%2?.26:.2);
      mesh(plate,M.chain,l,CX-off,0,0);mesh(plate,M.chain,l,CX+off,0,0);mesh(roller,M.steel,l,CX,0,-PITCH/2);D.chainLinks.push(l);}
  } else {     // gear phase: a tooth of the big gear in the gap of the small one on the line of centres
    const phi=Math.atan2(MOT.y-HP.y,MOT.z-HP.z),tp=2*Math.PI/opt.n2,u=Math.round(phi/tp)*tp-phi;
    D.gPhase=Math.PI/opt.n1-phi-Math.PI+u*R;
  }
  // numbers for the tab
  D.small=chain?{pd:2*sprR(opt.n1),od:sprOD(opt.n1)}:{pd:GEAR_M*opt.n1,od:GEAR_M*(opt.n1+2)};
  D.bigD=chain?{pd:2*sprR(opt.n2),od:sprOD(opt.n2)}:{pd:GEAR_M*opt.n2,od:GEAR_M*(opt.n2+2)};
  D.update=h=>{
    if(chain){D.msp.rotation.x=rad(h)*R-D.mspPhase;const off=rad(h)*D.RB+D.phase;
      D.chainLinks.forEach((l,i)=>{const s0=off+i*PITCH,p0=D.path(s0),p1=D.path(s0+PITCH);
        l.position.set(0,(p0[1]+p1[1])/2,(p0[0]+p1[0])/2);l.rotation.x=-Math.atan2(p1[1]-p0[1],p1[0]-p0[0]);});}
    else D.msp.rotation.x=-rad(h)*R+D.gPhase;};
  D.uprightName='Hammer upright 9 mm ply';
  CUR=keep;DRV=D;if(motLbl)motLbl.position.set(PL1+3,MOT.y+1.6,MOT.z);if(driveLblHook)driveLblHook();
  return D;
}
const motLbl=anchor(hammerFixed,0,0,0),upLbl=anchor(hammerFixed,0,0,0);
var driveLblHook=null;   // set by the UI: label texts follow the chosen design
let HD_SEL='direct';try{const v=localStorage.getItem('mmHD2');if(v&&HD_OPTS.some(o=>o.id===v))HD_SEL=v;}catch(e){}
buildDrive(HD_SEL);

// ---- motion: GA25 170 rpm (12 V) as a straight torque–speed line, through the chain / gears, gravity on the stick + head.
// The motor rotor is included: through the gearbox (≈1:35) and the pair it weighs as much as the hammer.
const MOTOR={rpm:170,stall:1.53,gb:35,jRotor:8e-7};   // stall torque estimated from the 133 rpm listing; rotor inertia estimated
const HDM={head:HD_HEAD_G};                            // head mass (g), set in the Hammer drive tab
function hdNums(R=DRV.R,eta=DRV.eta){
  const mh=HDM.head/1000,ms=HD_STICK_G/1000,L=ARM_L/100;
  const I=mh*L*L+ms*L*L/3+2e-5,Ir=MOTOR.jRotor*(MOTOR.gb*R)**2,grav=9.81*(mh*L+ms*L/2);
  return {mh,ms,L,R,eta,I,Ir,grav,W0:MOTOR.rpm*2*Math.PI/60};
}
function hdSim(from,to,volt=1,R,eta){   // -> {T, at(t) deg, w (rad/s at the end)}
  const n=hdNums(R,eta),dir=Math.sign(to-from)||1,dt=2e-4;let a=rad(from),w=0,t=0;const ts=[0],as=[from];
  while(dir*(deg(a)-to)<0&&t<4){
    const tm=n.eta*n.R*MOTOR.stall*(volt*dir-n.R*w/n.W0),tg=-n.grav*Math.sin(a);
    w+=(tm+tg)/(n.I+n.Ir)*dt;a+=w*dt;t+=dt;if(Math.round(t/dt)%25===0){ts.push(t);as.push(deg(a));}}
  ts.push(t);as.push(to);
  const at=x=>{if(x<=0)return as[0];for(let i=1;i<ts.length;i++)if(ts[i]>=x){const u=(x-ts[i-1])/(ts[i]-ts[i-1]||1);return as[i-1]+(as[i]-as[i-1])*u;}return to;};
  return {T:t,at,w,stalled:t>=4};
}

// hard stops (TPU padded posts, through-bolted into the lid doubler)
function armLowEdge(a,r){ // lowest arm-edge point at radius r for hammer angle a (deg): [z,y]
  const hw=r<4?HUB.x:STICK.z/2,out=[];   // printed hub, then the 20 mm stick
  for(const e of[-hw,hw]){const yl=-r,zl=e,f=rad(a);out.push([HP.z+yl*Math.sin(f)+zl*Math.cos(f),HP.y+yl*Math.cos(f)-zl*Math.sin(f)]);}
  return out[0][1]<out[1][1]?out[0]:out[1];
}
let REST=70, FRONT_STOP=window.FRONT_STOP||285;   // front stop angle, checked by the clash sweep (Check tab)
function stopPost(a,zWant,name){
  let yTop=1e9;
  for(let r=1;r<19;r+=.01){const p=armLowEdge(a,r);if(Math.abs(p[0]-zWant)<=.6)yTop=Math.min(yTop,p[1]);}
  const best=[zWant,yTop-.01],hgt=best[1]-DECK_TOP-.35;
  P(name,'chassis');mesh(plateGeo([[-2.2,-.6],[2.2,-.6],[2.2,.6],[-2.2,.6]],hgt,[ph(-1.5,0,HM3),ph(1.5,0,HM3)]),M.pacf,hammerFixed,0,DECK_TOP,best[0]);
  P('TPU stop pad','chassis');box(4.4,.35,1.2,M.tpu,hammerFixed,0,DECK_TOP+hgt+.175,best[0]);
  P(name,'chassis');for(const sx of[-1.5,1.5]){bolt(hammerFixed,[sx,DECK_TOP,best[0]],'y',-1,CFG.lidT+.4,.3,{nut:true,head:'hex',part:'M3 stop post → lid'});LID_HOLES.push([sx,best[0],HM3]);}
  return best;
}
const REAR_STOP_P=stopPost(REST,-8.9,'Rear stop post (print)');
const FRONT_STOP_P=stopPost(FRONT_STOP,5.6,'Front stop post (print)');
buildLid();

// ---------------- overlays: envelope + footprint
const envelope=new THREE.Group(); robot.add(envelope);
function centreEnvelope(){   // centre the 55 × 55 box on the robot's outline in the start pose (hammer on the rear stop, shovel down)
  const sv={hammer:S.hammer,crank:S.crank};S.hammer=REST;S.crank=0;apply();robot.updateMatrixWorld(true);
  const inv=new THREE.Matrix4().copy(robot.matrixWorld).invert(),bb=new THREE.Box3(),m=new THREE.Matrix4(),v=new THREE.Vector3();
  robot.traverse(o=>{if(!o.isMesh||!o.userData.part)return;for(let p=o;p&&p!==robot;p=p.parent)if(!p.visible)return;
    m.multiplyMatrices(inv,o.matrixWorld);const a=o.geometry.attributes.position;for(let i=0;i<a.count;i++){v.fromBufferAttribute(a,i).applyMatrix4(m);bb.expandByPoint(v);}});
  envelope.position.x=(bb.min.x+bb.max.x)/2;envelope.position.z=(bb.min.z+bb.max.z)/2;Object.assign(S,sv);apply();return bb;
}
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
    ringX(.275,.16,.05,M.print,bladeG,s*.625,lv,lu);   // 0.5 mm Ø5.5 boss against the inner ring of the rod bearing
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
const S={x:0,z:0,yaw:0,shovel:0,crank:0,hammer:REST};
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
  hammerRot.rotation.x=rad(S.hammer); DRV.update(S.hammer);
  for(const w of wheels)w.rotation.x=spin;
  updateRods();
  hud();
  afterApply();
}
let afterApply=()=>{};   // set by the UI (overall size lines follow the moving parts)
function hud(){
  const el=document.getElementById('hud');if(!el)return;
  const hz=S.hammer>FRONT_ZONE?'front':(S.hammer>110?'overhead':'rear');
  el.innerHTML=`Shovel <b>${S.shovel.toFixed(0)}°</b>`+` (crank ${S.crank.toFixed(0)}°)`+` · Hammer <b>${S.hammer.toFixed(0)}°</b> (${hz})`+(interlockMsg?`<br><span class="warn">INTERLOCK: ${interlockMsg}</span>`:'');
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
  const f=phi=>front?HP.y-ARM_L*Math.cos(phi)+HEAD.z/2*Math.sin(phi):HP.y-ARM_L*Math.cos(phi)-HEAD.z/2*Math.sin(phi);
  let lo=front?rad(230):rad(50),hi=front?rad(300):rad(130);
  for(let i=0;i<40;i++){const m=(lo+hi)/2;if(front){f(m)>yt?lo=m:hi=m;}else{f(m)>yt?hi=m:lo=m;}}
  return deg((lo+hi)/2);
}
function resetScene(){
  cancelSeq();Object.assign(S,{x:0,z:0,yaw:0,shovel:0,crank:0,hammer:REST});interlockMsg='';
  enemy.visible=false;spin=0;apply();syncSliders();
}
async function squash(){await tw(.09,u=>{enemy.scale.y=1-.18*u;},E.out);await tw(.35,u=>{enemy.scale.y=.82+.18*u;},E.out);}

// --- shovel moves
async function shovelUp(dur){await tw(dur,u=>{S.crank=lerp(0,KMAX,u);apply();},E.out);}
async function shovelDown(dur){await tw(dur,u=>{S.crank=lerp(KMAX,360,u);apply();},E.sine);S.crank=0;apply();}
// --- hammer moves: the motor drives the hammer both ways; the motion follows the motor / gravity simulation
async function swing(to,dur,ease=E.in){const from=S.hammer;await tw(dur,u=>{S.hammer=lerp(from,to,u);apply();},ease);}
async function hammerTo(to,volt=1){const sim=hdSim(S.hammer,to,volt);await tw(Math.max(sim.T,.05),u=>{S.hammer=sim.at(u*sim.T);apply();},E.lin);return sim;}
async function goHome(){toast('Back home (half power)',900);await hammerTo(REST,.5);S.hammer=REST;apply();}
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
  toast('Motor swings the hammer over the top – full power',1300);
  await hammerTo(hit,1);
  impact(headContact(true),60,1.4);squash();
  const z0=enemy.position.z;tw(.3,u=>{enemy.position.z=z0+3*u;},E.out);
  await swing(hit-5,.12,E.out);await swing(hit,.15,E.in);
  await wait(.4);
}
async function seqFront(){
  resetScene();placeEnemy(0,6.2,28,3);toast('Hammer – front',900);
  await wait(.4);await frontStrike(9.7);toast('SMASH',900);await wait(.3);await goHome();
}
async function seqRear(){
  resetScene();placeEnemy(0,6,-22.5,-4);toast('Hammer – rear',900);
  await wait(.4);toast('Hammer to the front first (half power)',1200);
  await hammerTo(FRONT_STOP-4,.5);await wait(.3);
  toast('Full power backwards over the top',1300);
  const hit=hitAngle(9.5,false);
  await hammerTo(hit,1);
  impact(headContact(false),60,1.4);squash();
  const z0=enemy.position.z;tw(.3,u=>{enemy.position.z=z0-3*u;},E.out);
  await swing(hit+5,.12,E.out);await swing(hit,.15,E.in);toast('SMASH',900);
  await wait(.6);enemy.visible=false;await goHome();
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
  await wait(.3);await frontStrike(9.2);toast('K.O.',1800);await goHome();
}
const SEQ={flip:seqFlip,front:seqFront,rear:seqRear,combo:seqCombo,reset:async()=>{resetScene();}};

// ============================================================ clash check (sweeps every moving part)
// Surface points of one part are tested against the solid of every other rigid group.
// A hit counts only if the point is at least 0.06 cm inside (touching faces are OK).
const isDrive=n=>n.startsWith('Hammer drive:')&&/sprocket|gear \(|roller chain/.test(n);   // the meshing parts only (sprockets + chain, or the 2 gears) touch on purpose
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
    if(isDrive(a.userData.part)&&isDrive(b.userData.part)&&ga!==gb)continue;
    if(!bbs[i].intersectsBox(bbs[j]))continue;
    const S_=a.geometry.userData.S;inv.copy(b.matrixWorld).invert();let cnt=0,ex=null;
    for(let k=0;k<S_.length;k+=3){v.set(S_[k],S_[k+1],S_[k+2]).applyMatrix4(a.matrixWorld);
      const w=v.clone().applyMatrix4(inv);if(deepInside(b.geometry,w.x,w.y,w.z)){cnt++;if(!ex)ex=v.clone();if(cnt>3)break;}}
    if(cnt){const k2=[key,rkey].sort()[0];const f=found[k2]||(found[k2]={a:a.userData.part,b:b.userData.part,ga,gb,states:[],ex});f.states.push(label);}
  }
}
async function clashCheck(progress){
  const found={},save={...S};const steps=[];
  steps.push(()=>{Object.assign(S,{shovel:0,crank:0,hammer:REST});apply();clashState(found,'static (rest)',true);});
  for(let k=0;k<360;k+=6)steps.push(()=>{S.crank=k;S.hammer=REST;apply();clashState(found,'crank '+k+'° (blade '+S.shovel.toFixed(0)+'°)');});
  for(let h=REST;h<=FRONT_STOP;h+=3)steps.push(()=>{S.crank=0;S.shovel=0;S.hammer=h;apply();clashState(found,'hammer '+h+'°');});
  steps.push(()=>{S.hammer=FRONT_STOP;apply();clashState(found,'hammer '+FRONT_STOP+'° (front stop)');});
  for(const h of[REST,120,160,200,FRONT_ZONE])steps.push(()=>{S.crank=KMAX;S.hammer=h;apply();clashState(found,'shovel up + hammer '+h+'°');});
  for(let i=0;i<steps.length;i++){steps[i]();if(progress)await progress(i+1,steps.length);}
  Object.assign(S,save);apply();
  return Object.values(found);
}
// first hammer angle (>220°) that touches the shovel parts with the shovel down
async function frontLimit(){
  const save={...S},found={};let lim=null;
  for(let h=250;h<=310&&lim===null;h+=1){S.crank=0;S.shovel=0;S.hammer=h;apply();const f={};clashState(f,'h');
    const hh=Object.values(f).filter(x=>(x.ga==='hammer'||x.gb==='hammer')&&!/stop/i.test(x.a+x.b));if(hh.length)lim={h,parts:hh.map(x=>x.ga==='hammer'?x.b:x.a)};}
  Object.assign(S,save);apply();return lim;
}

// ============================================================ shovel print list (sizes measured from the model)
const f1=v=>(v*10).toFixed(1).replace(/\.0$/,''), f0=v=>(v*10).toFixed(0);
const LUG_TXT=`rib lug Ø3.2 hole at ${f0(LUG_RHO)} mm from the axle, ${LUG_REL.toFixed(1)}° above the blade line`;
const PRINT_EGP_G=4;   // PLA+ price per gram (EGP); g = slicer estimate per piece with the settings below
const PRINT_PARTS=[
  {id:'P1',name:'Blade',qty:1,
   parts:['Shovel blade (PLA+ print)','Blade hinge knuckle (on axle)','Blade rib with lug (print)'],
   what:'The flat scoop that slides under the other robot. The 2 fins on top (the "ribs") are printed with it – the rods pull on them. It only gets under the other robot and lifts it (no hitting), so the load is the lift through the rings and fins. All plastic: no metal on the weapon.',
   holes:()=>['4 hinge rings with an 8.4 mm hole for the steel axle',`one 3.2 mm hole in each fin for the rod bolt (${f0(LUG_RHO)} mm from the axle)`,'front lip: blunt 1.5 mm nose (not a knife edge)'],
   mat:'PLA+',g:100,infill:'3 walls, 4 top / 4 bottom layers, 15 % gyroid; 100 % (slicer modifier) on the hinge rings and the 2 fins – they carry the whole lift',up:[0,1,0],sup:'tree supports under the hinge rings (they hang 6 mm below the blade)'},
  {id:'P2',name:'Side plate',qty:2,side:true,parts:['Cheek plate (print)'],
   what:'Holds the steel axle of the blade. One inside the left box wall, one inside the right.',
   holes:()=>['8.2 mm hole for the axle','2 holes 4.3 mm for M4 bolts through the box wall'],mat:'PLA+',g:10,infill:'4 walls, 4 top / 4 bottom layers, 40 % gyroid (the walls carry the axle hole)',up:[1,0,0]},
  {id:'P3',name:'Front plate',qty:1,parts:['Front extension plate (print)'],
   what:'Flat plate screwed on top of the front of the base plate. The 2 motor brackets stand on it.',
   holes:()=>['4 holes 3.2 mm to screw it to the base','4 holes 3.2 mm for the bracket feet','1 slot at the front for the cranks and rods'],mat:'PLA+',g:12,infill:'3 walls, 4 top / 4 bottom layers, 25 % gyroid',up:[0,1,0]},
  {id:'P4',name:'Motor bracket',qty:2,side:true,parts:['Shovel motor bracket (print)'],
   what:'Holds one shovel motor. The motor screws onto the upright wall, the foot screws onto the front plate.',
   holes:()=>["8 mm hole for the motor's round nose",'2 holes 3.2 mm for the motor screws (17 mm apart)','2 holes 3.2 mm in the foot'],mat:'PLA+',g:11,infill:'100 % – it takes the motor torque',up:[1,0,0],sup:'none – motor face on the bed, foot + gusset grow upwards'},
  {id:'P5',name:'Crank',qty:2,side:true,parts:['Crank arm 37.5 mm (10 mm print, hex socket)'],
   what:'The arm the motor turns. It sits on the brass coupler.',
   holes:()=>['12 mm hexagon hole for the coupler, 7 mm deep','3 mm end wall with a countersunk Ø4.4 hole (Ø9 at the face, 90°): the M4 countersunk screw clamps the crank onto the coupler and sits flush',`3.2 mm hole for the rod bolt, ${f1(CR_R)} mm from the centre`],mat:'PLA+',g:9.5,infill:'100 % – it drives the lift',up:[-1,0,0],sup:'none – hex side on the bed'},
  {id:'P6',name:'Rod',qty:2,side:true,parts:['Connecting rod 5.5 cm (4 mm print, 623ZZ bearings)'],
   what:'Connects the crank to the fin on the blade. When the crank turns, it pulls the blade up.',
   holes:()=>[`2 bearing seats Ø10 for 623ZZ (3×10×4) bearings, ${f0(ROD_L)} mm apart – press fit, test print first`],mat:'PLA+',g:2.6,infill:'100 % – it pulls the whole lift',up:[1,0,0]},
  {id:'P7',name:'Hammer hub',qty:1,parts:['Hammer hub (print, hex socket)','Hammer hub (hardwood or print)'],
   what:'Holds the hammer stick and sits on the brass coupler of the hammer motor (like the crank).',
   holes:()=>['12 mm hexagon socket (12.17 across flats), 8.5 mm deep, on the motor side (the coupler hex fills the inner 7 mm)','Ø4.5 hole + Ø8 counterbore 15.5 mm deep from the other side for the M4×16 screw into the coupler',
     'slot 20.3 × 20.3, 30 mm deep, open at the bottom: the 2 × 10 mm plywood stick goes in','2 holes Ø4.5 through the sides and the slot, 37 and 49 mm from the top, for the M4 stick bolts'],
   mat:'PLA+',g:59,infill:'100 %, 5 walls – it takes the hammer knocks',up:[0,-1,0],sup:'none – top face (shaft side) on the bed, slot opening upwards'},
  {id:'P8',name:'Hammer motor upright',qty:1,parts:['Hammer motor upright 12 mm (print)'],
   what:'Stands on the lid and holds the hammer motor. The motor axis is the hammer pivot.',
   holes:()=>['Ø26 pocket 9 mm deep on the motor side for the gearbox (3 mm wall left)','Ø8 hole for the gearbox nose','2 holes Ø3.4 countersunk on the hammer side for M3×8 (17 mm apart)','2 holes Ø4.5 for the alu angles','2 × M4×30 screws from under the lid into the bottom edge: drill Ø3.3 pilot holes 25 deep'],
   mat:'PLA+',g:45,infill:'4 walls, 5 top / 5 bottom layers, 30 % gyroid',up:[1,0,0],sup:'none – hammer-side face on the bed, pocket opening upwards'},
  {id:'P9',name:'Rear stop post',qty:1,parts:['Rear stop post (print)'],
   what:'The hammer rests on it (rear position). A rubber / TPU pad goes on top.',
   holes:()=>['2 holes Ø3.4 top to bottom, 30 mm apart, for M3 bolts through the lid'],mat:'PLA+',g:7.5,infill:'4 walls, 4 top / 4 bottom layers, 40 % gyroid (the TPU pad takes the knock)',up:[0,1,0]},
  {id:'P10',name:'Front stop post',qty:1,parts:['Front stop post (print)'],
   what:'Catches the hammer if a front hit misses. A rubber / TPU pad goes on top.',
   holes:()=>['2 holes Ø3.4 top to bottom, 30 mm apart, for M3 bolts through the lid'],mat:'PLA+',g:12,infill:'4 walls, 4 top / 4 bottom layers, 40 % gyroid (the TPU pad takes the knock)',up:[0,1,0]},
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
  {id:'M3',short:'test print',q:'Test print: print one hexagon hole, one 8 mm hole, one 3 mm hole and one 10 mm bearing seat (623ZZ) and tell me how they fit',now:'holes 0.2 mm bigger than the part',
   why:'Every hole in every part uses this.',show:()=>['Crank arm*','Connecting rod*','Blade hinge knuckle (on axle)'],
   dims:()=>[],dir:[.6,.6,.8]},
];
function uniquePts(g){   // vertices without the duplicates (≈8× fewer), cached per geometry
  if(g.userData.U)return g.userData.U;
  const p=g.attributes.position,seen=new Set(),o=[];
  for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),k=Math.round(x*1e3)+','+Math.round(y*1e3)+','+Math.round(z*1e3);if(!seen.has(k)){seen.add(k);o.push(x,y,z);}}
  return g.userData.U=new Float32Array(o);
}
// box of one print part in its own frame (right-hand copy of a pair): {root, bb} or null
function partBox(pp,side=1){
  robot.updateMatrixWorld(true);
  let ms=[];robot.traverse(o=>{if(o.isMesh&&pp.parts.includes(o.userData.part))ms.push(o);});
  if(pp.side)ms=ms.filter(m=>m.position.x*side>0);
  if(!ms.length)return null;
  const root=ms.length===1?ms[0]:ms[0].parent;          // single mesh: measure in its own frame
  const inv=new THREE.Matrix4().copy(root.matrixWorld).invert(),rel=new THREE.Matrix4(),v=new THREE.Vector3(),bb=new THREE.Box3();
  for(const m of ms){rel.multiplyMatrices(inv,m.matrixWorld);const U=uniquePts(m.geometry);
    for(let i=0;i<U.length;i+=3){v.set(U[i],U[i+1],U[i+2]).applyMatrix4(rel);bb.expandByPoint(v);}}
  return {root,bb,ms};
}
function printRows(){
  return PRINT_PARTS.map(pp=>{const r=partBox(pp);if(!r)return {pp,dims:null};
    const sz=r.bb.getSize(new THREE.Vector3());return {pp,dims:[sz.x,sz.y,sz.z].map(d=>d*10).sort((a,b)=>b-a)};});
}
// ---- STL export (mm, laid in print orientation, centred on the bed, lowest point at z = 0)
function stlFromTris(tris){   // tris: Float32Array of xyz × 3 per triangle (cm, already oriented)
  const n=tris.length/9,buf=new ArrayBuffer(84+50*n),dv=new DataView(buf),a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();
  const bb=new THREE.Box3();for(let i=0;i<tris.length;i+=3)bb.expandByPoint(a.set(tris[i],tris[i+1],tris[i+2]));
  const cx=(bb.min.x+bb.max.x)/2,cy=(bb.min.y+bb.max.y)/2,z0=bb.min.z;
  dv.setUint32(80,n,true);
  for(let t=0;t<n;t++){const o=84+50*t,k=9*t;
    a.set(tris[k],tris[k+1],tris[k+2]);b.set(tris[k+3],tris[k+4],tris[k+5]);c.set(tris[k+6],tris[k+7],tris[k+8]);
    const nn=b.clone().sub(a).cross(c.clone().sub(a)).normalize();
    [nn.x,nn.y,nn.z].forEach((v,j)=>dv.setFloat32(o+4*j,v||0,true));
    [a,b,c].forEach((p,j)=>{dv.setFloat32(o+12+12*j,(p.x-cx)*10,true);dv.setFloat32(o+16+12*j,(p.y-cy)*10,true);dv.setFloat32(o+20+12*j,(p.z-z0)*10,true);});}
  return buf;
}
function trisOf(list){   // list of [geometry, Matrix4] -> oriented triangles; longest side along x
  const out=[],v=new THREE.Vector3();
  for(const [g,M] of list){const p=g.attributes.position,ix=g.index,n=ix?ix.count:p.count;
    for(let i=0;i<n;i++){v.fromBufferAttribute(p,ix?ix.getX(i):i).applyMatrix4(M);out.push(v.x,v.y,v.z);}}
  const t=new Float32Array(out);let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;
  for(let i=0;i<t.length;i+=3){x0=Math.min(x0,t[i]);x1=Math.max(x1,t[i]);y0=Math.min(y0,t[i+1]);y1=Math.max(y1,t[i+1]);}
  if(y1-y0>x1-x0)for(let i=0;i<t.length;i+=3){const x=t[i];t[i]=-t[i+1];t[i+1]=x;}   // turn 90° about z (a rotation, not a mirror)
  return t;
}
function partSTL(pp,side=1){
  const r=partBox(pp,side);if(!r)return null;
  const up=new THREE.Vector3(...(pp.up||[0,0,1]));if(side<0)up.x=-up.x;   // the left copy is the mirror image
  const rot=new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(up.normalize(),new THREE.Vector3(0,0,1)));
  const inv=new THREE.Matrix4().copy(r.root.matrixWorld).invert();
  return stlFromTris(trisOf(r.ms.map(m=>[m.geometry,rot.clone().multiply(inv.clone().multiply(m.matrixWorld))])));
}
// hole test piece: 3 hex sockets, 3 bearing seats, 2 axle holes, 2 M3 holes – smallest on the left, notch at the top-left corner
function testPieceSTL(){
  const s=new THREE.Shape([[0,0],[6,0],[6,5.6],[.5,5.6],[0,5.1]].map(p=>V2d(...p)));
  [1.21,1.22,1.23].forEach((af,i)=>s.holes.push(hexPath(1.1+1.9*i,4.4,af/Math.sqrt(3))));
  [1.00,1.01,1.02].forEach((d,i)=>s.holes.push(circlePath(1.1+1.9*i,2.6,d/2,48)));
  [[.9,.82],[2.3,.84],[3.7,.32],[4.9,.34]].forEach(([x,d])=>s.holes.push(circlePath(x,.9,d/2,48)));
  const g=new THREE.ExtrudeGeometry(s,{depth:.5,bevelEnabled:false,curveSegments:48});
  return stlFromTris(trisOf([[g,new THREE.Matrix4()]]));
}
// every print file: [{name, buf}]
function allSTL(){
  const L=[{name:'T0_Hole_test_piece.stl',buf:testPieceSTL()}];
  for(const pp of PRINT_PARTS){const base=pp.id+'_'+pp.name.replace(/\W+/g,'_');
    if(pp.side)for(const [sd,tag] of[[1,'RIGHT'],[-1,'LEFT']])L.push({name:`${base}_${tag}.stl`,buf:partSTL(pp,sd)});
    else L.push({name:base+'.stl',buf:partSTL(pp)});}
  return L;
}
// ---- whole robot as one 3D file, in the pose shown now (overlays, floor and the opponent left out)
// [{part, mat, tris: Float32Array xyz × 3 per triangle, robot frame, cm}]
function robotTris(){
  robot.updateMatrixWorld(true);
  const skip=new Set([envelope,footprint]),inv=new THREE.Matrix4().copy(robot.matrixWorld).invert(),M4=new THREE.Matrix4(),v=new THREE.Vector3(),B={};
  (function walk(o){if(!o.visible||skip.has(o))return;
    if(o.isMesh&&o.userData&&o.userData.grp!==undefined&&!Array.isArray(o.material)){
      const k=(o.userData.part||'Part')+'|'+o.material.uuid,b=B[k]||(B[k]={part:o.userData.part||'Part',mat:o.material,a:[]});
      const p=o.geometry.attributes.position,ix=o.geometry.index,n=ix?ix.count:p.count;M4.multiplyMatrices(inv,o.matrixWorld);
      for(let i=0;i<n;i++){v.fromBufferAttribute(p,ix?ix.getX(i):i).applyMatrix4(M4);b.a.push(v.x,v.y,v.z);}}
    o.children.forEach(walk);})(robot);
  return Object.values(B).map(b=>({part:b.part,mat:b.mat,tris:new Float32Array(b.a)}));
}
function robotSTL(){   // mm, z up (CAD / slicer convention), robot front = -y
  const L=robotTris(),n=L.reduce((s,b)=>s+b.tris.length/9,0),buf=new ArrayBuffer(84+50*n),dv=new DataView(buf),a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();
  dv.setUint32(80,n,true);let o=84;
  for(const {tris:t} of L)for(let k=0;k<t.length;k+=9){
    a.set(t[k],-t[k+2],t[k+1]);b.set(t[k+3],-t[k+5],t[k+4]);c.set(t[k+6],-t[k+8],t[k+7]);
    const nn=b.clone().sub(a).cross(c.clone().sub(a)).normalize();
    [nn.x,nn.y,nn.z].forEach((x,j)=>dv.setFloat32(o+4*j,x||0,true));
    [a,b,c].forEach((p,j)=>{dv.setFloat32(o+12+12*j,p.x*10,true);dv.setFloat32(o+16+12*j,p.y*10,true);dv.setFloat32(o+20+12*j,p.z*10,true);});o+=50;}
  return buf;
}
function robotGLB(){   // glTF 2.0 binary: metres, y up, one node per part with its colours (opens in Blender, Windows 3D Viewer, online viewers)
  const L=robotTris(),nodes={},mats=new Map(),bins=[],acc=[],views=[],meshes=[],gN=[];let off=0;
  const lin=c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4;
  const matIdx=m=>{if(!mats.has(m.uuid)){const c=m.color||new THREE.Color(0xcccccc);
    mats.set(m.uuid,{i:mats.size,j:{pbrMetallicRoughness:{baseColorFactor:[lin(c.r),lin(c.g),lin(c.b),1],metallicFactor:m.metalness??0,roughnessFactor:m.roughness??.6},doubleSided:true}});}return mats.get(m.uuid).i;};
  const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),nn=new THREE.Vector3();
  for(const {part,mat,tris:t} of L){
    const pos=new Float32Array(t.length),nor=new Float32Array(t.length),mn=[1e9,1e9,1e9],mx=[-1e9,-1e9,-1e9];
    for(let k=0;k<t.length;k+=9){a.fromArray(t,k);b.fromArray(t,k+3);c.fromArray(t,k+6);
      nn.copy(b).sub(a).cross(c.clone().sub(a)).normalize();
      for(let j=0;j<9;j+=3){for(let q=0;q<3;q++){const x=t[k+j+q]/100;pos[k+j+q]=x;mn[q]=Math.min(mn[q],x);mx[q]=Math.max(mx[q],x);}
        nor[k+j]=nn.x||0;nor[k+j+1]=nn.y||0;nor[k+j+2]=nn.z||0;}}
    const add=(arr,extra)=>{views.push({buffer:0,byteOffset:off,byteLength:arr.byteLength,target:34962});bins.push(arr);off+=arr.byteLength;
      acc.push(Object.assign({bufferView:views.length-1,componentType:5126,count:arr.length/3,type:'VEC3'},extra));return acc.length-1;};
    const prim={attributes:{POSITION:add(pos,{min:mn,max:mx}),NORMAL:add(nor)},material:matIdx(mat)};
    (nodes[part]||(nodes[part]=[])).push(prim);}
  for(const [name,prims] of Object.entries(nodes)){meshes.push({name,primitives:prims});gN.push({name,mesh:meshes.length-1});}
  const json={asset:{version:'2.0',generator:'Metal Monster robot.js'},scene:0,scenes:[{name:'Metal Monster',nodes:gN.map((_,i)=>i+1)}],
    nodes:[{name:'Metal Monster',children:gN.map((_,i)=>i+1)},...gN],meshes,materials:[...mats.values()].map(m=>m.j),accessors:acc,bufferViews:views,buffers:[{byteLength:off}]};
  json.scenes[0].nodes=[0];
  let js=new TextEncoder().encode(JSON.stringify(json));const jl=(js.length+3)&~3,bl=(off+3)&~3;
  const out=new ArrayBuffer(12+8+jl+8+bl),dv=new DataView(out),u8=new Uint8Array(out);
  dv.setUint32(0,0x46546C67,true);dv.setUint32(4,2,true);dv.setUint32(8,out.byteLength,true);
  dv.setUint32(12,jl,true);dv.setUint32(16,0x4E4F534A,true);u8.set(js,20);for(let i=20+js.length;i<20+jl;i++)u8[i]=0x20;
  dv.setUint32(20+jl,bl,true);dv.setUint32(24+jl,0x004E4942,true);let p=28+jl;
  for(const arr of bins){u8.set(new Uint8Array(arr.buffer,arr.byteOffset,arr.byteLength),p);p+=arr.byteLength;}
  return out;
}
function fitsBed(d,bed){const P=[[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]];return P.some(p=>d[0]<=bed[p[0]]&&d[1]<=bed[p[1]]&&d[2]<=bed[p[2]]);}

// ============================================================ UI (skipped when headless)
const sS=document.getElementById('sShovel'),sH=document.getElementById('sHammer'),sE=document.getElementById('sExp');
function syncSliders(){if(!sS)return;sS.value=S.crank;sH.value=S.hammer;}
const labelsEl=document.createElement('div');view.appendChild(labelsEl);
const sizeEl=document.createElement('div');view.appendChild(sizeEl);   // own layer: stays when "Labels" is off
let LABELS=[];const DYN=[],SIZE_LBL=[];
if(!HEADLESS){
  document.querySelectorAll('[data-seq]').forEach(b=>b.onclick=()=>SEQ[b.dataset.seq]());
  sS.max=360;sH.min=REST;sH.max=FRONT_STOP;
  sS.oninput=()=>{cancelSeq();let v=+sS.value;interlockMsg='';
    const lift=bladeFor(v);
    if(S.hammer>FRONT_ZONE&&lift>SHOVEL_SAFE){v=S.crank;interlockMsg='hammer is in the front zone – shovel blocked above 40°';}
    S.crank=v;sS.value=v;apply();};
  sH.oninput=()=>{cancelSeq();let v=+sH.value;interlockMsg='';
    if(S.shovel>SHOVEL_SAFE&&v>FRONT_ZONE){v=FRONT_ZONE;interlockMsg='shovel is raised – hammer blocked from the front zone';}
    S.hammer=v;sH.value=v;apply();};

  // explode view
  const expParts=[
    {o:deckG,d:[0,12,0]},{o:hammerRot,d:[0,30,0]},{o:hammerFixed,d:[0,20,0]},
    {o:shovelPivot,d:[0,0,18]},{o:shovelFixed,d:[0,4,9]},{o:elec,d:[0,5,0]},
    ...outs.map(o=>({o:o.g,d:[o.s*6,0,0]})),
    ...wheels.map(w=>({o:w,d:[Math.sign(w.position.x)*12,0,0]}))
  ];
  expParts.forEach(p=>p.b=p.o.position.clone());
  sE.oninput=()=>{const k=sE.value/100;expParts.forEach(p=>p.o.position.set(p.b.x+p.d[0]*k,p.b.y+p.d[1]*k,p.b.z+p.d[2]*k));
    DRV.chainLinks.forEach(c=>c.visible=k===0);rods.forEach(r=>r.m.visible=k===0);apply();};

  const tgl=(id,fn)=>{const b=document.getElementById(id);if(!b)return;b.onclick=()=>{b.classList.toggle('on');fn(b.classList.contains('on'));};};
  tgl('tEnv',v=>envelope.visible=v);tgl('tFoot',v=>footprint.visible=v);
  tgl('tXray',v=>{for(const m of[M.frame,M.deck,M.white,M.ply]){m.transparent=v;m.opacity=v?.18:1;m.depthWrite=!v;m.needsUpdate=true;}});
  tgl('tHam',v=>{hammerFixed.visible=v;hammerRot.visible=v;});
  tgl('tLbl',v=>labelsEl.style.display=v?'block':'none');
  const VIEWS={iso:[[64,46,76],[0,9,0]],top:[[0,135,.1],[0,0,0]],side:[[120,22,0],[0,12,0]],front:[[0,26,118],[0,10,0]],rear:[[0,26,-118],[0,10,0]],
    shovel:[[34,22,44],[0,5,11]],hammer:[[36,34,-10],[3,14,-2]],drive:[[42,8,22],[6,4,5]],hdrive:[[38,24,-14],[6,14,-4]]};
  function camTo(v){const [p,t]=VIEWS[v];const p0=camera.position.clone(),t0=controls.target.clone();
    tw(.8,u=>{camera.position.set(lerp(p0.x,p[0],u),lerp(p0.y,p[1],u),lerp(p0.z,p[2],u));controls.target.set(lerp(t0.x,t[0],u),lerp(t0.y,t[1],u),lerp(t0.z,t[2],u));},E.sine,'cam');}
  document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>camTo(b.dataset.view));

  // ---- Hammer drive tab: pick chain or gears + the pair, set the head mass; the 3D model and the numbers follow
  var hpRedraw=null;   // set by the Hammer parts tab
  const hdUI=document.getElementById('hdUI');
  if(hdUI){
    const mm=v=>(v*10).toFixed(1).replace(/\.0$/,''),rt=r=>r.toFixed(2).replace(/\.?0+$/,''),OLD_CC=7.31;
    const perf=o=>{const R=o.n2/o.n1,eta=o.type==='direct'?.97:o.type==='chain'?.9:.85,n=hdNums(R,eta),sm=hdSim(REST,hitAngle(9.7,true),1,R,eta);
      const use=.5*MOTOR.stall*R*eta;
      return {R,T:sm.T,stalled:sm.stalled,v:sm.w*n.L,E:.5*n.I*sm.w*sm.w,Er:.5*n.Ir*sm.w*sm.w,use,need:n.grav,margin:use/n.grav,rpm:MOTOR.rpm/R};};
    let type=DRV.opt.type;
    const pick=id=>{HD_SEL=id;try{localStorage.setItem('mmHD2',id);}catch(e){}cancelSeq();buildDrive(id);buildLid();S.hammer=REST;syncSliders();apply();draw();if(hpRedraw)hpRedraw();};
    function draw(){
      const D=DRV,o=D.opt,pf=perf(o),ch=D.chain,nm=ch?'sprocket':'gear',oldOK=ch&&Math.abs(D.CC-OLD_CC)<=.2;
      const opts=HD_OPTS.filter(x=>x.type===type).map(x=>`<option value="${x.id}"${x.id===o.id?' selected':''}>${x.type==='direct'?'hammer on the motor shaft (1 : 1)':`${x.n1}T → ${x.n2}T  (${rt(x.n2/x.n1)} : 1)`}</option>`).join('');
      const verdict=pf.stalled?'<span class="bad">✖ The motor cannot lift this hammer.</span>':
        pf.margin<1.5?'<span class="bad">✖ Torque margin too small – bigger ratio or lighter head.</span>':
        pf.v<2?'<span class="warn">Works, but a slow hit – with a light hammer a ratio closer to 1 : 1 hits harder.</span>':
        '<span class="ok">✔ Good: enough torque and a fast hit.</span>';
      let h=`<div class="hdctl">
        <div><b>Drive type</b> <button data-t="direct" class="${type==='direct'?'on':''}">Direct on motor (simplest)</button> <button data-t="chain" class="${type==='chain'?'on':''}">Chain #25</button> <button data-t="gear" class="${type==='gear'?'on':''}">Gears m2 (print)</button></div>
        <div><b>Motor → hammer</b> <select id="hdPair">${opts}</select></div>
        <div><b>Head mass</b> <input id="hdMass" type="number" min="10" max="600" step="5" value="${HDM.head}" style="width:70px"> g <span class="pm">(stick ${HD_STICK_G} g)</span></div>
        <div><button class="go" id="hdFront">▶ Hit front</button> <button class="go" id="hdRear">▶ Hit rear</button> <button id="hdZoom">Zoom drive</button> <button id="hdHam">Zoom hammer</button></div>
      </div>
      <p>${verdict}</p>
      <table>${D.direct?`
       <tr><th>Ratio</th><td><b>1 : 1</b> – the hammer hub sits on the motor's brass hex coupler, ${pf.rpm.toFixed(0)} rpm (no load)</td></tr>
       <tr><th>Motor mount</th><td>GA25 in a <b>Ø26 pocket, 9 mm deep</b> in a 12 mm plywood upright (3 mm web left), Ø8 hole for the nose, 2 × M3×8 countersunk from the hammer side</td></tr>
       <tr><th>Hub</th><td>1 print: 12 mm hex socket (12.17 AF) 8.5 deep on the coupler, M4×16 into the coupler's end thread from a Ø8 counterbore – the shovel crank idea</td></tr>
       <tr><th>Upright → lid</th><td>2 alu angles on the motor side (M4 through lid + doubler) + 2 × M4×30 wood screws from under the lid into the upright's bottom edge</td></tr>
       <tr><th>Not needed</th><td>shaft, bearings, retainers, collars, 2nd upright, sprockets / gears, chain, motor bracket, cross-drilling a steel shaft</td></tr>
       <tr><th>Load on the motor shaft</th><td>the head sits near the hammer's centre of percussion: only ≈ 15–20 % of a hit pushes back on the shaft (≈ 95 MPa in the Ø4 shaft for a 100 N hit – fine for steel). Keep the hub tight on the coupler.</td></tr>`:`

       <tr><th>Ratio</th><td><b>${rt(pf.R)} : 1</b> – hammer shaft ${pf.rpm.toFixed(0)} rpm (no load)</td></tr>
       <tr><th>Motor ${nm}</th><td><b>${o.n1}T</b> · pitch Ø ${mm(D.small.pd)} mm · outside Ø ${mm(D.small.od)} mm · ${ch?'2.8 mm thick + printed hub':'12 mm wide'} · 12 mm hex socket (12.17 AF) on the brass coupler, M4 screw into its end thread</td></tr>
       <tr><th>Hammer ${nm}</th><td><b>${o.n2}T</b> · pitch Ø ${mm(D.bigD.pd)} mm · outside Ø ${mm(D.bigD.od)} mm · Ø10 bore · 3 × M3 to a printed hub Ø24 × 7.5 with an M4 cross bolt through the shaft</td></tr>
       <tr><th>${ch?'Chain':'Gears'}</th><td>${ch?`#25 (pitch 6.35), <b>${D.links} links</b> + 1 connecting link`:'module 2, 20°, 12 mm wide, PETG / PA 100 %'} · centre distance <b>${mm(D.CC)} mm</b></td></tr>
       <tr><th>Motor bracket</th><td>${ch?(oldOK?'<span class="ok">fits the old slotted bracket (±2 mm)</span>':`new base: motor ${mm(Math.abs(D.CC-OLD_CC))} mm ${D.CC<OLD_CC?'closer to':'further from'} the pivot (slots ±2 mm for tension)`):'new bracket with round holes – centre distance within ±0.2 mm'} · motor face plate ${mm(D.PL0)}–${mm(D.PL1)} mm from the robot centre</td></tr>
       <tr><th>Hammer shaft</th><td>Ø10 steel, ${mm(D.shaftL)} mm long</td></tr>
       <tr><th>Torque (arm level)</th><td>needs ${pf.need.toFixed(2)} N·m · usable ${pf.use.toFixed(2)} N·m (half stall) · <b>margin × ${pf.margin.toFixed(1)}</b></td></tr>
       <tr><th>Front hit</th><td>${pf.stalled?'stalls':`<b>${pf.T.toFixed(2)} s</b> from rest · head <b>${pf.v.toFixed(1)} m/s</b> · hammer energy <b>${pf.E.toFixed(2)} J</b> (+ ${pf.Er.toFixed(2)} J in the spinning motor – the gearbox takes that at the hit)`}</td></tr>`}
      </table>
      <h3>Compare all options (click a row)</h3>
      <table class="hdcmp"><tr><th>Drive</th><th>Ratio</th><th>Time to hit</th><th>Head speed</th><th>Energy</th><th>Torque margin</th></tr>`;
      for(const x of HD_OPTS){const q=perf(x);
        h+=`<tr data-id="${x.id}" class="${x.id===o.id?'sel':''}"><td>${x.type==='direct'?'<b>direct on motor</b>':(x.type==='chain'?'chain':'gears')+` ${x.n1}T→${x.n2}T`}</td><td>${rt(q.R)}</td><td>${q.stalled?'–':q.T.toFixed(2)+' s'}</td><td>${q.stalled?'–':q.v.toFixed(1)+' m/s'}</td><td>${q.stalled?'–':q.E.toFixed(2)+' J'}</td><td class="${q.margin<1.5?'bad':'ok'}">× ${q.margin.toFixed(1)}</td></tr>`;}
      h+='</table><p class="pm">Motor: GA25 170 rpm, 1.53 N·m stall (estimated), straight torque–speed line, direct 97 % / chain 90 % / printed gears 85 %. Motor rotor and gravity included. Time and speed: from the rear stop to the hit on a 10 cm high robot in front.</p>';
      hdUI.innerHTML=h;
      hdUI.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>{type=b.dataset.t;const first=HD_OPTS.find(x=>x.type===type&&x.n2/x.n1===DRV.R)||HD_OPTS.find(x=>x.type===type&&x.n2/x.n1>=1.5);pick(first.id);});
      hdUI.querySelector('#hdPair').onchange=e=>pick(e.target.value);
      hdUI.querySelector('#hdMass').onchange=e=>{HDM.head=Math.max(10,Math.min(600,+e.target.value||HD_HEAD_G));draw();};
      hdUI.querySelector('#hdFront').onclick=()=>SEQ.front();hdUI.querySelector('#hdRear').onclick=()=>SEQ.rear();
      hdUI.querySelector('#hdZoom').onclick=()=>camTo('hdrive');hdUI.querySelector('#hdHam').onclick=()=>camTo('hammer');
      hdUI.querySelectorAll('tr[data-id]').forEach(r=>r.onclick=()=>{type=HD_OPTS.find(x=>x.id===r.dataset.id).type;pick(r.dataset.id);});
    }
    draw();
  }

  // labels
  const L=[
    ['1','Shovel blade',anchor(bladeG,0,3,8)],
    ['2','Dead axle Ø8 + knuckles',anchor(shovelFixed,BLADE_HW+.8,H.y+.9,H.z)],
    ['3','Crank 37.5 + rod 55 mm',anchor(outs[0].g,-1.8,1.5,2)],
    ['4','2× GA25 170 rpm on L-brackets',anchor(shovelFixed,-6.6,SM.y+1.4,SM.z)],
    ['5','Hex coupler 18 mm (12 mm hex)',anchor(outs[1].g,2.7,1.0,0)],
    ['6','Printed cheek plates → side panels (M4)',anchor(shovelFixed,-CHEEK_X,5.4,9)],
    ['7','Hammer stick 20×20 plywood (2 × 10 mm)',anchor(hammerRot,0,-11,-1.6)],
    ['8','Small head – hits front and back',anchor(head,0,2,0)],
    ['9','Uprights + 6000 bearings',upLbl],
    ['10','GA25 + hammer drive',motLbl],
    ['13','Stop posts (TPU)',anchor(hammerFixed,0,FRONT_STOP_P[1]+.5,FRONT_STOP_P[0])],
    ['14','Drive: GA25 in panel pocket + hex coupler',anchor(robot,W_OUT+.2,motorY+2.6,CFG.wheelZ+2.3)],
  ];
  LABELS=L.map(([n,t,a])=>{const d=document.createElement('div');d.className='lbl';d.innerHTML=`<i>${n}</i><span>${t}</span>`;labelsEl.appendChild(d);return{d,a,n};});
  driveLblHook=()=>{const set=(n,t)=>{const l=LABELS.find(x=>x.n===n);if(l)l.d.querySelector('span').textContent=t;};
    if(DRV.direct){upLbl.position.set(DIR_X0+DIR_T/2,HP.y+2.4,HP.z-2);set('9','Printed upright, motor in a Ø26 pocket');set('10','GA25 – hammer hub on its hex coupler');}
    else{upLbl.position.set(-2.9,HP.y+2.2,HP.z);set('9','Uprights + 6000 bearings');set('10','GA25 + hammer drive');}};
  driveLblHook();

  // ---- overall size: width / length / height dimension lines on the model, measured from every visible part
  const sizeG=new THREE.Group();robot.add(sizeG);
  const sizeMat=new THREE.MeshBasicMaterial({color:0x4fd1ff,depthTest:false});
  const unitCyl=new THREE.CylinderGeometry(1,1,1,8),unitCone=new THREE.ConeGeometry(.22,.6,12),UP=new THREE.Vector3(0,1,0);
  const sizeBox=new THREE.Box3Helper(new THREE.Box3(),0x4fd1ff);sizeBox.material.transparent=true;sizeBox.material.opacity=.35;sizeG.add(sizeBox);
  function seg(r){const m=new THREE.Mesh(unitCyl,sizeMat);m.renderOrder=999;sizeG.add(m);
    return (A,B)=>{const d=B.clone().sub(A),L=d.length();m.visible=L>1e-3;if(!m.visible)return;
      m.position.copy(A).add(B).multiplyScalar(.5);m.scale.set(r,L,r);m.quaternion.setFromUnitVectors(UP,d.normalize());};}
  function sizeDim(name,limit){
    const line=seg(.06),ext=[seg(.025),seg(.025)],cones=[0,1].map(()=>{const c=new THREE.Mesh(unitCone,sizeMat);c.renderOrder=999;sizeG.add(c);return c;});
    const a=new THREE.Object3D();sizeG.add(a);
    const d=document.createElement('div');d.className='lbl sizelbl';sizeEl.appendChild(d);SIZE_LBL.push({d,a});
    return (A,B,PA,PB)=>{   // dimension line A→B; extension lines from the measured edges PA, PB
      const dir=B.clone().sub(A).normalize(),len=A.distanceTo(B);
      line(A.clone().addScaledVector(dir,.3),B.clone().addScaledVector(dir,-.3));
      [[PA,A],[PB,B]].forEach(([P,Q],i)=>{const e=Q.clone().sub(P);ext[i](P,e.lengthSq()>1e-6?Q.clone().addScaledVector(e.normalize(),.6):P);});
      [[A,dir],[B,dir.clone().negate()]].forEach(([P,dn],i)=>{cones[i].position.copy(P).addScaledVector(dn,.3);cones[i].quaternion.setFromUnitVectors(UP,dn.clone().negate());});
      a.position.copy(A).add(B).multiplyScalar(.5);
      const over=len>limit+1e-6;d.classList.toggle('over',over);
      d.innerHTML=`<span>${name} ${(len*10).toFixed(0)} mm${over?` ✖ over ${limit*10}`:''}</span>`;};
  }
  const SZ={w:sizeDim('Width',55),l:sizeDim('Length',55),h:sizeDim('Height',30)};
  const _sv=new THREE.Vector3(),_sm=new THREE.Matrix4(),_si=new THREE.Matrix4(),V3=(x,y,z)=>new THREE.Vector3(x,y,z);
  function updateSize(){
    if(!sizeG.visible)return;
    robot.updateMatrixWorld(true);_si.copy(robot.matrixWorld).invert();const bb=sizeBox.box.makeEmpty();
    robot.traverse(o=>{if(!o.isMesh||!o.userData.part)return;for(let p=o;p&&p!==robot;p=p.parent)if(!p.visible)return;
      _sm.multiplyMatrices(_si,o.matrixWorld);const U=uniquePts(o.geometry);
      for(let i=0;i<U.length;i+=3){_sv.set(U[i],U[i+1],U[i+2]).applyMatrix4(_sm);bb.expandByPoint(_sv);}});
    const {min:n,max:x}=bb,g=3;   // dimension lines 3 cm outside the robot, on the floor / at the rear right corner
    SZ.w(V3(n.x,n.y,n.z-g),V3(x.x,n.y,n.z-g),V3(n.x,n.y,n.z),V3(x.x,n.y,n.z));
    SZ.l(V3(x.x+g,n.y,n.z),V3(x.x+g,n.y,x.z),V3(x.x,n.y,n.z),V3(x.x,n.y,x.z));
    SZ.h(V3(x.x+g,n.y,n.z-g),V3(x.x+g,x.y,n.z-g),V3(x.x+g,n.y,n.z-g),V3(x.x,x.y,n.z));
  }
  centreEnvelope();
  afterApply=updateSize;
  tgl('tSize',v=>{sizeG.visible=v;sizeEl.style.display=v?'':'none';updateSize();});

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
  if(Q.size==='0')document.getElementById('tSize').click();
  if(Q.hammer)S.hammer=+Q.hammer;
  if(Q.shovel)S.crank=+Q.shovel;
  if(Q.exp){sE.value=Q.exp;sE.oninput();}
  syncSliders();
  if(Q.tab){const t=document.querySelector(`#tabs button[data-pg="${Q.tab}"]`);if(t)t.click();}
  if(Q.instant==='1')window.__instantCam=true;
  if(Q.mark){setTimeout(()=>{const r=[...document.querySelectorAll('.pickrow')].find(r=>r.querySelector('.pnum,.mnum').textContent===Q.mark);if(r){r.click();r.scrollIntoView({block:'nearest'});}},400);}
  if(Q.check==='1')setTimeout(()=>document.getElementById('runClash').click(),300);
  if(Q.hpmode)setTimeout(()=>window.__hpMode&&window.__hpMode(+Q.hpmode),600);

  // ---- highlight a part / show a measurement in the 3D view
  const M_HI=new THREE.MeshStandardMaterial({color:0xff7a1a,emissive:0xb33a00,emissiveIntensity:.35,roughness:.55});
  const M_GHOST=new THREE.MeshStandardMaterial({color:0x7d8a99,transparent:true,opacity:.1,depthWrite:false});
  const M_MATE=new THREE.MeshStandardMaterial({color:0x4fa3ff,transparent:true,opacity:.45,roughness:.6,depthWrite:false});
  const dimG=new THREE.Group();robot.add(dimG);
  const lineMat=new THREE.LineBasicMaterial({color:0xffd23f,depthTest:false}),arrMat=new THREE.MeshBasicMaterial({color:0xffd23f,depthTest:false});
  const match=(o,n)=>typeof n==='string'?(n.endsWith('*')?o.userData.part.startsWith(n.slice(0,-1)):o.userData.part===n):(o.userData.part===n.p&&o.userData.grp===n.g);
  function clearHi(){
    robot.traverse(o=>{if(o.isMesh&&o.userData.mat0){o.material=o.userData.mat0;delete o.userData.mat0;}
      if(o.userData&&o.userData.vis0!==undefined){o.visible=o.userData.vis0;delete o.userData.vis0;}});
    if(floor.userData.vis0!==undefined){floor.visible=floor.userData.vis0;grid.visible=grid.userData.vis0;delete floor.userData.vis0;}
    window.__dimK=1;
    if(envelope.userData.vis0!==undefined){envelope.visible=envelope.userData.vis0;delete envelope.userData.vis0;}
    dimG.clear();DYN.forEach(d=>d.d.remove());DYN.length=0;LABELS.forEach(l=>l.d.style.display='');
    const so=document.getElementById('tSize').classList.contains('on');sizeG.visible=so;sizeEl.style.display=so?'':'none';updateSize();
    document.querySelectorAll('.pickrow').forEach(r=>r.classList.remove('sel'));
  }
  function dimLine(a,b,text,off){
    const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),len=A.distanceTo(B);
    const K=window.__dimK||1,ah=Math.min(.5*K,len*.3),lr=Math.min(.07*K,Math.max(.012,len*.03));   // short measurements / small parts get small arrows
    const l=new THREE.Mesh(new THREE.CylinderGeometry(lr,lr,Math.max(len-2*ah,.01),8),arrMat);l.renderOrder=999;
    l.position.copy(A).add(B).multiplyScalar(.5);l.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),B.clone().sub(A).normalize());dimG.add(l);
    for(const [P,Q] of[[A,B],[B,A]]){const c=new THREE.Mesh(new THREE.ConeGeometry(ah*.36,ah,12),arrMat);c.renderOrder=999;
      c.position.copy(P).add(Q.clone().sub(P).normalize().multiplyScalar(ah/2));c.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),P.clone().sub(Q).normalize());dimG.add(c);}
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
    LABELS.forEach(l=>l.d.style.display='none');sizeG.visible=false;sizeEl.style.display='none';   // one part at a time: hide the overall size
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
  // ---- print part: length / width / height lines in the part's own frame (the same numbers as the print list)
  const pdMat=new THREE.MeshBasicMaterial({color:0xffd23f,depthTest:false});
  function pdArrow(A,B,r){   // A, B in robot coordinates; arrow size follows the length so small parts stay readable
    const d=B.clone().sub(A),L=d.length(),u=d.clone().normalize(),h=Math.min(.5,L*.22),add=m=>{m.renderOrder=999;dimG.add(m);return m;};
    if(r){const m=add(new THREE.Mesh(unitCyl,pdMat));m.position.copy(A).add(B).multiplyScalar(.5);m.scale.set(r,L,r);m.quaternion.setFromUnitVectors(UP,u);return;}
    const m=add(new THREE.Mesh(unitCyl,pdMat)),rr=Math.max(.012,h*.12);m.position.copy(A).add(B).multiplyScalar(.5);m.scale.set(rr,Math.max(L-2*h,.001),rr);m.quaternion.setFromUnitVectors(UP,u);
    for(const [P,dn] of[[A,u],[B,u.clone().negate()]]){const c=add(new THREE.Mesh(unitCone,pdMat));c.scale.setScalar(h/.6);c.position.copy(P).addScaledVector(dn,h/2);c.quaternion.setFromUnitVectors(UP,dn.clone().negate());}
  }
  function partDims(pp){
    const r=partBox(pp);if(!r)return;
    const {root,bb}=r,sz=bb.getSize(new THREE.Vector3()).toArray(),n=bb.min.toArray(),x=bb.max.toArray();
    const M=new THREE.Matrix4().copy(robot.matrixWorld).invert().multiply(root.matrixWorld),toR=a=>new THREE.Vector3(...a).applyMatrix4(M);
    const ol=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(...sz)),new THREE.LineBasicMaterial({color:0xffd23f,transparent:true,opacity:.45,depthTest:false}));
    ol.renderOrder=999;ol.matrixAutoUpdate=false;ol.matrix.copy(M).multiply(new THREE.Matrix4().makeTranslation(...bb.getCenter(new THREE.Vector3()).toArray()));dimG.add(ol);
    const off=Math.max(.35,Math.max(...sz)*.1);
    [0,1,2].sort((a,b)=>sz[b]-sz[a]).forEach((a,k)=>{   // longest = length, then width, thinnest = height (as printed flat)
      const p0=n.slice(),p1=n.slice();p1[a]=x[a];const q0=p0.slice(),q1=p1.slice();
      for(const b of[0,1,2])if(b!==a){q0[b]-=off;q1[b]-=off;}
      const A=toR(q0),B=toR(q1),P0=toR(p0),P1=toR(p1),ext=Math.max(.008,Math.min(.5,A.distanceTo(B)*.22)*.05);
      pdArrow(A,B);pdArrow(P0,A.clone().addScaledVector(A.clone().sub(P0).normalize(),off*.25),ext);pdArrow(P1,B.clone().addScaledVector(B.clone().sub(P1).normalize(),off*.25),ext);
      addMarker(A.clone().add(B).multiplyScalar(.5),'',`${['length','width','height'][k]} ${(sz[a]*10).toFixed(0)} mm`,true);
    });
  }
  function saveFile(name,buf){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([buf],{type:'model/stl'}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000);}
  // ---- print parts tab
  const pl=document.getElementById('printList'),ml=document.getElementById('measList');
  if(pl){
    const ids=['bedX','bedY','bedZ'],inp=ids.map(i=>document.getElementById(i));
    try{const sv=JSON.parse(localStorage.getItem('mmBed')||'null');if(sv)inp.forEach((e,i)=>e.value=sv[i]);}catch(e){}
    const draw=()=>{const bed=inp.map(e=>+e.value||0);try{localStorage.setItem('mmBed',JSON.stringify(bed));}catch(e){}
      let h='';
      printRows().forEach((r,i)=>{const d=r.dims,ok=d&&fitsBed(d,bed),pp=r.pp;
        h+=`<div class="pickrow" data-i="${i}"><div class="prh"><i class="pnum">${pp.id}</i><b>${pp.name}</b><span class="pq">× ${pp.qty}</span><span class="psz">${d?d.map(x=>x.toFixed(0)).join(' × ')+' mm':''}</span><span class="${ok?'ok':'bad'}">${ok?'✔ fits':'✖ too big – split'}</span></div>
          <div class="pw">${pp.what}</div><ul>${pp.holes().map(x=>`<li>${x}</li>`).join('')}</ul><div class="pm">Plastic: ${pp.mat} · Fill: ${pp.infill} · Supports: ${pp.sup||'none'}${pp.g?` · ≈ ${pp.g} g each (≈ ${Math.round(pp.g*PRINT_EGP_G)} EGP)`:''}</div>
          <div class="dl">${pp.side?`<button class="stlbtn" data-i="${i}" data-s="1">⬇ STL right</button><button class="stlbtn" data-i="${i}" data-s="-1">⬇ STL left</button>`:`<button class="stlbtn" data-i="${i}" data-s="1">⬇ STL</button>`}</div></div>`;});
      pl.innerHTML=h;
      pl.querySelectorAll('.stlbtn').forEach(b=>b.onclick=e=>{e.stopPropagation();const pp=PRINT_PARTS[+b.dataset.i],sd=+b.dataset.s;
        saveFile(`${pp.id}_${pp.name.replace(/\W+/g,'_')}${pp.side?(sd>0?'_RIGHT':'_LEFT'):''}.stl`,partSTL(pp,sd));});
      pl.querySelectorAll('.pickrow').forEach(row=>row.onclick=()=>{const pp=PRINT_PARTS[+row.dataset.i];const was=row.classList.contains('sel');clearHi();if(was)return;
        highlight(pp.parts,{num:pp.id,title:pp.name+' × '+pp.qty});partDims(pp);row.classList.add('sel');});};
    inp.forEach(e=>e.oninput=draw);draw();
    const dt=document.getElementById('dlTest'),da=document.getElementById('dlAll');
    if(dt)dt.onclick=()=>saveFile('T0_Hole_test_piece.stl',testPieceSTL());
    if(da)da.onclick=async()=>{for(const f of allSTL()){saveFile(f.name,f.buf);await new Promise(r=>setTimeout(r,300));}};
    const dg=document.getElementById('dlRobotGLB'),ds=document.getElementById('dlRobotSTL');
    if(dg)dg.onclick=()=>saveFile('Metal_Monster_robot.glb',robotGLB());
    if(ds)ds.onclick=()=>saveFile('Metal_Monster_robot.stl',robotSTL());
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

  // ---- Hammer parts tab: assembly drawing along the shaft + one card per part with a dimensioned drawing (mm)
  const hpUI=document.getElementById('hpUI');
  if(hpUI){
    const n1=v=>{const r=Math.round(v*10)/10;return Math.abs(r-Math.round(r))<1e-6?String(Math.round(r)):r.toFixed(1);};
    let FS=3.2,MK=0;
    const L=(x1,y1,x2,y2,c='dm',ex='')=>`<line class="${c}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" ${ex}/>`;
    const T=(x,y,s,a='middle',c='dt',rot=0)=>`<text class="${c}" x="${x}" y="${y}" font-size="${FS}" text-anchor="${a}"${rot?` transform="rotate(${rot} ${x} ${y})"`:''}>${s}</text>`;
    const Rr=(x,y,w,h,c='pt')=>`<rect class="${c}" x="${Math.min(x,x+w)}" y="${Math.min(y,y+h)}" width="${Math.abs(w)}" height="${Math.abs(h)}"/>`;
    const C=(x,y,r,c='ho')=>`<circle class="${c}" cx="${x}" cy="${y}" r="${r}"/>`;
    const PG=(pts,c='pt')=>`<polygon class="${c}" points="${pts.map(p=>p.join(',')).join(' ')}"/>`;
    const AR=()=>`marker-start="url(#ar${MK})" marker-end="url(#ar${MK})"`;
    const DH=(x1,x2,y,yRef,txt)=>{const s=Math.sign(y-yRef)||1;return L(x1,yRef,x1,y+s*1.2,'ex')+L(x2,yRef,x2,y+s*1.2,'ex')+L(x1,y,x2,y,'dm',AR())+T((x1+x2)/2,y-FS*.3,txt??n1(Math.abs(x2-x1)));};
    const DV=(y1,y2,x,xRef,txt)=>{const s=Math.sign(x-xRef)||1;return L(xRef,y1,x+s*1.2,y1,'ex')+L(xRef,y2,x+s*1.2,y2,'ex')+L(x,y1,x,y2,'dm',AR())+T(x-FS*.3,(y1+y2)/2,txt??n1(Math.abs(y2-y1)),'middle','dt',-90);};
    const LD=(x,y,tx,ty,txt,a='start')=>L(x,y,tx,ty,'ld')+T(tx+(a==='start'?.8:-.8),ty+FS*.35,txt,a,'lt');
    const NUM=(x,y,n)=>`<circle class="nb" cx="${x}" cy="${y}" r="${FS*1.25}"/><text class="nt" x="${x}" y="${y+FS*.3}" font-size="${FS*.8}" text-anchor="middle">${n}</text>`;
    const SV=(x0,y0,w,h,body,maxW=460)=>{const id=MK;return `<svg class="dw" viewBox="${x0} ${y0} ${w} ${h}" style="max-width:${maxW}px"><defs><marker id="ar${id}" viewBox="0 0 10 10" refX="10" refY="5" markerUnits="userSpaceOnUse" markerWidth="${FS}" markerHeight="${FS}" orient="auto-start-reverse"><path d="M0,1.5 L10,5 L0,8.5 z" fill="#ffd23f"/></marker></defs>${body}</svg>`;};
    const begin=fs=>{FS=fs;MK++;};
    const M_=v=>v*10;   // model cm -> mm

    function stackSVG(D){   // front view (seen from the robot's front), hammer standing straight up; y up = -svg y
      begin(4.2);const Y=v=>-v,lid=-M_(HP.y-DECK_TOP),my=M_(D.MOT.y-HP.y),bw=M_(D.w),x0=M_(HD_X0);
      const sx0=-M_(UP_X1+.4),sx1=M_(HD_X0+D.w+.15),hubR=M_(D.hubR),bigR=D.bigD.od*5,smR=D.small.od*5,pl0=M_(D.PL0),pl1=M_(D.PL1),hx=M_(D.hx);
      let b='';
      b+=Rr(-100,Y(lid),200,5,'lid')+Rr(-74.5,Y(lid-5),149,4,'pt');
      for(const s of[-1,1]){
        b+=Rr(s*24.5,Y(lid),s*9,-(20-lid),'pt');                                         // upright
        b+=Rr(s*25,Y(13),s*8,26,'mt')+Rr(s*25,Y(5),s*8,10,'ho');                          // bearing
        b+=Rr(s*33.5,Y(18),s*2.5,10,'pr')+Rr(s*33.5,Y(-8),s*2.5,10,'pr');                  // retainer (section)
        b+=Rr(s*16.75,Y(9),s*7.5,18,'mt');                                                 // collar
        for(const [f,o] of[[24.5,-1],[33.5,1]]){const xf=s*f,d=s*o;                        // alu angles
          b+=PG([[xf,Y(lid)],[xf,Y(lid+20)],[xf+d*2,Y(lid+20)],[xf+d*2,Y(lid+2)],[xf+d*20,Y(lid+2)],[xf+d*20,Y(lid)]],'mt');
          b+=L(xf+d*13,Y(lid+3.5),xf+d*13,Y(lid-12),'bl');}
        b+=L(s*20,Y(lid+12),s*38,Y(lid+12),'bl');
      }
      b+=Rr(sx0,Y(5),sx1-sx0,10,'mt');                                                     // shaft
      b+=Rr(-16.5,Y(40),33,55,'pt')+Rr(-10,Y(95),20,85,'pt2')+L(0,Y(95),0,Y(10),'brk');                              // hub + stick (up)
      b+=L(-10,Y(95),10,Y(92),'brk');
      for(const y of[22,34])b+=L(-18.5,Y(y),18.5,Y(y),'bl');
      b+=C(0,0,2.15,'blc');
      b+=Rr(37,Y(hubR),x0-37,2*hubR,'pr')+C(40.75,0,2.15,'blc');                          // drive hub + cross bolt
      b+=Rr(x0,Y(bigR),bw,2*bigR,D.chain&&!D.onePiece?'mt':'pr');                          // hammer sprocket / gear
      if(!D.onePiece)for(const y of[8.5,-8.5])b+=L(x0+bw,Y(y),x0+bw+3,Y(y),'bl');
      if(D.chain)b+=Rr(M_(HD_X0+SPR_W/2)-2.6,Y(bigR),5.2,bigR-(my-smR),'ch');               // chain (seen edge-on)
      b+=Rr(x0,Y(my+smR),bw,2*smR,'pr');                                                   // motor sprocket / gear
      if(D.chain)b+=Rr(x0+bw,Y(my+8.5),hx+7-x0-bw,17,'pr');
      b+=Rr(hx,Y(my+6.9),7,13.8,'brs')+Rr(hx+7,Y(my+5.75),pl0-.5-hx-7,11.5,'brs');          // coupler
      b+=L(x0-3,Y(my),hx+9,Y(my),'bl');
      b+=Rr(pl0,Y(lid),pl1-pl0,-(my+13.5-lid),'pr')+Rr(pl0-8,Y(lid+3),M_(Math.min(D.PL1+2.65,9.55)-.4)-pl0+8,3,'pr');
      b+=Rr(pl1,Y(my+12.5),19,25,'mo')+Rr(pl1+19,Y(my+12.2),30.8,24.4,'mo')+Rr(pl1+49.8,Y(my+3.25),4,6.5,'mo');
      b+=L(-45,0,sx1+6,0,'cl')+L(-45,Y(my),pl1+60,Y(my),'cl');
      // callouts
      b+=NUM(-29,Y(30),'H1')+NUM(-42,Y(-10),'H2')+NUM(-19,Y(lid+26),'H14')+NUM(-44,Y(12),'H11')+NUM(19.5,Y(19),'H13')+NUM(0,Y(48),'H3')+NUM(0,Y(78),'H4')
        +NUM(41,Y(hubR+7),'H6')+NUM(x0+bw/2,Y(bigR+7),'H7')+(my-smR-8>lid+6?NUM(x0+bw/2,Y(my-smR-8),'H8'):NUM(x0+bw+16,Y(my-smR+2),'H8'))+NUM((pl0+pl1)/2,Y(my+22),'H9')+NUM(pl1+34,Y(my+19),'H16');
      b+=T(-48,Y(103),`↑ the stick goes on up to the head (head centre ${M_(ARM_L)} mm from the shaft)`,'start','lt');
      b+=T((sx0+sx1)/2,Y(lid-18),`shaft Ø10 × ${n1(sx1-sx0)}  ·  hammer shaft axis ${n1(-lid)} mm above the lid`,'middle','lt');
      const w=Math.max(pl1+60,sx1+10)+52;return SV(-50,-112,w,112+(-lid)+30,b,900);
    }
    // ---- part drawings
    function uprightSVG(){
      begin(3.4);const ub=M_(HP.z+5.5),vb=M_(HP.y-DECK_TOP),pts=[[0,0],[80,0],[70,58],[65,78],[15,78],[10,58]],Y=v=>-v;
      let b=PG(pts.map(([u,v])=>[u,Y(v)]),'pt')+C(ub,Y(vb),13);
      RET_A.forEach(a=>b+=C(ub+15.5*Math.cos(a),Y(vb+15.5*Math.sin(a)),1));
      b+=`<circle class="cl" cx="${ub}" cy="${Y(vb)}" r="15.5"/>`;
      ANG_Z.forEach(z=>b+=C(M_(z+5.5),Y(12),2.25));
      b+=DH(0,80,9,0)+DV(0,-78,-8,0)+DH(15,65,-85,-78)+DH(0,ub,16,0)+DV(0,-vb,88,80)+DH(0,15,23,0)+DH(65,80,23,0);
      b+=LD(ub+9,Y(vb+9),ub+24,Y(vb+28),'Ø26 bearing seat')+LD(ub+15.5*Math.cos(RET_A[1]),Y(vb+15.5*Math.sin(RET_A[1])),-14,Y(46),'3 × Ø2 pilot, Ø31 circle','start');
      b+=LD(17,Y(12),28,Y(24),'2 × Ø4.5, 12 up');
      b+=T(40,33,'← rear&#160;&#160;&#160;&#160;&#160;&#160;&#160;&#160;&#160;front →','middle','lt');
      return SV(-22,-94,128,132,b);
    }
    function retainerSVG(){
      begin(3);let b=C(0,0,18,'pr')+C(0,0,8);RET_A.forEach(a=>b+=C(15.5*Math.cos(a),-15.5*Math.sin(a),1.4));
      b+=DH(-18,18,25,0,'Ø36')+DH(-8,8,-22,0,'Ø16')+LD(15.5*Math.cos(RET_A[2]),-15.5*Math.sin(RET_A[2]),24,10,'3 × Ø2.8 on Ø31');
      return SV(-28,-30,78,62,b,260);
    }
    function angleSVG(){
      begin(2.6);let b=PG([[0,0],[0,-20],[2,-20],[2,-2],[20,-2],[20,0]],'mt')+L(-3,-12,5,-12,'bl')+L(13,3,13,-5,'bl');
      b+=DV(0,-12,-6,0,'12')+DH(0,13,7,0,'13')+DV(0,-20,26,20,'20')+T(10,-24,'end view','middle','lt');
      b+=Rr(36,-24,20,24,'mt')+C(49,-12,2.25)+DH(36,49,6,0,'13')+DV(-24,-12,62,56,'12')+T(46,-27,'base leg, 24 long','middle','lt');
      return SV(-12,-32,82,46,b,330);
    }
    function shaftSVG(D){
      begin(3.4);const sx0=-M_(UP_X1+.4),sx1=M_(HD_X0+D.w+.15),Lh=sx1-sx0,h1=-sx0,h2=40.75-sx0;
      let b=Rr(0,-5,Lh,10,'mt')+C(h1,0,2.1)+C(h2,0,2.1);
      b+=DH(0,Lh,14,5)+DH(0,h1,-11,-5)+DH(0,h2,-18,-5)+DV(-5,5,-5,0,'Ø10');
      b+=LD(h1,2,h1+6,24,'Ø4.2 – hammer hub');b+=LD(h2,2,h2+6,30,'Ø4.2 – drive hub');
      return SV(-12,-26,Lh+60,62,b,520);
    }
    function hubSVG(){
      begin(3.2);let b='';
      // front view: x across, y down from the top of the hub
      b+=Rr(0,0,33,55,'pt')+Rr(0,10,33,10,'hd')+C(16.5,15,2.15)+Rr(6.35,25,20.3,30,'hd');
      for(const y of[37,49])b+=Rr(0,y-2.15,33,4.3,'hd');
      b+=DH(0,33,-5,0)+DV(0,55,-6,0)+DV(0,15,39,33)+DV(25,55,45,33,'30')+DH(6.35,26.65,60,55,'slot 20.3')+DV(0,37,-14,0)+DV(0,49,-22,0)+T(16.5,71,'front view (shaft goes left–right)','middle','lt');
      // side view
      const o=65;b+=Rr(o,0,33,55,'pt')+C(o+16.5,15,5)+Rr(o,12.85,33,4.3,'hd')+Rr(o+6.35,25,20.3,30,'hd')+C(o+16.5,37,2.15)+C(o+16.5,49,2.15);
      b+=DH(o,o+33,-5,0)+DH(o+6.35,o+26.65,60,55,'20.3')+T(o+16.5,68,'side view (along the shaft)','middle','lt');
      b+=LD(o+21.5,15,o+43,4,'Ø10 shaft')+LD(o+31.5,15,o+43,22,'Ø4.3 cross bolt')+LD(o+18.5,37,o+43,38,'2 × Ø4.3 stick bolts');
      return SV(-28,-12,o+83+28,86,b,480);
    }
    function stickSVG(){   // laser outline: T = stick + middle of the head, top of the stick on the left
      begin(5);const len=M_(ARM_L+HEAD.y/2-1),hl=M_(HEAD.y),hz=M_(HEAD.z)/2;
      let b=PG([[0,-10],[len-hl,-10],[len-hl,-hz],[len,-hz],[len,hz],[len-hl,hz],[len-hl,10],[0,10]],'pt2');
      for(const x of[12,24,len-17.5])b+=C(x,0,2.15);
      b+=Rr(0,-10,30,20,'hd');
      b+=DH(0,len,hz+8,hz)+DV(-10,10,-6,0,'20')+DH(0,12,-16,-10)+DH(0,24,-24,-10)+DH(len-17.5,len,-hz-6,-hz)+DV(-hz,hz,len+8,len);
      b+=T(15,8.5,'in hub','middle','lt')+T(len/2,4,'laser cut from 10 mm · cut 2, glue face to face = 20 · 3 × Ø4.3','middle','lt');
      return SV(-16,-hz-12,len+36,2*hz+26,b,620);
    }
    function headSVG(){
      begin(3.2);let b='';const W=64,H=25;
      b+=Rr(0,0,W,H,'pt')+C(32,7.5,2.15);
      b+=DH(0,W,-6,0)+DV(0,H,-9,0)+DV(0,7.5,74,W,'7.5');
      b+=T(32,44,'side plate (laser cut, 10 thick, × 2)','middle','lt');
      const o=92;b+=Rr(o,0,W,10,'pt')+Rr(o,10,W,10,'pt2')+Rr(o,20,W,10,'pt2')+Rr(o,30,W,10,'pt')+DH(o,o+W,-6,0)+DV(0,40,o+W+7,o+W,'40')+DV(10,30,o-4,o,'20');
      b+=T(o+32,21.5,'T ends of the 2 stick layers','middle','lt')+T(o+32,50,'top view: plate + 2 stick layers + plate','middle','lt');
      return SV(-18,-22,o+W+30,96,b,560);
    }
    function dhubSVG(D){
      begin(3);const r=M_(D.hubR);let b=C(0,0,r,'pr')+C(0,0,5);
      if(!D.onePiece)for(let k=0;k<3;k++){const a=k*2*Math.PI/3;b+=C(8.5*Math.sin(a),-8.5*Math.cos(a),2);}
      b+=DH(-r,r,r+7,0,'Ø'+n1(2*r))+DH(-5,5,-r-5,0,'Ø10');
      const o=r+22;b+=Rr(o,-r,7.5,2*r,'pr')+Rr(o,-5,7.5,10,'hd')+Rr(o+1.6,-r,4.3,2*r,'hd')+DH(o,o+7.5,r+7,r,'7.5');
      b+=LD(o+3.75,-r+2,o+14,-r-4,'Ø4.3 cross bolt, through');
      if(!D.onePiece)b+=LD(8.5*Math.sin(2*Math.PI/3),-8.5*Math.cos(2*Math.PI/3),-r-4,r+14,'3 × Ø4 for M3 heat-set inserts, Ø17 circle','start');
      return SV(-r-10,-r-14,2*r+o+78,2*r+38,b,420);
    }
    function gearSVG(n,od,pd,inner,label){
      begin(Math.max(3,od/22));const R=od/2;let b=C(0,0,R,'pr')+`<circle class="cl" cx="0" cy="0" r="${pd/2}"/>`+inner;
      b+=DH(-R,R,R+FS*2.2,0,'Ø'+n1(od)+' outside')+T(0,-R-FS*1.2,label,'middle','lt');
      return SV(-R-FS*2,-R-FS*3,2*R+FS*4,2*R+FS*6.5,b,Math.min(300,140+od*1.8));
    }
    function hexIn(af){const r=af/Math.sqrt(3);return PG([0,1,2,3,4,5].map(k=>[r*Math.cos(k*Math.PI/3),r*Math.sin(k*Math.PI/3)]),'ho');}
    function bracketSVG(D){
      begin(3.2);const h=M_(D.MOT.y-DECK_TOP),Y=v=>-v;
      let b=PG([[-13.5,0],[13.5,0],[13.5,Y(h)],...arcPts(0,-h,13.5,0,-180,14).map(([z,y])=>[z,y]),[-13.5,Y(h)]],'pr');
      b+=C(0,Y(h),4)+C(0,Y(h-8.5),1.7)+C(0,Y(h+8.5),1.7);
      b+=DH(-13.5,13.5,8,0)+DV(0,Y(h),-20,-13.5,n1(h))+LD(4,Y(h),20,Y(h+18),'Ø8 for the gearbox nose')+LD(1.7,Y(h+8.5),20,Y(h+11),'2 × Ø3.4, 17 apart');
      b+=T(0,18,'face plate, 5 mm thick','middle','lt');
      const o=86,len=M_(Math.min(D.PL1+2.65,9.55)-.4-(D.PL0-.8)),b1=4.5,b2=M_(WALL_X+.4-(D.PL0-.8));
      b+=Rr(o,Y(13.5),len,27,'pr');for(const bx of[b1,b2])for(const dz of[-8,8])b+=D.chain?Rr(o+bx-1.7,Y(dz+3.7),3.4,7.4,'ho'):C(o+bx,Y(dz),1.7);
      b+=Rr(o+8,Y(13.5),5,27,'hd');
      b+=DH(o,o+len,8+13.5-13.5+8,13.5)+DH(o,o+b1,-20,-13.5)+DH(o,o+b2,-27,-13.5)+DV(Y(8),Y(-8),o+len+6,o+len,'16');
      b+=T(o+len/2,26,'base plate, 3 mm thick','middle','lt');if(D.chain)b+=T(o+len/2,31,'slots ±2 mm to tension the chain','middle','lt');
      return SV(-30,Y(h+24),o+len+44,h+24+38,b,560);
    }
    function stopSVG(){
      begin(4.4);let b='';const P2=[[REAR_STOP_P,'rear'],[FRONT_STOP_P,'front']];let o=0;
      for(const [p,nm] of P2){const hgt=M_(p[1]-DECK_TOP-.35);
        b+=Rr(o,-hgt,44,hgt,'pr')+Rr(o,-hgt-3.5,44,3.5,'tpu')+L(o+7,-hgt,o+7,3,'bl')+L(o+37,-hgt,o+37,3,'bl');
        b+=DH(o,o+44,10,0,'44')+DV(-hgt,0,o+51,o+44,n1(hgt))+T(o+22,-hgt-6,`${nm} post`,'middle','lt');o+=72;}
      b+=T(70,24,'12 mm thick · 3.5 mm TPU pad on top · 2 × M3, 30 apart','middle','lt');
      return SV(-8,-42,154,72,b,460);
    }

    // ---- the catalogue: every part needed for the hammer. parts = shown orange, mates = what it attaches to (blue),
    // feat() = measurements drawn on the part in 3D (robot coordinates, cm), pose = hammer angle used to show it
    const RP=(obj,x,y,z)=>{obj.updateWorldMatrix(true,false);const v=obj.localToWorld(new THREE.Vector3(x,y,z));robot.worldToLocal(v);return v.toArray();};
    const F=(x,y,z)=>RP(hammerFixed,x,y,z),HR=(x,y,z)=>RP(hammerRot,x,y,z);
    const dm=(a,b,t,off)=>[a,b,t,off];
    const BOLTS=['M2.5×10 retainer screw','M4×20 angle → lid + doubler','M4×20 angle → upright → angle','Cross bolt M4 through hub + shaft','M4 bolt hub → stick','M4 bolt head → stick',
      'Hammer drive: M4 cross bolt hub + shaft','Hammer drive: M3×10 screws into the hub','M4 screw + washer into coupler','M4 countersunk screw into coupler',
      'M3×16 through lid + doubler','M3×25 wood screw through lid into the side panel top','M3×8 countersunk GA25 → bracket','M3 stop post → lid'];
    const LID=['Kit lid (red)','Lid doubler 4 mm ply'];
    // ---- direct-on-motor design: drawings + parts list
    function stackDirectSVG(){
      begin(4.2);const Y=v=>-v,lid=-M_(HP.y-DECK_TOP),xf=M_(DIR_X0),xo=M_(DIR_X0+DIR_T),fc=M_(DIR_X0+DIR_WEB);let b='';
      b+=Rr(-100,Y(lid),200,5,'lid')+Rr(-74.5,Y(lid-5),149,4,'pt');
      b+=Rr(xf,Y(lid),xo-xf,-(20-lid),'pt')+Rr(fc,Y(13),xo-fc,26,'ho');                         // upright + pocket
      b+=PG([[xo,Y(lid)],[xo,Y(lid+20)],[xo+2,Y(lid+20)],[xo+2,Y(lid+2)],[xo+20,Y(lid+2)],[xo+20,Y(lid)]],'mt');
      b+=L(xo+13,Y(lid+3.5),xo+13,Y(lid-12),'bl')+L(xf-3,Y(lid+12),xo+4,Y(lid+12),'bl')+L((xf+xo)/2,Y(lid-10),(xf+xo)/2,Y(lid+18),'bl');
      b+=Rr(-16.5,Y(40),33,55,'pr')+Rr(-10,Y(95),20,85,'pt2')+L(0,Y(95),0,Y(10),'brk')+L(-10,Y(95),10,Y(92),'brk');      // hub + stick (hammer up)
      for(const y of[22,34])b+=L(-18.5,Y(y),18.5,Y(y),'bl');
      b+=Rr(8,Y(6.9),7,13.8,'brs')+Rr(15,Y(5.75),11,11.5,'brs')+L(-1,0,24,0,'bl');                 // coupler + M4 screw
      b+=Rr(fc,Y(12.5),19,25,'mo')+Rr(fc+19,Y(12.2),30.8,24.4,'mo')+Rr(fc+49.8,Y(3.25),4,6.5,'mo');
      b+=L(-30,0,fc+60,0,'cl');
      b+=NUM(xf-8,Y(30),'H1')+NUM(0,Y(48),'H2')+NUM(0,Y(78),'H3')+NUM(xo+12,Y(lid+10),'H6')+NUM(fc+34,Y(18),'H7')+NUM(17,Y(-12),'H7');
      b+=T(-28,Y(103),`↑ the stick goes on up to the head (head centre ${M_(ARM_L)} mm from the motor axis)`,'start','lt');
      b+=T(30,Y(lid-18),`motor axis = hammer pivot, ${n1(-lid)} mm above the lid`,'middle','lt');
      return SV(-30,-112,fc+100,112+(-lid)+30,b,820);
    }
    function uprightDirectSVG(){
      begin(3.4);const ub=M_(HP.z+5.5),vb=M_(HP.y-DECK_TOP),pts=[[0,0],[80,0],[70,58],[65,78],[15,78],[10,58]],Y=v=>-v;
      let b=PG(pts.map(([u,v])=>[u,Y(v)]),'pt')+`<circle class="hd" cx="${ub}" cy="${Y(vb)}" r="13"/>`+C(ub,Y(vb),4)+C(ub,Y(vb+8.5),1.7)+C(ub,Y(vb-8.5),1.7);
      ANG_Z.forEach(z=>b+=C(M_(z+5.5),Y(12),2.25));
      b+=DH(0,80,9,0)+DV(0,-78,-8,0)+DH(15,65,-85,-78)+DH(0,ub,16,0)+DV(0,-vb,88,80)+DH(0,15,23,0)+DH(65,80,23,0)+DV(Y(vb-8.5),Y(vb+8.5),ub+9,ub+2,'17');
      b+=LD(ub-9,Y(vb+9),-14,Y(92),'Ø26 pocket 9 deep (motor side)','start')+LD(ub+3,Y(vb-3),ub+18,Y(vb-20),'Ø8 through')+LD(ub-1,Y(vb-8.5),12,Y(30),'2 × Ø3.4 countersunk (hammer side)','start');
      b+=LD(17,Y(12),28,Y(22),'2 × Ø4.5, 12 up');
      b+=T(40,33,'← rear&#160;&#160;&#160;&#160;&#160;&#160;&#160;&#160;&#160;front →&#160;&#160;·&#160;&#160;12 mm plywood','middle','lt');
      return SV(-22,-100,128,138,b);
    }
    function hubDirectSVG(){
      begin(3.2);let b='';
      // front view (along the swing direction): motor side on the right
      b+=Rr(0,0,33,55,'pr')+Rr(24.5,8.9,8.5,12.17,'hd')+Rr(0,11,15.5,8,'hd')+Rr(15.5,12.75,9,4.5,'hd')+Rr(6.35,25,20.3,30,'hd');
      for(const y of[37,49])b+=Rr(0,y-2.15,33,4.3,'hd');
      b+=DH(0,33,-5,0)+DV(0,55,-6,0)+DV(0,15,39,33)+DH(24.5,33,-12,0,'8.5')+DH(0,15.5,62,55,'15.5')+DV(25,55,47,33,'30')+DH(6.35,26.65,68,55,'slot 20.3')+DV(0,37,-14,0)+DV(0,49,-22,0);
      b+=T(16.5,77,'front view – motor side on the right','middle','lt');
      // side view from the motor side: the hex socket
      const o=71;b+=Rr(o,0,33,55,'pr')+hexAt(o+16.5,15,12.17)+C(o+16.5,15,2.25)+Rr(o+6.35,25,20.3,30,'hd')+C(o+16.5,37,2.15)+C(o+16.5,49,2.15);
      b+=DH(o,o+33,-5,0)+DH(o+6.35,o+26.65,62,55,'20.3')+T(o+16.5,70,'seen from the motor side','middle','lt');
      b+=LD(o+22.5,15,o+43,4,'hex 12.17 AF, 8.5 deep')+LD(o+16.5,17,o+43,24,'Ø4.5 → Ø8 counterbore 15.5 deep')+LD(o+18.5,37,o+43,38,'2 × Ø4.3 stick bolts');
      return SV(-28,-14,o+103+28,96,b,500);
    }
    function hexAt(cx,cy,af){const r=af/Math.sqrt(3);return PG([0,1,2,3,4,5].map(k=>[cx+r*Math.cos(k*Math.PI/3+Math.PI/6),cy+r*Math.sin(k*Math.PI/3+Math.PI/6)]),'ho');}
    const CATD=D=>{const xf=DIR_X0,xo=DIR_X0+DIR_T,fc=DIR_X0+DIR_WEB,DT=DECK_TOP,hz=HP.z,hy=HP.y;return[
      {id:'H1',kind:'print',name:'Motor upright',qty:1,size:'80 × 78 × 12',mat:'PLA+ print (STL P8), 4 walls + 30 % gyroid',stl:'P8',parts:['Hammer motor upright 12 mm (print)'],
       mates:['Hammer motor –*','M3×8 countersunk GA25 → upright','Alu angle 20×20×2','M4×20 angle → upright','M4×20 angle → lid + doubler','M4×30 wood screw lid → upright edge',...LID],
       how:[`Stands on the lid, inner face <b>26.5 mm right of the robot centre</b>, motor axis <b>${n1(M_(hy-DT))} mm above the lid</b> and 15 mm behind the centre – the motor axis is the hammer pivot.`,
            '<b>Ø26 pocket 9 mm deep</b> from the motor side (printed in) leaves a 3 mm web; Ø8 hole through for the gearbox nose.',
            'GA25 face in the pocket, <b>2 × M3×8 countersunk</b> from the hammer side, 17 mm apart (vertical).',
            'Held to the lid by 2 alu angles on the motor side and 2 × M4×30 screws from under the lid into its bottom edge (drill Ø3.3 pilot holes 25 deep into the print).'],
       feat:()=>{const x=xo+.05;return[dm(F(x,DT,-5.5),F(x,DT,2.5),'80'),dm(F(x,DT,-6.3),F(x,hy+2,-6.3),'78'),dm(F(x,hy+2.4,-4),F(x,hy+2.4,1),'50'),
            dm(F(xf-.05,DT,hz-2),F(xf-.05,hy,hz-2),n1(M_(hy-DT))+' to motor axis'),dm(F(x,hy,hz-1.3),F(x,hy,hz+1.3),'Ø26 pocket'),dm(F(xf-.05,hy-.85,hz+.6),F(xf-.05,hy+.85,hz+.6),'17'),
            dm(F(x,DT+1.2,-5.5),F(x,DT+1.2,-4),'15'),dm(F(x,DT+1.2,1),F(x,DT+1.2,2.5),'15'),dm(F(xf,hy+2.05,-4.6),F(xo,hy+2.05,-4.6),'12'),
            dm(F(0,DT+.3,-6),F(xf,DT+.3,-6),'26.5 from centre')];},
       dir:[1,.45,.5],svg:()=>uprightDirectSVG()},
      {id:'H2',kind:'print',name:'Hammer hub',qty:1,size:'33 × 33 × 55',mat:'PLA+ 100 %, 5 walls',parts:['Hammer hub (print, hex socket)'],
       mates:['Hex coupler 18 mm (12 mm hex)','M4×16 hub → coupler','Hammer stick 20×20 plywood (2 × 10 mm)','M4 bolt hub → stick','Hammer motor – output shaft Ø4 D'],pose:90,
       how:['<b>12 mm hex socket (12.17 across flats), 8.5 deep</b> on the motor side: slides on the coupler\'s 7 mm hex (the outer 1.5 mm goes over the round sleeve) – the size your crank already proved.','<b>M4×16</b> socket screw from the other side, in a Ø8 counterbore 15.5 deep, into the coupler\'s end thread: pulls the hub tight onto the coupler.',
            'Slot 20.3 × 20.3, 30 deep from the bottom for the 20 × 20 stick (2 × 10 mm); 2 × M4 through hub + stick at 37 and 49 mm from the top, + epoxy.','It is the part that takes the knocks: print it 100 % with 5 walls.'],
       feat:()=>[dm(HR(1.75,1.5,1.75),HR(1.75,-4,1.75),'55'),dm(HR(-1.65,1.9,1.65),HR(1.65,1.9,1.65),'33'),dm(HR(2.05,1.9,-1.65),HR(2.05,1.9,1.65),'33'),
            dm(HR(1.7,0,-.61),HR(1.7,0,.61),'hex 12.17'),dm(HR(.8,1.7,0),HR(1.65,1.7,0),'8.5 deep'),dm(HR(-1.7,0,-.4),HR(-1.7,0,.4),'Ø8'),
            dm(HR(1.75,1.5,.3),HR(1.75,-2.2,.3),'37'),dm(HR(1.75,1.5,.9),HR(1.75,-3.4,.9),'49'),dm(HR(-1.75,1.5,-1.3),HR(-1.75,0,-1.3),'15'),
            dm(HR(-HUB.slotX,-4.15,1.4),HR(HUB.slotX,-4.15,1.4),'slot 20.3'),dm(HR(0,-4.15,-HUB.slotZ),HR(0,-4.15,HUB.slotZ),'slot 20.3'),dm(HR(1.75,-4,-1.4),HR(1.75,-1,-1.4),'30 deep'),dm(HR(1.75,-2.2,-.225),HR(1.75,-2.2,.225),'Ø4.5')],
       dir:[.85,.4,-.75],stl:'P7',svg:()=>hubDirectSVG()},
      ...COMMON(DT,hz,hy).map((e,i)=>Object.assign({},e,{id:['H3','H4','H5'][i]},i===2?{stl:'P9'}:{})),
      {id:'H6',kind:'buy',name:'Alu angles',qty:2,size:'20 × 20 × 2, 24 long',mat:'aluminium angle – cut (or 2 hardwood blocks)',parts:['Alu angle 20×20×2'],
       mates:['Hammer motor upright 12 mm (print)','M4×20 angle → upright','M4×20 angle → lid + doubler',...LID],
       how:['On the motor side of the upright, under the motor. Upright leg: M4 at 12 mm up through angle + upright. Base leg: M4 13 mm out from the upright, through lid + doubler.'],
       feat:()=>{const z=ANG_Z[0],x=xo;return[dm(F(x+2.3,DT,z-1.2),F(x+2.3,DT,z+1.2),'24'),dm(F(x,DT-.1,z+1.5),F(x+2,DT-.1,z+1.5),'20'),dm(F(x-.1,DT,z+1.5),F(x-.1,DT+2,z+1.5),'20'),
            dm(F(x,DT+.25,z-1.5),F(x+1.3,DT+.25,z-1.5),'13'),dm(F(x+.3,DT,z-1.5),F(x+.3,DT+1.2,z-1.5),'12')];},dir:[1,.6,.5],svg:()=>angleSVG()},
      {id:'H7',kind:'buy',name:'GA25 motor + brass coupler',qty:1,size:'GA25-370 170 rpm · 18 mm hex coupler',mat:'your parts',parts:['Hammer motor –*','Hex coupler 18 mm (12 mm hex)'],
       mates:['Hammer motor upright 12 mm (print)','Hammer hub (print, hex socket)','M3×8 countersunk GA25 → upright'],
       how:['Coupler on the motor shaft: 2 set screws on the D-flat + Loctite 243 (8 mm of shaft inside the sleeve). The hammer hub goes on its hex.','Motor body on the right of the upright, inside the box width (ends 83 mm from the centre).'],
       feat:()=>[dm(F(fc,hy+1.5,hz),F(fc+GA.L+GA.motor+GA.rear,hy+1.5,hz),n1(M_(GA.L+GA.motor+GA.rear))),dm(F(.8,hy-.9,hz),F(fc-.35,hy-.9,hz),'18 coupler')],dir:[1,.3,-.5]},
      {id:'H8',kind:'buy',name:'Bolts and screws',qty:'set',size:'M3 · M4',mat:'steel',
       parts:['M3×8 countersunk GA25 → upright','M4×20 angle → upright','M4×20 angle → lid + doubler','M4×30 wood screw lid → upright edge','M4×16 hub → coupler','M4 bolt hub → stick','M4 bolt head → stick','M3 stop post → lid'],mates:[],
       how:['<b>M3×8 countersunk</b>: 2 GA25 → upright · <b>M4×20 + nyloc</b>: 2 angle → upright, 2 angle → lid + doubler · <b>M4×30 wood screws</b>: 2 lid → upright edge',
            '<b>M4×16 socket</b>: 1 hub → coupler (Loctite) · <b>M4×40 + nyloc</b>: 2 hub → stick · <b>M4×50 + nyloc</b>: 1 head → stick · <b>M3×20 + nut</b>: 4 stop posts → lid'],feat:()=>[],dir:[1,.5,.4]},
    ];};

    const COMMON=(DT,hz,hy)=>[
      {id:'H4',kind:'wood',name:'Hammer stick (handle)',qty:1,size:`${n1(M_(ARM_L+HEAD.y/2-1))} × 20 × 20`,mat:'laser cut, 2 × 10 mm birch plywood, glued',parts:['Hammer stick 20×20 plywood (2 × 10 mm)'],
       mates:['Hammer hub (hardwood or print)','Hammer head – 10 mm plywood side plates','M4 bolt hub → stick','M4 bolt head → stick'],pose:90,
       how:['<b>Laser cut from 10 mm plywood, 2 pieces</b> (file woodwork/laser/Hammer_T_layer_10mm): a <b>T</b> – the stick and the middle of the head in one piece. Glue the 2 layers face to face (M4 bolts through the holes to line them up, clamp) → <b>20 × 20</b>.','Top 30 mm in the hub slot (2 × M4 + epoxy). Holes Ø4.3: 12 and 24 mm from the top, 17.5 mm from the bottom (head bolt).','The head ends point in the swing direction (front and back).'],
       feat:()=>[dm(HR(1.15,-1,1.3),HR(1.15,-(ARM_L+1.25),1.3),n1(M_(ARM_L+HEAD.y/2-1))),dm(HR(1.15,-12,-1),HR(1.15,-12,1),'20'),dm(HR(-STICK.x/2,-13,1.15),HR(STICK.x/2,-13,1.15),'20'),
            dm(HR(1.15,-1,-1.3),HR(1.15,-2.2,-1.3),'12'),dm(HR(1.15,-1,-1.75),HR(1.15,-3.4,-1.75),'24'),dm(HR(1.15,-(ARM_L+1.25),-1.3),HR(1.15,-(ARM_L-.5),-1.3),'17.5')],
       dir:[1,.2,.55],svg:()=>stickSVG()},
      {id:'H5',kind:'wood',name:'Hammer head',qty:1,size:'64 × 25 × 40',mat:'laser cut: 2 side plates 10 mm',parts:['Hammer head – 10 mm plywood side plates'],
       mates:['Hammer stick 20×20 plywood (2 × 10 mm)','M4 bolt head → stick'],pose:90,
       how:['The middle 20 mm is the T end of the 2 stick layers; <b>2 side plates 64 × 25, 10 mm thick</b> (file woodwork/laser/Hammer_head_side_plate_10mm), one glued on each side → 40 mm. 1 × M4×50 through plates + stick, 7.5 mm from the top (shaft side).','Sticks out 22 mm in front and behind the stick: hits forward and backward with the bare wood ends (no pads).'],
       feat:()=>[dm(HR(2.2,-(ARM_L-1.25),-3.2),HR(2.2,-(ARM_L-1.25),3.2),'64'),dm(HR(2.2,-(ARM_L+1.25),3.95),HR(2.2,-(ARM_L-1.25),3.95),'25'),
            dm(HR(-HEAD.x/2,-(ARM_L-1.65),3.3),HR(HEAD.x/2,-(ARM_L-1.65),3.3),'40'),dm(HR(2.2,-(ARM_L-1.25),-.7),HR(2.2,-(ARM_L-.5),-.7),'7.5'),dm(HR(2.2,-ARM_L,-1),HR(2.2,-ARM_L,1),'stick 20')],
       dir:[1,.3,.8],svg:()=>headSVG()},
      {id:'H10',kind:'print',name:'Stop posts',qty:2,size:`44 × 12 × ${n1(M_(REAR_STOP_P[1]-DT-.35))} / ${n1(M_(FRONT_STOP_P[1]-DT-.35))}`,mat:'PLA+ (4 walls + 40 % gyroid) + 3.5 mm TPU pad',parts:['Rear stop post (print)','Front stop post (print)','TPU stop pad'],
       mates:['M3 stop post → lid',...LID],
       how:[`Rear post ${n1(-M_(REAR_STOP_P[0]-hz))} mm behind the shaft, front post ${n1(M_(FRONT_STOP_P[0]-hz))} mm in front, on the centre line.`,'2 × M3 through lid + doubler, 30 mm apart. Only for a missed hit – the motor never pushes against them.'],
       feat:()=>{const r=REAR_STOP_P,f=FRONT_STOP_P;return[dm(F(2.4,DT,r[0]),F(2.4,r[1],r[0]),n1(M_(r[1]-DT))+' incl. pad'),dm(F(2.4,DT,f[0]),F(2.4,f[1],f[0]),n1(M_(f[1]-DT))+' incl. pad'),
            dm(F(0,DT+.1,hz),F(0,DT+.1,r[0]),n1(M_(hz-r[0]))),dm(F(0,DT+.1,hz),F(0,DT+.1,f[0]),n1(M_(f[0]-hz))),dm(F(-2.2,f[1]+.4,f[0]),F(2.2,f[1]+.4,f[0]),'44')];},
       dir:[1,.6,.15],svg:()=>stopSVG()},
    ];
    const CAT=D=>{if(D.direct)return CATD(D);const ch=D.chain,nm=ch?'sprocket':'gear',xo=UP_X1+.05,DT=DECK_TOP,hz=HP.z,hy=HP.y;
      const sx0=-(UP_X1+.4),sx1=HD_X0+D.w+.15,sad=Math.min(D.PL1+2.65,9.55),xg=HD_X0+D.w+.05;
      const bigBuy=ch&&!D.onePiece;
      const L=[
      {id:'H1',kind:'wood',name:'Upright',qty:2,size:'80 × 78 × 9',mat:'9 mm plywood',parts:['Hammer upright 9 mm ply'],
       mates:['6000-2RS bearing (10×26×8)','Bearing retainer (print)','Alu angle 20×20×2','M4×20 angle → upright → angle','M4×20 angle → lid + doubler','M2.5×10 retainer screw','Hammer shaft Ø10 steel',...LID],
       how:[`Stands on the lid; the two are <b>49 mm apart</b> (inner faces), bearing centre <b>${n1(M_(hy-DT))} mm above the lid</b>, 15 mm behind the robot centre.`,
            'Ø26 hole for the 6000-2RS bearing, pressed in flush with the inner face. Retainer (H2) on the outer face holds it.',
            'Held up by 4 alu angles (H14): one M4 goes through outer angle → upright → inner angle at each of the 2 holes.',
            'Cut both together (clamped) so the bearing holes line up.'],
       feat:()=>[dm(F(xo,DT,-5.5),F(xo,DT,2.5),'80'),dm(F(xo,DT,-6.3),F(xo,hy+2,-6.3),'78'),dm(F(xo,hy+2.4,-4),F(xo,hy+2.4,1),'50'),
            dm(F(xo,DT,-1.5),F(xo,hy,-1.5),n1(M_(hy-DT))+' to bearing centre'),dm(F(xo,DT+.45,-5.5),F(xo,DT+.45,-1.5),'40'),dm(F(xo,hy,-2.8),F(xo,hy,-.2),'Ø26'),
            dm(F(xo,DT+1.2,-5.5),F(xo,DT+1.2,-4),'15'),dm(F(xo,DT+1.2,1),F(xo,DT+1.2,2.5),'15'),dm(F(xo,DT,-3.4),F(xo,DT+1.2,-3.4),'12'),
            dm(F(UP_X0,hy+2,-4.6),F(UP_X1,hy+2,-4.6),'9'),dm(F(-UP_X0,hy+1.5,.6),F(UP_X0,hy+1.5,.6),'49 between')],
       dir:[1,.45,.45],svg:()=>uprightSVG()},
      {id:'H2',kind:'print',name:'Bearing retainer',qty:2,size:'Ø36 × 2.5',mat:'PETG, or 3 mm ply / alu',parts:['Bearing retainer (print)'],
       mates:['Hammer upright 9 mm ply','6000-2RS bearing (10×26×8)','M2.5×10 retainer screw'],
       how:['Ring on the <b>outer</b> face of each upright: covers the bearing\'s outer ring (bore Ø16 clears the inner ring).','3 × M2.5×10 wood screws on a Ø31 circle at 90° / 210° / 330°.'],
       feat:()=>{const x=UP_X1+.3;return[dm(F(x,hy-1.8,hz),F(x,hy+1.8,hz),'Ø36'),dm(F(x,hy,hz-.8),F(x,hy,hz+.8),'Ø16'),dm(F(UP_X1,hy+2,hz),F(UP_X1+.25,hy+2,hz),'2.5')];},
       dir:[1,.25,.3],svg:()=>retainerSVG()},
      {id:'H3',kind:'wood',stl:'P7',name:'Hammer hub',qty:1,size:'33 × 33 × 55',mat:'hardwood (beech / oak) or PETG 100 %',parts:['Hammer hub (hardwood or print)'],
       mates:['Hammer shaft Ø10 steel','Shaft collar Ø10','Hammer stick 20×20 plywood (2 × 10 mm)','Cross bolt M4 through hub + shaft','M4 bolt hub → stick'],pose:90,
       how:['Ø10 hole for the shaft, centre 15 mm from the top. <b>M4 cross bolt through hub + shaft</b> (at right angles to the shaft) – this makes the hammer turn with the shaft.','Slot 20.3 × 20.3, 30 deep from the bottom: the 20 × 20 stick goes in, 2 × M4 through hub + stick at 37 and 49 mm from the top, + epoxy.','Drill the cross hole through hub and shaft together, after assembly.'],
       feat:()=>[dm(HR(1.75,1.5,1.75),HR(1.75,-4,1.75),'55'),dm(HR(-1.65,1.9,1.65),HR(1.65,1.9,1.65),'33'),dm(HR(2.05,1.9,-1.65),HR(2.05,1.9,1.65),'33'),
            dm(HR(-1.75,1.5,-1.3),HR(-1.75,0,-1.3),'15'),dm(HR(-1.75,0,-.5),HR(-1.75,0,.5),'Ø10'),dm(HR(1.75,1.5,.3),HR(1.75,-2.2,.3),'37'),dm(HR(1.75,1.5,.9),HR(1.75,-3.4,.9),'49'),
            dm(HR(-1.75,-4,.9),HR(-1.75,-1,.9),'slot 30 deep')],
       dir:[1,.35,.75],svg:()=>hubSVG()},
      ...COMMON(DT,hz,hy).slice(0,2),
      {id:'H6',kind:'print',name:'Drive hub'+(D.onePiece?' (one print with the sprocket)':''),qty:1,size:`Ø${n1(M_(D.hubR)*2)} × 7.5`,mat:D.onePiece?'PETG / PA 100 %':'PETG 100 % (or 2 × 4 mm ply discs)',parts:[D.hubName],
       mates:['Hammer shaft Ø10 steel',D.bigName,'Hammer drive: M4 cross bolt hub + shaft','Hammer drive: M3×10 screws into the hub','Bearing retainer (print)'],pose:90,
       how:['On the shaft just outside the right bearing retainer (1 mm gap). <b>M4 cross bolt</b> through hub + shaft.',D.onePiece?'Printed in one piece with the hammer sprocket.':`The hammer ${nm} is screwed to its outer face: 3 × M3×10 on a Ø17 circle into heat-set inserts.`],
       feat:()=>{const r=D.hubR,x=HD_X0+.05;return[dm(RP(D.big,x,-r,0),RP(D.big,x,r,0),'Ø'+n1(M_(r)*2)),dm(RP(D.big,3.7,r+.25,0),RP(D.big,HD_X0,r+.25,0),'7.5'),...(D.onePiece?[]:[dm(RP(D.big,x,0,-.85),RP(D.big,x,0,.85),'Ø17 screw circle')])];},
       dir:[1,.3,.35],svg:()=>dhubSVG(D)},
      {id:'H7',kind:bigBuy?'buy':'print',name:`Hammer ${nm} – ${D.opt.n2}T`,qty:1,size:`Ø${n1(D.bigD.od*10)} × ${ch?'2.8':'12'}`,mat:bigBuy?'#25 steel plate sprocket':(ch?'printed with the hub':'PETG / PA 100 %, module 2'),parts:[D.bigName],
       mates:[D.hubName,ch?`Hammer drive: #25 roller chain, ${D.links} links`:D.smallName,'Hammer drive: M3×10 screws into the hub','Hammer shaft Ø10 steel'],pose:90,
       how:[`Pitch Ø ${n1(D.bigD.pd*10)}, outside Ø ${n1(D.bigD.od*10)}, bore Ø10.`,D.onePiece?'One print with the drive hub (too small for screws inside the chain).':'3 × Ø3.2 on a Ø17 circle to screw it to the drive hub.',`Same plane as the motor ${nm}: 44.5 mm from the robot centre.`],
       feat:()=>{const R=D.bigD.od/2;return[dm(RP(D.big,xg,-R,0),RP(D.big,xg,R,0),'Ø'+n1(D.bigD.od*10)),dm(RP(D.big,xg,0,-.5),RP(D.big,xg,0,.5),'Ø10'),dm(RP(D.big,HD_X0,R+.3,0),RP(D.big,HD_X0+D.w,R+.3,0),ch?'2.8':'12')];},
       dir:[1,.25,.25],svg:()=>gearSVG(D.opt.n2,D.bigD.od*10,D.bigD.pd*10,C(0,0,5)+(D.onePiece?'':[0,1,2].map(k=>{const a=k*2*Math.PI/3;return C(8.5*Math.sin(a),-8.5*Math.cos(a),1.6);}).join('')),`${D.opt.n2}T ${ch?'#25':'m2'}`)},
      {id:'H8',kind:'print',name:`Motor ${nm} – ${D.opt.n1}T`,qty:'1 + spare',size:`Ø${n1(D.small.od*10)}`,mat:'PA / PETG 100 %',parts:[D.smallName],
       mates:['Hex coupler 18 mm (12 mm hex)','M4 screw + washer into coupler','M4 countersunk screw into coupler',ch?`Hammer drive: #25 roller chain, ${D.links} links`:D.bigName,'Hammer motor – output shaft Ø4 D'],
       how:[`Pitch Ø ${n1(D.small.pd*10)}, outside Ø ${n1(D.small.od*10)}.`,'12 mm hex socket, <b>12.17 across flats</b>, 7 mm deep: slides on the brass coupler; '+(ch?'M4 screw + washer':'M4 countersunk screw')+' into the coupler\'s end thread.'],
       feat:()=>{const R=D.small.od/2,x=HD_X0-.05;return[dm(RP(D.msp,x,-R,0),RP(D.msp,x,R,0),'Ø'+n1(D.small.od*10)),dm(RP(D.msp,x,0,-.6085),RP(D.msp,x,0,.6085),'hex 12.17'),dm(RP(D.msp,HD_X0,R+.3,0),RP(D.msp,D.hx+CPL.hexL,R+.3,0),n1(M_(D.hx+CPL.hexL-HD_X0)))];},
       dir:[1,.3,.1],svg:()=>gearSVG(D.opt.n1,D.small.od*10,D.small.pd*10,hexIn(12.17),`${D.opt.n1}T, 12 mm hex`)},
      {id:'H9',kind:'print',name:'Hammer motor bracket',qty:1,size:'face 27 wide · base 3 mm',mat:'PETG 100 % (or 5 mm ply + 3 mm ply)',parts:['Hammer motor bracket (print)','Motor saddle + zip tie (print)'],
       mates:['Hammer motor –*','M3×8 countersunk GA25 → bracket','M3×16 through lid + doubler','M3×25 wood screw through lid into the side panel top',...LID],
       how:[`Motor axis <b>${n1(M_(D.CC))} mm</b> from the hammer shaft (${n1(-M_(D.MOT.z-hz))} behind, ${n1(-M_(D.MOT.y-hy))} below), ${n1(M_(D.MOT.y-DT))} mm above the lid.`,'GA25 face → face plate: 2 × M3×8 countersunk, 17 mm apart. Zip tie over the motor on the saddle.',`Base → lid: 2 × M3×16 + nut through lid + doubler, 2 × M3×25 wood screws into the side-panel top.${ch?' Slots ±2 mm for chain tension.':' Gears: drill the lid holes with the gears meshed.'}`],
       feat:()=>[dm(F(D.PL0-.05,DT+.2,D.MOT.z-1.35),F(D.PL0-.05,DT+.2,D.MOT.z+1.35),'27'),dm(F(D.PL1+.05,DT,D.MOT.z+1.6),F(D.PL1+.05,D.MOT.y,D.MOT.z+1.6),n1(M_(D.MOT.y-DT))+' axis height'),
            dm(F(D.PL0-.8,DT+.35,D.MOT.z+1.6),F(sad-.4,DT+.35,D.MOT.z+1.6),n1(M_(sad-.4-D.PL0+.8))),dm(F(D.PL0-.05,D.MOT.y-.85,D.MOT.z-1.6),F(D.PL0-.05,D.MOT.y+.85,D.MOT.z-1.6),'17'),
            dm(F(HD_X0+D.w/2,hy,hz),F(HD_X0+D.w/2,D.MOT.y,D.MOT.z),n1(M_(D.CC))+' centre distance'),dm(F(D.PL0,D.MOT.y+1.6,D.MOT.z),F(D.PL1,D.MOT.y+1.6,D.MOT.z),'5')],
       dir:[1,.45,-.35],svg:()=>bracketSVG(D)},
      COMMON(DT,hz,hy)[2],
      {id:'H11',kind:'buy',name:'Hammer shaft',qty:1,size:`Ø10 × ${n1(M_(sx1-sx0))}`,mat:'Ø10 steel rod – cut to length',parts:['Hammer shaft Ø10 steel'],
       mates:['6000-2RS bearing (10×26×8)','Hammer hub (hardwood or print)',D.hubName,'Shaft collar Ø10'],
       how:[`2 cross holes Ø4.2: ${n1(-M_(sx0))} mm from the left end (hammer hub) and ${n1(40.75-M_(sx0))} mm (drive hub) – drill through hub + shaft together.`,'Carries the turn from the drive hub (right) across the bearings to the hammer hub (middle).'],
       feat:()=>[dm(F(sx0,hy+.9,hz),F(sx1,hy+.9,hz),n1(M_(sx1-sx0))),dm(F(sx0,hy-.9,hz),F(0,hy-.9,hz),n1(-M_(sx0))),dm(F(sx0,hy-1.5,hz),F(4.075,hy-1.5,hz),n1(40.75-M_(sx0))),dm(F(sx1+.3,hy-.5,hz),F(sx1+.3,hy+.5,hz),'Ø10')],
       dir:[.35,.5,1],svg:()=>shaftSVG(D)},
      {id:'H12',kind:'buy',name:'Bearings 6000-2RS',qty:2,size:'10 × 26 × 8',mat:'ball bearing',parts:['6000-2RS bearing (10×26×8)'],mates:['Hammer upright 9 mm ply','Bearing retainer (print)','Hammer shaft Ø10 steel'],
       how:['Pressed into the Ø26 holes of the uprights, flush with the inner face.'],
       feat:()=>{const x=(UP_X0+UP_X1)/2;return[dm(F(UP_X1+.1,hy-1.3,hz),F(UP_X1+.1,hy+1.3,hz),'Ø26'),dm(F(UP_X1+.1,hy,hz-.5),F(UP_X1+.1,hy,hz+.5),'Ø10'),dm(F(x-.4,hy+1.5,hz),F(x+.4,hy+1.5,hz),'8')];},dir:[1,.3,.3]},
      {id:'H13',kind:'buy',name:'Shaft collars Ø10',qty:2,size:'Ø18 × 8.5',mat:'steel collar with set screw',parts:['Shaft collar Ø10'],mates:['Hammer shaft Ø10 steel','Hammer hub (hardwood or print)','6000-2RS bearing (10×26×8)'],
       how:['One each side of the hammer hub, pushed against the bearing inner rings (≈0.5 mm play). Stops the shaft sliding sideways.'],pose:90,
       feat:()=>[dm(HR(1.95,-.9,1.2),HR(1.95,.9,1.2),'Ø18'),dm(HR(1.525,1.2,0),HR(2.375,1.2,0),'8.5')],dir:[.6,.4,1]},
      {id:'H14',kind:'buy',name:'Alu angles',qty:8,size:'20 × 20 × 2, 24 long',mat:'aluminium angle – cut (or 20 × 20 hardwood blocks)',parts:['Alu angle 20×20×2'],mates:['Hammer upright 9 mm ply','M4×20 angle → upright → angle','M4×20 angle → lid + doubler',...LID],
       how:['4 per upright: inside + outside at both bolt positions.','Upright leg: hole 12 mm up. Base leg: hole 13 mm out from the upright, M4 through lid + doubler.'],
       feat:()=>{const z=ANG_Z[0],x=UP_X1;return[dm(F(x+2.3,DT,z-1.2),F(x+2.3,DT,z+1.2),'24'),dm(F(x,DT-.1,z+1.5),F(x+2,DT-.1,z+1.5),'20'),dm(F(x-.1,DT,z+1.5),F(x-.1,DT+2,z+1.5),'20'),
            dm(F(x,DT+.25,z-1.5),F(x+1.3,DT+.25,z-1.5),'13'),dm(F(x+.3,DT,z-1.5),F(x+.3,DT+1.2,z-1.5),'12')];},dir:[1,.6,.5]},
      ...(ch?[{id:'H15',kind:'buy',name:`#25 chain – ${D.links} links`,qty:1,size:`${n1(D.links*6.35)} long`,mat:'#25 roller chain + 1 connecting link',parts:[`Hammer drive: #25 roller chain, ${D.links} links`],mates:[D.bigName,D.smallName],
       how:[`${D.links} links (6.35 pitch). Cut with a chain breaker, close with the connecting link. Tension: ≈ 3 mm sag.`],
       feat:()=>[dm(F(HD_X0+SPR_W/2+.6,hy,hz),F(HD_X0+SPR_W/2+.6,D.MOT.y,D.MOT.z),n1(M_(D.CC))+' centre distance')],dir:[1,.3,.1]}]:[]),
      {id:'H16',kind:'buy',name:'GA25 motor + brass coupler',qty:1,size:'GA25-370 170 rpm · 18 mm hex coupler',mat:'your parts',parts:['Hammer motor –*','Hex coupler 18 mm (12 mm hex)'],mates:['Hammer motor bracket (print)',D.smallName],
       how:['Coupler: 2 set screws on the D-flat of the motor shaft + Loctite 243. The motor '+nm+' goes on its hex.'],
       feat:()=>[dm(F(D.PL1,D.MOT.y+1.5,D.MOT.z),F(D.PL1+GA.L+GA.motor+GA.rear,D.MOT.y+1.5,D.MOT.z),n1(M_(GA.L+GA.motor+GA.rear))),dm(F(D.hx,D.MOT.y-.9,D.MOT.z),F(D.PL0-.05,D.MOT.y-.9,D.MOT.z),'18 coupler')],dir:[1,.3,-.4]},
      {id:'H17',kind:'buy',name:'Bolts, screws, nuts',qty:'set',size:'M2.5 · M3 · M4',mat:'steel',parts:BOLTS,mates:[],
       how:['<b>M4×20 + nyloc</b>: 8 angle → lid, 4 angle → upright → angle · <b>M4 cross bolts</b> (Ø4 drill through the shaft): 2 · <b>M4×40 + nyloc</b>: 2 hub → stick · <b>M4×50 + nyloc</b>: 1 head → stick',
            `<b>M4</b> screw into the coupler: 1 · <b>M3×10</b>: ${D.onePiece?0:3} ${nm} → hub (+ heat-set inserts) · <b>M3×8 countersunk</b>: 2 GA25 → bracket`,
            '<b>M3×16 + nut</b>: 2 bracket → lid · <b>M3×25 wood screws</b>: 2 bracket → side panel · <b>M3×20 + nut</b>: 4 stop posts → lid · <b>M2.5×10 wood screws</b>: 6 retainers'],
       feat:()=>[],dir:[1,.5,.4]},
      ];return L;};

    const KIND={wood:['Make – wood','#d0a468'],print:['Make – print (or wood)','#ff8a3a'],buy:['Buy / cut','#9aa1ab']};
    let SEL=null,MODE=0,SPIN=false,POSE0=null;
    const btn=(id,txt,on)=>`<button id="${id}" class="${on?'on':''}">${txt}</button>`;
    function focus(p){
      clearHi();if(!p){SEL=null;if(POSE0!==null){S.hammer=POSE0;POSE0=null;syncSliders();apply();}drawSel();return;}
      if(p.pose!==undefined){if(POSE0===null)POSE0=S.hammer;S.hammer=p.pose;}else if(POSE0!==null){S.hammer=POSE0;POSE0=null;}
      syncSliders();apply();robot.updateMatrixWorld(true);
      const isP=o=>p.parts.some(n=>match(o,n)),isM=o=>p.mates.some(n=>match(o,n)),hit=[];
      robot.traverse(o=>{if(!o.isMesh)return;if(!o.userData||o.userData.part===undefined)return;
        o.userData.mat0=o.material;o.userData.vis0=o.visible;
        if(o.userData.part&&isP(o)){o.material=M_HI;hit.push(o);}
        else if(MODE>=1&&o.userData.part&&isM(o))o.material=M_MATE;
        else if(MODE===2)o.material=M_GHOST;
        else o.visible=false;});
      envelope.userData.vis0=envelope.visible;envelope.visible=false;
      LABELS.forEach(l=>l.d.style.display='none');sizeG.visible=false;sizeEl.style.display='none';
      if(MODE<2){floor.userData.vis0=floor.visible;grid.userData.vis0=grid.visible;floor.visible=false;grid.visible=false;}
      const box=new THREE.Box3();hit.forEach(m=>{for(let q=m;q;q=q.parent)if(q.visible===false&&q!==m)return;box.expandByObject(m);});
      window.__dimK=box.isEmpty()?1:Math.min(1,Math.max(.3,box.getSize(new THREE.Vector3()).length()/25));
      const feats=p.feat?p.feat():[];feats.forEach(([a,b,t,off])=>dimLine(a,b,t,off));
      feats.forEach(([a,b])=>{box.expandByPoint(robot.localToWorld(new THREE.Vector3(...a)));box.expandByPoint(robot.localToWorld(new THREE.Vector3(...b)));});
      if(!box.isEmpty()){const c=box.getCenter(new THREE.Vector3()),r=box.getSize(new THREE.Vector3()).length();
        addMarker(robot.worldToLocal(c.clone()).add(new THREE.Vector3(0,box.getSize(new THREE.Vector3()).y/2+.6,0)),p.id,p.name);
        c.y-=r*.12;   // keeps the part above the button bar
        const dir=new THREE.Vector3(...p.dir).normalize(),pTo=c.clone().add(dir.multiplyScalar(Math.max(14,r*2.1))),p0=camera.position.clone(),t0=controls.target.clone();
        if(window.__instantCam){camera.position.copy(pTo);controls.target.copy(c);}else tw(.7,u=>{camera.position.lerpVectors(p0,pTo,u);controls.target.lerpVectors(t0,c,u);},E.sine,'cam');}
      SEL=p.id;drawSel();
    }
    function drawSel(){
      hpUI.querySelectorAll('.hprow').forEach(r=>r.classList.toggle('sel',r.dataset.id===SEL));
      const det=hpUI.querySelector('#hpDet'),p=SEL&&CAT(DRV).find(x=>x.id===SEL);
      const row=p&&hpUI.querySelector(`.hprow[data-id="${p.id}"]`);
      if(row)row.after(det);else{const ex=hpUI.querySelector('details');if(ex)ex.before(det);}   // details open right under the clicked row
      if(row&&!window.__instantCam)setTimeout(()=>row.scrollIntoView({block:'nearest',behavior:'smooth'}),50);
      if(!p){det.innerHTML='<p class="pm">Click a part above: it is shown <b>alone</b> in the 3D view with its measurements (yellow). <b>+ Attaches to</b> adds the parts and bolts it connects to (blue).</p>';return;}
      const mates=[...new Set(p.mates.map(n=>n.replace(/^Hammer drive: /,'').replace(/\*$/,'')))];
      det.innerHTML=`<div class="hpdet"><div class="prh"><i class="pnum">${p.id}</i><b>${p.name}</b><span class="pq">× ${p.qty}</span><span class="hptag" style="border-color:${KIND[p.kind][1]};color:${KIND[p.kind][1]}">${KIND[p.kind][0]}</span></div>
        <div class="pm">${p.size} mm · ${p.mat}</div><ul>${p.how.map(x=>`<li>${x}</li>`).join('')}</ul>
        ${mates.length?`<div class="pm"><span style="color:#4fa3ff">■</span> Attaches to: ${mates.join(' · ')}</div>`:''}
        ${p.svg?`<div class="dws">${p.svg()}</div>`:''}${p.stl?`<div class="dl"><button id="hpStl">⬇ STL for printing (${p.stl}, mm, already lying in the print direction)</button></div>`:''}</div>`;
      const sb=det.querySelector('#hpStl');if(sb)sb.onclick=e=>{e.stopPropagation();const pp=PRINT_PARTS.find(x=>x.id===p.stl);saveFile(`${pp.id}_${pp.name.replace(/\W+/g,'_')}.stl`,partSTL(pp));};
    }
    function draw(){
      const D=DRV,ch=D.chain,nm=ch?'sprocket':'gear',cat=CAT(D),DIR=!!D.direct;
      if(SEL&&!cat.some(x=>x.id===SEL))SEL=null;
      let h=`<div class="hpbar">${btn('hpM0','Alone',MODE===0)}${btn('hpM1','+ Attaches to',MODE===1)}${btn('hpM2','In the robot',MODE===2)}${btn('hpSpin','⟳ Turn around',SPIN)}<button id="hpAll">Show whole robot</button></div>`;
      for(const k of['wood','print','buy']){const rows=cat.filter(p=>p.kind===k);if(!rows.length)continue;
        h+=`<h3 style="color:${KIND[k][1]}">${KIND[k][0]}</h3>`;
        rows.forEach(p=>h+=`<div class="pickrow hprow" data-id="${p.id}"><div class="prh"><i class="pnum">${p.id}</i><b>${p.name}</b><span class="pq">× ${p.qty}</span><span class="psz">${p.size}</span></div></div>`);}
      h+=`<div id="hpDet"></div>
      <details><summary>How it all goes together (assembly drawing, torque path, order)</summary>${DIR?stackDirectSVG():stackSVG(D)}
      <p class="pm">Front view, hammer standing straight up. Numbers = the parts list. Grey lines = bolts; dashed circles = the M4 cross bolts through the shaft.</p>
${DIR?`<p class="hpath"><b>GA25 (H7)</b> → 2 set screws → <b>brass coupler</b> → 12 mm hex + M4×16 → <b>hammer hub (H2)</b> → 2 × M4 + glue → <b>stick (H3)</b> → M4 + glue → <b>head (H4)</b>.</p>
      <p>The motor shaft <i>is</i> the hammer pivot. The upright only holds the motor; the motor's own gearbox bearing carries the hammer.</p>
      <ol style="padding-left:18px">
        <li>Upright: cut it, drill the Ø26 pocket 9 deep from the motor side, Ø8 through, 2 × Ø3.4 countersunk from the other side.</li>
        <li>GA25 into the pocket, 2 × M3×8. Coupler on the motor shaft (set screws on the D-flat + Loctite).</li>
        <li>2 alu angles on the motor side of the upright. Stand it on the lid 26.5 mm right of the centre, drill lid + doubler, bolt down; 2 wood screws from under the lid into the upright edge.</li>
        <li>Stick: glue the 2 laser-cut T layers face to face (M4 bolts through the holes to line them up). Head: glue one side plate on each side of the T end, M4×50 through. Then glue + bolt the stick into the hub.</li>
        <li>Hub onto the coupler hex, M4×16 into the coupler's end thread (Loctite).</li>
        <li>Stop posts, hall sensor on the upright + magnet on the hub. Turn by hand through the whole swing, then test at low power.</li>`:`<p class="hpath"><b>GA25</b> → 2 set screws → <b>brass coupler</b> → 12 mm hex + M4 → <b>motor ${nm} (H8)</b> → ${ch?'chain (H15)':'teeth'} → <b>hammer ${nm} (H7)</b> → ${D.onePiece?'(one print)':'3 × M3'} → <b>drive hub (H6)</b> → M4 cross bolt → <b>shaft (H11)</b>, turning in the bearings (H12) → M4 cross bolt → <b>hammer hub (H3)</b> → 2 × M4 + glue → <b>stick (H4)</b> → M4 + glue → <b>head (H5)</b>.</p>
      <p>The ${nm} is not fixed to the stick directly – the uprights are in between. The shaft carries the turn across; each hub is pinned to it with an M4 bolt <i>through</i> the shaft. The uprights only hold the shaft up.</p>
      <ol style="padding-left:18px">
        <li>Cut the 2 uprights together (clamped). Press in the bearings, screw on the retainers.</li>
        <li>Bolt 4 alu angles to each upright. Stand both on the lid, slide a straight Ø10 rod through both bearings to line them up, drill lid + doubler, bolt down.</li>
        <li>Hub: Ø10 hole + slot. Glue + bolt the stick into the hub, the head onto the stick.</li>
        <li>Hub + 2 collars between the uprights, slide the shaft in from the right: bearing → collar → hub → collar → bearing.</li>
        <li>Centre the hub, drill Ø4.2 through hub + shaft, M4 cross bolt. Set the collars.</li>
        <li>Drive hub on the right end, drill through, M4 cross bolt.${D.onePiece?'':` Screw the ${nm} on (3 × M3).`}</li>
        <li>Bracket + GA25 + coupler + motor ${nm}. ${ch?'Chain on, tension with the slots.':'Mesh the gears with a strip of paper between them, bolt the bracket, remove the paper.'}</li>
        <li>Stop posts, hall sensor + magnet. Turn by hand through the whole swing, then test at low power.</li>`}</ol></details>`;
      hpUI.innerHTML=h;
      const hd_=document.getElementById('hpDrive');if(hd_)hd_.textContent=DIR?'direct on motor':(ch?'chain #25 ':'gears m2 ')+D.opt.n1+'T → '+D.opt.n2+'T';
      hpUI.querySelectorAll('.hprow').forEach(r=>r.onclick=()=>{const p=cat.find(x=>x.id===r.dataset.id);focus(SEL===p.id?null:p);});
      const setMode=m=>{MODE=m;['hpM0','hpM1','hpM2'].forEach((id,i)=>hpUI.querySelector('#'+id).classList.toggle('on',i===m));if(SEL)focus(CAT(DRV).find(x=>x.id===SEL));};
      [0,1,2].forEach(m=>hpUI.querySelector('#hpM'+m).onclick=()=>setMode(m));
      hpUI.querySelector('#hpSpin').onclick=e=>{SPIN=!SPIN;controls.autoRotate=SPIN;controls.autoRotateSpeed=2.5;e.target.classList.toggle('on',SPIN);};
      hpUI.querySelector('#hpAll').onclick=()=>{focus(null);const v=VIEWS.iso;const p0=camera.position.clone(),t0=controls.target.clone();
        tw(.7,u=>{camera.position.lerpVectors(p0,new THREE.Vector3(...v[0]),u);controls.target.lerpVectors(t0,new THREE.Vector3(...v[1]),u);},E.sine,'cam');};
      const onTab=document.getElementById('p9')&&document.getElementById('p9').classList.contains('on');
      if(SEL&&onTab)focus(cat.find(x=>x.id===SEL));else{SEL=null;drawSel();}
    }
    hpRedraw=draw;draw();
    window.__hpFocus=id=>{const p=CAT(DRV).find(x=>x.id===id);if(p)focus(p);};
    window.__hpMode=m=>{const b=hpUI.querySelector('#hpM'+m);if(b)b.click();};
  }

  // clash check button
  const cb=document.getElementById('runClash'),co=document.getElementById('clashOut');
  if(cb)cb.onclick=async()=>{cancelSeq();cb.disabled=true;
    const res=await clashCheck(async(i,n)=>{co.textContent=`Checking… ${i}/${n} poses`;await new Promise(r=>setTimeout(r,0));});
    const lim=await frontLimit();
    let h='';
    if(!res.length)h+=`<p class="ok">✔ No clashes in 60 crank + ${Math.floor((FRONT_STOP-REST)/3)+1} hammer + interlock poses.</p>`;
    else{h+=`<p class="bad">✖ ${res.length} clash(es):</p><table><tr><th>Part</th><th>hits</th><th>where</th></tr>`;
      res.forEach(r=>{h+=`<tr><td>${r.a}<br>↔ ${r.b}</td><td>${r.states.length}</td><td>${r.states.slice(0,3).join(', ')}${r.states.length>3?' …':''}</td></tr>`;});h+='</table>';}
    h+=lim?`<p>Without the front stop the hammer would first touch <b>${[...new Set(lim.parts)].join(', ')}</b> at <b>${lim.h}°</b>. The stop is at <b>${FRONT_STOP}°</b> (margin ${lim.h-FRONT_STOP}°).</p>`:`<p>Hammer clears the shovel parts up to 310°.</p>`;
    co.innerHTML=h;cb.disabled=false;co.scrollIntoView({block:'end'});};
}
const tv=new THREE.Vector3();
function updateLabels(W,Hh){
  for(const l of LABELS.concat(DYN,SIZE_LBL)){l.a.getWorldPosition(tv);tv.project(camera);
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
