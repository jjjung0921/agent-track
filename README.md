# Agent Track

Claude Code와 Codex의 업데이트를 한 타임라인에 모아 보여주는 정적 사이트.

공개 사이트: [jjjung0921.github.io/agent-track](https://jjjung0921.github.io/agent-track/)

배포 상태: [![Update and deploy](https://github.com/jjjung0921/agent-track/actions/workflows/update.yml/badge.svg?branch=main)](https://github.com/jjjung0921/agent-track/actions/workflows/update.yml)

## 현재 구현

- 이번 주 릴리스·새 기능 요약, 날짜별 타임라인과 기능 모아보기, 도구·분류·기간 필터 및 검색, 릴리스 상세 화면을 제공한다.
- Claude Code와 Codex의 최근 90일 릴리스를 모으고 RSS 피드를 생성한다. 프리릴리스는 화면에서 기본으로 접어 둔다.
- Codex Cloud가 작성한 한국어 설명을 보여준다. 아직 작성되지 않은 릴리스는 원문을 보여준다. 공식 Codex 스크린샷이 기능에 직접 맞을 때만 사용하고, 없으면 가능한 경우 개략 흐름을 표시한다.

배포 확인(2026-10-18 12:44 KST): 릴리스 376개(Claude Code 74개, Codex 302개), Codex Cloud 작성 한국어 설명 9개, 작성 대기 99개, 수집된 스크린샷 0개. `data/ko.json`에 저장된 작성분은 모두 Codex Cloud 작성분이다. 최신 수치는 사이트의 동기화 시각과 [`site/data/releases.json`](site/data/releases.json)에서 확인한다.

## 데이터

| 도구 | 원문 | 날짜 |
|---|---|---|
| Claude Code | [`CHANGELOG.md`](https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md) | npm `@anthropic-ai/claude-code` 배포 시각 |
| Codex | [GitHub Releases](https://github.com/openai/codex/releases) | 릴리스 게시 시각 |
| Codex 앱 스크린샷 | [developers.openai.com/codex/changelog](https://developers.openai.com/codex/changelog) | 원본 주소를 그대로 쓰고 출처를 단다 |

- 분류(새 기능·개선·변경·수정)는 원문에서 정한다. Claude Code는 줄머리 동사(Added, Improved, Fixed, 그 밖은 변경), Codex는 절 제목(New Features, Bug Fixes …). Codex의 `## Changelog` PR 목록은 버린다.
- 적용 위치(터미널·데스크톱 앱·VS Code·SDK)는 원문 키워드로 붙인다.
- 한국어 요약·설명·사용 예시는 Codex Cloud가 원문을 바탕으로 쓴다. [`prompts/routine.md`](prompts/routine.md)의 절차로 `data/ko.json`에 저장하고, GitHub Actions가 다음 갱신 때 사이트 데이터에 반영한다. Codex 작성분이 없으면 원문을 보여준다. 원문 항목이 바뀌지 않은 Codex 작성분은 재사용한다.
- 규칙과 출력 형식은 `prompts/ko-notes.md`, `prompts/ko-notes.schema.json` 한곳에 있고, `scripts/apply-ko.mjs`가 형식·인덱스를 검사한 뒤에만 반영한다.

## 실행

```bash
npm ci
npm run dev   # http://localhost:4173
npm test
```

데이터를 직접 갱신하려면 `GITHUB_TOKEN="$(gh auth token)" npm run update`를 실행한다. 이 명령은 `site/data/releases.json`과 `site/feed.xml`을 갱신한다. 한국어 설명은 Codex Cloud 작업이 [`prompts/routine.md`](prompts/routine.md)의 절차로 별도 작성한다.

환경 변수: `WINDOW_DAYS`(기본 90일), `SITE_URL`(RSS 링크).

## 배포

`.github/workflows/update.yml`은 6시간마다, `main`에 푸시할 때, 또는 수동으로 실행된다. 데이터를 갱신해 커밋한 뒤 `site/`를 GitHub Pages에 배포한다. Pages 소스는 GitHub Actions.

원문 수집이 실패해도 이전에 커밋된 데이터로 배포를 계속한다. 따라서 배포 상태 배지의 성공은 새 데이터 수집 성공을 뜻하지 않을 수 있다. 갱신 결과는 [Actions 실행 기록](https://github.com/jjjung0921/agent-track/actions/workflows/update.yml)과 사이트의 동기화 시각에서 확인한다.

한국어 설명 생성은 GitHub Actions에서 모델 API를 호출하지 않는다. Codex Cloud 작업이 GitHub Connector로 `data/ko.json`을 `main`에 반영하면 기존 배포 워크플로가 사이트 데이터를 다시 만든다. 저장소 쓰기 권한을 확인하고 Codex Cloud에서 노트 작성·검증·게시를 완료했다. 다만 예약 도구가 이 Cloud 대화를 반복 실행 대상으로 확인하지 못해 주기 실행은 설정되지 않았다.

디자인: [Figma — Agent Track](https://www.figma.com/design/sW5qex3VKuZPK53vDuEcbY/Agent-Track)
