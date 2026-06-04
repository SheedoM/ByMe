import sys
import types
from unittest import TestCase


supabase_stub = types.ModuleType("supabase")
supabase_stub.Client = object
supabase_stub.create_client = lambda *args, **kwargs: None
sys.modules.setdefault("supabase", supabase_stub)

factory_stub = types.ModuleType("app.llm.factory")
factory_stub.get_free_tier_provider = lambda: None
factory_stub.create_provider = lambda *args, **kwargs: None
sys.modules.setdefault("app.llm.factory", factory_stub)

sys.modules.pop("app.services.hook_generator", None)

from app.services import hook_generator


class HookResponseParserTests(TestCase):
    def test_parses_raw_json_array(self):
        hooks = hook_generator._parse_hooks_response('["One.", "Two.", "Three."]')

        self.assertEqual(hooks, ["One.", "Two.", "Three."])

    def test_parses_fenced_json_array(self):
        hooks = hook_generator._parse_hooks_response(
            '```json\n["One.", "Two.", "Three."]\n```'
        )

        self.assertEqual(hooks, ["One.", "Two.", "Three."])

    def test_parses_json_object_with_hooks_key(self):
        hooks = hook_generator._parse_hooks_response(
            '{"hooks": ["One.", "Two.", "Three."]}'
        )

        self.assertEqual(hooks, ["One.", "Two.", "Three."])

    def test_parses_json_array_embedded_in_text(self):
        hooks = hook_generator._parse_hooks_response(
            'Here are the hooks:\n["One.", "Two.", "Three."]'
        )

        self.assertEqual(hooks, ["One.", "Two.", "Three."])

    def test_rejects_non_string_hooks(self):
        with self.assertRaises(ValueError):
            hook_generator._parse_hooks_response('["One.", 2, "Three."]')
