# Figures de la fiche PC 4 (poussée d'Archimède, écoulement et chute dans un fluide), palette MasterBac
# usage : pc-04-fluides.py <dossier de sortie, en général fiches/pc-04-fluides/figs>
import sys
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle, Circle, FancyBboxPatch, Polygon, Ellipse
from PIL import Image, ImageChops

out = sys.argv[1]
ANTH='#2B2C2D'; CUIVRE='#A47351'; NUIT='#001128'; EAU='#DCE9F2'; EAUB='#8FB3CC'
GRIS='#8A8F98'; VERT='#2E6B4F'; BRIQUE='#B23A2E'; BLEU='#2F5D8A'; MIEL='#F4E3C3'; MIELB='#D9B98A'
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
def save(fig,name):
    p=f'{out}/{name}.png'
    fig.savefig(p,facecolor='white'); plt.close(fig)
    im=Image.open(p).convert('RGB')
    bg=Image.new('RGB',im.size,(255,255,255))
    box=ImageChops.difference(im,bg).convert('L').point(lambda v:255 if v>8 else 0).getbbox()
    pad=14
    im=im.crop((max(0,box[0]-pad),max(0,box[1]-pad),min(im.width,box[2]+pad),min(im.height,box[3]+pad)))
    im.save(p,dpi=(300,300)); print(name,im.size)

# 1. Origine de la poussée d'Archimède
fig,ax=new(5.2,3.5,(0,11.4),(0,7.6))
ax.add_patch(Rectangle((1.6,0.5),9.2,6.0,fc=EAU,ec='none'))
ax.plot([1.6,1.6,10.8,10.8],[6.9,0.5,0.5,6.9],color=ANTH,lw=1.6)
ax.plot([1.6,10.8],[6.5,6.5],color=EAUB,lw=1.2)
ax.add_patch(Rectangle((4.2,2.2),2.2,2.6,fc='white',ec=ANTH,lw=1.6,zorder=3))
for x in (4.6,5.3,6.0):
    arrow(ax,x,5.55,x,4.86,color=BLEU,lw=1.3,head=5)
    arrow(ax,x,0.85,x,2.14,color=CUIVRE,lw=2.0,head=6)
for y,L in ((2.8,1.0),(3.5,0.7),(4.2,0.4)):   # les forces latérales croissent avec la profondeur
    arrow(ax,4.14-L,y,4.14,y,color=GRIS,lw=1.1,head=4.5)
    arrow(ax,6.46+L,y,6.46,y,color=GRIS,lw=1.1,head=4.5)
ax.text(6.25,5.25,r'$\vec{F}_{\mathrm{haut}}$',color=BLEU,fontsize=12,va='center')
ax.text(6.3,1.45,r'$\vec{F}_{\mathrm{bas}}$',color=CUIVRE,fontsize=12,va='center')
ax.text(7.75,3.5,'forces latérales\nqui se compensent',color=GRIS,fontsize=8.5,va='center')
arrow(ax,0.8,0.5,0.8,7.3,color=ANTH,lw=1.1,head=5); ax.text(0.45,7.25,r'$z$',fontsize=12)
for y,lab in ((4.8,r'$z_{\mathrm{haut}}$'),(2.2,r'$z_{\mathrm{bas}}$')):
    ax.plot([0.7,0.9],[y,y],color=ANTH,lw=1.1); ax.plot([0.9,4.2],[y,y],color=GRIS,lw=0.8,ls=(0,(4,3)))
    ax.text(0.62,y,lab,fontsize=11,ha='right',va='center')
dim(ax,2.6,2.2,2.6,4.8); ax.text(2.75,3.5,r'$h$',fontsize=12,va='center')
ax.text(5.3,3.5,'solide',fontsize=9.5,ha='center',va='center',color=ANTH,zorder=4)
ax.text(10.6,6.05,'fluide au repos',fontsize=9,ha='right',color=BLEU)
save(fig,'fig_origine')

# 2. Pèse-sirop
fig,ax=new(4.5,4.6,(0,10),(0,10.4))
ax.add_patch(Rectangle((1.6,0.5),7.0,6.3,fc=MIEL,ec='none'))
ax.plot([1.6,1.6,8.6,8.6],[8.4,0.5,0.5,8.4],color=ANTH,lw=1.6)
ax.plot([1.6,8.6],[6.8,6.8],color=MIELB,lw=1.3)
# densimètre : tige + réservoir
ax.add_patch(Rectangle((3.82,4.2),0.36,5.6,fc='white',ec=ANTH,lw=1.3,zorder=3))
for k in range(12):
    y=4.6+k*0.42; ax.plot([3.82,4.02 if k%2 else 4.1],[y,y],color=ANTH,lw=0.7,zorder=4)
ax.add_patch(FancyBboxPatch((3.3,1.5),1.4,2.7,boxstyle='round,pad=0,rounding_size=0.6',fc='white',ec=ANTH,lw=1.3,zorder=3))
ax.add_patch(FancyBboxPatch((3.42,1.6),1.16,0.75,boxstyle='round,pad=0,rounding_size=0.35',fc=ANTH,ec='none',zorder=4))
dim(ax,2.5,4.2,2.5,6.8); ax.text(2.33,5.5,r'$h$',fontsize=13,ha='right',va='center')
ax.plot([2.3,3.82],[4.2,4.2],color=GRIS,lw=0.8,ls=(0,(4,3)))
ax.annotate('tige graduée\n(section $s$)',xy=(4.18,8.9),xytext=(5.1,9.4),fontsize=10,va='center',
            arrowprops=dict(arrowstyle='-',color=GRIS,lw=0.8))
ax.annotate('réservoir\nde volume $V_0$',xy=(4.7,3.1),xytext=(5.4,3.6),fontsize=10.5,va='center',
            arrowprops=dict(arrowstyle='-',color=GRIS,lw=0.8),zorder=6)
ax.annotate('lest',xy=(4.58,1.95),xytext=(5.4,1.6),fontsize=10,va='center',
            arrowprops=dict(arrowstyle='-',color=GRIS,lw=0.8),zorder=6)
ax.text(8.45,7.05,'surface libre',fontsize=8.5,ha='right',color=CUIVRE)
ax.text(1.85,0.8,'sirop',fontsize=9.5,color=CUIVRE)
save(fig,'fig_pese_sirop')

# 3. Viscosimètre à chute de bille
fig,ax=new(3.7,4.8,(0,8.3),(0,10.8))
ax.add_patch(Rectangle((2.6,0.6),2.2,8.9,fc=MIEL,ec='none'))
ax.plot([2.6,2.6,4.8,4.8],[10.1,0.6,0.6,10.1],color=ANTH,lw=1.6)
ax.plot([2.6,4.8],[9.5,9.5],color=MIELB,lw=1.3)
ax.plot([1.9,5.5],[0.6,0.6],color=ANTH,lw=2.2)
for y,lab in ((7.2,'repère 1'),(2.6,'repère 2')):
    ax.plot([2.45,4.95],[y,y],color=ANTH,lw=1.3)
    ax.text(5.1,y,lab,fontsize=9.5,va='center')
ax.add_patch(Circle((3.7,5.4),0.28,fc=ANTH,ec='none',zorder=4))
arrow(ax,3.7,5.0,3.7,4.1,color=CUIVRE,lw=1.8,head=6); ax.text(3.9,4.35,r'$\vec{v}$',color=CUIVRE,fontsize=12)
ax.add_patch(Circle((3.7,9.5),0.28,fc='white',ec=ANTH,lw=1.0,ls=(0,(2,2)),zorder=4))
ax.text(3.7,10.35,'lâcher sans\nvitesse initiale',fontsize=8.5,ha='center',va='center',color=GRIS)
dim(ax,7.3,2.6,7.3,7.2); ax.text(7.45,4.9,r'$L$',fontsize=13,va='center')
ax.plot([6.75,7.4],[7.2,7.2],color=GRIS,lw=0.7,ls=(0,(4,3))); ax.plot([6.75,7.4],[2.6,2.6],color=GRIS,lw=0.7,ls=(0,(4,3)))
arrow(ax,1.2,9.5,1.2,1.0,color=ANTH,lw=1.1,head=5); ax.text(0.75,1.1,r'$z$',fontsize=12)
ax.plot([1.1,1.3],[9.5,9.5],color=ANTH,lw=1.1); ax.text(0.98,9.5,r'$O$',fontsize=11,ha='right',va='center')
ax.text(2.75,0.85,'miel',fontsize=9.5,color=CUIVRE)
save(fig,'fig_viscosimetre')

# 4. Forces sur la bille
fig,ax=new(2.6,3.2,(0,6),(0,7.4))
ax.add_patch(Circle((3,3.8),0.75,fc='#E4E5E7',ec=ANTH,lw=1.4,zorder=3))
ax.plot(3,3.8,'o',color=ANTH,ms=3,zorder=6)
arrow(ax,3,3.8,3,0.6,color=ANTH,lw=2.2,head=7,zorder=7); ax.text(3.25,0.95,r'$\vec{P}$',fontsize=13)
arrow(ax,2.72,3.8,2.72,4.38,color=BLEU,lw=2.2,head=6,zorder=7); ax.text(2.45,5.0,r'$\vec{\Pi}$',fontsize=13,color=BLEU,ha='right',va='center')
arrow(ax,3.28,3.8,3.28,6.42,color=CUIVRE,lw=2.2,head=7,zorder=7); ax.text(3.55,6.2,r'$\vec{f}$',fontsize=13,color=CUIVRE)
arrow(ax,5.1,6.6,5.1,4.6,color=GRIS,lw=1.0,head=5); ax.text(5.3,4.75,r'$z$',fontsize=12,color=GRIS)
arrow(ax,4.3,3.8,4.3,2.6,color=GRIS,lw=1.2,head=5,ls=(0,(3,2))); ax.text(4.5,2.8,r'$\vec{v}$',fontsize=12,color=GRIS)
save(fig,'fig_visc_forces')

# 5. Trompe à eau
fig,ax=new(5.6,3.0,(-0.9,13.2),(0,7.6))
top=[(0.8,6.2),(4.2,6.2),(6.0,5.0),(7.6,5.0),(9.6,6.0),(12.6,6.0)]
bot=[(0.8,2.6),(4.2,2.6),(6.0,3.8),(6.45,3.8),(6.45,0.9),(7.15,0.9),(7.15,3.8),(7.6,3.8),(9.6,2.8),(12.6,2.8)]
ax.add_patch(Polygon(top+bot[::-1],closed=True,fc=EAU,ec='none'))
ax.add_patch(Rectangle((6.45,0.9),0.7,2.4,fc='white',ec='none',zorder=2))
ax.plot(*zip(*top),color=ANTH,lw=1.7); ax.plot(*zip(*bot[:5]),color=ANTH,lw=1.7,zorder=3); ax.plot(*zip(*bot[5:]),color=ANTH,lw=1.7,zorder=3)
arrow(ax,1.3,4.4,3.3,4.4,color=CUIVRE,lw=1.8,head=6); ax.text(2.3,4.75,r'$\vec{v}_A$',color=CUIVRE,fontsize=12,ha='center')
ax.plot(3.6,4.4,'o',color=ANTH,ms=4,zorder=6); ax.text(3.6,3.85,'A',fontsize=11,ha='center',va='center')
ax.plot(6.8,4.4,'o',color=ANTH,ms=4,zorder=6); ax.text(6.8,4.75,'B',fontsize=10.5,ha='center',va='center',zorder=6)
arrow(ax,7.0,4.4,9.3,4.4,color=CUIVRE,lw=2.6,head=7); ax.text(9.0,4.72,r'$\vec{v}_B$',color=CUIVRE,fontsize=12,ha='center',va='bottom',zorder=6)
dim(ax,0.45,2.6,0.45,6.2); ax.text(0.3,4.4,r'$d_A$',fontsize=12,ha='right',va='center')
dim(ax,6.22,3.8,6.22,5.0); ax.text(6.02,4.42,r'$d_B$',fontsize=12,ha='right',va='center')
arrow(ax,6.8,1.1,6.8,2.9,color=BLEU,lw=1.6,head=6)
ax.text(7.35,1.35,'air aspiré\n(venant de la fiole)',fontsize=9,color=BLEU,va='center')
ax.text(1.0,6.5,"arrivée d'eau",fontsize=9,color=GRIS); ax.text(12.6,6.3,'évacuation',fontsize=9,color=GRIS,ha='right')
ax.text(6.8,5.3,'étranglement',fontsize=9,color=GRIS,ha='center',va='bottom')
save(fig,'fig_trompe')

# 6. Récupérateur d'eau de pluie
fig,ax=new(4.8,3.9,(0,12),(0,9.8))
ax.add_patch(Rectangle((2.6,1.2),5.6,5.2,fc=EAU,ec='none'))
ax.plot([2.6,2.6,8.2,8.2],[8.6,1.2,1.2,8.6],color=ANTH,lw=1.7)
ax.plot([2.6,8.2],[6.4,6.4],color=EAUB,lw=1.3)
ax.plot([1.2,11.2],[1.2,1.2],color=ANTH,lw=2.2)
# arrivée gouttière
ax.plot([3.4,3.4],[9.6,8.2],color=ANTH,lw=1.4); ax.plot([4.0,4.0],[9.6,8.2],color=ANTH,lw=1.4)
arrow(ax,3.7,9.5,3.7,7.6,color=BLEU,lw=1.5,head=6); ax.text(4.25,8.95,'eau de pluie\n(gouttière)',fontsize=9,color=BLEU,va='center')
# robinet (au niveau du fond)
ax.add_patch(Rectangle((8.2,1.22),1.3,0.5,fc=EAU,ec='none',zorder=2))
ax.plot([8.2,9.5],[1.72,1.72],color=ANTH,lw=1.5)
ax.plot([8.2,8.2],[1.24,1.70],color=EAU,lw=2.4,zorder=4)
arrow(ax,9.5,1.47,11.0,1.47,color=CUIVRE,lw=2.0,head=7); ax.text(10.5,1.82,r'$\vec{v}_B$',color=CUIVRE,fontsize=12,ha='center')
ax.plot(9.5,1.47,'o',color=ANTH,ms=4,zorder=6); ax.text(9.45,2.0,'B',fontsize=11,ha='center')
ax.plot(5.4,6.4,'o',color=ANTH,ms=4,zorder=6); ax.text(5.4,6.75,'A',fontsize=11,ha='center')
ax.text(9.0,0.72,'robinet',fontsize=9,color=GRIS,ha='center')
# capteur
ax.add_patch(Rectangle((3.2,1.2),1.1,0.42,fc=ANTH,ec='none',zorder=5))
ax.annotate('capteur\nde pression',xy=(3.75,1.62),xytext=(3.75,2.75),fontsize=9,ha='center',va='center',color=ANTH,
            arrowprops=dict(arrowstyle='-',color=GRIS,lw=0.8))
dim(ax,1.9,1.2,1.9,6.4); ax.text(1.72,3.8,r'$H$',fontsize=13,ha='right',va='center')
ax.plot([1.7,2.6],[6.4,6.4],color=GRIS,lw=0.7,ls=(0,(4,3)))
arrow(ax,0.7,1.2,0.7,9.0,color=ANTH,lw=1.1,head=5); ax.text(0.35,8.9,r'$z$',fontsize=12)
ax.text(8.0,5.9,'eau',fontsize=9.5,color=BLEU,ha='right')
save(fig,'fig_cuve')

# ---------------------------------------------------------------- thème 3 : chute dans un fluide
import math
import numpy as np
from matplotlib.ticker import FuncFormatter
GRISC='#DAD5D0'; GRISM='#EFEBE7'; G=9.81

def courbe(figsize,marges):
    fig,ax=plt.subplots(figsize=figsize); fig.subplots_adjust(*marges)
    return fig,ax
def axes_style(ax,xlab,ylab,size=10):
    ax.grid(color=GRISC,lw=0.6)
    ax.grid(which='minor',color=GRISM,lw=0.35); ax.tick_params(which='minor',length=0)
    for s_ in ('top','right'): ax.spines[s_].set_visible(False)
    for s_ in ('left','bottom'): ax.spines[s_].set_linewidth(1.0); ax.spines[s_].set_color(ANTH)
    ax.tick_params(labelsize=size-1,colors=ANTH,width=0.8)
    ax.set_xlabel(xlab,fontsize=size); ax.set_ylabel(ylab,fontsize=size)
    virgule=FuncFormatter(lambda v,p: ('%g' % v).replace('.',',').replace('-','−'))
    ax.xaxis.set_major_formatter(virgule); ax.yaxis.set_major_formatter(virgule)
def tirets(ax,xs,ys,color=BRIQUE,lw=1.0):
    ax.plot(xs,ys,color=color,lw=lw,ls=(0,(4,2.5)),zorder=4)
def etiquette(ax,x,y,txt,size=11,color=ANTH,ha='center'):
    ax.text(x,y,txt,fontsize=size,ha=ha,va='center',zorder=9,color=color,bbox=dict(fc='white',ec='none',pad=0.4))

# 7. Q.11 (corrigé) : forces sur un objet qui tombe dans un fluide, au début de la chute et à la vitesse limite
fig,ax=new(5.0,3.5,(0,12.4),(0,8.6))
ax.add_patch(Rectangle((0.2,0.9),12.0,7.4,fc=EAU,ec='none',zorder=0))
for xc,fl,titre in ((3.3,0.9,'au début de la chute'),(9.1,2.5,'à la vitesse limite')):
    yc=5.0
    ax.add_patch(Circle((xc,yc),0.7,fc='#E4E5E7',ec=ANTH,lw=1.4,zorder=3))
    ax.plot(xc,yc,'o',color=ANTH,ms=3,zorder=6)
    arrow(ax,xc,yc,xc,yc-3.1,color=ANTH,lw=2.2,head=7,zorder=7); ax.text(xc+0.25,yc-2.85,r'$\vec{P}$',fontsize=13)
    arrow(ax,xc-0.3,yc,xc-0.3,yc+0.6,color=BLEU,lw=2.2,head=6,zorder=7)
    ax.text(xc-0.55,yc+1.05,r'$\vec{\Pi}$',fontsize=13,color=BLEU,ha='right',va='center')
    arrow(ax,xc+0.3,yc,xc+0.3,yc+fl,color=CUIVRE,lw=2.2,head=7,zorder=7)
    ax.text(xc+0.55,yc+fl-0.1,r'$\vec{f}$',fontsize=13,color=CUIVRE,va='center')
    ax.text(xc,0.45,titre,fontsize=10,ha='center',va='center',color=ANTH)
arrow(ax,1.0,6.6,1.0,4.6,color=GRIS,lw=1.2,head=5); ax.text(1.25,4.85,r'$\vec{v}$',fontsize=12,color=GRIS)
arrow(ax,6.8,6.6,6.8,4.0,color=GRIS,lw=1.2,head=5); ax.text(7.05,4.25,r'$\vec{v}_{\mathrm{lim}}$',fontsize=12,color=GRIS)
ax.text(12.0,7.9,'fluide',fontsize=9.5,color=BLEU,ha='right')
save(fig,'fig_chute_forces')

# 8 et 9. Q.15 : bille d'acier (rayon 1,0 mm) lâchée dans une huile (eta = 1,0 Pa.s)
rho_b,rho_h,eta,r=7.80e3,970.0,1.0,1.0e-3
m_b=rho_b*4/3*math.pi*r**3; k_b=6*math.pi*eta*r
tau_h=m_b/k_b*1e3                                   # en ms
a0_h=G*(1-rho_h/rho_b)                              # en m.s-2
vl_h=a0_h*tau_h*1e-3*100                            # en cm.s-1
def huile_fig(corrige):
    fig,ax=courbe((4.6,2.6),(0.12,0.19,0.98,0.97))
    t=np.linspace(0,10,1001); ax.plot(t,vl_h*(1-np.exp(-t/tau_h)),color=BLEU,lw=1.7,zorder=5)
    ax.set_xlim(0,10); ax.set_ylim(0,1.8)
    ax.set_xticks(range(0,11)); ax.set_xticks(np.arange(0,10.01,0.2),minor=True)
    ax.set_yticks(np.arange(0,1.81,0.2)); ax.set_yticks(np.arange(0,1.801,0.05),minor=True)
    axes_style(ax,'$t$ (ms)','$v$ (cm·s$^{-1}$)')
    if corrige:
        v63=0.63*vl_h
        tirets(ax,[0,10],[vl_h,vl_h],color=GRIS)
        tirets(ax,[0,tau_h,tau_h],[v63,v63,0])
        ax.plot([0,2.1],[0,a0_h*2.1*1e-3*100],color=VERT,lw=1.2,zorder=4)
        ax.plot([tau_h],[v63],'o',color=BRIQUE,ms=3.5,zorder=6); ax.plot([tau_h],[vl_h],'o',color=VERT,ms=3.5,zorder=6)
        ax.text(tau_h+0.15,0.1,'$\\tau$',fontsize=12,color=BRIQUE)
        ax.text(tau_h+0.55,0.80,'$0{,}63\\,v_{\\mathrm{lim}}$',fontsize=10.5,color=BRIQUE)
        ax.text(2.35,1.68,'tangente à l’origine',fontsize=10,color=VERT)
        ax.text(9.8,vl_h-0.13,'$v_{\\mathrm{lim}}$',fontsize=11,color=GRIS,ha='right')
    save(fig,'fig_huile_c' if corrige else 'fig_huile')
huile_fig(False); huile_fig(True)
print('Q.15 contrôle : tau = %.3f ms ; a0 = %.3f m/s2 ; vlim = %.4f cm/s' % (tau_h,a0_h,vl_h))

# 10. Exercice 8 : thermomètre de Galilée dans une pièce à 21 °C
fig,ax=new(3.0,4.4,(0,8.4),(0,12.4))
ax.add_patch(Rectangle((2.0,0.9),3.4,9.6,fc=EAU,ec='none',zorder=0))
ax.plot([2.0,2.0],[0.9,11.0],color=ANTH,lw=1.6); ax.plot([5.4,5.4],[0.9,11.0],color=ANTH,lw=1.6)
ax.add_patch(Rectangle((1.6,11.0),4.2,0.45,fc=GRIS,ec=ANTH,lw=1.2,zorder=3))
ax.add_patch(Rectangle((1.3,0.45),4.8,0.45,fc=GRIS,ec=ANTH,lw=1.2,zorder=3))
ax.plot([2.0,5.4],[10.5,10.5],color=EAUB,lw=1.2)
boules=((26,3.5,9.75),(24,3.9,8.2),(22,3.5,6.65),(20,3.9,3.2),(18,3.5,1.65))
for th,xc,yc in boules:
    ax.add_patch(Circle((xc,yc),0.62,fc='white',ec=ANTH,lw=1.3,zorder=4))
    ax.add_patch(Circle((xc-0.18,yc+0.18),0.16,fc=GRISM,ec='none',zorder=5))
    ax.plot([xc,xc],[yc-0.62,yc-0.76],color=CUIVRE,lw=1.0,zorder=4)
    ax.add_patch(Circle((xc,yc-0.84),0.09,fc=CUIVRE,ec='none',zorder=5))
    ax.plot([xc+0.62,6.15],[yc,yc],color=GRIS,lw=0.7,zorder=2)
    ax.text(6.3,yc,'%d °C' % th,fontsize=12,va='center',color=ANTH)
ax.text(2.22,4.9,'liquide',fontsize=10.5,color=BLEU,rotation=90,va='center')
save(fig,'fig_galilee')

# 11 et 12. Exercice 9 : saut en parachute, frottement f = K v^2 (m = 80,0 kg ; K = 0,280 kg/m)
m_p,K_p=80.0,0.280
vl_p=math.sqrt(m_p*G/K_p); tau_p=vl_p/G
def para_fig(corrige):
    fig,ax=courbe((4.6,2.7),(0.12,0.18,0.98,0.97))
    t=np.linspace(0,30,1201); ax.plot(t,vl_p*np.tanh(t/tau_p),color=BLEU,lw=1.7,zorder=5)
    ax.set_xlim(0,30); ax.set_ylim(0,60)
    ax.set_xticks(range(0,31,5)); ax.set_xticks(range(0,31,1),minor=True)
    ax.set_yticks(range(0,61,10)); ax.set_yticks(range(0,61,2),minor=True)
    axes_style(ax,'$t$ (s)','$v$ (m·s$^{-1}$)')
    if corrige:
        tirets(ax,[0,30],[vl_p,vl_p],color=GRIS)
        ax.plot([0,6.2],[0,G*6.2],color=VERT,lw=1.2,zorder=4)
        tirets(ax,[tau_p,tau_p],[0,vl_p],color=VERT)
        ax.plot([tau_p],[vl_p],'o',color=VERT,ms=3.5,zorder=6)
        v_tau=vl_p*math.tanh(1)
        tirets(ax,[0,tau_p],[v_tau,v_tau])
        ax.plot([tau_p],[v_tau],'o',color=BRIQUE,ms=3.5,zorder=6)
        ax.text(tau_p+0.5,3.0,'$\\tau$',fontsize=12,color=VERT)
        ax.text(0.6,v_tau+3.2,'$0{,}76\\,v_{\\mathrm{lim}}$',fontsize=10.5,color=BRIQUE)
        ax.text(6.8,57.0,'tangente à l’origine',fontsize=10,color=VERT,va='center')
        ax.text(29.5,vl_p-4.0,'$v_{\\mathrm{lim}}$',fontsize=11,color=GRIS,ha='right')
    save(fig,'fig_parachute_c' if corrige else 'fig_parachute')
para_fig(False); para_fig(True)
print('Exercice 9 contrôle : vlim = %.2f m/s ; tau = %.2f s ; v(tau) = %.1f m/s' % (vl_p,tau_p,vl_p*math.tanh(1)))

# ---------------------------------------------------------------- figures de l'écoulement redessinées (figures 4, 14 et 15)
VIOLET='#D5D2EE'
def tube_pipe(ax,xs,hw,yc):
    """parois haute et basse d'une conduite : xs = abscisses des sommets, hw = demi-hauteurs"""
    top=[(x,yc+h) for x,h in zip(xs,hw)]; bot=[(x,yc-h) for x,h in zip(xs,hw)]
    ax.add_patch(Polygon(top+bot[::-1],closed=True,fc=EAU,ec='none',zorder=1))
    ax.plot(*zip(*top),color=ANTH,lw=1.7,zorder=3); ax.plot(*zip(*bot),color=ANTH,lw=1.7,zorder=3)
    return top,bot

# 4. Venturi (exercice 4) : v_B = beta x v_A avec beta = 2
fig,ax=new(8.6,5.6,(-1.6,13.4),(-1.4,9.0))
xs=[0.6,4.4,5.8,10.0,11.4,13.0]; hw=[1.5,1.5,0.75,0.75,1.5,1.5]; yc=1.5
tube_pipe(ax,xs,hw,yc)
xa,xb=2.4,8.0; la,lb=7.2,5.7                        # niveaux de A' et B' dans les tubes
for xt,top_wall,niv in ((xa,3.0,la),(xb,2.25,lb)):
    ax.add_patch(Rectangle((xt-0.3,top_wall),0.6,niv-top_wall,fc=EAU,ec='none',zorder=2))
    ax.plot([xt-0.3,xt-0.3],[top_wall,8.2],color=ANTH,lw=1.4,zorder=3); ax.plot([xt+0.3,xt+0.3],[top_wall,8.2],color=ANTH,lw=1.4,zorder=3)
    ax.plot([xt-0.3,xt+0.3],[niv,niv],color=EAUB,lw=1.3,zorder=3)
ax.plot([-0.4,11.6],[la,la],color=BLEU,lw=1.0,ls=(0,(4,3)),zorder=2)
ax.plot([-0.4,11.6],[lb,lb],color=CUIVRE,lw=1.0,ls=(0,(4,3)),zorder=2)
ax.plot([-0.4,11.6],[yc,yc],color=GRIS,lw=1.0,ls=(0,(4,3)),zorder=2)
arrow(ax,-1.0,-0.6,-1.0,8.6,color=ANTH,lw=1.1,head=5); ax.text(-1.45,8.5,r'$z$',fontsize=12)
ax.text(-0.5,la+0.05,r'$z_{\mathrm{A}\prime}$',fontsize=12,ha='right',va='bottom',color=BLEU)
ax.text(-0.5,lb+0.05,r'$z_{\mathrm{B}\prime}$',fontsize=12,ha='right',va='bottom',color=CUIVRE)
ax.text(-0.5,yc+0.1,r'$z_A = z_B$',fontsize=12,ha='right',va='bottom',color=GRIS)
ax.text(xa-0.45,la+0.15,r'$\mathrm{A}\prime$',fontsize=12,ha='right',va='bottom')
ax.text(xb-0.45,lb+0.15,r'$\mathrm{B}\prime$',fontsize=12,ha='right',va='bottom')
dim(ax,5.2,lb,5.2,la); ax.text(5.4,(la+lb)/2,r'$h$',fontsize=13,va='center')
ax.plot(xa,yc,'o',color=ANTH,ms=4.5,zorder=6); ax.text(xa-0.2,yc-0.45,'A',fontsize=12,ha='right',va='top')
ax.plot(xb,yc,'o',color=ANTH,ms=4.5,zorder=6); ax.text(xb-0.2,yc-0.45,'B',fontsize=12,ha='right',va='top')
arrow(ax,xa,yc,xa+1.2,yc,color=CUIVRE,lw=2.0,head=6,zorder=7); ax.text(xa+0.6,yc+0.2,r'$\vec{v}_A$',color=CUIVRE,fontsize=12,ha='center',va='bottom')
arrow(ax,xb,yc,xb+2.4,yc,color=CUIVRE,lw=2.6,head=7,zorder=7); ax.text(xb+1.2,yc+0.2,r'$\vec{v}_B$',color=CUIVRE,fontsize=12,ha='center',va='bottom')
save(fig,'fig_venturi')

# 14 et 15. Conduite qui se rétrécit de S à S' : les lignes de courant se resserrent
def tronc(ax,yc,x0,x1,h0,h1,pts_x,flechesv,labels_y):
    half=lambda x: h0+(h1-h0)*(x-x0)/(x1-x0)
    ax.add_patch(Polygon([(x0,yc+h0),(x1,yc+h1),(x1,yc-h1),(x0,yc-h0)],closed=True,fc='#EDEDEF',ec='none',zorder=1))
    ax.add_patch(Ellipse((x0,yc),0.9,2*h0,fc=VIOLET,ec='none',zorder=0))
    ax.add_patch(Ellipse((x1,yc),0.5,2*h1,fc=VIOLET,ec='none',zorder=0))
    ax.plot([x0,x1],[yc+h0,yc+h1],color=ANTH,lw=1.3,zorder=3); ax.plot([x0,x1],[yc-h0,yc-h1],color=ANTH,lw=1.3,zorder=3)
    ax.plot([x0,x0],[yc-h0,yc+h0],color=ANTH,lw=1.3,ls=(0,(3,2)),zorder=3); ax.plot([x1,x1],[yc-h1,yc+h1],color=ANTH,lw=1.3,ls=(0,(3,2)),zorder=3)
    for f in (-0.8,-0.4,0,0.4,0.8):
        ax.annotate('',xy=(x1,yc+f*h1),xytext=(x0,yc+f*h0),zorder=2,
                    arrowprops=dict(arrowstyle='-|>',color=BLEU,lw=1.0,mutation_scale=9,shrinkA=0,shrinkB=0))
    ax.text(x0,labels_y,r'$S$',fontsize=15,ha='center',va='center'); ax.text(x1,labels_y,r"$S\prime$",fontsize=15,ha='center',va='center')
    return half

fig,ax=new(8.6,3.9,(-0.4,12.0),(0.3,5.7))
yc=3.1; half=tronc(ax,yc,0.5,10.5,1.9,0.75,None,None,0.85)
xa,xb=3.0,8.0
for xt,ln in ((xa,1.5),(xb,2.8)):
    ax.plot(xt,yc,'o',color=ANTH,ms=4,zorder=6)
    arrow(ax,xt,yc,xt+ln,yc,color=BRIQUE,lw=2.0,head=6,zorder=7)
ax.text(xa+0.75,yc+0.2,r'$\vec{v}_A$',color=BRIQUE,fontsize=12,ha='center',va='bottom',zorder=8)
ax.text(xb+3.3,yc+0.25,r'$\vec{v}_B$',color=BRIQUE,fontsize=12,ha='center',va='bottom',zorder=8)
ax.text(xa-0.15,yc-0.3,'A',fontsize=13,ha='right',va='top'); ax.text(xb-0.15,yc-0.55,'B',fontsize=13,ha='right',va='top',bbox=dict(fc='#EDEDEF',ec='none',pad=0.5),zorder=9)
save(fig,'fig_cyl_reduc')

fig,ax=new(7.2,4.4,(-0.4,12.0),(-0.9,6.7))
yc=3.6; tronc(ax,yc,0.5,10.5,1.9,0.75,None,None,1.45)
ax.plot([1.6,9.0],[0,0],color=ANTH,lw=1.1,zorder=2)
arrow(ax,5.9,-0.6,5.9,6.4,color=ANTH,lw=1.1,head=5); ax.text(6.15,6.3,r'$z$',fontsize=12)
ax.text(5.6,0.2,'0',fontsize=12,ha='right',va='bottom')
xa,xb=3.0,8.0
for xt,ln,lab in ((xa,1.5,'A'),(xb,2.8,'B')):
    ax.plot(xt,yc,'o',color=ANTH,ms=4,zorder=6)
    arrow(ax,xt,yc,xt+ln,yc,color=BRIQUE,lw=2.0,head=6,zorder=7)
    ax.plot([xt,xt],[yc,0],color=ANTH,lw=1.0,ls=(0,(3,2)),zorder=4)
    dim(ax,xt,0.0,xt,yc,color=ANTH,lw=1.0)
    ax.text(xt-0.2,yc-0.5,lab,fontsize=13,ha='right',va='top',bbox=dict(fc='#EDEDEF',ec='none',pad=0.5),zorder=9)
    ax.text(xt+0.25,yc/2,r'$z_{%s}$' % lab,fontsize=12,va='center',bbox=dict(fc='white',ec='none',pad=0.5),zorder=9)
ax.text(xa+0.75,yc+0.2,r'$\vec{v}_A$',color=BRIQUE,fontsize=12,ha='center',va='bottom',zorder=8)
ax.text(xb+3.3,yc+0.25,r'$\vec{v}_B$',color=BRIQUE,fontsize=12,ha='center',va='bottom',zorder=8)
save(fig,'fig_cyl_bern')
