import "./chat.css";
import EmojiPicker from "emoji-picker-react";
import { useState, useEffect, useRef } from "react";
import {
  arrayUnion,
  doc,
  getDoc,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useChatStore } from "../../lib/chatStore";
import { useUserStore } from "../../lib/userStore";
import upload from "../../lib/upload";
import uploadAudio from "../../lib/uploadAudio";
import axios from "axios";

export default function Chat() {
  const [open, setOpen] = useState(false);
  const [chat, setChat] = useState();
  const [text, setText] = useState("");
  const [img, setImg] = useState({ file: null, url: "" });
  const [audioUrl, setAudioUrl] = useState(null);
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const { chatId, user, isCurrentUserBlocked, isReceiverBlocked } =
    useChatStore();
  const { currentUser } = useUserStore();
  //const [audioFileUrl, setAudioFileUrl] = useState(null);
  let audioFileUrl = null;

  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat?.messages]);

  useEffect(() => {
    const unSub = onSnapshot(doc(db, "chats", chatId), (res) => {
      setChat(res.data());
    });
    return () => unSub();
  }, [chatId]);

  const handleEmoji = (e) => {
    setText((prevText) => prevText + e.emoji);
    setOpen(false);
  };

  const handleImage = (e) => {
    if (e.target.files[0]) {
      setImg({
        file: e.target.files[0],
        url: URL.createObjectURL(e.target.files[0]),
      });
    }
  };
  const handleSend = async () => {
    if (text === "" && !img.file && !audioUrl) return;

    let imgUrl = null;

    try {
      if (img.file) {
        imgUrl = await upload(img.file);
      }

      let messagePayload = {};
      let messageForFirestore = {};

      if (audioUrl && currentUser) {
        const audioBlob = await fetch(audioUrl).then((r) => r.blob());
        audioFileUrl = await uploadAudio(audioBlob);

        const formData = new FormData();

        formData.append("file", audioFileUrl);
        formData.append("source_lang", currentUser.language);
        formData.append("target_lang", user.language);
        formData.append("receiver_id", user.id);
        formData.append("sender_id", currentUser.id);
        formData.append("chat_id", chatId);

        // Send the message to the backend for translation
        const response = await axios.post(
          "http://127.0.0.1:5000/translate_audio",
          formData
        );
      } else {
        messagePayload = {
          text: text,
          source_lang: currentUser.language,
          target_lang: user.language,
        };

        // Send the message to the backend for translation
        const response = await axios.post(
          "http://127.0.0.1:5000/translate",
          messagePayload
        );

        const translatedText = response.data.translated_text; // Extract the translated text

        // Construct message object for Firestore
        messageForFirestore = {
          senderId: currentUser.id,
          receiverId: user.id,
          text:
            currentUser.id === messagePayload.senderId ? translatedText : text,
          translatedText:
            currentUser.id === messagePayload.senderId ? text : translatedText,
          // img: imgUrl || null,
          // audio: audioFileUrl || null,
          createdAt: new Date(),
        };
      }

      // Update Firestore with the new message
      if (!audioUrl) {
        await updateDoc(doc(db, "chats", chatId), {
          messages: arrayUnion(messageForFirestore),
        });
      }

      const userIDs = [currentUser.id, user.id];

      userIDs.forEach(async (id) => {
        const userChatsRef = doc(db, "userchats", id);
        const userChatsSnapshot = await getDoc(userChatsRef);

        if (userChatsSnapshot.exists()) {
          const userChatsData = userChatsSnapshot.data();
          const chatIndex = userChatsData.chats.findIndex(
            (c) => c.chatId === chatId
          );
          if (chatIndex !== -1) {
            userChatsData.chats[chatIndex].lastMessage =
              currentUser.id === messagePayload.senderId
                ? text
                : translatedText; // Last message for chat overview
            userChatsData.chats[chatIndex].isSeen = id === currentUser.id;
            userChatsData.chats[chatIndex].updatedAt = Date.now();

            await updateDoc(userChatsRef, {
              chats: userChatsData.chats,
            });
          }
        }
      });
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      // Reset image and text after sending the message
      setImg({ file: null, url: "" });
      setText("");
      setAudioUrl(null);
    }
  };

  // Audio Recording Functions
  const startRecording = async () => {
    audioChunksRef.current = [];
    setRecording(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/mpeg",
        });
        const audioURL = URL.createObjectURL(audioBlob);
        setAudioUrl(audioURL);
        setRecording(false);
      };

      mediaRecorderRef.current.start();
    } catch (error) {
      console.error("Error accessing the microphone:", error);
      setRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
  };

  return (
    <div className='chat'>
      <div className='top'>
        <div className='user'>
          <img src={user?.avatar || "./avatar.png"} alt='' />
          <div className='texts'>
            <span>{user?.username}</span>
            <p>online</p>
          </div>
        </div>
        <div className='icons'>
          <img src='./phone.png' alt='' />
          <img src='./video.png' alt='' />
          <img src='./info.png' alt='' />
        </div>
      </div>
      <div className='center'>
        {chat?.messages?.map((message) => (
          <div
            className={
              message.senderId === currentUser?.id ? "message own" : "message"
            }
            key={message?.createdAt}>
            <div className='texts'>
              {message.img && <img src={message.img} alt='messageImage' />}
              <p>
                {message.senderId === currentUser.id
                  ? message.text
                  : message.translatedText}
              </p>
              {message.audio && message.senderId === currentUser.id && (
                <audio controls src={audioFileUrl}>
                  Your browser does not support the audio element.
                </audio>
              )}
              {message.audio && message.senderId === user.id && (
                <audio controls src={message.audio}>
                  Your browser does not support the audio element.
                </audio>
              )}
              {/* {message.audio && (
                <audio controls src={message.audio}>
                  Your browser does not support the audio element.
                </audio>
              )} */}
            </div>
          </div>
        ))}

        {img.url && (
          <div className='message own'>
            <div className='texts'>
              <img src={img.url} alt='' />
            </div>
          </div>
        )}
        <div ref={endRef}></div>
      </div>
      <div className='bottom'>
        <div className='icons'>
          <label htmlFor='file'>
            <img src='./img.png' alt='' />
          </label>
          <input
            type='file'
            id='file'
            style={{ display: "none" }}
            onChange={handleImage}
          />
          <img src='./camera.png' alt='' />
          <img
            src={recording ? "./red-mic.png" : "./mic.png"}
            alt=''
            onClick={recording ? stopRecording : startRecording}
            className={recording ? "recording" : ""}
          />
        </div>
        <input
          type='text'
          placeholder={
            isCurrentUserBlocked || isReceiverBlocked
              ? "You cannot send a message"
              : "Type a message"
          }
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={isCurrentUserBlocked || isReceiverBlocked}
        />
        <div className='emoji'>
          <img src='./emoji.png' alt='' onClick={() => setOpen(!open)} />
          <div className='picker'>
            <EmojiPicker open={open} onEmojiClick={handleEmoji} />
          </div>
        </div>
        <button
          className='sendButton'
          onClick={handleSend}
          disabled={isCurrentUserBlocked || isReceiverBlocked}>
          Send
        </button>
      </div>
    </div>
  );
}
