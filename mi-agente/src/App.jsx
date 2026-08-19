import { useEffect, useState } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";
import ReactMarkdown from "react-markdown";

const gemini = new GoogleGenerativeAI(
  import.meta.env.VITE_GEMINI_API_KEY
);

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const SYSTEM_INSTRUCTION =
  "Eres Nexus AI, un asistente técnico experto. Responde usando Markdown";

const STORAGE_KEY = "nexus-ai-session";

function createNewChat() {
  return {
    id: crypto.randomUUID(),
    title: "Nuevo chat",
    messages: [],
  };
}

function App() {
  const [chats, setChats] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [createNewChat()];
    } catch {
      return [createNewChat()];
    }
  });

  const [activeChatId, setActiveChatId] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);

    try {
      const parsed = saved ? JSON.parse(saved) : null;
      return parsed?.[0]?.id || null;
    } catch {
      return null;
    }
  });

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);

  const activeChat =
    chats.find((chat) => chat.id === activeChatId) || chats[0];

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
  }, [chats]);

  useEffect(() => {
    if (!activeChatId && chats.length > 0) {
      setActiveChatId(chats[0].id);
    }
  }, [activeChatId, chats]);

  const updateActiveChat = (updatedChat) => {
    setChats((currentChats) =>
      currentChats.map((chat) =>
        chat.id === updatedChat.id ? updatedChat : chat
      )
    );
  };

  const handleNewChat = () => {
    const newChat = createNewChat();

    setChats((currentChats) => [newChat, ...currentChats]);
    setActiveChatId(newChat.id);
    setInput("");
  };

  const handleClearSession = () => {
    const newChat = createNewChat();

    setChats([newChat]);
    setActiveChatId(newChat.id);
    setInput("");
    localStorage.removeItem(STORAGE_KEY);
  };

  const sendMessage = async () => {
    const question = input.trim();

    if (!question || loading) return;

    setLoading(true);
    setInput("");

    const userMessage = {
      role: "user",
      content: question,
    };

    const updatedMessages = [
      ...(activeChat?.messages || []),
      userMessage,
    ];

    const updatedChat = {
      ...activeChat,
      title:
        activeChat.messages.length === 0
          ? question.slice(0, 35)
          : activeChat.title,
      messages: updatedMessages,
    };

    updateActiveChat(updatedChat);

    try {
      const model = gemini.getGenerativeModel({
        model: "gemini-3-flash-preview",
        systemInstruction: SYSTEM_INSTRUCTION,
      });

      const history = activeChat.messages.map((message) => ({
        role: message.role === "assistant" ? "model" : "user",
        parts: [{ text: message.content }],
      }));

      const chat = model.startChat({
        history,
      });

      const result = await chat.sendMessage(question);
      const response = result.response.text();

      const assistantMessage = {
        role: "assistant",
        content: response,
      };

      const finalChat = {
        ...updatedChat,
        messages: [...updatedMessages, assistantMessage],
      };

      updateActiveChat(finalChat);

      const { error } = await supabase
        .from("conversaciones")
        .insert([
          {
            pregunta: question,
            respuesta: response,
          },
        ]);

      if (error) {
        console.error("Error guardando en Supabase:", error);
      }
    } catch (error) {
      console.error("Error consultando Gemini:", error);

      const errorMessage = {
        role: "assistant",
        content:
          "⚠️ No pude procesar la solicitud. Revisa la configuración de Gemini, las variables de entorno y la conexión.",
      };

      updateActiveChat({
        ...updatedChat,
        messages: [...updatedMessages, errorMessage],
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  const startListening = () => {
    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert(
        "Tu navegador no soporta la Web Speech API."
      );
      return;
    }

    const recognition = new SpeechRecognition();

    recognition.lang = "es-CO";
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onstart = () => {
      setListening(true);
    };

    recognition.onresult = (event) => {
      const transcript =
        event.results[0][0].transcript;

      setInput((current) =>
        `${current} ${transcript}`.trim()
      );
    };

    recognition.onerror = (event) => {
      console.error("Error de reconocimiento:", event.error);
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognition.start();
  };

  const copyResponse = async (content) => {
    try {
      await navigator.clipboard.writeText(content);
    } catch (error) {
      console.error("No se pudo copiar:", error);
    }
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1>Nexus AI</h1>

          <button
            className="new-chat-button"
            onClick={handleNewChat}
          >
            + Nuevo Chat
          </button>
        </div>

        <div className="history">
          <h2>Historial</h2>

          {chats.map((chat) => (
            <button
              key={chat.id}
              className={`history-item ${
                chat.id === activeChatId ? "active" : ""
              }`}
              onClick={() => setActiveChatId(chat.id)}
            >
              {chat.title}
            </button>
          ))}
        </div>

        <button
          className="clear-button"
          onClick={handleClearSession}
        >
          Borrar sesión
        </button>
      </aside>

      <main className="chat-area">
        <header className="chat-header">
          <div>
            <h2>{activeChat?.title || "Nexus AI"}</h2>
            <span>Asistente técnico inteligente</span>
          </div>
        </header>

        <section className="messages">
          {activeChat?.messages.length === 0 && (
            <div className="welcome">
              <h2>¿En qué trabajamos hoy?</h2>
              <p>
                Pregúntame sobre programación, electrónica,
                arquitectura o tecnología.
              </p>
            </div>
          )}

          {activeChat?.messages.map((message, index) => (
            <div
              key={index}
              className={`message-row ${message.role}`}
            >
              <div className="message">
                <div className="message-role">
                  {message.role === "user"
                    ? "Tú"
                    : "Nexus AI"}
                </div>

                {message.role === "assistant" ? (
                  <>
                    <div className="markdown-content">
                      <ReactMarkdown>
                        {message.content}
                      </ReactMarkdown>
                    </div>

                    <button
                      className="copy-button"
                      onClick={() =>
                        copyResponse(message.content)
                      }
                    >
                      Copiar
                    </button>
                  </>
                ) : (
                  <p>{message.content}</p>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="message-row assistant">
              <div className="message">
                <div className="message-role">
                  Nexus AI
                </div>
                <p>Procesando...</p>
              </div>
            </div>
          )}
        </section>

        <footer className="input-area">
          <div className="input-container">
            <textarea
              value={input}
              onChange={(event) =>
                setInput(event.target.value)
              }
              onKeyDown={handleKeyDown}
              placeholder="Escribe tu pregunta..."
              rows="1"
              disabled={loading}
            />

            <button
              className={`mic-button ${
                listening ? "listening" : ""
              }`}
              onClick={startListening}
              title="Usar micrófono"
              disabled={loading}
            >
              🎤
            </button>

            <button
              className="send-button"
              onClick={sendMessage}
              disabled={loading || !input.trim()}
            >
              Enviar
            </button>
          </div>

          <small>
            Enter para enviar · Shift + Enter para nueva línea
          </small>
        </footer>
      </main>
    </div>
  );
}

export default App;