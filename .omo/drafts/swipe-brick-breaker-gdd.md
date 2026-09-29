# Draft: 남강유향 스와이프 벽돌깨기

## Requirements (confirmed)
- 스와이프 벽돌깨기 버전의 게임을 기획한다.
- 결과물은 Markdown 기획서다.

## Technical Decisions
- 플랫폼: 모바일 브라우저, 세로 화면.
- 입력: 한 손 스와이프 조작.
- 세션: 짧은 스테이지 단위 플레이.
- 기존 프로젝트의 브랜드 가이드(남강, 유향, 등불, 비상업적 보상)를 유지한다.

## Research Findings
- `README.md`: Phaser 3 + TypeScript + Vite 기반의 모바일 웹 게임 방향이 명시되어 있다.
- `game-design.md`: 기존 주사위/등불 방어 루프와 새 스와이프 벽돌깨기 루프는 별도 버전으로 문서화해야 한다.

## Open Questions
- 없음. 첫 기획서는 밸런싱 수치의 초안까지 포함한 실행 가능한 베이스라인으로 작성한다.

## Scope Boundaries
- INCLUDE: 핵심 루프, 입력 규칙, 스테이지 규칙, 실패/성공, 메타 최소 범위, UI/아트/사운드 방향, 밸런싱 초안, 제작 에셋 목록.
- EXCLUDE: 결제, 가챠, 랭킹, 계정, 실물 상품 구매 조건부 보상, 역사적 사실로 오인될 표현.
