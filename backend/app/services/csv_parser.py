import csv
import io
import re
import zipfile
from datetime import datetime
from typing import List


MIN_WORD_COUNT = 20          # ignore very short posts
MAX_POSTS_FOR_ANALYSIS = 30  # use the 30 most recent posts
MAX_CHARS_PER_POST = 2000    # truncate extremely long posts

ANALYTICS_EXPORT_ERROR = (
    "This LinkedIn analytics export contains URLs and metrics, but not the post text. "
    "Upload your full LinkedIn data archive ZIP after you receive the email titled "
    "\"Your full LinkedIn data archive is ready\", or upload the extracted Shares CSV."
)

MISSING_SHARES_ERROR = (
    "This looks like a LinkedIn archive, but it does not include your post history yet. "
    "Please wait for LinkedIn's email titled \"Your full LinkedIn data archive is ready\", "
    "then upload the complete full LinkedIn data archive ZIP."
)


def _clean_share_commentary(text: str) -> str:
    lines = []
    for raw_line in text.replace("\r\n", "\n").replace("\r", "\n").split("\n"):
        line = raw_line.strip()
        if line.startswith('"') and line.endswith('"') and len(line) >= 2:
            line = line[1:-1]
        elif line.startswith('"'):
            line = line[1:]
        elif line.endswith('"'):
            line = line[:-1]
        lines.append(line.strip())

    cleaned = "\n".join(lines).strip()
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    return cleaned


def _parse_post_date(date_str: str):
    date_str = (date_str or "").strip()
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d", "%m/%d/%Y"):
        try:
            return datetime.strptime(date_str, fmt).date()
        except (ValueError, TypeError):
            continue
    return None


def _parse_all_usable_shares_csv(csv_content: bytes) -> List[dict]:
    """
    Parse LinkedIn's Share.csv/Shares_*.csv export.
    Returns a list of dicts with keys: content, post_date.
    Filters out reposts, very short posts, and empty entries.
    """
    content = csv_content.decode('utf-8-sig')  # handle Windows BOM
    reader = csv.DictReader(io.StringIO(content))

    posts = []
    for row in reader:
        text = _clean_share_commentary(row.get('ShareCommentary', '').strip())

        # Skip reposts (no original commentary)
        if not text:
            continue

        # Skip too-short posts (not enough style signal)
        if len(text.split()) < MIN_WORD_COUNT:
            continue

        post_date = _parse_post_date(row.get('Date', ''))

        posts.append({
            'content':   text[:MAX_CHARS_PER_POST],
            'post_date': post_date,
        })

    # Sort by date descending — most recent first
    posts.sort(
        key=lambda p: p['post_date'] or datetime.min.date(),
        reverse=True
    )

    return posts


def _parse_shares_csv(csv_content: bytes) -> List[dict]:
    return _parse_all_usable_shares_csv(csv_content)[:MAX_POSTS_FOR_ANALYSIS]


def _find_shares_csv_in_zip(zip_content: bytes) -> tuple[str, bytes]:
    try:
        with zipfile.ZipFile(io.BytesIO(zip_content)) as archive:
            for name in archive.namelist():
                base_name = name.rsplit("/", 1)[-1].lower()
                if base_name.startswith("shares") and base_name.endswith(".csv"):
                    return name, archive.read(name)
    except zipfile.BadZipFile:
        raise ValueError("Could not read this ZIP file. Please upload the original LinkedIn data archive ZIP.")

    raise ValueError(MISSING_SHARES_ERROR)


def parse_linkedin_posts_file(file_content: bytes, filename: str = "") -> dict:
    name = (filename or "").lower()

    if name.endswith(".xlsx") or name.endswith(".xls"):
        raise ValueError(ANALYTICS_EXPORT_ERROR)

    if name.endswith(".zip"):
        _, shares_csv = _find_shares_csv_in_zip(file_content)
        usable_posts = _parse_all_usable_shares_csv(shares_csv)
        posts = usable_posts[:MAX_POSTS_FOR_ANALYSIS]
        return {
            "posts": posts,
            "import_source": "linkedin_zip",
            "usable_posts_found": len(usable_posts),
            "posts_used": len(posts),
        }

    usable_posts = _parse_all_usable_shares_csv(file_content)
    posts = usable_posts[:MAX_POSTS_FOR_ANALYSIS]
    return {
        "posts": posts,
        "import_source": "linkedin_csv",
        "usable_posts_found": len(usable_posts),
        "posts_used": len(posts),
    }


def validate_posts_file(file_content: bytes, filename: str = "") -> tuple[bool, str]:
    """
    Validate that the uploaded file is a valid LinkedIn posts export.
    Returns (is_valid, error_message).
    """
    try:
        result = parse_linkedin_posts_file(file_content, filename)
        posts = result["posts"]
        if len(posts) < 5:
            return False, (
                f"Only found {len(posts)} usable posts. "
                "ByMe needs at least 5 posts to learn your style. "
                "Make sure you uploaded the full LinkedIn data archive or Shares CSV."
            )
        return True, ""
    except KeyError:
        return False, (
            "This doesn't look like a LinkedIn posts CSV. "
            "Make sure the file includes a ShareCommentary column."
        )
    except Exception as e:
        return False, str(e)


def parse_linkedin_export(csv_content: bytes) -> List[dict]:
    """Backward-compatible wrapper for existing callers."""
    return _parse_shares_csv(csv_content)


def validate_csv(csv_content: bytes) -> tuple[bool, str]:
    """Backward-compatible wrapper for existing callers."""
    return validate_posts_file(csv_content, "Share.csv")
