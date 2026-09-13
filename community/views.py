from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, BasePermission
from django.core.exceptions import ValidationError
from accounts.models import UserRole

from .serializers import (
    DiscussionSerializer, DiscussionUpdateSerializer,
    ReplySerializer, ReplyUpdateSerializer,
    ReportSerializer, ModerationActionSerializer, ReportResolutionSerializer
)
from .services import CommunityService, ReplyService, ModerationService


def _parse_pagination(request, default_limit=20):
    """Parse skip/limit from query params.  Returns (skip, limit, error_response).
    
    On invalid input returns (None, None, Response(...400...)).
    Caps limit at 100.
    """
    try:
        skip = int(request.query_params.get("skip", 0))
        limit = int(request.query_params.get("limit", default_limit))
    except (ValueError, TypeError):
        return None, None, Response(
            {"detail": "'skip' and 'limit' must be non-negative integers."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if skip < 0 or limit < 1:
        return None, None, Response(
            {"detail": "'skip' must be >= 0 and 'limit' must be >= 1."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    limit = min(limit, 100)
    return skip, limit, None


class IsModerator(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in [UserRole.MODERATOR, UserRole.ADMIN]

class DiscussionListCreateView(APIView):
    def get(self, request):
        skip, limit, err = _parse_pagination(request, default_limit=20)
        if err:
            return err
        book_id = request.query_params.get("book_id")
        topic_type = request.query_params.get("topic_type")
        
        filters = {}
        if book_id:
            filters["book_id"] = book_id
        if topic_type:
            filters["topic_type"] = topic_type
            
        discussions = CommunityService.list_discussions(filters, skip=skip, limit=limit)
        serializer = DiscussionSerializer(discussions, many=True)
        return Response(serializer.data)

    def post(self, request):
        if not request.user.is_authenticated:
            return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)
            
        serializer = DiscussionSerializer(data=request.data)
        if serializer.is_valid():
            try:
                doc = CommunityService.create_discussion(
                    user_id=str(request.user.id),
                    title=serializer.validated_data["title"],
                    body=serializer.validated_data["body"],
                    book_id=serializer.validated_data.get("book_id"),
                    topic_type=serializer.validated_data.get("topic_type", "GENERAL")
                )
                return Response(DiscussionSerializer(doc).data, status=status.HTTP_201_CREATED)
            except ValidationError as e:
                return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class DiscussionDetailView(APIView):
    def get(self, request, discussion_id):
        is_mod = request.user.is_authenticated and request.user.role in [UserRole.MODERATOR, UserRole.ADMIN]
        doc = CommunityService.get_discussion(discussion_id, for_moderator=is_mod)
        if not doc:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return Response(DiscussionSerializer(doc).data)

    def patch(self, request, discussion_id):
        if not request.user.is_authenticated:
            return Response(status=status.HTTP_401_UNAUTHORIZED)
            
        serializer = DiscussionUpdateSerializer(data=request.data)
        if serializer.is_valid():
            try:
                doc = CommunityService.update_discussion(
                    user_id=str(request.user.id),
                    doc_id=discussion_id,
                    title=serializer.validated_data.get("title"),
                    body=serializer.validated_data.get("body")
                )
                return Response(DiscussionSerializer(doc).data)
            except ValidationError as e:
                err_str = str(e)
                if "Discussion not found" in err_str:
                    return Response(status=status.HTTP_404_NOT_FOUND)
                if "You can only edit your own discussions" in err_str:
                    return Response({"error": err_str}, status=status.HTTP_403_FORBIDDEN)
                return Response({"error": err_str}, status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, discussion_id):
        if not request.user.is_authenticated:
            return Response(status=status.HTTP_401_UNAUTHORIZED)
        try:
            CommunityService.delete_discussion(str(request.user.id), discussion_id)
            return Response(status=status.HTTP_204_NO_CONTENT)
        except ValidationError as e:
            return Response({"error": str(e)}, status=status.HTTP_403_FORBIDDEN)

class ReplyListCreateView(APIView):
    def get(self, request, discussion_id):
        skip, limit, err = _parse_pagination(request, default_limit=50)
        if err:
            return err
        
        is_mod = request.user.is_authenticated and request.user.role in [UserRole.MODERATOR, UserRole.ADMIN]
        replies = ReplyService.list_replies(discussion_id, skip=skip, limit=limit, for_moderator=is_mod)
        return Response(ReplySerializer(replies, many=True).data)

    def post(self, request, discussion_id):
        if not request.user.is_authenticated:
            return Response(status=status.HTTP_401_UNAUTHORIZED)
            
        serializer = ReplyUpdateSerializer(data=request.data)
        if serializer.is_valid():
            try:
                doc = ReplyService.create_reply(
                    user_id=str(request.user.id),
                    discussion_id=discussion_id,
                    body=serializer.validated_data["body"]
                )
                return Response(ReplySerializer(doc).data, status=status.HTTP_201_CREATED)
            except ValidationError as e:
                return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class ReplyDetailView(APIView):
    def patch(self, request, reply_id):
        if not request.user.is_authenticated:
            return Response(status=status.HTTP_401_UNAUTHORIZED)
            
        serializer = ReplyUpdateSerializer(data=request.data)
        if serializer.is_valid():
            try:
                doc = ReplyService.update_reply(
                    user_id=str(request.user.id),
                    doc_id=reply_id,
                    body=serializer.validated_data["body"]
                )
                return Response(ReplySerializer(doc).data)
            except ValidationError as e:
                err_str = str(e)
                if "Reply not found" in err_str:
                    return Response(status=status.HTTP_404_NOT_FOUND)
                if "You can only edit your own replies" in err_str:
                    return Response({"error": err_str}, status=status.HTTP_403_FORBIDDEN)
                return Response({"error": err_str}, status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, reply_id):
        if not request.user.is_authenticated:
            return Response(status=status.HTTP_401_UNAUTHORIZED)
        try:
            ReplyService.delete_reply(str(request.user.id), reply_id)
            return Response(status=status.HTTP_204_NO_CONTENT)
        except ValidationError as e:
            return Response({"error": str(e)}, status=status.HTTP_403_FORBIDDEN)

class ReportCreateView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        serializer = ReportSerializer(data=request.data)
        if serializer.is_valid():
            try:
                doc = ModerationService.report_content(
                    user_id=str(request.user.id),
                    target_type=serializer.validated_data["target_type"],
                    target_id=serializer.validated_data["target_id"],
                    reason=serializer.validated_data["reason"],
                    details=serializer.validated_data.get("details", "")
                )
                return Response(ReportSerializer(doc).data, status=status.HTTP_201_CREATED)
            except ValidationError as e:
                return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class ModerationReportListView(APIView):
    permission_classes = [IsModerator]
    
    def get(self, request):
        skip, limit, err = _parse_pagination(request, default_limit=50)
        if err:
            return err
        
        status_filter = request.query_params.get("status")
        filters = {}
        if status_filter:
            filters["status"] = status_filter
            
        reports = ModerationService.list_reports(filters, skip=skip, limit=limit)
        return Response(ReportSerializer(reports, many=True).data)

class ModerationReportDetailView(APIView):
    permission_classes = [IsModerator]
    
    def patch(self, request, report_id):
        serializer = ReportResolutionSerializer(data=request.data)
        if serializer.is_valid():
            try:
                doc = ModerationService.resolve_report(
                    moderator_id=str(request.user.id),
                    report_id=report_id,
                    action=serializer.validated_data["action"],
                    note=serializer.validated_data.get("note", "")
                )
                return Response(ReportSerializer(doc).data)
            except ValidationError as e:
                return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class ModerationHideView(APIView):
    permission_classes = [IsModerator]
    
    def post(self, request, target_type, target_id):
        serializer = ModerationActionSerializer(data=request.data)
        if serializer.is_valid():
            try:
                ModerationService.hide_content(
                    str(request.user.id), target_type, target_id, serializer.validated_data.get("note", "")
                )
                return Response(status=status.HTTP_204_NO_CONTENT)
            except ValidationError as e:
                return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class ModerationRestoreView(APIView):
    permission_classes = [IsModerator]
    
    def post(self, request, target_type, target_id):
        serializer = ModerationActionSerializer(data=request.data)
        if serializer.is_valid():
            try:
                ModerationService.restore_content(
                    str(request.user.id), target_type, target_id, serializer.validated_data.get("note", "")
                )
                return Response(status=status.HTTP_204_NO_CONTENT)
            except ValidationError as e:
                return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
