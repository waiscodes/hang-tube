import json
import os
from openai import OpenAI

# Read the transcript from the JSON file
def read_transcript():
    with open('transcript.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    return data['transcript']

# Combine transcript into a single text string
def combine_transcript(transcript_data):
    return " ".join([item['text'] for item in transcript_data])

# Generate absurd questions using OpenAI-compatible API
def generate_absurd_questions(transcript_text):
    api_key = os.environ.get('DEEPSEEK_API_KEY') or os.environ.get('OPENAI_API_KEY')
    if not api_key:
        raise ValueError("Please set either DEEPSEEK_API_KEY or OPENAI_API_KEY environment variable")
    
    # Using OpenAI client - can work with DeepSeek API as they are compatible
    client = OpenAI(
        api_key="sk-35db146d53f0444fb7335c31dc0b4a3b",
        # If using DeepSeek, set the base URL to DeepSeek API endpoint
        base_url=os.environ.get('DEEPSEEK_BASE_URL', 'https://api.openai.com/v1')  # Default to OpenAI, change if needed
    )
    
    prompt = f"""
    Using the following transcript, generate 5 absurd, funny, and completely ridiculous questions that have no relation to the actual content. The transcript is:

    {transcript_text}

    Please provide only 5 questions, one per line, with no additional text or explanations.
    """
    
    try:
        response = client.chat.completions.create(
            model=os.environ.get('MODEL_NAME', 'gpt-3.5-turbo'),  # Use appropriate model name for DeepSeek if different
            messages=[
                {"role": "user", "content": prompt}
            ],
            max_tokens=500,
            temperature=0.9
        )
        
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"Error generating questions: {e}")
        return None

def main():
    try:
        transcript_data = read_transcript()
        combined_text = combine_transcript(transcript_data)
        absurd_questions = generate_absurd_questions(combined_text)
        
        if absurd_questions:
            print("Generated 5 Absurd Questions:")
            print(absurd_questions)
            
            # Save to a file as well
            with open('absurd_questions.txt', 'w', encoding='utf-8') as f:
                f.write(absurd_questions)
            print("\nQuestions saved to absurd_questions.txt")
        else:
            print("Failed to generate questions")
    except FileNotFoundError:
        print("transcript.json not found. Please make sure it exists in the current directory.")
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    main()