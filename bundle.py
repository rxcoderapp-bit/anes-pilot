# -*- coding: utf-8 -*-
"""
AnesPilot - Single File Standalone HTML Generator
Bundles CSS and all JS modules into one self-contained HTML file.
"""
import re

def build_standalone():
    with open('css/app.css', 'r', encoding='utf-8') as f:
        css = f.read()

    with open('js/data/drugData.js', 'r', encoding='utf-8') as f:
        drug_js = f.read().replace('export const DRUG_DATABASE', 'const DRUG_DATABASE')

    with open('js/data/asraData.js', 'r', encoding='utf-8') as f:
        asra_js = f.read().replace('export const ASRA_DATABASE', 'const ASRA_DATABASE')

    with open('js/engines/dosing.js', 'r', encoding='utf-8') as f:
        dosing_js = re.sub(r'import\s+.*?;', '', f.read()).replace('export class DosingEngine', 'class DosingEngine')

    with open('js/engines/crisis.js', 'r', encoding='utf-8') as f:
        crisis_js = re.sub(r'export\s+', '', f.read())

    with open('js/engines/toxicity.js', 'r', encoding='utf-8') as f:
        tox_js = re.sub(r'export\s+', '', f.read())

    with open('js/engines/infusion.js', 'r', encoding='utf-8') as f:
        inf_js = re.sub(r'export\s+', '', f.read())

    with open('js/engines/scores.js', 'r', encoding='utf-8') as f:
        scores_js = re.sub(r'export\s+', '', f.read())

    with open('js/services/cloudSync.js', 'r', encoding='utf-8') as f:
        cloud_js = re.sub(r'export\s+', '', f.read())

    with open('js/app.js', 'r', encoding='utf-8') as f:
        app_js = re.sub(r'import\s+.*?;', '', f.read())
        app_js = re.sub(r'export\s+(const|function|class)', r'\1', app_js)

    combined_js = '\n;\n'.join([
        cloud_js,
        drug_js,
        asra_js,
        dosing_js,
        crisis_js,
        tox_js,
        inf_js,
        scores_js,
        app_js
    ])

    with open('index.html', 'r', encoding='utf-8') as f:
        html = f.read()

    html = html.replace('<link rel="stylesheet" href="./css/app.css">', f'<style>\n{css}\n</style>')
    html = html.replace('<script type="module" src="./js/app.js"></script>', f'<script>\n{combined_js}\n</script>')

    with open('standalone.html', 'w', encoding='utf-8') as f:
        f.write(html)

    print(f"Successfully generated standalone.html ({len(html)} bytes)")

if __name__ == '__main__':
    build_standalone()
