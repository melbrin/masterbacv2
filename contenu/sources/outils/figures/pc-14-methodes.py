# Figures de la fiche PC 14 (Méthodes du BAC : incertitudes, Python, équations différentielles, rédaction), palette MasterBac
# usage : pc-14-methodes.py <dossier de sortie, en général fiches/pc-14-methodes/figs>
import sys, math
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.ticker import FuncFormatter
from PIL import Image, ImageChops

out = sys.argv[1]
ANTH='#2B2C2D'; CUIVRE='#A47351'; GRIS='#8A8F98'; GRISC='#DAD5D0'; GRISM='#EFEBE7'
VERT='#2E6B4F'; BRIQUE='#B23A2E'; BLEU='#2F5D8A'; EAU='#DCE9F2'; SABLE='#F4E3C3'
plt.rcParams.update({'font.family':'Carlito','font.size':11,'mathtext.fontset':'stix',
                     'axes.linewidth':0,'savefig.dpi':300})

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
def virgule(v,p): return ('%g' % v).replace('.',',').replace('-','−')
def axes_style(ax,xlab,ylab,size=10):
    ax.grid(color=GRISC,lw=0.6)
    ax.grid(which='minor',color=GRISM,lw=0.35); ax.tick_params(which='minor',length=0)
    for s in ('top','right'): ax.spines[s].set_visible(False)
    for s in ('left','bottom'): ax.spines[s].set_linewidth(1.0); ax.spines[s].set_color(ANTH)
    ax.tick_params(labelsize=size-1,colors=ANTH,width=0.8)
    ax.set_xlabel(xlab,fontsize=size); ax.set_ylabel(ylab,fontsize=size)
    ax.xaxis.set_major_formatter(FuncFormatter(virgule)); ax.yaxis.set_major_formatter(FuncFormatter(virgule))
def courbe(figsize,marges):
    fig,ax=plt.subplots(figsize=figsize); fig.subplots_adjust(*marges)
    return fig,ax
def tirets(ax,xs,ys,color=BRIQUE,lw=1.0):
    ax.plot(xs,ys,color=color,lw=lw,ls=(0,(4,2.5)),zorder=4)

# ---------------------------------------------------------------- 1 et 2. Exercice 2 : vitesse de l'ascenseur calculée par le programme
def z_asc(t):
    if t <= 8: return 0.375*t*t
    if t <= 32: return 24 + 6*(t - 8)
    return 168 + 6*(t - 32) - 0.375*(t - 32)**2
ts = list(range(41)); zs = [z_asc(t) for t in ts]
vs = [(zs[i+1] - zs[i]) / (ts[i+1] - ts[i]) for i in range(len(zs) - 1)]
def ascenseur_fig(corrige):
    fig,ax=courbe((4.8,2.35),(0.11,0.2,0.98,0.97))
    tm=[x+0.5 for x in ts[:len(vs)]]     # chaque vitesse est placée au milieu de son intervalle de temps
    ax.plot(tm,vs,color=BLEU,lw=1.2,zorder=5)
    ax.plot(tm,vs,'o',color=BLEU,ms=2.6,zorder=6)
    ax.set_xlim(0,40); ax.set_ylim(0,7)
    ax.set_xticks(range(0,41,5)); ax.set_xticks(range(0,41,1),minor=True)
    ax.set_yticks(range(0,8)); ax.set_yticks(np.arange(0,7.01,0.5),minor=True)
    axes_style(ax,'$t$ (s)','$v$ (m·s$^{-1}$)')
    if corrige:
        ax.plot([0,7.5],[0,0.75*7.5],color=VERT,lw=1.2,zorder=4)
        tirets(ax,[1.5,5.5,5.5],[1.125,1.125,4.125],color=VERT)
        ax.text(5.8,2.4,'$\\Delta v = 3{,}0$ m·s$^{-1}$',fontsize=9.5,color=VERT,va='center')
        ax.text(2.1,0.55,'$\\Delta t = 4{,}0$ s',fontsize=9.5,color=VERT)
        tirets(ax,[8.5,31.5],[6.35,6.35],color=GRIS)
        ax.text(20,6.5,'vitesse constante : 6,0 m·s$^{-1}$',fontsize=9.5,color=GRIS,ha='center')
    save(fig,'fig_ascenseur_c' if corrige else 'fig_ascenseur')
ascenseur_fig(False); ascenseur_fig(True)
print('Ex. 2 contrôle : z final = %.1f m ; nombre de vitesses %d' % (zs[-1], len(vs)))

# ---------------------------------------------------------------- 3 et 4. Q.14 : refroidissement d'un thé, theta = 20 + 60 exp(-t/1000)
def the_fig(corrige):
    fig,ax=courbe((4.6,2.6),(0.11,0.18,0.955,0.97))
    t=np.linspace(0,3000,601); ax.plot(t,20+60*np.exp(-t/1000),color=BLEU,lw=1.7,zorder=5)
    ax.set_xlim(0,3000); ax.set_ylim(0,90)
    ax.set_xticks(range(0,3001,500)); ax.set_xticks(range(0,3001,100),minor=True)
    ax.set_yticks(range(0,91,10)); ax.set_yticks(range(0,91,2),minor=True)
    axes_style(ax,'$t$ (s)','$\\theta$ (°C)')
    tirets(ax,[0,3000],[20,20],color=GRIS)
    ax.text(2950,13,'température de la pièce',fontsize=9,color=GRIS,ha='right')
    if corrige:
        t50=1000*math.log(2)
        tirets(ax,[0,t50,t50],[50,50,0])
        ax.plot([t50],[50],'o',color=BRIQUE,ms=3.5,zorder=6)
        ax.text(t50+40,4,'690 s',fontsize=10,color=BRIQUE)
    save(fig,'fig_the_c' if corrige else 'fig_the')
the_fig(False); the_fig(True)

# ---------------------------------------------------------------- 5. Q.10 (corrigé) : simulation de Monte-Carlo de la mesure de g
rng=np.random.default_rng(2026)
N=100000; L=rng.normal(0.500,0.002,N); T=rng.normal(1.420,0.007,N); g=4*np.pi**2*L/T**2
gm, ug = g.mean(), g.std(ddof=1)
fig,ax=courbe((4.6,2.5),(0.145,0.19,0.98,0.97))
ax.hist(g,bins=70,range=(9.35,10.25),color=BLEU,alpha=0.85,zorder=3)
ax.set_xlim(9.35,10.25)
ax.set_xticks(np.arange(9.4,10.21,0.1)); ax.set_xticks(np.arange(9.35,10.251,0.05),minor=True)
axes_style(ax,'$g$ calculé (m·s$^{-2}$)','nombre de tirages')
ax.grid(axis='x',which='both',visible=False)
ymax=ax.get_ylim()[1]
ax.plot([gm,gm],[0,ymax*0.97],color=BRIQUE,lw=1.2,zorder=5)
for xx in (gm-ug, gm+ug): tirets(ax,[xx,xx],[0,ymax*0.80],color=VERT)
ax.annotate('',xy=(gm+ug,ymax*0.74),xytext=(gm-ug,ymax*0.74),zorder=6,
            arrowprops=dict(arrowstyle='<|-|>',color=VERT,lw=1.0,mutation_scale=8,shrinkA=0,shrinkB=0))
ax.text(gm+ug+0.02,ymax*0.74,'$2\\,u(g)$',fontsize=10,color=VERT,va='center')
ax.text(gm+0.015,ymax*0.93,'moyenne',fontsize=9.5,color=BRIQUE)
save(fig,'fig_montecarlo')
print('Q.10 contrôle : moyenne %.4f ; écart-type %.4f' % (gm, ug))

# ---------------------------------------------------------------- 6 et 7. Exercice 3 : échauffement de deux ampoules de sprinkler
th0, thx, thr = 22, 200, 68
def sprinkler_fig(corrige):
    fig,ax=courbe((4.6,2.7),(0.11,0.17,0.98,0.97))
    t=np.linspace(0,60,601)
    for tau,lab,xl in ((40,'A',47),(12,'B',13)):
        th=thx+(th0-thx)*np.exp(-t/tau); ax.plot(t,th,color=BLEU if lab=='A' else CUIVRE,lw=1.7,zorder=5)
        yl=thx+(th0-thx)*math.exp(-xl/tau)
        ax.text(xl,yl-14 if lab=='A' else yl+6,lab,fontsize=11,color=BLEU if lab=='A' else CUIVRE,ha='center',fontweight='bold')
    ax.set_xlim(0,60); ax.set_ylim(0,220)
    ax.set_xticks(range(0,61,10)); ax.set_xticks(range(0,61,2),minor=True)
    ax.set_yticks(range(0,221,20)); ax.set_yticks(range(0,221,10),minor=True)
    axes_style(ax,'$t$ (s)','$\\theta$ (°C)')
    tirets(ax,[0,60],[thr,thr],color=BRIQUE)
    ax.text(59,thr-13,'rupture de l’ampoule : 68 °C',fontsize=9,color=BRIQUE,ha='right')
    tirets(ax,[0,60],[thx,thx],color=GRIS)
    ax.text(59,thx-13,'gaz chauds : 200 °C',fontsize=9,color=GRIS,ha='right')
    if corrige:
        for tau,c in ((40,BLEU),(12,CUIVRE)):
            tr=tau*math.log((thx-th0)/(thx-thr))
            tirets(ax,[tr,tr],[0,thr],color=c); ax.plot([tr],[thr],'o',color=c,ms=3.5,zorder=6)
        ax.text(3.6+0.6,8,'3,6 s',fontsize=9.5,color=CUIVRE)
        ax.text(12.0+0.6,8,'12 s',fontsize=9.5,color=BLEU)
    save(fig,'fig_sprinkler_c' if corrige else 'fig_sprinkler')
sprinkler_fig(False); sprinkler_fig(True)
print('Ex. 3 contrôle : t_rupt A = %.2f s ; B = %.2f s' % (40*math.log(178/132), 12*math.log(178/132)))
