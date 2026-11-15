class ModerationStatus:
    VISIBLE = "VISIBLE"
    HIDDEN = "HIDDEN"
    DELETED = "DELETED"

class ReportStatus:
    PENDING = "PENDING"
    RESOLVED = "RESOLVED"
    DISMISSED = "DISMISSED"
    # Preserved for historical compatibility:
    REVIEWED = "REVIEWED"

    CHOICES = [PENDING, RESOLVED, DISMISSED]
    ACTIVE_STATUSES = [PENDING, REVIEWED]

class TargetType:
    DISCUSSION = "DISCUSSION"
    REPLY = "REPLY"
    REVIEW = "REVIEW"
    REVIEW_REPLY = "REVIEW_REPLY"
    ANNOTATION = "ANNOTATION"

    CHOICES = [
        DISCUSSION,
        REPLY,
        REVIEW,
        REVIEW_REPLY,
        ANNOTATION,
    ]

class ReportReason:
    SPAM = "SPAM"
    HARASSMENT = "HARASSMENT"
    HATE_SPEECH = "HATE_SPEECH"
    INAPPROPRIATE = "INAPPROPRIATE"
    SPOILER = "SPOILER"
    OFF_TOPIC = "OFF_TOPIC"
    OTHER = "OTHER"

    CHOICES = [
        (SPAM, "Spam or Commercial Promotion"),
        (HARASSMENT, "Harassment or Hostility"),
        (HATE_SPEECH, "Hate Speech or Discrimination"),
        (INAPPROPRIATE, "Inappropriate or Offensive Material"),
        (SPOILER, "Unmarked Spoilers"),
        (OFF_TOPIC, "Off-Topic or Disruptive"),
        (OTHER, "Other Concern"),
    ]

class ModerationAction:
    HIDE = "HIDE"
    RESTORE = "RESTORE"
    RESOLVE_REPORT = "RESOLVE_REPORT"
    DISMISS_REPORT = "DISMISS_REPORT"

class TopicType:
    GENERAL = "GENERAL"
    BOOK_INQUIRY = "BOOK_INQUIRY"
    PHILOSOPHICAL_THESIS = "PHILOSOPHICAL_THESIS"
    LITERARY_TRANSLATION = "LITERARY_TRANSLATION"
    SPECULATIVE_POETICS = "SPECULATIVE_POETICS"

    CHOICES = [
        GENERAL,
        BOOK_INQUIRY,
        PHILOSOPHICAL_THESIS,
        LITERARY_TRANSLATION,
        SPECULATIVE_POETICS,
    ]

