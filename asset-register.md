# 남강유향 에셋 등록부

## 스와이프 벽돌깨기 v1

| 파일 | 분류 | 용도 | 배경 | 제작 방식 | 상태 |
|---|---|---|---|---|---|
| `assets/bg_namgang_water_night_v1.png` | 배경 | 세로형 게임 필드 | 불투명 | Built-in ImageGen | 확정 |
| `assets/ball_incense_lantern_v1.png` | 스프라이트 | 향등 구슬 발사체 | 투명 | Built-in ImageGen | 확정 |
| `assets/block_dark_wave_01_v1.png` | 스프라이트 | 파괴 가능한 어둠 조각 | 투명 | Built-in ImageGen | 확정 |
| `assets/bumper_wave_knot_v1.png` | 스프라이트 | 파괴 불가 물결 매듭 반사체 | 투명 | Built-in ImageGen | 확정 |
| `assets/item_sachet_v1.png` | 스프라이트 | 구슬 추가 향주머니 | 투명 | Built-in ImageGen | 확정 |
| `assets/fx_dark_break_v1.png` | 이펙트 | 어둠 조각 파괴 효과 | 투명 | Built-in ImageGen | 확정 |
| `assets/fx_incense_trail_v1.png` | 이펙트 | 향등 구슬 이동 잔상 | 투명 | Built-in ImageGen | 확정 |
| `assets/ui_lantern_boundary_v1.png` | UI | 패배 등불 경계선 | 투명 | Built-in ImageGen | 확정 |

## 아이템 아이콘 v1 (Claude가 SVG로 직접 제작)

같은 원형 메달 틀(남청 원판·호박색 테두리·금빛 후광)에 기호만 다르게 그렸다. 색은 `DESIGN.md` 토큰만 쓴다. 원본은 SVG라 크기를 바꿔도 깨지지 않는다. `npm run assets`가 128×128 PNG로 변환한다. 코덱스 그림으로 바꾸려면 같은 파일명의 PNG를 만들고 스크립트의 원본 경로만 바꾸면 된다.

| 파일 | 게임 키 | 아이템 | 기호 (색 외 구분 요소) | 상태 |
|---|---|---|---|---|
| `assets/item_lantern_ribbon_v1.svg` | `item_row` | 등불 띠 · 가로 줄 피해 | 가로 빛줄기, 좌우 화살, 작은 등불 셋 | 확정 |
| `assets/item_incense_pillar_v1.svg` | `item_col` | 향 기둥 · 세로 줄 피해 | 세로 향, 위아래 화살, 연기 | 확정 |
| `assets/item_whirlpool_v1.svg` | `item_whirl` | 소용돌이 · 방향 무작위 | 청록 나선 | 확정 |
| `assets/item_lotus_lantern_v1.svg` | `item_bomb` | 연등 · 3×3 폭발 | 연꽃, 사방 빛살 | 확정 |

## 디펜스 필살기 컷신 v1

| 파일 | 게임 키 | 용도 | 제작 | 상태 |
|---|---|---|---|---|
| `assets/cut_girl_pray_v1.svg` | - | 향 피우기 컷신의 초기 역광 실루엣 | Claude가 SVG로 직접 제작 | 보존용. v02 회화풍 컷아웃으로 교체 |
| `assets/cut_girl_release_lantern_v02.png` | `cut_girl.png` | 강가에 무릎 꿇고 두 손으로 연꽃 유등을 띄우는 한복 소녀 컷신 | Built-in ImageGen | 투명 배경, 600×720 출력 |
| `assets/ui_incense_ready_frame_v01.png` | `incense_ready_frame.png` | 향 게이지 100% 버튼의 황동·청록 장식 프레임 | Built-in ImageGen | 투명 배경, 텍스트 없음 |
| `assets/fx_incense_ready_ring_v01.png` | `fx_incense_ready_ring.png` | 향 충전 완료 및 컷신용 금빛·청록 파동 링 | Built-in ImageGen | 투명 배경, 512×512 출력 |
| `assets/fx_incense_ready_sparks_v01.png` | `fx_incense_ready_sparks.png` | 향 충전 완료 버튼 위로 피어나는 연무·불씨 FX | Built-in ImageGen | 투명 배경, 512×640 출력 |

컷신 배경은 `bg_ending_jinju_fortress_intact`를 재사용한다. v02 소녀 컷아웃에는 두 손과 연꽃 유등이 한 장에 포함되어 좌표가 어긋나지 않는다.

## 사운드 v1 (외부 무료 에셋, 전부 CC0)

CC0는 출처 표기 의무가 없지만 감사 표시로 기록한다. 원본은 `assets/`, 웹용 ogg·mp3는 `npm run assets`로 생성(음악은 음량 정규화).

| 파일 | 게임 키 | 용도 | 원본 | 작가 | 라이선스 | 수정 |
|---|---|---|---|---|---|---|
| `assets/bgm_aquaria_v1.wav` | `bgm` | 게임 중 반복 BGM (첫 발사 뒤 시작) | [Aquaria](https://opengameart.org/content/aquaria) | cynicmusic | CC0 | 음량 정규화(-20 LUFS) |
| `assets/bgm_oriental_ending_v1.wav` | `ending` | 최종 엔딩에서 1회 재생 | [Oriental](https://opengameart.org/content/oriental) | Shadowfire452 | CC0 | 음량 정규화(-18 LUFS) |
| `assets/sfx_wall_pluck_v1.ogg` | `wall` | 벽 반사 / 매듭 반사(낮은 음) | Interface Sounds `pluck_001` | [Kenney](https://kenney.nl/assets/interface-sounds) | CC0 | 없음 |
| `assets/sfx_block_hit_v1.ogg` | `hit` | 조각 타격 | Impact Sounds `impactGlass_light_000` | [Kenney](https://kenney.nl/assets/impact-sounds) | CC0 | 없음 |
| `assets/sfx_block_break_v1.ogg` | `break` | 조각 파괴 | Impact Sounds `impactGlass_medium_000` | Kenney | CC0 | 없음 |
| `assets/sfx_sachet_v1.ogg` | `sachet` | 향주머니 획득 | Interface Sounds `drop_002` | Kenney | CC0 | 없음 |
| `assets/sfx_echo_v1.ogg` | `echo` | 잔향 조각 획득 | Interface Sounds `glass_001` | Kenney | CC0 | 없음 |
| `assets/sfx_bell_v1.ogg` | `bell` | 승리 종소리 / 실패(한 옥타브 낮춰 재생) | Impact Sounds `impactBell_heavy_000` | Kenney | CC0 | 없음 |
| `assets/sfx_ui_click_v1.ogg` | `click` | 버튼 클릭 | Interface Sounds `click_002` | Kenney | CC0 | 없음 |
| `assets/sfx_dice_throw_v1.ogg` | `dice` | 디펜스 주사위 굴림 | Casino Audio `dice-throw-2` | [Kenney](https://kenney.nl/assets/casino-audio) | CC0 | 없음 |

## 디펜스 v1 (`assets/defense/`, 목록은 `assets/defense/ASSET_CATALOG.md`)

게임은 `prototype/public/assets/d/`의 WebP 사본을 쓴다(`npm run assets`, 원본 55MB → 1.5MB). 애니메이션 프레임은 기준점이 흔들리지 않도록 여백을 자르지 않고 캔버스째 줄인다.

| 원본 | 게임에서 쓰는 곳 |
|---|---|
| `units/unit_guard_lantern_idle·attack 01~03` | 수호등 대기(1.2초 반복)·공격(220ms) |
| `units/unit_comfort_lantern_idle·shield 01~03` | 안부등 대기 / 범위 안에 적이 있을 때 보호막. 승리 엔딩의 떠오르는 안부등 |
| `enemies/enemy_shadow_boat_move 01~03` | 그림자 배, 대장선(1.6배 크기 + 버건디 톤) |
| `enemies/enemy_mist_shard_move 01~03` | 안개 조각 |
| `fx/fx_guard_orb 01~02` | 수호등 빛 구슬 |
| `fx/fx_dice_cast 01~03` | 소환 순간 문양, 강화 카드 「등불씨 꾸러미」 그림 |
| `fx/fx_fortress_collapse 01~03` | 패배 엔딩 붕괴 |
| `background/ending/*_intact·breach·ruin` | 승리·패배 엔딩, 결과 모달 둥근 창, 카드 「성벽 보수」 그림 |
| `ui/ui_top_hud_frame` · `ui_pause_button` · `ui_lantern_integrity_gauge` | 상단 HUD, 성 불빛 막대 |
| `ui/ui_roll_button_idle·press·charge` | 주사위 버튼 (굴릴 수 있을 때 charge) |
| `ui/ui_action_card_idle·select·confirm` | 물결 사이 강화 카드 |
| `ui/ui_wave_ribbon_in_01` | 물결 시작 리본 |
| `ui/ui_result_modal` | 결과 화면 |

전투 배경은 새로 만들지 않고 스와이프 게임의 `bg_namgang_water_night_v1.png`를 같이 쓴다(강물 굽이를 적 경로로 사용).

### 웹용 사본

게임은 원본이 아니라 `prototype/public/assets/`의 사본을 쓴다. `cd prototype && npm run assets`로 다시 만든다(투명 여백 제거 + 규격 축소, 원본 수정 없음). 원본 약 15MB → 사본 약 750KB.

| 사본 | 원본 | 크기 |
|---|---|---|
| `bg.jpg` | `bg_namgang_water_night_v1.png` | 720×1280 |
| `title.jpg` | `keyart-steam-title-center-v1.png` | 1600×900 (메인 타이틀) |
| `ball.png` | `ball_incense_lantern_v1.png` | 128×128 |
| `block.png` | `block_dark_wave_01_v1.png` | 280×82 (게임에서 9-slice로 92×76) |
| `knot.png` | `bumper_wave_knot_v1.png` | 280×59 |
| `sachet.png` | `item_sachet_v1.png` | 128×128 |
| `break.png` | `fx_dark_break_v1.png` | 384×309 |
| `trail.png` | `fx_incense_trail_v1.png` | 256×51 |
| `boundary.png` | `ui_lantern_boundary_v1.png` | 720×40 |

## 제작 프롬프트 요약

- **배경**: 중앙 플레이 영역을 비운 남청·먹색의 달빛 강과 은은한 등불 반사.
- **향등 구슬**: 금빛 심지, 청록 외곽광, 유리 안을 흐르는 향 연기.
- **어둠 조각**: 먹빛 물결 질감의 가로형 파괴 블록과 절제된 금빛 균열.
- **물결 매듭**: 중앙 매듭을 이루는 청록 파도 형태의 반사 전용 장애물.
- **향주머니**: 남색 비단 주머니, 금색 끈, 작은 상아색 향 연기.
- **파괴 이펙트**: 먹물 파편, 드문 금빛 불꽃, 옅은 향 연무가 퍼지는 타격 효과.
- **이동 잔상**: 양 끝이 가늘어지는 상아색 향 연무와 작은 금빛 입자.
- **등불 경계선**: 청록 물결 위에 따뜻한 등불을 일정 간격으로 띄운 가로형 위험선.

## 사용 가이드

- `ball_incense_lantern_v1.png`은 원형 충돌체에 맞춰 중앙 기준으로 스케일한다. 위·아래 장식은 시각 요소이며 충돌 반경에 포함하지 않는다.
- `block_dark_wave_01_v1.png`은 HP 3, 2, 1 상태에서 색조·밝기·균열 오버레이를 달리해 재사용한다.
- `bumper_wave_knot_v1.png`은 파괴되지 않으며, 반사체 외곽의 투명 여백을 제외한 내부 폭으로 충돌 영역을 잡는다.
- 모든 스프라이트는 PNG 알파를 보존한다. 하드코딩된 흰색·검정 배경을 추가하지 않는다.
- 이 에셋들은 창작 판타지 표현이다. 실물 향 제품 효능이나 역사적 사실을 주장하지 않는다.
