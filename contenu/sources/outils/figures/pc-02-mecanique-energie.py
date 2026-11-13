# Figures de la fiche PC 2 (Mécanique : énergie et champ électrique uniforme), dessinées dans la palette MasterBac
# usage : pc-02-mecanique-energie.py <dossier de sortie, en général fiches/pc-02-mecanique-energie/figs>
import sys, math
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.ticker import FuncFormatter
from matplotlib.patches import Circle, Polygon, Arc, Ellipse
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

g=9.81
def graphe(w,h,xl,yl,xlab,ylab,xt,yt):
    fig,ax=plt.subplots(figsize=(w,h)); fig.subplots_adjust(0.13,0.15,0.97,0.96)
    ax.set_xlim(*xl); ax.set_ylim(*yl); ax.set_xticks(xt); ax.set_yticks(yt)
    ax.grid(color=GRISC,lw=0.6)
    for s in ('top','right'): ax.spines[s].set_visible(False)
    for s in ('left','bottom'): ax.spines[s].set_linewidth(1.0); ax.spines[s].set_color(ANTH)
    ax.tick_params(labelsize=8.5,colors=ANTH,width=0.8)
    virgule=FuncFormatter(lambda v,_: ('%g'%v).replace('.',','))
    ax.xaxis.set_major_formatter(virgule); ax.yaxis.set_major_formatter(virgule)
    ax.set_xlabel(xlab,fontsize=10); ax.set_ylabel(ylab,fontsize=10)
    return fig,ax
def sauve(fig,name):
    p=f'{out}/{name}.png'; fig.savefig(p,facecolor='white'); plt.close(fig); print(name,rogne(p))

# 1. Q.3 : énergies d'un ballon lancé depuis le sol (m = 0,60 kg ; v0 = 10 m/s ; 60°)
m,v0,a=0.60,10.0,math.radians(60); vx,vy=v0*math.cos(a),v0*math.sin(a)
t=np.arange(0,1.70,0.1)
Ec=0.5*m*(vx**2+(vy-g*t)**2); Ep=m*g*(vy*t-0.5*g*t**2)
fig,ax=graphe(5.0,3.4,(0,1.8),(0,35),'$t$ (s)','Énergie (J)',np.arange(0,1.81,0.2),range(0,36,5))
ax.plot(t,Ec,ls='none',marker='s',ms=4.5,color=ANTH,clip_on=False,zorder=6); ax.plot(t,Ep,ls='none',marker='+',ms=8,mew=1.6,color=CUIVRE,clip_on=False,zorder=6)
ax.text(0.05,27.5,'courbe A',fontsize=9.5,color=ANTH); ax.text(0.25,4.0,'courbe B',fontsize=9.5,color=CUIVRE)
sauve(fig,'fig_ec_epp')

# 2. Q.4 : énergie potentielle d'un plongeur (m = 70 kg ; plateforme à 5,0 m ; vy0 = 3,0 m/s)
m,h0,vy0=70,5.0,3.0
t=np.arange(0,1.31,0.05); Ep=m*g*(h0+vy0*t-0.5*g*t**2)/1e3
fig,ax=graphe(5.0,3.4,(0,1.4),(0,4.0),'$t$ (s)','$E_{pp}$ (kJ)',np.arange(0,1.41,0.2),np.arange(0,4.01,0.5))
ax.plot(t,Ep,ls='none',marker='+',ms=7,mew=1.4,color=ANTH,clip_on=False,zorder=6)
ax.set_yticks(np.arange(0,4.01,0.1),minor=True); ax.grid(which='minor',color='#EFEBE7',lw=0.35); ax.tick_params(which='minor',length=0)
sauve(fig,'fig_epp_plongeur')

# 3. Q.5 : fusée de feu d'artifice (m = 0,40 kg ; v0 = 50 m/s) jusqu'au sommet
m,v0=0.40,50.0; ts=v0/g
t=np.linspace(0,ts,26); Ec=0.5*m*(v0-g*t)**2; Ep=m*g*(v0*t-0.5*g*t**2); Em=Ec+Ep
fig,ax=graphe(5.0,3.4,(0,6),(0,600),'$t$ (s)','$E$ (J)',range(0,7),range(0,601,100))
ax.plot(t,Em,marker='^',ms=3.5,lw=1.0,color=ANTH,clip_on=False,zorder=6); ax.plot(t,Ep,marker='s',ms=3.2,lw=1.0,color=ANTH,clip_on=False,zorder=6); ax.plot(t,Ec,marker='o',ms=3.0,lw=1.0,color=ANTH,clip_on=False,zorder=6)
for (x,y,n) in ((1.0,545,'1'),(4.3,395,'2'),(2.9,180,'3')):
    ax.text(x,y,n,ha='center',va='center',fontsize=10,zorder=6,bbox=dict(boxstyle='circle,pad=0.25',fc='white',ec=ANTH,lw=1.0))
sauve(fig,'fig_fusee')

# 4. Q.6 : ressort au repos et allongé
fig,ax=new(5.6,2.6,(-0.5,11),(-0.6,4.6))
def ressort(ax,y,x1):
    ax.plot([0,0],[y-0.6,y+0.6],color=ANTH,lw=2.2)
    for k in range(7): ax.plot([0.08*k,0.08*k-0.25],[y+0.6-0.2*k,y+0.4-0.2*k],color=GRIS,lw=0.8)
    xs=np.linspace(0,x1,200); ys=y+0.25*np.sin((xs/x1)*2*math.pi*7)*((xs>0.3)&(xs<x1-0.3))
    ax.plot(xs,ys,color=ANTH,lw=1.3)
    ax.add_patch(plt.Rectangle((x1,y-0.45),1.2,0.9,fc=CUIVREC,ec=ANTH,lw=1.2))
    ax.plot([x1+0.6],[y],marker='o',ms=3.5,color=ANTH); ax.text(x1+0.75,y+0.15,'$G$',fontsize=10)
    ax.plot([-0.3,10.6],[y-0.5,y-0.5],color=ANTH,lw=1.0)
ressort(ax,3.6,4.0); ressort(ax,1.0,6.0)
ax.text(10.7,3.6,'au repos',fontsize=9.5,ha='right',va='center',color=GRIS); ax.text(10.7,1.0,'allongé',fontsize=9.5,ha='right',va='center',color=GRIS)
ax.plot([4.6,4.6],[-0.3,3.1],color=GRIS,lw=0.8,ls=(0,(3,3))); ax.plot([6.6,6.6],[-0.3,0.5],color=GRIS,lw=0.8,ls=(0,(3,3)))
dim(ax,4.6,-0.25,6.6,-0.25,color=VERT); ax.text(5.6,-0.55,r'$\Delta L$',ha='center',va='center',fontsize=12,color=VERT)
arrow(ax,6.0,1.0,4.6,1.0,color=BRIQUE,lw=2.4,head=8,zorder=7); ax.text(5.1,1.55,r'$\vec{T}$',fontsize=13,color=BRIQUE,ha='center')
save(fig,'fig_ressort')

# 5. Q.7 et son corrigé : solide sur un plan incliné
def plan(avec_forces):
    al=math.radians(30); c,s=math.cos(al),math.sin(al)
    fig,ax=new(5.0,3.9,(-0.5,10.5),(-0.8,7.4))
    ax.add_patch(Polygon([(0,0),(9.5,0),(0,9.5*math.tan(al))],closed=True,fc='#F2EEEA',ec=ANTH,lw=1.3))
    ax.add_patch(Arc((9.5,0),3.0,3.0,theta1=150,theta2=180,color=ANTH,lw=1.0)); ax.text(7.55,0.35,r'$\alpha$',fontsize=12)
    px,py=3.6,(9.5-3.6)*math.tan(al)
    ux,uy=c,-s; nx,ny=s,c          # axe (Ax) vers le bas de la pente ; axe (Ay) normal
    w,h=1.4,0.9
    pts=[(px-w/2*ux,py-w/2*uy),(px+w/2*ux,py+w/2*uy),(px+w/2*ux+h*nx,py+w/2*uy+h*ny),(px-w/2*ux+h*nx,py-w/2*uy+h*ny)]
    ax.add_patch(Polygon(pts,closed=True,fc=CUIVREC,ec=ANTH,lw=1.2,zorder=4))
    gx,gy=px+h/2*nx,py+h/2*ny; ax.plot([gx],[gy],marker='o',ms=3.5,color=ANTH,zorder=6); ax.text(gx-0.5,gy+0.12,'$G$',fontsize=11,zorder=9)
    ox,oy=gx+0.0,gy
    arrow(ax,gx,gy,gx+2.6*ux,gy+2.6*uy,color=GRIS,lw=1.0,head=6); ax.text(gx+2.75*ux,gy+2.75*uy-0.35,'$x$',fontsize=11,color=GRIS)
    arrow(ax,gx,gy,gx+3.0*nx,gy+3.0*ny,color=GRIS,lw=1.0,head=6); ax.text(gx+3.1*nx+0.15,gy+3.1*ny,'$y$',fontsize=11,color=GRIS)
    if avec_forces:
        arrow(ax,gx,gy,gx,gy-2.6,color=BRIQUE,lw=2.4,head=8,zorder=8); ax.text(gx+0.2,gy-2.7,r'$\vec{P}$',fontsize=13,color=BRIQUE)
        arrow(ax,gx,gy,gx+2.6*c*nx,gy+2.6*c*ny,color=BLEU,lw=2.4,head=8,zorder=8); ax.text(gx+2.0*c*nx-0.75,gy+2.0*c*ny+0.1,r'$\vec{R}$',fontsize=13,color=BLEU)
        # projections du poids
        qx,qy=gx+2.6*s*ux,gy+2.6*s*uy
        ax.plot([gx,qx],[gy,qy],color=BRIQUE,lw=1.0,ls=(0,(3,2))); ax.plot([qx,gx],[qy,gy-2.6],color=BRIQUE,lw=0.8,ls=(0,(2,2)))
        ax.text(qx+0.15,qy+0.05,r'$P\,\sin\alpha$',fontsize=10,color=BRIQUE)
    return fig
save(plan(False),'fig_plan'); save(plan(True),'fig_plan_c')

# 6. Q.8 : propulsion de A à B
fig,ax=new(4.4,2.6,(-0.5,8.5),(-2.2,4.4))
ax.plot([0,7],[0,3.6],color=GRIS,lw=1.0,ls=(0,(4,3)))
for (x,y,n,dx) in ((0,0,'A',-0.45),(7,3.6,'B',0.35)): ax.plot([x],[y],marker='o',ms=7,color=ANTH); ax.text(x+dx,y,n,fontsize=12,va='center')
arrow(ax,0,0,3.3,3.3*3.6/7,color=BLEU,lw=2.4,head=8); ax.text(1.6,1.45,r'$\vec{F}$',fontsize=13,color=BLEU)
arrow(ax,0,0,0,-1.8,color=BRIQUE,lw=2.0,head=7); ax.text(0.2,-1.7,r'$\vec{P}$',fontsize=13,color=BRIQUE)
save(fig,'fig_propulsion')

# 7. Exercice 2 : le jeu du boulet
fig,ax=new(6.6,3.0,(-0.5,13.5),(-4.6,4.0))
al=math.radians(30); D=4.4; Bx=3.8; Ax=Bx-D*math.cos(al); Ay=D*math.sin(al)
ax.plot([Ax-0.6*math.cos(al),Bx],[Ay+0.6*math.sin(al),0],color=ANTH,lw=1.5); ax.plot([Bx,6.0],[0,0],color=ANTH,lw=1.5)
ax.plot([6.0,6.0],[0,-3.4],color=ANTH,lw=1.5); ax.plot([6.0,12.8],[-3.4,-3.4],color=ANTH,lw=1.5)
ax.plot([9.3,10.2],[-3.4,-3.4],color=BRIQUE,lw=4.0); ax.text(9.75,-3.95,'cible',ha='center',fontsize=10,color=BRIQUE)
for x in (9.3,10.2): ax.plot([x,x],[-3.4,0],color=GRIS,lw=0.7,ls=(0,(2,3)))
ax.text(9.3,0.25,'$X_1$',ha='center',fontsize=10); ax.text(10.2,0.25,'$X_2$',ha='center',fontsize=10)
ax.plot([Ax],[Ay],marker='o',ms=6,color=ANTH); ax.text(Ax-0.1,Ay+0.45,'A',fontsize=11)
ax.text(Bx-0.1,-0.5,'B',fontsize=11); ax.text(6.1,0.3,'C',fontsize=11)
ax.plot([Ax,Ax],[0,Ay],color=GRIS,lw=0.8,ls=(0,(3,3))); ax.plot([Ax,Bx],[0,0],color=GRIS,lw=0.8,ls=(0,(3,3)))
dim(ax,Ax-0.35,0,Ax-0.35,Ay); ax.text(Ax-0.95,Ay/2,'$h_A$',fontsize=11,color=GRIS)
ax.add_patch(Arc((Bx,0),2.0,2.0,theta1=150,theta2=180,color=ANTH,lw=1.0)); ax.text(Bx-1.45,0.15,r'$\alpha$',fontsize=11)
dim(ax,Ax+0.25*math.sin(al)+0.2,Ay+0.25*math.cos(al)+0.3,Bx+0.25*math.sin(al)+0.2,0.25*math.cos(al)+0.3,color=VERT); ax.text((Ax+Bx)/2+0.6,Ay/2+0.75,'$D$',fontsize=12,color=VERT)
dim(ax,5.6,0,5.6,-3.4); ax.text(5.0,-1.7,'$h_C$',fontsize=11,color=GRIS)
arrow(ax,6.0,0,13.2,0,color=GRIS,lw=1.0,head=6); ax.text(13.2,0.2,'$x$',fontsize=11,color=GRIS)
arrow(ax,6.0,0,6.0,3.6,color=GRIS,lw=1.0,head=6); ax.text(6.2,3.4,'$z$',fontsize=11,color=GRIS)
save(fig,'fig_boulet')

# 8 et 9. Déflecteur d'une imprimante à jet d'encre (énoncé, puis corrigé avec champ, force et accélération)
def deflecteur(corrige):
    fig,ax=new(7.0,3.0,(-1.0,16.5),(-3.6,4.4))
    L,Dd,yp=6.0,8.0,1.5
    ax.add_patch(plt.Rectangle((0,-yp),L,2*yp,fc='#EEEAE6',ec='none',zorder=1))
    ax.plot([0,L],[yp,yp],color=ANTH,lw=2.6,zorder=3); ax.plot([0,L],[-yp,-yp],color=ANTH,lw=2.6,zorder=3)
    ax.text(L+0.15,yp+0.25,'$P_1$',fontsize=10); ax.text(L+0.15,-yp-0.35,'$P_2$',fontsize=10)
    if corrige:
        for x in np.linspace(0.3,L-0.3,9):
            ax.text(x,yp+0.3,'+',ha='center',va='center',fontsize=11,color=BRIQUE); ax.text(x,-yp-0.32,'−',ha='center',va='center',fontsize=11,color=BLEU)
    k=0.9/L**2; xs=np.linspace(0,L,60); ax.plot(xs,k*xs**2,color=ANTH,lw=1.4,zorder=4)
    ts=2*k*L; xe=L+Dd; ax.plot([L,xe],[k*L**2,k*L**2+ts*Dd],color=ANTH,lw=1.4,zorder=4)
    ax.plot([xe,xe],[-3.0,4.2],color=ANTH,lw=1.6); ax.text(xe+0.15,-2.9,'écran',fontsize=9.5,color=GRIS)
    arrow(ax,-0.6,0,16.2,0,color=GRIS,lw=0.9,head=6,ls=(0,(4,3))); ax.text(16.2,-0.45,'$x$',fontsize=11,color=GRIS)
    arrow(ax,0,-3.2,0,4.2,color=GRIS,lw=0.9,head=6); ax.text(0.2,4.0,'$z$',fontsize=11,color=GRIS)
    ax.text(-0.45,-0.45,'O',fontsize=11)
    arrow(ax,0,0,1.6,0,color=ANTH,lw=1.8,head=7,zorder=6); ax.text(0.8,-0.5,r'$\vec{v}_0$',fontsize=11)
    ax.plot([L],[k*L**2],marker='o',ms=4,color=ANTH,zorder=6); ax.text(L-0.55,k*L**2-0.55,'S',fontsize=11)
    ax.text(L+0.1,-0.45,'H',fontsize=10); ax.text(xe+0.15,-0.45,"H′",fontsize=10,family='STIXGeneral'); ax.text(xe+0.15,k*L**2+ts*Dd,'I',fontsize=11)
    dim(ax,0,2.6,L,2.6); ax.text(L/2,2.95,'$L$',ha='center',fontsize=11,color=GRIS)
    dim(ax,L,-2.4,xe,-2.4); ax.text((L+xe)/2,-2.85,'$D$',ha='center',fontsize=11,color=GRIS)
    arrow(ax,L,k*L**2,L+2.2,k*L**2+2.2*ts,color=ANTH,lw=1.6,head=6); ax.text(L+2.0,k*L**2+2.2*ts+0.25,r'$\vec{v}_S$',fontsize=11)
    if corrige:
        arrow(ax,2.0,0.9,2.0,-0.9,color=BLEU,lw=2.2,head=7,zorder=7); ax.text(2.25,-0.75,r'$\vec{E}$',fontsize=12,color=BLEU)
        zg=k*3.6**2   # la goutte G est sur la trajectoire : la force y a son origine
        arrow(ax,3.6,zg,3.6,zg+1.0,color=BRIQUE,lw=2.2,head=7,zorder=7); ax.text(3.85,zg+0.45,r'$\vec{F}_e$',fontsize=12,color=BRIQUE)
        ax.plot([3.6],[zg],marker='o',ms=5,color=ANTH,zorder=8); ax.text(3.15,zg-0.5,'G',fontsize=10.5,zorder=9)
    return fig
save(deflecteur(False),'fig_deflecteur'); save(deflecteur(True),'fig_deflecteur_c')

# 10 et 11. Exercice 3 : traversée de l'espace entre les deux électrodes d'un cyclotron (énoncé, puis corrigé avec force et champ)
def cyclotron(corrige):
    fig,ax=new(3.9,2.1,(-1.5,10.5),(-2.6,3.6))
    for x0 in (0,6):
        ax.add_patch(plt.Rectangle((x0-2.5 if x0==0 else x0,-2.2),2.5,4.4,fc='#EEEAE6',ec=ANTH,lw=1.4))
    ax.text(-1.25,1.2,'électrode 1',ha='center',va='center',fontsize=9,rotation=90,color=GRIS); ax.text(7.25,1.2,'électrode 2',ha='center',va='center',fontsize=9,rotation=90,color=GRIS)
    arrow(ax,0,0,10.2,0,color=GRIS,lw=0.9,head=6,ls=(0,(4,3))); ax.text(10.1,-0.45,'$x$',fontsize=11,color=GRIS)
    ax.plot([0],[0],marker='o',ms=5,color=ANTH,zorder=6); ax.text(-0.45,0.25,'O',fontsize=11)
    dim(ax,0,2.55,6,2.55); ax.text(3,2.85,'$d$',ha='center',fontsize=11,color=GRIS)
    ax.text(3,-1.7,"zone d'accélération",ha='center',fontsize=9,color=GRIS)
    if corrige:
        ax.text(-1.25,-1.2,'+',ha='center',va='center',fontsize=15,color=BRIQUE); ax.text(7.25,-1.2,'−',ha='center',va='center',fontsize=15,color=BLEU)
        arrow(ax,0,0,2.8,0,color=BRIQUE,lw=2.2,head=7,zorder=7); ax.text(1.1,-0.75,r'$\vec{F}_e$',fontsize=12,color=BRIQUE)
        arrow(ax,0.6,1.0,3.4,1.0,color=BLEU,lw=2.2,head=7,zorder=7); ax.text(1.8,1.3,r'$\vec{E}$',fontsize=12,color=BLEU)
    return fig
save(cyclotron(False),'fig_cyclotron'); save(cyclotron(True),'fig_cyclotron_c')
