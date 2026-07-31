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

## What this project does not claim to calculate

There is no physics or industry standard that converts only bow type, draw
weight, arrow length and point weight into one universal "recommended carbon
spine". Dynamic behavior also depends on the shaft model and construction,
mass distribution, bow power stroke, string, cam/brace-height, release,
center-shot and tune. Static carbon deflection and traditional wood-arrow
spine pounds are not interchangeable physical units.

Accordingly, the application does not emit a universal dynamic-spine or shaft
number. It prepares the measured inputs needed by the selected shaft maker's
chart, then requires bare-shaft or paper-tune validation before final cutting
or purchasing a full set.

For compound charts only, the displayed "chart effective draw weight" applies
Easton's published adjustment of +3 lb per 25 gr above 100 gr point-system
weight. It is labelled as an Easton chart rule, not a general dynamic-spine
formula.

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
- Easton Target Product Guide, arrow-length measurement and shaft chart inputs:
  https://eastonarchery.com/wp-content/uploads/2020/11/Easton_2021_Target_Product_Guide-Spreads-1.pdf
- Gold Tip Spine Selector, chart-length and total point-system definitions:
  https://goldtip.com/pages/spine-selector
- K. et al., Dynamic Characterization of Arrows through Stochastic Perturbation:
  https://arxiv.org/abs/1909.08186
