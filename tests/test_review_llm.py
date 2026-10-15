import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from classify_reviews_llm import content_hash
from review_llm_predictions import approve_rows, aggregate


class HumanReviewTests(unittest.TestCase):
    def setUp(self):
        self.review = {"review_id": "r1", "review_text": "Cannot book a cab", "rating": 1}
        self.prediction = {"review_id": "r1", "content_hash": content_hash(self.review), "provenance": {"provider": "groq"}}
        self.decision = {"review_id": "r1", "content_hash": content_hash(self.review), "decision": "approve", "primary_theme": "booking_cancellation", "severity": "high", "evidence": "Cannot book", "reviewer": "tester", "notes": "Booking blocked"}

    def apply(self):
        return approve_rows([self.decision], {"r1": self.prediction}, {"r1": self.review})

    def test_real_human_approval_and_denominator(self):
        approved, rejected = self.apply()
        self.assertEqual(len(approved), 1)
        self.assertEqual(rejected, [])
        self.assertEqual(aggregate(approved)["groups"][3]["share"], 1)
        self.assertIsNone(aggregate([])["groups"][0]["share"])

    def test_edited_review_invalidates_approval(self):
        self.review["review_text"] = "Now works"
        with self.assertRaisesRegex(ValueError, "Stale"):
            self.apply()

    def test_mock_cannot_be_published(self):
        self.prediction["provenance"]["provider"] = "mock"
        with self.assertRaisesRegex(ValueError, "Mock"):
            self.apply()

    def test_invented_evidence_rejected(self):
        self.decision["evidence"] = "driver was rude"
        with self.assertRaisesRegex(ValueError, "quotation"):
            self.apply()

    def test_blank_decisions_are_not_approval(self):
        self.decision["decision"] = ""
        self.assertEqual(self.apply(), ([], []))


if __name__ == "__main__":
    unittest.main()
