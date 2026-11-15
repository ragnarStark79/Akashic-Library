from django.urls import path
from .views import (
    DiscussionListCreateView,
    DiscussionDetailView,
    ReplyListCreateView,
    ReplyDetailView,
    ReportCreateView,
    ModerationReportListView,
    ModerationReportDetailView,
    ModerationHideView,
    ModerationRestoreView,
    ModerationAuditListView,
)

urlpatterns = [
    path("discussions/", DiscussionListCreateView.as_view(), name="discussion-list-create"),
    path("discussions/<str:discussion_id>/", DiscussionDetailView.as_view(), name="discussion-detail"),
    path("discussions/<str:discussion_id>/replies/", ReplyListCreateView.as_view(), name="reply-list-create"),
    path("discussions/<str:discussion_id>/replies/<str:reply_id>/", ReplyDetailView.as_view(), name="discussion-reply-detail"),
    path("replies/<str:reply_id>/", ReplyDetailView.as_view(), name="reply-detail"),
    
    path("reports/", ReportCreateView.as_view(), name="report-create"),
    path("moderation/reports/", ModerationReportListView.as_view(), name="moderation-report-list"),
    path("moderation/reports/<str:report_id>/", ModerationReportDetailView.as_view(), name="moderation-report-detail"),
    path("moderation/audits/", ModerationAuditListView.as_view(), name="moderation-audit-list"),
    
    path("moderation/hide/<str:target_type>/<str:target_id>/", ModerationHideView.as_view(), name="moderation-hide"),
    path("moderation/restore/<str:target_type>/<str:target_id>/", ModerationRestoreView.as_view(), name="moderation-restore"),
]
