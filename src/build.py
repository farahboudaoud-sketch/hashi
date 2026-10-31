"""Assemble www/index.html (APK, polices locales) et preview.html (version web, polices Google Fonts)."""
import base64, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
src = root / 'src'
tpl = (src / 'template.html').read_text()
code = tpl.replace('/*ENGINE*/', (src / 'engine.js').read_text()).replace('/*UI*/', (src / 'ui.js').read_text() + (src / 'native.js').read_text())
digits = base64.b64encode((root / 'www/fonts/zkg-digits-700.woff2').read_bytes()).decode()
digits_face = ("@font-face{font-family:'Chiffres';font-weight:700;font-display:block;"
               "src:url(data:font/woff2;base64," + digits + ") format('woff2');unicode-range:U+0030-003A,U+002B,U+00B7,U+00D7,U+2014,U+2212}\n")
local = ''
for w in (400, 600, 800):
    local += f"@font-face{{font-family:'Shippori Mincho';font-weight:{w};font-display:block;src:url(fonts/sm-latin-{w}.woff2) format('woff2')}}\n"
    local += f"@font-face{{font-family:'Shippori Mincho';font-weight:{w};font-display:block;src:url(fonts/sm-jp-{w}.woff2) format('woff2');unicode-range:U+3000-9FFF,U+FF00-FFEF}}\n"
(root / 'www/index.html').write_text(code.replace('<!--FONTLINKS-->', '').replace('/*FONTFACES*/', local + digits_face))
gf = ('<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
      '<link href="https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@400;600;800&display=swap" rel="stylesheet">')
(root / 'preview.html').write_text(code.replace('<!--FONTLINKS-->', gf).replace('/*FONTFACES*/', digits_face))
print('ok')
