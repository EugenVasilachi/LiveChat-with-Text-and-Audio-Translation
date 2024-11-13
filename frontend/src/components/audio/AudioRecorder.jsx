import React, { useState } from "react";
import MicRecorder from "mic-recorder-to-mp3";

const recorder = new MicRecorder({ bitRate: 128 });

function AudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState("");

  const startRecording = () => {
    recorder
      .start()
      .then(() => {
        setIsRecording(true);
      })
      .catch((e) => console.error(e));
  };

  const stopRecording = () => {
    recorder
      .stop()
      .getMp3()
      .then(([buffer, blob]) => {
        const file = new File(buffer, "audio.mp3", {
          type: blob.type,
          lastModified: Date.now(),
        });

        const audioURL = URL.createObjectURL(file);
        setAudioURL(audioURL);
        setIsRecording(false);
      })
      .catch((e) => console.error(e));
  };

  return (
    <div>
      <button onClick={startRecording} disabled={isRecording}>
        Start Recording
      </button>
      <button onClick={stopRecording} disabled={!isRecording}>
        Stop Recording
      </button>
      <audio src={audioURL} controls />
    </div>
  );
}

export default AudioRecorder;
