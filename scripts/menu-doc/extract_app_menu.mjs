// src/dash/data.ts 의 MENU 리터럴을 평탄화해 JSON 으로 stdout 에 낸다.
// data.ts 는 React 를 import 하므로 통째로 실행하지 않고, MENU 배열 리터럴만
// 잘라내 평가한다(순수 객체 리터럴이라 안전).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DATA = path.join(REPO, 'src/dash/data.ts');

const text = fs.readFileSync(DATA, 'utf8');
const start = text.indexOf('const MENU = [');
if (start < 0) throw new Error(`data.ts 에서 'const MENU = [' 를 찾지 못했습니다: ${DATA}`);
const end = text.indexOf('\n];', start);
if (end < 0) throw new Error("MENU 리터럴의 닫는 '];' 를 찾지 못했습니다");
const literal = text.slice(start + 'const MENU = '.length, end + 3).replace(/;\s*$/, '');

const MENU = eval(`(${literal})`);

const out = [];
for (const top of MENU) {
  if (!top.children) {
    out.push({ area: top.label, cat: null, leaf: top.label, path: top.path || top.label, top_only: true });
    continue;
  }
  for (const mid of top.children) {
    if (!mid.children) {
      out.push({ area: top.label, cat: mid.label, leaf: mid.label, path: mid.path || mid.label, mid_only: true });
      continue;
    }
    for (const leaf of mid.children) {
      out.push({ area: top.label, cat: mid.label, leaf: leaf.label, path: leaf.path || leaf.label });
    }
  }
}
process.stdout.write(JSON.stringify(out, null, 1));
