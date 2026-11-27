# TAKE THE OFFER — 면접 리허설 작전

> 압박 면접관의 왜곡된 마음을 훔쳐라.

**사이트** https://lyh6763.github.io/take-the-offer/

면접 준비를 괴도 작전처럼 연출한 웹앱입니다. 지원 회사를 조사하고(팰리스), 예고장을 만들고, 음성으로 모의 면접을 보면(잠입) 답변을 분석해 점수를 매기고 괴도 능력치가 오릅니다.

페르소나 5의 스타일에서 영감을 받은 팬 스타일 작업이며 ATLUS·SEGA와 관계없습니다. 원작의 로고·글꼴·캐릭터·음악·이미지는 쓰지 않았고, 빨강·검정·흰색 대비, 오려 붙인 글자, 사선 레이아웃 같은 스타일 모티브만 가져왔습니다.

## 기능

| 화면 | 하는 일 |
| --- | --- |
| 아지트 | 오늘 날짜, 다가오는 면접 D-day, 작전 메뉴(방향키로 이동), 오늘의 면접 팁 |
| 팰리스 | 지원 회사별 직무·면접일·인재상 키워드·예상 질문·조사 메모, 침투 진행도. 입력이 멈추면 자동 저장 |
| 예고장 | 문장을 오려 붙인 신문 글자로 렌더링, 바탕 3종, 다시 섞기, PNG 저장. 미리보기와 저장이 같은 캔버스 렌더러 |
| 잠입 | 질문 낭독(음성 합성) → 답변 음성 인식 또는 직접 입력 → 판정. 점수에 따라 "급소 명중"·"약점 간파" 컷인 |
| 작전 결과 | 평균 70점 이상이면 총공격 컷인, 문항별 등급, 얻은 경험치와 랭크 업 |
| 괴도 능력치 | 지식·담력·말솜씨·태도·매력 5종 랭크(1~5) 레이더 차트, 최근 점수 추이 |
| 설정 | 모션 줄이기, 음성 낭독·속도, 마이크, 기록 내보내기·불러오기·초기화 |

### 답변 분석

답변 시간, 분당 음절(말 속도), 군말("음", "어", "약간", "사실" 등) 횟수, 두괄식 여부, STAR(상황·과제·행동·결과) 단서, 숫자 근거를 보고 100점 만점으로 매깁니다. 직접 입력이면 말 속도를 빼고 환산합니다. 로직은 [src/lib/analysis.ts](src/lib/analysis.ts)에 있고 테스트가 함께 있습니다.

모든 기록은 이 브라우저의 localStorage에만 저장됩니다. 음성 인식은 브라우저 구현에 따라 브라우저 제조사의 서버를 거칠 수 있어 화면에 안내합니다.

## 기술

- React 19 + TypeScript + Vite, 해시 라우팅. 없는 화면 주소(예: `#/nope`)는 보여 주는 화면에 맞춰 `#/hideout`으로 바꿈([src/router.ts](src/router.ts))
- 상태: `useSyncExternalStore` 기반 작은 스토어 + localStorage ([src/store](src/store))
- 화면 전환: View Transitions API로 사선 컷 전환, 모션을 줄이면 즉시 전환
- 음성: Web Speech API(SpeechSynthesis, SpeechRecognition). 지원하지 않으면 텍스트 입력
- 예고장: 배치(`layoutRansom`)는 순수 함수, 그리기(`drawRansom`)는 Canvas 2D ([src/lib/ransom.ts](src/lib/ransom.ts))
- 글꼴: Fontsource 자체 호스팅. UI용 Black Han Sans·Anton만 첫 화면 CSS에 넣고, 예고장용 4종은 필요할 때 별도 CSS로 받음
- 테스트: Vitest 41개 (답변 분석, 예고장 배치, 능력치 계산, 저장값·가져온 기록 파일 정리, 해시 라우팅, 스타일 검수 판정)
- 린트: ESLint 9(typescript-eslint·react-hooks·jsx-a11y recommended, [eslint.config.js](eslint.config.js))와 Stylelint(recommended, [stylelint.config.js](stylelint.config.js)). 경고 0이어야 통과

## 스타일 구조

- `src/styles/tokens.css`: 기존 팔레트·글꼴·여백과 용도별 색 토큰(`--token-*`)을 정의합니다. `base.css`는 기본 요소·배경, `components.css`는 공통 UI, `screens.css`는 화면별 스타일을 맡습니다.
- 순백색 예고장 종이(`#fff`)와 기존 UI의 흰색(`--white: #fafafa`)처럼 값이 다른 색은 구분합니다. 현재 값이 같아도 비활성 버튼·D등급 배경·차트 선처럼 역할이 다르면 각각의 토큰으로 관리합니다.
- 반투명 효과는 `rgb(var(--token-effect-red-rgb) / 0.22)`처럼 RGB 채널 토큰을 사용하고, 투명도는 사용처에 둡니다. 효과용 빨강(`229 25 28`)은 기존 강조색(`--red: #d7191c`)과 다릅니다.
- 색 토큰만 정리할 때는 기존 색상값과 `rgb()` 표기 방식을 유지합니다. 수정 전 기준을 두 번 수집한 뒤 전후 캡처·요소와 가상 요소의 계산된 색·키보드 포커스를 비교합니다.

### 스타일 보존 검수

`npm run qa:styles`는 원본 CSS를 Git에서 읽어 같은 프로세스의 Vite 서버와 헤드리스 Chromium으로 검사합니다. 이미 설치된 Playwright·axe-core를 사용하므로 해당 `node_modules`와 브라우저 캐시 경로를 지정합니다. 아래는 이 포트폴리오의 로컬 환경 예시입니다.

```powershell
$env:NODE_PATH = Join-Path $env:USERPROFILE 'duoback-fit\node_modules'
$env:PLAYWRIGHT_BROWSERS_PATH = Join-Path $env:USERPROFILE 'AppData\Local\ms-playwright'
npm run qa:styles -- baseline --dir .qa-results/작업명
# CSS를 수정한 뒤 같은 기준으로 검사합니다.
npm run qa:styles -- check --dir .qa-results/작업명
```

- 네 폭(1920·1440·768·375px)의 13개 화면·상태를 각각 수집합니다. 날짜·예시 데이터·무작위 배치·폰트를 고정하고 모션 줄이기 상태의 CSS 전환·유한 애니메이션을 끝 상태로 맞춥니다.
- `baseline`은 원본을 두 번 수집해 재현성을 검사합니다. 통과한 첫 번째 수집을 이후 비교의 고정 기준으로 사용합니다. 기준 폴더·기존 수정본 기록은 덮어쓰지 않습니다.
- 계산된 색·요소 위치와 크기·포커스 기록·접근성 결과는 일치를 요구합니다. 픽셀 편차는 150픽셀 이하이면서 전체의 0.02% 이하로 제한합니다. 엄격한 픽셀 일치 건수도 함께 기록하며, 허용 편차 통과를 픽셀 차이 0으로 표현하지 않습니다.
- 정책·검수 코드·예시 데이터·Node·브라우저·잠금 파일의 버전과 해시를 기준에 남깁니다. 조건이 바뀌거나 원본 두 번의 재현성 검사가 실패하면 새 기준이 필요합니다. 추가 캡처를 골라 통과시키지 않습니다.
- 모션을 켠 화면 이동·대화상자 Enter 열기·Escape 닫기·포커스 복귀를 별도 확인합니다. `.qa-results/`에는 원본 CSS·PNG·계산값·판정 결과가 남고 Git에는 포함되지 않습니다.

## 접근성

- 모든 기능을 키보드로 사용. 화면이 바뀌면 새 화면 제목으로 포커스 이동, 본문 바로가기
- 모션 줄이기(기기 설정 또는 앱 설정)에서 회전·컷인 애니메이션을 끔
- 면접관의 질문 낭독은 '낭독 멈추기' 버튼이나 Esc로 멈춤
- 빨강 바탕 흰 글씨 대비 5.0:1, 어두운 바탕 위 작은 빨간 글씨는 밝은 빨강(6.4:1)
- 예고장 캔버스와 레이더 차트에 대체 텍스트, 오려 붙인 글자는 원문으로 읽힘
- 한국형 웹 콘텐츠 접근성 지침 2.2(KWCAG 2.2) 33개 검사항목 점검 결과와 고친 내용: [docs/ACCESSIBILITY.md](docs/ACCESSIBILITY.md) (2026-10-20 기준 미흡 0, axe-core 17개 화면 위반 0건, 320px 가로 넘침 없음)

## 실행

```bash
npm install
npm run dev
```

```bash
npm run lint
npm test
npm run typecheck
npm run build
```

OneDrive로 동기화되는 폴더에서는 `npm run build`가 글꼴 파일 수백 개를 `dist/`에 쓰다가 중간에 죽을 수 있습니다. 그럴 때는 동기화 밖으로 빌드하세요.

```bash
npx vite build --outDir ../../take-the-offer-dist
```

## 배포

- main에 푸시하면 GitHub Actions가 `npm run lint` → `npm test` → `npm run build`(타입 검사 포함)를 통과한 뒤 GitHub Pages에 배포합니다. PR에서는 검사만 하고 배포하지 않습니다([.github/workflows/deploy.yml](.github/workflows/deploy.yml)).
- `public/`의 파일은 빌드 결과에 그대로 복사됩니다.
  - `og-image.jpg`: 공유 미리보기 이미지. 타이틀 화면을 1200×630, 동작 줄이기 상태로 찍은 것이라 타이틀 화면이 바뀌면 다시 찍습니다.
  - `apple-touch-icon.png`(180)·`favicon-32.png`: 가면 아이콘
  - `404.html`: `/take-the-offer/` 아래 잘못된 경로에 GitHub Pages가 보여 주는 안내. 저장소 이름이 바뀌면 안의 절대 경로도 고칩니다.

## 다음 단계

- 면접 배틀 모드: 면접관의 질문을 적의 공격으로, 답변 전략(두괄식·STAR·수치 근거·역질문)을 스킬로 쓰는 턴제 전투 ([docs/PLAN.md](docs/PLAN.md))
