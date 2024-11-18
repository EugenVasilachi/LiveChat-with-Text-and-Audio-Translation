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

const FLASK_BACKEND_URL = import.meta.env.VITE_FLASK_BACKEND_URL;

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
      let translatedText = "";

      if (audioUrl && currentUser) {
        const audioBlob = await fetch(audioUrl).then((r) => r.blob());
        const audioFileUrl = await uploadAudio(audioBlob);

        const formData = new FormData();
        formData.append("file", audioFileUrl);
        formData.append("source_lang", currentUser.language);
        formData.append("target_lang", user.language);
        formData.append("receiver_id", user.id);
        formData.append("sender_id", currentUser.id);
        formData.append("chat_id", chatId);

        await axios.post(`${FLASK_BACKEND_URL}/translate_audio`, formData);
      } else {
        messagePayload = {
          text: text,
          source_lang: currentUser.language,
          target_lang: user.language,
        };

        if (!imgUrl) {
          const response = await axios.post(
            `${FLASK_BACKEND_URL}/translate`,
            messagePayload
          );
          translatedText = response.data.translated_text;

          messageForFirestore = {
            senderId: currentUser.id,
            receiverId: user.id,
            text:
              currentUser.id === messagePayload.senderId
                ? translatedText
                : text,
            translatedText:
              currentUser.id === messagePayload.senderId
                ? text
                : translatedText,
            createdAt: new Date(),
          };
        } else {
          messageForFirestore = {
            senderId: currentUser.id,
            receiverId: user.id,
            img: imgUrl,
            createdAt: new Date(),
          };
        }
      }

      if (!audioUrl) {
        await updateDoc(doc(db, "chats", chatId), {
          messages: arrayUnion(messageForFirestore),
        });
      }

      await updateUserChatMetadata(
        currentUser.id,
        user.id,
        chatId,
        text,
        translatedText
      );
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setImg({ file: null, url: "" });
      setText("");
      setAudioUrl(null);
    }
  };

  const updateUserChatMetadata = async (
    currentUserId,
    receiverId,
    chatId,
    text,
    translatedText
  ) => {
    const userIDs = [currentUserId, receiverId];

    await Promise.all(
      userIDs.map(async (id) => {
        const userChatsRef = doc(db, "userchats", id);
        const userChatsSnapshot = await getDoc(userChatsRef);

        if (userChatsSnapshot.exists()) {
          const userChatsData = userChatsSnapshot.data();
          const chatIndex = userChatsData.chats.findIndex(
            (c) => c.chatId === chatId
          );

          if (chatIndex !== -1) {
            const isCurrentUser = id === currentUserId;
            userChatsData.chats[chatIndex].lastMessage = isCurrentUser
              ? text
              : translatedText;
            userChatsData.chats[chatIndex].isSeen = isCurrentUser;
            userChatsData.chats[chatIndex].updatedAt = Date.now();

            await updateDoc(userChatsRef, {
              chats: userChatsData.chats,
            });
          }
        }
      })
    );
  };

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
    <div className="chat">
      <div className="top">
        <div className="user">
          <img src={user?.avatar || "./avatar.png"} alt="" />
          <div className="texts">
            <span>{user?.username}</span>
            <p>online</p>
          </div>
        </div>
        <div className="icons">
          <img src="./phone.png" alt="" />
          <img src="./video.png" alt="" />
          <img src="./info.png" alt="" />
        </div>
      </div>
      <div className="center">
        {chat?.messages?.map((message) => (
          <div
            className={
              message.senderId === currentUser?.id ? "message own" : "message"
            }
            key={message?.createdAt}
          >
            <div className="texts">
              {message.img && <img src={message.img} alt="messageImage" />}
              {message.text && (
                <p>
                  {message.senderId === currentUser.id
                    ? message.text
                    : message.translatedText}
                </p>
              )}
              {message.audio && message.senderId === currentUser.id && (
                <audio controls src={message.audio}>
                  Your browser does not support the audio element.
                </audio>
              )}
              {message.audio && message.senderId === user.id && (
                <audio controls src={message.translated_audio}>
                  Your browser does not support the audio element.
                </audio>
              )}
            </div>
          </div>
        ))}

        {img.url && (
          <div className="message own">
            <div className="texts">
              <img src={img.url} alt="" />
            </div>
          </div>
        )}
        <div ref={endRef}></div>
      </div>
      <div className="bottom">
        <div className="icons">
          <label htmlFor="file">
            <img src="./img.png" alt="" />
          </label>
          <input
            type="file"
            id="file"
            style={{ display: "none" }}
            onChange={handleImage}
          />
          <img src="./camera.png" alt="" />
          <img
            src={recording ? "./red-mic.png" : "./mic.png"}
            alt=""
            onClick={recording ? stopRecording : startRecording}
            className={recording ? "recording" : ""}
          />
        </div>
        <input
          type="text"
          placeholder={
            isCurrentUserBlocked || isReceiverBlocked
              ? "You cannot send a message"
              : "Type a message"
          }
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={isCurrentUserBlocked || isReceiverBlocked}
        />
        <div className="emoji">
          <img src="./emoji.png" alt="" onClick={() => setOpen(!open)} />
          <div className="picker">
            <EmojiPicker open={open} onEmojiClick={handleEmoji} />
          </div>
        </div>
        <button
          className="sendButton"
          onClick={handleSend}
          disabled={isCurrentUserBlocked || isReceiverBlocked}
        >
          Send
        </button>
      </div>
    </div>
  );
}
