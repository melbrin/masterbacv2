# Modèle Word MasterBac : part du reference.docx de pandoc et y installe les styles de la charte.
import sys, zipfile, shutil, re, json, os
NAMES = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'styles_map.json'), encoding='utf-8'))
from lxml import etree

src, dst = sys.argv[1], sys.argv[2]
W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
NS = {'w': W}
def q(t): return '{%s}%s' % (W, t)

FONT = 'Calibri'
ANTH, CUIVRE, NUIT = '2B2C2D', 'A47351', '001128'
CREME, SABLE, GRIS, LIGNE = 'FAF6F3', 'FDF4E8', '6B6F76', 'E3DDD8'
VERT, VERT_F = '2E6B4F', 'F1F7F3'
BLEU, BLEU_F = '2F5D8A', 'EEF3F8'
BRIQUE, BRIQUE_F = 'B23A2E', 'FBEFED'
ARDOISE, ARDOISE_F = '8A8F98', 'F4F4F4'
CUIVRE_CLAIR = 'E9DDD3'
TEXTW = 9638  # largeur utile en twips (A4, marges 2 cm)

def rpr(size=None, bold=None, italic=None, color=None, caps=None, spacing=None, shd=None):
    x = '<w:rPr xmlns:w="%s">' % W
    x += '<w:rFonts w:ascii="%s" w:hAnsi="%s" w:cs="%s" w:eastAsia="%s"/>' % (FONT, FONT, FONT, FONT)
    if bold is not None: x += '<w:b w:val="%d"/><w:bCs w:val="%d"/>' % (bold, bold)
    if italic is not None: x += '<w:i w:val="%d"/><w:iCs w:val="%d"/>' % (italic, italic)
    if caps is not None: x += '<w:caps w:val="%d"/>' % caps
    if color: x += '<w:color w:val="%s"/>' % color
    if spacing is not None: x += '<w:spacing w:val="%d"/>' % spacing
    if size: x += '<w:sz w:val="%d"/><w:szCs w:val="%d"/>' % (round(size*2), round(size*2))
    if shd: x += '<w:shd w:val="clear" w:color="auto" w:fill="%s"/>' % shd
    return x + '</w:rPr>'

def ppr(keep_next=False, keep_lines=False, page_break=False, borders=None, shd=None, tabs=None,
        before=None, after=None, line=None, ind_left=None, ind_right=None, hanging=None,
        contextual=False, jc=None, outline=None, widow=True):
    x = '<w:pPr xmlns:w="%s">' % W
    if keep_next: x += '<w:keepNext/>'
    if keep_lines: x += '<w:keepLines/>'
    if page_break: x += '<w:pageBreakBefore/>'
    if borders:
        x += '<w:pBdr>'
        for side in ('top', 'left', 'bottom', 'right'):
            if side in borders:
                sz, col, sp = borders[side]
                x += '<w:%s w:val="single" w:sz="%d" w:space="%d" w:color="%s"/>' % (side, sz, sp, col)
        x += '</w:pBdr>'
    if shd: x += '<w:shd w:val="clear" w:color="auto" w:fill="%s"/>' % shd
    if tabs:
        x += '<w:tabs>' + ''.join('<w:tab w:val="%s" w:leader="%s" w:pos="%d"/>' % t for t in tabs) + '</w:tabs>'
    if before is not None or after is not None or line is not None:
        x += '<w:spacing'
        if before is not None: x += ' w:before="%d"' % before
        if after is not None: x += ' w:after="%d"' % after
        if line is not None: x += ' w:line="%d" w:lineRule="auto"' % line
        x += '/>'
    if ind_left is not None or ind_right is not None or hanging is not None:
        x += '<w:ind'
        if ind_left is not None: x += ' w:left="%d"' % ind_left
        if ind_right is not None: x += ' w:right="%d"' % ind_right
        if hanging is not None: x += ' w:hanging="%d"' % hanging
        x += '/>'
    if contextual: x += '<w:contextualSpacing/>'
    if jc: x += '<w:jc w:val="%s"/>' % jc
    if outline is not None: x += '<w:outlineLvl w:val="%d"/>' % outline
    return x + '</w:pPr>'

tmp = dst + '.tmp'
shutil.copy(src, tmp)
zin = zipfile.ZipFile(tmp)
styles = etree.fromstring(zin.read('word/styles.xml'))

def find(name=None, sid=None):
    for st in styles.findall(q('style')):
        if sid and st.get(q('styleId')) == sid: return st
        n = st.find(q('name'))
        if name and n is not None and n.get(q('val')).lower() == name.lower(): return st
    return None

ORDER = ['name', 'aliases', 'basedOn', 'next', 'link', 'autoRedefine', 'hidden', 'uiPriority', 'semiHidden',
         'unhideWhenUsed', 'qFormat', 'locked', 'personal', 'personalCompose', 'personalReply', 'rsid',
         'pPr', 'rPr', 'tblPr', 'trPr', 'tcPr', 'tblStylePr']

def define(name, kind='paragraph', sid=None, based='Normal', nxt=None, p=None, r=None, ui=None):
    if sid is None and name in NAMES:
        sid, name = name, NAMES[name]
    st = find(name=name)
    if st is None and sid: st = find(sid=sid)
    if st is None:
        st = etree.SubElement(styles, q('style'))
        st.set(q('type'), kind); st.set(q('styleId'), sid or re.sub(r'[^A-Za-z0-9]', '', name))
        n = etree.SubElement(st, q('name')); n.set(q('val'), name)
        etree.SubElement(st, q('qFormat'))
    if kind == 'paragraph' and based and st.get(q('styleId')) != 'Normal':
        b = st.find(q('basedOn'))
        if b is None: b = etree.SubElement(st, q('basedOn'))
        b.set(q('val'), based)
    if nxt:
        e = st.find(q('next'))
        if e is None: e = etree.SubElement(st, q('next'))
        e.set(q('val'), nxt)
    if ui is not None:
        e = st.find(q('uiPriority'))
        if e is None: e = etree.SubElement(st, q('uiPriority'))
        e.set(q('val'), str(ui))
    for tag, val in (('pPr', p), ('rPr', r)):
        old = st.find(q(tag))
        if old is not None: st.remove(old)
        if val: st.append(etree.fromstring(val))
    kids = list(st)
    kids.sort(key=lambda e: ORDER.index(etree.QName(e).localname) if etree.QName(e).localname in ORDER else 99)
    for k in kids: st.remove(k)
    for k in kids: st.append(k)
    return st

# valeurs par défaut du document
dd = styles.find(q('docDefaults'))
if dd is not None: styles.remove(dd)
dd = etree.fromstring(
    '<w:docDefaults xmlns:w="%s"><w:rPrDefault><w:rPr>'
    '<w:rFonts w:ascii="%s" w:hAnsi="%s" w:cs="%s" w:eastAsia="%s"/><w:sz w:val="22"/><w:szCs w:val="22"/>'
    '<w:lang w:val="fr-FR" w:eastAsia="fr-FR" w:bidi="ar-SA"/></w:rPr></w:rPrDefault>'
    '<w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault>'
    '</w:docDefaults>' % (W, FONT, FONT, FONT, FONT))
styles.insert(0, dd)

# texte courant
define('Normal', sid='Normal', based=None, p=ppr(after=120, line=276), r=rpr(size=11, color=ANTH))
define('Body Text', sid='BodyText', p=ppr(before=0, after=120), r=rpr())
define('First Paragraph', sid='FirstParagraph', p=ppr(before=0, after=120), r=rpr())
define('Compact', sid='Compact', p=ppr(before=0, after=50), r=rpr())

# titres
define('heading 1', sid='Heading1', nxt='BodyText',
       p=ppr(keep_next=True, keep_lines=True, borders={'bottom': (12, CUIVRE, 6)}, before=0, after=240, outline=0),
       r=rpr(size=22, bold=1, color=NUIT))
define('heading 2', sid='Heading2', nxt='BodyText',
       p=ppr(keep_next=True, keep_lines=True,
             borders={'top': (6, CREME, 4), 'left': (24, CUIVRE, 8), 'bottom': (6, CREME, 4)},
             shd=CREME, before=360, after=60, ind_left=227, outline=1),
       r=rpr(size=12, bold=1, color=NUIT))
define('heading 3', sid='Heading3', nxt='BodyText',
       p=ppr(keep_next=True, keep_lines=True,
             borders={'top': (6, SABLE, 4), 'left': (24, CUIVRE, 8), 'bottom': (6, SABLE, 4)},
             shd=SABLE, before=360, after=60, ind_left=227, outline=2),
       r=rpr(size=12, bold=1, color=NUIT))
define('heading 4', sid='Heading4', nxt='BodyText',
       p=ppr(keep_next=True, keep_lines=True,
             borders={'top': (6, VERT_F, 4), 'left': (24, VERT, 8), 'bottom': (6, VERT_F, 4)},
             shd=VERT_F, before=400, after=60, ind_left=227, outline=3),
       r=rpr(size=12, bold=1, color=NUIT))
define('Intertitre', nxt='BodyText', p=ppr(keep_next=True, keep_lines=True, before=240, after=90),
       r=rpr(size=11.5, bold=1, color=NUIT))
define('Rubrique', nxt='BodyText', p=ppr(keep_next=True, borders={'bottom': (4, LIGNE, 3)}, before=300, after=140),
       r=rpr(size=9.5, bold=1, color=CUIVRE, caps=1, spacing=30))
define('MentionBac', p=ppr(keep_next=True, before=0, after=140, ind_left=227), r=rpr(size=9.5))
define('Renvoi', p=ppr(before=80, after=160, ind_left=227), r=rpr(size=9))
define('LegendeSommaire', p=ppr(before=0, after=160), r=rpr(size=9, color=GRIS))
define('Surtitre', p=ppr(keep_next=True, page_break=True, before=0, after=40),
       r=rpr(size=9.5, bold=1, color=CUIVRE, caps=1, spacing=30))
define('TitreSommaire', nxt='BodyText',
       p=ppr(keep_next=True, borders={'bottom': (12, CUIVRE, 6)}, before=0, after=240),
       r=rpr(size=22, bold=1, color=NUIT))

# blocs d'une question
define('Meta', p=ppr(keep_next=True, before=60, after=140, ind_left=227), r=rpr(size=9, color=GRIS))
define('Enonce', p=ppr(borders={'left': (12, 'D9C4B5', 8)}, before=0, after=100, ind_left=227), r=rpr())
define('EnonceDonnees', p=ppr(borders={'left': (12, 'D9C4B5', 8)}, before=0, after=100, ind_left=227, contextual=True), r=rpr(size=10.5))
define('QRappel', nxt='BodyText', p=ppr(keep_next=True, keep_lines=True, before=240, after=80),
       r=rpr(bold=1, color=NUIT))

def callout(name, edge, fill):
    # keep_lines : un encadré n'est jamais coupé par un saut de page au milieu d'un paragraphe
    define(name, p=ppr(keep_lines=True, borders={'top': (6, fill, 3), 'left': (18, edge, 8), 'bottom': (6, fill, 3)},
                       shd=fill, before=0, after=100, ind_left=227, ind_right=57),
           r=rpr(size=10.5))
callout('Remarque', ARDOISE, ARDOISE_F)
callout('Methode', BLEU, BLEU_F)
callout('Piege', BRIQUE, BRIQUE_F)
callout('Redaction', CUIVRE, SABLE)
define('Retenir', p=ppr(keep_lines=True, borders={s: (8, VERT, 5) for s in ('top', 'left', 'bottom', 'right')},
                        shd=VERT_F, before=60, after=160, ind_left=1700, ind_right=1700, jc='center'),
       r=rpr())

# figures
define('Figure', sid='FigureMB', p=ppr(keep_next=True, before=120, after=40, jc='center'), r=rpr())
define('Legende', p=ppr(before=0, after=200, jc='center'), r=rpr(size=9, italic=1, color=GRIS))

# programmes en langage Python des énoncés : police à chasse fixe, fond clair, filet cuivre à gauche ; le bloc reste d'un seul tenant
MONO = 'Courier New'
def rpr_mono(size, color=ANTH):
    return rpr(size=size, color=color).replace('"%s"' % FONT, '"%s"' % MONO)
define('Source Code', sid='SourceCode', p=ppr(keep_lines=True, borders={'left': (12, CUIVRE, 8)}, shd=CREME,
       before=60, after=160, line=240, ind_left=227, ind_right=57), r=rpr_mono(9.5))
define('Verbatim Char', kind='character', sid='VerbatimChar', based=None, r=rpr_mono(9.5))

# couverture
define('CouvMarque', p=ppr(before=0, after=0), r=rpr(size=14, bold=1, color=CUIVRE, caps=1, spacing=70))
define('CouvCollection', p=ppr(before=40, after=0), r=rpr(size=9.5, color=ANTH, caps=1, spacing=40))
define('CouvNumero', p=ppr(before=3000, after=120), r=rpr(size=15, bold=1, color=CUIVRE))
define('CouvTitre', p=ppr(before=0, after=200, line=228), r=rpr(size=36, bold=1, color=NUIT))
define('CouvFilet', p=ppr(borders={'bottom': (24, CUIVRE, 1)}, before=0, after=360, ind_right=7600), r=rpr(size=4))
define('CouvSousTitre', p=ppr(before=0, after=260), r=rpr(size=14, color=ANTH))
define('CouvEdition', p=ppr(before=0, after=160), r=rpr(size=11, bold=1, color=ANTH))
define('CouvChiffres', p=ppr(before=0, after=0), r=rpr(size=10.5, color=GRIS))
define('Mentions', p=ppr(before=0, after=70, line=240, jc='both'), r=rpr(size=8, color=GRIS))
define('MentionsTete', p=ppr(borders={'top': (4, LIGNE, 8)}, before=0, after=80),
       r=rpr(size=8, bold=1, color=ANTH, caps=1, spacing=30))

# tableaux
define('Tableau', p=ppr(before=0, after=0, line=252), r=rpr(size=9.5))
define('TableauTete', p=ppr(before=0, after=0, line=252), r=rpr(size=9.5, bold=1, color='FFFFFF'))
# tableau « Ce qui est tombé » : plus serré, pour qu'il tienne sur une page avec sa synthèse
define('TableauSerre', p=ppr(before=0, after=0, line=240), r=rpr(size=9))

# sommaire
define('toc 1', sid='TOC1', ui=39, p=ppr(tabs=[('right', 'dot', TEXTW)], before=80, after=20),
       r=rpr(size=10.5, bold=1, color=NUIT))
define('toc 3', sid='TOC3', ui=39, p=ppr(tabs=[('right', 'dot', TEXTW)], before=0, after=0, line=240, ind_left=227, ind_right=400),
       r=rpr(size=9.5, color=CUIVRE))
define('toc 2', sid='TOC2', ui=39, p=ppr(tabs=[('right', 'dot', TEXTW)], before=0, after=0, line=240, ind_left=227, ind_right=400),
       r=rpr(size=9.5, color=ANTH))

# en-tête et pied de page
define('header', sid='Header', ui=99,
       p=ppr(tabs=[('right', 'none', TEXTW)], borders={'bottom': (4, LIGNE, 5)}, before=0, after=0),
       r=rpr(size=8.5, color=GRIS))
define('footer', sid='Footer', ui=99,
       p=ppr(tabs=[('right', 'none', TEXTW)], borders={'top': (4, LIGNE, 5)}, before=0, after=0),
       r=rpr(size=8.5, color=GRIS))

# page interne
define('NoteInterne', p=ppr(borders={'top': (6, ARDOISE_F, 3), 'left': (18, ARDOISE, 8), 'bottom': (6, ARDOISE_F, 3)},
                            shd=ARDOISE_F, before=0, after=200, ind_left=227), r=rpr(size=10, color=GRIS))

# styles de caractères
def cstyle(name, **kw):
    define(name, kind='character', based=None, r=rpr(**kw))
cstyle('QNum', bold=1, color=CUIVRE)
cstyle('Niv10', size=8.5, bold=1, color=ANTH, shd=CUIVRE_CLAIR)
cstyle('Niv14', size=8.5, bold=1, color='FFFFFF', shd=CUIVRE)
cstyle('Niv18', size=8.5, bold=1, color='FFFFFF', shd=ANTH)
cstyle('BoutonCorrige', size=8.5, bold=1, color='FFFFFF', shd=VERT)
cstyle('BoutonEnonce', size=8.5, bold=1, color='FFFFFF', shd=CUIVRE)
cstyle('NumCorrige', bold=1, color=VERT)
cstyle('EtiqBac', bold=1, color=CUIVRE)
cstyle('VoirBac', bold=0, color=CUIVRE, size=10.5)
cstyle('TagBac', size=8.5, bold=1, color=CUIVRE, caps=1, spacing=20)
cstyle('EtiqRemarque', bold=1, color='5A5F66')
cstyle('EtiqMethode', bold=1, color=BLEU)
cstyle('EtiqPiege', bold=1, color=BRIQUE)
cstyle('EtiqRedaction', bold=1, color=CUIVRE)
cstyle('EtiqRetenir', bold=1, color=VERT)
cstyle('Marque', bold=1, color=CUIVRE, caps=1, spacing=40)

# le lien hypertexte ne change pas l'aspect du texte (sommaire)
h = find(name='Hyperlink')
if h is not None:
    old = h.find(q('rPr'))
    if old is not None: h.remove(old)

out = zipfile.ZipFile(dst, 'w', zipfile.ZIP_DEFLATED)
for item in zin.infolist():
    data = zin.read(item.filename)
    if item.filename == 'word/styles.xml':
        data = etree.tostring(styles, xml_declaration=True, encoding='UTF-8', standalone=True)
    if item.filename == 'word/document.xml':
        # format de page (A4, marges de 2 cm) : pandoc en déduit la largeur utile, 17 cm. Sans cela il réduit
        # d'office à 14,8 cm toute image plus large, ce qui fausse les figures à l'échelle.
        page = ('<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1247" w:right="1134" w:bottom="1134" '
                'w:left="1134" w:header="567" w:footer="510" w:gutter="0"/></w:sectPr>')
        txt = data.decode('utf-8')
        assert txt.count('<w:sectPr />') + txt.count('<w:sectPr/>') == 1, 'section du modèle introuvable'
        data = txt.replace('<w:sectPr />', page).replace('<w:sectPr/>', page).encode('utf-8')
    out.writestr(item, data)
out.close(); zin.close()
import os; os.remove(tmp)
print('modèle écrit :', dst)
