import json

def test_transcript_format():
    """Verify the transcript.json format is correct"""
    try:
        with open('transcript.json', 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        print(f"✓ transcript.json loaded successfully")
        print(f"  Video ID: {data['video_id']}")
        print(f"  Count: {data['count']}")
        print(f"  Transcript items: {len(data['transcript'])}")
        
        # Check first few items
        for i, item in enumerate(data['transcript'][:3]):
            print(f"  [{i}] {item['start']}s - {item['text']}")
        
        return True
    except Exception as e:
        print(f"✗ Error loading transcript: {e}")
        return False

def test_server_imports():
    """Test if the server can import all required modules without errors"""
    try:
        from flask import Flask
        import openai
        from openai import OpenAI
        from youtube_transcript_api import YouTubeTranscriptApi
        import json
        import os
        print("✓ All required modules imported successfully")
        return True
    except ImportError as e:
        print(f"✗ Import error: {e}")
        return False

if __name__ == "__main__":
    print("Testing transcript format...")
    transcript_ok = test_transcript_format()
    
    print("\nTesting server imports...")
    imports_ok = test_server_imports()
    
    print(f"\nResults:")
    print(f"Transcript format: {'✓ OK' if transcript_ok else '✗ Error'}")
    print(f"Module imports: {'✓ OK' if imports_ok else '✗ Error'}")
    
    if transcript_ok and imports_ok:
        print("\n✓ All tests passed! The implementation should work correctly.")
        print("To use the absurd question generation, simply start the server and call the /generate_questions endpoint.")
    else:
        print("\n✗ Some tests failed. Please check the errors above.")