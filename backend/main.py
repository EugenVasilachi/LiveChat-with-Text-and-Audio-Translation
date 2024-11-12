from flask import Flask, request, jsonify
from pathlib import Path
from translation.whisper import speech_to_text, text_to_speech
from translation.gpt import translate_text
from flask_cors import CORS
from firebase_connect import (
    download_audio_from_url,
    upload_audio_to_firebase,
    save_audio_metadata_to_firestore,
)
import datetime
import uuid

app = Flask(__name__)
CORS(app)


@app.route("/translate", methods=["POST"])
def translate():
    data = request.get_json()
    text = data.get("text")
    source_lang = data.get("source_lang")
    target_lang = data.get("target_lang")

    translated_text = translate_text(text, source_lang, target_lang)
    return jsonify({"translated_text": translated_text})


@app.route("/translate_audio", methods=["POST"])
def translate_audio():
    audio_url = request.form.get("file")
    source_lang = request.form.get("source_lang", "en")
    target_lang = request.form.get("target_lang", "ro")
    receiver_id = request.form.get("receiver_id")
    sender_id = request.form.get("sender_id")
    chat_id = request.form.get("chat_id")

    if not audio_url:
        return jsonify({"error": "No file URL provided"}), 400

    audio_file_path = Path("downloaded_audio.mp3")
    saved_path = download_audio_from_url(audio_url, audio_file_path)

    if not saved_path:
        return jsonify({"error": "Failed to download audio file"}), 500

    text = speech_to_text(saved_path)

    translated_text = translate_text(text, source_lang, target_lang)

    speech_file_path = text_to_speech(translated_text)

    unique_file_name = f"translated_audio_{uuid.uuid4()}.mp3"

    translated_audio_url = upload_audio_to_firebase(speech_file_path, unique_file_name)

    created_at = datetime.datetime.now()
    save_audio_metadata_to_firestore(
        audio_url, translated_audio_url, created_at, receiver_id, sender_id, chat_id
    )

    return jsonify({"audio_url": translated_audio_url}), 200


if __name__ == "__main__":
    app.run(debug=True)
