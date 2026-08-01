# Equipment Configuration Matrix

## Purpose

The matrix is an initial measurement and tuning checklist. It gives a generic
ATA static-spine test range from bow type, actual draw weight, test shaft
length, optional finished-arrow mass and centerline offset. It does not choose
a manufacturer shaft model, final cut length, point-weight range or safety
minimum GPP.

For every draw-weight and AMO draw-length pair it records:

- a conservative test-shaft length: AMO draw length + 1 in;
- a generic ATA static-spine test range, or a range scaled from an entered
  already-tuned reference arrow;
- the optional measurement details used to compare against a maker's chart;
- a bow-type-specific starting setup and validation procedure.

The test-shaft length is a planning value, not a cutting specification. Measure
a long arrow at full draw and mark it at least 1 in in front of the forward
arrow-rest contact, then apply the selected shaft maker's own chart convention.

## Bow types

- `olympic_recurve`: Olympic recurve.
- `barebow`: barebow.
- `compound`: compound bow.
- `american_hunting`: windowed American hunting bow, with shelf.
- `shelfless_traditional`: a single option for traditional bows shot without a
  shelf, including Turkish, Chinese and Mongolian bow forms.

For `shelfless_traditional`, measure the arrow-pass offset as the positive
distance in millimeters from bow centerline to the arrow pass. A practical
starting measurement is half the grip width at the arrow-pass location. The
number is also used by the generic initial-test model. Its coefficient is a
visible, reversible approximation; compare adjacent shafts in real shooting.

## GPP and competition checks

Enter a bow maker's published minimum finished-arrow GPP in the calculator to
obtain a pass/fail result. Never substitute a generic 5 GPP or bow-type target
for the manufacturer's safety limit.

For World Archery target competition, the current equipment rule consulted for
this project limits shaft diameter to 9.3 mm and point diameter to 9.4 mm. It
also defines an arrow as shaft, point, nock, fletching and optional cresting.
Check the current rulebook for the applicable division and event.

Reference: https://extranet.worldarchery.sport/documents/index.php/Rules/Rule_Book_versions/2022-09-01/EN-Book3.pdf
