import copy
import io
import json
from pathlib import Path
import sys
import ssl
import tempfile
import unittest
from argparse import Namespace
from contextlib import redirect_stdout
from unittest.mock import patch
from urllib.error import HTTPError, URLError

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import classify_reviews_llm as classifier
from evaluate_llm_classifier import evaluate


class ClassifierTests(unittest.TestCase):
    def setUp(self):
        self.review = {"review_id": "one", "review_text": "App crashes on login", "rating": 1}
        self.result = {"primary_theme": "stability_performance", "journey_stage": "app_access", "severity": "high", "likely_owner": "mobile_app", "certainty": "clear", "secondary_themes": [], "evidence": ["App crashes"], "rationale": "Launch failure.", "uncertainty_reason": ""}
        self.provenance = {"provider": "groq", "model": "test", "prompt_hash": "v1", "example_review_ids": []}

    def record(self):
        return classifier.classify_record(self.review, self.provenance, lambda _: copy.deepcopy(self.result))

    def test_evidence_hallucination_is_pending(self):
        self.result["evidence"] = ["Driver was unsafe"]
        row = self.record()
        self.assertEqual(row["status"], "pending")
        self.assertIsNone(row["classification"])

    def test_unknown_enum_and_probability_rejected(self):
        self.result["severity"] = "urgent"
        self.assertEqual(self.record()["status"], "pending")
        self.result["severity"] = "high"
        self.result["confidence"] = 0.99
        self.assertEqual(self.record()["status"], "pending")

    def test_valid_is_only_suggestion_and_ambiguity_queued(self):
        self.assertEqual(self.record()["status"], "model_suggested")
        self.result["secondary_themes"] = ["login_authentication"]
        self.assertEqual(self.record()["status"], "needs_review")

    def test_edited_reviews_and_revision_invalidate_resume(self):
        row = self.record()
        self.assertTrue(classifier.reusable(row, self.review, self.provenance))
        self.assertFalse(classifier.reusable(row, dict(self.review, review_text="Fixed now"), self.provenance))
        self.assertFalse(classifier.reusable(row, dict(self.review, rating=5), self.provenance))
        self.assertFalse(classifier.reusable(row, self.review, dict(self.provenance, prompt_hash="v2")))
        row["status"] = "pending"
        self.assertFalse(classifier.reusable(row, self.review, self.provenance))

    def test_training_excludes_every_holdout(self):
        examples = classifier.load_examples()
        reserved = {r["review_id"] for f in classifier.HOLDOUT_FILES for r in classifier.read_json(classifier.ROOT / "analysis" / f)}
        self.assertTrue(examples)
        self.assertFalse(reserved.intersection(x["labels"]["review_id"] for x in examples))

    def test_capped_runs_advance_backlog_after_resume(self):
        with tempfile.TemporaryDirectory() as tmp:
            source = Path(tmp) / "input.json"
            classifier.atomic_json(source, [dict(self.review, review_id=str(i)) for i in range(3)])
            output = Path(tmp) / "output"
            args = Namespace(input=source, output_dir=output, dry_run=True, model="test", max_attempts=1, holdout_only=False, limit=1)
            with redirect_stdout(io.StringIO()):
                self.assertEqual(classifier.run(args), 0)
                self.assertEqual(classifier.run(args), 0)
            summary = classifier.read_json(output / "summary.json")
            self.assertEqual(summary["processed"], 1)
            self.assertEqual(summary["reused"], 1)
            self.assertEqual(summary["current_records"], 2)
            self.assertEqual(summary["remaining_pending"], 1)

    def test_rate_limit_retries_bounded_and_secret_not_in_error(self):
        calls, sleeps = [], []
        def opener(req, timeout):
            calls.append(req)
            raise HTTPError(req.full_url, 429, "secret provider response", {"Retry-After": "999"}, None)
        with self.assertRaisesRegex(classifier.ProviderFailure, "^http_429$"):
            classifier.groq_classify(self.review, "prompt", "model", "secret", 3, opener, sleeps.append)
        self.assertEqual(len(calls), 3)
        self.assertEqual(sleeps, [60, 60])

    def test_api_schema_and_success(self):
        def opener(req, timeout):
            payload = json.loads(req.data)
            self.assertTrue(payload["response_format"]["json_schema"]["strict"])
            return io.StringIO(json.dumps({"choices": [{"message": {"content": json.dumps(self.result)}}]}))
        self.assertEqual(classifier.groq_classify(self.review, "prompt", "model", "secret", opener=opener), self.result)

    def test_auth_errors_do_not_retry(self):
        calls, sleeps = [], []
        def opener(req, timeout):
            calls.append(req)
            raise HTTPError(req.full_url, 401, "secret", {}, None)
        with self.assertRaisesRegex(classifier.ProviderFailure, "^http_401$"):
            classifier.groq_classify(self.review, "prompt", "model", "secret", 4, opener, sleeps.append)
        self.assertEqual(len(calls), 1)
        self.assertFalse(sleeps)

    def test_certificate_error_is_sanitized_without_retries(self):
        for wrapped in (False, True):
            calls, sleeps = [], []
            def opener(req, timeout):
                calls.append(req)
                failure = ssl.SSLCertVerificationError("certificate issuer missing")
                raise URLError(failure) if wrapped else failure
            with self.assertRaisesRegex(classifier.ProviderFailure, "^tls_certificate_error$"):
                classifier.groq_classify(self.review, "prompt", "model", "secret", 4, opener, sleeps.append)
            self.assertEqual(len(calls), 1)
            self.assertFalse(sleeps)

    def test_interrupt_has_concise_resume_message(self):
        with patch.object(sys, "argv", ["classify_reviews_llm.py", "--dry-run"]), patch.object(classifier, "run", side_effect=KeyboardInterrupt), patch.object(sys, "stderr", io.StringIO()) as stream:
            self.assertEqual(classifier.main(), 130)
            self.assertIn("resume", stream.getvalue())

    def test_invalid_response_is_pending(self):
        def fail(_):
            raise classifier.ProviderFailure("invalid_provider_json")
        self.assertEqual(classifier.classify_record(self.review, self.provenance, fail)["status"], "pending")

    def test_env_loader_no_interpolation(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / ".env"
            path.write_text('GROQ_API_KEY="$(do-not-execute)"\n')
            with patch.dict("os.environ", {}, clear=True):
                self.assertEqual(classifier.load_api_key(path), "$(do-not-execute)")
            with patch.dict("os.environ", {"GROQ_API_KEY": "environment-priority"}):
                self.assertEqual(classifier.load_api_key(path), "environment-priority")

    def test_mock_deterministic_and_refused_by_evaluation(self):
        self.assertEqual(classifier.mock_result(self.review), classifier.mock_result(self.review))
        row = self.record()
        row["provenance"] = dict(self.provenance, provider="mock")
        with self.assertRaisesRegex(ValueError, "Mock"):
            evaluate([], [row], [])

    def test_metrics_errors_and_missing_coverage(self):
        labels = [{"review_id": "one", "primary_theme": "tracking_eta"}, {"review_id": "two", "primary_theme": "positive"}]
        report = evaluate(labels, [self.record()], [self.review])
        self.assertEqual(report["coverage"], 0.5)
        self.assertEqual(report["macro_f1"], 0)
        self.assertEqual(len(report["errors"]), 1)
        self.assertEqual(report["per_category"]["tracking_eta"]["false_negative"], 1)
        self.assertEqual(report["per_category"]["stability_performance"]["false_positive"], 1)

    def test_stale_and_leaked_predictions_excluded(self):
        labels = [{"review_id": "one", "primary_theme": "stability_performance"}]
        row = self.record()
        report = evaluate(labels, [row], [dict(self.review, review_text="Edited")])
        self.assertEqual(report["coverage"], 0)
        self.assertIsNone(report["macro_f1"])
        row["provenance"]["example_review_ids"] = ["one"]
        with self.assertRaisesRegex(ValueError, "leaked"):
            evaluate(labels, [row], [self.review])

    def test_precision_recall_f1_and_confusion_counts(self):
        reviews = [dict(self.review, review_id=str(i)) for i in range(3)]
        rows = [classifier.classify_record(r, self.provenance, lambda _: copy.deepcopy(self.result)) for r in reviews]
        rows[2]["classification"]["primary_theme"] = "tracking_eta"
        labels = [{"review_id": "0", "primary_theme": "stability_performance"}, {"review_id": "1", "primary_theme": "tracking_eta"}, {"review_id": "2", "primary_theme": "tracking_eta"}]
        report = evaluate(labels, rows, reviews)
        self.assertAlmostEqual(report["accuracy"], 2 / 3)
        self.assertAlmostEqual(report["macro_f1"], 2 / 3)
        self.assertEqual(report["per_category"]["tracking_eta"]["precision"], 1)
        self.assertEqual(report["per_category"]["tracking_eta"]["recall"], .5)
        self.assertEqual(report["confusion_matrix"]["tracking_eta"]["stability_performance"], 1)

    def test_empty_predictions_have_no_performance_score(self):
        report = evaluate([{"review_id": "one", "primary_theme": "positive"}], [], [self.review])
        self.assertIsNone(report["accuracy"])
        self.assertIsNone(report["macro_f1"])
        self.assertIsNone(report["per_category"]["positive"]["f1"])


if __name__ == "__main__":
    unittest.main()
