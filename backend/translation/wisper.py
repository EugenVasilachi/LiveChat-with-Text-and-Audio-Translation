import os
from dotenv import load_dotenv
from openai import OpenAI
from pathlib import Path

load_dotenv() 
api_key=os.environ.get("API_KEY")
client = OpenAI(api_key=api_key)

def speach_to_text(audio_file_path):
    audio_file= open(audio_file_path, "rb")
    transcription = client.audio.transcriptions.create(
    model="whisper-1", 
    file=audio_file
    )
    print(transcription.text)
    return transcription.text

def text_to_speach(text):
    speech_file_path = Path(__file__).parent / "speech.mp3"
    response = client.audio.speech.create(
    model="tts-1",
    voice="alloy",
    input=text
    )
    response.stream_to_file(speech_file_path)
    return speech_file_path