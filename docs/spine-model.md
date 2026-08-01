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

## Two independent calculators

The application has two separate generic initial-test calculators. They are
inverses of each other, so neither asks the user to mix an arrow mass with a
static-spine value in the same calculation.

1. **Finished-arrow mass -> static spine.** Enter actual full-draw weight,
   shaft length (nock throat to shaft end), complete arrow mass and arrow-pass
   offset. The output is an ATA static-spine center and a test range.
2. **Static spine -> finished-arrow mass.** Enter the same bow inputs plus an
   ATA static spine, and the output is the dynamic-equivalent complete arrow
   mass and GPP. It is not a point-weight prediction and it is not a minimum
   GPP safety rule.

The generic model is explicitly a starting range, not a manufacturer chart.
For each bow type it uses a 30 lb / 30 in carbon-arrow baseline. It adjusts
effective draw weight by +3 lb per 25 gr above that bow type's reference
finished-arrow mass, and by -0.25 lb per millimeter that the arrow pass is
farther from the baseline centerline offset. Static deflection then scales as
`L^3 / effective_draw_weight^0.6`. These coefficients make the two
calculators reversible; they are not universal bow physics.

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
