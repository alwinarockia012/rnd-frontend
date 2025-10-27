import React, { useState, useEffect, useRef } from "react";
import { RecaptchaVerifier } from "firebase/auth";
import { auth } from "../firebase";
import Notification from "./Notification/Notification";
import "./Notification/Notification.css";

const RecaptchaTest = () => {
  return (
    <div>
      <h1>Recaptcha Test Component</h1>
      <p>This is a test component for Recaptcha functionality.</p>
    </div>
  );
};

export default RecaptchaTest;
