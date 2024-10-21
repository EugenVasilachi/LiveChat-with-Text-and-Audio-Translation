import requests
import firebase_admin
from firebase_admin import credentials, storage, firestore

cred = credentials.Certificate("firebase-adminsdk.json")
firebase_admin.initialize_app(
    cred, {"storageBucket": "react-livechat-ff02b.appspot.com"}
)

bucket = storage.bucket()

db = firestore.client()


def upload_audio_to_firebase(local_file_path, file_name):
    bucket = storage.bucket()

    blob = bucket.blob(f"received_audios/{file_name}")

    blob.upload_from_filename(local_file_path)

    blob.make_public()

    return blob.public_url


def download_audio_from_url(url, save_path):
    response = requests.get(url)
    if response.status_code == 200:
        with open(save_path, "wb") as file:
            file.write(response.content)
        return save_path
    else:
        return None


def save_audio_metadata_to_firestore(
    audio_url, created_at, receiver_id, sender_id, text, translated_text, chat_id
):
    audio_message = {
        "audio": audio_url,
        "createdAt": created_at,
        "receiverId": receiver_id,
        "senderId": sender_id,
        "text": text,
        "translatedText": translated_text,
    }

    chat_doc_ref = db.collection("chats").document(chat_id)

    chat_doc_ref.update({"messages": firestore.ArrayUnion([audio_message])})
