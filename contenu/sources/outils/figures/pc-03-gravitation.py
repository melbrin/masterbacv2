# Figures de la fiche PC 2 (Gravitation : satellites et lois de Kepler), dessinées dans la palette MasterBac
# usage : pc-03-gravitation.py <dossier de sortie, en général fiches/pc-03-gravitation/figs>
import sys, math
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
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

# ---------------------------------------------------------------- 1. Force gravitationnelle, cas général (Q.1)
fig,ax=new(3.6,3.5,(0,10),(0,9.7))
cx,cy,R=5.0,4.7,3.6
ax.add_patch(Circle((cx,cy),R,fc='none',ec=ANTH,lw=1.5,zorder=2))
ax.add_patch(Circle((cx,cy),0.42,fc=CUIVRE,ec=ANTH,lw=1.0,zorder=6))
ax.text(cx,cy-0.95,'attracteur',fontsize=10.5,ha='center',va='center',color=CUIVRE)
ax.text(cx-0.75,cy+0.1,r'$M_A$',fontsize=12,ha='center',va='center',color=CUIVRE)
th=math.radians(58)
sx,sy=cx+R*math.cos(th),cy+R*math.sin(th)
ux,uy=-math.cos(th),-math.sin(th)          # vers l'attracteur
tx,ty=-math.sin(th),math.cos(th)           # tangent, sens du mouvement
ax.plot([cx,sx],[cy,sy],color=GRIS,lw=0.9,ls=(0,(3,3)),zorder=1)
# distance de centre à centre : cote décalée à droite de la droite attracteur-système, avec traits de rappel
dd=0.85; nx_,ny_=math.sin(th),-math.cos(th)
for (qx_,qy_) in ((cx,cy),(sx,sy)):
    ax.plot([qx_,qx_+(dd+0.12)*nx_],[qy_,qy_+(dd+0.12)*ny_],color=GRIS,lw=0.7,ls=(0,(2,2)),zorder=1)
dim(ax,cx+dd*nx_,cy+dd*ny_,sx+dd*nx_,sy+dd*ny_)
ax.text((cx+sx)/2+(dd+0.38)*nx_,(cy+sy)/2+(dd+0.38)*ny_,r'$d$',fontsize=12,ha='center',va='center',color=GRIS)
arrow(ax,sx,sy,sx+2.2*ux,sy+2.2*uy,color=BRIQUE,lw=2.6,head=8,zorder=7)
ax.text(sx+1.5*ux-0.95,sy+1.5*uy+0.1,r'$\vec{F}_{A/S}$',fontsize=13,ha='center',va='center',color=BRIQUE)
ox_,oy_=0.24*tx*-1,0.24*ty*-1              # léger décalage de u_n pour qu'il reste visible à côté de la force
arrow(ax,sx+ox_,sy+oy_,sx+ox_+1.15*ux,sy+oy_+1.15*uy,color=BLEU,lw=1.8,head=6.5,zorder=8)
ax.text(sx+0.75*ux+0.7,sy+0.75*uy-0.25,r'$\vec{u}_n$',fontsize=13,ha='center',va='center',color=BLEU)
arrow(ax,sx,sy,sx+1.3*tx,sy+1.3*ty,color=BLEU,lw=1.8,head=6.5,zorder=8)
ax.text(sx+1.45*tx-0.1,sy+1.45*ty+0.38,r'$\vec{u}_t$',fontsize=13,ha='center',va='center',color=BLEU)
ax.add_patch(Circle((sx,sy),0.22,fc=ANTH,ec=ANTH,zorder=9))
ax.text(sx+0.95,sy+0.35,'système',fontsize=10.5,ha='left',va='center',color=ANTH)
ax.text(sx+0.95,sy-0.2,r'$M_S$',fontsize=12,ha='left',va='center',color=ANTH)
save(fig,'fig_force')

# ---------------------------------------------------------------- 2, 3 et 4. Satellite de la Terre (Q.1, exercice 1)
def orbite(variante):
    fig,ax=new(3.6,3.5,(0,10),(0,9.7))
    cx,cy,R,RT=5.0,4.7,3.6,1.75
    ax.add_patch(Circle((cx,cy),R,fc='none',ec=ANTH,lw=1.5,zorder=2))
    ax.add_patch(Circle((cx,cy),RT,fc=EAU,ec=ANTH,lw=1.2,zorder=3))
    ax.text(cx-0.75,cy-0.75,'Terre',fontsize=10.5,ha='center',va='center',color=BLEU,zorder=4)
    ax.plot([cx],[cy],marker='o',ms=3.2,color=ANTH,zorder=6)
    centre=r'$O$' if variante.startswith('hubble') else ''
    if centre: ax.text(cx-0.28,cy+0.3,centre,fontsize=12,ha='center',va='center',zorder=6)
    th=math.radians(40)
    sx,sy=cx+R*math.cos(th),cy+R*math.sin(th)
    ux,uy=-math.cos(th),-math.sin(th); tx,ty=-math.sin(th),math.cos(th)
    # cotes R_T et h, décalées de la droite Terre-satellite
    d=0.5; nx,ny=-tx,-ty                    # décalage vers le bas à droite
    px,py=cx+RT*math.cos(th),cy+RT*math.sin(th)
    for (ax0,ay0) in ((cx,cy),(px,py),(sx,sy)):
        ax.plot([ax0,ax0+(d+0.12)*nx],[ay0,ay0+(d+0.12)*ny],color=GRIS,lw=0.7,ls=(0,(2,2)),zorder=4)
    dim(ax,cx+d*nx,cy+d*ny,px+d*nx,py+d*ny,color=CUIVRE)
    dim(ax,px+d*nx,py+d*ny,sx+d*nx,sy+d*ny,color=VERT)
    ax.text((cx+px)/2+(d+0.42)*nx,(cy+py)/2+(d+0.42)*ny,r'$R_T$',fontsize=12,ha='center',va='center',color=CUIVRE,zorder=6)
    ax.text((px+sx)/2+(d+0.4)*nx,(py+sy)/2+(d+0.4)*ny,r'$h$',fontsize=13,ha='center',va='center',color=VERT,zorder=6)
    if variante!='satellite':
        # sens du mouvement indiqué sur l'orbite (figures 1 et 7)
        a=math.radians(118)
        qx,qy=cx+R*math.cos(a),cy+R*math.sin(a)
        arrow(ax,qx+0.02*math.sin(a),qy-0.02*math.cos(a),qx-0.45*math.sin(a),qy+0.45*math.cos(a),color=ANTH,lw=1.2,head=6)
    if variante!='hubble':
        arrow(ax,sx,sy,sx+1.9*ux,sy+1.9*uy,color=BRIQUE,lw=2.6,head=8,zorder=7)
        lab=r'$\vec{F}$' if variante=='hubble_c' else r'$\vec{F}_{A/S}$'
        ax.text(sx+1.25*ux-0.75,sy+1.25*uy+0.45,lab,fontsize=13,ha='center',va='center',color=BRIQUE,zorder=8)
        o=0.24
        arrow(ax,sx+o*tx,sy+o*ty,sx+o*tx+1.1*ux,sy+o*ty+1.1*uy,color=BLEU,lw=1.8,head=6.5,zorder=8)
        ax.text(sx+0.3*ux+1.0*tx,sy+0.3*uy+1.0*ty-0.55,r'$\vec{u}_n$',fontsize=13,ha='center',va='center',color=BLEU,zorder=8)
        arrow(ax,sx,sy,sx+1.3*tx,sy+1.3*ty,color=BLEU,lw=1.8,head=6.5,zorder=8)
        ax.text(sx+1.45*tx-0.25,sy+1.45*ty+0.35,r'$\vec{u}_t$',fontsize=13,ha='center',va='center',color=BLEU,zorder=8)
    ax.add_patch(Circle((sx,sy),0.2,fc=ANTH,ec=ANTH,zorder=9))
    nom={'satellite':'satellite','hubble':r'$H$','hubble_c':r'$H$'}[variante]
    ax.text(sx+0.45,sy+0.4,nom,fontsize=12 if nom.startswith('$') else 10.5,ha='left',va='center',color=ANTH,zorder=9)
    return fig
save(orbite('satellite'),'fig_satellite')
save(orbite('hubble'),'fig_hubble')
save(orbite('hubble_c'),'fig_hubble_c')

# ---------------------------------------------------------------- 5. Les deux premières lois de Kepler (Q.5)
a_,b_=5.2,3.1
e_=math.sqrt(1-(b_/a_)**2); c_=a_*e_
def pt(E): return a_*math.cos(E), b_*math.sin(E)
def aire(E1,E2): return 0.5*a_*b_*((E2-e_*math.sin(E2))-(E1-e_*math.sin(E1)))   # aire balayée depuis le foyer (c, 0)
E1,E2=0.30,1.02
A1=aire(E1,E2)
E3=2.38; lo,hi=E3,math.pi+0.4
for _ in range(60):                       # E4 tel que l'aire balayée soit la même
    mid=(lo+hi)/2
    if aire(E3,mid)<A1: lo=mid
    else: hi=mid
E4=(lo+hi)/2
fig,ax=new(5.6,3.6,(-6.6,6.9),(-4.5,4.2))
T_=np.linspace(0,2*math.pi,400)
ax.plot(a_*np.cos(T_),b_*np.sin(T_),color=ANTH,lw=1.5,zorder=3)
for (Ea,Eb,fc,lab,lx,ly,arc,ax_,ay_) in ((E1,E2,SABLE,r'$A_1$',0.0,0.0,r'$L_1$',0.55,0.4),(E3,E4,EAU,r'$A_2$',0.0,0.0,r'$L_2$',-0.35,0.5)):
    EE=np.linspace(Ea,Eb,60)
    poly=[(c_,0)]+[pt(E) for E in EE]
    ax.add_patch(Polygon(poly,closed=True,fc=fc,ec=GRIS,lw=0.8,zorder=2))
    ax.plot(a_*np.cos(EE),b_*np.sin(EE),color=BRIQUE,lw=3.0,zorder=4,solid_capstyle='butt')
    gx=(c_+sum(p[0] for p in poly[1:])/len(EE)*2)/3; gy=(sum(p[1] for p in poly[1:])/len(EE)*2)/3
    if lab==r'$A_2$':                      # secteur trop étroit pour contenir son nom : étiquette dessous, trait de rappel
        ax.plot([gx-0.55,gx-0.75],[gy+0.02,gy-0.62],color=GRIS,lw=0.7,zorder=5)
        ax.text(gx-0.82,gy-0.95,lab,fontsize=12,ha='center',va='center',color=ANTH,zorder=5)
    else:
        ax.text(gx,gy,lab,fontsize=12,ha='center',va='center',color=ANTH,zorder=5)
    mx,my=pt((Ea+Eb)/2)
    ax.text(mx+ax_,my+ay_,arc,fontsize=12,ha='center',va='center',color=BRIQUE,zorder=5)
print('   aires balayées : A1 = %.4f ; A2 = %.4f ; arcs : L1 = %.3f ; L2 = %.3f' % (
      A1, aire(E3,E4),
      sum(math.dist(pt(E1+(E2-E1)*i/200),pt(E1+(E2-E1)*(i+1)/200)) for i in range(200)),
      sum(math.dist(pt(E3+(E4-E3)*i/200),pt(E3+(E4-E3)*(i+1)/200)) for i in range(200))))
ax.add_patch(Circle((c_,0),0.3,fc=CUIVRE,ec=ANTH,lw=1.0,zorder=6))
ax.text(c_-0.1,-0.72,'Soleil',fontsize=10.5,ha='center',va='center',color=CUIVRE)
px_,py_=pt(E2)
ax.add_patch(Circle((px_,py_),0.17,fc=ANTH,ec=ANTH,zorder=7))
ax.text(px_+0.3,py_+0.42,'planète',fontsize=10.5,ha='left',va='center',color=ANTH)
ax.plot([-a_,a_],[0,0],color=GRIS,lw=0.8,ls=(0,(3,3)),zorder=1)
dim(ax,-a_,-3.75,a_,-3.75); ax.text(0,-4.15,r'grand axe : $2a$',fontsize=10.5,ha='center',va='center',color=GRIS)
for x in (-a_,a_): ax.plot([x,x],[-3.9,0],color=GRIS,lw=0.7,ls=(0,(2,3)),zorder=1)
ax.plot([a_],[0],marker='o',ms=4,color=ANTH,zorder=6); ax.plot([-a_],[0],marker='o',ms=4,color=ANTH,zorder=6)
ax.text(a_+0.25,0.0,'périhélie',fontsize=10.5,ha='left',va='center',color=ANTH)
ax.text(-a_-0.25,0.0,'aphélie',fontsize=10.5,ha='right',va='center',color=ANTH)
save(fig,'fig_kepler')

# ---------------------------------------------------------------- 6. Trois trajectoires pour un satellite (Q.10)
def panneau(ax,x0,nom,centre_y=0.0,incl=0.0,grand=2.25,petit=0.5):
    R=1.0
    # orbite : demi-ellipse arrière (derrière la Terre), puis Terre, puis demi-ellipse avant
    def ell(t):
        x,y=grand*np.cos(t),petit*np.sin(t)
        ca,sa=math.cos(incl),math.sin(incl)
        return x0+ca*x-sa*y, centre_y+sa*x+ca*y
    tb=np.linspace(0,math.pi,120); tf=np.linspace(math.pi,2*math.pi,120)
    xb,yb=ell(tb); ax.plot(xb,yb,color=BRIQUE,lw=1.5,zorder=2)
    ax.add_patch(Circle((x0,0),R,fc=EAU,ec=ANTH,lw=1.2,zorder=3))
    # équateur
    te=np.linspace(math.pi,2*math.pi,80); ax.plot(x0+R*np.cos(te),0.2*np.sin(te),color=BLEU,lw=1.0,zorder=4)
    te=np.linspace(0,math.pi,80); ax.plot(x0+R*np.cos(te),0.2*np.sin(te),color=BLEU,lw=0.8,ls=(0,(2,2)),zorder=4)
    # axe de rotation
    ax.plot([x0,x0],[-1.55,1.75],color=ANTH,lw=1.0,zorder=5)
    ax.plot([x0],[0],marker='o',ms=3,color=ANTH,zorder=6)
    xf,yf=ell(tf); ax.plot(xf,yf,color=BRIQUE,lw=1.5,zorder=6)
    xs,ys=ell(np.array([math.radians(305)])); ax.add_patch(Circle((xs[0],ys[0]),0.085,fc=ANTH,ec=ANTH,zorder=7))
    ax.text(xs[0]+0.16,ys[0]-0.24,'satellite',fontsize=9,ha='left',va='center',color=ANTH)
    ax.text(x0,-2.25,nom,fontsize=11,ha='center',va='center',color=ANTH,fontweight='bold')
fig,ax=new(7.4,2.75,(-3.0,15.5),(-2.6,2.25))
panneau(ax,0.0,'Trajectoire A')
panneau(ax,6.2,'Trajectoire B',centre_y=0.95,grand=1.85,petit=0.42)
panneau(ax,12.4,'Trajectoire C',incl=math.radians(52),grand=2.1,petit=0.55)
ax.text(0.12,1.95,'axe de rotation\nde la Terre',fontsize=8.5,ha='left',va='center',color=ANTH,linespacing=1.05)
ax.text(6.2-1.1,-0.02,'équateur',fontsize=8.5,ha='right',va='center',color=BLEU)
save(fig,'fig_geo')

# ---------------------------------------------------------------- 7. Transit de Vénus et théorème de Thalès (Q.13)
fig,ax=new(5.6,3.3,(-0.6,11.6),(-0.4,6.6))
S=(1.0,3.0); A=(1.6,2.3); B=(1.6,3.7); Q=(10.0,3.0)
rv,rt=5.2,9.0
def coupe(P):                              # intersection de la droite (Q P) avec l'orbite de Vénus
    dx,dy=P[0]-Q[0],P[1]-Q[1]
    fx,fy=Q[0]-S[0],Q[1]-S[1]
    aa=dx*dx+dy*dy; bb=2*(fx*dx+fy*dy); cc=fx*fx+fy*fy-rv*rv
    t=(-bb-math.sqrt(bb*bb-4*aa*cc))/(2*aa)
    return Q[0]+t*dx,Q[1]+t*dy
A2,B2=coupe(A),coupe(B)
ax.add_patch(Circle(S,math.dist(S,A),fc=SABLE,ec=CUIVRE,lw=1.2,zorder=2))
ax.text(S[0]-0.1,S[1]+1.35,'Soleil',fontsize=10.5,ha='center',va='center',color=CUIVRE)
for r,lab,ang in ((rv,'orbite de Vénus',27),(rt,'orbite de la Terre',17)):
    ax.add_patch(Arc(S,2*r,2*r,theta1=-20,theta2=ang,color=GRIS,lw=1.1,zorder=1))
    a=math.radians(ang)
    ex,ey=S[0]+r*math.cos(a),S[1]+r*math.sin(a)
    arrow(ax,ex+0.05*math.sin(a),ey-0.05*math.cos(a),ex-0.3*math.sin(a),ey+0.3*math.cos(a),color=GRIS,lw=1.0,head=5)
    ax.text(ex-0.25,ey+0.5,lab,fontsize=9.5,ha='center',va='center',color=GRIS)
ax.plot([Q[0],A[0]],[Q[1],A[1]],color=ANTH,lw=1.2,zorder=3)
ax.plot([Q[0],B[0]],[Q[1],B[1]],color=ANTH,lw=1.2,zorder=3)
ax.plot([A[0],B[0]],[A[1],B[1]],color=BRIQUE,lw=1.6,zorder=4)
ax.plot([A2[0],B2[0]],[A2[1],B2[1]],color=BRIQUE,lw=1.6,zorder=4)
for (P,lab,dx,dy) in ((A,'A',-0.02,-0.38),(B,'B',-0.02,0.38),(A2,'A\u2032',0.05,-0.4),(B2,'B\u2032',0.05,0.4),(Q,r'$\mathrm{Q}_1$',0.45,0.0)):
    ax.plot([P[0]],[P[1]],marker='o',ms=4.2,color=ANTH,zorder=6)
    if lab.startswith('$'): ax.text(P[0]+dx,P[1]+dy,lab,fontsize=12,ha='center',va='center',color=ANTH,zorder=7)
    else: ax.text(P[0]+dx,P[1]+dy,lab,fontsize=12,ha='center',va='center',color=ANTH,zorder=7,family='STIXGeneral')
print("   Thalès : Q1A'/Q1A = %.4f ; Q1B'/Q1B = %.4f ; A'B'/AB = %.4f" % (
      math.dist(Q,A2)/math.dist(Q,A), math.dist(Q,B2)/math.dist(Q,B), math.dist(A2,B2)/math.dist(A,B)))
save(fig,'fig_thales')

# ---------------------------------------------------------------- 8. Carré de la période en fonction du cube du rayon (exercice 3)
G_,MT_=6.67e-11,5.972e24
k=4*math.pi**2/(G_*MT_)                    # s2/m3
fig,ax=plt.subplots(figsize=(5.0,4.1))
fig.subplots_adjust(0.115,0.125,0.97,0.97)
ax.set_xlim(0,10.2); ax.set_ylim(0,10.2)
ax.set_xticks(range(0,11)); ax.set_yticks(range(0,11))
ax.set_xticks(np.arange(0,10.01,0.2),minor=True); ax.set_yticks(np.arange(0,10.01,0.2),minor=True)
ax.grid(which='minor',color='#EFEBE7',lw=0.35); ax.grid(which='major',color=GRISC,lw=0.6)
ax.tick_params(which='minor',length=0)
for s in ('top','right'): ax.spines[s].set_visible(False)
for s in ('left','bottom'): ax.spines[s].set_linewidth(1.0); ax.spines[s].set_color(ANTH)
ax.tick_params(labelsize=8.5,colors=ANTH,width=0.8)
ax.set_xlabel(r'$R^3$ ($10^{22}$ m$^3$)',fontsize=10); ax.set_ylabel(r'$T^2$ ($10^{9}$ s$^2$)',fontsize=10)
kk=k*1e22/1e9                              # pente dans les unités du graphique
ax.plot([0,10.1],[0,kk*10.1],color=BLEU,lw=1.3,zorder=3)
Rs=np.array([1.50e7,2.66e7,3.00e7,3.60e7,4.50e7])
ax.plot(Rs**3/1e22,k*Rs**3/1e9,ls='none',marker='+',ms=9,mew=1.8,color=CUIVRE,zorder=5)
ax.plot([8.0],[kk*8.0],marker='o',ms=5,color=BRIQUE,zorder=6)
ax.plot([8.0,8.0],[0,kk*8.0],color=BRIQUE,lw=0.8,ls=(0,(3,3)),zorder=2)
ax.plot([0,8.0],[kk*8.0,kk*8.0],color=BRIQUE,lw=0.8,ls=(0,(3,3)),zorder=2)
ax.text(7.75,kk*8.0+0.45,r'$\mathrm{P}$',fontsize=11,ha='center',va='center',color=BRIQUE)
ax.text(0.6,9.3,'+  satellites de la Terre',fontsize=9,color=CUIVRE,ha='left')
p=f'{out}/fig_t2r3.png'
fig.savefig(p,facecolor='white'); plt.close(fig)
print('fig_t2r3',rogne(p),'pente : %.4f (unités du graphique), ordonnée de P : %.3f' % (kk,kk*8.0))
