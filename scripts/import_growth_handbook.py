#!/usr/bin/env python3
"""Bounded, public reference import. No login, user posts, or production DB writes.

Run manually, never at app startup. Original IPA is read-only. WHO workbooks
and category icon bytes are checksummed; generated data is reviewed/committed.
"""
import argparse
import base64
import hashlib
import io
import json
from pathlib import Path
import re
import urllib.request
import xml.etree.ElementTree as ET
import zipfile

ROOT = Path(__file__).resolve().parents[1]
BASE = 'https://cdn.who.int/media/docs/default-source/child-growth/child-growth-standards/indicators/'
NS = {'s': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}

def fetch(url, payload=None):
    req = urllib.request.Request(url, data=None if payload is None else json.dumps(payload).encode(),
        headers={'User-Agent': 'AnNamReferenceImport/1.0', 'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=45) as response:
        data = response.read(10_000_001)
    if len(data) > 10_000_000:
        raise ValueError('Reference file too large')
    return data

def save(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')

def workbook(data):
    with zipfile.ZipFile(io.BytesIO(data)) as z:
        shared = []
        if 'xl/sharedStrings.xml' in z.namelist():
            shared = [''.join(s.itertext()) for s in ET.fromstring(z.read('xl/sharedStrings.xml'))]
        rows = []
        for row in ET.fromstring(z.read('xl/worksheets/sheet1.xml')).findall('.//s:row', NS):
            values = []
            for cell in row.findall('s:c', NS):
                value = cell.find('s:v', NS)
                text = value.text if value is not None else ''.join(cell.itertext())
                if cell.get('t') == 's': text = shared[int(text)]
                values.append(text)
            rows.append(values)
    return rows

def who():
    result = {'source': 'WHO Child Growth Standards', 'retrievedAt': '2026-10-13',
        'note': 'Monthly z-score tables; lines connect published points, not clinical scoring. Length and standing height are separate.',
        'datasets': []}
    for sex in ['girls', 'boys']:
        for metric, indicator, filename in [
            ('weight', 'weight-for-age', f'wfa_{sex}_0-to-5-years_zscores.xlsx'),
            ('length', 'length-height-for-age', f'lhfa_{sex}_0-to-2-years_zscores.xlsx'),
            ('height', 'length-height-for-age', f'lhfa_{sex}_2-to-5-years_zscores.xlsx'),
            ('head', 'head-circumference-for-age', f'hcfa-{sex}-0-5-zscores.xlsx'),
        ]:
            url = BASE + indicator + '/' + filename
            data = fetch(url)
            rows = workbook(data)
            header = rows[0]
            # WHO tables label columns Month, SD2neg, SD0, SD2.
            index = {name: header.index(name) for name in ['Month', 'SD2neg', 'SD0', 'SD2']}
            points = [{key: float(row[index[col]]) for key, col in
                [('age', 'Month'), ('low', 'SD2neg'), ('median', 'SD0'), ('high', 'SD2')]}
                for row in rows[1:] if row and len(row) >= len(header)]
            assert len(points) >= 25 and all(p['low'] < p['median'] < p['high'] for p in points)
            result['datasets'].append({'sex': 'female' if sex == 'girls' else 'male',
                'metric': metric, 'url': url, 'page': 'https://www.who.int/tools/child-growth-standards/standards/'+indicator,
                'sha256': hashlib.sha256(data).hexdigest(), 'points': points})
            print(metric, sex, len(points))
    save(ROOT/'src/data/current/who-growth.json', result)

def legacy(ipa):
    with zipfile.ZipFile(ipa) as z:
        bundle = z.read('Payload/becuame.app/main.jsbundle').decode()
        # Record the observed UI rather than claiming server icons are in the IPA.
        evidence = {'ipaSha256': hashlib.sha256(ipa.read_bytes()).hexdigest(),
            'bundleSha256': hashlib.sha256(bundle.encode()).hexdigest(), 'version': '1.2.21',
            'modules': {'tabs': 1856, 'tabLabels': 1857, 'threeColumnGrid': 1858, 'remoteCategoryIcons': 1860, 'growth': 1516},
            'fetalNote': 'Legacy chart manufactures +/-20% around an average. An Nam does not label that as a clinical normal range.',
            'articleNote': 'Handbook categories and article bodies are server supplied, not embedded articles in this IPA.'}
        save(ROOT/'src/data/legacy/handbook-audit.json', evidence)
        for name in ['ic_height@3x.png', 'ic_weight@3x.png', 'icon_pregnant@3x.png', 'father_and_mom.png']:
            member = 'Payload/becuame.app/assets/src/shared/assets/images/' + name
            out = ROOT/'assets/legacy'/name.replace('@3x','-3x')
            out.write_bytes(z.read(member))
    cats, images = [], {}
    for kind in ['pre_pregnant', 'pregnant', 'mom']:
        query = 'query($type:HandbookCategoryType!){findHandbookCategoryListByType(type:$type){id type label slug icon enabled group{id}}}'
        body = json.loads(fetch('https://api.becuame.com/graphql', {'query': query, 'variables': {'type': kind}}))
        for item in body['data']['findHandbookCategoryListByType']:
            if not item['enabled']: continue
            assert re.fullmatch(r'static/handbook-categories/[a-z_]+/[a-z0-9-]+\.png', item['icon'])
            url = 'https://static.cdn.becuame.com/' + item['icon']
            data = fetch(url)
            assert data.startswith(b'\x89PNG\r\n\x1a\n')
            dest = ROOT/'assets/handbook'/f"category-{item['id']}.png"
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(data)
            images[item['id']] = {'uri': 'data:image/png;base64,' + base64.b64encode(data).decode()}
            cats.append({**item, 'sourceUrl': url, 'sha256': hashlib.sha256(data).hexdigest()})
    save(ROOT/'src/data/legacy/handbook-categories.json', cats)
    save(ROOT/'src/data/handbookImageSources.json', images)
    print('Original categories/icons:', len(cats))

if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('--who', action='store_true')
    p.add_argument('--ipa', type=Path)
    args = p.parse_args()
    if args.who: who()
    if args.ipa: legacy(args.ipa)
