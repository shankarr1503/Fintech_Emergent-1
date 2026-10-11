"""Application-level field encryption: AES-256-GCM.

Used for identity data (PAN, date of birth) on top of whatever disk encryption
the database provides. Each value gets a fresh 96-bit nonce; GCM also
authenticates, so a tampered ciphertext fails to decrypt instead of returning
garbage. Ciphertexts carry a version prefix so keys can be rotated later.
"""
import base64
import hashlib
import hmac
import logging
import os
import secrets

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from ..config import settings

logger = logging.getLogger(__name__)

PREFIX = "v1:"


def _load_key() -> bytes:
    raw = settings.field_encryption_key
    if raw:
        key = base64.b64decode(raw)
        if len(key) != 32:
            raise RuntimeError("FIELD_ENCRYPTION_KEY must be 32 bytes, base64-encoded (AES-256)")
        return key
    if not settings.demo_mode:
        raise RuntimeError("FIELD_ENCRYPTION_KEY is required when DEMO_MODE is off")
    logger.warning("FIELD_ENCRYPTION_KEY not set - using a random key; encrypted fields are unreadable after restart")
    return secrets.token_bytes(32)


_key = _load_key()
_aes = AESGCM(_key)
_index_key = hashlib.sha256(b"blind-index:" + _key).digest()


def encrypt(value: str) -> str:
    nonce = os.urandom(12)
    return PREFIX + base64.b64encode(nonce + _aes.encrypt(nonce, value.encode(), None)).decode()


def decrypt(token: str) -> str:
    if not token.startswith(PREFIX):
        raise ValueError("Unknown ciphertext version")
    blob = base64.b64decode(token[len(PREFIX):])
    return _aes.decrypt(blob[:12], blob[12:], None).decode()


def blind_index(value: str) -> str:
    """Keyed hash for exact-match lookups (e.g. "is this PAN already used?") without storing the value in clear."""
    return hmac.new(_index_key, value.encode(), hashlib.sha256).hexdigest()
