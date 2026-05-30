"""Debug script for style extraction background task."""
import asyncio
from app.services.style_extractor import extract_style

async def main():
    print("Testing extract_style...")
    dummy_posts = [
        {"content": "This is a great post about leadership and stuff."},
        {"content": "Another post about how to code well."}
    ]
    try:
        result = await extract_style(dummy_posts)
        print("Success!")
        print(result)
    except Exception as e:
        print(f"Failed with exception: {type(e).__name__}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
