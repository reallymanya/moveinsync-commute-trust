#!/usr/bin/env python3
"""Build the static PDF fallback for the MoveInSync FDE assignment."""

from pathlib import Path
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics
from reportlab.platypus import (
    BaseDocTemplate, Frame, KeepTogether, NextPageTemplate, PageBreak, PageTemplate,
    Paragraph, Spacer, Table, TableStyle,
)
from reportlab.graphics.shapes import Drawing, Rect, String, Line, Circle

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "submission" / "final" / "MoveInSync_FDE_Assignment.pdf"

BG = colors.HexColor("#050806")
SURFACE = colors.HexColor("#0a0e0b")
GREEN = colors.HexColor("#183d25")
GREEN_2 = colors.HexColor("#50b83c")
ACCENT = colors.HexColor("#67df55")
PALE = colors.HexColor("#eef6eb")
INK = colors.HexColor("#10130f")
MUTED = colors.HexColor("#626b62")
LINE = colors.HexColor("#cbd1c7")
RED = colors.HexColor("#c84d4d")
ORANGE = colors.HexColor("#d9852e")
BLUE = colors.HexColor("#3e79b8")

font_dir = Path("/System/Library/Fonts/Supplemental")
regular_font = font_dir / "Arial.ttf"
bold_font = font_dir / "Arial Bold.ttf"
if regular_font.exists() and bold_font.exists():
    pdfmetrics.registerFont(TTFont("MIS-Regular", str(regular_font)))
    pdfmetrics.registerFont(TTFont("MIS-Bold", str(bold_font)))
    FONT, BOLD = "MIS-Regular", "MIS-Bold"
else:
    FONT, BOLD = "Helvetica", "Helvetica-Bold"

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="Hero", fontName=BOLD, fontSize=31, leading=31, textColor=colors.white, spaceAfter=10))
styles.add(ParagraphStyle(name="HeroDeck", fontName=FONT, fontSize=11, leading=15.5, textColor=colors.HexColor("#b9c4bc")))
styles.add(ParagraphStyle(name="HeroMeta", fontName=BOLD, fontSize=7.5, leading=10, tracking=1.1, textColor=ACCENT))
styles.add(ParagraphStyle(name="Kicker", fontName=BOLD, fontSize=7.5, leading=10, tracking=1.4, textColor=GREEN_2, spaceAfter=8))
styles.add(ParagraphStyle(name="H1x", fontName=BOLD, fontSize=22, leading=27, textColor=INK, spaceBefore=6, spaceAfter=12))
styles.add(ParagraphStyle(name="H2x", fontName=BOLD, fontSize=15, leading=19, textColor=INK, spaceBefore=8, spaceAfter=8))
styles.add(ParagraphStyle(name="Bodyx", fontName=FONT, fontSize=9.5, leading=14.5, textColor=MUTED, spaceAfter=8))
styles.add(ParagraphStyle(name="BodyBold", fontName=BOLD, fontSize=9.5, leading=14.5, textColor=INK, spaceAfter=4))
styles.add(ParagraphStyle(name="Small", fontName=FONT, fontSize=7.5, leading=11, textColor=MUTED))
styles.add(ParagraphStyle(name="TableHead", fontName=BOLD, fontSize=8, leading=10, textColor=colors.white))
styles.add(ParagraphStyle(name="TableBody", fontName=FONT, fontSize=8, leading=10, textColor=INK))
styles.add(ParagraphStyle(name="Callout", fontName=BOLD, fontSize=10.5, leading=15, textColor=INK))


def footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(GREEN_2)
    canvas.line(18 * mm, 13 * mm, 192 * mm, 13 * mm)
    canvas.setFont(FONT, 7)
    canvas.setFillColor(MUTED)
    canvas.drawString(18 * mm, 8.5 * mm, "MOVEINSYNC  /  COMMUTE TRUST REVIEW  /  PUBLIC PLAY STORE EVIDENCE")
    canvas.drawRightString(192 * mm, 8.5 * mm, str(doc.page))
    canvas.restoreState()


def hero(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(BG)
    canvas.rect(0, 0, A4[0], A4[1], fill=1, stroke=0)

    # Compact brand lockup, echoing the final dashboard header.
    bx, by = 18 * mm, 271 * mm
    canvas.setFillColor(ACCENT)
    canvas.roundRect(bx, by, 11 * mm, 11 * mm, 1.2 * mm, fill=1, stroke=0)
    canvas.setStrokeColor(colors.white)
    canvas.setLineWidth(1.7)
    canvas.line(bx + 2.2 * mm, by + 7.2 * mm, bx + 8.7 * mm, by + 7.2 * mm)
    canvas.line(bx + 8.7 * mm, by + 7.2 * mm, bx + 7.1 * mm, by + 8.8 * mm)
    canvas.line(bx + 2.2 * mm, by + 3.8 * mm, bx + 8.7 * mm, by + 3.8 * mm)
    canvas.line(bx + 2.2 * mm, by + 3.8 * mm, bx + 3.8 * mm, by + 2.2 * mm)
    canvas.setFillColor(colors.white)
    canvas.setFont(BOLD, 11)
    canvas.drawString(bx + 15 * mm, by + 5.9 * mm, "MOVEINSYNC")
    canvas.setFont(FONT, 6.5)
    canvas.setFillColor(colors.HexColor("#8f9991"))
    canvas.drawString(bx + 15 * mm, by + 1.8 * mm, "COMMUTE TRUST REVIEW")

    # Transport-specific hero image used by the final website.
    art = ROOT / "submission" / "bento-dashboard" / "assets" / "employee-commute-network-hero-v2.png"
    canvas.drawImage(ImageReader(str(art)), 18 * mm, 18 * mm, width=174 * mm, height=116 * mm,
                     preserveAspectRatio=True, anchor="c", mask="auto")
    canvas.setStrokeColor(colors.HexColor("#304137"))
    canvas.setLineWidth(.8)
    canvas.rect(18 * mm, 18 * mm, 174 * mm, 116 * mm, fill=0, stroke=1)
    canvas.setFillColor(colors.Color(0.02, 0.03, 0.02, alpha=.78))
    canvas.rect(18 * mm, 18 * mm, 174 * mm, 14 * mm, fill=1, stroke=0)
    canvas.setFont(BOLD, 6.5)
    canvas.setFillColor(colors.white)
    canvas.drawString(23 * mm, 23.2 * mm, "BOOKING  /  ALLOCATION  /  PICKUP  /  LIVE TRACKING  /  BOARDING")
    canvas.setFillColor(ACCENT)
    canvas.drawRightString(187 * mm, 23.2 * mm, "ONE CRITICAL JOURNEY")
    canvas.restoreState()


def problem_chart():
    rows = [("Access & reliability", 39.7, RED), ("Trip truth", 28.6, ORANGE),
            ("Recovery & support", 17.5, BLUE), ("Task completion UX", 14.3, GREEN_2)]
    d = Drawing(480, 190)
    d.add(String(0, 173, "Share of 63 recent manually coded complaints", fontName=BOLD, fontSize=10, fillColor=INK))
    for i, (label, value, color) in enumerate(rows):
        y = 135 - i * 36
        d.add(String(0, y + 5, label, fontName=FONT, fontSize=8, fillColor=MUTED))
        d.add(Rect(130, y, 290, 15, rx=5, ry=5, fillColor=colors.HexColor("#edf1ee"), strokeColor=None))
        d.add(Rect(130, y, 290 * value / 45, 15, rx=5, ry=5, fillColor=color, strokeColor=None))
        d.add(String(430, y + 4, f"{value:.1f}%", fontName=BOLD, fontSize=8, fillColor=INK))
    return d


def rating_chart():
    values = [4.09, 3.31, 3.45, 3.95, 4.02, 3.82, 4.04, 3.90, 3.54, 3.64, 3.80]
    labels = ["Jul 27", "Aug 3", "Aug 10", "Aug 17", "Aug 24", "Aug 31", "Sep 7", "Sep 14", "Sep 21", "Sep 28", "Oct 5"]
    d = Drawing(480, 175)
    d.add(String(0, 158, "Weekly average in the 600 newest-review sample", fontName=BOLD, fontSize=10, fillColor=INK))
    x0, y0, w, h = 35, 25, 420, 110
    for score in [3.0, 3.5, 4.0, 4.5]:
        y = y0 + (score - 3.0) / 1.5 * h
        d.add(Line(x0, y, x0 + w, y, strokeColor=LINE, strokeWidth=.5))
        d.add(String(5, y - 3, f"{score:.1f}", fontName=FONT, fontSize=7, fillColor=MUTED))
    pts = []
    for i, value in enumerate(values):
        x = x0 + i * w / (len(values) - 1)
        y = y0 + (value - 3.0) / 1.5 * h
        pts.append((x, y))
        d.add(Circle(x, y, 2.5, fillColor=GREEN_2, strokeColor=None))
        if i in [0, 3, 6, 9, 10]:
            d.add(String(x - 12, 8, labels[i], fontName=FONT, fontSize=6.5, fillColor=MUTED))
    for a, b in zip(pts, pts[1:]):
        d.add(Line(a[0], a[1], b[0], b[1], strokeColor=GREEN_2, strokeWidth=2))
    return d


def priority_block(label, title, evidence, build, measure, color):
    data = [[Paragraph(label, styles["BodyBold"]), Paragraph(f"<b>{title}</b><br/><font color='#5d6d65'>{evidence}</font>", styles["Bodyx"])],
            ["", Paragraph(f"<b>Build next:</b> {build}", styles["Bodyx"])],
            ["", Paragraph(f"<b>Know it worked:</b> {measure}", styles["Bodyx"])]]
    t = Table(data, colWidths=[18 * mm, 148 * mm], hAlign="LEFT")
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.white), ("BOX", (0, 0), (-1, -1), .7, LINE),
        ("LINEBEFORE", (0, 0), (0, -1), 4, color), ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("SPAN", (0, 0), (0, -1)), ("ALIGN", (0, 0), (0, -1), "CENTER"),
        ("TOPPADDING", (0, 0), (-1, -1), 7), ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ("LEFTPADDING", (0, 0), (-1, -1), 9), ("RIGHTPADDING", (0, 0), (-1, -1), 9),
    ]))
    return KeepTogether([t, Spacer(1, 4 * mm)])


def build():
    OUT.parent.mkdir(parents=True, exist_ok=True)
    doc = BaseDocTemplate(str(OUT), pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm,
                          topMargin=18 * mm, bottomMargin=18 * mm, title="MoveInSync FDE Candidate Assignment")
    frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="normal")
    hero_frame = Frame(24 * mm, 143 * mm, 162 * mm, 105 * mm, id="hero", showBoundary=0,
                       leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
    doc.addPageTemplates([
        PageTemplate(id="cover", frames=[hero_frame], onPage=hero),
        PageTemplate(id="body", frames=[frame], onPage=footer),
    ])
    story = [
        Paragraph("FIELD NOTE 01 - EMPLOYEE EXPERIENCE", styles["HeroMeta"]),
        Spacer(1, 5 * mm),
        Paragraph("Fix commute trust before polishing the MoveInSync app", styles["Hero"]),
        Spacer(1, 3 * mm),
        Paragraph("The fastest credible path to a higher rating is to make the commute dependable at its two highest-stakes moments: opening the app and trusting the trip state. This report turns public Play Store evidence into a 30-day engineering plan.", styles["HeroDeck"]),
        Spacer(1, 6 * mm),
        Paragraph("PUBLIC GOOGLE PLAY EVIDENCE THROUGH 9 OCT 2026  /  910 UNIQUE REVIEWS", styles["HeroMeta"]),
        NextPageTemplate("body"),
        PageBreak(),
        Paragraph("EXECUTIVE SUMMARY", styles["Kicker"]),
        Paragraph("Restore trust before redesigning the surface", styles["H1x"]),
        Paragraph("Access and reliability is the first fix. It represents <b>39.7%</b> of the 63 recent manually coded complaints. Crashes, loading failures and login/OTP failures prevent every other commute task.", styles["Bodyx"]),
        Paragraph("Trip truth is the second fix. Tracking, route, notification and boarding-state complaints contribute another <b>28.6%</b>. Together, these two groups account for <b>68.3%</b> of the recent coded complaint set.", styles["Bodyx"]),
        Paragraph("In the 600-review newest-sort sample, the mean was <b>3.77</b> and <b>29.3%</b> were one or two stars. These are sample signals, not the Play Store's official aggregate rating.", styles["Bodyx"]),
        Spacer(1, 5 * mm),
        Table([[Paragraph("3.77 / 5", styles["H1x"]), Paragraph("29.3%", styles["H1x"]), Paragraph("68.3%", styles["H1x"])],
               [Paragraph("Newest-review sample", styles["Small"]), Paragraph("One-to-two-star share", styles["Small"]), Paragraph("Top two complaint groups", styles["Small"])]],
              colWidths=[56 * mm] * 3, style=TableStyle([("BACKGROUND", (0, 0), (-1, -1), PALE), ("BOX", (0, 0), (-1, -1), .7, LINE), ("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 10), ("TOPPADDING", (0, 0), (-1, -1), 10), ("BOTTOMPADDING", (0, -1), (-1, -1), 10)])),
        Spacer(1, 8 * mm), problem_chart(), Spacer(1, 5 * mm),
        Paragraph("Decision: ship release health gates first, then a canonical Trip Assurance surface, then structured recovery. Do not begin with a broad visual redesign.", styles["Callout"]),
        PageBreak(),
        Paragraph("PUBLIC EVIDENCE", styles["Kicker"]),
        Paragraph("Ratings move; the trust failures repeat", styles["H1x"]),
        rating_chart(), Spacer(1, 5 * mm),
        Paragraph("The weekly sample is volatile and should not be overinterpreted. The complaint language is more decision-useful: employees repeatedly describe being unable to access the app or unable to trust the booking, ETA, route and boarding state presented.", styles["Bodyx"]),
        Paragraph("A keyword classifier was built and validated, but achieved only <b>43.3% exact primary-theme agreement</b> on a frozen 30-review set. Automated theme totals were rejected; the recommendation uses manually coded evidence.", styles["Bodyx"]),
        Spacer(1, 3 * mm),
        Paragraph("Version signal", styles["H2x"]),
        Table([[Paragraph(x, styles["TableHead"]) for x in ["Version", "Reviews", "Avg rating", "1-2 star share"]]] +
              [[Paragraph(str(v), styles["TableBody"]) for v in row] for row in [
                  ("12.16.0", 67, "3.85", "26.9%"), ("12.16.1", 38, "3.53", "34.2%"),
                  ("12.17.0", 141, "3.76", "29.8%"), ("12.18.0", 65, "4.11", "20.0%"),
                  ("12.18.1", 94, "3.90", "26.6%"), ("12.19.0", 102, "3.58", "35.3%")]],
              colWidths=[38 * mm, 38 * mm, 44 * mm, 48 * mm], repeatRows=1,
              style=TableStyle([("BACKGROUND", (0, 0), (-1, 0), GREEN), ("GRID", (0, 0), (-1, -1), .5, LINE), ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, PALE]), ("ALIGN", (1, 1), (-1, -1), "RIGHT"), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("TOPPADDING", (0, 0), (-1, -1), 6), ("BOTTOMPADDING", (0, 0), (-1, -1), 6)])),
        Spacer(1, 4 * mm), Paragraph("Version comparisons are descriptive, not causal. Versions overlap in time and 9.2% of the full deduplicated dataset has no reported version. Pair this view with internal crash and journey telemetry before rollback decisions.", styles["Small"]),
        PageBreak(),
        Paragraph("PRIORITIZED BUILD PLAN", styles["Kicker"]),
        Paragraph("What engineering should start tomorrow", styles["H1x"]),
        priority_block("P0", "Make access boringly reliable", "39.7% of recent coded complaints.", "Crash/startup telemetry; login and OTP funnel with failure codes; secure session recovery; retry/fallback states; staged rollout and rollback switch.", "Proposed SLOs: crash-free sessions at least 99.5%; core screen loads within 5s at least 99%; login/OTP completion at least 98%. Calibrate against internal baselines.", RED),
        priority_block("P0", "Create one source of trip truth", "28.6% of recent coded complaints.", "Idempotent booking and cancellation writes; canonical trip-state contract; server reconciliation; cached last-confirmed trip; timestamped GPS freshness; explicit stale and mismatch states.", "Booking reconciliation; status mismatches per 1,000 active trips; P95 location freshness; ETA error by version and tenant.", ORANGE),
        priority_block("P1", "Turn failures into traceable recovery", "17.5% of recent coded complaints.", "Structured issue categories; automatic trip/app/device context; visible case ID and status; operations-versus-product routing; Play review response workflow.", "Support contacts per 1,000 trips; acknowledgement and resolution time; repeat contacts; developer response rate.", BLUE),
        priority_block("P2", "Remove task friction", "14.3% of recent coded complaints.", "Skippable feedback; explicit waitlist and confirmation; booking/cancellation receipt; contextual safety prompts; no-show evidence and dispute path.", "Task completion; forced-feedback dismissals; no-show disputes; median time to complete core tasks.", GREEN_2),
        PageBreak(),
        Paragraph("PRODUCT CONCEPT", styles["Kicker"]),
        Paragraph("Trip Assurance: one surface for the facts that matter", styles["H1x"]),
        Paragraph("The interactive HTML submission demonstrates these three states with an automatic preview and user-controlled switching. The product decision is the state contract, not merely the visual treatment.", styles["Bodyx"]),
        Paragraph('<link href="MoveInSync_FDE_Interactive_Dashboard.html" color="#38882b"><b>OPEN THE INTERACTIVE DASHBOARD INCLUDED WITH THIS SUBMISSION</b></link>', styles["Bodyx"]),
        Table([[Paragraph("NORMAL", styles["BodyBold"]), Paragraph("STALE GPS", styles["BodyBold"]), Paragraph("SYSTEM MISMATCH", styles["BodyBold"])],
               [Paragraph("Booking, cab, pickup time, tracking and OTP agree. Show live ETA with an update timestamp.", styles["Bodyx"]), Paragraph("Keep the confirmed booking, label the last update, and never present a guessed ETA as live.", styles["Bodyx"]), Paragraph("Preserve the last confirmed fact, admit the conflict, open a diagnostic-rich case, and show its ID.", styles["Bodyx"])]],
              colWidths=[56 * mm] * 3, style=TableStyle([("BACKGROUND", (0, 0), (-1, 0), PALE), ("BOX", (0, 0), (-1, -1), .7, LINE), ("INNERGRID", (0, 0), (-1, -1), .5, LINE), ("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 9), ("RIGHTPADDING", (0, 0), (-1, -1), 9), ("TOPPADDING", (0, 0), (-1, -1), 9), ("BOTTOMPADDING", (0, 0), (-1, -1), 9)])),
        Spacer(1, 8 * mm),
        Paragraph("Core contract", styles["H2x"]),
        Paragraph("booking_state + allocation_state + pickup_time + vehicle + location_age + eta_confidence + boarding_state + recovery_case", styles["Callout"]),
        Spacer(1, 5 * mm),
        Paragraph("Rules", styles["H2x"]),
        Paragraph("- A booking mutation must be idempotent.<br/>- Contradictory sources must resolve through a canonical state machine.<br/>- Every live value carries freshness and confidence.<br/>- Offline or stale states retain only the last confirmed fact.<br/>- Recovery automatically includes trip and app diagnostics.<br/>- Safety actions remain available even when other data is degraded.", styles["Bodyx"]),
        PageBreak(),
        Paragraph("30-DAY DELIVERY", styles["Kicker"]),
        Paragraph("Sequence work around learning and release safety", styles["H1x"]),
        Table([[Paragraph("Days", styles["TableHead"]), Paragraph("Outcome", styles["TableHead"]), Paragraph("Work", styles["TableHead"])],
               [Paragraph("1-3", styles["TableBody"]), Paragraph("A shared failure view", styles["BodyBold"]), Paragraph("Instrument launch, authentication, booking retrieval, allocation, tracking freshness, OTP and support handoff. Cut by version, OS, device, network and tenant.", styles["Bodyx"])],
               [Paragraph("4-10", styles["TableBody"]), Paragraph("Stable access", styles["BodyBold"]), Paragraph("Fix largest crash/authentication clusters. Add session recovery and OTP failure states. Pause staged rollout on SLO regression.", styles["Bodyx"])],
               [Paragraph("8-18", styles["TableBody"]), Paragraph("Trip Assurance pilot", styles["BodyBold"]), Paragraph("Ship the canonical view model, booking reconciliation and stale-state handling behind a feature flag to one enterprise cohort with a comparable holdout.", styles["Bodyx"])],
               [Paragraph("15-24", styles["TableBody"]), Paragraph("Traceable recovery", styles["BodyBold"]), Paragraph("Attach diagnostics, expose case status and route operational versus technical failures.", styles["Bodyx"])],
               [Paragraph("25-30", styles["TableBody"]), Paragraph("Scale decision", styles["BodyBold"]), Paragraph("Review critical journey success, trust failures, support contacts, low-star review rate and guardrails. Expand only on supported improvement.", styles["Bodyx"])]],
              colWidths=[20 * mm, 43 * mm, 105 * mm], repeatRows=1,
              style=TableStyle([("BACKGROUND", (0, 0), (-1, 0), GREEN), ("GRID", (0, 0), (-1, -1), .5, LINE), ("VALIGN", (0, 0), (-1, -1), "TOP"), ("TOPPADDING", (0, 0), (-1, -1), 7), ("BOTTOMPADDING", (0, 0), (-1, -1), 7), ("LEFTPADDING", (0, 0), (-1, -1), 7), ("RIGHTPADDING", (0, 0), (-1, -1), 7)])),
        Spacer(1, 8 * mm),
        Paragraph("Measurement", styles["H2x"]),
        Paragraph("<b>Primary:</b> critical journey success and trust failure rate per 1,000 active trips.<br/><b>Lagging:</b> one-to-two-star reviews per 10,000 completed trips, tagged to access or trip truth.<br/><b>Guardrails:</b> false no-show disputes, SOS availability, battery/data use and support contacts.", styles["Bodyx"]),
        PageBreak(),
        Paragraph("METHODS AND LIMITS", styles["Kicker"]),
        Paragraph("A reproducible pipeline with explicit uncertainty", styles["H1x"]),
        Paragraph("I used Node.js and the open-source google-play-scraper package to collect 600 newest and 400 helpful English-language reviews for India, then deduplicated them by review ID. Saved data excludes public reviewer names and profile images.", styles["Bodyx"]),
        Paragraph("I manually coded 160 reviews with one primary theme using a documented taxonomy. Of these, 118 were specific complaints; 63 fell inside the recent 90-day window. The manual set is intentionally complaint-heavy, so theme shares indicate direction rather than population prevalence.", styles["Bodyx"]),
        Paragraph("The 910-review decision baseline joins newest and helpfulness-ranked samples and is not a random sample. Weekly rating uses only the 600 newest reviews. Version analysis is descriptive. Google Play may display different aggregate ratings by locale or device.", styles["Bodyx"]),
        Paragraph("A frozen keyword classifier evaluation reached 43.3% exact primary-theme accuracy. Its aggregate output is excluded. A production monitoring loop should use a stronger semantic classifier, human review of low-confidence cases and periodic frozen-set evaluation.", styles["Bodyx"]),
        Paragraph("The submitted repository implements the recurring public monitor: GitHub Actions refetches the quantitative layer every Monday at 07:47 IST, validates it, rebuilds the dashboard and triggers the connected Vercel deployment. The 160 human-coded records remain a visibly dated snapshot until another human review pass.", styles["Bodyx"]),
        Spacer(1, 6 * mm),
        Paragraph("Reproducible commands", styles["H2x"]),
        Table([[Paragraph("npm run fetch:reviews", styles["TableBody"]), Paragraph("Collect and deduplicate current public reviews", styles["TableBody"])],
               [Paragraph("npm run build:manual-analysis", styles["TableBody"]), Paragraph("Combine audited human labels and calculate themes", styles["TableBody"])],
               [Paragraph("npm run analyze:reviews", styles["TableBody"]), Paragraph("Generate quality, time and version summaries", styles["TableBody"])],
               [Paragraph("npm run refresh:data", styles["TableBody"]), Paragraph("Run the complete recurring refresh and validation pipeline", styles["TableBody"])],
               [Paragraph("npm run build:dashboard", styles["TableBody"]), Paragraph("Produce the portable one-file interactive dashboard", styles["TableBody"])]],
              colWidths=[65 * mm, 103 * mm], style=TableStyle([("GRID", (0, 0), (-1, -1), .5, LINE), ("BACKGROUND", (0, 0), (0, -1), PALE), ("VALIGN", (0, 0), (-1, -1), "TOP"), ("TOPPADDING", (0, 0), (-1, -1), 8), ("BOTTOMPADDING", (0, 0), (-1, -1), 8), ("LEFTPADDING", (0, 0), (-1, -1), 8)])),
        Spacer(1, 6 * mm),
        Paragraph("Tools used", styles["H2x"]),
        Paragraph("Node.js and JavaScript for collection and analysis; google-play-scraper for public reviews; manual coding with a documented taxonomy; Chart.js and vanilla JavaScript for the portable dashboard; ReportLab for this PDF; and AI-assisted coding and visual iteration with all quantitative claims checked against saved outputs.", styles["Bodyx"]),
        Spacer(1, 4 * mm),
        Paragraph("Next evidence to request", styles["H2x"]),
        Paragraph("Internal crash traces, authentication/OTP funnel events, booking-state reconciliation logs, GPS freshness and ETA error, enterprise-tenant splits, completed-trip denominators, support categories and no-show disputes. These will verify root causes and calibrate the proposed SLOs before broad rollout.", styles["Bodyx"]),
    ]
    doc.build(story)
    print(OUT)


if __name__ == "__main__":
    build()
