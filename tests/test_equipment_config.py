import unittest

from scripts.equipment_config import build_matrix, recommend_equipment, test_shaft_length


class EquipmentConfigTests(unittest.TestCase):
    def test_test_shaft_length_is_conservative_not_a_final_cut_length(self):
        self.assertEqual(test_shaft_length(28), 29)
        self.assertEqual(test_shaft_length(28, clearance_in=1.5), 29.5)

    def test_matrix_covers_each_draw_weight_and_length_pair(self):
        rows = build_matrix("olympic_recurve", [30, 32], [27, 29, 31])

        self.assertEqual(len(rows), 6)
        self.assertEqual(rows[0].draw_weight_lb, 30)
        self.assertEqual(rows[-1].draw_length_amo_in, 31)

    def test_shelfless_uses_measured_offset_and_chart_validation(self):
        recommendation = recommend_equipment("mongolian_traditional", 40, 28, arrow_pass_offset_mm=25)

        self.assertEqual(recommendation.bow_type, "shelfless_traditional")
        self.assertEqual(recommendation.arrow_pass_offset_mm, 25)
        self.assertIn("offset", recommendation.center_shot)
        self.assertIn("manufacturer chart", recommendation.validation)

    def test_negative_offset_is_rejected(self):
        with self.assertRaises(ValueError):
            recommend_equipment("shelfless_traditional", 40, 28, arrow_pass_offset_mm=-1)


if __name__ == "__main__":
    unittest.main()

