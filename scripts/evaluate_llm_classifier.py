#!/usr/bin/env python3
"""Evaluate actual Groq suggestions against reserved labels and frozen review text."""
import argparse
from pathlib import Path
import sys

from classify_reviews_llm import ROOT, THEMES, HOLDOUT_FILES, atomic_json, content_hash, read_json, validate_result


def evaluate(labels, predictions, reviews):
    if len({r["review_id"] for r in labels}) != len(labels):
        raise ValueError("Duplicate heldout labels")
    if len({r["review_id"] for r in predictions}) != len(predictions):
        raise ValueError("Duplicate predictions")
    lookup = {r["review_id"]: r for r in predictions}
    texts = {r["review_id"]: r for r in reviews}
    pairs, exclusions, errors = [], [], []
    heldout_ids = {r["review_id"] for r in labels}
    for prediction in predictions:
        if prediction.get("provenance", {}).get("provider") == "mock":
            raise ValueError("Mock predictions cannot be evaluated as model performance")
        if heldout_ids.intersection(prediction.get("provenance", {}).get("example_review_ids", [])):
            raise ValueError("Heldout labels leaked into prompt examples")
    for label in labels:
        rid, truth = label["review_id"], label["primary_theme"]
        if truth not in THEMES:
            raise ValueError("Unknown ground truth theme")
        prediction, review = lookup.get(rid), texts.get(rid)
        reason = None
        if not review:
            reason = "missing_frozen_text"
        elif not prediction:
            reason = "missing_prediction"
        elif prediction.get("provenance", {}).get("provider") != "groq":
            reason = "not_groq_prediction"
        elif prediction.get("content_hash") != content_hash(review):
            reason = "edited_review_text_or_rating"
        elif prediction.get("status") not in ("model_suggested", "needs_review"):
            reason = "pending_or_invalid"
        else:
            try:
                validate_result(prediction["classification"], review["review_text"])
            except (ValueError, KeyError):
                reason = "invalid_classification"
        if reason:
            exclusions.append({"review_id": rid, "reason": reason})
            continue
        guess = prediction["classification"]["primary_theme"]
        pairs.append((truth, guess))
        if truth != guess:
            errors.append({"review_id": rid, "expected": truth, "predicted": guess, "evidence": prediction["classification"]["evidence"], "rationale": prediction["classification"]["rationale"]})
    per_category = {}
    for theme in THEMES:
        tp = sum(a == theme and b == theme for a, b in pairs)
        fp = sum(a != theme and b == theme for a, b in pairs)
        fn = sum(a == theme and b != theme for a, b in pairs)
        precision = tp / (tp + fp) if tp + fp else 0.0
        recall = tp / (tp + fn) if tp + fn else 0.0
        per_category[theme] = {"support": tp + fn, "heldout_support": sum(r["primary_theme"] == theme for r in labels), "true_positive": tp, "false_positive": fp, "false_negative": fn, "precision": precision if pairs else None, "recall": recall if pairs else None, "f1": 2 * precision * recall / (precision + recall) if precision + recall else (0.0 if pairs else None)}
    supported = [v["f1"] for v in per_category.values() if v["support"]]
    matched_provenance = {str((lookup[r["review_id"]]["provenance"].get("model"), lookup[r["review_id"]]["provenance"].get("prompt_hash"))) for r in labels if r["review_id"] in lookup and r["review_id"] not in {x["review_id"] for x in exclusions}}
    if len(matched_provenance) > 1:
        raise ValueError("Mixed model/prompt revisions: use a separate output directory per revision")
    confusion = {truth: {guess: sum(a == truth and b == guess for a, b in pairs) for guess in THEMES} for truth in THEMES}
    return {"heldout_count": len(labels), "evaluated_count": len(pairs), "coverage": len(pairs) / len(labels) if labels else 0.0, "accuracy": sum(a == b for a, b in pairs) / len(pairs) if pairs else None, "macro_f1": sum(supported) / len(supported) if supported else None, "macro_f1_all_taxonomy": sum(v["f1"] for v in per_category.values()) / len(THEMES) if pairs else None, "per_category": per_category, "confusion_matrix": confusion, "errors": errors, "exclusions": exclusions, "metric_policy": "Primary theme only; metrics use valid covered predictions. Macro F1 averages classes with evaluated ground-truth support; all-taxonomy variant includes every class with zero-division=0. Confusion matrix rows=true, columns=predicted. Coverage and exclusions must accompany scores. Human review is separate from this model evaluation."}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--predictions", type=Path, default=ROOT / "analysis/llm/live/predictions.json")
    parser.add_argument("--reviews", type=Path, default=ROOT / "analysis/manually_reviewed_sample.json", help="Frozen labelled review text, not the refreshed collection")
    parser.add_argument("--labels", type=Path, action="append", help="Optional reserved label file(s); defaults to all three existing heldout sets")
    parser.add_argument("--output", type=Path, default=ROOT / "analysis/llm/live/evaluation.json")
    args = parser.parse_args()
    try:
        predictions = read_json(args.predictions)
        reviews = read_json(args.reviews)
        files = args.labels or [ROOT / "analysis" / x for x in HOLDOUT_FILES]
        sets = {path.stem: evaluate(read_json(path), predictions, reviews) for path in files}
        combined = evaluate([r for path in files for r in read_json(path)], predictions, reviews)
        report = {"status": "evaluated" if combined["evaluated_count"] else "not_evaluated", "prediction_file": str(args.predictions), "sets": sets, "combined": combined}
        atomic_json(args.output, report)
        print(f"{report['status']}: {combined['evaluated_count']}/{combined['heldout_count']} covered; macro_f1={combined['macro_f1']}")
        return 0 if combined["evaluated_count"] else 2
    except (ValueError, OSError) as exc:
        parser.exit(2, str(exc) + "\n")


if __name__ == "__main__":
    sys.exit(main())
