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

The calculator follows the practical order used for initial arrow selection:

1. **Select a bare-shaft spine range.** Enter actual full-draw weight, the
   measured draw distance and shaft length. The draw distance is measured from
   nock throat to the bow's pivot point; shaft length is measured from nock
   throat to shaft end. They are different values. The resulting shaft-length
   clearance is displayed and the calculator gives an ATA static-spine test
   range. Point weight and finished-arrow mass are deliberately excluded here.
2. **Tune point-system mass from shooting feedback.** Enter the bare-arrow
   mass (shaft plus rear components, excluding the point system), current
   point-system mass and the actual ATA spine. After a stable bare-shaft or
   paper-tune observation, select high/center/low and stiff/neutral/weak. The
   calculator proposes a next point-system mass in 25 gr increments and, when
   needed, the adjacent static-spine direction to test.

The feedback grid is intentionally directional: high -> add 25 gr, low ->
remove 25 gr, stiff -> lower ATA number (stiffer shaft), weak -> raise ATA
number (weaker shaft). When both axes need correction, it expands the adjacent
shaft test from 50 to 100 ATA points. These are trial instructions, not a claim
that impact alone uniquely diagnoses arrow tune; verify nocking point,
clearance, form and aiming first.

The generic model is explicitly a starting range, not a manufacturer chart.
For each bow type it uses a 30 lb / 30 in carbon-arrow baseline. It adjusts
the initial selection only for arrow-pass centerline offset, then scales static
deflection as `L^3 / effective_draw_weight^0.6`. Point-system mass is treated
as a later tuning variable, not an initial-spine input.

Use the resulting center plus adjacent spine shafts for bare-shaft or paper
tuning before cutting shafts or purchasing a full set. Shaft construction,
mass distribution, string, cam/brace height, release and tune remain outside
this generic model. Static carbon deflection and traditional wood-arrow spine
pounds are not interchangeable units.

## Arrow length convention

The application field `shaft length` is nock throat to the end of the shaft,
excluding the point. Some makers define their chart length to the end of the
insert instead; use the exact convention printed on the chosen maker's chart.
Arrow length must be measured at full draw. AMO draw length is not by itself a
safe final cut length.

For test planning, the equipment matrix displays AMO draw length + 1 in as a
conservative test-shaft starting length only. It must not be treated as a
final cut instruction. Measure a long shaft at full draw before cutting.

## References

- ASTM F2031, Standard Test Method for Measurement of Arrow Shaft Static Spine
  (Stiffness): https://store.astm.org/f2031-00.html
- Easton Target Arrow Shaft Selection Guide, chart inputs and point-weight
  adjustment convention: https://eastonarchery.com/wp-content/uploads/2023/08/301055-A-Arrow-Shaft-Selection-Target.pdf
- Gold Tip Spine Selector, chart-length and total point-system definitions:
  https://goldtip.com/pages/spine-selector
- K. et al., Dynamic Characterization of Arrows through Stochastic Perturbation:
  https://arxiv.org/abs/1909.08186
