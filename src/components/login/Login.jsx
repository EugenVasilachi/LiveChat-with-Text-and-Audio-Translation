import React, { useState } from "react";
import "./login.css";
import { toast } from "react-toastify";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { auth, db } from "../../lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import upload from "../../lib/upload";

export default function Login() {
  const [avatar, setAvatar] = useState({
    file: null,
    url: "",
  });
  const [loading, setLoading] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);

  const languages = [
    { code: "en_XX", name: "English" },
    { code: "fr_XX", name: "French" },
    { code: "es_XX", name: "Spanish" },
    { code: "de_DE", name: "German" },
    { code: "it_IT", name: "Italian" },
    { code: "pt_XX", name: "Portuguese" },
    { code: "ro_RO", name: "Romanian" },
  ];

  const handleLanguageChange = (e) => {
    setSelectedLanguage(e.target.value);
  };

  const handleAvatar = (e) => {
    if (e.target.files[0]) {
      setAvatar({
        file: e.target.files[0],
        url: URL.createObjectURL(e.target.files[0]),
      });
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.target);
    const { username, email, password } = Object.fromEntries(formData);

    try {
      const res = await createUserWithEmailAndPassword(auth, email, password);
      const imgUrl = await upload(avatar.file);
      await setDoc(doc(db, "users", res.user.uid), {
        username,
        email,
        avatar: imgUrl,
        id: res.user.uid,
        language: selectedLanguage,
        blocked: [],
      });
      await setDoc(doc(db, "userchats", res.user.uid), {
        chats: [],
      });

      toast.success("Account created! You can login now!");
    } catch (error) {
      console.log(error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.target);
    const { email, password } = Object.fromEntries(formData);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success("You are logged in!");
    } catch (error) {
      console.log(error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login">
      <div className="item">
        {isRegistering ? (
          <>
            <h2>Create an Account</h2>
            <form onSubmit={handleRegister}>
              <label htmlFor="file">
                <img src={avatar.url || "./avatar.png"} alt="" />
                Upload an image
              </label>
              <input
                type="file"
                id="file"
                style={{ display: "none" }}
                onChange={handleAvatar}
              />
              <input type="text" placeholder="Username" name="username" />
              <input type="text" placeholder="Email" name="email" />
              <input type="password" placeholder="Password" name="password" />

              <select
                name="language"
                value={selectedLanguage}
                onChange={handleLanguageChange}
                required
              >
                <option value="" disabled>
                  -- Select Your Language --
                </option>
                {languages.map(({ code, name }) => (
                  <option key={code} value={name}>
                    {name}
                  </option>
                ))}
              </select>

              <button disabled={loading}>
                {loading ? "Loading" : "Sign up"}
              </button>
            </form>
            <p>
              Already registered?{" "}
              <button
                type="button"
                onClick={() => setIsRegistering(false)}
                className="link-button"
              >
                Sign in here
              </button>
            </p>
          </>
        ) : (
          <>
            <h2>Welcome back</h2>
            <form onSubmit={handleLogin}>
              <input type="text" placeholder="Email" name="email" />
              <input type="password" placeholder="Password" name="password" />
              <button disabled={loading}>
                {loading ? "Loading" : "Sign in"}
              </button>
            </form>
            <p>
              Not registered?{" "}
              <button
                type="button"
                onClick={() => setIsRegistering(true)}
                className="link-button"
              >
                Sign up here
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
