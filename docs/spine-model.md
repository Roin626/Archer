# Arrow Spine Model Audit

## What this project calculates exactly

The calculator uses the ATA/ASTM static-spine test conditions: a 1.94 lb
(880 g) center load over a 28 in support span. Static deflection is expressed
in inches. A 0.500 in deflection is therefore shown as ATA spine `500`.

For a simply supported shaft with a center load, the displayed flexural
rigidity is calculated as:

```text
delta = P * L^3 / (48 * E * I)
E * I = P * L^3 / (48 * delta)
```

where `P = 1.94 lb`, `L = 28 in`, and `delta` is the measured deflection in
inches. `EI` is reported in `lb in2` for this unit system.

The calculator also calculates finished arrow mass and grains per pound:

```text
finished arrow mass (gr) = shaft length (in) * shaft GPI
                         + point-system mass (gr)
                         + rear-component mass (gr)

GPP = finished arrow mass (gr) / actual draw weight (lb)
```

Point-system mass means point, insert/outsert, collar and forward weights.
Rear-component mass means nock, fletching, wraps and adhesive. The minimum
GPP is never guessed: enter the value published in the bow maker's manual.

## Two-stage selection and tuning calculator

The first stage is a handle-clearance engineering screen, not a manufacturer
selection chart. Enter actual full-draw weight `F`, measured draw distance `D`,
shaft length `L`, and the arrow-pass offset from the bow centerline `e`.
For a shelfless bow, entering grip width makes `e = grip width / 2`.

The simplified small-angle lateral load is:

```text
e_in = e_mm / 25.4
F_side = F * e_in / D
R = (F_side / 1.94) * (L / 28)^3
```

`R` converts ATA static deflection into a lateral response at the entered load
and shaft length. The required dynamic clearance is first set geometrically:

```text
C_min = e_mm + assumed shaft diameter / 2
C_max = C_min + clearance allowance
```

The static deflection candidate interval that can produce this dynamic range is:

```text
static_deflection_min = C_min / (25.4 * k_max * R)
static_deflection_max = C_max / (25.4 * k_min * R)
ATA spine number = static_deflection_in * 1000
```

`k` is an explicit project assumption for the difference between static beam
response and the release transient. Current screening assumptions are:

| Material | Assumed diameter | Clearance allowance | Dynamic factor `k` |
| --- | ---: | ---: | ---: |
| Carbon | 6 mm | 2 mm | 1.6-2.0 |
| Bamboo / wood | 8 mm | 3 mm | 1.3-1.7 |

The required dynamic displacement is therefore controlled by offset and shaft
radius. Draw weight, draw distance and shaft length control which static-spine
range can reach that displacement. At zero centerline offset, this model
returns zero handle-clearance demand and deliberately does not infer a Spine
range from handle clearance alone.

The second stage tunes point-system mass from shooting feedback. Enter the
bare-arrow mass (shaft plus rear components, excluding the point system),
current point-system mass and actual ATA spine. After a stable bare-shaft or
paper-tune observation, select high/center/low and stiff/neutral/weak. The
calculator proposes the next point-system mass in 25 gr increments and, when
needed, the adjacent static-spine direction to test.

The feedback grid is intentionally directional: high -> add 25 gr, low ->
remove 25 gr, stiff -> lower ATA number (stiffer shaft), weak -> raise ATA
number (weaker shaft). When both axes need correction, it expands the adjacent
shaft test from 50 to 100 ATA points. These are trial instructions, not a claim
that impact alone uniquely diagnoses arrow tune; verify nocking point,
clearance, form and aiming first.

Use the resulting interval only to choose adjacent test shafts for bare-shaft
or paper tuning before cutting shafts or purchasing a full set. The material
factors above are provisional engineering bounds, not ATA/ASTM values and not
validated replacements for measured shaft natural frequency, damping or bow
release data. Shaft construction, mass distribution, string, brace height,
release and tune remain outside this simplified model. Static carbon deflection
and traditional wood-arrow spine pounds are not interchangeable units.

## Arrow length convention

The application field `shaft length` is nock throat to the end of the shaft,
excluding the point. Some makers define their chart length to the end of the
insert instead; use the exact convention printed on the chosen maker's chart.
Arrow length must be measured at full draw. AMO draw length is not by itself a
safe final cut length.

Measure a long shaft at full draw before cutting. The calculator rejects a
shaft length shorter than the entered pivot-point draw distance.

## References

- ASTM F2031, Standard Test Method for Measurement of Arrow Shaft Static Spine
  (Stiffness): https://store.astm.org/f2031-00.html
- Easton Target Arrow Shaft Selection Guide, chart inputs and point-weight
  adjustment convention: https://eastonarchery.com/wp-content/uploads/2023/08/301055-A-Arrow-Shaft-Selection-Target.pdf
- Gold Tip Spine Selector, chart-length and total point-system definitions:
  https://goldtip.com/pages/spine-selector
- Fish et al., Dynamic Characterization of Arrows through Stochastic Perturbation:
  https://arxiv.org/abs/1909.08186
