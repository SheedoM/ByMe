import sys
import types
from unittest import IsolatedAsyncioTestCase, TestCase

from fastapi import HTTPException


supabase_stub = types.ModuleType("supabase")
supabase_stub.Client = object
supabase_stub.create_client = lambda *args, **kwargs: None
sys.modules.setdefault("supabase", supabase_stub)

factory_stub = types.ModuleType("app.llm.factory")
factory_stub.get_free_tier_provider = lambda: None
factory_stub.create_provider = lambda *args, **kwargs: None
factory_stub.VALID_PROVIDERS = {"claude", "openai", "gemini", "openrouter"}
factory_stub.VALID_MODELS = {
    "claude": ["claude-model"],
    "openai": ["openai-model"],
    "gemini": ["gemini-model"],
    "openrouter": ["openrouter-model"],
}
sys.modules.setdefault("app.llm.factory", factory_stub)

style_extractor_stub = types.ModuleType("app.services.style_extractor")
style_extractor_stub.extract_and_store_style = lambda *args, **kwargs: None
sys.modules.setdefault("app.services.style_extractor", style_extractor_stub)

hook_generator_stub = types.ModuleType("app.services.hook_generator")
hook_generator_stub.generate_hooks = lambda *args, **kwargs: []
sys.modules.setdefault("app.services.hook_generator", hook_generator_stub)

from app.routers import generate, style
from app.services import post_generator


class FakeQuery:
    def __init__(self):
        self.updates = []
        self.filters = []
        self.data = [{"id": "post-1"}]

    def update(self, payload):
        self.updates.append(payload)
        return self

    def eq(self, field, value):
        self.filters.append((field, value))
        return self

    def execute(self):
        return types.SimpleNamespace(data=self.data)


class FakeDB:
    def __init__(self):
        self.queries = []

    def table(self, name):
        query = FakeQuery()
        query.table_name = name
        self.queries.append(query)
        return query


class StarterProfileTests(TestCase):
    def test_builds_ready_starter_profile_from_manual_style_inputs(self):
        request = style.StarterProfileRequest(
            language_style_notes="Egyptian Arabic with natural English product terms",
            tone="conversational",
            formality_level=4,
            avg_post_length=130,
            structure_preference="prose",
            paragraph_length="short",
            emoji_usage="minimal",
            storytelling_style="Starts from practical work moments.",
            vocabulary_notes="Uses simple direct words.",
        )

        profile = style._build_starter_profile("user-1", request)

        self.assertEqual(profile["user_id"], "user-1")
        self.assertEqual(profile["status"], "ready")
        self.assertEqual(profile["posts_analyzed"], 0)
        self.assertIn("Manual starter profile", profile["raw_summary"])
        self.assertGreaterEqual(len(profile["opening_patterns"]), 3)
        self.assertGreaterEqual(len(profile["closing_patterns"]), 3)


class FinalDraftTests(IsolatedAsyncioTestCase):
    async def test_save_final_rejects_blank_text(self):
        with self.assertRaises(HTTPException) as raised:
            await generate.save_final_post(
                "post-1",
                generate.FinalPostRequest(final_output="   "),
                user_id="user-1",
            )

        self.assertEqual(raised.exception.status_code, 400)

    async def test_save_final_updates_authenticated_users_post(self):
        fake_db = FakeDB()
        generate.get_supabase = lambda: fake_db

        result = await generate.save_final_post(
            "post-1",
            generate.FinalPostRequest(final_output="Final edited post"),
            user_id="user-1",
        )

        self.assertEqual(result, {"status": "saved"})
        query = fake_db.queries[0]
        self.assertEqual(query.table_name, "generated_posts")
        self.assertEqual(query.filters, [("id", "post-1"), ("user_id", "user-1")])
        self.assertEqual(query.updates[0]["final_output"], "Final edited post")
        self.assertTrue(query.updates[0]["final_in_style"])
        self.assertIn("final_saved_at", query.updates[0])


class HistoryAndExamplesTests(TestCase):
    def test_history_select_fields_include_final_draft_metadata(self):
        fields = generate._history_select_fields()

        self.assertIn("final_output", fields)
        self.assertIn("final_saved_at", fields)
        self.assertIn("final_in_style", fields)
        self.assertIn("feedback", fields)
        self.assertIn("post_type", fields)
        self.assertIn("selected_hook", fields)

    def test_saved_final_drafts_are_preferred_style_examples(self):
        examples = post_generator._select_style_examples(
            raw_posts=[
                {"content": "Raw example A"},
                {"content": "Raw example B"},
            ],
            final_posts=[
                {"final_output": "Final example 1"},
                {"final_output": "Final example 2"},
                {"final_output": "Final example 3"},
                {"final_output": "Final example 4"},
            ],
        )

        self.assertEqual(
            [example["content"] for example in examples],
            [
                "Final example 1",
                "Final example 2",
                "Final example 3",
                "Raw example A",
                "Raw example B",
            ],
        )
