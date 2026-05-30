import csv
import io
from datetime import datetime
from typing import List


MIN_WORD_COUNT = 20          # ignore very short posts
MAX_POSTS_FOR_ANALYSIS = 30  # use the 30 most recent posts
MAX_CHARS_PER_POST = 2000    # truncate extremely long posts


def parse_linkedin_export(csv_content: bytes) -> List[dict]:
    """
    Parse LinkedIn's Share.csv export.
    Returns a list of dicts with keys: content, post_date.
    Filters out reposts, very short posts, and empty entries.
    """
    content = csv_content.decode('utf-8-sig')  # handle Windows BOM
    reader = csv.DictReader(io.StringIO(content))

    posts = []
    for row in reader:
        text = row.get('ShareCommentary', '').strip()

        # Skip reposts (no original commentary)
        if not text:
            continue

        # Skip too-short posts (not enough style signal)
        if len(text.split()) < MIN_WORD_COUNT:
            continue

        date_str = row.get('Date', '').strip()
        try:
            post_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except (ValueError, AttributeError):
            post_date = None

        posts.append({
            'content':   text[:MAX_CHARS_PER_POST],
            'post_date': post_date,
        })

    # Sort by date descending — most recent first
    posts.sort(
        key=lambda p: p['post_date'] or datetime.min.date(),
        reverse=True
    )

    # Return only the most recent N posts for analysis
    return posts[:MAX_POSTS_FOR_ANALYSIS]


def validate_csv(csv_content: bytes) -> tuple[bool, str]:
    """
    Validate that the uploaded file is a valid LinkedIn posts export.
    Returns (is_valid, error_message).
    """
    try:
        content = csv_content.decode('utf-8-sig')
        reader = csv.DictReader(io.StringIO(content))
        headers = reader.fieldnames or []
        if 'ShareCommentary' not in headers:
            return False, (
                "This doesn't look like a LinkedIn posts CSV. "
                "Make sure you export 'Posts' from LinkedIn Data Download."
            )
        posts = parse_linkedin_export(csv_content)
        if len(posts) < 5:
            return False, (
                f"Only found {len(posts)} usable posts. "
                "ByMe needs at least 5 posts to learn your style."
            )
        return True, ""
    except Exception as e:
        return False, f"Could not read the file: {str(e)}"
