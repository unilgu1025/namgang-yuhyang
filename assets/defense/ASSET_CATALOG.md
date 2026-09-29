# 남강유향 디펜스 에셋 카탈로그

## 파일명 규칙

`{category}_{subject}_{action}_{frame}_v01.png`

- 파일명은 ASCII snake_case만 사용한다.
- 모션은 반드시 2자리 프레임 번호를 쓴다. 예: `idle_01`, `idle_02`, `idle_03`.
- 같은 모션의 모든 프레임은 같은 캔버스 크기, 기준점, 투명 배경을 유지한다.
- UI 텍스트는 이미지에 굽지 않고 코드로 올린다.

## 폴더 구조

```text
assets/defense/
  background/   # 원경·중경·전경·전장 오버레이
  units/        # 수호 유등과 투사체
  enemies/      # 어둠 그림자 적
  fx/           # 타격·점화·소멸·범위 효과
  ui/           # HUD·카드·버튼·결과 화면
  motion/       # UI 전환·전장 연출용 프레임
```

## 제작 순서와 원본 목록

### 1. 수호 유등: 기본 수호등

| 파일 | 프레임 역할 |
|---|---|
| `units/unit_guard_lantern_idle_01_v01.png` | 심지가 약하게 켜진 기본 자세 |
| `units/unit_guard_lantern_idle_02_v01.png` | 불꽃이 위로 길어진 중간 맥동 |
| `units/unit_guard_lantern_idle_03_v01.png` | 향 연기가 옆으로 흐르는 마무리 맥동 |
| `units/unit_guard_lantern_attack_01_v01.png` | 투사 직전 빛 응축 |
| `units/unit_guard_lantern_attack_02_v01.png` | 빛 구슬 발사 |
| `units/unit_guard_lantern_attack_03_v01.png` | 잔광 회복 |
| `units/unit_guard_lantern_hit_01_v01.png` | 외피 흔들림 |
| `units/unit_guard_lantern_hit_02_v01.png` | 불꽃 흔들림 후 복원 |
| `units/unit_guard_lantern_fade_01_v01.png` | 빛 소멸 시작 |
| `units/unit_guard_lantern_fade_02_v01.png` | 연무 분해 |
| `units/unit_guard_lantern_fade_03_v01.png` | 잔광 소멸 |

### 2. 수호 유등: 안부등과 향등

| 파일 | 프레임 역할 |
|---|---|
| `units/unit_comfort_lantern_idle_01_v01.png` ~ `idle_03_v01.png` | 넓은 수면광 맥동 |
| `units/unit_comfort_lantern_shield_01_v01.png` ~ `shield_03_v01.png` | 보호막 전개 |
| `units/unit_incense_lantern_idle_01_v01.png` ~ `idle_03_v01.png` | 향 연기 순환 |
| `units/unit_incense_lantern_burst_01_v01.png` ~ `burst_03_v01.png` | 향기 범위 폭발 |

### 3. 적: 그림자 배·안개 조각·깊은 물결

| 파일 | 프레임 역할 |
|---|---|
| `enemies/enemy_shadow_boat_move_01_v01.png` ~ `move_03_v01.png` | 수면 위 이동 |
| `enemies/enemy_shadow_boat_hit_01_v01.png` ~ `hit_02_v01.png` | 피격 균열 |
| `enemies/enemy_shadow_boat_fade_01_v01.png` ~ `fade_03_v01.png` | 먹물 분해 |
| `enemies/enemy_mist_shard_move_01_v01.png` ~ `move_03_v01.png` | 연무 부유 |
| `enemies/enemy_deep_wave_move_01_v01.png` ~ `move_03_v01.png` | 큰 물결 전진 |

### 4. 이펙트와 투사체

| 파일 | 프레임 역할 |
|---|---|
| `fx/fx_guard_orb_01_v01.png` ~ `orb_03_v01.png` | 수호등 투사체 비행 |
| `fx/fx_incense_burst_01_v01.png` ~ `burst_04_v01.png` | 향기 범위 타격 |
| `fx/fx_dark_hit_01_v01.png` ~ `hit_03_v01.png` | 어둠 피격 |
| `fx/fx_dark_fade_01_v01.png` ~ `fade_04_v01.png` | 적 소멸 |
| `fx/fx_lantern_shield_01_v01.png` ~ `shield_03_v01.png` | 안부등 보호막 |
| `fx/fx_dice_cast_01_v01.png` ~ `cast_03_v01.png` | 주사위 행동 발동 문양. 로고가 아닌 전투용 오버레이 |
| `fx/fx_fortress_collapse_01_v01.png` ~ `collapse_03_v01.png` | 실패 엔딩 벽체 붕괴 오버레이 |

### 5. 전장·배경 레이어

| 파일 | 역할 |
|---|---|
| `background/bg_namgang_sky_v01.png` | 달빛 하늘 |
| `background/bg_namgang_mountains_v01.png` | 원경 산 실루엣 |
| `background/bg_namgang_river_v01.png` | 중경 수면 |
| `background/bg_namgang_shore_v01.png` | 전경 강변 |
| `background/bg_defense_path_v01.png` | 적 이동 수로 |
| `background/bg_lantern_platform_v01.png` | 유등 설치 지점 |
| `background/ending/bg_ending_jinju_fortress_intact_v01.png` | 실패 전, 창작적 진주성 실루엣 |
| `background/ending/bg_ending_jinju_fortress_breach_v01.png` | 중앙 벽체 붕괴 진행 상태 |
| `background/ending/bg_ending_jinju_fortress_ruin_v01.png` | 실패 후, 등불이 꺼진 잔해 상태 |

### 6. UI 상태 및 모션

| 파일 | 프레임 역할 |
|---|---|
| `ui/ui_roll_button_idle_v01.png` | 주사위 굴림 기본 |
| `ui/ui_roll_button_press_v01.png` | 눌림 |
| `ui/ui_roll_button_charge_v01.png` | 굴림 가능 강조 |
| `ui/ui_action_card_idle_v01.png` | 선택 전 |
| `ui/ui_action_card_select_v01.png` | 선택 진입 |
| `ui/ui_action_card_confirm_v01.png` | 확정 |
| `ui/ui_wave_ribbon_in_01_v01.png` ~ `in_03_v01.png` | 웨이브 등장 |
| `ui/ui_wave_ribbon_out_01_v01.png` ~ `out_03_v01.png` | 웨이브 퇴장 |
| `ui/ui_lantern_gauge_safe_v01.png` | 수호등 안정 |
| `ui/ui_lantern_gauge_danger_v01.png` | 수호등 위험 |
| `ui/ui_result_victory_v01.png` | 승리 모달 |
| `ui/ui_result_defeat_v01.png` | 패배 모달 |
| `ui/ui_action_card_confirm_v01.png` | 행동 카드 확정 상태 |

## 모션 기준

| 분류 | 프레임 | 권장 재생 | 핵심 변화 |
|---|---:|---:|---|
| 유닛 대기 | 3 | 1.2초 루프 | 불꽃 크기, 연기 흐름, 작은 수면광 |
| 유닛 공격 | 3 | 220ms | 응축 → 발사 → 잔광 |
| 유닛 피격 | 2 | 160ms | 외피 흔들림 → 즉시 복원 |
| 적 이동 | 3 | 900ms 루프 | 위치 이동 없이 선체/안개/물결만 변화 |
| 적 소멸 | 3~4 | 360ms | 균열 → 먹물 분해 → 잔광 소멸 |
| UI 버튼 | 3 | 입력 기반 | 대기 → 눌림 → 충전광 |
| UI 리본 | 3+3 | 300ms | 좌우 말림과 등불 점화로 등장·퇴장 |

이 목록은 배경 6개, 유닛 23개 이상, 적 16개 이상, FX 17개, UI·UI 모션 18개 이상으로 구성되어 최소 80개 PNG를 목표로 한다.

## 현재 생성 원본

아래 항목은 첫 생산 묶음으로 이미지 생성이 완료됐다. 파일 이동·리사이즈 전에는 원본의 알파와 기준점을 유지한다.

- `unit_guard_lantern_idle_01_v01.png` ~ `unit_guard_lantern_idle_03_v01.png`
- `unit_guard_lantern_attack_01_v01.png` ~ `unit_guard_lantern_attack_03_v01.png`
- `enemy_shadow_boat_move_01_v01.png` ~ `enemy_shadow_boat_move_03_v01.png`
- `fx_guard_orb_01_v01.png` ~ `fx_guard_orb_02_v01.png`
- `fx_dice_cast_01_v01.png` ~ `fx_dice_cast_03_v01.png`
- `fx_fortress_collapse_01_v01.png` ~ `fx_fortress_collapse_03_v01.png`
- `background/ending/bg_ending_jinju_fortress_intact_v01.png`
- `background/ending/bg_ending_jinju_fortress_breach_v01.png`
- `background/ending/bg_ending_jinju_fortress_ruin_v01.png`
