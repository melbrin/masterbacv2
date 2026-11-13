# Figures de la fiche PC 9 (Acides et bases), palette MasterBac
# usage : pc-09-acides-bases.py <dossier de sortie, en général fiches/pc-09-acides-bases/figs>
import sys
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
def tirets(ax,xs,ys,color=BRIQUE,lw=1.0):
    ax.plot(xs,ys,color=color,lw=lw,ls=(0,(4,2.5)),zorder=4)

# ---------------------------------------------------------------- 1 et 2. Q.19 : diagramme de distribution du dioxyde de carbone dissous
PKA1, PKA2 = 6.4, 10.3
def carbonates(pH):
    a = 1/(1 + 10**(pH-PKA1) + 10**(2*pH-PKA1-PKA2)); b = a*10**(pH-PKA1); c = b*10**(pH-PKA2)
    return 100*a, 100*b, 100*c
def carbonates_fig(corrige):
    fig,ax=plt.subplots(figsize=(4.8,2.7)); fig.subplots_adjust(0.11,0.17,0.98,0.97)
    pH=np.linspace(0,14,701); a,b,c=carbonates(pH)
    st=[('-',BLEU),((0,(5,2.5)),CUIVRE),((0,(6,2,1.5,2)),VERT)]
    for y,(ls,col) in zip((a,b,c),st): ax.plot(pH,y,color=col,lw=1.7,ls=ls,zorder=5)
    ax.set_xlim(0,14); ax.set_ylim(0,100)
    ax.set_xticks(range(0,15)); ax.set_xticks(np.arange(0,14.01,0.2),minor=True)
    ax.set_yticks(range(0,101,10)); ax.set_yticks(range(0,101,2),minor=True)
    axes_style(ax,'pH','Pourcentage (%)')
    if not corrige:
        for x,y,t,col in ((3.2,90,'1',BLEU),(8.35,90,'2',CUIVRE),(12.6,90,'3',VERT)):
            ax.text(x,y,t,fontsize=11,color=col,ha='center',va='center',fontweight='bold',
                    bbox=dict(boxstyle='circle,pad=0.25',fc='white',ec=col,lw=0.9),zorder=7)
    else:
        for x,y,t,col in ((1.6,90,'$\\mathrm{CO_2}$(aq)',BLEU),(8.35,62,'$\\mathrm{HCO_3^-}$',CUIVRE),(12.7,90,'$\\mathrm{CO_3^{2-}}$',VERT)):
            ax.text(x,y,t,fontsize=10,color=col,ha='center',va='center',
                    bbox=dict(boxstyle='round,pad=0.2',fc='white',ec='none'),zorder=7)
        for pk,lab in ((PKA1,'p$K_\\mathrm{A1}$ = 6,4'),(PKA2,'p$K_\\mathrm{A2}$ = 10,3')):
            tirets(ax,[pk,pk],[0,50],color=BRIQUE)
            ax.plot([pk],[50],'o',color=BRIQUE,ms=3.5,zorder=8)
            ax.text(pk+0.15,40,lab,fontsize=9,color=BRIQUE,ha='left',va='center',
                    bbox=dict(boxstyle='round,pad=0.12',fc='white',ec='none'),zorder=7)
        for x,y in ((5.0,carbonates(5.0)[0]),(8.3,carbonates(8.3)[1])):
            ax.plot([x],[y],'s',color=ANTH,ms=3.5,zorder=8)
        ax.text(4.75,86,'pH 5,0 : 96 %',fontsize=8.5,color=ANTH,ha='right',va='center',
                bbox=dict(boxstyle='round,pad=0.12',fc='white',ec='none'),zorder=7)
        ax.text(8.3,78,'pH 8,3 : 98 %',fontsize=8.5,color=ANTH,ha='center',va='center',
                bbox=dict(boxstyle='round,pad=0.12',fc='white',ec='none'),zorder=7)
    save(fig,'fig_carbonates_c' if corrige else 'fig_carbonates')
carbonates_fig(False); carbonates_fig(True)
print('Q.19 contrôle : pH 5,0 -> %.1f %% de CO2 ; pH 8,3 -> %.1f %% de HCO3-' % (carbonates(5.0)[0], carbonates(8.3)[1]))

# ---------------------------------------------------------------- diagrammes de prédominance (axe du pH horizontal)
def axe_ph(ax, x0=0, x1=14, y=0):
    ax.annotate('',xy=(x1+0.6,y),xytext=(x0,y),arrowprops=dict(arrowstyle='-|>',color=ANTH,lw=1.1,mutation_scale=11))
    for v in range(x0,x1+1):
        ax.plot([v,v],[y-0.09,y+0.09],color=ANTH,lw=0.8)
        ax.text(v,y-0.22,str(v),fontsize=8.5,color=ANTH,ha='center',va='top')
    ax.text(x1+0.75,y,'pH',fontsize=10,color=ANTH,ha='left',va='center')
def bande(ax, x0, x1, couleur, texte, y0=0.25, h=0.62, fs=9.5):
    ax.add_patch(plt.Rectangle((x0,y0),x1-x0,h,fc=couleur,ec='none',zorder=1))
    ax.text((x0+x1)/2,y0+h/2,texte,fontsize=fs,color=ANTH,ha='center',va='center',zorder=3)
def frontiere(ax, x, texte):
    ax.plot([x,x],[-0.05,1.0],color=BRIQUE,lw=1.2,zorder=4)
    ax.text(x,1.12,texte,fontsize=9,color=BRIQUE,ha='center',va='bottom')
def repere(ax, x, texte):
    ax.annotate('',xy=(x,0.02),xytext=(x,-0.75),arrowprops=dict(arrowstyle='-|>',color=VERT,lw=1.1,mutation_scale=9))
    ax.text(x,-0.82,texte,fontsize=8.5,color=VERT,ha='center',va='top')
def nu(ax):
    ax.set_xlim(-0.3,15.6); ax.axis('off')

# 3. Q.17 : ibuprofène, pKA = 4,4
fig,ax=plt.subplots(figsize=(5.2,1.75)); fig.subplots_adjust(0.01,0.02,0.99,0.98)
bande(ax,0,4.4,EAU,'AH prédomine'); bande(ax,4.4,14,SABLE,'$\\mathrm{A^-}$ prédomine')
axe_ph(ax); frontiere(ax,4.4,'p$K_\\mathrm{A}$ = 4,4')
repere(ax,2,'estomac, pH ≈ 2'); repere(ax,8,'intestin, pH ≈ 8')
nu(ax); ax.set_ylim(-1.35,1.45)
save(fig,'fig_ibuprofene')

# 4. Q.21 : glycine, pKA1 = 2,3 et pKA2 = 9,6
fig,ax=plt.subplots(figsize=(5.6,1.95)); fig.subplots_adjust(0.01,0.02,0.99,0.98)
bande(ax,0,2.3,EAU,'cation',fs=8.5); bande(ax,2.3,9.6,GRISM,'amphion $\\mathrm{H_3N^+{-}CH_2{-}COO^-}$',fs=8.5)
bande(ax,9.6,14,SABLE,'anion',fs=8.5)
ax.text(1.15,-0.62,'$\\mathrm{H_3N^+{-}CH_2{-}COOH}$',fontsize=8,color=ANTH,ha='center',va='top')
ax.text(11.8,-0.62,'$\\mathrm{H_2N{-}CH_2{-}COO^-}$',fontsize=8,color=ANTH,ha='center',va='top')
axe_ph(ax); frontiere(ax,2.3,'p$K_\\mathrm{A1}$ = 2,3'); frontiere(ax,9.6,'p$K_\\mathrm{A2}$ = 9,6')
for x in (1,6,12): ax.plot([x],[0.12],'v',color=VERT,ms=5,zorder=5)
nu(ax); ax.set_ylim(-1.0,1.45)
save(fig,'fig_glycine')

# ---------------------------------------------------------------- 5 et 6. Exercice 4 : chlore libre, couple HClO/ClO-, pKA = 7,5
PKA = 7.5
def piscine_fig(corrige):
    fig,ax=plt.subplots(figsize=(4.8,2.6)); fig.subplots_adjust(0.11,0.18,0.98,0.97)
    pH=np.linspace(4,11,701); a=100/(1+10**(pH-PKA))
    ax.plot(pH,a,color=BLEU,lw=1.7,zorder=5); ax.plot(pH,100-a,color=CUIVRE,lw=1.7,ls=(0,(5,2.5)),zorder=5)
    ax.set_xlim(4,11); ax.set_ylim(0,100)
    ax.set_xticks(range(4,12)); ax.set_xticks(np.arange(4,11.01,0.1),minor=True)
    ax.set_yticks(range(0,101,10)); ax.set_yticks(range(0,101,2),minor=True)
    axes_style(ax,'pH','Pourcentage du chlore libre (%)',size=9.5)
    ax.text(5.0,90,'HClO',fontsize=10,color=BLEU,ha='center',va='center',bbox=dict(boxstyle='round,pad=0.2',fc='white',ec='none'),zorder=7)
    ax.text(10.2,90,'$\\mathrm{ClO^-}$',fontsize=10,color=CUIVRE,ha='center',va='center',bbox=dict(boxstyle='round,pad=0.2',fc='white',ec='none'),zorder=7)
    if corrige:
        for x,col,lab,lx,ly,ha in ((7.8,BRIQUE,'pH 7,8 : 33 %',7.92,39,'left'),(7.2,VERT,'pH 7,2 : 67 %',4.15,73,'left')):
            y=100/(1+10**(x-PKA))
            tirets(ax,[x,x,4],[0,y,y],color=col)
            ax.plot([x],[y],'o',color=col,ms=3.5,zorder=8)
            ax.text(lx,ly,lab,fontsize=8.5,color=col,ha=ha,va='center',
                    bbox=dict(boxstyle='round,pad=0.12',fc='white',ec='none'),zorder=7)
    save(fig,'fig_piscine_c' if corrige else 'fig_piscine')
piscine_fig(False); piscine_fig(True)
print('Ex. 4 contrôle : HClO à pH 7,8 = %.1f %% ; à pH 7,2 = %.1f %%' % (100/(1+10**(7.8-PKA)), 100/(1+10**(7.2-PKA))))

# ---------------------------------------------------------------- 7. Exercice 3 : éthanolamine et dioxyde de carbone dissous sur un même axe
fig,ax=plt.subplots(figsize=(5.6,2.55)); fig.subplots_adjust(0.01,0.02,0.99,0.98)
H=0.5; YB=0.2; YH=1.15
def bande_c(x0,x1,y0,couleur,texte):
    ax.add_patch(plt.Rectangle((x0,y0),x1-x0,H,fc=couleur,ec='none',zorder=1))
    ax.text((x0+x1)/2,y0+H/2,texte,fontsize=9.5,color=ANTH,ha='center',va='center',zorder=3)
bande_c(0,6.4,YH,EAU,'$\\mathrm{CO_2,H_2O}$'); bande_c(6.4,14,YH,SABLE,'$\\mathrm{HCO_3^-}$')
bande_c(0,9.5,YB,EAU,'$\\mathrm{BH^+}$'); bande_c(9.5,14,YB,SABLE,'$\\mathrm{B}$')
ax.plot([6.4,6.4],[YH-0.05,YH+H+0.05],color=BRIQUE,lw=1.2,zorder=4)
ax.text(6.4,YH+H+0.1,'p$K_\\mathrm{A}$ = 6,4',fontsize=8.5,color=BRIQUE,ha='center',va='bottom')
ax.plot([9.5,9.5],[YB-0.05,YB+H+0.05],color=BRIQUE,lw=1.2,zorder=4)
ax.text(9.62,YB+H+0.08,'p$K_\\mathrm{A}$ = 9,5',fontsize=8.5,color=BRIQUE,ha='left',va='bottom')
for x in (8.5,11.25): ax.plot([x,x],[0.02,YH+H],color=VERT,lw=1.0,ls=(0,(3,2)),zorder=5)
axe_ph(ax)
repere(ax,8.5,'après captage\npH = 8,5'); repere(ax,11.25,'solution S\npH = 11,25')
nu(ax); ax.set_ylim(-1.45,2.0)
save(fig,'fig_captage')
