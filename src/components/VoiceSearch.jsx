import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./VoiceSearch.css";

const VoiceSearch = ({ onSearch }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState("");
  const [recognition, setRecognition] = useState(null);
  const navigate = useNavigate();

  /* =========================
     Clean voice text
  ========================== */
  const cleanCommand = (text) => {
    return text
      .toLowerCase()
      .replace(/[.,!?]+$/g, "") // remove ending punctuation
      .replace(/\s+/g, " ")
      .trim();
  };

  /* =========================
     Handle Voice Commands
  ========================== */
  const handleVoiceCommand = useCallback(
    (command) => {
      console.log("Voice command:", command);

      if (command.includes("go to cart") || command.includes("show cart")) {
        navigate("/cart");
      } else if (
        command.includes("go to products") ||
        command.includes("show products")
      ) {
        navigate("/products");
      } else if (
        command.includes("go to orders") ||
        command.includes("show orders")
      ) {
        navigate("/orders");
      } else if (command.includes("go home")) {
        navigate("/");
      } else if (command.includes("search for") || command.includes("find")) {
        const searchTerm = command.replace(/search for|find/g, "").trim();
        if (searchTerm) {
          navigate(`/products?search=${encodeURIComponent(searchTerm)}`);
        }
      } else {
        // Default search
        if (onSearch) {
          onSearch(command);
        } else {
          navigate(`/products?search=${encodeURIComponent(command)}`);
        }
      }
    },
    [navigate, onSearch]
  );

  /* =========================
     Setup Speech Recognition
  ========================== */
  useEffect(() => {
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;

      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = false;
      recognitionInstance.lang = "en-US";

      recognitionInstance.onstart = () => {
        setIsListening(true);
        setError("");
      };

      recognitionInstance.onresult = (event) => {
        const rawSpeech = event.results[0][0].transcript;
        const cleanedSpeech = cleanCommand(rawSpeech);

        setTranscript(cleanedSpeech);
        handleVoiceCommand(cleanedSpeech);
      };

      recognitionInstance.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);

        let userMessage = "Speech recognition failed.";
        if (event.error === 'no-speech') {
          userMessage = "No speech detected. Please try again.";
        } else if (event.error === 'audio-capture') {
          userMessage = "No microphone found. Ensure it's plugged in.";
        } else if (event.error === 'not-allowed') {
          userMessage = "Microphone access denied.";
        }

        setError(userMessage);
        setTimeout(() => setError(""), 3000);
      };

      recognitionInstance.onend = () => {
        setIsListening(false);
      };

      setRecognition(recognitionInstance);
    }
  }, [handleVoiceCommand]);

  /* =========================
     Controls
  ========================== */
  const startListening = () => {
    if (recognition) {
      setTranscript("");
      setError("");
      try {
        recognition.start();
      } catch (err) {
        console.error("Failed to start recognition:", err);
      }
    } else {
      alert("Speech recognition not supported. Use Chrome or Edge.");
    }
  };

  const stopListening = () => {
    if (recognition) {
      recognition.stop();
    }
  };

  /* =========================
     UI
  ========================== */
  return (
    <div className="voice-search">
      <div className="search-input-container">
        <input
          type="text"
          placeholder="Search products or say a command..."
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && transcript.trim()) {
              handleVoiceCommand(cleanCommand(transcript));
            }
          }}
          className="search-input"
        />

        <button
          onClick={isListening ? stopListening : startListening}
          className={`voice-btn ${isListening ? "listening" : ""} ${error ? "error" : ""}`}
          title={isListening ? "Stop listening" : "Start voice search"}
        >
          {isListening ? '⏹️' : '🎤'}
        </button>
      </div>

      {error && (
        <div className="voice-error-message">
          {error}
        </div>
      )}

      {isListening && (
        <div className="listening-indicator">
          <div className="pulse"></div>
          <span>Listening...</span>
        </div>
      )}
    </div>
  );
};

export default VoiceSearch;
