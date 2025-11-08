from flask import Flask, jsonify, send_file, request, abort
from flask_cors import CORS
import os
from youtube_transcript_api import YouTubeTranscriptApi
import json


APP = Flask(__name__)
# Enable CORS for local testing (adjust origin in production)
CORS(APP, resources={r"/*": {"origins": "*"}})

TRANSCRIPT_PATH = os.path.join(os.path.dirname(__file__), 'transcript.json')


def snippet_to_dict(line):
    # convert FetchedTranscriptSnippet or dict-like object into plain dict
    start = getattr(line, 'start', None)
    duration = getattr(line, 'duration', None)
    text = getattr(line, 'text', None)

    if start is None and isinstance(line, dict):
        start = line.get('start')
        duration = line.get('duration')
        text = line.get('text')

    # last-resort subscription access
    try:
        if start is None:
            start = float(line['start'])
    except Exception:
        start = 0.0

    try:
        if duration is None and isinstance(line, dict) and 'duration' in line:
            duration = float(line['duration'])
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


@APP.route('/')
def index():
    return jsonify({'message': 'Transcript server. GET /transcript to get transcript.json'})


@APP.route('/transcript')
def transcript():
    """Return the transcript JSON file contents."""
    if not os.path.exists(TRANSCRIPT_PATH):
        abort(404, description='transcript.json not found')
    # send_file will set correct content-type
    return send_file(TRANSCRIPT_PATH, mimetype='application/json')


@APP.route('/health')
def health():
    return jsonify({'status': 'ok'})


def run(port: int = 5000):
    # Do not use debug=True for production
    APP.run(host='127.0.0.1', port=port)


if __name__ == '__main__':
    run()


@APP.route('/fetch', methods=['POST'])
def fetch_transcript():
    """POST /fetch
    JSON body: { "video_id": "<youtube id>", "outfile": "optional filename" }
    Returns the transcript JSON.
    """
    data = None
    try:
        data = request.get_json(force=True)
    except Exception:
        return jsonify({'error': 'Invalid JSON body'}), 400

    if not data or 'video_id' not in data:
        return jsonify({'error': 'Missing "video_id" in request body'}), 400

    video_id = data.get('video_id')
    outfile = data.get('outfile') or TRANSCRIPT_PATH

    # Ensure outfile is inside workspace (basic safety)
    if not os.path.isabs(outfile):
        outfile = os.path.join(os.path.dirname(__file__), outfile)

    try:
        api = YouTubeTranscriptApi()
        transcript = api.fetch(video_id)
        items = [snippet_to_dict(line) for line in transcript]

        out = {
            'video_id': video_id,
            'count': len(items),
            'transcript': items
        }

        with open(outfile, 'w', encoding='utf-8') as f:
            json.dump(out, f, ensure_ascii=False, indent=2)

        return jsonify(out)
    except Exception as e:
        # Return the error message and a helpful tip about IP blocking
        msg = str(e)
        return jsonify({'error': msg, 'note': 'If you see IP blocking, consider using a VPN or proxies.'}), 500
