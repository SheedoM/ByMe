import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from app.config import get_supabase

db = get_supabase()
print('auth attributes:')
print(dir(db.auth))
print('\nadmin attr:', getattr(db.auth, 'admin', None))
print('\napi attr:', getattr(db.auth, 'api', None))
print('\nrepr:', repr(db.auth))
print('\nadmin dir:')
print(dir(db.auth.admin))
