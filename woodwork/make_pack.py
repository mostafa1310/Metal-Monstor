# Builds the laser-cut pack for the wooden hammer parts (stick + head), all from 6 mm plywood:
#   laser/Hammer_T_layer_6mm.svg/.dxf            stick T layer, 2 pieces (glued face to face -> 12 mm stick)
#   laser/Hammer_head_side_plate_6mm.svg/.dxf    head side plate, 2 pieces (one each side -> head 24 mm)
#   laser/Hammer_all_parts_6mm.svg/.dxf          all 4 pieces on one sheet (send this one if the shop wants one file)
#   Hammer_wood_parts.html            build guide (print it to PDF with Chrome)
# The motor upright, hub and stop posts are 3D printed (stl/P7–P10). Sizes = lib/robot.js.
# usage: python make_pack.py
import os
HERE=os.path.dirname(os.path.abspath(__file__))
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
def fmt(v):
    v=round(v,1);return str(int(v)) if abs(v-round(v))<1e-6 else f'{v:.1f}'
def DH(x1,x2,y,yr,t=None):
    s=1 if y>yr else -1;t=t or fmt(abs(x2-x1))
    return L(x1,yr+s*1,x1,y+s*1.5,'ex')+L(x2,yr+s*1,x2,y+s*1.5,'ex')+f'<line class="dm" x1="{x1:.2f}" y1="{y:.2f}" x2="{x2:.2f}" y2="{y:.2f}" marker-start="#AR#" marker-end="#AR#"/>'+T((x1+x2)/2,y-1.2,t,c='dt')
def DV(y1,y2,x,xr,t=None):
    s=1 if x>xr else -1;t=t or fmt(abs(y2-y1))
    return L(xr+s*1,y1,x+s*1.5,y1,'ex')+L(xr+s*1,y2,x+s*1.5,y2,'ex')+f'<line class="dm" x1="{x:.2f}" y1="{y1:.2f}" x2="{x:.2f}" y2="{y2:.2f}" marker-start="#AR#" marker-end="#AR#"/>'+T(x-1.2,(y1+y2)/2,t,c='dt',rot=-90)

# ---------------------------------------------------------------- geometry (mm) – keep in step with lib/robot.js
# 2 flat outlines, everything from 6 mm plywood (the shop's maximum):
#   stick T    – 2 pieces, glued face to face -> 12 mm (the stick + the middle of the head in one piece)
#   side plate – 2 pieces, one glued on each side of the T end -> head 64 × 25 × 24
TH=6                       # sheet thickness
LEN=222.5                  # stick: 10 mm below the motor axis down to the bottom of the head
SW=20                      # stick width (swing direction)
HL,HW=25,64                # head: height along the stick, length in the swing direction
HOLE=4.3                   # Ø for M4
STICK_H=[12,24,LEN-17.5]   # bolt holes from the top: 2 in the hub, 1 through the head (7.5 below the head top)
def t_shape(x,y):          # top of the stick at x, centre line at y
    return ([(x,y-SW/2),(x+LEN-HL,y-SW/2),(x+LEN-HL,y-HW/2),(x+LEN,y-HW/2),(x+LEN,y+HW/2),(x+LEN-HL,y+HW/2),(x+LEN-HL,y+SW/2),(x,y+SW/2)],
            [(x+u,y) for u in STICK_H])
def side_plate(x,y):       # 64 × 25, top-left corner at x,y; top edge = shaft side, hole 7.5 below it
    return ([(x,y),(x+HW,y),(x+HW,y+HL),(x,y+HL)],[(x+HW/2,y+7.5)])

# ---------------------------------------------------------------- cut files (SVG + DXF, 1:1 mm)
def write_cut(name,parts,W,H,note):
    st='fill:none;stroke:#ff0000;stroke-width:0.1'
    b=''.join(f'<polygon style="{st}" points="{" ".join(f"{px:.3f},{py:.3f}" for px,py in pts)}"/>'+
              ''.join(f'<circle style="{st}" cx="{cx:.3f}" cy="{cy:.3f}" r="{HOLE/2:.3f}"/>' for cx,cy in holes) for pts,holes in parts)
    open(os.path.join(HERE,'laser',name+'.svg'),'w',encoding='utf-8').write(
        f'<?xml version="1.0" encoding="UTF-8"?>\n<!-- Metal Monster hammer – {note}. 1:1, mm, red = cut. -->\n'
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{W:.1f}mm" height="{H:.1f}mm" viewBox="0 0 {W:.1f} {H:.1f}">{b}</svg>\n')
    # DXF R12: LINE + CIRCLE on layer CUT, y flipped (DXF y points up), units mm
    e=[]
    for pts,holes in parts:
        for (x1,y1),(x2,y2) in zip(pts,pts[1:]+pts[:1]):
            e+=['0','LINE','8','CUT','10',f'{x1:.3f}','20',f'{H-y1:.3f}','30','0','11',f'{x2:.3f}','21',f'{H-y2:.3f}','31','0']
        for cx,cy in holes: e+=['0','CIRCLE','8','CUT','10',f'{cx:.3f}','20',f'{H-cy:.3f}','30','0','40',f'{HOLE/2:.3f}']
    d=['0','SECTION','2','HEADER','9','$INSUNITS','70','4','0','ENDSEC',
       '0','SECTION','2','TABLES','0','TABLE','2','LAYER','70','1','0','LAYER','2','CUT','70','0','62','1','6','CONTINUOUS','0','ENDTAB','0','ENDSEC',
       '0','SECTION','2','ENTITIES']+e+['0','ENDSEC','0','EOF']
    open(os.path.join(HERE,'laser',name+'.dxf'),'w',encoding='ascii',newline='\r\n').write('\n'.join(d)+'\n')
def cut_files():
    os.makedirs(os.path.join(HERE,'laser'),exist_ok=True)
    G=5
    write_cut('Hammer_T_layer_6mm',[t_shape(G,G+HW/2),t_shape(G,2*G+HW+HW/2)],LEN+2*G,2*HW+3*G,'stick T layer, 6 mm plywood, 2 pieces (glue face to face)')
    write_cut('Hammer_head_side_plate_6mm',[side_plate(G,G),side_plate(2*G+HW,G)],3*G+2*HW,HL+2*G,'head side plate, 6 mm plywood, 2 pieces')
    # one sheet: the 2 Ts above each other, the 2 plates below them
    y3=3*G+2*HW
    write_cut('Hammer_all_parts_6mm',[t_shape(G,G+HW/2),t_shape(G,2*G+HW+HW/2),side_plate(G,y3),side_plate(2*G+HW,y3)],LEN+2*G,y3+HL+G,
              'all hammer parts, 6 mm plywood: 2 stick T layers + 2 head side plates')

# ---------------------------------------------------------------- drawings for the guide (full size)
def t_drawing():
    ox,oy=12,52;pts,holes=t_shape(ox,oy)
    b=P(pts)+''.join(C(x,y,HOLE/2) for x,y in holes)+R(ox,oy-SW/2,30,SW,'hid')
    b+=DH(ox,ox+LEN,oy+HW/2+8,oy+HW/2)+DV(oy-SW/2,oy+SW/2,ox-5,ox,'20')+DV(oy-HW/2,oy+HW/2,ox+LEN+7,ox+LEN,'64')
    b+=DH(ox,ox+12,oy-SW/2-5,oy-SW/2)+DH(ox,ox+24,oy-SW/2-12,oy-SW/2)+DH(ox+LEN-HL,ox+LEN,oy-HW/2-5,oy-HW/2,'25')+DH(ox+LEN-HL,ox+LEN-17.5,oy-HW/2-12,oy-HW/2,'7.5')
    b+=T(ox+15,oy+SW/2+4,'goes in the hub',sz=3)+T(ox+100,oy+1.2,'STICK T – 6 mm, 2 pieces (glued = 12)',c='hd2')
    b+=T(ox+100,oy+HW/2+18,'all holes Ø4.3 · the head hole is on the centre line',sz=3.2)
    return svg(260,108,b)
def head_drawing():
    ox,oy=10,11;pts,holes=side_plate(ox,oy)
    b=P(pts)+''.join(C(x,y,HOLE/2) for x,y in holes)
    b+=DH(ox,ox+HW,oy+HL+7,oy+HL)+DV(oy,oy+HL,ox-5,ox,'25')+DH(ox,ox+HW/2,oy-5,oy,'32')+DV(oy,oy+7.5,ox+HW+6,ox+HW,'7.5')
    b+=T(ox+HW/2,oy+HL+16,'SIDE PLATE – 6 mm thick, 2 pieces',c='hd2')
    return svg(90,59,b)
def stack_drawing():   # head seen from below: plate + 2 T ends + plate
    ox,oy=20,10;b=R(ox,oy,HW,TH,'pt')+R(ox,oy+TH,HW,TH,'pt2')+R(ox,oy+2*TH,HW,TH,'pt2')+R(ox,oy+3*TH,HW,TH,'pt')
    b+=R(ox-3,oy+1,3,4*TH-2,'pad')+R(ox+HW,oy+1,3,4*TH-2,'pad')
    b+=DH(ox,ox+HW,oy-4,oy)+DV(oy,oy+4*TH,ox+HW+9,ox+HW,'24')+DV(oy+TH,oy+3*TH,ox-8,ox,'12')
    b+=T(ox+HW/2,oy+4*TH+9,'head from below: plate + 2 stick layers + plate',sz=3.2)
    return svg(110,47,b)

css='''
@page{size:A4 landscape;margin:10mm}
*{box-sizing:border-box}
body{font-family:Segoe UI,Roboto,Arial,sans-serif;color:#111;margin:0;font-size:11.5pt;line-height:1.35}
.page{page-break-after:always;break-after:page;position:relative;height:189mm}
.page:last-child{page-break-after:auto}
h1{font-size:22pt;margin:0 0 2mm}h2{font-size:17pt;margin:0 0 2mm;padding:1.5mm 3mm;background:#111;color:#fff;border-radius:2mm}
h3{font-size:12.5pt;margin:3mm 0 1.5mm}
p{margin:1mm 0 2mm}
table{border-collapse:collapse;width:100%;font-size:11pt}td,th{border:.3mm solid #888;padding:1.5mm 2mm;text-align:left;vertical-align:middle}th{background:#e8e8e8}
.box{border:.5mm solid #111;border-radius:2mm;padding:2.5mm 3.5mm;margin:2mm 0}
.warn{border-color:#c40;background:#fff2e8}
ol.steps{margin:1mm 0;padding-left:0;list-style:none;counter-reset:s}
ol.steps li{counter-increment:s;position:relative;padding:1.2mm 0 1.2mm 10mm;margin:0}
ol.steps li::before{content:counter(s);position:absolute;left:0;top:1mm;width:7mm;height:7mm;border-radius:50%;background:#e8590c;color:#fff;text-align:center;line-height:7mm;font-weight:700}
.chk li{list-style:none;margin:1.2mm 0}.chk li::before{content:"☐ ";font-size:13pt}
.two{display:flex;gap:6mm;align-items:flex-start}.two>*{flex:1}
.dw{display:block}
.dw .pt{fill:#f3e3c4;stroke:#111;stroke-width:.4}.dw .pt2{fill:#e2c99a;stroke:#111;stroke-width:.4}
.dw .ho{fill:#fff;stroke:#111;stroke-width:.4}
.dw .hid{fill:none;stroke:#111;stroke-width:.3;stroke-dasharray:2 1.3}
.dw .pad{fill:#444;stroke:#111;stroke-width:.3}
.dw .dm{stroke:#c00;stroke-width:.25}.dw .ex{stroke:#c00;stroke-width:.15}.dw marker path{fill:#c00}
.dw text{font-family:Segoe UI,Arial,sans-serif}.dw .dt{fill:#c00;font-size:3.6px;font-weight:700}.dw .lt{fill:#222;font-size:3.3px}.dw .hd2{fill:#111;font-size:3.6px;font-weight:700}
.foot{position:absolute;bottom:0;left:0;right:0;font-size:8.5pt;color:#666;border-top:.2mm solid #bbb;padding-top:1mm;display:flex;justify-content:space-between}
'''
N=2
def page(body,n,title):
    return f'<section class="page">{body}<div class="foot"><span>Metal Monster robot – hammer stick + head (laser cut) · {title}</span><span>page {n} of {N}</span></div></section>'

def build():
    cut_files()
    p1=f'''<h1>Hammer stick + head – laser cut</h1>
<p>Only the stick and the head are wood. They are <b>2 flat shapes, both cut from 6 mm plywood</b> (the laser's maximum):
<b>2 × the stick T</b>, glued face to face → a <b>12 mm</b> stick, and <b>2 side plates</b>, one glued on each side of the head → a <b>24 mm</b> head.
Finished sizes: stick 20 × 12, head 64 × 25 × 24. The motor upright, the hub and the stop posts are <b>3D printed</b> (stl/P7 hub with a 12.3 mm slot, P8 upright, P9 / P10 stop posts).</p>
<div class="two"><div>
<h3>Send to the laser shop</h3>
<table><tr><th>File (SVG or DXF)</th><th>Thickness</th><th>How many</th></tr>
<tr><td>laser/Hammer_all_parts_6mm<br><span style="font-size:9.5pt">(all 4 pieces on one sheet, 233 × 173 mm)</span></td><td><b>6 mm</b></td><td><b>1 sheet</b> = 2 T + 2 plates</td></tr>
<tr><td colspan="3" style="font-size:9.5pt">or the same pieces split: laser/Hammer_T_layer_6mm (2 T) + laser/Hammer_head_side_plate_6mm (2 plates)</td></tr></table>
<table style="margin-top:2mm">
<tr><td style="width:40mm"><b>Material</b></td><td><b>birch plywood 6 mm</b> (not MDF – it splits at the bolt holes)</td></tr>
<tr><td><b>Scale</b></td><td>1:1, units mm – import <b>without scaling</b></td></tr>
<tr><td><b>Lines</b></td><td>all lines are cut-through lines (layer CUT in the DXF, red in the SVG)</td></tr>
<tr><td><b>Check</b></td><td>the stick T must measure <b>222.5 mm</b> long and <b>20 mm</b> wide</td></tr>
</table>
<p style="font-size:10pt">"6 mm" plywood is often 5.5–5.8 mm. Measure the glued stick: if it is under 11.5 mm, tell me before printing the hub – the slot (12.3) can follow it.</p>
</div><div>
<h3>Also needed</h3>
<table>
<tr><td>Wood glue (or epoxy)</td><td>–</td></tr>
<tr><td>M4×35 + nyloc</td><td>2 – hub → stick</td></tr>
<tr><td>M4×30 + nyloc</td><td>1 – through the head</td></tr>
<tr><td>Rubber / TPU pad 22 × 23 × 3</td><td>2 – one on each end of the head</td></tr>
</table>
{stack_drawing()}
<h3>Checks</h3><ul class="chk" style="padding-left:0"><li>Glued stick measures 11.5–12.2 mm thick.</li><li>Stick slides into the hub slot without forcing.</li><li>The side plate holes line up with the head hole of the stick.</li></ul>
</div></div>'''
    p2=f'''<h2>The 2 shapes (real size at 100 %) – cut each twice – and gluing</h2>
{t_drawing()}
<div class="two"><div style="flex:0 0 92mm">{head_drawing()}</div><div>
<ol class="steps">
<li>Glue the 2 <b>stick Ts</b> face to face (thin even layer of wood glue). Push M4 bolts through the 3 holes to line them up, clamp along the whole length, let dry → <b>12 mm</b> stick.</li>
<li>Glue the 2 <b>side plates</b> on both sides of the wide end, M4 bolt through the head hole to line them up, clamp, let dry. The head is now <b>64 × 25 × 24</b>.</li>
<li>When dry: <b>M4×30 + nyloc</b> through the head. Sand the edges.</li>
<li>Glue a rubber pad on each 25 × 24 end of the head.</li>
<li>Top 30 mm of the stick into the printed hub slot (12.3 × 20) with epoxy, <b>2 × M4×35</b> through hub + stick.</li></ol>
</div></div>'''
    html='<!doctype html><html><head><meta charset="utf-8"><title>Hammer stick and head</title><style>'+css+'</style></head><body>'+''.join(
        page(b,i+1,t) for i,(b,t) in enumerate([(p1,'overview'),(p2,'shapes and gluing')]))+'</body></html>'
    open(os.path.join(HERE,'Hammer_wood_parts.html'),'w',encoding='utf-8').write(html)
    print('written')
build()
