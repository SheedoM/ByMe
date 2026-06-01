import csv
import io
import zipfile
from datetime import date
from unittest import TestCase

from app.services.csv_parser import parse_linkedin_posts_file, validate_posts_file


def make_shares_csv(rows):
    buffer = io.StringIO()
    writer = csv.DictWriter(
        buffer,
        fieldnames=[
            "Date",
            "ShareLink",
            "ShareCommentary",
            "SharedUrl",
            "MediaUrl",
            "Visibility",
        ],
    )
    writer.writeheader()
    writer.writerows(rows)
    return buffer.getvalue().encode("utf-8-sig")


def make_zip(files):
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as archive:
        for name, content in files.items():
            archive.writestr(name, content)
    return buffer.getvalue()


class LinkedInPostsParserTests(TestCase):
    def test_parses_direct_shares_csv_and_cleans_linkedin_quote_artifacts(self):
        csv_bytes = make_shares_csv(
            [
                {
                    "Date": "2026-05-22 16:37:54",
                    "ShareLink": "https://www.linkedin.com/feed/update/abc",
                    "ShareCommentary": (
                        'First line of a real post with enough words for parsing"\n'
                        '"Second line keeps the writer voice and context intact"\n'
                        '""\n'
                        '"Third line should not keep wrapper quotes around it'
                    ),
                    "SharedUrl": "",
                    "MediaUrl": "",
                    "Visibility": "MEMBER_NETWORK",
                }
            ]
        )

        result = parse_linkedin_posts_file(csv_bytes, "Shares_123.csv")

        self.assertEqual(result["import_source"], "linkedin_csv")
        self.assertEqual(len(result["posts"]), 1)
        self.assertEqual(result["posts"][0]["post_date"], date(2026, 5, 22))
        self.assertEqual(
            result["posts"][0]["content"],
            (
                "First line of a real post with enough words for parsing\n"
                "Second line keeps the writer voice and context intact\n\n"
                "Third line should not keep wrapper quotes around it"
            ),
        )

    def test_parses_full_linkedin_zip_by_finding_shares_csv(self):
        shares_csv = make_shares_csv(
            [
                {
                    "Date": "2026-05-21",
                    "ShareLink": "https://www.linkedin.com/feed/update/first",
                    "ShareCommentary": (
                        "This is a long enough LinkedIn post with enough words to pass the style signal filter "
                        "while still being simple and readable inside the test fixture."
                    ),
                    "SharedUrl": "",
                    "MediaUrl": "",
                    "Visibility": "PUBLIC",
                }
            ]
        )
        archive = make_zip(
            {
                "Profile.csv": "First Name,Last Name\nAda,Lovelace\n",
                "Shares_1000637170.csv": shares_csv,
            }
        )

        result = parse_linkedin_posts_file(archive, "Complete_LinkedInDataExport.zip")

        self.assertEqual(result["import_source"], "linkedin_zip")
        self.assertEqual(len(result["posts"]), 1)
        self.assertEqual(result["usable_posts_found"], 1)
        self.assertEqual(result["posts_used"], 1)
        self.assertEqual(
            result["posts"][0]["content"],
            (
                "This is a long enough LinkedIn post with enough words to pass the style signal filter "
                "while still being simple and readable inside the test fixture."
            ),
        )

    def test_reports_usable_count_before_analysis_cap(self):
        rows = []
        for i in range(35):
            rows.append({
                "Date": f"2026-05-{(i % 28) + 1:02d}",
                "ShareLink": f"https://www.linkedin.com/feed/update/{i}",
                "ShareCommentary": (
                    "This is a long enough LinkedIn post with enough words to pass the parser filter "
                    "and prove the cap still reports total usable posts correctly."
                ),
                "SharedUrl": "",
                "MediaUrl": "",
                "Visibility": "PUBLIC",
            })

        result = parse_linkedin_posts_file(make_shares_csv(rows), "Shares_123.csv")

        self.assertEqual(result["usable_posts_found"], 35)
        self.assertEqual(result["posts_used"], 30)
        self.assertEqual(len(result["posts"]), 30)

    def test_rejects_basic_linkedin_zip_without_shares_file_with_full_archive_guidance(self):
        archive = make_zip(
            {
                "Profile.csv": "First Name,Last Name\nAda,Lovelace\n",
                "Connections.csv": "First Name,Last Name\nGrace,Hopper\n",
            }
        )

        is_valid, message = validate_posts_file(archive, "Basic_LinkedInDataExport.zip")

        self.assertFalse(is_valid)
        self.assertIn("full LinkedIn data archive", message)
        self.assertIn("Your full LinkedIn data archive is ready", message)

    def test_rejects_linkedin_analytics_xlsx_with_specific_guidance(self):
        is_valid, message = validate_posts_file(b"not actually needed", "Content_2025-05-31_2026-05-30.xlsx")

        self.assertFalse(is_valid)
        self.assertIn("analytics export", message)
        self.assertIn("URLs and metrics", message)
