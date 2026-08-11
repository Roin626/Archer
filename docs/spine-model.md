# Arrow Spine Model Audit

## What this project calculates exactly

The calculator uses the ATA/ASTM static-spine test conditions: a 1.94 lb
(880 g) center load over a 28 in support span. Static deflection is expressed
in inches. A 0.500 in deflection is therefore shown as ATA spine `500`.
The web interface converts this displacement to millimeters so static and
dynamic displacement can be compared without switching length units:

```text
static_test_displacement_mm = ATA_spine * 0.0254
ATA_spine = static_test_displacement_mm / 0.0254
```

For example, ATA `700` means `17.78 mm` of deflection under the standardized
static test. It does not mean the arrow bends 17.78 mm during a shot.

For a simply supported shaft with a center load, the displayed flexural
rigidity is calculated as:

```text
delta = P * L^3 / (48 * E * I)
E * I = P * L^3 / (48 * delta)
```

where `P = 1.94 lb`, `L = 28 in`, and `delta` is the measured deflection in
inches. `EI` is reported in `lb in2` for this unit system.

## Shaft cross-section and material

Carbon and laminated-bamboo shafts are treated as hollow circular tubes. Solid
wood shafts are treated as solid circular rods. With outer diameter `Do` and
inner diameter `Di`, the section area and second moment of area are:

```text
hollow: A = pi * (Do^2 - Di^2) / 4
        I = pi * (Do^4 - Di^4) / 64

solid:  A = pi * Do^2 / 4
        I = pi * Do^4 / 64
```

The web calculator converts the ATA test to SI-compatible units and reports:

```text
EI = P * L^3 / (48 * delta)
effective_bending_modulus = EI / I
```

The effective bending modulus is a consistency check, not a replacement for
the measured ATA spine. In particular, a carbon shaft is an anisotropic
laminate: fiber direction, resin, wall construction, local reinforcement and
manufacturing tolerances cannot be recovered from the two diameters alone.
Because measured ATA deflection already includes material and section effects,
the dynamic model uses the ATA-derived `EI`; applying `E * I` as a second
stiffness correction would double-count the shaft geometry.

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
length `L`, bare-arrow mass, point-system mass, ATA static spine, outer diameter,
inner diameter for hollow shafts, material, and arrow-pass centerline offset `e`. For a shelfless bow, entering
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
| Laminated bamboo, hollow | 8 mm | 3 mm | 1.3-1.7 |
| Wood, solid | 8 mm | 3 mm | 1.3-1.7 |

The basic bare-shaft screening recommendation is calculated as:

```text
recommended_static = bow_baseline
                   * (30 / effective_draw)^0.6
                   * (L / 30)^3
```

Each bow type has its own baseline and screening band. For any non-zero
centerline offset, the calculator separately derives the required dynamic
deflection for handle clearance:

```text
C_min = e_mm + shaft_diameter / 2
C_max = C_min + clearance_allowance
```

The basic screening range is not intersected with a static deflection inferred
from handle clearance. It remains the starting range for buying adjacent test
shafts. The interface also lists common nominal ATA values that fall inside
that range; these are generic candidates and must be checked against the actual
manufacturer catalogue.

The handle-clearance range is displayed only in millimeters because it is a
geometric displacement threshold, not an ATA static specification. With static
deflection fixed, the calculator solves point-system mass and shaft length as
two alternative ways to bring the predicted dynamic range back toward the
basic screening recommendation. A theoretical shaft length below measured draw
length is still displayed for auditability but is explicitly marked unsafe and
must not be used as a cutting instruction. The two adjustment schemes are
alternatives, not instructions to apply both changes simultaneously.

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
- Kooi and Sparenberg, Bow-arrow interaction in archery; tubular-shaft area,
  second moment and Euler-Bernoulli dynamic model:
  https://www.bio.vu.nl/thb/users/kooi/kooi97b.pdf
- Easton arrow FAQ; static/dynamic spine and shaft diameter/wall construction:
  https://eastonarchery.com/faqs/
