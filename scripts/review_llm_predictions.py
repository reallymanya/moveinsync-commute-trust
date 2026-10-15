#!/usr/bin/env python3
"""Export a review worksheet; apply explicit, content-bound human decisions."""
import argparse
import csv
from datetime import datetime, timezone
from pathlib import Path
import sys

from classify_reviews_llm import ROOT, ENUMS, THEMES, atomic_json, content_hash, read_json

GROUPS = {
    "access_reliability": ("stability_performance", "login_authentication"),
    "trip_truth": ("tracking_eta", "routing_trip_quality", "notifications", "boarding_otp_checkin"),
    "recovery_support": ("support_operations", "feedback_rating"),
    "task_completion_ux": ("ui_navigation", "booking_cancellation", "metro_ticketing"),
}
FIELDS = ["review_id", "content_hash", "review_text", "suggested_theme", "suggested_severity",
          "queue_reasons", "decision", "primary_theme", "severity", "evidence", "reviewer", "notes"]


def approve_rows(decisions, predictions, reviews):
    approved, rejected, seen = [], [], set()
    for row in decisions:
        decision = row.get("decision", "").strip().lower()
        if not decision:
            continue
        rid = row.get("review_id", "")
        if decision not in ("approve", "reject") or rid in seen:
            raise ValueError("Invalid or duplicate decision for " + rid)
        seen.add(rid)
        source, prediction = reviews.get(rid), predictions.get(rid)
        if not source or not prediction:
            raise ValueError("Unknown review: " + rid)
        if prediction.get("provenance", {}).get("provider") != "groq":
            raise ValueError("Mock predictions cannot be approved")
        if row.get("content_hash") != content_hash(source) or prediction.get("content_hash") != content_hash(source):
            raise ValueError("Stale review or prediction: " + rid)
        reviewer, notes = row.get("reviewer", "").strip(), row.get("notes", "").strip()
        if not reviewer or not notes:
            raise ValueError("Reviewer and notes required for " + rid)
        if decision == "reject":
            rejected.append({"review_id": rid, "content_hash": row["content_hash"], "reviewer": reviewer, "notes": notes})
            continue
        theme, severity, evidence = row.get("primary_theme"), row.get("severity"), row.get("evidence", "")
        if theme not in THEMES or severity not in ENUMS["severity"]:
            raise ValueError("Invalid approved category or severity for " + rid)
        if not evidence.strip() or evidence not in source["review_text"]:
            raise ValueError("An exact supporting quotation is required for " + rid)
        approved.append({
            "review_id": rid, "content_hash": row["content_hash"], "date": source.get("date"),
            "rating": source.get("rating"), "app_version": source.get("app_version"),
            "primary_theme": theme, "severity": severity, "evidence": evidence,
            "source": "human_reviewed_llm_suggestion", "reviewer": reviewer, "notes": notes,
            "model_provenance": prediction["provenance"],
        })
    return approved, rejected


def aggregate(approved):
    complaints = [r for r in approved if r["primary_theme"] not in ("positive", "unclear")]
    return {
        "scope": "Human-approved rows in this decision worksheet; not all Play Store users",
        "approved_reviews": len(approved), "specific_complaints": len(complaints),
        "groups": [{"group": group, "count": sum(r["primary_theme"] in themes for r in complaints),
                    "share": sum(r["primary_theme"] in themes for r in complaints) / len(complaints) if complaints else None}
                   for group, themes in GROUPS.items()],
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, default=ROOT / "data/playstore_reviews.json")
    parser.add_argument("--predictions", type=Path, default=ROOT / "analysis/llm/live/predictions.json")
    parser.add_argument("--worksheet", type=Path, default=ROOT / "analysis/llm/review_decisions.csv")
    parser.add_argument("--apply", action="store_true", help="Validate filled worksheet and export approved results")
    parser.add_argument("--output-dir", type=Path, default=ROOT / "analysis/llm/reviewed")
    args = parser.parse_args()
    review_list, prediction_list = read_json(args.input), read_json(args.predictions)
    reviews = {r["review_id"]: r for r in review_list}
    predictions = {r["review_id"]: r for r in prediction_list}
    if len(reviews) != len(review_list) or len(predictions) != len(prediction_list):
        raise ValueError("Duplicate review IDs")
    if args.apply:
        with args.worksheet.open(newline="", encoding="utf-8") as stream:
            approved, rejected = approve_rows(csv.DictReader(stream), predictions, reviews)
        now = datetime.now(timezone.utc).isoformat()
        atomic_json(args.output_dir / "approved_reviews.json", approved)
        atomic_json(args.output_dir / "rejected_reviews.json", rejected)
        atomic_json(args.output_dir / "review_metrics.json", {"generated_at": now, **aggregate(approved)})
        print(f"Exported {len(approved)} human-approved reviews; {len(rejected)} rejected. Dashboard unchanged.")
    else:
        args.worksheet.parent.mkdir(parents=True, exist_ok=True)
        # Exclusive creation protects previously entered decisions.
        with args.worksheet.open("x", newline="", encoding="utf-8") as stream:
            writer = csv.DictWriter(stream, fieldnames=FIELDS)
            writer.writeheader()
            for rid, prediction in predictions.items():
                source = reviews.get(rid)
                if not source or prediction.get("content_hash") != content_hash(source):
                    continue
                result = prediction.get("classification") or {}
                writer.writerow({"review_id": rid, "content_hash": prediction["content_hash"],
                    "review_text": source["review_text"], "suggested_theme": result.get("primary_theme", ""),
                    "suggested_severity": result.get("severity", ""),
                    "queue_reasons": "; ".join(prediction.get("queue_reasons", [])),
                    "evidence": "", "decision": "", "primary_theme": "", "severity": "", "reviewer": "", "notes": ""})
        print("Created worksheet. Fill decision, primary_theme, severity, evidence, reviewer and notes; then use --apply.")


if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError, KeyError) as exc:
        print("Review export failed: " + str(exc), file=sys.stderr)
        sys.exit(1)
