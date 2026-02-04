import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../contexts/ToastContext";
import "./VoiceSearch.css";

const VoiceSearch = ({ onSearch }) => {
  const { showToast } = useToast();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState("");
  const [recognition, setRecognition] = useState(null);
  const navigate = useNavigate();
  const inputRef = useRef(null);

  const cleanCommand = (text) => {
    return text
      .toLowerCase()
      .replace(/[.,!?]+$/g, "")
      .replace(/\s+/g, " ")
      .trim();
  };

  const handleVoiceCommand = useCallback(
    (command) => {

      if (command.includes("go to cart") || command.includes("show cart")) {
        navigate("/cart");
      } else if (command.includes("go to products") || command.includes("show products")) {
        navigate("/products");
      } else if (command.includes("go to orders") || command.includes("show orders")) {
        navigate("/orders");
      } else if (command.includes("go home")) {
        navigate("/");
      } else if (command.includes("search for") || command.includes("find")) {
        const searchTerm = command.replace(/search for|find/g, "").trim();
        if (searchTerm) {
          navigate(`/products?search=${encodeURIComponent(searchTerm)}`);
        }
      } else {
        if (onSearch) {
          onSearch(command);
        } else {
          navigate(`/products?search=${encodeURIComponent(command)}`);
        }
      }
    },
    [navigate, onSearch]
  );

  useEffect(() => {
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
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
        if (event.error === 'no-speech') userMessage = "No speech detected.";
        setError(userMessage);
        setTimeout(() => setError(""), 3000);
      };

      recognitionInstance.onend = () => {
        setIsListening(false);
      };

      setRecognition(recognitionInstance);
    }
  }, [handleVoiceCommand]);

  const toggleListening = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (recognition) {
      if (isListening) {
        recognition.stop();
      } else {
        setTranscript("");
        setError("");
        try {
          recognition.start();
        } catch (err) {
          console.error("Failed to start:", err);
        }
      }
    } else {
      showToast("Speech recognition not supported.", "error");
    }
  };

  const handleManualSearch = (e) => {
    if (e.key === 'Enter' && transcript.trim()) {
      handleVoiceCommand(cleanCommand(transcript));
    }
  };

  return (
    <div className="voice-search-container">
      <div className={`search-pill-input ${isListening ? "listening" : ""}`}>
        <input
          ref={inputRef}
          type="text"
          placeholder={isListening ? "Listening..." : "Search products or say a command..."}
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          onKeyDown={handleManualSearch}
          className="search-input-field"
        />
        <button
          className={`mic-icon-btn ${isListening ? "active" : ""}`}
          onClick={toggleListening}
          title="Voice Search"
        >
          {isListening ? '⏹️' : '🎤'}
        </button>
      </div>
      {error && <div className="search-error-tiny">{error}</div>}
    </div>
  );
};

export default VoiceSearch;
