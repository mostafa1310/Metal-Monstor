# Builds woodwork/Hammer_wood_parts.html (+ print it to PDF with Chrome): an easy-to-follow workshop pack
# for the wooden hammer parts. Drawings are full size (SVG in mm). Sizes = lib/robot.js, "direct on motor" hammer.
# usage: python make_pack.py <out.html>
import sys
out=sys.argv[1]
MK=[0]
def svg(w,h,body):
    MK[0]+=1;m=MK[0]
    return (f'<svg class="dw" width="{w}mm" height="{h}mm" viewBox="0 0 {w} {h}">'
            f'<defs><marker id="a{m}" viewBox="0 0 10 10" refX="10" refY="5" markerUnits="userSpaceOnUse" markerWidth="2.8" markerHeight="2.8" orient="auto-start-reverse">'
            f'<path d="M0,1.5 L10,5 L0,8.5 z"/></marker></defs>'+body.replace('#AR#',f'url(#a{m})')+'</svg>')
def L(x1,y1,x2,y2,c='th'): return f'<line class="{c}" x1="{x1:.2f}" y1="{y1:.2f}" x2="{x2:.2f}" y2="{y2:.2f}"/>'
def T(x,y,s,a='middle',c='lt',sz=None,rot=0):
    f=f' font-size="{sz}"' if sz else '';r=f' transform="rotate({rot} {x:.2f} {y:.2f})"' if rot else ''
    return f'<text class="{c}" x="{x:.2f}" y="{y:.2f}" text-anchor="{a}"{f}{r}>{s}</text>'
def P(pts,c='pt'): return f'<polygon class="{c}" points="{" ".join(f"{x:.2f},{y:.2f}" for x,y in pts)}"/>'
def R(x,y,w,h,c='pt'): return f'<rect class="{c}" x="{min(x,x+w):.2f}" y="{min(y,y+h):.2f}" width="{abs(w):.2f}" height="{abs(h):.2f}"/>'
def C(x,y,r,c='ho'): return f'<circle class="{c}" cx="{x:.2f}" cy="{y:.2f}" r="{r:.2f}"/>'
def X_(x,y,r): return L(x-r-1.5,y,x+r+1.5,y,'cl')+L(x,y-r-1.5,x,y+r+1.5,'cl')
def fmt(v):
    v=round(v,1);return str(int(v)) if abs(v-round(v))<1e-6 else f'{v:.1f}'
def DH(x1,x2,y,yr,t=None):
    s=1 if y>yr else -1;t=t or fmt(abs(x2-x1))
    return L(x1,yr+s*1,x1,y+s*1.5,'ex')+L(x2,yr+s*1,x2,y+s*1.5,'ex')+f'<line class="dm" x1="{x1:.2f}" y1="{y:.2f}" x2="{x2:.2f}" y2="{y:.2f}" marker-start="#AR#" marker-end="#AR#"/>'+T((x1+x2)/2,y-1.2,t,c='dt')
def DV(y1,y2,x,xr,t=None):
    s=1 if x>xr else -1;t=t or fmt(abs(y2-y1))
    return L(xr+s*1,y1,x+s*1.5,y1,'ex')+L(xr+s*1,y2,x+s*1.5,y2,'ex')+f'<line class="dm" x1="{x:.2f}" y1="{y1:.2f}" x2="{x:.2f}" y2="{y2:.2f}" marker-start="#AR#" marker-end="#AR#"/>'+T(x-1.2,(y1+y2)/2,t,c='dt',rot=-90)
def TAG(x,y,ch,fx,fy):   # hole letter in a black circle with a line to the hole
    return L(x,y,fx,fy,'ld')+C(fx,fy,3.3,'tag')+T(fx,fy+1.5,ch,c='tagt')
def bar(x,y): return R(x,y,50,3,'sb')+R(x,y,10,3,'sbf')+R(x+20,y,10,3,'sbf')+R(x+40,y,10,3,'sbf')+T(x+25,y+8,'this bar must measure 50 mm',sz=3.2)

# ---------------------------------------------------------------- the upright, full size, holes lettered
def upright_tpl():
    ox,oy=30,104;Y=lambda v:oy-v;X=lambda u:ox+u
    b=P([(X(u),Y(v)) for u,v in[(0,0),(80,0),(70,58),(65,78),(15,78),(10,58)]])
    ax,ay=X(40),Y(58)
    b+=C(ax,ay,13,'back')+C(ax,ay,4)+X_(ax,ay,13)
    for dv in(8.5,-8.5): b+=C(ax,Y(58+dv),3.3,'csk')+C(ax,Y(58+dv),1.75)
    for u in(15,65): b+=C(X(u),Y(12),2.25)+X_(X(u),Y(12),2.25)
    b+=TAG(ax+9.5,ay-9.5,'A',X(98),Y(86))+TAG(ax+2.8,ay+2.8,'B',X(98),Y(54))+TAG(ax+2,Y(66.5)-2,'C',X(98),Y(72))+TAG(ax+2,Y(49.5)+2,'C',X(98),Y(40))
    b+=TAG(X(15)-1.6,Y(12)-1.6,'D',X(-14),Y(26))+TAG(X(65)+1.6,Y(12)-1.6,'D',X(98),Y(22))
    b+=DH(X(0),X(80),Y(0)+9,Y(0))+DH(X(15),X(65),Y(78)-7,Y(78))+DV(Y(0),Y(78),X(0)-9,X(0))
    b+=DH(X(0),X(10),Y(58)-8,Y(58),'10')+DH(X(70),X(80),Y(58)-8,Y(58),'10')+DV(Y(0),Y(58),X(80)+7,X(70))
    b+=DH(X(0),X(40),Y(0)+17,Y(0))+DH(X(0),X(15),Y(0)+25,Y(0))+DH(X(65),X(80),Y(0)+25,Y(0),'15')+DV(Y(0),Y(12),X(15)+7,X(15)+2.5,'12')
    b+=DV(Y(58),Y(66.5),X(40)-17,X(40)-4,'8.5')+DV(Y(49.5),Y(58),X(40)-17,X(40)-4,'8.5')
    b+=T(X(40),Y(0)+35,'the plate is the same both ways round – only FRONT / BACK side matter',c='hd2')
    b+=bar(X(18),Y(0)+44)
    return svg(190,160,b)
def upright_side():   # cut through the big hole, seen from above
    ox,oy=34,12;w=60;b=R(ox,oy,w,12,'pt')+R(ox+w/2-13,oy+3,26,9,'cut')+R(ox+w/2-4,oy,8,3,'cut')
    b+=DV(oy,oy+12,ox-5,ox,'12')+DV(oy+3,oy+12,ox+w+6,ox+w/2+13,'9')+T(ox+w+12,oy+9,'9 mm deep',a='start',sz=3.2)+T(ox+w+12,oy+2.5,'3 mm wood left',a='start',sz=3.2)
    b+=T(ox-8,oy+2.5,'FRONT side',a='end',sz=3.2)+T(ox-8,oy+11,'BACK side',a='end',sz=3.2)
    b+=T(ox+w/2,oy+19,'hole A seen from above, cut in half: 9 deep, 3 mm wood stays',sz=3.2)
    return svg(150,32,b)
def upright_edge():
    ox,oy=14,10;b=R(ox,oy,80,12,'pt')
    for u in(10,70): b+=C(ox+u,oy+6,1.5)+X_(ox+u,oy+6,1.5)
    b+=TAG(ox+10+1,oy+6-1,'E',ox+23,oy-4)+TAG(ox+70-1,oy+6-1,'E',ox+57,oy-4)
    b+=DH(ox,ox+10,oy+19,oy+12,'10')+DH(ox+70,ox+80,oy+19,oy+12,'10')+DV(oy,oy+6,ox+86,ox+80,'6')
    b+=T(ox+40,oy+29,'the bottom edge (the 12 mm side that stands on the robot)',sz=3.2)
    return svg(150,40,b)

# ---------------------------------------------------------------- stick (standing) and stop blocks
def stick_tpl():
    Lg=222.5;ox,oy=14,10;b=R(ox,oy,20,Lg,'pt')
    b+=DH(ox,ox+20,oy+Lg+6,oy+Lg,'20')+DV(oy,oy+Lg,ox+28,ox+20,'222.5')
    b+=T(ox+10,oy+6,'top',sz=3)+T(ox+10,oy+Lg-3,'bottom',sz=3)
    return svg(46,250,b)
def stops_tpl():
    b='';ox=8
    for i,(h,nm) in enumerate([(14.5,'BLOCK 1 (low)'),(25,'BLOCK 2 (tall)')]):
        y0=14+i*62;b+=T(ox+22,y0-2,nm,c='hd2')
        b+=R(ox,y0+28-h,44,h,'pt')+R(ox,y0+28-h-3.5,44,3.5,'pad')+L(ox+7,y0+28-h,ox+7,y0+28,'hidl')+L(ox+37,y0+28-h,ox+37,y0+28,'hidl')
        b+=DH(ox,ox+44,y0+34,y0+28,'44')+DV(y0+28-h,y0+28,ox+51,ox+44,fmt(h))+DH(ox,ox+7,y0+41,y0+28,'7')+DH(ox+37,ox+44,y0+41,y0+28,'7')
        b+=TAG(ox+7,y0+28-h,'F',ox-1,y0+28-h-9)+TAG(ox+37,y0+28-h,'F',ox+45,y0+28-h-9)
        b+=T(ox+22,y0+50,'12 mm thick · rubber 3.5 mm on top',sz=3.1)
    return svg(70,130,b)

# ---------------------------------------------------------------- head, made from 4 glued pieces
def head_tpl():
    b='';ox,oy=10,14
    # the 4 pieces, full size, seen from above
    b+=T(ox+32,oy-4,'THE 4 PIECES (seen from above, full size)',c='hd2')
    b+=R(ox,oy,64,7.5,'pt')+T(ox+32,oy+5.2,'piece 1 – long, 64 × 25 × 7.5',sz=3)
    b+=R(ox,oy+12,22,15,'pt2')+T(ox+11,oy+21,'piece 3',sz=3)+R(ox+42,oy+12,22,15,'pt2')+T(ox+53,oy+21,'piece 4',sz=3)
    b+=R(ox,oy+32,64,7.5,'pt')+T(ox+32,oy+37.2,'piece 2 – long, 64 × 25 × 7.5',sz=3)
    b+=DH(ox,ox+22,oy+45,oy+39.5,'22')+DV(oy+12,oy+27,ox+70,ox+64,'15')
    # glued together, seen from above
    gx=ox+90;b+=T(gx+32,oy-4,'GLUED TOGETHER (from above)',c='hd2')
    b+=R(gx,oy,64,7.5,'pt')+R(gx,oy+22.5,64,7.5,'pt')+R(gx,oy+7.5,22,15,'pt2')+R(gx+42,oy+7.5,22,15,'pt2')+R(gx+22,oy+7.5,20,15,'ho')
    b+=DH(gx,gx+64,oy+36,oy+30,'64')+DV(oy,oy+30,gx+70,gx+64,'30')+T(gx+32,oy+16,'hole',sz=3)+T(gx+32,oy+20,'20 × 15',sz=3)
    # side view with rubber pads
    sy=oy+62;b+=T(ox+45,sy-5,'FROM THE SIDE: 25 mm tall, rubber on both ends',c='hd2')
    b+=R(ox+10,sy+1,3,23,'pad')+R(ox+77,sy+1,3,23,'pad')+R(ox+13,sy,64,25,'pt')+R(ox+35,sy,20,25,'hid')
    b+=DV(sy,sy+25,ox+5,ox+10,'25')+DH(ox+10,ox+80,sy+32,sy+25,'70 with the rubber')
    b+=T(ox+120,sy+8,'rubber pad 28 × 23 × 3,',a='start',sz=3.1)+T(ox+120,sy+13,'glue one on each end',a='start',sz=3.1)
    b+=bar(ox+108,sy+28)
    return svg(190,112,b)

css='''
@page{size:A4;margin:10mm}
*{box-sizing:border-box}
body{font-family:Segoe UI,Roboto,Arial,sans-serif;color:#111;margin:0;font-size:11.5pt;line-height:1.35}
.page{page-break-after:always;break-after:page;position:relative;height:276mm}
.page:last-child{page-break-after:auto}
h1{font-size:22pt;margin:0 0 2mm}h2{font-size:17pt;margin:0 0 2mm;padding:1.5mm 3mm;background:#111;color:#fff;border-radius:2mm}
h3{font-size:12.5pt;margin:3mm 0 1.5mm}
p{margin:1mm 0 2mm}
.big{font-size:13pt}
table{border-collapse:collapse;width:100%;font-size:11pt}td,th{border:.3mm solid #888;padding:1.5mm 2mm;text-align:left;vertical-align:middle}th{background:#e8e8e8}
.tag{display:inline-block;width:7mm;height:7mm;border-radius:50%;background:#111;color:#fff;text-align:center;line-height:7mm;font-weight:700}
.box{border:.5mm solid #111;border-radius:2mm;padding:2.5mm 3.5mm;margin:2mm 0}
.warn{border-color:#c40;background:#fff2e8}
.ok{border-color:#1a7f37;background:#eef8f0}
ol.steps{margin:1mm 0;padding-left:0;list-style:none;counter-reset:s}
ol.steps li{counter-increment:s;position:relative;padding:1.2mm 0 1.2mm 10mm;margin:0}
ol.steps li::before{content:counter(s);position:absolute;left:0;top:1mm;width:7mm;height:7mm;border-radius:50%;background:#e8590c;color:#fff;text-align:center;line-height:7mm;font-weight:700}
.chk li{list-style:none;margin:1.2mm 0}.chk li::before{content:"☐ ";font-size:13pt}
.cards{display:flex;flex-wrap:wrap;gap:3mm}.card{flex:1 1 42mm;border:.3mm solid #999;border-radius:2mm;padding:2mm;font-size:10.5pt}
.card b{font-size:12pt;display:block}
img.r{width:100%;border:.3mm solid #999;display:block;border-radius:1.5mm}
.two{display:flex;gap:5mm;align-items:flex-start}.two>*{flex:1}
.dw{display:block}
.dw .pt{fill:#f3e3c4;stroke:#111;stroke-width:.4}.dw .pt2{fill:#e2c99a;stroke:#111;stroke-width:.4}
.dw .ho{fill:#fff;stroke:#111;stroke-width:.4}.dw .cut{fill:#fff;stroke:#111;stroke-width:.4}
.dw .back{fill:none;stroke:#111;stroke-width:.35;stroke-dasharray:2 1.3}.dw .csk{fill:none;stroke:#111;stroke-width:.3}
.dw .hid{fill:none;stroke:#111;stroke-width:.3;stroke-dasharray:2 1.3}.dw .hidl{stroke:#111;stroke-width:.3;stroke-dasharray:2 1.3}
.dw .pad{fill:#444;stroke:#111;stroke-width:.3}
.dw .cl{stroke:#888;stroke-width:.15}
.dw .dm{stroke:#c00;stroke-width:.25}.dw .ex{stroke:#c00;stroke-width:.15}.dw marker path{fill:#c00}
.dw .ld{stroke:#111;stroke-width:.25}
.dw .tag{fill:#111}.dw .tagt{fill:#fff;font-size:4.2px;font-weight:700}
.dw text{font-family:Segoe UI,Arial,sans-serif}.dw .dt{fill:#c00;font-size:3.6px;font-weight:700}.dw .lt{fill:#222;font-size:3.3px}.dw .hd2{fill:#111;font-size:3.6px;font-weight:700}
.dw .sb{fill:#fff;stroke:#111;stroke-width:.3}.dw .sbf{fill:#111}
.foot{position:absolute;bottom:0;left:0;right:0;font-size:8.5pt;color:#666;border-top:.2mm solid #bbb;padding-top:1mm;display:flex;justify-content:space-between}
'''
N=6
def page(body,n,title):
    return f'<section class="page">{body}<div class="foot"><span>Metal Monster robot – wooden hammer parts · {title}</span><span>page {n} of {N}</span></div></section>'
def holes(rows):
    return '<table><tr><th>Hole</th><th>How many</th><th>Drill bit</th><th>How deep</th><th>Where</th></tr>'+''.join(
        f'<tr><td><span class="tag">{a}</span></td><td>{b}</td><td><b>{c}</b></td><td>{d}</td><td>{e}</td></tr>' for a,b,c,d,e in rows)+'</table>'

p1='''<h1>Wooden parts for a robot hammer</h1>
<p class="big">Hello! Please make the <b>4 wooden parts</b> below. Each part has its own page with a drawing at <b>real size</b> and simple steps.</p>
<img class="r" src="img/asm.png" style="height:70mm;object-fit:cover">
<p style="font-size:9.5pt;color:#555">This is how it will look on the robot: the light wood plate holds a motor, the stick and head swing over the top.</p>
<h3>What to make</h3>
<div class="cards">
<div class="card"><b>1. Motor plate</b>1 piece · 12 mm plywood<br>80 wide × 78 tall<br>page 2–3</div>
<div class="card"><b>2. Stick</b>1 piece · hard wood (beech / oak)<br>20 × 15, 222.5 long<br>page 4</div>
<div class="card"><b>3. Two small blocks</b>2 pieces · any wood<br>44 × 12, 14.5 and 25 tall<br>page 4</div>
<div class="card"><b>4. Hammer head</b>1 · hard wood, glued from 4 pieces<br>64 × 30 × 25<br>page 5</div>
</div>
<h3>How to read the drawings</h3>
<table>
<tr><td style="width:40mm"><b>All numbers</b></td><td>are <b>millimetres (mm)</b>. 10 mm = 1 cm.</td></tr>
<tr><td><b style="color:#c00">Red arrows</b></td><td>a measurement: the number is the distance between the two arrow tips.</td></tr>
<tr><td><span class="tag">A</span> <span class="tag">B</span> …</td><td>a hole. The table under the drawing says which <b>drill bit</b> and <b>how deep</b>.</td></tr>
<tr><td><b>- - - dashed line</b></td><td>something on the <b>other side</b> of the wood (you can't see it from this side).</td></tr>
<tr><td><b>Real size</b></td><td>print the pages at <b>100 %</b> ("actual size", not "fit to page"). Then the drawing is exactly as big as the part – you can cut it out, glue it on the wood and drill through the marks. Check: the black-and-white bar must measure <b>50 mm</b> with a ruler.</td></tr>
</table>
<div class="box warn" style="margin-top:3mm"><b>Please do not drill</b> holes in the stick or the head – we drill those ourselves when we put everything together, so they line up.</div>'''

p2=f'''<h2>1 · Motor plate – drawing (real size)</h2>
<p>1 piece of <b>12 mm plywood</b>. This is the <b>FRONT side</b>. The motor goes on the <b>BACK side</b> (the dashed big circle is on the back).</p>
{upright_tpl()}
<p style="font-size:10pt">Tip: cut this page out along the outline, glue it on the plywood, cut the shape, then drill through the centre of each circle.</p>'''

p3=f'''<h2>1 · Motor plate – holes and steps</h2>
{holes([('A','1','26 mm flat-bottom bit (Forstner)','<b>9 mm only – do NOT go through</b>','from the <b>BACK</b> side, in the middle (40 from each side), 58 up from the bottom'),
        ('B','1','8 mm','all the way through','in the middle of hole A'),
        ('C','2','3.5 mm','through','8.5 above and 8.5 below the middle of A. On the <b>FRONT</b> side widen the top a little (countersink) so a flat screw head sits flush'),
        ('D','2','4.5 mm','through','12 up from the bottom, 15 in from each end'),
        ('E','2','3 mm','25 mm deep','into the <b>bottom edge</b>, 10 in from each end, in the middle of the 12 mm thickness')])}
<div style="margin-top:2mm">{upright_side()}{upright_edge()}</div>
<h3>Steps</h3>
<ol class="steps">
<li>Cut the shape from 12 mm plywood: 80 wide at the bottom, 50 wide at the top, 78 tall (see page 2). Sand the edges.</li>
<li>Mark the holes (or glue the real-size page 2 on the wood).</li>
<li>Turn the plate over to the <b>BACK</b> side. Drill hole <span class="tag">A</span> with the 26 mm flat-bottom bit, <b>only 9 mm deep</b> – stop when 3 mm of wood is left (tape on the drill bit at 9 mm helps).</li>
<li>Drill <span class="tag">B</span> (8 mm) through the middle of A.</li>
<li>Drill the 2 holes <span class="tag">C</span> (3.5 mm) through. On the <b>FRONT</b> side, widen their top with a countersink bit (or a 7 mm bit, just 2 mm).</li>
<li>Drill the 2 holes <span class="tag">D</span> (4.5 mm) through.</li>
<li>Stand the plate on its bottom edge and drill the 2 holes <span class="tag">E</span> (3 mm) straight down, 25 mm deep.</li></ol>'''

p4=f'''<h2>2 · Stick &nbsp;&nbsp;and&nbsp;&nbsp; 3 · Two small blocks</h2>
<div class="two"><div style="flex:0 0 46mm">{stick_tpl()}</div>
<div>
<h3>2 · Stick – 1 piece</h3>
<ol class="steps">
<li>Hard wood (beech or oak), <b>straight grain, no knots</b>.</li>
<li>Cut a strip <b>20 mm × 15 mm</b>.<br><span style="font-size:10pt">Exactly 20 × 15, or a tiny bit smaller (19.8 × 14.8) – <b>not bigger</b>: the top end must slide into a plastic part with a 20 × 15 hole.</span></li>
<li>Cut it to <b>222.5 mm</b> long, square ends.</li>
<li><b>No holes</b> – we drill them ourselves.</li></ol>
<h3 style="margin-top:6mm">3 · Two small blocks – 2 pieces</h3>
<div class="two"><div>{stops_tpl()}</div><div>
<ol class="steps">
<li>Cut 2 blocks, both <b>44 long × 12 thick</b>: block 1 is <b>14.5</b> tall, block 2 is <b>25</b> tall.</li>
<li>In each: 2 holes <span class="tag">F</span> <b>3.5 mm</b>, from the top straight through to the bottom, 7 mm from each end, in the middle of the 12 mm.</li>
<li>Glue a piece of 3.5 mm rubber (44 × 12) on top.</li></ol></div></div>
</div></div>'''

p5=f'''<h2>4 · Hammer head – made from 4 glued pieces</h2>
<p>Gluing 4 simple pieces is easier than cutting a square hole into one block. Use <b>hard wood</b>; all pieces are <b>25 mm tall</b>.</p>
{head_tpl()}
<table style="margin-top:2mm"><tr><th>Piece</th><th>How many</th><th>Size (long × tall × thick)</th></tr>
<tr><td>1 and 2 – long pieces</td><td>2</td><td><b>64 × 25 × 7.5</b></td></tr>
<tr><td>3 and 4 – small blocks</td><td>2</td><td><b>22 × 25 × 15</b></td></tr>
<tr><td>Rubber pads</td><td>2</td><td>28 × 23, 3 mm thick</td></tr></table>
<h3>Steps</h3>
<ol class="steps">
<li>Cut the 4 pieces. All of them exactly <b>25 mm</b> tall.</li>
<li>Glue: long piece – 2 small blocks at the two ends – long piece (like a sandwich, see the drawing). The gap in the middle must be a hole <b>20 × 15</b> going all the way through, top to bottom. Put the stick in the hole while the glue dries so it stays the right size (do not glue the stick!).</li>
<li>Clamp and let it dry. Sand the outside flat: 64 × 30 × 25.</li>
<li>Glue a rubber pad on each 30 × 25 end.</li>
<li><b>No other holes</b> – we drill the bolt hole ourselves.</li></ol>'''

p6='''<h2>Finished? Please check</h2>
<ul class="chk big">
<li>Motor plate: 80 wide, 78 tall, 12 thick. Hole <span class="tag">A</span> is only 9 mm deep (3 mm of wood left) and on the <b>back</b> side.</li>
<li>Motor plate: holes <span class="tag">C</span> are countersunk on the <b>front</b> side (the side without hole A).</li>
<li>Motor plate: 2 small holes <span class="tag">E</span> in the bottom edge.</li>
<li>Stick: 20 × 15 (not bigger), 222.5 long, no holes.</li>
<li>Stick slides into the hole of the head without forcing.</li>
<li>Head: 64 × 30 × 25, rubber on both ends, 20 × 15 hole through the middle.</li>
<li>2 blocks: 14.5 and 25 tall, 2 holes each, rubber on top.</li>
</ul>
<h3>How we will use the parts</h3>
<div class="two"><div><img class="r" src="img/upm.png" style="height:58mm;object-fit:cover"><p style="font-size:9.5pt">The motor (blue) sits in the 26 mm hole of the plate; 2 metal angles bolt the plate to the robot.</p></div>
<div><img class="r" src="img/hub.png" style="height:58mm;object-fit:cover"><p style="font-size:9.5pt">A 3D-printed part (orange) goes on the motor; the stick (blue) slides into it and we bolt it.</p></div></div>
<div class="box ok" style="margin-top:4mm"><b>Thank you!</b> If something is not clear, call us before cutting – it is easier to ask than to make it again.</div>'''

html='<!doctype html><html><head><meta charset="utf-8"><title>Robot hammer – wooden parts</title><style>'+css+'</style></head><body>'+''.join(
    page(b,i+1,t) for i,(b,t) in enumerate([(p1,'overview'),(p2,'motor plate drawing'),(p3,'motor plate steps'),(p4,'stick and blocks'),(p5,'hammer head'),(p6,'check list')]))+'</body></html>'
open(out,'w',encoding='utf-8').write(html)
print('written')
