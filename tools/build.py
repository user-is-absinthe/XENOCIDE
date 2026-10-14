"""Создаёт автономную папку dist без изменения исходников."""
from pathlib import Path
import shutil
ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'dist'
OUT.mkdir(exist_ok=True)
for name in ('index.html', 'style.css'):
    shutil.copy2(ROOT / name, OUT / name)
shutil.copytree(ROOT / 'src', OUT / 'src', dirs_exist_ok=True)
print('Автономная сборка:', OUT)
