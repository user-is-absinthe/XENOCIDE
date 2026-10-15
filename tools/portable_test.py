"""Проверка игры из отдельно скопированной папки и объяснений усилений."""
from pathlib import Path
import json, os, re, shutil, tempfile
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
ART = ROOT / 'artifacts'
ART.mkdir(exist_ok=True)
TEMP = ROOT / '.venv' / 'tmp'
TEMP.mkdir(exist_ok=True)
os.environ['TEMP'] = os.environ['TMP'] = str(TEMP)
with tempfile.TemporaryDirectory(prefix='portable-', dir=TEMP) as work:
    copied = Path(work) / 'Игра XENOCIDE'
    shutil.copytree(ROOT / 'dist', copied)
    html = (copied / 'index.html').read_text(encoding='utf-8')
    expected = {'index.html', 'README.txt', *re.findall(r'(?:src|href)="([^"]+)"', html)}
    actual = {p.relative_to(copied).as_posix() for p in copied.rglob('*') if p.is_file()}
    assert actual == expected, (actual - expected, expected - actual)
    with sync_playwright() as p:
        browser = p.chromium.launch(channel='msedge', headless=True)
        context = browser.new_context(viewport={'width':1280,'height':720}, offline=True)
        page = context.new_page()
        errors, network = [], []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.on('request', lambda r: network.append(r.url) if r.url.startswith(('http:','https:')) else None)
        page.goto((copied / 'index.html').as_uri())
        page.get_by_role('button', name='НОВАЯ КАМПАНИЯ', exact=True).click()
        page.get_by_role('button', name='НАЧАТЬ ОПЕРАЦИЮ', exact=True).click()
        assert page.evaluate('X.game.state === "play" && X.game.player.hp === 100')
        page.evaluate('''() => {
          X.game.pause(); X.UI.menu(); X.profile=X.Save.defaults();
          X.profile.owned=X.weapons.map((_,i)=>i); X.profile.unlocked=20;
          X.profile.credits=100000; X.UI.shop();
        }''')
        assert page.locator('.weapon-mod-info').count() == 13
        assert page.locator('[data-weapon="3"] .weapon-mod-info').inner_text().find('Урон одной дробины') >= 0
        assert 'горения не меняется' in page.locator('[data-weapon="7"] .weapon-mod-info').inner_text()
        pistol = page.locator('[data-weapon="1"]')
        for before, after in [('30','33,6'), ('33,6','37,2'), ('37,2','40,8')]:
            assert f'{before} → {after}' in pistol.locator('.weapon-mod-info').inner_text()
            pistol.locator('[data-act="mod:1"]').click()
        assert '40,8' in pistol.locator('.weapon-mod-info').inner_text()
        assert '+36%' in pistol.locator('.weapon-mod-info').inner_text()
        assert pistol.locator('[data-act="mod:1"]').is_disabled()
        assert '₡' not in pistol.locator('[data-act="mod:1"]').inner_text()
        page.evaluate('X.profile.upgrades.power=2;X.UI.shop()')
        assert '46,8' in pistol.locator('.weapon-mod-info').inner_text()
        pistol.scroll_into_view_if_needed()
        page.mouse.move(10,10)
        page.evaluate("X.UI.hideWeaponTooltip();document.getElementById('toast').classList.remove('visible')")
        page.wait_for_timeout(500)
        page.screenshot(path=str(ART / 'weapon-upgrade.png'))
        damage = page.evaluate('''() => {
          X.game.start(1); X.game.switchWeapon(1); X.game.fire(false);
          const shot=X.game.shots.items.find(s=>s.active&&!s.enemy);
          if(X.game.mags[1]!==13) throw Error('upgrade changed ammo consumption');
          X.game.pause();return shot.damage;
        }''')
        assert abs(damage - 46.8) < 1e-8, damage
        page.reload()
        assert page.evaluate('X.profile.weaponMods.pistol===3 && X.profile.upgrades.power===2')
        battle = page.evaluate((ROOT / 'tools' / 'battle_checks.js').read_text(encoding='utf-8'))
        assert not errors and not network, (errors, network)
        browser.close()
        report = {'copiedFileLaunch':True, 'files':len(actual), 'upgradeCards':13, 'threeLevels':True,
                  'damageWithImplant':damage, 'battle':battle, 'saved':True, 'errors':errors, 'network':len(network)}
        (ART / 'portable-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2), encoding='utf-8')
        print(json.dumps(report,ensure_ascii=False))
