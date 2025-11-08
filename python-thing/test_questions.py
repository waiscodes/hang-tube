import requests
import os

def test_generate_questions():
    """Test the /generate_questions endpoint"""
    base_url = "http://127.0.0.1:5000"
    
    # Check if API key is set
    api_key = os.environ.get('DEEPSEEK_API_KEY') or os.environ.get('OPENAI_API_KEY')
    if not api_key:
        print("ERROR: Please set either DEEPSEEK_API_KEY or OPENAI_API_KEY environment variable")
        print("Example: export OPENAI_API_KEY='your-api-key-here'")
        return
    
    try:
        response = requests.get(f"{base_url}/generate_questions")
        if response.status_code == 200:
            data = response.json()
            print("Successfully generated absurd questions:")
            print("-" * 50)
            for i, question in enumerate(data['questions'], 1):
                print(f"{i}. {question}")
        else:
            print(f"Error: {response.status_code} - {response.json()}")
    except requests.exceptions.ConnectionError:
        print("Server is not running. Please start the server first using 'python server.py'")
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    test_generate_questions()