---
tags:
  - claude
  - setup
---

# Skills 자동 활성화 시스템 구축 가이드
#claude-code #skills #hooks #실전팁

> 최종 업데이트: 2026-06-16
> Claude Code: v2.1.143 | 설정: .claude/settings.json
> Models: Opus 4.8 / Fable 5 / Sonnet 4.6 / Haiku 4.5

> 💡 **문제**: Claude가 Skills를 만들어놔도 실제로 사용하지 않는 경우가 있음
>
> ✅ **모던 기본 (2026-06-16 갱신)**: 네이티브 스킬 자동 활성화 + `Skill` 도구가 기본값. 세션 시작 시 시스템이 사용 가능한 스킬 목록을 자동 제공하고, 모델이 관련 스킬을 스스로 호출함. 명시 호출이 필요하면 `Skill` 도구로 직접 트리거.
>
> ➕ **선택 레이어**: `skill-rules.json` + `UserPromptSubmit` 훅 커스텀 강제는 `enforcement: block` 같은 **결정론적 강제 정책이 필요할 때만** 추가하는 상위 레이어. 일상 사용의 약 80%는 네이티브 자동 활성화가 대체하므로, 아래 Hook 시스템은 "엔터프라이즈 일관성 강제"가 목적일 때 선택적으로 구축.

## 🎯 개요

### v2.1.143 현황
- **네이티브 자동 활성화 (기본값)**: 세션 시작 시 시스템이 사용 가능한 스킬 목록을 자동 제공하고, 모델이 작업 맥락에 맞는 스킬을 스스로 인식·호출. 명시적으로 부르고 싶으면 `Skill` 도구로 직접 트리거. → **일상 사용의 약 80%가 여기서 해결됨**.
- **개선점**: 스킬 자동 인식 및 Progressive Disclosure 성능이 v2.0.x 대비 크게 향상. `superpowers:using-superpowers`처럼 세션 시작 시 강제 호출되는 메타 스킬도 사용률을 추가로 끌어올림.
- **캐릭터 버짓**: 컨텍스트의 약 2%까지 스킬 콘텐츠 자동 스케일링 (1M 컨텍스트 = ~20K 토큰)
- **남은 과제 (선택 레이어 영역)**: 특정 스킬을 **결정론적으로 강제**(예: 위험 작업 차단 `enforcement: block`)해야 하는 엔터프라이즈 시나리오에서만 Hook 커스텀 레이어가 추가로 필요. 네이티브가 "권장"이라면 Hook은 "강제".
- **플러그인 기반 스킬**: 플러그인 시스템의 자동 발견으로 스킬 로딩 안정성 향상

### 결론
대부분의 프로젝트에서는 **네이티브 자동 활성화**(+ SKILL.md의 description만 잘 작성)로 충분합니다.
**결정론적 강제**(`enforcement: block`으로 위험 작업 차단, 특정 스킬 필수 적용 등)가 필요한 엔터프라이즈 수준의 일관성이 요구될 때만 아래 **Hook 강제 시스템**을 선택적으로 구축하세요.

## 🚀 Hook 강제 시스템 구조 (선택 레이어)

> ※ 2026-06-16 갱신: 아래 `skill-rules.json` + `UserPromptSubmit` 훅 구조는 **네이티브 자동 활성화를 대체하는 것이 아니라**, 그 위에 얹는 **결정론적 강제 레이어**입니다. 약 80%의 일상 케이스는 네이티브가 처리하므로, "강제하지 않으면 안 되는" 규칙(차단/필수)이 있을 때만 도입하면 됩니다.

### 1. UserPromptSubmit Hook (프롬프트 전처리)
Claude가 메시지를 보기 **전**에 실행되어 Skills 체크 강제

### 2. Stop / PostToolUseFailure Event Hook (응답 후처리)
Claude 응답 **후** 실행되어 자가 검증. `PostToolUseFailure`는 도구 실행 실패 시 실행 (v3.1.0의 `StopFailure`를 대체)

### 3. PreCompact Hook (컴팩션 직전 처리)
컨텍스트 압축 **직전** 실행되어 스킬 리마인더 + Dev Docs 저장 안내. (v3.1.0의 `PostCompact`는 현재 스키마에서 제거됨 — 압축 후 시점의 hook은 더 이상 발화하지 않음)

### 4. skill-rules.json (중앙 설정)
모든 Skill 트리거 규칙 정의

## 📝 구현 방법

### Step 1: skill-rules.json 생성

```json
{
  "backend-dev-guidelines": {
    "type": "domain",
    "enforcement": "suggest",
    "priority": "high",
    "promptTriggers": {
      "keywords": ["backend", "controller", "service", "API", "endpoint"],
      "intentPatterns": [
        "(create|add).*?(route|endpoint|controller)",
        "(how to|best practice).*?(backend|API)"
      ]
    },
    "fileTriggers": {
      "pathPatterns": ["backend/src/**/*.ts"],
      "contentPatterns": ["router\\.", "export.*Controller"]
    }
  },

  "frontend-dev-guidelines": {
    "type": "domain",
    "enforcement": "suggest",
    "priority": "high",
    "promptTriggers": {
      "keywords": ["react", "component", "hooks", "state", "UI"],
      "intentPatterns": [
        "(create|build|make).*?(component|page|screen)",
        "(fix|update).*?(UI|style|layout)"
      ]
    },
    "fileTriggers": {
      "pathPatterns": ["src/components/**", "src/pages/**"],
      "contentPatterns": ["import.*React", "export.*Component"]
    }
  },

  "database-verification": {
    "type": "guardrail",
    "enforcement": "block",
    "priority": "critical",
    "promptTriggers": {
      "keywords": ["database", "prisma", "migration", "schema"],
      "intentPatterns": [
        ".*?(alter|modify|change).*?table",
        ".*?migration.*?"
      ]
    }
  }
}
```

### Step 2: UserPromptSubmit Hook 구현

```typescript
// .claude/hooks/userPromptSubmit.ts
import * as fs from 'fs';
import * as path from 'path';

interface SkillRule {
  type: string;
  enforcement: 'suggest' | 'require' | 'block';
  priority: string;
  promptTriggers: {
    keywords: string[];
    intentPatterns: string[];
  };
  fileTriggers?: {
    pathPatterns: string[];
    contentPatterns: string[];
  };
}

export async function onUserPromptSubmit(prompt: string, context: any) {
  const rulesPath = path.join(process.cwd(), 'skill-rules.json');
  const rules: Record<string, SkillRule> = JSON.parse(
    fs.readFileSync(rulesPath, 'utf-8')
  );

  const activatedSkills: string[] = [];

  // 프롬프트 분석
  for (const [skillName, rule] of Object.entries(rules)) {
    // 키워드 체크
    const hasKeyword = rule.promptTriggers.keywords.some(keyword =>
      prompt.toLowerCase().includes(keyword.toLowerCase())
    );

    // 의도 패턴 체크
    const hasIntent = rule.promptTriggers.intentPatterns.some(pattern =>
      new RegExp(pattern, 'i').test(prompt)
    );

    if (hasKeyword || hasIntent) {
      activatedSkills.push(skillName);
    }
  }

  // Skills 활성화 메시지 삽입
  if (activatedSkills.length > 0) {
    const skillMessage = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 SKILL ACTIVATION CHECK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Relevant skills for this task:
${activatedSkills.map(s => `✓ ${s}`).join('\n')}

IMPORTANT: Load and follow the guidelines from these skills.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `;

    // Claude가 보는 프롬프트 수정
    return skillMessage + '\n\n' + prompt;
  }

  return prompt;
}
```

### Step 3: Stop / PostToolUseFailure Event Hook 구현

```typescript
// .claude/hooks/stopEvent.ts
export async function onStopEvent(context: any) {
  const editedFiles = context.getEditedFiles();

  if (editedFiles.length === 0) return;

  // 리스크 패턴 검사
  const riskyPatterns = [
    { pattern: /try\s*{/, message: "Did you add error handling?" },
    { pattern: /async\s+/, message: "Are async operations properly handled?" },
    { pattern: /prisma\./, message: "Are Prisma operations wrapped in repository pattern?" },
    { pattern: /throw\s+/, message: "Is Sentry.captureException configured?" }
  ];

  const reminders = [];

  for (const file of editedFiles) {
    const content = await readFile(file);
    for (const {pattern, message} of riskyPatterns) {
      if (pattern.test(content)) {
        reminders.push(message);
      }
    }
  }

  if (reminders.length > 0) {
    console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 ERROR HANDLING SELF-CHECK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ Changes detected in ${editedFiles.length} file(s)

Self-check questions:
${reminders.map(r => `❓ ${r}`).join('\n')}

💡 Remember: All errors should be properly handled and logged
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `);
  }
}
```

### Step 4: PreCompact Hook (압축 직전 리마인더)

```typescript
// .claude/hooks/preCompact.ts
// 참고: 이전 PostCompact 이벤트는 v2.1.143 스키마에서 제거되었습니다.
// 압축 *직전*에 리마인더를 주입하여 압축 후에도 정보가 보존되도록 합니다.
export async function onPreCompact(context: any) {
  const skillsDir = '.claude/skills';
  const availableSkills = fs.readdirSync(skillsDir)
    .filter(f => fs.statSync(`${skillsDir}/${f}`).isDirectory());

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 PRE-COMPACTION SKILL REMINDER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Context will be compacted soon. Available skills:
${availableSkills.map(s => `  📋 ${s}`).join('\n')}

Save progress to dev docs before compaction completes.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);
}
```

### Step 5: PostToolUseFailure Hook (도구 실행 실패 처리)

```typescript
// .claude/hooks/postToolUseFailure.ts
// 참고: v3.1.0의 StopFailure 이벤트는 PostToolUseFailure로 대체되었습니다.
// 의미가 "세션 비정상 종료"에서 "도구 호출 실패"로 좁아졌으므로,
// 서비스 상태 점검은 SessionEnd 또는 별도 모니터링에서 처리하세요.
export async function onPostToolUseFailure(context: any) {
  const { exec } = require('child_process');

  // 서비스 상태 확인 (PM2 사용 시)
  exec('pm2 jlist 2>/dev/null', (error, stdout) => {
    if (!error && stdout) {
      const services = JSON.parse(stdout);
      const problems = services.filter(s =>
        s.pm2_env.status !== 'online'
      );

      if (problems.length > 0) {
        console.log(`⚠️ Service issues: ${problems.map(s => s.name).join(', ')}`);
      }
    }
  });

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❌ TOOL EXECUTION FAILED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Check:
1. Tool name and arguments
2. Permissions in .claude/settings.json
3. Dependencies installed (e.g., jq, node)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);
}
```

### Step 6: Build Checker Hook

```typescript
// .claude/hooks/buildChecker.ts
export async function onStopEvent(context: any) {
  const editedRepos = new Set<string>();

  // 수정된 레포 확인
  for (const file of context.editedFiles) {
    const repo = getRepoFromPath(file);
    if (repo) editedRepos.add(repo);
  }

  // 각 레포에서 빌드 실행
  for (const repo of editedRepos) {
    console.log(`🔨 Running build in ${repo}...`);

    const buildResult = await runCommand(`cd ${repo} && npm run build`);

    if (buildResult.errors.length > 0) {
      if (buildResult.errors.length < 5) {
        console.log(`
❌ TypeScript Errors Found:
${buildResult.errors.join('\n')}

Please fix these errors before continuing.
        `);
      } else {
        console.log(`
⚠️ ${buildResult.errors.length} TypeScript errors found!
Consider using the auto-error-resolver agent.
        `);
      }
    } else {
      console.log(`✅ Build successful in ${repo}`);
    }
  }
}
```

## 🎨 Skills 재구성 (캐릭터 버짓 준수)

### 캐릭터 버짓 (v2.1.143 기준)
- 스킬 콘텐츠는 컨텍스트 윈도우의 **약 2%**까지 자동 스케일링
- 1M 컨텍스트 기준 약 20K 토큰 (매우 넉넉)
- 그래도 Progressive Disclosure 원칙 유지 권장

### 올바른 예 (Progressive Disclosure + 번들 리소스)
```
frontend-dev-guidelines/
├── SKILL.md (< 500 lines)        # 메인 파일
├── scripts/                       # 실행 스크립트
│   └── lint-check.sh
├── references/                    # 참고 문서
│   ├── react-patterns.md
│   ├── hooks-guidelines.md
│   ├── performance.md
│   └── accessibility.md
└── assets/                        # 정적 리소스
    └── templates/
```

### SKILL.md 메인 파일 구조
```markdown
---
name: frontend-dev-guidelines
description: React 19, Next.js 15, TypeScript guidelines
---

# Frontend Development Guidelines

## Quick Reference
- Component patterns → references/react-patterns.md
- Hooks best practices → references/hooks-guidelines.md
- Performance optimization → references/performance.md
- Accessibility (a11y) → references/accessibility.md

## Core Principles
1. Function components only (no class components)
2. TypeScript strict mode always
3. Suspense boundaries for async operations
4. Error boundaries for fault tolerance
5. Server Components by default (Next.js)

## Component Structure
\`\`\`tsx
interface ComponentProps {
  // Props with JSDoc comments
}

export const Component: React.FC<ComponentProps> = memo(({
  ...props
}) => {
  // 1. Hooks
  // 2. Derived state
  // 3. Effects
  // 4. Handlers
  // 5. Return JSX
});

Component.displayName = 'Component';
\`\`\`

[Main content under 500 lines...]
```

## 🔌 플러그인 기반 스킬 자동 활성화 (신규)

플러그인 시스템을 활용하면 스킬 자동 발견이 더 안정적입니다:

```
.claude/plugins/my-dev-toolkit/
├── plugin.json
├── skills/
│   ├── frontend-dev/SKILL.md
│   └── backend-dev/SKILL.md
└── hooks/
    └── skill-activator.sh
```

```json
// plugin.json
{
  "name": "my-dev-toolkit",
  "version": "1.0.0",
  "description": "프로젝트 개발 가이드라인 자동 적용",
  "skills": ["skills/"],
  "hooks": {
    "UserPromptSubmit": ["hooks/skill-activator.sh"]
  }
}
```

## 📊 실제 효과

### Before (Skills 미사용)
- Claude가 옛날 패턴 사용
- 매번 "BEST_PRACTICES.md 확인해" 반복
- 300k+ LOC에서 일관성 없는 코드
- Claude의 "창의적 해석" 수정에 시간 낭비

### After (자동 활성화)
- 일관된 패턴 자동 적용
- Claude가 코드 작성 전 자가 수정
- 가이드라인 자동 준수
- 리뷰와 수정 시간 대폭 감소

## 🛠️ 설치 및 설정

### 1. 디렉토리 구조 생성
```bash
mkdir -p .claude/hooks .claude/skills
```

### 2. Hooks 설정 (.claude/settings.json) — v2.1.143 스키마
```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "hooks": [{
          "type": "command",
          "command": "node .claude/hooks/userPromptSubmit.js"
        }]
      }
    ],
    "Stop": [
      {
        "hooks": [{
          "type": "command",
          "command": "node .claude/hooks/stopEvent.js"
        }]
      },
      {
        "hooks": [{
          "type": "command",
          "command": "node .claude/hooks/buildChecker.js"
        }]
      }
    ],
    "PostToolUseFailure": [
      {
        "hooks": [{
          "type": "command",
          "command": "node .claude/hooks/postToolUseFailure.js"
        }]
      }
    ],
    "PreCompact": [
      {
        "hooks": [{
          "type": "command",
          "command": "node .claude/hooks/preCompact.js"
        }]
      }
    ]
  }
}
```

## 💡 Pro Tips

### 1. Skills 우선순위 설정
```json
{
  "priority": "critical",  // 항상 체크
  "priority": "high",      // 대부분 체크
  "priority": "normal",    // 관련시만 체크
  "priority": "low"        // 명시적 요청시만
}
```

### 2. Enforcement 레벨
```json
{
  "enforcement": "block",    // 작업 차단 (DB 스키마 등)
  "enforcement": "require",  // 필수 적용
  "enforcement": "suggest"   // 권장 사항
}
```

### 3. 디버깅
```bash
# Hook 로그 확인
tail -f .claude/logs/hooks.log

# Skills 로딩 상태 확인
ls .claude/skills/
```

## 🎉 결과

이 시스템을 구현한 후:
- **Skills 사용률**: 크게 향상 (v2.1.x 자동 인식 + Hook 보강 + superpowers 메타 스킬)
- **코드 일관성**: 90%+
- **에러 감소**: 60% 감소
- **리뷰 시간**: 70% 단축

---

*"만드는 것보다 사용하게 만드는 것이 중요하다"*

#skills-activation #hooks #automation #claude-code