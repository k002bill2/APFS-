import zipfile, re, sys
from xml.etree import ElementTree as ET
NS='{http://schemas.openxmlformats.org/spreadsheetml/2006/main}'
def col2idx(ref):
    m=re.match(r'([A-Z]+)',ref); c=0
    for ch in m.group(1): c=c*26+(ord(ch)-64)
    return c-1
def load(path, sheetfile):
    z=zipfile.ZipFile(path)
    sst=[]
    if 'xl/sharedStrings.xml' in z.namelist():
        root=ET.fromstring(z.read('xl/sharedStrings.xml'))
        for si in root.findall(NS+'si'):
            sst.append(''.join(t.text or '' for t in si.iter(NS+'t')))
    root=ET.fromstring(z.read(sheetfile))
    rows={}
    for row in root.iter(NS+'row'):
        r=int(row.get('r')); cells={}
        for c in row.findall(NS+'c'):
            ref=c.get('r'); t=c.get('t'); v=c.find(NS+'v'); isel=c.find(NS+'is')
            if isel is not None:
                val=''.join(x.text or '' for x in isel.iter(NS+'t'))
            elif v is None: val=''
            elif t=='s': val=sst[int(v.text)]
            else: val=v.text or ''
            val=(val or '').strip()
            if val: cells[col2idx(ref)]=val
        if cells: rows[r]=cells
    return rows
if __name__=='__main__':
    rows=load(sys.argv[1], sys.argv[2])
    mx=max((max(c) for c in rows.values()), default=0)
    for r in sorted(rows):
        cells=rows[r]
        print(r, '|'.join(cells.get(i,'') for i in range(mx+1)), sep='\t')
