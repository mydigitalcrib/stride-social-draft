#!/usr/bin/env python3
"""First step of the roster import (docs/ROSTER-IMPORT.md): Stride's Excel roster to JSON.

Reads only the public columns: handle, the three platform links, niche and country. Talent managers,
email set-up and the Stride OS columns are never read, so they can't reach the site.

    python scripts/roster/sheet-to-json.py "path/to/roster.xlsx" "path/outside/the/repo/sheet.json"

Needs openpyxl (pip install openpyxl).
"""
import json
import re
import sys

import openpyxl

COLUMNS = {
    'creator handle': 'handle',
    'instagram link': 'instagram',
    'tiktok link': 'tiktok',
    'youtube link': 'youtube',
    'niche': 'niche',
    'country': 'country',
}


def main(source, target):
    rows, skipped = [], []
    for ws in openpyxl.load_workbook(source, data_only=True).worksheets:
        where = None
        for row in ws.iter_rows():
            labels = [str(c.value or '').strip().lower() for c in row]
            if 'creator handle' in labels:
                where = {COLUMNS[label]: i for i, label in enumerate(labels) if label in COLUMNS}
                continue
            if not where or not any(c.value not in (None, '') for c in row):
                continue

            def value(key):
                cell = row[where[key]] if key in where and where[key] < len(row) else None
                if cell is None:
                    return ''
                if key not in ('handle', 'niche', 'country') and cell.hyperlink and cell.hyperlink.target:
                    return cell.hyperlink.target.strip()
                return str(cell.value or '').strip()

            rec = {key: value(key) for key in COLUMNS.values()}
            has_link = any(re.search(r'https?:|\.com', rec[k]) for k in ('instagram', 'tiktok', 'youtube'))
            if not re.search(r'[a-z0-9]', rec['handle'], re.I) or not (has_link or rec['niche']):
                if rec['handle']:
                    skipped.append(f"{ws.title} row {row[0].row}: {rec['handle']}")
                continue
            rows.append(rec)
    with open(target, 'w', encoding='utf-8') as f:
        json.dump(rows, f, ensure_ascii=False, indent=0)
    print(f'{len(rows)} rows written.')
    if skipped:
        print('No links and no niche, left out:', *skipped, sep='\n  ')


if __name__ == '__main__':
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])
