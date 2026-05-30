import os
from cryptography.fernet import Fernet


def encrypt_key(plain_text: str, encryption_key: str) -> str:
    """Encrypt a plain text API key using Fernet symmetric encryption."""
    f = Fernet(encryption_key.encode())
    return f.encrypt(plain_text.encode()).decode()


def decrypt_key(encrypted_text: str, encryption_key: str) -> str:
    """Decrypt a Fernet-encrypted API key back to plain text."""
    f = Fernet(encryption_key.encode())
    return f.decrypt(encrypted_text.encode()).decode()


def generate_fernet_key() -> str:
    """Utility to generate a new Fernet key. Run once during setup."""
    return Fernet.generate_key().decode()
