import { useEffect, useState } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";
import ReactMarkdown from "react-markdown";
import "./App.css";

// ============================================================
// VARIABLES DE ENTORNO
// ============================================================

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;


const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

// ============================================================
// CONFIGURACIÓN DE GEMINI
// ============================================================

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const SYSTEM_INSTRUCTION = `
Eres un profesor de la E3T y un asistente técnico experto
que ayudará a los alumnos en su camino para aprender sobre
Inteligencia Artificial.

Tu objetivo no es solamente entregar una respuesta.
Debes enseñar al estudiante cómo solucionar los problemas
de manera ordenada y verificable.

Cuando un estudiante presente un problema técnico:

1. Identifica el problema.
2. Explica qué significa.
3. Indica qué debemos comprobar.
4. Proporciona una solución concreta.
5. Da un paso a paso para implementarla.
6. Explica cómo verificar que funcionó.
7. Indica qué error debe evitar en el futuro.

Cuando una solución haya sido aplicada correctamente,
utiliza la expresión:

"Implementado: ..."

No afirmes que algo está solucionado si el estudiante
todavía no lo ha comprobado.

------------------------------------------------------------
PROBLEMAS CON SUPABASE
------------------------------------------------------------

Cuando el estudiante configure Supabase en una aplicación
Vite + React, debe utilizar:

VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY

La variable VITE_SUPABASE_URL debe contener ÚNICAMENTE
la URL BASE del proyecto de Supabase.

Ejemplo correcto:

https://xxxxxxxx.supabase.co

NO debe configurarse así:

https://xxxxxxxx.supabase.co/rest/v1/

Supabase puede mostrar en su interfaz una URL del Data API
que termina en:

/rest/v1/

Sin embargo, ese fragmento NO debe copiarse a
VITE_SUPABASE_URL cuando se utiliza createClient() de
@supabase/supabase-js.

La configuración correcta es:

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

Si aparece un error de Supabase como:

PGRST125
Invalid path specified in request URL

debe comprobarse PRIMERO VITE_SUPABASE_URL.

Si contiene:

/rest/v1/

al final, debe eliminarse y dejar solamente:

https://xxxxxxxx.supabase.co

Después de modificar una variable VITE_* en Vercel,
el estudiante debe realizar un nuevo deployment/redeploy,
porque Vite incorpora las variables durante el proceso
de compilación.

------------------------------------------------------------
GUARDADO DE CONVERSACIONES EN SUPABASE
------------------------------------------------------------

La aplicación utiliza la tabla:

conversaciones

La tabla debe contener como mínimo:

id
created_at
pregunta
respuesta

Después de obtener correctamente la respuesta de Gemini,
la aplicación debe guardar la pregunta y la respuesta
mediante un INSERT:

supabase
  .from("conversaciones")
  .insert([
    {
      pregunta: question,
      respuesta: answer,
    },
  ]);

El estudiante debe comprobar posteriormente en:

Supabase
→ Table Editor
→ conversaciones

que se haya creado una nueva fila.

Si Gemini responde correctamente pero la conversación
NO aparece en Supabase, el estudiante debe diagnosticar
el problema paso a paso y revisar:

1. VITE_SUPABASE_URL.
2. VITE_SUPABASE_ANON_KEY.
3. Que la tabla se llame exactamente conversaciones.
4. Que existan las columnas pregunta y respuesta.
5. El error devuelto por Supabase.
6. La consola del navegador.
7. Las variables de entorno configuradas en Vercel.
8. Que se haya realizado un nuevo deployment después
   de modificar variables VITE_*.

Nunca pedir al estudiante que comparta públicamente
su API Key, anon key o cualquier otra credencial.

------------------------------------------------------------
METODOLOGÍA DE DIAGNÓSTICO
------------------------------------------------------------

No propongas cambios aleatorios.

Primero identifica el punto exacto donde ocurre el error.

Distingue entre:

- problema del código;
- problema de dependencias;
- problema de variables de entorno;
- problema de build;
- problema de deployment;
- problema de Gemini;
- problema de Supabase;
- problema de configuración de la base de datos.

Cuando sea posible, utiliza el mensaje exacto del error
para determinar el siguiente paso.

Responde utilizando Markdown.
`;


// ============================================================
// UTILIDADES
// ============================================================

const STORAGE_KEY = "nexus_ai_chats";

function createNewChat() {
  return {
    id: Date.now().toString(),
    title: "Nuevo chat",
    messages: [],
  };
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

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

    return [createNewChat()];
  });

  const [activeChatId, setActiveChatId] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);

      if (saved) {
        const parsed = JSON.parse(saved);

        if (parsed.length > 0) {
          return parsed[0].id;
        }
      }
    } catch (error) {
      console.error(error);
    }

    return null;
  });

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);

  // ==========================================================
  // PERSISTENCIA LOCAL
  // ==========================================================

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
  }, [chats]);

  // ==========================================================
  // CHAT ACTUAL
  // ==========================================================

  const activeChat =
    chats.find((chat) => chat.id === activeChatId) || chats[0];

  // ==========================================================
  // ACTUALIZAR CHAT
  // ==========================================================

  const updateChat = (updatedChat) => {
    setChats((previousChats) =>
      previousChats.map((chat) =>
        chat.id === updatedChat.id ? updatedChat : chat
      )
    );
  };

  // ==========================================================
  // NUEVO CHAT
  // ==========================================================

  const handleNewChat = () => {
    const newChat = createNewChat();

    setChats((previousChats) => [
      newChat,
      ...previousChats,
    ]);

    setActiveChatId(newChat.id);
    setInput("");
  };

  // ==========================================================
  // BORRAR SESIÓN
  // ==========================================================

  const handleClearSession = () => {
    const confirmed = window.confirm(
      "¿Seguro que deseas borrar todos los chats guardados localmente?"
    );

    if (!confirmed) {
      return;
    }

    const newChat = createNewChat();

    setChats([newChat]);
    setActiveChatId(newChat.id);

    localStorage.removeItem(STORAGE_KEY);
  };

  // ==========================================================
  // SELECCIONAR CHAT
  // ==========================================================

  const handleSelectChat = (chatId) => {
    setActiveChatId(chatId);
    setInput("");
  };

  // ==========================================================
  // COPIAR RESPUESTA
  // ==========================================================

  const handleCopy = async (content) => {
    try {
      await navigator.clipboard.writeText(content);
    } catch (error) {
      console.error("No fue posible copiar:", error);
    }
  };

  // ==========================================================
  // RECONOCIMIENTO DE VOZ
  // ==========================================================

  const handleVoice = () => {
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
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setListening(true);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognition.onerror = (error) => {
      console.error("Error de reconocimiento:", error);
      setListening(false);
    };

    recognition.onresult = (event) => {
      const transcript =
        event.results[0][0].transcript;

      setInput((previous) =>
        previous
          ? `${previous} ${transcript}`
          : transcript
      );
    };

    recognition.start();
  };

  // ==========================================================
  // ENVIAR PREGUNTA
  // ==========================================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    const question = input.trim();

    if (!question || loading || !activeChat) {
      return;
    }

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
          ? question.substring(0, 40)
          : activeChat.title,
      messages: messagesWithQuestion,
    };

    updateChat(updatedChat);

    setInput("");
    setLoading(true);

    try {
      // ======================================================
      // GEMINI
      // ======================================================

      const model = genAI.getGenerativeModel({
        model: "gemini-3-flash-preview",
        systemInstruction: SYSTEM_INSTRUCTION,
      });

      const history = messagesWithQuestion
        .slice(0, -1)
        .map((message) => ({
          role:
            message.role === "user"
              ? "user"
              : "model",
          parts: [
            {
              text: message.content,
            },
          ],
        }));

      const chat = model.startChat({
        history,
      });

      const result = await chat.sendMessage(question);

      const answer =
        result.response.text();

      // ======================================================
      // RESPUESTA DEL AGENTE
      // ======================================================

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

      // ======================================================
      // SUPABASE
      // ======================================================
      //
      // Guarda:
      //
      // pregunta  → question
      // respuesta → answer
      //
      // Tabla:
      //
      // conversaciones
      //
      // Columnas esperadas:
      //
      // id
      // created_at
      // pregunta
      // respuesta
      //
      // ======================================================

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
          "Error guardando conversación en Supabase:",
          error
        );
      } else {
        console.log(
          "Conversación guardada correctamente en Supabase."
        );
      }
    } catch (error) {
      console.error(
        "Error general de la aplicación:",
        error
      );

      const errorMessage = {
        role: "assistant",
        content: `
### ⚠️ Ocurrió un problema

No pude obtener una respuesta de Gemini.

Vamos a diagnosticarlo paso a paso.

#### 1. Variables de entorno

Comprueba que estén configuradas:

\`VITE_GEMINI_API_KEY\`

\`VITE_SUPABASE_URL\`

\`VITE_SUPABASE_ANON_KEY\`

#### 2. Supabase URL

La variable:

\`VITE_SUPABASE_URL\`

debe contener solamente la URL base del proyecto.

Correcto:

\`\`\`
https://xxxxxxxx.supabase.co
\`\`\`

Incorrecto:

\`\`\`
https://xxxxxxxx.supabase.co/rest/v1/
\`\`\`

Supabase muestra frecuentemente el endpoint del Data API
con \`/rest/v1/\`, pero ese fragmento NO debe copiarse
dentro de \`VITE_SUPABASE_URL\` cuando utilizamos
\`createClient()\`.

#### 3. Tabla

Comprueba que exista la tabla:

\`conversaciones\`

con las columnas:

- \`id\`
- \`created_at\`
- \`pregunta\`
- \`respuesta\`

#### 4. Verificación

Si Gemini responde pero el registro no aparece
en Supabase, abre la consola del navegador y busca
el mensaje:

\`Error guardando conversación en Supabase\`

El error exacto nos permitirá continuar el diagnóstico.
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

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="app">
      {/* ====================================================
          SIDEBAR
      ==================================================== */}

      <aside className="sidebar">
        <div className="sidebar-header">
          <div>
            <h1>Nexus AI</h1>
            <span>Asistente E3T</span>
          </div>
        </div>

        <button
          className="new-chat-button"
          onClick={handleNewChat}
        >
          <span>＋</span>
          Nuevo Chat
        </button>

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
                handleSelectChat(chat.id)
              }
            >
              <span>💬</span>
              <span className="history-text">
                {chat.title}
              </span>
            </button>
          ))}
        </div>

        <div className="sidebar-footer">
          <button
            className="clear-button"
            onClick={handleClearSession}
          >
            🗑 Borrar sesión
          </button>
        </div>
      </aside>

      {/* ====================================================
          CHAT
      ==================================================== */}

      <main className="chat-container">
        <header className="chat-header">
          <div>
            <h2>Profesor E3T · IA</h2>
            <p>
              Aprende Inteligencia Artificial paso a paso
            </p>
          </div>

          <div className="status">
            <span className="status-dot"></span>
            Online
          </div>
        </header>

        <section className="messages">
          {activeChat?.messages.length === 0 && (
            <div className="welcome">
              <div className="welcome-icon">
                ✦
              </div>

              <h2>
                ¿Qué quieres aprender hoy?
              </h2>

              <p>
                Soy tu asistente técnico de la E3T.
                Puedo ayudarte a resolver problemas
                de programación, IA, APIs, Vercel,
                Supabase y desarrollo web.
              </p>

              <div className="examples">
                <button
                  onClick={() =>
                    setInput(
                      "Explícame qué es un agente inteligente"
                    )
                  }
                >
                  ¿Qué es un agente inteligente?
                </button>

                <button
                  onClick={() =>
                    setInput(
                      "¿Cómo puedo solucionar un error en Vercel?"
                    )
                  }
                >
                  Problemas con Vercel
                </button>

                <button
                  onClick={() =>
                    setInput(
                      "¿Cómo guardo datos en Supabase desde React?"
                    )
                  }
                >
                  Guardar datos en Supabase
                </button>
              </div>
            </div>
          )}

          {activeChat?.messages.map(
            (message, index) => (
              <div
                className={`message-row ${message.role}`}
                key={`${message.role}-${index}`}
              >
                <div className="message-avatar">
                  {message.role === "user"
                    ? "Tú"
                    : "AI"}
                </div>

                <div className="message-body">
                  <div className="message-name">
                    {message.role === "user"
                      ? "Estudiante"
                      : "Nexus AI"}
                  </div>

                  <div className="message-content">
                    {message.role ===
                    "assistant" ? (
                      <div className="markdown-content">
                        <ReactMarkdown>
                          {message.content}
                        </ReactMarkdown>

                        <button
                          className="copy-button"
                          onClick={() =>
                            handleCopy(
                              message.content
                            )
                          }
                        >
                          📋 Copiar
                        </button>
                      </div>
                    ) : (
                      message.content
                    )}
                  </div>
                </div>
              </div>
            )
          )}

          {loading && (
            <div className="message-row assistant">
              <div className="message-avatar">
                AI
              </div>

              <div className="message-body">
                <div className="message-name">
                  Nexus AI
                </div>

                <div className="typing">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ==================================================
            INPUT
        ================================================== */}

        <form
          className="input-area"
          onSubmit={handleSubmit}
        >
          <div className="input-wrapper">
            <textarea
              value={input}
              onChange={(event) =>
                setInput(event.target.value)
              }
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  !event.shiftKey
                ) {
                  event.preventDefault();
                  handleSubmit(event);
                }
              }}
              placeholder="Escribe tu pregunta..."
              rows="1"
              disabled={loading}
            />

            <button
              type="button"
              className={`voice-button ${
                listening ? "listening" : ""
              }`}
              onClick={handleVoice}
              title="Dictar pregunta"
              disabled={loading}
            >
              🎙
            </button>

            <button
              type="submit"
              className="send-button"
              disabled={
                loading || !input.trim()
              }
            >
              ➤
            </button>
          </div>

          <div className="input-help">
            Enter para enviar · Shift + Enter
            para nueva línea
          </div>
        </form>
      </main>
    </div>
  );
}

export default App;