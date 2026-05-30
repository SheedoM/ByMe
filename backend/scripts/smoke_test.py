import asyncio
import uuid
import sys
import os

# Ensure the backend folder is on sys.path so `import app` works when running
# this script from the repo root or other working directories.
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.config import get_supabase
from app.services.hook_generator import generate_hooks
from app.services.post_generator import generate_post

async def main():
    db = get_supabase()

    user_id = str(uuid.uuid4())
    print('Using test user_id:', user_id)

    # Create a corresponding auth user (required by FK constraints)
    try:
        print('Creating auth user...')
        db.auth.admin.create_user({
            'id': user_id,
            'email': f'smoke+{user_id}@example.com',
            'password': 'Password123!'
        })
        print('Auth user created')
    except Exception as e:
        print('Could not create auth user via admin API:', e)
        print('Continuing; if the user already exists this is fine.')

    profile = {
        "user_id": user_id,
        "status": "ready",
        "tone": "friendly",
        "formality_level": 5,
        "avg_post_length": 120,
        "opening_patterns": ["I used to think", "Quick story:"],
        "closing_patterns": ["What do you think?", "Would love your thoughts."],
        "emoji_usage": "minimal",
        "structure_preference": "prose",
        "paragraph_length": "short",
        "storytelling_style": "conversational",
        "vocabulary_notes": "simple, direct",
        "raw_summary": "Writes like a friendly product leader.",
    }

    print('Upserting style profile...')
    db.table('style_profiles').upsert(profile, on_conflict='user_id').execute()

    # Verify the profile was written
    try:
        check = db.table('style_profiles').select('*').eq('user_id', user_id).maybe_single().execute()
    except Exception as e:
        print('Error reading back style_profiles:', e)

    topic = 'Lessons from shipping fast'
    key_points = ['ship early', 'get feedback', 'iterate']

    # Debug: perform the same single() query used in generate_hooks
    try:
        single_q = db.table('style_profiles')\
            .select('tone, formality_level, opening_patterns, vocabulary_notes, raw_summary')\
            .eq('user_id', user_id)\
            .single()\
            .execute()
    except Exception as e:
        print('single_q error:', e)

    print('Generating hooks (inline)...')
    # Inline the generate_hooks logic to avoid dependency issues
    try:
        profile = getattr(single_q, 'data', None)
        if not profile:
            raise RuntimeError('no profile available for hook generation')

        settings_result = db.table('user_settings')\
            .select('plan_type, byok_provider, byok_model, byok_api_key_encrypted')\
            .eq('user_id', user_id)\
            .maybe_single()\
            .execute()

        settings = getattr(settings_result, 'data', None) or {}
        plan_type = settings.get('plan_type', 'free')

        from app.llm.factory import get_free_tier_provider, create_provider
        from app.services.encryption import decrypt_key
        from app.prompts.hooks import HOOKS_SYSTEM, HOOKS_USER
        from app.config import ENCRYPTION_KEY

        if plan_type == 'free':
            provider = get_free_tier_provider()
        else:
            encrypted_key = settings.get('byok_api_key_encrypted')
            if not encrypted_key or not ENCRYPTION_KEY:
                provider = get_free_tier_provider()
            else:
                api_key = decrypt_key(encrypted_key, ENCRYPTION_KEY)
                provider = create_provider(settings.get('byok_provider', 'gemini'), api_key, settings.get('byok_model'))

        system = HOOKS_SYSTEM.format(
            tone=profile.get('tone', 'not specified'),
            formality_level=profile.get('formality_level', 5),
            opening_patterns=' | '.join(f'"{p}"' for p in profile.get('opening_patterns', []) ),
            vocabulary_notes=profile.get('vocabulary_notes', 'not specified'),
            raw_summary=profile.get('raw_summary', 'not specified'),
        )

        key_points_str = '\n'.join(f'- {p}' for p in key_points)
        user_prompt = HOOKS_USER.format(topic=topic, key_points=key_points_str)

        response = await provider.generate(system_prompt=system, user_prompt=user_prompt, temperature=0.9)
        clean = response.content.strip()
        if clean.startswith('```'):
            clean = clean.split('```')[1]
            if clean.startswith('json'):
                clean = clean[4:]
        import json
        hooks = json.loads(clean)
        print('Hooks:', hooks)
        selected = hooks[0] if hooks else None
    except Exception as e:
        print('inline hook generation failed:', e)
        return

    print('Generating post with selected hook...')
    try:
        post = await generate_post(
            db=db,
            user_id=user_id,
            topic=topic,
            key_points=key_points,
            post_type='lesson',
            selected_hook=selected,
        )
    except Exception as e:
        print('generate_post failed:', e)
        return

    print('Generated post id:', post.get('id'))
    print('Post output (first 400 chars):')
    print(post.get('output')[:400])

    if post.get('id'):
        print('Saving feedback...')
        db.table('generated_posts').update({'feedback': 'nailed_it'}).eq('id', post['id']).execute()
        print('Feedback saved')
    else:
        print('No ID returned; skipping feedback save')

    # Optionally clean up (commented out)
    # db.table('generated_posts').delete().eq('user_id', user_id).execute()
    # db.table('style_profiles').delete().eq('user_id', user_id).execute()

if __name__ == '__main__':
    asyncio.run(main())
