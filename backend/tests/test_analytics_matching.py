import sys
import types
from unittest import TestCase


supabase_stub = types.ModuleType("supabase")
supabase_stub.Client = object
supabase_stub.create_client = lambda *args, **kwargs: None
sys.modules.setdefault("supabase", supabase_stub)

style_extractor_stub = types.ModuleType("app.services.style_extractor")
style_extractor_stub.extract_and_store_style = lambda *args, **kwargs: None
sys.modules.setdefault("app.services.style_extractor", style_extractor_stub)

from app.routers import style


class AnalyticsMatchingTests(TestCase):
    def setUp(self):
        self.posts = [
            {
                "id": "post-a",
                "share_link": "https://linkedin.com/feed/update/a/",
                "post_date": "2026-05-01",
            },
            {
                "id": "post-b",
                "share_link": "https://linkedin.com/feed/update/b",
                "post_date": "2026-05-02",
            },
            {
                "id": "post-c",
                "share_link": "https://linkedin.com/feed/update/c",
                "post_date": "2026-05-02",
            },
        ]
        self.url_index, self.date_index = style._build_analytics_indexes(self.posts)

    def test_matches_unique_post_date(self):
        post_id = style._match_analytics_post_id(
            {
                "post_date": "2026-05-01",
                "post_url": None,
            },
            self.url_index,
            self.date_index,
        )

        self.assertEqual(post_id, "post-a")

    def test_skips_ambiguous_duplicate_post_date(self):
        post_id = style._match_analytics_post_id(
            {
                "post_date": "2026-05-02",
                "post_url": None,
            },
            self.url_index,
            self.date_index,
        )

        self.assertIsNone(post_id)

    def test_uses_url_fallback_when_date_is_ambiguous(self):
        post_id = style._match_analytics_post_id(
            {
                "post_date": "2026-05-02",
                "post_url": "https://linkedin.com/feed/update/c/",
            },
            self.url_index,
            self.date_index,
        )

        self.assertEqual(post_id, "post-c")

    def test_uses_raw_zero_engagements_without_falling_back_to_impressions(self):
        score = style._analytics_score({"engagements": 0, "impressions": 99})

        self.assertEqual(score, 0)

    def test_falls_back_to_impressions_only_when_engagements_missing(self):
        score = style._analytics_score({"impressions": 42})

        self.assertEqual(score, 42)
