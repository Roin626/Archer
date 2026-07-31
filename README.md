Exit code: 0
Wall time: 0.9 seconds
Output:
# Archer

Archer 鏄竴涓ā鍧楀寲灏勭璋冨紦杈呭姪椤圭洰銆傚綋鍓嶉樁娈靛厛瀹炵幇鈥滃疄灏勮惤鐐硅褰曗€濆皬绋嬪簭锛岀敤鏉ヨ褰曟瘡缁勭鐨勮惤鐐广€佺鍨嬨€佽窛绂汇€佸櫒鏉愰厤缃拰澶囨敞锛屼负鍚庣画鐨勭椋炶妯″瀷銆佽皟寮撹鍒欏紩鎿庡拰绠＄悊灞傝皟搴︽彁渚涙暟鎹叆鍙ｃ€?
## 褰撳墠妯″潡

- `shot-landing-recorder`: 瀹炲皠钀界偣璁板綍 MVP銆?- `arrow-spine-calculator`: 绠煝闈欐€佹尃搴︿笌鍔ㄦ€佸尮閰嶄及绠楄剼鏈€?- `equipment-config-matrix`: 鎸夊紦鍨嬨€佹媺閲嶅拰 AMO 鎷夎窛鐢熸垚妯″潡鍖栭厤浠跺垵绛涢厤缃€?- `docs/architecture.md`: 涓夊眰妯″潡鍖栨灦鏋勪笌鎺ュ彛杈圭晫銆?- `docs/sop.md`: 浠庡缓妗ｃ€佸疄灏勩€佸鐩樺埌璋冨紦寤鸿鐨?SOP銆?- `docs/spine-model.md`: spine 璁＄畻渚濇嵁銆佸叕寮忓亣璁句笌浣跨敤闄愬埗銆?- `docs/equipment-config.md`: 閰嶄欢閰嶇疆鐭╅樀鐨勮祫鏂欎緷鎹€佸瓧娈靛拰闄愬埗銆?
## 杩愯

Windows 涓嬪弻鍑伙細

```text
start_archer.bat
```

鍚姩鍣ㄤ細鎵撳紑 `index.html`銆傜綉椤甸噷鍙互璁板綍钀界偣銆佺敓鎴愰厤浠堕厤缃煩闃靛拰璁＄畻 spine锛涙帶鍒跺彴鑿滃崟淇濈暀鍚屾牱鐨?CLI 鍏ュ彛鍜屾祴璇曞叆鍙ｃ€?
涔熷彲浠ョ洿鎺ョ敤娴忚鍣ㄦ墦寮€ `index.html`銆傚綋鍓嶇増鏈笉闇€瑕佸悗绔€佷笉闇€瑕佸畨瑁呬緷璧栵紝鏁版嵁榛樿淇濆瓨鍦ㄦ祻瑙堝櫒 `localStorage`銆?
## MVP 鍔熻兘

- 鏂板缓瀹炲皠 session锛氬紦鍨嬨€佽窛绂汇€侀澏绾搞€佺幆澧冦€佺洰鏍囥€?- 鐐瑰嚮闈堕潰璁板綍钀界偣銆?- 鏍囪绠瀷锛氱窘绠€佽８鏉嗐€佹祴璇曠銆?- 鑷姩璁＄畻鐜€煎拰缁勬暎甯冦€?- 鍦ㄧ綉椤靛唴鐢熸垚涓嶅悓鎷夐噸銆丄MO 鎷夎窛涓嬬殑閰嶄欢閰嶇疆鐭╅樀銆?- 鍦ㄧ綉椤靛唴璁＄畻鍗曠粍绠暱/绠ご閲嶉噺涓嬬殑 spine 鎺ㄨ崘銆?- 瀵煎嚭 JSON/CSV銆?- 鏈湴淇濆瓨鏈€杩?session銆?
## 鍚庣画鎺ュ彛鏂瑰悜

- 鐗╃悊妯″瀷灞傦細鎺ユ敹瑁呭鍙傛暟鍜屽疄灏勮惤鐐癸紝杈撳嚭寮归亾/鐬勭偣/鍔ㄦ€佹尃搴︿及璁°€?- 璋冨紦瑙勫垯灞傦細鎺ユ敹瑁告潌/缇界鍋忓樊銆乸aper tune 鏂瑰悜銆亀alk-back 绾挎€ц秼鍔匡紝杈撳嚭鍙墽琛岃皟鏁村缓璁€?- 绠＄悊璋冨害灞傦細缁熶竴 session銆佸櫒鏉愩€佹ā鍨嬬増鏈€丼OP 姝ラ鍜岄獙璇佺粨鏋溿€?
## 绠煝鎸犲害鑴氭湰

鐢熸垚鎺ㄨ崘琛細

```powershell
python scripts/arrow_spine.py --bow-type olympic_recurve --draw-weight 36 --shaft-length 29 --shaft-gpi 8.1 --point-system-weight 120 --rear-components-weight 28 --static-deflection 0.500 --manufacturer-min-gpp 6
```

璇勪及鍗曟敮绠細

```powershell
The calculator verifies finished arrow weight, GPP and ATA static deflection. It then hands the measured inputs to the selected shaft maker's chart; it does not invent a universal dynamic-spine recommendation.
```

## 妯″潡鍖栭厤浠堕厤缃煩闃?
鎸変笉鍚屾媺閲嶅拰 AMO 鎷夎窛鐢熸垚鎺ㄨ崘琛細

```powershell
python scripts/equipment_config.py --bow-type olympic_recurve --draw-weights 26:40:2 --draw-lengths 26,28,30
```

瀵煎嚭 JSON锛?
```powershell
python scripts/equipment_config.py --bow-type compound --draw-weights 40,50,60 --draw-lengths 27:31:1 --format json
```

鏃犲彴浼犵粺寮撻渶瑕侀澶栬緭鍏ュ嚭绠偣璺濅腑蹇冪嚎锛汣LI 鐢ㄦ绫宠礋鍊硷細

```powershell
python scripts/equipment_config.py --bow-type shelfless_traditional --draw-weights 40 --draw-lengths 28 --arrow-pass-offset-mm 25
```

鏀寔鐨勪紶缁熷紦缁嗗垎锛?
- `american_hunting`: 缇庣寧锛屾湁寮撶獥/鏈?shelf銆?- `shelfless_traditional`: 鏃犲彴浼犵粺寮擄紝鍖呮嫭鍦熻€冲叾寮撱€佷腑鍥藉紦銆佽挋鍙ゅ紦绛夈€?
