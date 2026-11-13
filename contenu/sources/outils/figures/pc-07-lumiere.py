# Figures de la fiche PC 7 (Lumière : images, lunette astronomique et photons), palette MasterBac
# usage : pc-07-lumiere.py <dossier de sortie, en général fiches/pc-07-lumiere/figs>
import sys, math
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Circle, Polygon, Arc, Rectangle, Ellipse
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
def point(ax,x,y,lab,dx,dy,size=12,ha='center'):
    ax.plot(x,y,'o',color=ANTH,ms=2.8,zorder=7)
    ax.text(x+dx,y+dy,lab,fontsize=size,ha=ha,va='center',fontfamily='STIXGeneral',zorder=8)
def lentille(ax,x,h,color=BLEU,lw=1.8):
    arrow(ax,x,0,x,h,color=color,lw=lw,head=6); arrow(ax,x,0,x,-h,color=color,lw=lw,head=6)
def etiquette(ax,x,y,txt,size=12,fc='white'):
    ax.text(x,y,txt,fontsize=size,ha='center',va='center',zorder=9,bbox=dict(fc=fc,ec='none',pad=0.5))

# ---------------------------------------------------------------- 1 et 2. Q.1 : image d'un objet par une lentille convergente
def lentille_fig(construite):
    fig,ax=new(6.4,2.7,(-10.8,18.8),(-3.0,2.6))
    for xx in range(-10,19):
        ax.plot([xx,xx],[-0.08,0.08],color=GRIS,lw=0.6)
    ax.plot([-10.8,18.8],[0,0],color=ANTH,lw=0.9)
    lentille(ax,0,2.3)
    ax.text(0.35,2.35,'L',fontsize=12,fontfamily='STIXGeneral')
    point(ax,0,0,'O',0.45,-0.35); point(ax,-5,0,'F',0,-0.4); point(ax,5,0,'F′',0,-0.4)
    arrow(ax,-7.5,0,-7.5,1.0,color=CUIVRE,lw=2.0,head=6)
    ax.text(-7.5,-0.4,'A',fontsize=12,ha='center',va='center',fontfamily='STIXGeneral')
    ax.text(-7.85,1.05,'B',fontsize=12,ha='center',va='center',fontfamily='STIXGeneral')
    ax.text(17.6,0.35,'1 cm',fontsize=8.5,ha='center',color=GRIS); ax.plot([17.1,18.1],[0.18,0.18],color=GRIS,lw=1.2)
    if construite:
        B=(-7.5,1.0); Bp=(15.0,-2.0)
        ax.plot([B[0],0],[1.0,1.0],color=BRIQUE,lw=1.1); ax.plot([0,Bp[0]],[1.0,Bp[1]],color=BRIQUE,lw=1.1)
        ax.plot([B[0],Bp[0]],[B[1],Bp[1]],color=VERT,lw=1.1)
        ax.plot([B[0],0],[B[1],-2.0],color=BLEU,lw=1.1); ax.plot([0,Bp[0]],[-2.0,-2.0],color=BLEU,lw=1.1)
        arrow(ax,15.0,0,15.0,-2.0,color=CUIVRE,lw=2.0,head=6)
        ax.text(15.0,0.4,'A′',fontsize=12,ha='center',va='center',fontfamily='STIXGeneral')
        ax.text(15.55,-2.25,'B′',fontsize=12,ha='center',va='center',fontfamily='STIXGeneral')
    save(fig,'fig_lentille_image' if construite else 'fig_lentille_objet')
lentille_fig(False); lentille_fig(True)

# ---------------------------------------------------------------- 3 et 4. Q.6 : lunette afocale (énoncé, puis construction complète)
f1,f2=6.0,2.0; x2=f1+f2; th=math.radians(15); t=math.tan(th)
B1=(f1,-f1*t)
def lunette_fig(construite):
    fig,ax=new(6.6,3.1,(-5.4,12.6),(-2.95,2.75))
    ax.plot([-5.4,12.6],[0,0],color=ANTH,lw=0.9)
    lentille(ax,0,2.2); lentille(ax,x2,2.5)
    ax.text(0.45,2.15,'L$_1$',fontsize=12); ax.text(x2+0.45,2.45,'L$_2$',fontsize=12)
    point(ax,0,0,r'$\mathrm{O}_1$',-0.45,-0.38,size=12); point(ax,x2,0,r'$\mathrm{O}_2$',0.48,-0.38,size=12)
    point(ax,-f1,0,r'$\mathrm{F}_1$',0,-0.42)
    ya=lambda x: -t*x                      # rayon passant par O1
    yb0=-1.2                               # second rayon, sur L1
    yb=lambda x: yb0-t*x
    xs=-5.0
    ax.plot([xs,0],[ya(xs),0],color=BRIQUE,lw=1.2); ax.plot([xs,0],[yb(xs),yb0],color=BRIQUE,lw=1.2)
    arrow(ax,xs,ya(xs),xs+1.2,ya(xs+1.2),color=BRIQUE,lw=1.2,head=5); arrow(ax,xs,yb(xs),xs+1.2,yb(xs+1.2),color=BRIQUE,lw=1.2,head=5)
    ax.text(-5.25,1.55,'vers B',fontsize=10,ha='left',color=BRIQUE)
    ax.add_patch(Arc((0,0),5.6,5.6,theta1=180-15,theta2=180,color=ANTH,lw=1.0))
    etiquette(ax,-3.35,0.42,r'$\theta$')
    if not construite:
        point(ax,f1,0,r'$\mathrm{F}\prime_1$',0,0.42)
    else:
        point(ax,f1,0,r'$\mathrm{F}\prime_1 = \mathrm{F}_2$',0.05,0.45,size=11)
        point(ax,x2+f2,0,r'$\mathrm{F}\prime_2$',0.12,0.45)
        ax.plot([0,B1[0]],[0,B1[1]],color=BRIQUE,lw=1.2); ax.plot([0,B1[0]],[yb0,B1[1]],color=BRIQUE,lw=1.2)
        sa=(B1[1]-0)/(B1[0]-0); sb=(B1[1]-yb0)/(B1[0]-0)
        ya2=B1[1]+sa*(x2-B1[0]); yb2=B1[1]+sb*(x2-B1[0])
        ax.plot([B1[0],x2],[B1[1],ya2],color=BRIQUE,lw=1.2); ax.plot([B1[0],x2],[B1[1],yb2],color=BRIQUE,lw=1.2)
        se=-B1[1]/(x2-B1[0]); xe=12.3
        ax.plot([x2,xe],[ya2,ya2+se*(xe-x2)],color=BRIQUE,lw=1.2); ax.plot([x2,xe],[yb2,yb2+se*(xe-x2)],color=BRIQUE,lw=1.2)
        arrow(ax,xe-1.0,ya2+se*(xe-1.0-x2),xe,ya2+se*(xe-x2),color=BRIQUE,lw=1.2,head=5)
        arrow(ax,xe-1.0,yb2+se*(xe-1.0-x2),xe,yb2+se*(xe-x2),color=BRIQUE,lw=1.2,head=5)
        ax.plot([B1[0],x2+2.6],[B1[1],B1[1]+se*(x2+2.6-B1[0])],color=GRIS,lw=0.9,ls=(0,(3,2)))
        arrow(ax,f1,0,f1,B1[1],color=CUIVRE,lw=1.8,head=5)
        point(ax,B1[0],B1[1],r'$\mathrm{B}_1$',-0.45,-0.25)
        ax.text(f1+0.45,-0.42,r'$\mathrm{A}_1$',fontsize=12,ha='center',va='center')
        thp=math.degrees(math.atan(se))
        ax.add_patch(Arc((x2,0),1.6,1.6,theta1=0,theta2=thp,color=ANTH,lw=1.0))
        bis=math.radians(thp/2)
        etiquette(ax,x2+1.22*math.cos(bis),1.22*math.sin(bis)+0.04,r'$\theta\prime$')
    save(fig,'fig_lunette_c' if construite else 'fig_lunette')
lunette_fig(False); lunette_fig(True)

# ---------------------------------------------------------------- 5 et 6. Q.13 et Q.15 : niveaux d'énergie de l'atome de sodium
niv=[('E$_0$',-5.14),('E$_1$',-3.03),('E$_2$',-1.94),('E$_3$',-1.52),('E$_4$',-1.38),('E$_5$',-0.85)]
def niveaux_fig(transitions):
    fig,ax=plt.subplots(figsize=(3.6 if not transitions else 4.6,3.4)); fig.subplots_adjust(0,0,1,1)
    ax.axis('off'); ax.set_xlim(-2.9,4.9 if transitions else 3.2); ax.set_ylim(-5.6,0.75)
    arrow(ax,0,-5.5,0,0.65,color=ANTH,lw=1.2,head=5); ax.text(0.15,0.62,'$E$ (eV)',fontsize=11,va='center')
    for lab,e in niv+[('',0.0)]:
        ax.plot([0,2.8],[e,e],color=ANTH if e!=0 else GRIS,lw=1.1 if e!=0 else 0.9,ls='-' if e!=0 else (0,(3,2)))
        txt=(lab+' = '+('%.2f'%e).replace('.',',').replace('-','−')) if lab else '0'
        ye=e+{-1.38:0.11,-1.52:-0.11}.get(e,0.0)
        ax.text(-0.18,ye,txt,fontsize=11,ha='right',va='center')
        if ye!=e: ax.plot([-0.16,0],[ye,e],color=GRIS,lw=0.6)
    if transitions:
        arrow(ax,1.0,-3.03,1.0,-5.14,color=BRIQUE,lw=1.8,head=6)
        ax.text(1.15,-4.1,'émission\n589 nm',fontsize=10.5,color=BRIQUE,va='center')
        arrow(ax,2.3,-3.03,2.3,-1.94,color=BLEU,lw=1.8,head=6)
        ax.text(2.95,-2.5,'absorption\nde 1,09 eV',fontsize=10.5,color=BLEU,va='center')
    save(fig,'fig_transitions_na' if transitions else 'fig_niveaux_na')
niveaux_fig(False); niveaux_fig(True)

# ---------------------------------------------------------------- 7. Q.23 : caractéristique d'un petit panneau photovoltaïque
isc,voc,a=5.0,21.6,1.3
U=np.linspace(0,voc,2001); I=isc*(1-np.exp((U-voc)/a)); P=U*I
fig,(a1,a2)=plt.subplots(1,2,figsize=(6.6,2.7)); fig.subplots_adjust(0.08,0.18,0.99,0.97,wspace=0.32)
a1.plot(U,I,color=BLEU,lw=1.6); a1.set_xlim(0,24); a1.set_ylim(0,6); a1.set_xticks(range(0,25,4)); a1.set_yticks(range(0,7))
a1.set_xticks(range(0,25,1),minor=True); a1.set_yticks(np.arange(0,6.01,0.5),minor=True)
axes_style(a1,'$U$ (V)','$I$ (A)'); a1.grid(which='minor',color='#EFEBE7',lw=0.35); a1.tick_params(which='minor',length=0)
a2.plot(U,P,color=CUIVRE,lw=1.6); a2.set_xlim(0,24); a2.set_ylim(0,100); a2.set_xticks(range(0,25,4)); a2.set_yticks(range(0,101,20))
a2.set_xticks(range(0,25,1),minor=True); a2.set_yticks(range(0,101,5),minor=True)
axes_style(a2,'$U$ (V)','$P$ (W)'); a2.grid(which='minor',color='#EFEBE7',lw=0.35); a2.tick_params(which='minor',length=0)
k=P.argmax(); print('Q.23 point de puissance maximale : U = %.2f V, I = %.3f A, P = %.2f W' % (U[k],I[k],P[k]))
p=f'{out}/fig_caracteristique.png'; fig.savefig(p,facecolor='white'); plt.close(fig); print('fig_caracteristique',rogne(p))

# ---------------------------------------------------------------- 8. Ex. 2 : l'astroscope de Huygens
fig,ax=new(6.3,3.6,(-1.5,14.4),(-1.2,7.9))
ax.plot([-1.5,14.4],[0,0],color=ANTH,lw=1.4)
for xx in np.arange(-1.3,14.4,0.6): ax.plot([xx,xx-0.35],[0,-0.3],color=GRIS,lw=0.7)
mx,h=9.0,6.2; ex=1.6
ax.plot([mx,mx],[0,h+0.4],color=ANTH,lw=3.0)
ax.text(mx+0.3,h*0.45,'mât',fontsize=16,va='center')
ang=math.atan2(h,mx-ex)
ax.plot([ex,mx],[0.0,h],color=GRIS,lw=1.0,ls=(0,(4,2)))
ax.text((ex+mx)/2-0.9,h/2+0.4,'fil tendu',fontsize=15,ha='right',rotation=math.degrees(ang),rotation_mode='anchor',color=GRIS)
ux,uy=math.cos(ang),math.sin(ang); nx,ny=-uy,ux
for (cx,cy,r,lab,dx,dy,ha) in [(mx,h,0.55,'lentille (a)',-0.45,0.55,'right'),(ex,0.0,0.32,'lentille (b)',0.1,-0.7,'center')]:
    ax.add_patch(Ellipse((cx,cy),0.22,2*r,angle=math.degrees(ang),fc=EAU,ec=BLEU,lw=1.4,zorder=6))
    ax.text(cx+dx,cy+dy,lab,fontsize=16,ha=ha,va='center',zorder=7)
arrow(ax,mx+0.45*ux,h+0.45*uy,mx+2.0*ux,h+2.0*uy,color=BRIQUE,lw=1.4)
ax.text(mx+2.0*ux+0.2,h+2.0*uy-0.05,'vers Jupiter',fontsize=16,color=BRIQUE,ha='left',va='center')
ax.add_patch(Circle((ex-0.55,0.55),0.22,fc=GRISC,ec=ANTH,lw=0.9,zorder=6)); ax.text(ex-0.45,1.3,'observateur',fontsize=15,ha='center')
ax.add_patch(Arc((ex,0),3.2,3.2,theta1=0,theta2=math.degrees(ang),color=ANTH,lw=1.0))
etiquette(ax,ex+2.3,0.6,'40°',size=16)
print('Ex.2 angle dessiné (degrés) : %.1f' % math.degrees(ang))
save(fig,'fig_astroscope')

# ---------------------------------------------------------------- 9. Ex. 4 : puissance d'un panneau selon l'éclairement
fig,ax=plt.subplots(figsize=(4.4,2.9)); fig.subplots_adjust(0.15,0.17,0.97,0.96)
for E,col,dy in [(1000,BRIQUE,8),(800,CUIVRE,8),(400,BLEU,8)]:
    iscE=11.3*E/1000; vocE=40.0+1.2*math.log(E/1000)
    U=np.linspace(0,vocE,4001); I=iscE*(1-np.exp((U-vocE)/1.6)); P=U*I
    ax.plot(U,P,color=col,lw=1.6); k=P.argmax()
    ax.text(4,P[k]*0.92 if E!=400 else P[k]*1.08,'{:,}'.format(E).replace(',','\u202f')+' W·m$^{-2}$',fontsize=10,color=col)
    print('Ex.4 éclairement %d : U = %.2f V, I = %.3f A, P = %.2f W' % (E,U[k],I[k],P[k]))
ax.set_xlim(0,44); ax.set_ylim(0,420); ax.set_xticks(range(0,45,5)); ax.set_yticks(range(0,421,50))
ax.set_yticks(range(0,421,10),minor=True); ax.set_xticks(range(0,45,1),minor=True)
axes_style(ax,'$U$ (V)','$P$ (W)'); ax.grid(which='minor',color='#EFEBE7',lw=0.35); ax.tick_params(which='minor',length=0)
ax.tick_params(labelsize=9.5); ax.xaxis.label.set_size(10.5); ax.yaxis.label.set_size(10.5)
p=f'{out}/fig_panneaux.png'; fig.savefig(p,facecolor='white'); plt.close(fig); print('fig_panneaux',rogne(p))

# ---------------------------------------------------------------- 10. Q.18 : bilan d'énergie de l'effet photoélectrique
fig,ax=new(6.2,2.6,(-0.4,12.6),(-0.6,4.8))
ax.add_patch(Rectangle((0,0),4.6,1.2,fc=GRISC,ec=ANTH,lw=1.0)); ax.text(2.3,0.6,'métal',fontsize=10,ha='center',va='center')
xs=np.linspace(0,1,200); px=0.4+2.2*xs; py=4.2-3.0*xs+0.12*np.sin(2*np.pi*xs*6)
ax.plot(px,py,color=BRIQUE,lw=1.4); arrow(ax,px[-8],py[-8],px[-1],py[-1],color=BRIQUE,lw=1.4,head=5)
ax.text(0.5,4.45,'photon d’énergie $h\\nu$',fontsize=10,color=BRIQUE)
ax.add_patch(Circle((2.75,1.2),0.16,fc=BLEU,ec='none',zorder=6))
arrow(ax,2.75,1.2,4.3,3.2,color=BLEU,lw=1.4,head=5); ax.text(4.0,3.5,'électron éjecté',fontsize=10,color=BLEU,ha='center')
bx=8.0; w=1.6
ax.add_patch(Rectangle((bx,0),w,4.0,fc='#F3D9D5',ec=BRIQUE,lw=1.0)); ax.text(bx+w/2,4.25,'$h\\nu$',fontsize=11,ha='center',color=BRIQUE)
ax.add_patch(Rectangle((bx+w+0.6,0),w,2.6,fc=GRISC,ec=ANTH,lw=1.0)); ax.text(bx+1.5*w+0.6,1.3,'$W$',fontsize=11,ha='center',va='center')
ax.add_patch(Rectangle((bx+w+0.6,2.6),w,1.4,fc=EAU,ec=BLEU,lw=1.0)); ax.text(bx+1.5*w+0.6,3.3,'$E_c$',fontsize=11,ha='center',va='center',color=BLEU)
ax.text(bx+w+0.3,2.0,'=',fontsize=14,ha='center',va='center')
ax.plot([bx-0.3,bx+2*w+0.9],[0,0],color=ANTH,lw=0.8)
save(fig,'fig_photoelectrique')

# ---------------------------------------------------------------- 11. Ex. 3 : niveaux de l'atome d'hydrogène, axe interrompu
def yh(e): return e if e>-4.0 else -5.6        # échelle des énergies au-dessus de -4 eV ; n = 1 placé sous l'interruption
fig,ax=plt.subplots(figsize=(4.6,3.5)); fig.subplots_adjust(0,0,1,1); ax.axis('off')
ax.set_xlim(-3.3,5.4); ax.set_ylim(-6.15,0.95)
ax.plot([0,0],[-6.0,-4.55],color=ANTH,lw=1.2); arrow(ax,0,-4.25,0,0.75,color=ANTH,lw=1.2,head=5)
for yy in (-4.62,-4.18): ax.plot([-0.16,0.16],[yy-0.08,yy+0.08],color=ANTH,lw=1.0)
ax.text(0.18,0.75,'$E$ (eV)',fontsize=11,va='center')
for n in range(1,5):
    e=-13.6/n**2; y=yh(e); ax.plot([0,4.9],[y,y],color=ANTH,lw=1.0)
    ax.text(-0.22,y,'$n = %d$ : %s'%(n,('%.2f'%e).replace('.',',').replace('-','−')),fontsize=11,ha='right',va='center')
ax.plot([0,4.9],[0,0],color=GRIS,lw=0.9,ls=(0,(3,2))); ax.text(-0.22,0,'0',fontsize=11,ha='right',va='center')
for (lab,n1,n2,x) in [('(a)',3,2,2.3),('(b)',4,2,3.6),('(c)',2,1,1.0)]:
    y1,y2=yh(-13.6/n1**2),yh(-13.6/n2**2)
    arrow(ax,x,y1,x,y2,color=BRIQUE,lw=1.5,head=5)
    etiquette(ax,x+0.45,(y1+y2)/2,lab,size=11.5)
save(fig,'fig_hydrogene')
