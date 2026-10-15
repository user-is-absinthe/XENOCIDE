"""Статические проверки автономной поставки; браузерные — browser_test.py."""
from pathlib import Path
import subprocess, re, json
root = Path(__file__).resolve().parent.parent
files = list((root / 'src').glob('*.js'))
version = re.search(r'X.version = "([^"]+)"', (root/'src'/'config.js').read_text(encoding='utf-8')).group(1)
assert json.loads((root/'package.json').read_text())['version'] == version
assert json.loads((root/'package-lock.json').read_text())['version'] == version
for file in files:
    result = subprocess.run(['node', '--check', str(file)], capture_output=True, text=True)
    assert result.returncode == 0, result.stderr
    text = file.read_text(encoding='utf-8')
    assert not re.search(r'\bfetch\s*\(|XMLHttpRequest|https?://|import\s*\(', text), file
html = (root / 'index.html').read_text(encoding='utf-8')
for src in re.findall(r'(?:src|href)="([^"]+)"', html):
    assert (root / src).is_file(), src
print(f'PASS: {len(files)} JS файлов, синтаксис, локальные ресурсы, нет сетевых API')
subprocess.run(['node', 'tools/data_test.js'], cwd=root, check=True)
if (root / 'dist').is_dir():
    for file in [root/'index.html', root/'style.css', *files]:
        assert file.read_bytes() == (root/'dist'/file.relative_to(root)).read_bytes(), f'Outdated dist: {file}'
    import zipfile
    with zipfile.ZipFile(root/'XENOCIDE-offline.zip') as archive:
        assert archive.testzip() is None
        assert 'index.html' in archive.namelist()
        assert all(not name.startswith(('.venv','node_modules')) for name in archive.namelist())
    print('PASS: dist matches source; offline ZIP is valid and contains no development environment')
