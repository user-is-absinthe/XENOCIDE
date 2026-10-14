"""Реальные покупки всех боеприпасов и размеры карточек в автономном Edge."""
from pathlib import Path
import json, os, sys
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent
ART=ROOT/'artifacts';ART.mkdir(exist_ok=True)
os.environ['TEMP']=os.environ['TMP']=str(ROOT/'.venv'/'tmp')
with sync_playwright() as p:
    browser=p.chromium.launch(channel='msedge',headless=True)
    results=[]
    for width,height,dpi in [(1280,720,1),(1024,768,2),(640,800,1)]:
        context=browser.new_context(viewport={'width':width,'height':height},device_scale_factor=dpi,offline=True)
        page=context.new_page();errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto((ROOT/'dist'/'index.html').as_uri())
        page.evaluate('X.profile=X.Save.defaults();X.profile.credits=10000;X.Save.write(X.profile)')
        page.get_by_role('button',name='АРСЕНАЛ И УЛУЧШЕНИЯ',exact=True).click()
        dimensions=page.locator('.ammo-icon').evaluate_all('(items)=>items.map(c=>({width:c.getBoundingClientRect().width,height:c.getBoundingClientRect().height}))')
        page.screenshot(path=str(ART/f'shop-{width}.png'))
        if '--reproduce' in sys.argv:
            print(json.dumps({'before':dimensions},ensure_ascii=False))
            browser.close();sys.exit(0)
        assert all(r['width']==44 and r['height']==44 for r in dimensions),dimensions
        for ammo in page.evaluate('Object.keys(X.ammo)'):
            before=page.evaluate('(ammo)=>({credits:X.profile.credits,amount:X.profile.ammo[ammo],price:X.ammo[ammo].price,pack:X.ammo[ammo].pack})',ammo)
            page.locator(f'[data-act="buyammo:{ammo}"]').click(timeout=4000)
            after=page.evaluate('(ammo)=>({credits:X.profile.credits,amount:X.profile.ammo[ammo]})',ammo)
            assert after['credits']==before['credits']-before['price'],(ammo,before,after)
            assert after['amount']==before['amount']+before['pack'],(ammo,before,after)
        assert page.locator('.panel').evaluate('(p)=>p.scrollWidth<=p.clientWidth'),'horizontal overflow'
        page.reload()
        assert page.evaluate('X.profile.credits')==9180,'purchases not saved'
        assert not errors,errors
        results.append({'viewport':[width,height],'dpi':dpi,'purchases':6,'icons':'44x44','saved':True})
        context.close()
    browser.close()
    print(json.dumps({'PASS':results},ensure_ascii=False))
