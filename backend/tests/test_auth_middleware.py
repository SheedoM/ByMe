import sys
import types
from types import SimpleNamespace
from unittest import IsolatedAsyncioTestCase, TestCase

import jwt
from fastapi import HTTPException


supabase_stub = types.ModuleType("supabase")
supabase_stub.Client = object
supabase_stub.create_client = lambda *args, **kwargs: None
sys.modules.setdefault("supabase", supabase_stub)

from app.middleware import auth


class AuthMiddlewareTests(IsolatedAsyncioTestCase):
    async def test_falls_back_to_supabase_auth_when_local_jwt_secret_does_not_match(self):
        token = jwt.encode(
            {"sub": "user-123", "aud": "authenticated"},
            "real-secret-with-at-least-32-bytes",
            algorithm="HS256",
        )

        class FakeSupabaseAuth:
            def get_user(self, received_token):
                self.received_token = received_token
                return SimpleNamespace(user=SimpleNamespace(id="user-123"))

        fake_auth = FakeSupabaseAuth()
        original_secret = auth.SUPABASE_JWT_SECRET
        original_get_supabase = getattr(auth, "get_supabase", None)

        try:
            auth.SUPABASE_JWT_SECRET = "wrong-secret-with-at-least-32-bytes"
            auth.get_supabase = lambda: SimpleNamespace(auth=fake_auth)

            with self.assertLogs("byme.auth", level="WARNING"):
                user_id = await auth.get_current_user(SimpleNamespace(credentials=token))
        finally:
            auth.SUPABASE_JWT_SECRET = original_secret
            if original_get_supabase is not None:
                auth.get_supabase = original_get_supabase

        self.assertEqual(user_id, "user-123")
        self.assertEqual(fake_auth.received_token, token)

    async def test_rejects_token_when_local_and_supabase_validation_fail(self):
        class FakeSupabaseAuth:
            def get_user(self, _token):
                raise RuntimeError("invalid token")

        original_secret = auth.SUPABASE_JWT_SECRET
        original_get_supabase = getattr(auth, "get_supabase", None)

        try:
            auth.SUPABASE_JWT_SECRET = "wrong-secret-with-at-least-32-bytes"
            auth.get_supabase = lambda: SimpleNamespace(auth=FakeSupabaseAuth())

            with self.assertLogs("byme.auth", level="WARNING"):
                with self.assertRaises(HTTPException) as raised:
                    await auth.get_current_user(SimpleNamespace(credentials="not-a-jwt"))
        finally:
            auth.SUPABASE_JWT_SECRET = original_secret
            if original_get_supabase is not None:
                auth.get_supabase = original_get_supabase

        self.assertEqual(raised.exception.status_code, 401)
        self.assertEqual(raised.exception.detail, "Invalid session")


class SupabaseUserExtractionTests(TestCase):
    def test_extracts_user_id_from_object_response(self):
        response = SimpleNamespace(user=SimpleNamespace(id="user-123"))

        self.assertEqual(auth._extract_supabase_user_id(response), "user-123")

    def test_extracts_user_id_from_dict_response(self):
        response = {"user": {"id": "user-123"}}

        self.assertEqual(auth._extract_supabase_user_id(response), "user-123")
