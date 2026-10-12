# Review classification taxonomy

Each review receives one primary theme so category counts remain mutually exclusive. Secondary issues can be added later when multi-label analysis is needed.

## Primary themes

- `booking_cancellation`: creating, changing, cancelling, or confirming a booking; waitlist visibility.
- `tracking_eta`: live vehicle location, map behaviour, pickup/drop ETA, or tracking availability.
- `login_authentication`: login, logout, account verification, or login OTP delivery.
- `boarding_otp_checkin`: trip OTP, QR, seat-belt gate, boarding status, or no-show risk.
- `notifications`: missing, delayed, incorrect, or stale notifications.
- `stability_performance`: crashes, freezes, startup failures, or severe slowness.
- `ui_navigation`: confusing layout, unnecessary steps, missing information, or poor interaction design.
- `routing_trip_quality`: route grouping, pickup order, trip duration, or routing quality.
- `support_operations`: driver behaviour, vehicle assignment, transport desk, or operational service.
- `feedback_rating`: forced ratings, inaccessible feedback, or unresolved feedback workflow.
- `metro_ticketing`: metro-specific booking, QR, brightness, or offline-ticket problems.
- `positive`: review contains a clear positive product or service assessment.
- `unclear`: too little information to identify a defensible theme.

## Journey stages

- `app_access`, `trip_planning`, `booking`, `pre_pickup`, `boarding`, `in_trip`, `post_trip`, `cross_journey`, `not_applicable`.

## Likely owners

- `mobile_app`, `backend_platform`, `product_design`, `routing_data`, `customer_operations`, `shared_product_operations`, `unknown`.

Ownership is a hypothesis based only on public review text. It does not establish internal root cause.

## Severity

- `low`: cosmetic issue or vague dislike without a blocked task.
- `medium`: meaningful friction, repeated steps, or degraded usability.
- `high`: user cannot book, access, track, board, or complete a core commute task.
- `critical`: explicit immediate safety risk or severe harm. Use sparingly and only when the review supports it.
