"""Создаёт автономную папку dist без изменения исходников."""
from pathlib import Path
import shutil
ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'dist'
OUT.mkdir(exist_ok=True)
for name in ('index.html', 'style.css'):
    shutil.copy2(ROOT / name, OUT / name)
shutil.copytree(ROOT / 'src', OUT / 'src', dirs_exist_ok=True)
RECORDS_HELP = '\nТаблица лидеров в главном меню: рекорды по 20 уровням и полной кампании,\nимя игрока, фильтры сложности и темпа. Чем быстрее выход, тем больше очков.\nРекорды локальные, сохраняются при новой кампании и входят в экспорт JSON.\nПолный сброс удаляет их; полигон не записывает рекорды.\nАптечки при полном здоровье остаются на земле.\n'
(OUT / 'README.txt').write_text('XENOCIDE — автономная игра\n\nРаспакуйте ВСЮ папку и дважды щёлкните index.html в Microsoft Edge.\nИнтернет, сервер и дополнительные программы не нужны.\n\nWASD — движение; мышь — прицел; ЛКМ — огонь; ПКМ — усиленный режим.\nR — перезарядка; Shift — бег; Space — рывок; E — взаимодействие.\nКолесо — оружие; 1–9 — слоты; 0 — следующий слот; M — карта; Esc — пауза.\n\nСохранения привязаны к папке игры и профилю Edge. Используйте экспорт JSON\nв настройках для резервной копии или переноса. При запрете localStorage\nигра покажет предупреждение, JSON остаётся доступен.\n\nПолигон в главном меню открывает все 20 карт и чит-коды:\nCREDITS (+10000), AMMO, NORELOAD, GOD, ARSENAL.\nЧиты работают в копии профиля и не меняют сохранение кампании.\nВ паузе доступны отдельное отключение музыки и общий mute.\n',encoding='utf-8-sig')
with (OUT / 'README.txt').open('a', encoding='utf-8') as readme:
    readme.write(RECORDS_HELP)
shutil.make_archive(str(ROOT / 'XENOCIDE-offline'), 'zip', OUT)
print('Автономная сборка:', OUT)
