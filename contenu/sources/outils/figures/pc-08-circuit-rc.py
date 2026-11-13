# Figures de la fiche PC 8 (Circuit RC : condensateur, charge et décharge), palette MasterBac
# usage : pc-08-circuit-rc.py <dossier de sortie, en général fiches/pc-08-circuit-rc/figs>
import sys, math
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Circle, Rectangle, Arc
from matplotlib.ticker import FuncFormatter
from PIL import Image, ImageChops

out = sys.argv[1]
ANTH='#2B2C2D'; CUIVRE='#A47351'; GRIS='#8A8F98'; GRISC='#DAD5D0'; GRISM='#EFEBE7'
VERT='#2E6B4F'; BRIQUE='#B23A2E'; BLEU='#2F5D8A'; EAU='#DCE9F2'; SABLE='#F4E3C3'
plt.rcParams.update({'font.family':'Carlito','font.size':11,'mathtext.fontset':'stix',
                     'axes.linewidth':0,'savefig.dpi':300})

def new(w,h,xlim,ylim):
    fig,ax=plt.subplots(figsize=(w,h))
    ax.set_xlim(*xlim); ax.set_ylim(*ylim); ax.set_aspect('equal'); ax.axis('off')
    fig.subplots_adjust(0,0,1,1)
    return fig,ax
def arrow(ax,x0,y0,x1,y1,color=ANTH,lw=1.4,head=6,zorder=5):
    ax.annotate('',xy=(x1,y1),xytext=(x0,y0),zorder=zorder,
                arrowprops=dict(arrowstyle='-|>',color=color,lw=lw,mutation_scale=head*1.6,shrinkA=0,shrinkB=0))
def dim(ax,x0,y0,x1,y1,color=GRIS,lw=0.9):
    ax.annotate('',xy=(x1,y1),xytext=(x0,y0),
                arrowprops=dict(arrowstyle='<|-|>',color=color,lw=lw,mutation_scale=8,shrinkA=0,shrinkB=0))
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
def axes_style(ax,xlab,ylab,size=10):
    ax.grid(color=GRISC,lw=0.6)
    ax.grid(which='minor',color=GRISM,lw=0.35); ax.tick_params(which='minor',length=0)
    for s in ('top','right'): ax.spines[s].set_visible(False)
    for s in ('left','bottom'): ax.spines[s].set_linewidth(1.0); ax.spines[s].set_color(ANTH)
    ax.tick_params(labelsize=size-1,colors=ANTH,width=0.8)
    ax.set_xlabel(xlab,fontsize=size); ax.set_ylabel(ylab,fontsize=size)
    virgule=FuncFormatter(lambda v,p: ('%g' % v).replace('.',',').replace('-','−'))
    ax.xaxis.set_major_formatter(virgule); ax.yaxis.set_major_formatter(virgule)
def etiquette(ax,x,y,txt,size=11,fc='white',color=ANTH,ha='center'):
    ax.text(x,y,txt,fontsize=size,ha=ha,va='center',zorder=9,color=color,bbox=dict(fc=fc,ec='none',pad=0.4))
def fil(ax,pts,lw=1.3,color=ANTH):
    xs,ys=zip(*pts); ax.plot(xs,ys,color=color,lw=lw,solid_capstyle='round',zorder=3)
def noeud(ax,x,y): ax.add_patch(Circle((x,y),0.07,fc=ANTH,ec=ANTH,zorder=6))
def borne(ax,x,y): ax.add_patch(Circle((x,y),0.09,fc='white',ec=ANTH,lw=1.1,zorder=7))
def resistance(ax,xc,y,lab,larg=1.5,haut=0.5,vertical=False):
    if vertical: ax.add_patch(Rectangle((xc-haut/2,y-larg/2),haut,larg,fc='white',ec=ANTH,lw=1.3,zorder=4))
    else: ax.add_patch(Rectangle((xc-larg/2,y-haut/2),larg,haut,fc='white',ec=ANTH,lw=1.3,zorder=4))
def generateur(ax,x,y,r=0.5):
    ax.add_patch(Circle((x,y),r,fc='white',ec=ANTH,lw=1.3,zorder=4))
    ax.plot([x,x],[y-r,y+r],color=ANTH,lw=1.3,zorder=5)
def condensateur_h(ax,x,y,demi=0.75,ecart=0.6,lw=2.4):
    # armatures horizontales, branche verticale ; renvoie les ordonnées des deux armatures
    ax.plot([x-demi,x+demi],[y+ecart/2]*2,color=ANTH,lw=lw,solid_capstyle='butt',zorder=5)
    ax.plot([x-demi,x+demi],[y-ecart/2]*2,color=ANTH,lw=lw,solid_capstyle='butt',zorder=5)
    return y+ecart/2, y-ecart/2

# ---------------------------------------------------------------- 1 et 2. Q.2 : circuit RC à interrupteur à deux positions
def circuit_fig(corrige):
    fig,ax=new(4.0,2.55,(-1.6,11.0),(-0.7,5.6))
    xg,xk2,xp,xc=0.0,2.0,3.2,8.6
    yb,yh=0.0,4.4
    # générateur
    generateur(ax,xg,2.1)
    fil(ax,[(xg,yb),(xg,1.6)]); fil(ax,[(xg,2.6),(xg,yh+0.6),(1.85,yh+0.6)])
    arrow(ax,xg-0.95,1.3,xg-0.95,2.9,color=BRIQUE)
    ax.text(xg-1.25,2.1,'$E$',fontsize=13,ha='right',va='center',color=BRIQUE)
    ax.text(xg+0.42,2.85,'+',fontsize=11,ha='left',va='center',color=ANTH)
    # interrupteur K : bornes 1 (vers le générateur) et 2 (vers le fil du bas), pivot P
    b1=(1.95,yh+0.6); b2=(1.95,yh-0.6); piv=(xp,yh)
    fil(ax,[(b2[0],b2[1]),(b2[0],yb)]); noeud(ax,b2[0],yb)
    for b in (b1,b2,piv): borne(ax,*b)
    if corrige: fil(ax,[piv,(b1[0]+0.06,b1[1]-0.03)],lw=1.5)
    else:
        a=math.radians(172); L=1.12
        fil(ax,[piv,(piv[0]+L*math.cos(a),piv[1]+L*math.sin(a))],lw=1.5)
    ax.text(b1[0]-0.25,b1[1]+0.38,'1',fontsize=11,ha='center',va='center')
    ax.text(b2[0]-0.38,b2[1],'2',fontsize=11,ha='center',va='center')
    ax.text(piv[0]-0.35,yh+0.58,'K',fontsize=12,ha='center',va='center')
    # conducteur ohmique
    fil(ax,[piv,(4.7,yh)]); resistance(ax,5.45,yh,'R'); fil(ax,[(6.2,yh),(xc,yh),(xc,2.80)])
    ax.text(5.45,yh-0.62,'$R$',fontsize=13,ha='center',va='center')
    arrow(ax,3.55,yh,4.25,yh,color=ANTH,head=5.5); ax.text(3.9,yh+0.35,'$i$',fontsize=13,ha='center',va='center')
    arrow(ax,6.2,yh+0.62,4.7,yh+0.62,color=BLEU)
    ax.text(5.45,yh+1.0,'$u_R$',fontsize=13,ha='center',va='center',color=BLEU)
    # condensateur, armatures A (haut) et B (bas)
    ya,yb_=condensateur_h(ax,xc,2.5)
    fil(ax,[(xc,yb_),(xc,yb),(xg,yb)])
    ax.text(xc-1.05,ya+0.12,'A',fontsize=12,ha='center',va='center',fontfamily='STIXGeneral')
    ax.text(xc-1.05,yb_-0.12,'B',fontsize=12,ha='center',va='center',fontfamily='STIXGeneral')
    arrow(ax,xc+1.5,1.55,xc+1.5,3.45,color=BLEU)
    ax.text(xc+1.75,2.5,'$u_C$',fontsize=13,ha='left',va='center',color=BLEU)
    ax.text(xc+1.0,2.5,'$C$',fontsize=13,ha='center',va='center')
    if corrige:
        for dx in (-0.58,-0.26,0.26,0.58):      # de part et d'autre du fil, sans le recouvrir
            ax.text(xc+dx,ya+0.32,'+',fontsize=11,ha='center',va='center',color=BRIQUE,fontweight='bold')
            ax.text(xc+dx,yb_-0.36,'−',fontsize=11,ha='center',va='center',color=BLEU,fontweight='bold')
    save(fig,'fig_circuit_c' if corrige else 'fig_circuit')
circuit_fig(False); circuit_fig(True)

# ---------------------------------------------------------------- outils pour les courbes
def courbe(figsize,marges):
    fig,ax=plt.subplots(figsize=figsize); fig.subplots_adjust(*marges)
    return fig,ax
def tirets(ax,xs,ys,color=BRIQUE,lw=1.0):
    ax.plot(xs,ys,color=color,lw=lw,ls=(0,(4,2.5)),zorder=4)

# ---------------------------------------------------------------- 3 et 4. Q.9 : charge, E = 5,0 V, tau = 20 ms
E,tau=5.0,20.0
def charge_fig(corrige):
    fig,ax=courbe((4.6,2.55),(0.12,0.19,0.98,0.97))
    t=np.linspace(0,120,1201); ax.plot(t,E*(1-np.exp(-t/tau)),color=BLEU,lw=1.7,zorder=5)
    ax.set_xlim(0,120); ax.set_ylim(0,6)
    ax.set_xticks(range(0,121,20)); ax.set_xticks(range(0,121,5),minor=True)
    ax.set_yticks(range(0,7)); ax.set_yticks(np.arange(0,6.01,0.2),minor=True)
    axes_style(ax,'$t$ (ms)','$u_C$ (V)')
    if corrige:
        u63=0.63*E
        tirets(ax,[0,tau,tau],[u63,u63,0]); tirets(ax,[0,120],[E,E],color=GRIS)
        ax.plot([0,30],[0,E*30/tau],color=VERT,lw=1.2,zorder=4)
        ax.plot([tau],[u63],'o',color=BRIQUE,ms=3.5,zorder=6); ax.plot([tau],[E],'o',color=VERT,ms=3.5,zorder=6)
        ax.text(23,0.35,'$\\tau$',fontsize=12,color=BRIQUE)
        ax.text(23,u63-0.45,'$0{,}63\\,E$',fontsize=10.5,color=BRIQUE)
        ax.text(31,5.3,'tangente à l’origine',fontsize=10,color=VERT)
        ax.text(95,E+0.25,'$E$',fontsize=11,color=GRIS)
    save(fig,'fig_charge_c' if corrige else 'fig_charge')
charge_fig(False); charge_fig(True)
print('Q.9 contrôle : uC(tau) = %.3f V ; Q.10 : t(4,0 V) = %.2f ms' % (E*(1-math.exp(-1)), tau*math.log(E/(E-4.0))))

# ---------------------------------------------------------------- 5 et 6. Q.14 : décharge, U0 = 6,0 V, tau = 1,0 s
U0,tau=6.0,1.0
def decharge_fig(corrige):
    fig,ax=courbe((4.6,2.55),(0.12,0.19,0.98,0.97))
    t=np.linspace(0,6,1201); ax.plot(t,U0*np.exp(-t/tau),color=BLEU,lw=1.7,zorder=5)
    ax.set_xlim(0,6); ax.set_ylim(0,7)
    ax.set_xticks(range(0,7)); ax.set_xticks(np.arange(0,6.01,0.2),minor=True)
    ax.set_yticks(range(0,8)); ax.set_yticks(np.arange(0,7.01,0.2),minor=True)
    axes_style(ax,'$t$ (s)','$u_C$ (V)')
    if corrige:
        u37=0.37*U0
        tirets(ax,[0,tau,tau],[u37,u37,0])
        ax.plot([0,1.25],[U0,U0*(1-1.25/tau)],color=VERT,lw=1.2,zorder=4)
        ax.plot([tau],[u37],'o',color=BRIQUE,ms=3.5,zorder=6); ax.plot([tau],[0],'o',color=VERT,ms=3.5,zorder=6)
        ax.text(1.08,0.35,'$\\tau$',fontsize=12,color=BRIQUE)
        ax.text(1.12,u37+0.5,'$0{,}37\\,U_0$',fontsize=10.5,color=BRIQUE)
        ax.text(0.62,4.9,'tangente à l’origine',fontsize=10,color=VERT)
    save(fig,'fig_decharge_c' if corrige else 'fig_decharge')
decharge_fig(False); decharge_fig(True)
print('Q.14 contrôle : uC(tau) = %.3f V' % (U0*math.exp(-1)))

# ---------------------------------------------------------------- 7. Q.16 (corrigé) : linéarisation de la décharge
tt=np.arange(0,6); uu=np.round(9.0*np.exp(-tt/2.5),2); ll=np.log(uu)
pente,orig=np.polyfit(tt,ll,1)
print('Q.16 valeurs :',list(uu),' ln :',list(np.round(ll,3)),' pente = %.4f, ordonnée = %.4f, tau = %.3f s' % (pente,orig,-1/pente))
fig,ax=courbe((4.2,2.45),(0.13,0.2,0.98,0.97))
x=np.linspace(0,5.5,10); ax.plot(x,orig+pente*x,color=VERT,lw=1.3,zorder=4)
ax.plot(tt,ll,'o',color=BLEU,ms=4.2,zorder=5)
ax.set_xlim(0,5.5); ax.set_ylim(0,2.5)
ax.set_xticks(range(0,6)); ax.set_xticks(np.arange(0,5.51,0.5),minor=True)
ax.set_yticks(np.arange(0,2.51,0.5)); ax.set_yticks(np.arange(0,2.51,0.1),minor=True)
axes_style(ax,'$t$ (s)','$\\ln(u_C)$')
ax.text(3.0,1.75,'pente $= -0{,}400\\ \\mathrm{s}^{-1}$',fontsize=10.5,color=VERT)
save(fig,'fig_ln_decharge')

# ---------------------------------------------------------------- 8. Ex. 1 : microphone électrostatique
fig,ax=new(4.3,2.45,(-2.2,11.2),(-1.25,6.2))
xm,xf=2.4,3.1; y0,y1=0.7,4.0
for k,r in enumerate((1.1,1.6,2.1)):
    ax.add_patch(Arc((xm-2.9,2.35),2*r,2*r*1.15,theta1=-38,theta2=38,color=GRIS,lw=1.0))
arrow(ax,-1.95,2.35,-0.95,2.35,color=GRIS,lw=1.0,head=5)
ax.text(-1.55,5.0,'onde\nsonore',fontsize=10.5,ha='center',va='center',color=GRIS,linespacing=0.95)
ax.plot([xm,xm],[y0,y1],color=CUIVRE,lw=1.6,zorder=5)
ax.plot([xf,xf],[y0,y1],color=ANTH,lw=4.0,solid_capstyle='butt',zorder=5)
ax.text(xm-0.25,y1+0.55,'membrane',fontsize=10.5,ha='right',va='center',color=CUIVRE)
ax.text(xf+0.3,0.2,'armature fixe',fontsize=10.5,ha='left',va='center')
dim(ax,xm,y0-0.35,xf,y0-0.35); ax.text((xm+xf)/2,y0-0.85,'$e$',fontsize=12,ha='center',va='center',color=GRIS)
xs=9.3; ys=2.35
fil(ax,[(xf,y1),(xf,5.3),(5.0,5.3)]); resistance(ax,5.8,5.3,'R',larg=1.6)
fil(ax,[(6.6,5.3),(xs,5.3),(xs,ys+0.55)])
generateur(ax,xs,ys,r=0.55)
fil(ax,[(xs,ys-0.55),(xs,-0.75),(xm,-0.75),(xm,y0)])
arrow(ax,xs+0.95,ys-0.8,xs+0.95,ys+0.8,color=BRIQUE)
ax.text(xs+1.2,ys,'$U$',fontsize=13,ha='left',va='center',color=BRIQUE)
ax.text(xs-0.75,ys+0.85,'+',fontsize=11,ha='center',va='center')
arrow(ax,4.75,5.3,4.0,5.3,color=ANTH,head=5.5); ax.text(4.35,5.68,'$i$',fontsize=13,ha='center',va='center')
ax.text(5.8,4.62,'$R$',fontsize=13,ha='center',va='center')
save(fig,'fig_micro')

# ---------------------------------------------------------------- 9. Ex. 2 : enregistrement de la charge du condensateur de temporisation
E,tau=4.5,27.0
fig,ax=courbe((4.6,2.5),(0.12,0.2,0.98,0.97))
t=np.linspace(0,160,1601); ax.plot(t,E*(1-np.exp(-t/tau)),color=BLEU,lw=1.7,zorder=5)
ax.set_xlim(0,160); ax.set_ylim(0,5)
ax.set_xticks(range(0,161,20)); ax.set_xticks(range(0,161,5),minor=True)
ax.set_yticks(range(0,6)); ax.set_yticks(np.arange(0,5.01,0.25),minor=True)
axes_style(ax,'$t$ (s)','$u_C$ (V)')
save(fig,'fig_temporisation')
print('Ex.2 contrôle : 0,63 E = %.3f V à t = %.1f s ; uC(27 s) = %.3f V' % (0.63*E,tau,E*(1-math.exp(-1))))

# ---------------------------------------------------------------- 10. Ex. 3 : trois décharges pour le coffre-fort
U0,C=5.0,47e-6
fig,ax=courbe((4.6,2.6),(0.12,0.19,0.98,0.97))
t=np.linspace(0,40,2001)
for R,lab,col,(xl,yl) in [(106e3,'$R_1$',BRIQUE,(2.5,None)),(215e3,'$R_2$',VERT,(6.0,None)),(426e3,'$R_3$',BLEU,(24.0,None))]:
    ta=R*C; ax.plot(t,U0*np.exp(-t/ta),color=col,lw=1.6,zorder=5); yl=U0*math.exp(-xl/ta)
    ax.text(xl,yl,lab,fontsize=12,color=col,ha='center',va='center',bbox=dict(fc='white',ec='none',pad=0.3),zorder=6)
    print('Ex.3 %s : tau = %.2f s, t(4,0 V) = %.2f s, t(1,0 V) = %.2f s, durée = %.2f s' % (lab,ta,ta*math.log(5/4),ta*math.log(5),ta*math.log(4)))
ax.set_xlim(0,40); ax.set_ylim(0,6)
ax.set_xticks(range(0,41,5)); ax.set_xticks(range(0,41,1),minor=True)
ax.set_yticks(range(0,7)); ax.set_yticks(np.arange(0,6.01,0.2),minor=True)
axes_style(ax,'$t$ (s)','$u_C$ (V)')
save(fig,'fig_coffre')

# ---------------------------------------------------------------- 11. Ex. 4 : charge du capteur et étalonnage
E,tau=5.0,120.0
fig,(a1,a2)=plt.subplots(1,2,figsize=(6.6,2.6)); fig.subplots_adjust(0.075,0.19,0.99,0.9,wspace=0.3)
t=np.linspace(0,600,1201); a1.plot(t,E*(1-np.exp(-t/tau)),color=BLEU,lw=1.6,zorder=5)
a1.set_xlim(0,600); a1.set_ylim(0,6)
a1.set_xticks(range(0,601,100)); a1.set_xticks(range(0,601,20),minor=True)
a1.set_yticks(range(0,7)); a1.set_yticks(np.arange(0,6.01,0.2),minor=True)
axes_style(a1,'$t$ (µs)','$u_C$ (V)')
a1.set_title('a. Charge du capteur',fontsize=10.5,color=ANTH,loc='left')
k=2.2125; h=np.linspace(0,80,2); Ch=177.0+k*1.2*h
a2.plot(h,Ch,color=CUIVRE,lw=1.6,zorder=5)
a2.set_xlim(0,80); a2.set_ylim(150,400)
a2.set_xticks(range(0,81,10)); a2.set_xticks(range(0,81,2),minor=True)
a2.set_yticks(range(150,401,50)); a2.set_yticks(range(150,401,10),minor=True)
axes_style(a2,'$h$ (cm)','$C$ (pF)')
a2.set_title('b. Étalonnage du capteur',fontsize=10.5,color=ANTH,loc='left')
p=f'{out}/fig_niveau.png'; fig.savefig(p,facecolor='white'); plt.close(fig); print('fig_niveau',rogne(p))
Cm=1.2e-4/330e3*1e12; print('Ex.4 contrôle : C = %.1f pF -> h = %.2f cm' % (Cm,(Cm-177.0)/(k*1.2)))

# ---------------------------------------------------------------- 12. Q.19 : résistance d'une thermistance en fonction de la température
R25,B=10.0,3950.0
def Rth(th): return R25*np.exp(B*(1/(th+273.15)-1/298.15))
fig,ax=courbe((4.4,2.5),(0.12,0.2,0.98,0.97))
th=np.linspace(20,80,601); ax.plot(th,Rth(th),color=BRIQUE,lw=1.7,zorder=5)
ax.set_xlim(20,80); ax.set_ylim(0,14)
ax.set_xticks(range(20,81,10)); ax.set_xticks(range(20,81,2),minor=True)
ax.set_yticks(range(0,15,2)); ax.set_yticks(np.arange(0,14.01,0.5),minor=True)
axes_style(ax,'$\\theta$ (°C)','$R$ (kΩ)')
save(fig,'fig_thermistance')
T=1/(1/298.15+math.log(4.0/R25)/B); print('Q.19 contrôle : R = 4,0 kΩ pour theta = %.1f °C' % (T-273.15))
