# Agent Track

Claude Code와 Codex의 업데이트를 한 타임라인에 모아 보여주는 정적 사이트.

## 데이터

| 도구 | 원문 | 날짜 |
|---|---|---|
| Claude Code | [`CHANGELOG.md`](https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md) | npm `@anthropic-ai/claude-code` 배포 시각 |
| Codex | [GitHub Releases](https://github.com/openai/codex/releases) | 릴리스 게시 시각 |
| Codex 앱 스크린샷 | [developers.openai.com/codex/changelog](https://developers.openai.com/codex/changelog) | 원본 주소를 그대로 쓰고 출처를 단다 |

- 분류(새 기능·개선·변경·수정)는 원문에서 정한다. Claude Code는 줄머리 동사(Added, Improved, Fixed, 그 밖은 변경), Codex는 절 제목(New Features, Bug Fixes …). Codex의 `## Changelog` PR 목록은 버린다.
- 적용 위치(터미널·데스크톱 앱·VS Code·SDK)는 원문 키워드로 붙인다.
- 한국어 요약·설명·사용 예시는 `ANTHROPIC_API_KEY`가 있을 때 Claude(`claude-opus-5-5`)가 원문만 보고 쓴다. 키가 없으면 원문을 그대로 보여준다. 한 번 쓴 설명은 원문 항목이 바뀌지 않는 한 다시 쓰지 않는다.
- 요청은 `fallbacks: "default"`(서버 측 대체 모델)를 켠다. 안전 분류기가 거절하면 Anthropic이 고른 다른 모델이 이어서 답한다.

## 실행

```bash
npm ci
GITHUB_TOKEN=$(gh auth token) ANTHROPIC_API_KEY=... npm run update
npm run dev   # http://localhost:4173
npm test
```

환경 변수: `WINDOW_DAYS`(기본 90일), `MAX_ENRICH`(한 번에 한국어로 쓸 릴리스 수, 기본 15), `SITE_URL`(RSS 링크).

## 배포

`.github/workflows/update.yml`이 6시간마다 데이터를 갱신해 커밋하고 `site/`를 GitHub Pages에 올린다. 저장소 설정에서 Pages 소스를 GitHub Actions로 두고, `ANTHROPIC_API_KEY` 시크릿을 넣는다.

디자인: [Figma — Agent Track](https://www.figma.com/design/sW5qex3VKuZPK53vDuEcbY/Agent-Track)
