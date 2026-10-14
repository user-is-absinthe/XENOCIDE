"""Статические проверки автономной поставки; браузерные — browser_test.py."""
from pathlib import Path
import subprocess, re
root = Path(__file__).resolve().parent.parent
files = list((root / 'src').glob('*.js'))
for file in files:
    result = subprocess.run(['node', '--check', str(file)], capture_output=True, text=True)
    assert result.returncode == 0, result.stderr
    text = file.read_text(encoding='utf-8')
    assert not re.search(r'\bfetch\s*\(|XMLHttpRequest|https?://|import\s*\(', text), file
html = (root / 'index.html').read_text(encoding='utf-8')
for src in re.findall(r'(?:src|href)="([^"]+)"', html):
    assert (root / src).is_file(), src
print(f'PASS: {len(files)} JS файлов, синтаксис, локальные ресурсы, нет сетевых API')
