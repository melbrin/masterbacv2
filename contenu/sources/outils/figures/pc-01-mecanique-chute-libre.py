# Figures de la fiche PC 1 (Mécanique : chute libre et mouvement d'un projectile), dessinées dans la palette MasterBac
# usage : pc-01-mecanique-chute-libre.py <dossier de sortie, en général fiches/pc-01-mecanique-chute-libre/figs>
#
# Trois figures sont à l'échelle (chronophotographie de Q.17) : elles sont enregistrées sans rognage,
# à la taille exacte LARGEUR_CM x HAUTEUR_CM, et doivent être insérées dans la fiche avec {width=16cm}.
# Si vous changez leur cadrage, changez aussi cette largeur dans fiche.md.
import sys, math
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle, Circle, Polygon, Arc
from PIL import Image, ImageChops

out = sys.argv[1]
ANTH='#2B2C2D'; CUIVRE='#A47351'; NUIT='#001128'; GRIS='#8A8F98'; GRISC='#DAD5D0'
VERT='#2E6B4F'; BRIQUE='#B23A2E'; BLEU='#2F5D8A'; CUIVREC='#E9DDD3'; CREME='#FAF6F3'
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
def bille(ax,x,y,r=0.3,z=6):
    ax.add_patch(Circle((x,y),r,fc=CUIVRE,ec=ANTH,lw=1.1,zorder=z))
def sol(ax,x0,x1,y,pas=0.45,h=0.32):
    ax.plot([x0,x1],[y,y],color=ANTH,lw=1.6,zorder=3)
    for x in np.arange(x0+0.15,x1-0.05,pas):
        ax.plot([x,x-h],[y,y-h],color=GRIS,lw=0.8,zorder=2)

# ---------------------------------------------------------------- 1 et 2. Chute libre verticale
def chute(avec_v0):
    fig,ax=new(3.0,2.8,(0,7.5),(0,7.0))
    ox,oy=2.6,5.9
    arrow(ax,ox,oy,6.7,oy,lw=1.3,head=6)                       # axe (Ox)
    arrow(ax,ox,oy,ox,0.75,lw=1.3,head=6)                      # axe (Oy), vers le bas
    ax.text(6.95,oy,r'$x$',fontsize=13,ha='left',va='center')
    ax.text(ox+0.32,0.75,r'$y$',fontsize=13,ha='left',va='center')
    ax.text(ox-0.38,oy+0.42,r'$O$',fontsize=13,ha='center',va='center')
    if avec_v0:
        bille(ax,ox,oy)
        arrow(ax,ox,oy-0.3,ox,oy-2.3,color=BRIQUE,lw=2.6,head=8,zorder=7)
        ax.text(ox-0.5,oy-1.4,r'$\vec{v}_0$',fontsize=14,ha='right',va='center',color=BRIQUE)
        ax.text(ox+0.55,oy-0.55,r'$G$',fontsize=13,ha='left',va='center')
    else:
        bille(ax,ox,3.5)
        ax.text(ox-0.55,3.5,r'$G$',fontsize=13,ha='right',va='center')
    arrow(ax,5.3,4.4,5.3,2.4,color=BLEU,lw=2.2,head=8)
    ax.text(5.65,3.4,r'$\vec{g}$',fontsize=14,ha='left',va='center',color=BLEU)
    return fig
save(chute(False),'fig_chute')
save(chute(True),'fig_chute_v0')

# ---------------------------------------------------------------- 3. Chute libre : hauteur H, distance y(t), hauteur h
fig,ax=new(3.7,3.8,(0,9.25),(0,9.5))
ox,oy,ys,yg=4.3,8.3,1.1,4.7
sol(ax,0.7,8.4,ys)
ax.text(8.55,ys,'sol',fontsize=10.5,ha='left',va='center',color=GRIS)
arrow(ax,ox,oy,ox,ys+0.55,lw=1.3,head=6)
ax.plot([ox-0.16,ox+0.16],[oy,oy],color=ANTH,lw=1.3)
ax.text(ox+0.3,ys+0.75,r'$y$',fontsize=13,ha='left',va='center')
ax.text(ox,oy+0.42,r'$O$',fontsize=13,ha='center',va='center')
bille(ax,ox,yg)
ax.text(ox-0.5,yg,r'$G$',fontsize=13,ha='right',va='center')
for y,x0,x1 in ((oy,1.7,ox-0.3),(oy,ox+0.3,6.9),(yg,ox+0.45,6.9)):
    ax.plot([x0,x1],[y,y],color=GRIS,lw=0.8,ls=(0,(2,3)))
dim(ax,2.0,ys,2.0,oy); ax.text(1.65,(ys+oy)/2,r'$H$',fontsize=13,ha='right',va='center')
dim(ax,6.6,yg,6.6,oy); ax.text(6.9,(yg+oy)/2,r'$y(t)$',fontsize=13,ha='left',va='center')
dim(ax,6.6,ys,6.6,yg); ax.text(6.9,(ys+yg)/2,r'$h$',fontsize=13,ha='left',va='center')
save(fig,'fig_chute_sol')

# ---------------------------------------------------------------- 4 et 5. Lancer d'un projectile
def projectile(variante):
    fig,ax=new(4.7,3.2,(0,11.75),(-0.5,7.5))
    ox,oy,H,al=1.6,1.0,1.6,math.radians(50)
    xp=8.0
    k=(H+math.tan(al)*xp)/xp**2
    xs=math.tan(al)/(2*k); ys=H+math.tan(al)**2/(4*k)
    arrow(ax,ox,oy,11.1,oy,lw=1.3,head=6); ax.text(11.3,oy,r'$x$',fontsize=13,ha='left',va='center')
    arrow(ax,ox,oy,ox,7.0,lw=1.3,head=6);  ax.text(ox-0.3,7.0,r'$y$',fontsize=13,ha='right',va='center')
    ax.text(ox-0.32,oy-0.38,r'$O$',fontsize=13,ha='center',va='center')
    X=np.linspace(0,xp,200); Y=H+math.tan(al)*X-k*X**2
    ax.plot(ox+X,oy+Y,color=CUIVRE,lw=1.5,ls=(0,(5,3)),zorder=3)
    ax.plot([ox,ox+2.3],[oy+H,oy+H],color=GRIS,lw=0.8,ls=(0,(2,3)))
    ax.add_patch(Arc((ox,oy+H),2.2,2.2,theta1=0,theta2=50,color=ANTH,lw=1.0))
    ax.text(ox+1.45,oy+H+0.55,r'$\alpha$',fontsize=13,ha='center',va='center')
    L=2.3
    arrow(ax,ox,oy+H,ox+L*math.cos(al),oy+H+L*math.sin(al),color=BRIQUE,lw=2.4,head=8,zorder=7)
    ax.text(ox+L*math.cos(al)-0.55,oy+H+L*math.sin(al)+0.3,r'$\vec{v}_0$',fontsize=14,ha='center',va='center',color=BRIQUE)
    bille(ax,ox,oy+H,r=0.17,z=8)
    if variante=='enonce':
        dim(ax,ox-0.6,oy,ox-0.6,oy+H); ax.text(ox-0.85,oy+H/2,r'$H$',fontsize=13,ha='right',va='center')
        ax.plot([ox+xs-1.1,ox+xs+1.1],[oy+ys,oy+ys],color=GRIS,lw=0.8,ls=(0,(2,3)))
        dim(ax,ox+xs,oy,ox+xs,oy+ys); ax.text(ox+xs+0.3,oy+ys*0.45,r'$H_{\mathrm{max}}$',fontsize=13,ha='left',va='center')
        dim(ax,ox,oy-0.75,ox+xp,oy-0.75); ax.text(ox+xp/2,oy-1.15,r'$x_p$',fontsize=13,ha='center',va='center')
        ax.plot([ox+xp,ox+xp],[oy-0.9,oy],color=GRIS,lw=0.8,ls=(0,(2,3)))
        ax.plot([ox,ox],[oy-0.9,oy],color=GRIS,lw=0.8,ls=(0,(2,3)))
    else:
        ax.plot([ox-0.14,ox+0.14],[oy+H,oy+H],color=ANTH,lw=1.3)
        ax.text(ox-0.3,oy+H,r'$H$',fontsize=13,ha='right',va='center')
        arrow(ax,8.3,6.3,8.3,4.4,color=BLEU,lw=2.2,head=8)
        ax.text(8.65,5.35,r'$\vec{g}$',fontsize=14,ha='left',va='center',color=BLEU)
    return fig
save(projectile('enonce'),'fig_projectile')
save(projectile('g'),'fig_projectile_g')

# ---------------------------------------------------------------- 6. Projection de la vitesse initiale
fig,ax=new(4.2,3.2,(0,10.5),(0,8.0))
mx,my,L,al=1.7,2.0,6.2,math.radians(40)
axx,ay=mx+L*math.cos(al),my+L*math.sin(al)
ax.plot([mx,axx+1.0],[my,my],color=GRIS,lw=0.8,ls=(0,(2,3)),zorder=1)
arrow(ax,mx,my,axx,my,color=BRIQUE,lw=2.4,head=8,zorder=6)
arrow(ax,axx,my,axx,ay,color=VERT,lw=2.4,head=8,zorder=6)
arrow(ax,mx,my,axx,ay,color=ANTH,lw=2.4,head=8,zorder=7)
s=0.36
ax.plot([axx-s,axx-s,axx],[my,my+s,my+s],color=ANTH,lw=1.0,zorder=5)
ax.add_patch(Arc((mx,my),2.9,2.9,theta1=0,theta2=40,color=ANTH,lw=1.0))
ax.text(mx+1.95,my+0.62,r'$\alpha$',fontsize=14,ha='center',va='center')
ax.text(mx-0.35,my-0.3,r'$\mathrm{M}$',fontsize=13,ha='center',va='center')
ax.text(axx+0.3,my-0.32,r'$\mathrm{B}$',fontsize=13,ha='center',va='center')
ax.text(axx+0.3,ay+0.3,r'$\mathrm{A}$',fontsize=13,ha='center',va='center')
cx,cy=(mx+axx)/2,(my+ay)/2
ax.text(cx-0.42,cy+0.5,r'$\vec{v}_0$',fontsize=14,ha='center',va='center',rotation=0)
ax.text(cx-1.0,cy+1.2,'hypoténuse',fontsize=10,ha='center',va='center',color=GRIS,rotation=40)
ax.text(cx,my-0.5,r'$v_{0x}$',fontsize=14,ha='center',va='center',color=BRIQUE)
ax.text(cx,my-1.15,'côté adjacent',fontsize=10,ha='center',va='center',color=GRIS)
ax.text(axx+0.35,cy+0.25,r'$v_{0y}$',fontsize=14,ha='left',va='center',color=VERT)
ax.text(axx+0.35,cy-0.45,'côté opposé',fontsize=10,ha='left',va='center',color=GRIS)
save(fig,'fig_projection')

# ---------------------------------------------------------------- Chronophotographie du lancer (Q.10, Q.11, Q.17)
G0=9.81; V0=2.0; ALPHA=math.radians(45); TAU=0.020
def pos(i):
    t=i*TAU
    return V0*math.cos(ALPHA)*t, V0*math.sin(ALPHA)*t-0.5*G0*t*t
PTS={i:pos(i) for i in range(0,15)}

# 7 et 8. Vue d'ensemble dans un repère gradué
def chrono_repere(sommet):
    fig,ax=plt.subplots(figsize=(5.9,2.35))
    fig.subplots_adjust(0.085,0.19,0.985,0.97)
    ax.set_xlim(0,0.43); ax.set_ylim(0,0.125); ax.set_aspect('equal')
    ax.set_xticks(np.arange(0,0.41,0.05)); ax.set_yticks(np.arange(0,0.121,0.02))
    ax.set_xticklabels([f'{v:.2f}'.replace('.',',') if v else '0' for v in np.arange(0,0.41,0.05)])
    ax.set_yticklabels([f'{v:.2f}'.replace('.',',') if v else '0' for v in np.arange(0,0.121,0.02)])
    ax.grid(color=GRISC,lw=0.5)
    for s in ('top','right'): ax.spines[s].set_visible(False)
    for s in ('left','bottom'): ax.spines[s].set_linewidth(1.0); ax.spines[s].set_color(ANTH)
    ax.tick_params(labelsize=8,colors=ANTH,width=0.8)
    ax.set_xlabel(r'$x$ (m)',fontsize=9.5,labelpad=2); ax.set_ylabel(r'$y$ (m)',fontsize=9.5,labelpad=3)
    if sommet:
        T=np.linspace(0,14.6*TAU,200)
        ax.plot(V0*math.cos(ALPHA)*T,V0*math.sin(ALPHA)*T-0.5*G0*T*T,color=CUIVRE,lw=1.1,zorder=3)
    for i in range(1,15):
        x,y=PTS[i]
        ax.plot([x],[y],marker='o',ms=3.6,color=ANTH,zorder=5)
        if not sommet:
            dy=0.0085 if i<=7 else 0.0085
            dx=-0.006 if i<=6 else (0.0 if i==7 else 0.008)
            ax.text(x+dx,y+dy,rf'$G_{{{i}}}$',fontsize=8,ha='center',va='center',color=ANTH)
    if sommet:
        ts=V0*math.sin(ALPHA)/G0; xs=V0*math.cos(ALPHA)*ts; ys=V0*math.sin(ALPHA)*ts-0.5*G0*ts*ts
        ax.plot([xs-0.075,xs+0.115],[ys,ys],color=GRIS,lw=0.8,ls=(0,(3,3)),zorder=2)
        ax.plot([xs],[ys],marker='o',ms=4.2,color=BRIQUE,zorder=7)
        ax.annotate('',xy=(xs+0.085,ys),xytext=(xs,ys),zorder=6,
                    arrowprops=dict(arrowstyle='-|>',color=BRIQUE,lw=2.0,mutation_scale=11,shrinkA=0,shrinkB=0))
        ax.text(xs+0.05,ys+0.011,r'$\vec{v}_S$',fontsize=11,ha='center',va='center',color=BRIQUE)
        ax.text(xs,ys-0.012,'sommet',fontsize=8.5,ha='center',va='center',color=GRIS)
    return fig
for nom,s in (('fig_chrono',False),('fig_chrono_sommet',True)):
    f=chrono_repere(s); p=f'{out}/{nom}.png'
    f.savefig(p,facecolor='white'); plt.close(f); print(nom,rogne(p))

# 9, 10 et 11. Extrait à l'échelle 1/2 : 1 cm sur le papier pour 2 cm en réalité.
# Les coordonnées du dessin sont des centimètres de papier : X = 50 x et Y = 50 y (x et y en mètre).
LARGEUR_CM, HAUTEUR_CM = 16.0, 6.2
X0, Y0 = 5.6, -0.1
EV = 1/0.5      # échelle des vitesses : 1 cm pour 0,5 m/s
EA = 1/5.0      # échelle des accélérations : 1 cm pour 5 m/s2
def P(i):
    x,y=PTS[i]; return 50*x, 50*y
def chrono_echelle(variante):
    fig=plt.figure(figsize=(LARGEUR_CM/2.54,HAUTEUR_CM/2.54))
    ax=fig.add_axes([0,0,1,1])
    ax.set_xlim(X0,X0+LARGEUR_CM); ax.set_ylim(Y0,Y0+HAUTEUR_CM); ax.axis('off')
    ax.add_patch(Rectangle((X0+0.04,Y0+0.04),LARGEUR_CM-0.08,HAUTEUR_CM-0.08,fc='white',ec=GRISC,lw=0.8))
    etiq={i:(0.0,0.36) for i in range(5,9)}; etiq.update({i:(0.3,0.3) for i in range(9,15)})
    if variante=='vitesses': etiq.update({9:(0.0,0.36),10:(-0.28,-0.38),11:(-0.3,-0.39),12:(-0.28,-0.38),13:(-0.29,-0.36)})
    if variante=='deltav':   etiq.update({10:(-0.38,0.22),11:(0.44,0.32),12:(0.36,-0.3)})
    for i in range(5,15):
        x,y=P(i); c=0.11
        ax.plot([x-c,x+c],[y,y],color=ANTH,lw=0.9,zorder=8); ax.plot([x,x],[y-c,y+c],color=ANTH,lw=0.9,zorder=8)
        dx,dy=etiq[i]
        ax.text(x+dx,y+dy,rf'$G_{{{i}}}$',fontsize=9.5,ha='center',va='center',color=ANTH,zorder=9)
    # segment-repère de 2 cm
    sx,sy=6.3,0.95
    ax.plot([sx,sx+2],[sy,sy],color=ANTH,lw=1.3);
    for x in (sx,sx+2): ax.plot([x,x],[sy-0.12,sy+0.12],color=ANTH,lw=1.3)
    ax.text(sx+1,sy+0.32,'segment-repère : 2 cm',fontsize=8.5,ha='center',va='center',color=ANTH)
    ax.text(sx+1,sy-0.36,'(4 cm en réalité)',fontsize=8.5,ha='center',va='center',color=GRIS)
    ax.text(sx,sy+1.05,r'Échelle 1/2      $\tau$ = 20 ms',fontsize=9.5,ha='left',va='center',color=ANTH)
    def vit(i):                         # vecteur vitesse au point i, en cm de papier
        (xa,ya),(xb,yb)=PTS[i-1],PTS[i+1]
        return (xb-xa)/(2*TAU)*EV,(yb-ya)/(2*TAU)*EV
    v9,v11=vit(9),vit(11)
    if variante=='vitesses':
        for a,b in ((8,10),(10,12)):
            (xa,ya),(xb,yb)=P(a),P(b)
            ax.plot([xa,xb],[ya,yb],color=GRIS,lw=0.9,ls=(0,(3,2)),zorder=4)
        ax.text(10.2,1.62,'Mesures sur le schéma',fontsize=8.5,ha='left',va='center',color=GRIS)
        ax.text(10.2,1.14,r'$G_8G_{10}$ = 2,9 cm',fontsize=9.5,ha='left',va='center',color=ANTH)
        ax.text(10.2,0.66,r'$G_{10}G_{12}$ = 3,2 cm',fontsize=9.5,ha='left',va='center',color=ANTH)
        for i,v,lab in ((9,v9,r'$\vec{v}_9$'),(11,v11,r'$\vec{v}_{11}$')):
            x,y=P(i); n=math.hypot(*v)
            arrow(ax,x,y,x+v[0],y+v[1],color=BLEU,lw=1.8,head=6,zorder=7)
            ax.text(x+0.8*v[0]-0.38*v[1]/n,y+0.8*v[1]+0.38*v[0]/n,lab,fontsize=10.5,ha='center',va='center',color=BLEU)
        ax.text(X0+LARGEUR_CM-0.35,Y0+HAUTEUR_CM-0.45,r'Vitesses : 1 cm pour 0,5 m·s$^{-1}$',fontsize=8.5,ha='right',va='center',color=BLEU)
    if variante=='deltav':
        x,y=P(10)
        a10=10.0*EA                                           # 10 m/s2, valeur trouvée dans le corrigé
        arrow(ax,x,y,x,y-a10,color=BRIQUE,lw=1.6,head=6,zorder=6)
        arrow(ax,x,y,x+v11[0],y+v11[1],color=BLEU,lw=1.9,head=6,zorder=7)
        arrow(ax,x+v11[0],y+v11[1],x+v11[0]-v9[0],y+v11[1]-v9[1],color=GRIS,lw=1.9,head=6,zorder=7)
        dvx,dvy=v11[0]-v9[0],v11[1]-v9[1]
        nd=math.hypot(dvx,dvy); ext=0.06                      # la pointe est rognée par le trait épais : on prolonge de 0,6 mm
        arrow(ax,x,y,x+dvx*(1+ext/nd),y+dvy*(1+ext/nd),color=VERT,lw=2.6,head=6.5,zorder=9)
        n11=math.hypot(*v11)
        ax.text(x+0.24*v11[0]-0.36*v11[1]/n11,y+0.24*v11[1]+0.36*v11[0]/n11,r'$\vec{v}_{11}$',fontsize=10.5,ha='center',va='center',color=BLEU)
        ax.text(x+v11[0]-v9[0]*0.5-0.05,y+v11[1]-v9[1]*0.5-0.4,r'$-\vec{v}_9$',fontsize=10.5,ha='center',va='center',color=GRIS)
        ax.text(x-0.2,y+dvy/2-0.12,r'$\Delta\vec{v}$',fontsize=10.5,ha='right',va='center',color=VERT)
        ax.text(x-0.2,y-a10+0.3,r'$\vec{a}_{10}$',fontsize=10.5,ha='right',va='center',color=BRIQUE)
        ax.text(X0+LARGEUR_CM-0.35,Y0+HAUTEUR_CM-0.45,r'Vitesses : 1 cm pour 0,5 m·s$^{-1}$',fontsize=8.5,ha='right',va='center',color=BLEU)
        ax.text(X0+LARGEUR_CM-0.35,Y0+HAUTEUR_CM-0.88,r'Accélérations : 1 cm pour 5 m·s$^{-2}$',fontsize=8.5,ha='right',va='center',color=BRIQUE)
        print('   delta V sur le papier : %.2f cm ; G8G10 : %.2f cm ; G10G12 : %.2f cm' % (
              math.hypot(dvx,dvy), math.dist(P(8),P(10)), math.dist(P(10),P(12))))
    return fig
for nom,v in (('fig_chrono_mesure','enonce'),('fig_chrono_vitesses','vitesses'),('fig_chrono_deltav','deltav')):
    f=chrono_echelle(v); p=f'{out}/{nom}.png'
    f.savefig(p,facecolor='white',dpi=300); plt.close(f)
    im=Image.open(p); im.save(p,dpi=(300,300))
    print(nom,im.size,'-> largeur à insérer : %.1f cm' % LARGEUR_CM)

# ---------------------------------------------------------------- 12. Tir à la pétanque (à l'échelle)
fig,ax=new(4.6,2.15,(-1.25,7.75),(-0.95,3.2))
H,v0,al,g=1.10,7.0,math.radians(40),9.81
tp=(v0*math.sin(al)+math.sqrt((v0*math.sin(al))**2+2*g*H))/g
T=np.linspace(0,tp,200)
sol(ax,-0.9,7.2,0,pas=0.3,h=0.16)
arrow(ax,0,0,7.45,0,lw=1.3,head=6); ax.text(7.55,0.0,r'$x$',fontsize=13,ha='left',va='center')
arrow(ax,0,0,0,3.0,lw=1.3,head=6);  ax.text(-0.18,3.0,r'$y$',fontsize=13,ha='right',va='center')
ax.text(-0.22,-0.3,r'$O$',fontsize=13,ha='center',va='center')
ax.plot(v0*math.cos(al)*T,H+v0*math.sin(al)*T-0.5*g*T*T,color=CUIVRE,lw=1.4,ls=(0,(5,3)),zorder=3)
ax.plot([0,1.55],[H,H],color=GRIS,lw=0.8,ls=(0,(2,3)))
ax.add_patch(Arc((0,H),1.5,1.5,theta1=0,theta2=40,color=ANTH,lw=1.0))
ax.text(1.0,H+0.3,r'$\alpha$',fontsize=13,ha='center',va='center')
L=1.45
arrow(ax,0,H,L*math.cos(al),H+L*math.sin(al),color=BRIQUE,lw=2.4,head=8,zorder=7)
ax.text(L*math.cos(al)-0.42,H+L*math.sin(al)+0.2,r'$\vec{v}_0$',fontsize=14,ha='center',va='center',color=BRIQUE)
ax.add_patch(Circle((0,H),0.11,fc=GRIS,ec=ANTH,lw=1.0,zorder=8))
ax.text(0.22,H-0.3,'boule',fontsize=9.5,ha='left',va='center',color=GRIS)
dim(ax,-0.5,0,-0.5,H); ax.text(-0.68,H/2,r'$H$',fontsize=13,ha='right',va='center')
ax.add_patch(Circle((6.0,0.07),0.07,fc=CUIVRE,ec=ANTH,lw=0.9,zorder=8))
ax.text(6.22,0.36,'cochonnet',fontsize=9.5,ha='left',va='center',color=CUIVRE)
dim(ax,0,-0.52,6.0,-0.52); ax.text(3.0,-0.78,r'$D$',fontsize=13,ha='center',va='center')
for x in (0,6.0): ax.plot([x,x],[-0.62,0],color=GRIS,lw=0.8,ls=(0,(2,3)),zorder=1)
save(fig,'fig_petanque')

# ---------------------------------------------------------------- 13. Voiture sur un axe horizontal
def voiture(ax,x,y,c=CUIVREC):
    ax.add_patch(Polygon([(x-1.0,y+0.28),(x-1.0,y+0.72),(x-0.62,y+0.78),(x-0.32,y+1.22),(x+0.42,y+1.22),
                          (x+0.72,y+0.8),(x+1.0,y+0.7),(x+1.0,y+0.28)],closed=True,fc=c,ec=ANTH,lw=1.2,zorder=5))
    ax.add_patch(Polygon([(x-0.24,y+0.84),(x-0.2,y+1.12),(x+0.36,y+1.12),(x+0.56,y+0.84)],closed=True,fc='white',ec=ANTH,lw=0.8,zorder=6))
    for dx in (-0.58,0.58):
        ax.add_patch(Circle((x+dx,y+0.28),0.25,fc=ANTH,ec=ANTH,zorder=7))
        ax.add_patch(Circle((x+dx,y+0.28),0.1,fc='white',ec='white',zorder=8))
fig,ax=new(6.2,2.5,(0,15.5),(-0.6,5.6))
ya=1.6
arrow(ax,0.5,ya,14.6,ya,lw=1.3,head=6); ax.text(14.85,ya,r'$x$',fontsize=13,ha='left',va='center')
xo,xa=2.4,10.6
for x,lab in ((xo,r'$O$'),(xa,r'$A$')):
    ax.plot([x,x],[ya-0.16,ya+0.16],color=ANTH,lw=1.3)
    ax.text(x,ya-0.5,lab,fontsize=13,ha='center',va='center')
voiture(ax,xo,ya+0.03); voiture(ax,xa,ya+0.03)
arrow(ax,xo+1.1,ya+0.75,xo+2.3,ya+0.75,color=BLEU,lw=2.2,head=7)
ax.text(xo+1.75,ya+1.2,r'$\vec{v}_0$',fontsize=13,ha='center',va='center',color=BLEU)
arrow(ax,xa+1.1,ya+0.75,xa+3.9,ya+0.75,color=BLEU,lw=2.2,head=7)
ax.text(xa+2.5,ya+1.2,r'$\vec{v}_A$',fontsize=13,ha='center',va='center',color=BLEU)
arrow(ax,5.6,ya+2.3,7.6,ya+2.3,color=BRIQUE,lw=2.4,head=8)
ax.text(6.6,ya+2.78,r'$\vec{a}$',fontsize=14,ha='center',va='center',color=BRIQUE)
ax.text(xo,ya-1.02,r'$t = 0$',fontsize=10.5,ha='center',va='center')
ax.text(xo,ya-1.5,r'$v_0 = 30\ \mathrm{km{\cdot}h^{-1}}$',fontsize=10.5,ha='center',va='center')
ax.text(xa,ya-1.02,r'$t = 5{,}4\ \mathrm{s}$',fontsize=10.5,ha='center',va='center')
ax.text(xa,ya-1.5,r'$v_A = 70\ \mathrm{km{\cdot}h^{-1}}$',fontsize=10.5,ha='center',va='center')
save(fig,'fig_voiture')

# ---------------------------------------------------------------- 14. Graphe de la vitesse v(t)
def graphe_vt(annote):
    fig,ax=plt.subplots(figsize=(5.0,3.2))
    fig.subplots_adjust(0.12,0.15,0.97,0.96)
    ax.set_xlim(0,10.4); ax.set_ylim(0,128)
    ax.set_xticks(range(0,11)); ax.set_yticks(range(0,121,12))
    ax.grid(color=GRISC,lw=0.5)
    for s in ('top','right'): ax.spines[s].set_visible(False)
    for s in ('left','bottom'): ax.spines[s].set_linewidth(1.0); ax.spines[s].set_color(ANTH)
    ax.tick_params(labelsize=8.5,colors=ANTH,width=0.8)
    ax.set_xlabel(r'$t$ (s)',fontsize=10); ax.set_ylabel(r'$v$ (km·h$^{-1}$)',fontsize=10)
    tm=np.arange(1.5,10.0,1.0)
    ecarts=np.array([-3.0,2.0,-2.5,3.0,-1.5,2.0,-3.0,1.5,-2.0])
    ax.plot([0,10.2],[0,122.4],color=BLEU,lw=1.4,zorder=3)
    ax.plot(tm,12*tm+ecarts,ls='none',marker='+',ms=8,mew=1.6,color=CUIVRE,zorder=4)
    if annote:      # construction du corrigé : points A et B et pointillés de lecture
        for (x,y,lab,dx,dy) in ((0,0,r'$A$',0.24,11.0),(9.0,108,r'$B$',-0.3,6.5)):
            ax.plot([x],[y],marker='o',ms=5,color=BRIQUE,zorder=6,clip_on=False)
            ax.text(x+dx,y+dy,lab,fontsize=11,ha='center',va='center',color=BRIQUE)
        ax.plot([9.0,9.0],[0,108],color=BRIQUE,lw=0.8,ls=(0,(3,3)),zorder=2)
        ax.plot([0,9.0],[108,108],color=BRIQUE,lw=0.8,ls=(0,(3,3)),zorder=2)
    ax.text(4.6,34,'droite modèle',fontsize=9,color=BLEU,ha='left')
    ax.text(1.0,96,'+  points de mesure',fontsize=9,color=CUIVRE,ha='left')
    nom='fig_vt_corrige' if annote else 'fig_vt'
    fig.savefig(f'{out}/{nom}.png',facecolor='white'); plt.close(fig); print(nom,rogne(f'{out}/{nom}.png'))
graphe_vt(False)    # énoncé de Q.16 : la droite et les points de mesure seulement
graphe_vt(True)     # corrigé de Q.16 : avec A, B et les pointillés

# ---------------------------------------------------------------- 15 et 16. La balle du jongleur
XJ=[0.1*i for i in range(11)]
YJ=[0,0.161,0.297,0.409,0.497,0.559,0.598,0.612,0.601,0.566,0.506]
TJ=0.050
def jongleur(vecteurs):
    fig,ax=plt.subplots(figsize=(4.4,3.2))
    fig.subplots_adjust(0.115,0.145,0.975,0.975)
    ax.set_xlim(0,1.08); ax.set_ylim(0,0.72); ax.set_aspect('equal')
    ax.set_xticks(np.arange(0,1.01,0.1)); ax.set_yticks(np.arange(0,0.71,0.1))
    ax.set_xticklabels(['0']+[f'{v:.1f}'.replace('.',',') for v in np.arange(0.1,1.01,0.1)])
    ax.set_yticklabels(['0']+[f'{v:.1f}'.replace('.',',') for v in np.arange(0.1,0.71,0.1)])
    ax.grid(color=GRISC,lw=0.5)
    for s in ('top','right'): ax.spines[s].set_visible(False)
    for s in ('left','bottom'): ax.spines[s].set_linewidth(1.0); ax.spines[s].set_color(ANTH)
    ax.tick_params(labelsize=8.5,colors=ANTH,width=0.8)
    ax.set_xlabel(r'$x$ (m)',fontsize=10,labelpad=2); ax.set_ylabel(r'$y$ (m)',fontsize=10,labelpad=3)
    for i,(x,y) in enumerate(zip(XJ,YJ)):
        ax.plot([x],[y],marker='o',ms=4.2,color=ANTH,zorder=6,clip_on=False)
        dx,dy=(-0.04,0.03) if i<7 else ((0.0,0.04) if i==7 else (0.04,0.03))
        if i==0: dx,dy=0.045,0.03
        if vecteurs and i in (4,5,6): dx,dy=0.038,-0.024
        if vecteurs and i==7: dx,dy=0.012,-0.036
        ax.text(x+dx,y+dy,rf'$G_{{{i}}}$',fontsize=9,ha='center',va='center',color=ANTH,zorder=7)
    if vecteurs:
        e=0.11                                             # 0,11 m sur le graphique pour 1 m/s
        def v(i): return (XJ[i+1]-XJ[i-1])/(2*TJ),(YJ[i+1]-YJ[i-1])/(2*TJ)
        v3,v5=v(3),v(5)
        for i,vv,lab,off in ((3,v3,r'$\vec{v}_3$',(-0.028,0.022)),(5,v5,r'$\vec{v}_5$',(0.036,0.012))):
            ax.annotate('',xy=(XJ[i]+e*vv[0],YJ[i]+e*vv[1]),xytext=(XJ[i],YJ[i]),zorder=8,
                        arrowprops=dict(arrowstyle='-|>',color=BLEU,lw=1.9,mutation_scale=11,shrinkA=0,shrinkB=0))
            ax.text(XJ[i]+e*vv[0]+off[0],YJ[i]+e*vv[1]+off[1],lab,fontsize=11,ha='center',va='center',color=BLEU)
        dv=(v5[0]-v3[0],v5[1]-v3[1])
        ax.annotate('',xy=(XJ[4]+e*dv[0],YJ[4]+e*dv[1]),xytext=(XJ[4],YJ[4]),zorder=9,
                    arrowprops=dict(arrowstyle='-|>',color=VERT,lw=2.4,mutation_scale=11,shrinkA=0,shrinkB=0))
        ax.text(XJ[4]-0.04,YJ[4]+e*dv[1]*0.62,r'$\Delta\vec{v}$',fontsize=11,ha='center',va='center',color=VERT)
        ax.annotate('',xy=(0.78+e,0.08),xytext=(0.78,0.08),zorder=8,
                    arrowprops=dict(arrowstyle='-|>',color=ANTH,lw=1.4,mutation_scale=9,shrinkA=0,shrinkB=0))
        ax.text(0.78+e/2,0.115,r'1 m·s$^{-1}$',fontsize=8.5,ha='center',va='center',color=ANTH)
        ax.text(0.78+e/2,0.045,'échelle des vitesses',fontsize=8,ha='center',va='center',color=GRIS)
    return fig
for nom,v in (('fig_jongleur',False),('fig_jongleur_vecteurs',True)):
    f=jongleur(v); p=f'{out}/{nom}.png'
    f.savefig(p,facecolor='white'); plt.close(f); print(nom,rogne(p))
