# Transcript Processing with Absurd Question Generation

This project processes YouTube transcripts and can generate absurd questions based on the transcript content using AI.

## Setup

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Set up your API key:
   ```bash
   export OPENAI_API_KEY="your-api-key-here"
   # or if using DeepSeek:
   export DEEPSEEK_API_KEY="your-deepseek-api-key-here"
   # optionally set the base URL for DeepSeek:
   export DEEPSEEK_BASE_URL="https://api.deepseek.com"
   # optionally set the model name:
   export MODEL_NAME="deepseek-chat"  # or whatever model you're using
   ```
   
   For this specific project, if you're using the provided API key:
   ```bash
   export OPENAI_API_KEY="sk-35db146d53f0444fb7335c31dc0b4a3b"
   ```

3. Make sure you have a `transcript.json` file in the `python-thing` directory.

## Usage

### Running the Server
```bash
cd python-thing
python server.py
```

### Generating Absurd Questions

Once the server is running, you can generate absurd questions using:

```bash
curl http://127.0.0.1:5001/generate_questions
```

Or use the test script:
```bash
python test_questions.py
```

### Other Endpoints

- `GET /` - Health check
- `GET /transcript` - Get the transcript JSON
- `GET /health` - Health check
- `POST /fetch` - Fetch a new transcript from YouTube
- `GET /generate_questions` - Generate absurd questions from the transcript

## Files

- `server.py` - Flask server with all endpoints
- `generate_questions.py` - Standalone script to generate questions
- `test_questions.py` - Test script to verify the endpoint works
- `transcript.json` - Input transcript file
- `absurd_questions.txt` - Output file (from standalone script)