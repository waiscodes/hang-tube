from youtube_transcript_api import YouTubeTranscriptApi
import json
import os
from openai import OpenAI


VIDEO_ID = os.environ.get('VIDEO_ID', 'j4JBzGddVgQ')
OUTFILE = os.environ.get('OUTFILE', 'transcript.json')

def llm_response():

    client = OpenAI(api_key="sk-35db146d53f0444fb7335c31dc0b4a3b", base_url="https://api.deepseek.com")

    response = client.chat.completions.create(
        model="deepseek-chat",
        messages=[
            {"role": "system", "content": "You are a helpful assistant"},
            {"role": "user", "content": "Hello"},
        ],
        stream=False
    )

    print(response.choices[0].message.content)

def snippet_to_dict(line):
    # Support attribute access and dict-like access
    start = getattr(line, 'start', None)
    duration = getattr(line, 'duration', None)
    text = getattr(line, 'text', None)

    if start is None and isinstance(line, dict):
        start = line.get('start')
        duration = line.get('duration')
        text = line.get('text')

    # Last resort: try subscription
    try:
        if start is None:
            start = float(line['start'])
    except Exception:
        start = 0.0

    try:
        if duration is None:
            duration = float(line['duration']) if 'duration' in line else None
    except Exception:
        duration = None

    if text is None:
        try:
            text = line['text']
        except Exception:
            text = ''

    return {
        'start': float(start) if start is not None else 0.0,
        'duration': float(duration) if (duration is not None) else None,
        'text': text or ''
    }

try:
    api = YouTubeTranscriptApi()
    transcript = api.fetch(VIDEO_ID)

    # Convert all items to plain dicts
    items = [snippet_to_dict(line) for line in transcript]

    # Write to JSON file
    out = {
        'video_id': VIDEO_ID,
        'count': len(items),
        'transcript': items
    }

    with open(OUTFILE, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=2)

    print(f"Wrote {OUTFILE} with {len(items)} transcript lines")
except Exception as e:
    print(f"Error: {str(e)}")
    print("\nTip: If you're getting HTTP errors, you might need to use a VPN or wait a while before trying again.")
from youtube_transcript_api import YouTubeTranscriptApi

try:
    # Create an instance and use the fetch method
    api = YouTubeTranscriptApi()
    transcript = api.fetch('j4JBzGddVgQ')
    
    # Print each line of the transcript
    for line in transcript:
        # The fetched items are FetchedTranscriptSnippet objects with attributes
        # (start, duration, text). Older code assumed dict-like access which
        # raises "object is not subscriptable". Support both forms for safety.
        try:
            start = getattr(line, 'start', None)
            text = getattr(line, 'text', None)
            # fallback if it's a dict-like object
            if start is None and isinstance(line, dict):
                start = line.get('start')
                text = line.get('text')

            if start is None:
                # last resort: try subscription (keeps backward compatibility)
                try:
                    start = line['start']
                except Exception:
                    start = 0.0

            if text is None:
                try:
                    text = line['text']
                except Exception:
                    text = ''

            print(f"[{float(start):.1f}s] {text}")
        except Exception as inner_e:
            print(f"(unprintable line) Error: {inner_e}")
except Exception as e:
    print(f"Error: {str(e)}")
    print("\nTip: If you're getting HTTP errors, you might need to use a VPN or wait a while before trying again.")
