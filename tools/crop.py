from PIL import Image
import json, os
A='/home/user/Maxs/assets/'; P=A+'pieces/'
S=3
def crop(src, name, x0,y0,x1,y1, yoff=0):
    im=Image.open(A+src)
    im.crop((int(x0*S),int((y0-yoff)*S),int(x1*S),int((y1-yoff)*S))).save(P+name+'.png')
    return dict(name=name, w=x1-x0, h=y1-y0, x=x0, y=y0)
pcs=[]
pcs.append(crop('m_pdp_s1_raspberry.png','announce',0,0,390,62))
pcs.append(crop('m_pdp_s0_aura.png','header',0,62,390,108))
pcs.append(crop('m_pdp_s0_aura.png','thumbs',0,604,390,696))
pcs.append(crop('m_pdp_s0_aura.png','title',0,700,390,746))
pcs.append(crop('m_pdp_s0_aura.png','rating',0,752,390,794))
pcs.append(crop('m_pdp_s0_aura.png','badges',0,800,390,834))
pcs.append(crop('m_pdp_s0_aura.png','price',0,834,390,894))
pcs.append(crop('m_pdp_s0_aura.png','outlet',0,1310,390,1394))
pcs.append(crop('m_pdp_s3_trueblack.png','size_xs',0,1400,390,1545))
pcs.append(crop('m_pdp_s4_sizeS.png','size_s',0,1400,390,1545))
pcs.append(crop('m_pdp_s0_aura.png','model',0,1545,390,1602))
pcs.append(crop('m_pdp_s0_aura.png','qty',0,1610,390,1700))
meta=json.load(open(A+'capture_meta.json'))
for c in meta['colorways']:
    i=c['i']
    crop(c['file'],'cw_img_%02d'%i,0,108,390,596,yoff=62)
    crop(c['file'],'cw_grid_%02d'%i,0,930,390,1302,yoff=62)
    crop(c['file'],'cw_thumbs_%02d'%i,0,604,390,696,yoff=62)
pcs.append(dict(name='cw_img_XX',w=390,h=488,x=0,y=108)); pcs.append(dict(name='cw_grid_XX',w=390,h=372,x=0,y=930))
pcs.append(crop('m_pdp_atc_before.png','atc',0,196,390,276))
pcs.append(crop('m_pdp_atc_before.png','payments',0,276,390,312))
pcs.append(crop('m_cart_drawer.png','drawer',8,8,382,836))
pcs.append(crop('m_leggings_guide.png','guide_title',0,120,390,232))
rows=[(250,346),(355,452),(460,574),(582,682)]; cols=[(30,140),(140,250),(250,360)]
for r,(y0,y1) in enumerate(rows):
    for c,(x0,x1) in enumerate(cols):
        pcs.append(crop('m_leggings_guide.png','guide_%d%d'%(r,c),x0,y0,x1,y1))
im=Image.open(A+'m_review_summary.png'); im.save(P+'review_summary.png'); pcs.append(dict(name='review_summary',w=im.width/3,h=im.height/3,x=0,y=0))
pcs.append(crop('m_home.png','home_hero',0,108,390,694))
pcs.append(crop('m_home.png','shopnow',16,575,150,638))
json.dump(pcs, open(P+'pieces.json','w'), indent=1)
json.dump([dict(i=c['i'],name=c['name']) for c in meta['colorways']], open(P+'colorways.json','w'))
print(len(pcs))
