# Figures de la fiche PC 6 (Ondes : propagation, son, diffraction, interférences et effet Doppler), palette MasterBac
# usage : pc-06-ondes.py <dossier de sortie, en général fiches/pc-06-ondes/figs>
import sys, math
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Circle, Polygon, Arc, Rectangle, FancyBboxPatch
from matplotlib.colors import LinearSegmentedColormap
from PIL import Image, ImageChops

out = sys.argv[1]
ANTH='#2B2C2D'; CUIVRE='#A47351'; NUIT='#001128'; GRIS='#8A8F98'; GRISC='#DAD5D0'
VERT='#2E6B4F'; BRIQUE='#B23A2E'; BLEU='#2F5D8A'; CUIVREC='#E9DDD3'; EAU='#DCE9F2'; SABLE='#F4E3C3'
plt.rcParams.update({'font.family':'Carlito','font.size':11,'mathtext.fontset':'stix',
                     'axes.linewidth':0,'savefig.dpi':300})

def new(w,h,xlim,ylim):
    fig,ax=plt.subplots(figsize=(w,h))
    ax.set_xlim(*xlim); ax.set_ylim(*ylim); ax.set_aspect('equal'); ax.axis('off')
    fig.subplots_adjust(0,0,1,1)
    return fig,ax
def arrow(ax,x0,y0,x1,y1,color=ANTH,lw=1.6,head=7,ls='-',zorder=5):
    ax.annotate('',xy=(x1,y1),xytext=(x0,y0),zorder=zorder,
                arrowprops=dict(arrowstyle='-|>',color=color,lw=lw,mutation_scale=head*1.6,
                                shrinkA=0,shrinkB=0,linestyle=ls))
def dim(ax,x0,y0,x1,y1,color=GRIS,lw=1.0):
    ax.annotate('',xy=(x1,y1),xytext=(x0,y0),
                arrowprops=dict(arrowstyle='<|-|>',color=color,lw=lw,mutation_scale=9,shrinkA=0,shrinkB=0))
def rogne(p):
    im=Image.open(p).convert('RGB')
    bg=Image.new('RGB',im.size,(255,255,255))
    box=ImageChops.difference(im,bg).convert('L').point(lambda v:255 if v>8 else 0).getbbox()
    pad=14
    im=im.crop((max(0,box[0]-pad),max(0,box[1]-pad),min(im.width,box[2]+pad),min(im.height,box[3]+pad)))
    im.save(p,dpi=(300,300)); return im.size
def save(fig,name):
    p=f'{out}/{name}.png'
    fig.savefig(p,facecolor='white'); plt.close(fig)
    print(name,rogne(p))
def axes_style(ax,xlab,ylab):
    ax.grid(color=GRISC,lw=0.6)
    for s in ('top','right'): ax.spines[s].set_visible(False)
    for s in ('left','bottom'): ax.spines[s].set_linewidth(1.0); ax.spines[s].set_color(ANTH)
    ax.tick_params(labelsize=8.5,colors=ANTH,width=0.8)
    ax.set_xlabel(xlab,fontsize=10); ax.set_ylabel(ylab,fontsize=10)
def graphe(w,h,xl,yl,xlab,ylab,xt,yt):
    fig,ax=plt.subplots(figsize=(w,h)); fig.subplots_adjust(0.13,0.15,0.97,0.96)
    ax.set_xlim(*xl); ax.set_ylim(*yl); ax.set_xticks(xt); ax.set_yticks(yt)
    axes_style(ax,xlab,ylab)
    return fig,ax
def wl_rgb(w):
    if w<440: r,g,b=(440-w)/60,0.0,1.0
    elif w<490: r,g,b=0.0,(w-440)/50,1.0
    elif w<510: r,g,b=0.0,1.0,(510-w)/20
    elif w<580: r,g,b=(w-510)/70,1.0,0.0
    elif w<645: r,g,b=1.0,(645-w)/65,0.0
    else: r,g,b=1.0,0.0,0.0
    f=0.35+0.65*(w-380)/40 if w<420 else (1.0 if w<=700 else 0.35+0.65*(800-w)/100)
    return tuple(min(1.0,max(0.0,(c*f)**0.8)) for c in (r,g,b))
def virg(v,nd=0):
    return (f'{v:.{nd}f}').replace('.',',')
def mille(v):
    return f'{v:,}'.replace(',',' ')

# ---------------------------------------------------------------- 1. Ex. 1 : salve émise et écho (oscillogramme)
fig,ax=plt.subplots(figsize=(6.2,3.0)); fig.subplots_adjust(0.07,0.17,0.99,0.97)
ax.set_xlim(0,20); ax.set_ylim(-4,4)
ax.set_xticks(range(0,21,2)); ax.set_yticks(range(-4,5,1))
ax.set_xticks(np.arange(0,20.01,0.4),minor=True)
ax.grid(which='major',color=GRISC,lw=0.6); ax.tick_params(which='minor',length=2.5,color=GRIS)
for s in ('top','right','left'): ax.spines[s].set_visible(False)
ax.spines['bottom'].set_color(ANTH); ax.set_yticklabels([])
ax.tick_params(axis='y',length=0); ax.tick_params(axis='x',labelsize=8.5,colors=ANTH)
ax.set_xlabel('$t$ (ms)',fontsize=10)
t=np.linspace(0,20,40001)
f=40.0   # kHz : 40 périodes par ms
s1=np.where(t<0.2,np.sin(2*np.pi*f*t),0.0)
t0=2*2.00/343*1e3   # 11,66 ms
env=np.where(t>=t0,np.clip((t-t0)/0.15,0,1)*np.exp(-np.clip(t-t0-0.15,0,None)/0.35),0.0)
s2=0.55*env*np.sin(2*np.pi*f*(t-t0))
ax.plot(t,2.0+1.3*s1,color=CUIVRE,lw=0.6)
ax.plot(t,-2.0+1.3*s2,color=BLEU,lw=0.6)
ax.axhline(2.0,color=GRIS,lw=0.4,zorder=0); ax.axhline(-2.0,color=GRIS,lw=0.4,zorder=0)
ax.text(0.5,3.25,'voie 1 : salve émise',fontsize=9.5,color=CUIVRE)
ax.text(0.5,-0.85,'voie 2 : écho reçu',fontsize=9.5,color=BLEU)
p=f'{out}/fig_telemetre.png'; fig.savefig(p,facecolor='white'); plt.close(fig); print('fig_telemetre',rogne(p))

# ---------------------------------------------------------------- 2. Ex. 2 : atténuation de deux protections auditives
fr=[125,250,500,1000,2000,4000,8000]
casque=[10,15,22,28,32,35,33]; bouch=[14,15,15,16,16,17,18]
fig,ax=plt.subplots(figsize=(5.0,3.3)); fig.subplots_adjust(0.13,0.16,0.97,0.96)
ax.set_xscale('log'); ax.set_xlim(100,10000); ax.set_ylim(0,40)
ax.set_xticks(fr); ax.set_xticklabels(['125','250','500','1 000','2 000','4 000','8 000'])
ax.minorticks_off(); ax.set_yticks(range(0,41,5))
axes_style(ax,'Fréquence (Hz)','Atténuation (dB)')
ax.plot(fr,casque,color=BLEU,lw=1.6,marker='o',ms=4.5)
ax.plot(fr,bouch,color=CUIVRE,lw=1.6,marker='s',ms=4.5)
ax.text(150,25.5,'casque serre-tête',fontsize=9.5,color=BLEU)
ax.text(1800,10.5,'bouchons moulés à filtre',fontsize=9.5,color=CUIVRE)
p=f'{out}/fig_protections.png'; fig.savefig(p,facecolor='white'); plt.close(fig); print('fig_protections',rogne(p))

# ---------------------------------------------------------------- 3. Q.15 : géométrie de la tache centrale (vue de dessus)
fig,ax=new(5.6,3.1,(-0.4,11.2),(-3.0,3.2))
ax.add_patch(Rectangle((-0.3,-0.35),1.3,0.7,fc=GRISC,ec=ANTH,lw=1.0))
ax.text(0.35,-0.75,'laser',ha='center',va='top',fontsize=10)
ax.plot([1.0,2.2],[0,0],color=BRIQUE,lw=2.2)
ax.plot([2.2,2.2],[0.12,1.8],color=ANTH,lw=3); ax.plot([2.2,2.2],[-0.12,-1.8],color=ANTH,lw=3)
ax.text(2.2,2.0,'fente',ha='center',va='bottom',fontsize=10)
xe=10.0; Lh=1.9
ax.add_patch(Polygon([(2.2,0),(xe,Lh),(xe,-Lh)],closed=True,fc='#F3D9D5',ec='none',zorder=1))
ax.plot([2.2,xe],[0,Lh],color=BRIQUE,lw=1.2); ax.plot([2.2,xe],[0,-Lh],color=BRIQUE,lw=1.2)
ax.plot([2.2,xe],[0,0],color=ANTH,lw=0.9,ls=(0,(4,3)))
ax.plot([xe,xe],[-2.5,2.5],color=ANTH,lw=2.2)
ax.text(xe+0.15,2.55,'écran',ha='left',va='bottom',fontsize=10)
ang=math.degrees(math.atan(Lh/(xe-2.2)))
ax.add_patch(Arc((2.2,0),5.2,5.2,theta1=0,theta2=ang,color=ANTH,lw=1.1))
ax.text(5.25,0.36,r'$\theta$',fontsize=13,ha='center',va='center',zorder=8,bbox=dict(fc='#F3D9D5',ec='none',pad=0.4))
ax.plot([xe-0.3,xe-0.3,xe],[0,0.3,0.3],color=ANTH,lw=0.8)
for (x,y,s_,dx,dy) in [(2.2,0,'A',-0.55,0.38),(xe,0,'B',0.18,0.0),(xe,Lh,'C',0.18,0.0),(xe,-Lh,'C\u2032',0.18,0.0)]:
    ax.plot(x,y,'o',color=ANTH,ms=3.2,zorder=6); ax.text(x+dx,y+dy,s_,fontsize=12,va='center',fontfamily='STIXGeneral')
dim(ax,2.2,-2.4,xe,-2.4); ax.text((2.2+xe)/2,-2.6,'$D$',ha='center',va='top',fontsize=12)
dim(ax,xe+0.85,-Lh,xe+0.85,Lh); ax.text(xe+1.0,0.0,'$L$',ha='left',va='center',fontsize=12)
save(fig,'fig_diff_geom')

# ---------------------------------------------------------------- 4. Q.17 : figure de diffraction, règle et intensité
x=np.linspace(-21,21,4201); u=np.pi*x/6.5
I=np.where(np.abs(x)<1e-9,1.0,(np.sin(u)/np.where(np.abs(u)<1e-12,1,u))**2)
fig,(a1,a2)=plt.subplots(2,1,figsize=(6.2,3.9),gridspec_kw={'height_ratios':[1.0,1.7]})
fig.subplots_adjust(0.08,0.13,0.93,0.99,hspace=0.32)
cm=LinearSegmentedColormap.from_list('tache',['#000000','#5A1410','#B23A2E','#FF7B66'])   # zones éclairées en rouge vif, extinctions en noir
img=np.tile(np.clip(I**0.45*1.0,0,1),(60,1))
a1.imshow(img,extent=(-21,21,0,1.0),aspect='auto',cmap=cm,vmin=0,vmax=1)
a1.set_xlim(-21,21); a1.set_ylim(-0.75,1.0); a1.axis('off')
for v in range(-20,21):
    hgt=0.30 if v%5==0 else 0.17
    a1.plot([v,v],[-0.02,-0.02-hgt],color=ANTH,lw=0.7)
    if v%5==0: a1.text(v,-0.40,str(v).replace('-','−'),ha='center',va='top',fontsize=8)
a1.plot([-20,20],[-0.02,-0.02],color=ANTH,lw=0.8)
a1.text(20.9,-0.40,'mm',ha='left',va='top',fontsize=8)
a2.plot(x,I,color=BRIQUE,lw=1.4)
a2.set_xlim(-21,21); a2.set_ylim(0,1.08)
a2.set_xticks(range(-20,21,5)); a2.set_xticks(range(-20,21,1),minor=True)
a2.set_yticks([0,0.25,0.5,0.75,1.0]); a2.set_yticklabels(['0','0,25','0,5','0,75','1'])
axes_style(a2,'$x$ (mm)','Intensité relative')
a2.grid(which='minor',axis='x',color='#EFEBE7',lw=0.35); a2.tick_params(which='minor',length=0)
a2.set_xticklabels([str(v).replace('-','−') for v in range(-20,21,5)])
p=f'{out}/fig_tache_mesure.png'; fig.savefig(p,facecolor='white'); plt.close(fig); print('fig_tache_mesure',rogne(p))

# ---------------------------------------------------------------- 5. Ex. 3 : étalonnage L = f(1/a)
a_um=np.array([50,80,100,150,200,300]); Lmm=np.array([42.8,26.4,21.5,14.1,10.7,7.0])
fig,ax=graphe(5.0,3.4,(0,22),(0,45),'$1/a$ (mm$^{-1}$)','$L$ (mm)',range(0,23,2),range(0,46,5))
ax.plot(1000/a_um,Lmm,ls='none',marker='+',ms=9,mew=1.7,color=ANTH)
ax.set_xticks(np.arange(0,22.01,1),minor=True); ax.set_yticks(np.arange(0,45.01,1),minor=True)
ax.grid(which='minor',color='#EFEBE7',lw=0.35); ax.tick_params(which='minor',length=0)
p=f'{out}/fig_harpe.png'; fig.savefig(p,facecolor='white'); plt.close(fig); print('fig_harpe',rogne(p))

# ---------------------------------------------------------------- 6. Q.21 : fentes d'Young et différence de chemin optique
fig,ax=new(6.2,3.7,(-3.2,10.8),(-2.95,4.6))
b=2.4; Dd=8.0; xm=3.0
F1=np.array([0,b/2]); F2=np.array([0,-b/2]); M=np.array([Dd,xm]); O=np.array([0,0])
ax.add_patch(Rectangle((-3.1,-1.7),2.0,3.4,fc='#F3D9D5',ec='none'))
for yy in (-1.2,0.0,1.2): arrow(ax,-3.0,yy,-1.25,yy,color=BRIQUE,lw=1.2,head=5)
ax.text(-2.1,1.85,'laser',ha='center',va='bottom',fontsize=10,color=BRIQUE)
for (y0,y1) in [(b/2+0.12,2.7),(-b/2+0.12,b/2-0.12),(-2.7,-b/2-0.12)]:
    ax.plot([0,0],[y0,y1],color=ANTH,lw=3)
ax.plot([Dd,Dd],[-2.7,4.3],color=ANTH,lw=2.2); ax.text(Dd+0.15,4.3,'écran',ha='left',va='top',fontsize=10)
ax.plot([0,Dd],[0,0],color=ANTH,lw=0.8,ls=(0,(4,3)))
ax.plot([F1[0],M[0]],[F1[1],M[1]],color=BLEU,lw=1.2); ax.plot([F2[0],M[0]],[F2[1],M[1]],color=BLEU,lw=1.2)
ax.plot([O[0],M[0]],[O[1],M[1]],color=GRIS,lw=0.8,ls=(0,(2,2)))
d=(M-F2)/np.linalg.norm(M-F2); H=F2+np.dot(F1-F2,d)*d
ax.plot([F1[0],H[0]],[F1[1],H[1]],color=ANTH,lw=0.9,ls=(0,(3,2)))
ax.plot([F2[0],H[0]],[F2[1],H[1]],color=CUIVRE,lw=3.4,solid_capstyle='butt',zorder=6)
nrm=np.array([-d[1],d[0]]); q=0.2
ax.plot([H[0]-q*d[0],H[0]-q*d[0]+q*nrm[0],H[0]+q*nrm[0]],[H[1]-q*d[1],H[1]-q*d[1]+q*nrm[1],H[1]+q*nrm[1]],color=ANTH,lw=0.7)
for (P,lab,dx,dy) in [(F1,r'$\mathrm{F}_1$',-0.62,0.25),(F2,r'$\mathrm{F}_2$',-0.62,-0.25),(O,'O',-0.45,-0.28),(M,'M',0.22,0.0),(np.array([Dd,0]),'O\u2032',0.22,-0.28),(H,'H',0.10,0.42)]:
    ax.plot(P[0],P[1],'o',color=ANTH,ms=3.0,zorder=7); ax.text(P[0]+dx,P[1]+dy,lab,fontsize=12,va='center',fontfamily='STIXGeneral')
mid=(F2+H)/2; pd=mid+0.38*np.array([d[1],-d[0]])
ax.text(pd[0],pd[1],r'$\delta$',fontsize=13,color=CUIVRE,ha='center',va='center',zorder=8,bbox=dict(fc='white',ec='none',pad=0.4))
th=math.degrees(math.atan2(xm,Dd))
ax.add_patch(Arc((0,0),3.0,3.0,theta1=0,theta2=th,color=ANTH,lw=1.0))
po=1.95*np.array([math.cos(math.radians(th/2)),math.sin(math.radians(th/2))])
ax.text(po[0],po[1],r'$\theta$',fontsize=12,ha='center',va='center',zorder=8,bbox=dict(fc='white',ec='none',pad=0.4))
u1=np.array([0,-1.0]); u2=(H-F1)/np.linalg.norm(H-F1); bis=(u1+u2)/np.linalg.norm(u1+u2)
ax.add_patch(Arc(tuple(F1),1.2,1.2,theta1=-90,theta2=math.degrees(math.atan2(u2[1],u2[0])),color=ANTH,lw=1.0))
pt=F1+0.95*bis; ax.text(pt[0],pt[1],r'$\theta$',fontsize=11,ha='center',va='center',zorder=8,bbox=dict(fc='white',ec='none',pad=0.3))
dim(ax,-0.6,-b/2,-0.6,b/2); ax.text(-0.72,0.55,'$b$',ha='right',va='center',fontsize=12)
dim(ax,0,-2.45,Dd,-2.45); ax.text(Dd/2,-2.6,'$D$',ha='center',va='top',fontsize=12)
dim(ax,Dd+0.7,0,Dd+0.7,xm); ax.text(Dd+0.85,xm/2,'$x$',ha='left',va='center',fontsize=12)
save(fig,'fig_young')

# ---------------------------------------------------------------- 7. Q.23 : franges d'interférences et règle
xf=np.linspace(2.0,22.0,4001); i_f=2.6; x0=4.2
If=np.cos(np.pi*(xf-x0)/i_f)**2
fig,ax=plt.subplots(figsize=(6.2,1.5)); fig.subplots_adjust(0.02,0.02,0.98,0.98)
img=np.tile(If**0.8,(40,1))
ax.imshow(img,extent=(2.0,22.0,0.15,1.15),aspect='auto',cmap=cm,vmin=0,vmax=1)
ax.set_xlim(-0.8,26.5); ax.set_ylim(-0.75,1.2); ax.axis('off')
for v in range(0,26):
    hgt=0.30 if v%5==0 else 0.17
    ax.plot([v,v],[0.10,0.10-hgt],color=ANTH,lw=0.7)
    if v%5==0: ax.text(v,-0.28,str(v),ha='center',va='top',fontsize=8)
ax.plot([0,25],[0.10,0.10],color=ANTH,lw=0.8); ax.text(25.6,-0.28,'mm',ha='left',va='top',fontsize=8)
p=f'{out}/fig_franges.png'; fig.savefig(p,facecolor='white'); plt.close(fig); print('fig_franges',rogne(p))

# ---------------------------------------------------------------- 8. Ex. 4 : trombone de Koenig et oscillogramme
fig=plt.figure(figsize=(8.4,3.0))
ax=fig.add_axes([0.0,0.0,0.50,1.0]); ax.set_xlim(-0.6,10.4); ax.set_ylim(-4.4,3.0); ax.set_aspect('equal'); ax.axis('off')
w=0.32
def tube(pts):
    xs,ys=zip(*pts); ax.plot(xs,ys,color=ANTH,lw=7.5,solid_capstyle='butt',solid_joinstyle='miter',zorder=2)
    ax.plot(xs,ys,color=EAU,lw=4.6,solid_capstyle='butt',solid_joinstyle='miter',zorder=3)
ax.add_patch(Polygon([(0.0,-0.45),(0.55,-0.45),(1.05,-0.95),(1.05,0.95),(0.55,0.45),(0.0,0.45)],closed=True,fc=GRISC,ec=ANTH,lw=1.0,zorder=4))
ax.text(0.5,1.25,'haut-parleur',ha='center',fontsize=9.5)
tube([(1.05,0),(2.0,0)])
tube([(2.0,0),(2.0,1.9),(7.2,1.9),(7.2,0)])
tube([(2.0,0),(2.0,-1.0),(3.4,-1.0)])
tube([(7.2,0),(7.2,-1.0),(5.8,-1.0)])
tube([(3.1,-1.0),(3.1,-3.0),(6.1,-3.0),(6.1,-1.0)])
ax.add_patch(Rectangle((2.95,-1.25),0.30,0.5,fc='none',ec=ANTH,lw=0.8,zorder=5))
ax.add_patch(Rectangle((5.95,-1.25),0.30,0.5,fc='none',ec=ANTH,lw=0.8,zorder=5))
ax.text(4.6,2.25,'tube fixe',ha='center',fontsize=9.5)
ax.text(4.6,-2.55,'tube mobile',ha='center',fontsize=9.5)
arrow(ax,4.6,-3.35,4.6,-4.2,color=CUIVRE,lw=1.4)
ax.text(4.85,-3.85,'tiré de $D$',fontsize=10,color=CUIVRE,va='center')
tube([(7.2,0),(8.3,0)])
ax.add_patch(Circle((8.75,0),0.42,fc=GRISC,ec=ANTH,lw=1.0,zorder=4))
ax.plot([9.17,9.9],[0,0],color=ANTH,lw=1.0)
ax.text(8.75,0.65,'microphone',ha='center',fontsize=9.5)
a2=fig.add_axes([0.56,0.16,0.43,0.80])
tt=np.linspace(0,1.2,2401); T=0.4
a2.plot(tt,2.0*np.sin(2*np.pi*tt/T),color=CUIVRE,lw=1.3)
a2.plot(tt,0.22*np.sin(2*np.pi*tt/T+0.6),color=BLEU,lw=1.3)
a2.set_xlim(0,1.2); a2.set_ylim(-3,3); a2.set_xticks(np.arange(0,1.21,0.2)); a2.set_yticks(range(-3,4))
a2.set_yticklabels([]); a2.tick_params(axis='y',length=0)
axes_style(a2,'$t$ (ms)','')
a2.set_xticklabels([virg(v,1) for v in np.arange(0,1.21,0.2)])
a2.text(0.03,2.35,'voie 1 : générateur',fontsize=8.5,color=CUIVRE)
a2.text(0.03,-0.85,'voie 2 : microphone',fontsize=8.5,color=BLEU)
p=f'{out}/fig_koenig.png'; fig.savefig(p,facecolor='white'); plt.close(fig); print('fig_koenig',rogne(p))

# ---------------------------------------------------------------- 9. Ex. 5 : signal reçu, chariot immobile
tt=np.linspace(0,140,2801)
fig,ax=graphe(5.0,2.7,(0,140),(-1.6,1.6),'$t$ (µs)','$u$ (V)',range(0,141,20),[-1.5,-1,-0.5,0,0.5,1,1.5])
ax.set_yticklabels(['−1,5','−1','−0,5','0','0,5','1','1,5'])
ax.set_xticks(np.arange(0,140.01,5),minor=True); ax.grid(which='minor',axis='x',color='#EFEBE7',lw=0.35); ax.tick_params(which='minor',length=0)
ax.plot(tt,1.2*np.sin(2*np.pi*tt/25.0),color=BLEU,lw=1.4)
p=f'{out}/fig_radar_signal.png'; fig.savefig(p,facecolor='white'); plt.close(fig); print('fig_radar_signal',rogne(p))

# ---------------------------------------------------------------- 10. Q.6 : spectre électromagnétique
fig,ax=new(6.6,2.6,(-12.6,1.9),(-3.2,1.75))
dom=[(-12.5,-11,'gamma',NUIT),(-11,-8,'X',BLEU),(-8,-6.398,'UV','#6C5B9E'),(-6.398,-6.097,'',None),(-6.097,-3,'infrarouge',BRIQUE),(-3,0,'micro-ondes',CUIVRE),(0,1.8,'radio',VERT)]
for (x0,x1,nom,col) in dom:
    if col is None: continue
    ax.add_patch(Rectangle((x0,0),x1-x0,0.8,fc=col,ec='white',lw=1.0,alpha=0.88))
    if nom: ax.text((x0+x1)/2,0.4,nom if nom!='gamma' else 'γ',ha='center',va='center',fontsize=9.5,color='white')
nv=60
for k in range(nv):
    lam=400+400*k/nv; xx=-6.398+(-6.097+6.398)*k/nv
    ax.add_patch(Rectangle((xx,0),(-6.097+6.398)/nv+0.002,0.8,fc=wl_rgb(lam),ec='none'))
for e in range(-12,2,2):
    ax.plot([e,e],[0,-0.15],color=ANTH,lw=0.8); ax.text(e,-0.25,'1' if e==0 else '$10^{%d}$'%e,ha='center',va='top',fontsize=8.5)
ax.plot([-12.5,1.8],[0,0],color=ANTH,lw=0.8); ax.text(1.8,-0.25,'λ (m)',ha='right',va='top',fontsize=8.5)
ax.plot([-6.398,-9.6],[0,-1.4],color=GRIS,lw=0.7); ax.plot([-6.097,-2.9],[0,-1.4],color=GRIS,lw=0.7)
nz=200
for k in range(nz):
    lam=400+400*k/nz; xx=-9.6+6.7*k/nz
    ax.add_patch(Rectangle((xx,-2.0),6.7/nz+0.01,0.6,fc=wl_rgb(lam),ec='none'))
for lam in (400,500,600,700,800):
    xx=-9.6+6.7*(lam-400)/400; ax.plot([xx,xx],[-2.0,-2.12],color=ANTH,lw=0.8); ax.text(xx,-2.2,str(lam),ha='center',va='top',fontsize=8.5)
ax.text(-2.45,-2.2,'nm',ha='left',va='top',fontsize=8.5)
ax.text(-6.25,1.0,'visible',ha='center',va='bottom',fontsize=9.5)
save(fig,'fig_spectre')

# ---------------------------------------------------------------- 11. Q.13 : diffraction par une fente verticale
fig,ax=new(6.2,3.3,(-0.3,12.4),(-3.4,3.6))
S=(3.9,0.17)
ax.add_patch(Rectangle((-0.2,S[1]-0.3),1.6,0.6,fc=GRISC,ec=ANTH,lw=1.0)); ax.text(0.6,S[1]-0.6,'laser',ha='center',va='top',fontsize=10)
pl=[(3.4,-1.9),(4.4,-1.2),(4.4,2.2),(3.4,1.5)]
ax.add_patch(Polygon(pl,closed=True,fc=GRISC,ec=ANTH,lw=1.0,zorder=3))
ax.add_patch(Polygon([(3.86,-0.55),(3.94,-0.49),(3.94,0.89),(3.86,0.83)],closed=True,fc='white',ec='none',zorder=4))
ax.text(3.9,2.35,'fente verticale',ha='center',va='bottom',fontsize=10)
ax.plot([1.4,S[0]],[S[1],S[1]],color=BRIQUE,lw=2.0,zorder=6,solid_capstyle='butt')
sc=[(7.4,-2.4),(12.2,-1.3),(12.2,2.9),(7.4,1.8)]
ax.add_patch(Polygon(sc,closed=True,fc='#F7F4F1',ec=ANTH,lw=1.0,zorder=1))
ax.text(9.8,3.05,'écran',ha='center',va='bottom',fontsize=10)
cx,cy=9.8,0.25; sl=(1.1/4.8)
g1=(cx-1.95,cy-1.95*sl); g2=(cx+1.95,cy+1.95*sl)
ax.add_patch(Polygon([S,g1,g2],closed=True,fc=BRIQUE,ec='none',alpha=0.13,zorder=5))
ax.plot([S[0],g1[0]],[S[1],g1[1]],color=BRIQUE,lw=0.6,alpha=0.55,zorder=5)
ax.plot([S[0],g2[0]],[S[1],g2[1]],color=BRIQUE,lw=0.6,alpha=0.55,zorder=5)
ax.plot([S[0],cx],[S[1],cy],color=BRIQUE,lw=1.1,zorder=6)
for (dx,wd,al) in [(0,1.1,1.0),(1.0,0.5,0.55),(-1.0,0.5,0.55),(1.6,0.45,0.3),(-1.6,0.45,0.3)]:
    xx=cx+dx; yy=cy+dx*sl
    ax.add_patch(matplotlib.patches.Ellipse((xx,yy),wd,0.42,angle=math.degrees(math.atan(sl)),fc=BRIQUE,ec='none',alpha=al,zorder=7))
ax.text(9.8,-2.55,'taches alignées perpendiculairement à la fente',ha='center',va='top',fontsize=9,color=ANTH)
save(fig,'fig_diff_fente')

# ---------------------------------------------------------------- 12. Q.13 : houle diffractée par l'entrée d'un port
fig,ax=new(4.6,3.3,(-5.2,5.2),(-3.6,4.2))
ax.add_patch(Rectangle((-5.2,-0.35),4.0,0.7,fc=GRIS,ec='none')); ax.add_patch(Rectangle((1.2,-0.35),4.0,0.7,fc=GRIS,ec='none'))
ax.text(-3.2,0.0,'jetée',ha='center',va='center',fontsize=9.5,color='white'); ax.text(3.2,0.0,'jetée',ha='center',va='center',fontsize=9.5,color='white')
for y in np.arange(-3.4,-0.4,0.9):
    ax.plot([-5.0,5.0],[y,y],color=BLEU,lw=1.3)
for r in np.arange(0.75,4.3,0.9):
    th=np.linspace(math.radians(8),math.radians(172),200)
    ax.plot(r*np.cos(th),0.35+r*np.sin(th),color=BLEU,lw=1.3)
arrow(ax,4.6,-3.4,4.6,-1.4,color=ANTH,lw=1.2)
ax.text(4.4,-2.05,'houle',ha='right',va='center',fontsize=9.5)
dim(ax,-4.5,-3.4,-4.5,-2.5); ax.text(-4.25,-2.95,'λ',ha='left',va='center',fontsize=11)
ax.text(0,3.95,'port',ha='center',fontsize=9.5)
save(fig,'fig_houle')

# ---------------------------------------------------------------- 13. Q.16 : L en fonction de 1/a
k=2*633e-9*2.00*1e6   # en mm²
ia=np.array([2.5,4,5,8,10,12.5,20])
fig,ax=graphe(5.0,3.3,(0,22),(0,55),'$1/a$ (mm$^{-1}$)','$L$ (mm)',range(0,23,2),range(0,56,5))
xx=np.linspace(0,22,10); ax.plot(xx,k*xx,color=CUIVRE,lw=1.3)
ax.plot(ia,k*ia,ls='none',marker='+',ms=9,mew=1.7,color=ANTH)
ax.text(3.0,40,r'droite passant par l’origine,'+'\n'+r'coefficient directeur $k = 2\lambda D$',fontsize=9.5,color=ANTH)
p=f'{out}/fig_L_inv_a.png'; fig.savefig(p,facecolor='white'); plt.close(fig); print('fig_L_inv_a',rogne(p))

# ---------------------------------------------------------------- 14. Q.26 : fronts d'onde d'un émetteur immobile, puis en mouvement
fig,(a1,a2)=plt.subplots(1,2,figsize=(7.0,3.0)); fig.subplots_adjust(0,0,1,1,wspace=0.06)
for a in (a1,a2): a.set_aspect('equal'); a.axis('off'); a.set_xlim(-6.4,6.4); a.set_ylim(-4.6,5.5)
for r in (1,2,3,4): a1.add_patch(Circle((0,0),r,fc='none',ec=BLEU,lw=1.1))
a1.plot(0,0,'o',color=CUIVRE,ms=6); a1.text(0,-4.55,'émetteur immobile',ha='center',va='bottom',fontsize=9.5)
vs=0.7
for n in range(4):
    r=4-n; c=-r*vs+0.0
    a2.add_patch(Circle((c+1.0,0),r,fc='none',ec=BLEU,lw=1.1))
a2.plot(1.0,0,'o',color=CUIVRE,ms=6); arrow(a2,1.0,0,2.3,0,color=CUIVRE,lw=1.6)
a2.text(2.65,0.0,r'$\vec{v}$',fontsize=13,color=CUIVRE,ha='left',va='center')
a2.text(0.0,-4.55,'émetteur en mouvement',ha='center',va='bottom',fontsize=9.5)
a2.text(4.9,3.0,'devant :\nfronts resserrés',ha='center',fontsize=8.5,color=ANTH)
a2.text(-3.6,4.35,'derrière :\nfronts espacés',ha='center',va='bottom',fontsize=8.5,color=ANTH)
p=f'{out}/fig_doppler.png'; fig.savefig(p,facecolor='white'); plt.close(fig); print('fig_doppler',rogne(p))

# ---------------------------------------------------------------- 15. Q.28 : raies du laboratoire et raies d'une galaxie
fig,ax=new(6.4,2.3,(318,812),(-1.3,2.7))
ax.set_aspect('auto')
for (y0,lab) in [(1.4,'laboratoire'),(0.0,'galaxie')]:
    nz=300
    for kk in range(nz):
        lam=400+(780-400)*kk/nz
        ax.add_patch(Rectangle((lam,y0),(780-400)/nz+0.3,0.8,fc=wl_rgb(lam),ec='none'))
    ax.text(395,y0+0.4,lab,ha='right',va='center',fontsize=9.5)
for lam in (486.1,656.3):
    ax.plot([lam,lam],[1.4,2.2],color='black',lw=2.0)
    ax.plot([lam*1.01006,lam*1.01006],[0.0,0.8],color='black',lw=2.0)
    ax.plot([lam,lam*1.01006],[1.35,0.85],color=GRIS,lw=0.8,ls=(0,(2,2)))
ax.text(656.3,2.3,'H$\\alpha$',ha='center',va='bottom',fontsize=10); ax.text(486.1,2.3,'H$\\beta$',ha='center',va='bottom',fontsize=10)
for lam in range(400,781,50):
    ax.plot([lam,lam],[0,-0.12],color=ANTH,lw=0.8); ax.text(lam,-0.2,str(lam),ha='center',va='top',fontsize=8.5)
ax.plot([400,780],[0,0],color=ANTH,lw=0.8); ax.text(786,-0.2,'nm',ha='left',va='top',fontsize=8.5)
arrow(ax,690,-0.95,760,-0.95,color=BRIQUE,lw=1.4); ax.text(686,-0.95,'décalage vers le rouge',ha='right',va='center',fontsize=9,color=BRIQUE)
save(fig,'fig_raies')
