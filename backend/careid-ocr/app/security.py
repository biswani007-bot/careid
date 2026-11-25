import hmac
import logging
import os
import re
from fastapi import Header, HTTPException, status
from app.config import config

logger = logging.getLogger("careid-ocr-security")

def verify_internal_secret(
    x_careid_internal_secret: str = Header(None, alias="X-CareID-Internal-Secret")
) -> str:
    """
    Enforces constant-time validation of the internal shared secret header.
    Prevents timing attacks and unauthorized calls to internal endpoints.
    """
    configured_secret = config.INTERNAL_SECRET

    if not configured_secret:
        logger.critical("CAREID_OCR_SECRET is not configured in server environment.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "success": False,
                "error": "ConfigurationError",
                "message": "Internal OCR authentication secret is not configured on the service."
            }
        )

    if not x_careid_internal_secret:
        logger.warning("Rejected internal request: Missing X-CareID-Internal-Secret header.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "success": False,
                "error": "Unauthorized",
                "message": "Invalid or missing X-CareID-Internal-Secret authentication header."
            }
        )

    # Use constant-time comparison to prevent timing side-channel attacks
    is_valid = hmac.compare_digest(
        x_careid_internal_secret.encode("utf-8"),
        configured_secret.encode("utf-8")
    )

    if not is_valid:
        logger.warning("Rejected internal request: Invalid X-CareID-Internal-Secret secret provided.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "success": False,
                "error": "Unauthorized",
                "message": "Invalid or missing X-CareID-Internal-Secret authentication header."
            }
        )

    return x_careid_internal_secret

def sanitize_filename(filename: str) -> str:
    """
    Sanitizes user/client provided filenames to prevent path traversal
    and unwanted filesystem characters.
    """
    if not filename:
        return "unnamed_document.bin"
    base = os.path.basename(filename)
    sanitized = re.sub(r"[^a-zA-Z0-9_.-]", "_", base)
    return sanitized or "unnamed_document.bin"

def log_phi_safe(action: str, doc_type: str, file_name: str, duration_ms: float = None, pages: int = None, error: str = None):
    """
    Logs structured telemetry without leaking any Protected Health Information (PHI)
    or sensitive document text.
    """
    safe_name = sanitize_filename(file_name)
    parts = [f"action={action}", f"type={doc_type}", f"file={safe_name}"]
    if pages is not None:
        parts.append(f"pages={pages}")
    if duration_ms is not None:
        parts.append(f"duration_ms={duration_ms:.2f}")
    if error:
        parts.append(f"error={error}")
    logger.info(" ".join(parts))

