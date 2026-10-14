"""Edge: реальный file:// запуск, gameplay и инварианты данных."""
from pathlib import Path
import json, os, sys
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
ART = ROOT / 'artifacts'
ART.mkdir(exist_ok=True)
os.environ['TEMP'] = os.environ['TMP'] = str(ROOT / '.venv' / 'tmp')
errors, requests = [], []
with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True, args=['--allow-file-access-from-files'])
    page = browser.new_page(viewport={'width':1280,'height':720}, device_scale_factor=1)
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('request', lambda request: requests.append(request.url))
    page.goto((ROOT / 'index.html').as_uri())
    page.get_by_role('button', name='НОВАЯ КАМПАНИЯ').click()
    page.wait_for_timeout(200)
    assert page.evaluate('X.game.state') == 'play'
    start = page.evaluate('X.game.player.x')
    page.keyboard.down('KeyD')
    page.wait_for_timeout(400)
    page.keyboard.up('KeyD')
    assert page.evaluate('X.game.player.x') > start + 20
    page.mouse.move(900,360)
    page.mouse.down()
    page.wait_for_timeout(450)
    page.mouse.up()
    assert page.evaluate('X.game.mags[1]') < 14
    page.keyboard.press('Escape')
    assert page.evaluate('X.game.state') == 'pause'
    before = page.evaluate('X.game.time')
    page.wait_for_timeout(100)
    assert page.evaluate('X.game.time') == before
    page.keyboard.press('Escape')
    page.evaluate('X.game.waveTimer=0')
    page.wait_for_timeout(1500)
    assert page.evaluate('X.game.activeEnemies()') > 0
    page.screenshot(path=str(ART / 'stage1.png'))
    result = page.evaluate('''() => {
      let g=X.game, m=g.map, reachable=m.bfs(g.player.x,g.player.y);
      let points=[g.level.start,g.level.exit,...g.level.spawns,...g.level.targets];
      if(!points.every(a=>m.field[m.index(...Object.values(m.point(a)))]>=0))throw Error('unreachable');
      let p=g.player; p.x=48+15;p.y=48+15;m.move(p,-100,0);
      if(!m.fits(p.x,p.y,p.r))throw Error('wall collision');
      g.checkpoint();let cp=JSON.stringify(X.profile.checkpoint);g.start(1,JSON.parse(cp));
      return {reachable,restored:g.wave,weapons:X.weapons.length,enemies:X.enemies.length};
    }''')
    battle = page.evaluate((ROOT / 'tools' / 'battle_checks.js').read_text(encoding='utf-8'))
    campaign = page.evaluate((ROOT / 'tools' / 'campaign_checks.js').read_text(encoding='utf-8'))
    assert not errors, errors
    assert not any(x.startswith(('http:', 'https:')) for x in requests), requests
    print(json.dumps({'PASS':result,'battle':battle,'campaign':campaign,'errors':errors,'network':0},ensure_ascii=False))
    browser.close()
