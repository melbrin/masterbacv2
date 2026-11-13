# Figures de la fiche PC 4 (Énergie), dessinées dans la palette MasterBac
# usage : pc-05-energie.py <dossier de sortie, en général fiches/pc-05-energie/figs>
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

import numpy as np
SABLE='#FDF4E8'; CUIVREC='#E9DDD3'; CREME='#FAF6F3'; HUILE='#F4E3C3'; HUILEB='#D9B98A'

# 1. Trois matériaux en série
fig,ax=new(5.4,2.7,(0,13),(0,6.5))
for x0,x1,fc,lab in ((4.6,5.8,CUIVREC,r'$R_1$'),(5.8,7.6,SABLE,r'$R_2$'),(7.6,8.6,EAU,r'$R_3$')):
    ax.add_patch(Rectangle((x0,1.0),x1-x0,4.6,fc=fc,ec=ANTH,lw=1.4))
    ax.text((x0+x1)/2,0.45,lab,fontsize=12,ha='center',va='center')
arrow(ax,1.0,3.3,4.45,3.3,color=BRIQUE,lw=2.4,head=8)
arrow(ax,8.75,3.3,11.8,3.3,color=BRIQUE,lw=2.4,head=8)
ax.text(2.7,3.75,r'flux thermique $\Phi$',fontsize=10,ha='center',color=BRIQUE)
ax.text(2.7,5.6,'côté chaud',fontsize=9.5,ha='center',color=GRIS)
ax.text(10.3,5.6,'côté froid',fontsize=9.5,ha='center',color=GRIS)
save(fig,'fig_mur_serie')

# 2. Paroi entre deux températures
fig,ax=new(5.4,2.7,(0,13),(0,6.5))
ax.add_patch(Rectangle((5.6,1.0),1.8,4.6,fc=CUIVREC,ec=ANTH,lw=1.4))
ax.text(6.5,0.45,r'$R_{\mathrm{th}}$',fontsize=12,ha='center',va='center')
arrow(ax,1.4,3.3,5.45,3.3,color=BRIQUE,lw=2.4,head=8)
arrow(ax,7.55,3.3,11.6,3.3,color=BRIQUE,lw=2.4,head=8)
ax.text(3.4,3.75,r'flux thermique $\Phi$',fontsize=10,ha='center',color=BRIQUE)
ax.text(3.4,5.3,r'$T_2$',fontsize=14,ha='center',color=BRIQUE)
ax.text(9.6,5.3,r'$T_1$',fontsize=14,ha='center',color=BLEU)
ax.text(3.4,1.5,'face chaude',fontsize=9.5,ha='center',color=GRIS)
ax.text(9.6,1.5,'face froide',fontsize=9.5,ha='center',color=GRIS)
save(fig,'fig_mur_flux')

# 3. Bilan radiatif de la Terre
fig,ax=new(5.8,3.1,(0,14),(0,7.4))
cx,cy,r=8.2,3.7,1.9
ax.add_patch(Circle((cx,cy),r,fc=EAU,ec=ANTH,lw=1.4,zorder=3))
ax.text(cx,cy,'Terre',fontsize=10,ha='center',va='center',zorder=4)
for y in np.linspace(cy-r+0.15,cy+r-0.15,6):
    arrow(ax,0.6,y,4.75,y,color=CUIVRE,lw=1.5,head=5.5)
ax.plot([5.2,5.2],[cy-r,cy+r],color=CUIVRE,lw=1.6,ls=(0,(4,3)))
ax.plot([5.2,cx],[cy+r,cy+r],color=GRIS,lw=0.7,ls=(0,(2,3))); ax.plot([5.2,cx],[cy-r,cy-r],color=GRIS,lw=0.7,ls=(0,(2,3)))
ax.text(2.6,cy+r+0.75,r'rayonnement solaire $\varphi_S$',fontsize=9.5,ha='center',color=CUIVRE)
ax.text(5.2,cy-r-0.75,r'reçu sur un disque : $\pi R_T^{\,2}$',fontsize=9.5,ha='center',color=CUIVRE)
for k in range(10):
    a=2*np.pi*k/10+0.31
    arrow(ax,cx+(r+0.12)*np.cos(a),cy+(r+0.12)*np.sin(a),cx+(r+0.95)*np.cos(a),cy+(r+0.95)*np.sin(a),color=BRIQUE,lw=1.3,head=4.5)
ax.text(11.6,cy+r+0.75,r'émis par toute la sphère : $4\pi R_T^{\,2}$',fontsize=9.5,ha='center',color=BRIQUE)
save(fig,'fig_bilan_terre')

# 4 et 5. Refroidissement de l'eau de la bouilloire
def courbe(nom,construction):
    fig,ax=plt.subplots(figsize=(5.6,3.5))
    fig.subplots_adjust(0.11,0.14,0.975,0.965)
    t=np.linspace(0,240,400); th=20+80*np.exp(-t/60)
    ax.set_xlim(0,240); ax.set_ylim(0,105)
    ax.set_xticks(range(0,241,30)); ax.set_xticks(range(0,241,10),minor=True)
    ax.set_yticks(range(0,101,10)); ax.set_yticks(range(0,105,5),minor=True)
    ax.grid(which='major',color='#C9C4BF',lw=0.6); ax.grid(which='minor',color='#E6E1DC',lw=0.4)
    for s in ('top','right'): ax.spines[s].set_visible(False)
    for s in ('left','bottom'): ax.spines[s].set_linewidth(1.0); ax.spines[s].set_color(ANTH)
    ax.tick_params(labelsize=8.5,colors=ANTH,width=0.8)
    ax.set_xlabel(r'$t$ (min)',fontsize=10); ax.set_ylabel(r'$\theta$ (°C)',fontsize=10)
    ax.plot([0,240],[20,20],color=GRIS,lw=1.0,ls=(0,(5,3)))
    ax.plot(t,th,color=CUIVRE,lw=2.0)
    ax.text(150,11.5,r'$\theta_{\mathrm{ext}} = 20$ °C',fontsize=9.5,ha='center',color=GRIS)
    if construction:
        ax.plot([0,60],[100,20],color=BLEU,lw=1.3)
        ax.plot([60,60],[0,20+80*np.exp(-1)],color=BLEU,lw=1.0,ls=(0,(3,3)))
        ax.plot([0,60],[20+80*np.exp(-1)]*2,color=BRIQUE,lw=1.0,ls=(0,(3,3)))
        ax.plot([60],[20+80*np.exp(-1)],marker='o',ms=4.5,color=BRIQUE)
        ax.text(63,8,r'$\tau = 60$ min',fontsize=9.5,color=BLEU)
        ax.text(26,74,'tangente\nà l\'origine',fontsize=8.5,color=BLEU)
        ax.text(64,52,r'$\theta(\tau) \approx 49$ °C',fontsize=9,color=BRIQUE)
    fig.savefig(f'{out}/{nom}.png',facecolor='white'); plt.close(fig); print(nom)
courbe('fig_refroidissement',False); courbe('fig_refroidissement_tau',True)

# 6. Calorimètre à résistance chauffante
fig,ax=new(5.4,3.6,(0,13.5),(0,9))
ax.add_patch(FancyBboxPatch((1.2,0.6),5.6,6.0,boxstyle='round,pad=0,rounding_size=0.35',fc=CREME,ec=ANTH,lw=1.6))
ax.add_patch(Rectangle((1.75,1.15),4.5,5.45,fc='white',ec=ANTH,lw=1.0))
ax.add_patch(Rectangle((1.75,1.15),4.5,3.9,fc=HUILE,ec='none'))
ax.plot([1.75,6.25],[5.05,5.05],color=HUILEB,lw=1.2)
ax.add_patch(Rectangle((0.9,6.6),6.2,0.55,fc=ANTH,ec=ANTH,lw=1.0))
# conducteur ohmique
xs=[3.0,3.0,3.25,3.75,4.25,4.75,5.0,5.0]; ys=[7.15,2.6,2.2,3.0,2.2,3.0,2.6,7.15]
ax.plot(xs,ys,color=BRIQUE,lw=1.6,zorder=4)
# thermomètre
ax.add_patch(Rectangle((2.15,2.0),0.22,6.2,fc='white',ec=ANTH,lw=1.0,zorder=5))
ax.add_patch(Circle((2.26,2.0),0.2,fc=BRIQUE,ec=ANTH,lw=0.8,zorder=6))
# circuit : ampèremètre en série, voltmètre en dérivation aux bornes du conducteur ohmique
ax.plot([3.0,3.0,12.0,12.0,7.5,7.5,5.0,5.0],[7.15,8.5,8.5,5.6,5.6,7.75,7.75,7.15],color=ANTH,lw=1.2)
ax.plot([8.9,8.9],[8.5,5.6],color=ANTH,lw=1.2)
for (x,y,l) in ((10.7,8.5,'A'),(8.9,7.05,'V')):
    ax.add_patch(Circle((x,y),0.42,fc='white',ec=ANTH,lw=1.2,zorder=6)); ax.text(x,y,l,fontsize=9.5,ha='center',va='center',zorder=7)
ax.add_patch(Rectangle((11.5,6.5),1.0,1.1,fc='white',ec=ANTH,lw=1.2,zorder=6)); ax.text(12.0,7.05,'G',fontsize=9.5,ha='center',va='center',zorder=7)
ax.plot([8.9],[8.5],marker='o',ms=3,color=ANTH); ax.plot([8.9],[5.6],marker='o',ms=3,color=ANTH)
# agitateur : tige et pale
ax.add_patch(Rectangle((1.91,1.45),0.09,6.15,fc='white',ec=ANTH,lw=0.9,zorder=8))
ax.add_patch(Rectangle((1.8,1.35),1.0,0.2,fc='white',ec=ANTH,lw=0.9,zorder=8))
ax.text(4.0,1.55,'huile',fontsize=9.5,ha='center',color=CUIVRE)
ax.annotate('conducteur\nohmique',xy=(5.0,3.2),xytext=(6.9,2.3),fontsize=9,va='center',arrowprops=dict(arrowstyle='-',color=GRIS,lw=0.8))
ax.annotate('thermomètre',xy=(2.26,7.9),xytext=(0.1,8.75),fontsize=9,va='center',arrowprops=dict(arrowstyle='-',color=GRIS,lw=0.8))
ax.annotate('agitateur',xy=(1.91,7.6),xytext=(0.05,7.6),fontsize=9,va='center',arrowprops=dict(arrowstyle='-',color=GRIS,lw=0.8))
ax.annotate('calorimètre',xy=(6.8,1.2),xytext=(7.4,0.9),fontsize=9,va='center',arrowprops=dict(arrowstyle='-',color=GRIS,lw=0.8))
save(fig,'fig_calorimetre')

# 7. Mur en paille enduit
fig,ax=new(5.4,2.9,(0,13),(0,7))
for x0,x1,fc in ((4.2,4.7,CUIVREC),(4.7,8.3,SABLE),(8.3,8.8,CUIVREC)):
    ax.add_patch(Rectangle((x0,1.3),x1-x0,4.4,fc=fc,ec=ANTH,lw=1.3))
for y in np.linspace(1.75,5.25,9):
    ax.plot([4.85,8.15],[y,y],color=HUILEB,lw=0.6)
ax.text(6.5,6.15,'paille',fontsize=9.5,ha='center',color=ANTH)
ax.annotate('enduit',xy=(4.45,5.7),xytext=(3.2,6.35),fontsize=9,va='center',ha='center',arrowprops=dict(arrowstyle='-',color=GRIS,lw=0.8))
ax.annotate('enduit',xy=(8.55,5.7),xytext=(9.8,6.35),fontsize=9,va='center',ha='center',arrowprops=dict(arrowstyle='-',color=GRIS,lw=0.8))
dim(ax,4.7,0.85,8.3,0.85); ax.text(6.5,0.4,r'$e_p$',fontsize=11,ha='center',va='center')
arrow(ax,1.0,3.5,4.05,3.5,color=BRIQUE,lw=2.4,head=8); arrow(ax,8.95,3.5,12.0,3.5,color=BRIQUE,lw=2.4,head=8)
ax.text(2.5,3.95,r'$\Phi$',fontsize=12,ha='center',color=BRIQUE)
ax.text(2.5,2.3,'intérieur\n' r'$\theta_{\mathrm{int}}$',fontsize=9.5,ha='center',va='center',color=BRIQUE)
ax.text(10.5,2.3,'extérieur\n' r'$\theta_{\mathrm{ext}}$',fontsize=9.5,ha='center',va='center',color=BLEU)
save(fig,'fig_mur_paille')

# 8. Température de l'huile en fonction du temps
fig,ax=plt.subplots(figsize=(5.0,3.1))
fig.subplots_adjust(0.12,0.16,0.97,0.96)
tt=np.array([0,60,120,180,240,300]); th=np.array([20.0,23.5,27.2,30.7,34.3,37.9])
a,b=np.polyfit(tt,th,1)
ax.set_xlim(-12,320); ax.set_ylim(18,40)
ax.set_xticks(range(0,321,60)); ax.set_yticks(range(18,41,2))
ax.grid(color='#DAD5D0',lw=0.5)
for s in ('top','right'): ax.spines[s].set_visible(False)
for s in ('left','bottom'): ax.spines[s].set_linewidth(1.0); ax.spines[s].set_color(ANTH)
ax.tick_params(labelsize=8.5,colors=ANTH,width=0.8)
ax.set_xlabel(r'$t$ (s)',fontsize=10); ax.set_ylabel(r'$\theta$ (°C)',fontsize=10)
ax.plot([0,315],[b,a*315+b],color=BLEU,lw=1.3)
ax.plot(tt,th,ls='none',marker='+',ms=9,mew=1.8,color=CUIVRE)
ax.text(150,22.2,r'$\theta = 0{,}0597 \times t + 20{,}0$',fontsize=9.5,color=BLEU)
fig.savefig(f'{out}/fig_huile_droite.png',facecolor='white'); plt.close(fig); print('fig_huile_droite', round(a,5), round(b,2))
