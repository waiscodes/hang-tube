from flask import Flask, jsonify, send_file, request, abort
from flask_cors import CORS
import os
from youtube_transcript_api import YouTubeTranscriptApi
import json
import openai
from openai import OpenAI


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


def run(port: int = 5001):
    # Do not use debug=True for production
    APP.run(host='127.0.0.1', port=port)


@APP.route('/generate_questions', methods=['GET'])
def generate_questions():
    """GET /generate_questions
    Generates 5 absurd questions based on the transcript.json content using an AI model.
    Requires DEEPSEEK_API_KEY or OPENAI_API_KEY environment variable.
    """
    try:
        # Read the transcript
        if not os.path.exists(TRANSCRIPT_PATH):
            return jsonify({'error': 'transcript.json not found'}), 404

        with open(TRANSCRIPT_PATH, 'r', encoding='utf-8') as f:
            transcript_data = json.load(f)
        
        # Combine transcript text
        transcript_text = " ".join([item['text'] for item in transcript_data['transcript']])
        
        # Get API key - using hardcoded key for this specific implementation
        api_key = 'sk-35db146d53f0444fb7335c31dc0b4a3b'
        
        # Set up DeepSeek client
        client = OpenAI(
            api_key=api_key,
            base_url="https://api.deepseek.com"
        )
        
        # Generate absurd questions with multiple choices and correct answers
        prompt = f"""Generate 4 absurd, funny, and completely ridiculous questions related to the following transcript. For each question, provide 3 multiple choice options (A, B, C) and indicate which is the correct answer.

Format your response ONLY as valid JSON with no additional text:
{{
  "questions": [
    {{
      "question": "question text",
      "choices": {{
        "A": "choice A text",
        "B": "choice B text", 
        "C": "choice C text"
      }},
      "correct_answer": "A"
    }},
    {{
      "question": "question text",
      "choices": {{
        "A": "choice A text",
        "B": "choice B text", 
        "C": "choice C text"
      }},
      "correct_answer": "B"
    }},
    {{
      "question": "question text",
      "choices": {{
        "A": "choice A text",
        "B": "choice B text", 
        "C": "choice C text"
      }},
      "correct_answer": "C"
    }},
    {{
      "question": "question text",
      "choices": {{
        "A": "choice A text",
        "B": "choice B text", 
        "C": "choice C text"
      }},
      "correct_answer": "A"
    }}
  ]
}}

The transcript is:
{transcript_text}"""
        
        response = client.chat.completions.create(
            model="deepseek-chat",
            messages=[
                {"role": "system", "content": "You are a helpful assistant. Respond ONLY with properly formatted JSON. Do not include any other text."},
                {"role": "user", "content": prompt}
            ],
            stream=False
        )
        
        # Parse the response
        try:
            # Try to parse as JSON directly
            result = json.loads(response.choices[0].message.content.strip())
            questions_data = result.get('questions', [])
        except:
            # If direct JSON parsing fails, return an error
            return jsonify({'error': 'Failed to parse AI response as JSON'}), 500
        
        # Return the generated questions
        return jsonify({
            'transcript_id': transcript_data['video_id'],
            'questions': questions_data,
            'count': len(questions_data)
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@APP.route('/generate_questions_for_video', methods=['POST'])
def generate_questions_for_video():
    """POST /generate_questions_for_video
    Takes a YouTube video ID from the request body, gets the transcript, 
    generates 4 questions with 3 choices each, and returns them.
    Request body: { "video_id": "youtube_video_id" }
    """
    try:
        # Get the video ID from the request
        data = request.get_json(force=True)
        if not data or 'video_id' not in data:
            return jsonify({'error': 'Missing "video_id" in request body'}), 400

        video_id = data.get('video_id')
        
        # Get the transcript for the video
        try:
            api = YouTubeTranscriptApi()
            transcript = api.fetch(video_id)
            items = [snippet_to_dict(line) for line in transcript]

            transcript_data = {
                'video_id': video_id,
                'count': len(items),
                'transcript': items
            }
        except Exception as e:
            return jsonify({'error': f'Failed to fetch transcript: {str(e)}'}), 500
        
        # Combine transcript text
        transcript_text = " ".join([item['text'] for item in transcript_data['transcript']])
        
        # Get API key
        api_key = 'sk-35db146d53f0444fb7335c31dc0b4a3b'
        
        # Set up DeepSeek client
        client = OpenAI(
            api_key=api_key,
            base_url="https://api.deepseek.com"
        )
        
        # Generate absurd questions with multiple choices and correct answers
        prompt = f"""Generate 4 absurd, funny, and completely ridiculous questions related to the following transcript. For each question, provide 3 multiple choice options (A, B, C) and indicate which is the correct answer.

Format your response ONLY as valid JSON with no additional text:
{{
  "questions": [
    {{
      "question": "question text",
      "choices": {{
        "A": "choice A text",
        "B": "choice B text", 
        "C": "choice C text"
      }},
      "correct_answer": "A"
    }},
    {{
      "question": "question text",
      "choices": {{
        "A": "choice A text",
        "B": "choice B text", 
        "C": "choice C text"
      }},
      "correct_answer": "B"
    }},
    {{
      "question": "question text",
      "choices": {{
        "A": "choice A text",
        "B": "choice B text", 
        "C": "choice C text"
      }},
      "correct_answer": "C"
    }},
    {{
      "question": "question text",
      "choices": {{
        "A": "choice A text",
        "B": "choice B text", 
        "C": "choice C text"
      }},
      "correct_answer": "A"
    }}
  ]
}}

The transcript is:
{transcript_text}"""
        
        response = client.chat.completions.create(
            model="deepseek-chat",
            messages=[
                {"role": "system", "content": "You are a helpful assistant. Respond ONLY with properly formatted JSON. Do not include any other text."},
                {"role": "user", "content": prompt}
            ],
            stream=False
        )
        
        # Parse the response
        try:
            # Try to parse as JSON directly
            result = json.loads(response.choices[0].message.content.strip())
            questions_data = result.get('questions', [])
        except:
            # If direct JSON parsing fails, return an error
            return jsonify({'error': 'Failed to parse AI response as JSON'}), 500
        
        # Return the generated questions
        return jsonify({
            'transcript_id': transcript_data['video_id'],
            'questions': questions_data,
            'count': len(questions_data)
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


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
