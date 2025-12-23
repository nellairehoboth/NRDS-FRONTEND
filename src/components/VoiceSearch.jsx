import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./VoiceSearch.css";

const VoiceSearch = ({ onSearch }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
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
      recognition.start();
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
          className={`voice-btn ${isListening ? "listening" : ""}`}
          title={isListening ? "Stop listening" : "Start voice search"}
        >
          🎤
        </button>
      </div>

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
