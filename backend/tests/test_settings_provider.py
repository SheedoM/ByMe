import sys
import types
from unittest import TestCase


supabase_stub = types.ModuleType("supabase")
supabase_stub.Client = object
supabase_stub.create_client = lambda *args, **kwargs: None
sys.modules.setdefault("supabase", supabase_stub)

factory_stub = types.ModuleType("app.llm.factory")
factory_stub.VALID_PROVIDERS = {"claude", "openai", "gemini", "openrouter"}
factory_stub.VALID_MODELS = {
    "claude": ["claude-model"],
    "openai": ["openai-model"],
    "gemini": ["gemini-model"],
    "openrouter": ["openrouter-model"],
}
sys.modules.setdefault("app.llm.factory", factory_stub)

from app.routers import settings


class ProviderSettingsHelperTests(TestCase):
    def test_masks_api_key_with_prefix_and_suffix_only(self):
        hint = settings._mask_api_key("sk-or-abcdef1234")

        self.assertEqual(hint, "sk-or...1234")
        self.assertNotIn("abcdef", hint)

    def test_returns_no_hint_for_empty_key(self):
        self.assertIsNone(settings._mask_api_key(""))

    def test_can_reuse_saved_key_for_same_provider(self):
        can_reuse = settings._can_reuse_saved_key(
            {
                "byok_provider": "openrouter",
                "byok_api_key_encrypted": "encrypted",
            },
            "openrouter",
        )

        self.assertTrue(can_reuse)

    def test_cannot_reuse_saved_key_when_provider_changes(self):
        can_reuse = settings._can_reuse_saved_key(
            {
                "byok_provider": "openrouter",
                "byok_api_key_encrypted": "encrypted",
            },
            "openai",
        )

        self.assertFalse(can_reuse)

    def test_cannot_reuse_missing_saved_key(self):
        can_reuse = settings._can_reuse_saved_key(
            {
                "byok_provider": "openrouter",
                "byok_api_key_encrypted": None,
            },
            "openrouter",
        )

        self.assertFalse(can_reuse)
