# Agent Track

Claude Code와 Codex의 업데이트를 한 타임라인에 모아 보여주는 정적 사이트.

공개 사이트: [jjjung0921.github.io/agent-track](https://jjjung0921.github.io/agent-track/)

배포 상태: [![Update and deploy](https://github.com/jjjung0921/agent-track/actions/workflows/update.yml/badge.svg?branch=main)](https://github.com/jjjung0921/agent-track/actions/workflows/update.yml)

## 현재 구현

- 이번 주 릴리스·새 기능 요약, 날짜별 타임라인과 기능 모아보기, 도구·분류·기간 필터 및 검색, 릴리스 상세 화면을 제공한다.
- Claude Code 릴리스, Codex 오픈소스/CLI 릴리스, Codex 앱·모바일·일반 변경 기록의 최근 90일 항목을 모으고 RSS 피드를 생성한다. 내용 없는 알파 릴리스는 제외하고, 내용이 있는 프리릴리스는 화면에서 기본으로 접어 둔다.
- Codex가 작성한 한국어 설명을 보여준다. 기존 캐시는 Codex Cloud가 작성했고, 이후 새 설명은 로컬 Codex CLI가 작성한다. 아직 작성되지 않은 릴리스는 원문을 보여준다. 공식 Codex 스크린샷이 기능에 직접 맞을 때만 사용하고, 없으면 가능한 경우 개략 흐름을 표시한다.

수집 검증(2026-10-18): 최근 90일 항목 159건(Claude Code 74건, Codex GitHub 릴리스 36건, OpenAI 공식 Codex 변경 기록 49건). Codex GitHub 릴리스의 원문 항목 284개와 공식 변경 기록의 원문 항목 254개를 확인했다. 한국어 설명은 로컬 작업이 순차적으로 추가하므로 최신 작성 수와 동기화 시각은 [`site/data/releases.json`](site/data/releases.json)에서 확인한다.

## 데이터

| 도구 | 원문 | 날짜 |
|---|---|---|
| Claude Code | [`CHANGELOG.md`](https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md) | npm `@anthropic-ai/claude-code` 배포 시각 |
| Codex 오픈소스/CLI | [openai/codex GitHub Releases](https://github.com/openai/codex/releases) | 릴리스 게시 시각 |
| Codex 앱·모바일·일반 | [OpenAI 공식 변경 기록](https://developers.openai.com/codex/changelog) | 원문에 표시된 날짜 |
| Codex 앱 스크린샷 | [OpenAI 공식 변경 기록](https://developers.openai.com/codex/changelog) | 원본 주소를 그대로 쓰고 출처를 단다 |

- 분류(새 기능·개선·변경·수정)는 원문에서 정한다. Claude Code는 줄머리 동사(Added, Improved, Fixed, 그 밖은 변경), Codex는 절 제목(New Features, Bug Fixes …)과 항목의 동사를 사용한다. GitHub 릴리스의 `## Changelog` PR 목록은 사용자 변경 설명과 구분해 제외한다.
- 적용 위치(터미널·데스크톱 앱·VS Code·SDK)는 원문 키워드로 붙인다.
- 한국어 요약·설명·사용 예시는 릴리스 원문을 바탕으로 작성한다. Mac에 로그인한 동안 로컬 작업이 1분마다 `main`의 변경을 확인하고, 새 원문이나 미작성 항목이 있으면 Codex CLI의 GPT-6-Luna 모델로 분할된 작업을 병렬 실행한다. 결과가 누락되거나 검증에 실패한 항목은 GPT-6-Sol로 개별 재시도한 뒤 [`prompts/routine.md`](prompts/routine.md)의 절차로 `data/ko.json`에 저장한다. 변경분을 `main`에 푸시하면 GitHub Actions가 사이트를 배포한다. Codex 작성분이 없으면 원문을 보여준다. 원문 항목이 바뀌지 않은 기존 Codex 작성분은 재사용한다.
- 규칙과 출력 형식은 `prompts/ko-notes.md`, `prompts/ko-notes.schema.json` 한곳에 있고, `scripts/apply-ko.mjs`가 형식·인덱스를 검사한 뒤에만 반영한다.

## 실행

```bash
npm ci
npm run dev   # http://localhost:4173
npm test
```

데이터를 직접 갱신하려면 `GITHUB_TOKEN="$(gh auth token)" npm run update`를 실행한다. 이 명령은 `site/data/releases.json`과 `site/feed.xml`을 갱신한다.

로컬 자동화는 macOS에서 `node`, `git`, `gh`, `codex`를 설치하고 `gh auth login`과 `codex login`을 마친 뒤 등록한다. 저장소의 `main` 푸시 권한과 GitHub Pages 배포 설정이 필요하다.

```bash
node scripts/install-local-routine.mjs             # 등록하고 즉시 실행
node scripts/local-routine.mjs                     # 수동 실행
node scripts/install-local-routine.mjs --uninstall # 등록 해제
```

실행 기록은 `~/Library/Logs/agent-track/routine.log`와 `routine-error.log`에서 확인한다. 작업은 임시 클론에서 실행되므로 현재 체크아웃의 미완료 변경을 건드리지 않는다. 로그인한 Mac이 켜져 있고 네트워크에 연결되어 있으면 원문 데이터가 `main`에 반영된 뒤 다음 1분 확인 때 번역을 시작한다. 변경이 없으면 모델을 실행하지 않는다. 잠자기나 전원 종료 중 놓친 변경은 다음 로그인 또는 확인 때 처리한다. Codex CLI는 ChatGPT 로그인과 해당 플랜의 사용량 한도를 따른다. GitHub Actions에 OpenAI API 키를 설정할 필요는 없다.

환경 변수: `WINDOW_DAYS`(기본 90일), `SITE_URL`(RSS 링크).

## 배포

`.github/workflows/update.yml`은 6시간마다, `main`에 푸시할 때, 또는 수동으로 실행된다. 워크플로는 원문 데이터를 수집하고 `site/`를 GitHub Pages에 배포한다. 로컬 작업은 새 데이터나 미작성 노트가 있으면 한 번에 최대 8건, 원문 항목 약 240개 이내로 나눠 작성·검증하고, 변경 파일만 푸시한다. 작성 대기가 남으면 다음 확인에서 계속한다. 변경이 없으면 푸시하지 않는다. Pages 소스는 GitHub Actions.

원문 수집이 실패해도 이전에 커밋된 데이터로 배포를 계속한다. 따라서 배포 상태 배지의 성공은 새 데이터 수집 성공을 뜻하지 않을 수 있다. 갱신 결과는 [Actions 실행 기록](https://github.com/jjjung0921/agent-track/actions/workflows/update.yml)과 사이트의 동기화 시각에서 확인한다.

로컬 Codex CLI 작성에는 별도의 OpenAI API 키가 필요하지 않다. 기존 GitHub Actions의 원문 수집과 Pages 배포는 Mac이 꺼져 있어도 계속되며, 한국어 노트 작성은 다음 로컬 실행에서 이어진다.

디자인: [Figma — Agent Track](https://www.figma.com/design/sW5qex3VKuZPK53vDuEcbY/Agent-Track)
