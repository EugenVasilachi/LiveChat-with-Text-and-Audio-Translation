import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";

const uploadAudio = async (file) => {
  const date = new Date();
  const storage = getStorage();

  const metadata = {
    contentType: "audio/mp3", // Change to the appropriate MIME type
  };

  // Change 'audios/' to specify the folder for audio uploads
  const storageRef = ref(storage, `audios/${date.getTime()}_${file.name}`);
  const uploadTask = uploadBytesResumable(storageRef, file, metadata);

  return new Promise((resolve, reject) => {
    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const progress =
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        console.log("Upload is " + progress + "% done");
        switch (snapshot.state) {
          case "paused":
            console.log("Upload is paused");
            break;
          case "running":
            console.log("Upload is running");
            break;
        }
      },
      (error) => {
        switch (error.code) {
          case "storage/unauthorized":
            console.error("User doesn't have permission to access the object");
            reject("User doesn't have permission");
            break;
          case "storage/canceled":
            console.error("User canceled the upload");
            reject("Upload canceled");
            break;
          case "storage/unknown":
            console.error(
              "Unknown error occurred, inspect error.serverResponse"
            );
            reject("Unknown error");
            break;
        }
      },
      () => {
        getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
          resolve(downloadURL);
        });
      }
    );
  });
};

export default uploadAudio;
