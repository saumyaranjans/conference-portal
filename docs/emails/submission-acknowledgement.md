# System-generated email — Abstract submission acknowledgement

**Trigger:** sent automatically the moment an author submits an abstract
(`submitForReview`, first submission only — not on a revision resubmit).
**Recipients:** the corresponding author **and every co-author who has an email**.
**Transport:** Resend (`sendEmail`). Each send is logged to `email_log`, so it
appears in the Convener's email counter.
**Source of truth:** `src/lib/emailTemplates.ts` → `submissionAcknowledgementEmail()`.
Pathway/attendance labels are derived from the submission; the two organiser
emails are in the signature.

---

## ① Corresponding-author version (example: OPS-003, Pathway A)

**Subject:** `GLOGIFT 2027 — Abstract received (OPS-003)`

```
Dear Dummy Author 1,

Thank you for your submission to GLOGIFT 2027 — the International Conference on
AI-Driven Solutions in Management: Flexibility, Digitalisation & Decarbonization,
to be held on 25–27 February 2027 at IIM Sambalpur.

We are pleased to confirm that your abstract has been received. A summary of your
submission is below.

  Paper ID      OPS-003
  Title         TEST — AI-Driven Demand Forecasting in Retail Supply Chains
  Track         AI for Operations, Supply Chain & Industry 5.0
  Pathway       Pathway A — Abstract & Presentation Only
  Attendance    On-Site Institution Visit (Offline)
  Authors       Dummy Author 1 (corresponding)

Please note
• Your selected pathway and participation preference, once submitted, cannot be
  changed, owing to administrative constraints.
• You are expected to be available on all three days of the conference
  (25–27 February 2027).
• The detailed conference schedule will be shared at least two weeks in advance
  of the conference.

What happens next
Your abstract will be reviewed by the track's editorial team, and you will be
notified of the outcome by email. No action is required from you at this stage.

If any detail above is incorrect, please reply to this email.

Warm regards,
GLOGIFT 2027 Editorial Office
International Conference on AI-Driven Solutions in Management:
Flexibility, Digitalisation & Decarbonization
Indian Institute of Management Sambalpur
glogift27.chair@iimsambalpur.ac.in · glogift27.coordinator@iimsambalpur.ac.in
glogift2027.in
```

## ② Co-author version

Identical to ①, except the opening two lines:

```
Dear <Co-author name>,

You have been listed as a co-author on the following abstract, submitted to
GLOGIFT 2027 by <Corresponding author name> (corresponding author). This note is
to keep you informed; a summary is below.
```

## Pathway B difference

When the submission is "Full Paper & Presentation":
- `Pathway  Pathway B — Full Paper & Presentation`
- One extra line under *What happens next*: "If your abstract is accepted, you
  will be invited to upload the full paper by the full-paper deadline."

---

**Status:** approved wording. Sends once a valid `RESEND_API_KEY` is configured
(the currently-configured key is invalid).
