import sys
from PIL import Image, ImageFilter, ImageDraw
from reportlab.pdfgen import canvas
from reportlab.lib.units import inch
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph, Frame
from reportlab.lib.fonts import addMapping

SRC, FONTS, OUT, PREVIEW, PAGES = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4], int(sys.argv[5])
DPI=300; BLEED=0.125; TRIM_W=6.0; TRIM_H=9.0
SPINE=round(PAGES*0.0025,4)                       # KDP cream paper
W=BLEED+TRIM_W+SPINE+TRIM_W+BLEED; H=BLEED+TRIM_H+BLEED
px=lambda v: round(v*DPI)
Wp,Hp=px(W),px(H)
fold_l=BLEED+TRIM_W; fold_r=fold_l+SPINE           # spine folds (inches from left)
print(f'spine {SPINE} in; page {W:.3f} x {H:.3f} in = {Wp} x {Hp} px')

src=Image.open(SRC).convert('RGB')
# ---- front: scale so it covers the front panel incl. right bleed, centred on the visible front panel
front_cx=fold_r+TRIM_W/2
fw=max(2*(W-front_cx), src.width/src.height*H)       # inches
fh=fw*src.height/src.width
front=src.resize((px(fw),px(fh)),Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=1.4,percent=55,threshold=2))
fx=px(front_cx-fw/2); fy=px((H-fh)/2)
bg=Image.new('RGB',(Wp,Hp))
# ---- back + spine: extend the front's text-free left edge (horizon, dust, sky) around the wrap
import random
edge=front.crop((0,0,30,front.height)).resize((1,front.height),Image.BOX)
back=edge.resize((fx+80,front.height),Image.BILINEAR).filter(ImageFilter.GaussianBlur(28))
noise=Image.effect_noise((back.width,back.height),18).convert('RGB')
back=Image.blend(back,Image.composite(noise,back,Image.new('L',back.size,40)),0.18)
bg=Image.new('RGB',(Wp,Hp)); bg.paste(back,(0,fy))
fade=Image.new('L',front.size,255); d=ImageDraw.Draw(fade)
for x in range(80): d.line([(x,0),(x,front.height)],fill=int(255*x/80))   # feather front into the extension
bg.paste(front,(fx,fy),fade)
# darken back (stronger at top where text sits) and spine
dark=Image.new('L',(Wp,Hp),0); d=ImageDraw.Draw(dark)
for y in range(Hp):
    t=y/Hp; a=0.70-0.12*min(t/0.75,1)+0.05*max(0,(t-0.75)/0.25)
    d.line([(0,y),(px(fold_l)-1,y)],fill=int(255*a))
d.rectangle([px(fold_l),0,px(fold_r),Hp],fill=int(255*0.35))
for x in range(px(fold_r),px(fold_r)+40):                      # soft edge spine->front
    d.line([(x,0),(x,Hp)],fill=int(255*0.35*(1-(x-px(fold_r))/40)))
bg=Image.composite(Image.new('RGB',(Wp,Hp),(8,6,10)),bg,dark)
# ---- glyph from the front art, placed upright on the spine
gx0,gy0,gx1,gy1=(0.395,0.050,0.605,0.150)                     # fractions of source image
g=src.crop((int(gx0*src.width),int(gy0*src.height),int(gx1*src.width),int(gy1*src.height)))
gl=g.convert('L').point(lambda v: max(0,min(255,(v-60)*3)))
gw=px(SPINE*0.62); gh=round(gw*g.height/g.width)
g=g.resize((gw,gh),Image.LANCZOS); gl=gl.resize((gw,gh),Image.LANCZOS)
spine_cx=(fold_l+fold_r)/2
bg.paste(g,(px(spine_cx)-gw//2,px(BLEED+0.40)),gl)
bg.save(OUT+'.bg.jpg',quality=95,subsampling=0,dpi=(DPI,DPI))

# ---- PDF with vector type
for n,f in [('Cinzel','Cinzel.ttf'),('EBG','EBGaramond.ttf'),('EBGI','EBGaramond-Italic.ttf')]:
    pdfmetrics.registerFont(TTFont(n,f'{FONTS}/{f}'))
addMapping('EBG',0,0,'EBG'); addMapping('EBG',0,1,'EBGI'); addMapping('EBG',1,0,'EBG'); addMapping('EBG',1,1,'EBGI')
CREAM=(0.93,0.89,0.79)
c=canvas.Canvas(OUT,pagesize=(W*inch,H*inch),initialFontName='EBG',initialFontSize=11)
c.setTitle('Celestial Heritage - paperback cover'); c.setAuthor('Paul Cobb')
c.drawImage(OUT+'.bg.jpg',0,0,W*inch,H*inch)
c.setFillColorRGB(*CREAM)
# spine text, reading top-to-bottom (US convention)
c.saveState(); c.translate(spine_cx*inch,(H/2)*inch); c.rotate(-90)
c.setFont('Cinzel',21); c.drawCentredString(-0.55*inch,-7.3,'CELESTIAL HERITAGE')
c.setFont('Cinzel',13); c.drawCentredString(3.05*inch,-4.6,'PAUL COBB')
c.restoreState()
# back cover copy
import re
desc=re.sub(r"(\w)'(\w)",r'\1’\2',open(sys.argv[6]).read().strip()).split('\n\n')
hook=ParagraphStyle('hook',fontName='EBGI',fontSize=15.5,leading=19.5,textColor=CREAM,alignment=1,spaceAfter=14)
body=ParagraphStyle('body',fontName='EBG',fontSize=11.4,leading=15.2,textColor=CREAM,spaceAfter=7.5,firstLineIndent=0,alignment=4)
tail=ParagraphStyle('tail',parent=body,fontName='EBGI',spaceBefore=6,alignment=1)
paras=[Paragraph(desc[0],hook)]+[Paragraph(p,body) for p in desc[1:-1]]+[Paragraph(desc[-1],tail)]
fx0=BLEED+0.62; fwid=TRIM_W-1.24; ftop=H-BLEED-0.80; fbot=BLEED+1.75
fr=Frame(fx0*inch,fbot*inch,fwid*inch,(ftop-fbot)*inch,0,0,0,0,showBoundary=0)
left=fr.addFromList(paras,c)
if paras: raise SystemExit(f'BACK COPY DOES NOT FIT: {len(paras)} paragraphs left over')
c.setFont('Cinzel',9.5); c.drawString(fx0*inch,(BLEED+0.62)*inch,'THE CELESTIAL HERITAGE SAGA  ·  BOOK I')
c.showPage(); c.save()

# ---- preview with guides (not for upload)
pv=bg.copy(); d=ImageDraw.Draw(pv)
def vline(x,col): d.line([(px(x),0),(px(x),Hp)],fill=col,width=4)
def hline(y,col): d.line([(0,px(y)),(Wp,px(y))],fill=col,width=4)
for x in (BLEED,W-BLEED): vline(x,(0,255,255))
for y in (BLEED,H-BLEED): hline(y,(0,255,255))
for x in (fold_l,fold_r): vline(x,(255,0,255))
bx1=fold_l-0.25; by1=H-BLEED-0.25
d.rectangle([px(bx1-2.0),px(by1-1.2),px(bx1),px(by1)],outline=(255,255,0),width=5)
pv.save(PREVIEW,quality=90)
print('ok')
