import { useEffect, useState } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";
import ReactMarkdown from "react-markdown";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

const STORAGE_KEY = "e3t-agente-chats";

const SYSTEM_INSTRUCTION = `
Eres un profesor de la E3T y un asistente técnico experto
que acompaña a los alumnos en su camino para aprender
sobre Inteligencia Artificial.

Tu objetivo principal es enseñar y desarrollar el razonamiento
del alumno, no simplemente entregar respuestas.

REGLAS PEDAGÓGICAS:

1. Explica conceptos técnicos de forma clara, progresiva y concisa.

2. Cuando sea apropiado, proporciona una pista antes de entregar
   una solución completa.

3. Relaciona los conceptos de Inteligencia Artificial con
   programación, electrónica, automatización y sistemas
   tecnológicos cuando resulte útil.

4. Evalúa ocasionalmente la comprensión del alumno mediante
   preguntas cortas.

5. Si el alumno demuestra que comprendió un concepto importante,
   reconócelo explícitamente.

6. Cuando el alumno complete correctamente un reto técnico,
   puedes otorgarle una insignia o reconocimiento.

7. Si el alumno comete un error, explica qué ocurrió y cómo
   puede corregirlo. No lo descalifiques por equivocarse.

8. Utiliza un tono amigable, motivador y de profesor técnico.

9. Puedes utilizar expresiones como:
   "Mira lo que hemos aprendido"
   para conectar los nuevos conocimientos con los anteriores.

10. Responde siempre utilizando Markdown.

COMANDOS ESPECIALES:

"Regaño:"
El alumno está corrigiendo tu comportamiento.
Analiza la corrección y adapta tu comportamiento durante
la conversación.

"Implementado:"
El alumno informa que implementó correctamente una solución
o cambio. Reconoce el avance y continúa desde ese nuevo estado.

Cuando sea necesario, recuerda al alumno qué concepto técnico
se está aprendiendo y por qué es importante.
`;

function createChat() {
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

      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error("Error leyendo localStorage:", error);
    }

    return [createChat()];
  });

  const [activeChatId, setActiveChatId] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);

      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed[0]?.id || null;
      }
    } catch (error) {
      console.error("Error recuperando chat:", error);
    }

    return null;
  });

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);

  const activeChat =
    chats.find((chat) => chat.id === activeChatId) ||
    chats[0];

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(chats)
    );
  }, [chats]);

  useEffect(() => {
    if (!activeChatId && chats.length > 0) {
      setActiveChatId(chats[0].id);
    }
  }, [activeChatId, chats]);

  const updateChat = (updatedChat) => {
    setChats((current) =>
      current.map((chat) =>
        chat.id === updatedChat.id
          ? updatedChat
          : chat
      )
    );
  };

  const handleNewChat = () => {
    const newChat = createChat();

    setChats((current) => [
      newChat,
      ...current,
    ]);

    setActiveChatId(newChat.id);
    setInput("");
  };

  const handleClearSession = () => {
    const newChat = createChat();

    setChats([newChat]);
    setActiveChatId(newChat.id);
    setInput("");

    localStorage.removeItem(STORAGE_KEY);
  };

  const sendMessage = async () => {
    const question = input.trim();

    if (!question || loading || !activeChat) {
      return;
    }

    setLoading(true);
    setInput("");

    const userMessage = {
      role: "user",
      content: question,
    };

    const messagesWithQuestion = [
      ...activeChat.messages,
      userMessage,
    ];

    const updatedChat = {
      ...activeChat,
      title:
        activeChat.messages.length === 0
          ? question.slice(0, 45)
          : activeChat.title,
      messages: messagesWithQuestion,
    };

    updateChat(updatedChat);

    try {
      const model = genAI.getGenerativeModel({
        model: "gemini-3-flash-preview",
        systemInstruction: SYSTEM_INSTRUCTION,
      });

      const history = activeChat.messages.map(
        (message) => ({
          role:
            message.role === "assistant"
              ? "model"
              : "user",
          parts: [
            {
              text: message.content,
            },
          ],
        })
      );

      const chat = model.startChat({
        history,
      });

      const result = await chat.sendMessage(question);
      const answer = result.response.text();

      const assistantMessage = {
        role: "assistant",
        content: answer,
      };

      const finalChat = {
        ...updatedChat,
        messages: [
          ...messagesWithQuestion,
          assistantMessage,
        ],
      };

      updateChat(finalChat);

      const { error } = await supabase
        .from("conversaciones")
        .insert([
          {
            pregunta: question,
            respuesta: answer,
          },
        ]);

      if (error) {
        console.error(
          "Error guardando en Supabase:",
          error
        );
      }
    } catch (error) {
      console.error(
        "Error comunicando con Gemini:",
        error
      );

      const errorMessage = {
        role: "assistant",
        content: `
### ⚠️ Ocurrió un problema

No pude obtener una respuesta de Gemini.

Revisa:

- \`VITE_GEMINI_API_KEY\`
- La conexión a Internet.
- La configuración del modelo.
- Las variables de entorno de Vercel.

**Pista:** si esto funciona en Codespaces pero no en Vercel,
revisa primero las variables de entorno configuradas en Vercel.
`,
      };

      updateChat({
        ...updatedChat,
        messages: [
          ...messagesWithQuestion,
          errorMessage,
        ],
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (event) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();
      sendMessage();
    }
  };

  const startSpeechRecognition = () => {
    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert(
        "Tu navegador no soporta reconocimiento de voz."
      );
      return;
    }

    const recognition =
      new SpeechRecognition();

    recognition.lang = "es-CO";
    recognition.continuous = false;
    recognition.interimResults = false;

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
      console.error(
        "Error de reconocimiento:",
        event.error
      );

      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognition.start();
  };

  const copyResponse = async (content) => {
    try {
      await navigator.clipboard.writeText(
        content
      );
    } catch (error) {
      console.error(
        "Error copiando respuesta:",
        error
      );
    }
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="brand">
            <div className="brand-icon">
              🤖
            </div>

            <div>
              <h1>E3T AI</h1>
              <span>Profesor de IA</span>
            </div>
          </div>

          <button
            className="new-chat-button"
            onClick={handleNewChat}
          >
            <span>＋</span>
            Nuevo Chat
          </button>
        </div>

        <div className="history">
          <div className="history-title">
            Historial
          </div>

          {chats.map((chat) => (
            <button
              key={chat.id}
              className={`history-item ${
                chat.id === activeChatId
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                setActiveChatId(chat.id)
              }
            >
              <span>💬</span>
              <span className="history-text">
                {chat.title}
              </span>
            </button>
          ))}
        </div>

        <button
          className="clear-button"
          onClick={handleClearSession}
        >
          🗑️ Borrar sesión
        </button>
      </aside>

      <main className="chat-area">
        <header className="chat-header">
          <div>
            <h2>
              {activeChat?.title ||
                "Profesor E3T AI"}
            </h2>

            <p>
              Aprende IA paso a paso
            </p>
          </div>
        </header>

        <section className="messages">
          {activeChat?.messages.length === 0 && (
            <div className="welcome">
              <div className="welcome-icon">
                🎓
              </div>

              <h2>
                ¡Bienvenido al Profesor E3T AI!
              </h2>

              <p>
                Soy tu asistente técnico para
                aprender Inteligencia Artificial.
              </p>

              <div className="learning-card">
                <strong>
                  💡 Mira lo que vamos a aprender
                </strong>

                <p>
                  No solamente te daré respuestas:
                  te ayudaré a comprender cómo
                  funcionan los conceptos y a
                  resolver problemas paso a paso.
                </p>
              </div>
            </div>
          )}

          {activeChat?.messages.map(
            (message, index) => (
              <div
                key={index}
                className={`message-row ${message.role}`}
              >
                <div className="message">
                  <div className="message-author">
                    {message.role === "user"
                      ? "👨‍💻 Ingeniero"
                      : "🎓 Profesor E3T"}
                  </div>

                  {message.role ===
                  "assistant" ? (
                    <>
                      <div className="markdown-content">
                        <ReactMarkdown>
                          {message.content}
                        </ReactMarkdown>
                      </div>

                      <button
                        className="copy-button"
                        onClick={() =>
                          copyResponse(
                            message.content
                          )
                        }
                      >
                        📋 Copiar
                      </button>
                    </>
                  ) : (
                    <div className="user-content">
                      {message.content}
                    </div>
                  )}
                </div>
              </div>
            )
          )}

          {loading && (
            <div className="message-row assistant">
              <div className="message">
                <div className="message-author">
                  🎓 Profesor E3T
                </div>

                <div className="thinking">
                  <span></span>
                  <span></span>
                  <span></span>

                  <small>
                    Analizando para ayudarte...
                  </small>
                </div>
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
              placeholder="Pregunta algo sobre Inteligencia Artificial..."
              rows={1}
              disabled={loading}
            />

            <button
              className={`mic-button ${
                listening
                  ? "listening"
                  : ""
              }`}
              onClick={
                startSpeechRecognition
              }
              disabled={loading}
              title="Reconocimiento de voz"
            >
              {listening ? "🔴" : "🎤"}
            </button>

            <button
              className="send-button"
              onClick={sendMessage}
              disabled={
                loading ||
                !input.trim()
              }
            >
              Enviar
            </button>
          </div>

          <div className="input-help">
            Enter para enviar · Shift + Enter
            para nueva línea
          </div>
        </footer>
      </main>
    </div>
  );
}

export default App;