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

## Dynamic matching calculator

Dynamic spine has no universal industry measurement comparable with ATA/ASTM
static spine. The value displayed by this project is a predicted peak lateral
deflection range from an explicit engineering model. It is not a directly
measured property of the shaft.

Inputs are actual full-draw weight `F`, pivot-point draw distance `D`, shaft
length `L`, bare-arrow mass, point-system mass, ATA static spine, shaft diameter,
material, and arrow-pass centerline offset `e`. For a shelfless bow, entering
grip width makes `e = grip width / 2`.

The setup demand is calibrated to the same 100 gr point convention used by the
Easton chart. Each 25 gr point-system change is treated as a 3 lb demand change:

```text
point_adjustment = (point_mass_gr - 100) / 25 * 3 lb
offset_adjustment = (reference_offset - measured_offset) * 0.25 lb/mm
effective_draw = max(5, F + point_adjustment + offset_adjustment) * sqrt(D / 28)
```

The square-root draw-distance term and offset adjustment are project
assumptions. They expose draw distance and non-center geometry without claiming
to reproduce a full bow force-draw curve.

Center-shot equipment still receives a non-zero release excitation. The model
uses a bow-specific release fraction plus the geometric offset term:

```text
lateral_fraction = release_fraction + (e_mm / 25.4) / D
inertia_factor = clamp(sqrt(reference_arrow_mass / actual_arrow_mass), 0.7, 1.3)
F_side = effective_draw * lateral_fraction * inertia_factor
R = (F_side / 1.94) * (L / 28)^3
dynamic_deflection = static_deflection * 25.4 * R * k
```

Current release fractions are explicit calibration parameters:

| Bow type | Release fraction |
| --- | ---: |
| Olympic recurve | 0.022 |
| Barebow | 0.030 |
| Compound | 0.010 |
| American hunting recurve | 0.030 |
| Shelfless traditional | 0.025 |

Material transient bounds remain:

| Material | Default diameter | Clearance allowance | Dynamic factor `k` |
| --- | ---: | ---: | ---: |
| Carbon | 6 mm | 2 mm | 1.6-2.0 |
| Bamboo / wood | 8 mm | 3 mm | 1.3-1.7 |

The manufacturer-style recommendation is calculated as:

```text
recommended_static = bow_baseline
                   * (30 / effective_draw)^0.6
                   * (L / 30)^3
```

Each bow type has its own baseline and screening band. For any non-zero
centerline offset, the calculator also derives a handle-clearance static range:

```text
C_min = e_mm + shaft_diameter / 2
C_max = C_min + clearance_allowance
clearance_static_min = C_min / (25.4 * k_max * R)
clearance_static_max = C_max / (25.4 * k_min * R)
```

The displayed final recommendation is the overlap between the equipment-match
range and the handle-clearance range. A center-shot bow omits only this
geometric clearance constraint; it does not omit dynamic deflection.

When static spine is fixed, the calculator algebraically solves the same model
for either point-system mass (and therefore finished arrow mass) or shaft
length. These are center-target alternatives, not instructions to apply both
changes simultaneously.

Use all results only to select adjacent test shafts and test configurations.
Final acceptance still requires bare-shaft or paper tuning. Static spine alone
cannot identify natural frequency, damping, mass distribution, string path,
release quality, plunger behavior, brace height or the bow's full force-draw
curve. Carbon deflection numbers and traditional wood-arrow spine pounds are
not interchangeable units.

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
