from pathlib import Path
import re
import subprocess

revision = 'db8458a99b5e670f96026372507f60546ebabdc6'
paths = [
    'assets/research-credentials.css',
    'index.html',
    'tests/browser/layout-readability.test.mjs',
    'tests/browser/method-workflow.test.mjs',
    'tests/method-workflow.test.mjs',
    'tests/redesign.test.mjs',
]
# Preserve the concurrent Method update, including its regression improvements.
for name in paths:
    content = subprocess.check_output(['git', 'show', f'{revision}:{name}'])
    Path(name).write_bytes(content)

path = Path('assets/research-credentials.css')
content, count = re.subn(r'^  #m3ez-credential-carousel-v1[^\n]*\n', '', path.read_text(), flags=re.M)
assert count == 5, count
path.write_text(content)

path = Path('tests/redesign.test.mjs')
content = path.read_text()
old = r'assert.match(source, /card\.append\(head, title, issuer, issued, verify\)/);'
new = r'assert.match(source, /card\.append\(head, title, description, footer\)/);'
assert content.count(old) == 1
content = content.replace(old, new)
content += '''

test('hero descriptions and grouped metadata come from the shared credential source', () => {
  const source = readFileSync(new URL('../assets/portfolio-interactions.js', import.meta.url), 'utf8');
  assert.match(source, /description: cert\\.description/);
  assert.match(source, /description\\.textContent = item\\.description/);
  assert.match(source, /metadata\\.append\\(issuer, document\\.createTextNode\\("·"\\), issued\\)/);
});

test('export styles cannot reintroduce generated badges or carousel grid overrides', () => {
  for (const path of ['../_next/static/chunks/03~_g8i41_-g_.css', '../_next/static/chunks/03~_g8i41_-g_-base.css', '../assets/research-credentials.css']) {
    const css = readFileSync(new URL(path, import.meta.url), 'utf8');
    assert.doesNotMatch(css, /\\.credential-carousel-(?:card|kicker|title|issuer|issued|stage)[\\s:{.\\[]/, path);
  }
});
'''
path.write_text(content)
Path(__file__).unlink()
