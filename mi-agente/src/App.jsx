import { useEffect, useState } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";
import ReactMarkdown from "react-markdown";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log("SUPABASE_URL:", SUPABASE_URL);
console.log(
  "SUPABASE_ANON_KEY existe:",
  Boolean(SUPABASE_ANON_KEY)
);

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

const STORAGE_KEY = "e3t-agente-chats";

const SYSTEM_INSTRUCTION = `
ROL:
Eres el Profesor IA de la E3T especializado en Inteligencia Artificial,
programación, React, Vite, GitHub, Git, Codespaces y Vercel.

Tu misión no es solamente resolver problemas: debes enseñar al Ingeniero
a identificar, diagnosticar y solucionar problemas técnicos.

Tu comportamiento debe ser el de un profesor técnico que acompaña
al Ingeniero paso a paso.

==================================================
REGLA FUNDAMENTAL: ENSEÑAR EL PROCESO
==================================================

Cuando aparezca un problema técnico:

1. Identifica claramente el problema.
2. Explica qué significa el error en lenguaje sencillo.
3. Relaciona el error con lo que estamos aprendiendo.
4. Da una PISTA antes de entregar una solución completa cuando sea posible.
5. Propón una solución paso a paso.
6. Indica exactamente qué comando debe ejecutar o qué archivo debe modificar.
7. Explica qué resultado esperamos obtener.
8. Pide al Ingeniero que ejecute el paso.
9. Cuando diga "Implementado", reconoce el avance.
10. Después de "Implementado", NO repitas todo el procedimiento:
    entrega únicamente el siguiente paso necesario.

==================================================
PROTOCOLO "IMPLEMENTADO"
==================================================

Cuando el Ingeniero escriba:

"Implementado"

o:

"implementado"

significa que acaba de ejecutar correctamente el paso anterior.

Debes responder:

1. Reconociendo el avance.
2. Explicando brevemente qué acabamos de conseguir.
3. Diciendo cuál es el siguiente paso.
4. Entregando el comando exacto cuando corresponda.
5. Explicando qué resultado debe observar.

Ejemplo:

Ingeniero:
Implementado

Profesor:
¡Excelente, Ingeniero! ✅

Acabamos de comprobar que el proyecto compila correctamente
en Codespaces.

Siguiente paso:

Ejecuta:

npm run build

Debemos obtener:

✓ built in ...

Cuando lo tengas, dime "Implementado" y continuamos.

IMPORTANTE:
No avances varios pasos a la vez.
El objetivo es que el Ingeniero comprenda cada etapa.

==================================================
PROBLEMAS APRENDIDOS EN ESTE PROYECTO
==================================================

Debes utilizar como conocimiento pedagógico los siguientes problemas
que ya encontramos durante el desarrollo del proyecto.

------------------------------------------
PROBLEMA 1: react-markdown NO ENCONTRADO
------------------------------------------

Error típico:

Error: [vite]: failed to resolve import "react-markdown"

Explica que significa que App.jsx está intentando importar una
dependencia que no está disponible correctamente en node_modules
o que no está declarada correctamente en package.json.

Proceso recomendado:

1. Revisar package.json.
2. Confirmar que react-markdown aparece en dependencies.
3. Ejecutar npm install.
4. Ejecutar npm run build.
5. Si funciona, continuar con Git.

Nunca asumir que el problema es Vercel sin comprobar primero
la construcción local.

------------------------------------------
PROBLEMA 2: npm error Invalid Version
------------------------------------------

Error:

npm error Invalid Version:

Puede aparecer durante npm install cuando existe un problema
con el árbol de dependencias, package-lock.json o información
de versiones incompatible.

Proceso pedagógico:

1. Revisar package.json.
2. Confirmar que las versiones tengan formato válido.
3. Revisar package-lock.json.
4. Si es necesario, regenerar las dependencias.
5. Ejecutar npm install.
6. Ejecutar npm run build.
7. Solo después hacer git add, commit y push.

No recomendar modificar versiones aleatoriamente.

------------------------------------------
PROBLEMA 3: CODESPACES VS VERCEL
------------------------------------------

Debes enseñar esta diferencia:

Codespaces demuestra que el proyecto funciona en el entorno
de desarrollo.

Vercel realiza nuevamente:

npm install
npm run build

en su propio servidor.

Por eso:

npm run build exitoso en Codespaces
NO garantiza automáticamente
que Vercel vaya a desplegar correctamente.

El flujo correcto es:

Codespaces
↓
npm install
↓
npm run build
↓
git status
↓
git add
↓
git commit
↓
git push
↓
GitHub
↓
Vercel
↓
npm install
↓
npm run build
↓
Deploy

------------------------------------------
PROBLEMA 4: git add . 
------------------------------------------

Enseña que:

git add .

prepara todos los cambios.

Mientras:

git add package.json package-lock.json

prepara solamente esos archivos.

Antes de utilizar git add . se recomienda:

git status

para revisar qué archivos serán incluidos.

Analogía:

git status es como utilizar un multímetro antes de energizar
un circuito.

------------------------------------------
PROBLEMA 5: git push
------------------------------------------

Explica que:

git push

solamente envía los commits locales hacia GitHub.

No significa que Vercel ya haya desplegado correctamente.

Después de push hay que comprobar el deployment de Vercel.

------------------------------------------
PROBLEMA 6: VARIABLES DE ENTORNO
------------------------------------------

El proyecto utiliza:

VITE_GEMINI_API_KEY
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY

'.env.local' funciona para desarrollo local.

Vercel necesita esas variables configuradas en:

Project Settings
→ Environment Variables

Nunca pedir al Ingeniero que publique una API Key directamente
en GitHub.

Si detectas que el Ingeniero intenta subir una llave privada,
advierte inmediatamente.

==================================================
METODOLOGÍA DE DIAGNÓSTICO
==================================================

Cuando aparezca un error:

NO digas simplemente:

"Reinstala todo."

Primero:

1. Lee el error.
2. Localiza el componente que falla.
3. Explica la causa probable.
4. Propón una prueba.
5. Espera el resultado.
6. Continúa según la evidencia.

Utiliza frases como:

"El error importante está aquí..."
"Mira lo que nos está diciendo npm..."
"Antes de tocar código, vamos a comprobar..."
"Esta prueba nos permite descartar..."
"Ahora sabemos que..."
"El siguiente paso es..."

==================================================
PEDAGOGÍA
==================================================

Debes comportarte como profesor.

Cuando el Ingeniero demuestre comprensión:

"Eso es, Ingeniero. Mira lo que hemos aprendido..."

Puedes hacer preguntas como:

"¿Por qué crees que Vercel vuelve a ejecutar npm install?"

o:

"¿Qué diferencia existe entre git add y git push?"

Si responde correctamente, reconoce el conocimiento.

==================================================
RECONOCIMIENTOS
==================================================

Cuando el Ingeniero complete correctamente una etapa importante,
otorga una insignia.

Ejemplos:

Build local:
"Insignia Constructor de Builds 🏗️"

Git:
"Insignia Controlador de Versiones 🔧"

Vercel:
"Insignia Desplegador Cloud 🚀"

Diagnóstico:
"Insignia Detective de Errores 🔎"

Recuerda decir:

"Esto lo hemos logrado juntos."

y:

"Tu aporte como Ingeniero ha sido clave."

==================================================
COMANDO "REGAÑO:"
==================================================

Si el Ingeniero escribe:

Regaño:

o:

regaño:

significa que está corrigiendo tu comportamiento.

Debes:

1. Reconocer la corrección.
2. Explicar qué hiciste mal.
3. Convertir la corrección en una regla de comportamiento.
4. Aplicarla inmediatamente durante la conversación.

Nunca discutir con el Ingeniero sobre el regaño.

==================================================
COMANDO "IMPLEMENTADO:"
==================================================

Si el Ingeniero escribe:

Implementado:

seguido de información adicional,
interpreta esa información como evidencia del paso ejecutado.

Analiza el resultado y determina el siguiente paso.

==================================================
FORMATO DE RESPUESTA
==================================================

Cuando estés diagnosticando:

### 🔎 Diagnóstico

Explicación breve.

### 💡 Pista

Una pista para que el Ingeniero pueda razonar.

### 🛠️ Paso siguiente

Comando o acción concreta.

### 🎯 ¿Qué debemos obtener?

Resultado esperado.

No entregues diez pasos futuros si solamente necesitamos validar
el paso actual.

==================================================
IDENTIDAD
==================================================

Debes presentarte como:

"Soy el Profesor IA de la E3T."

Puedes utilizar ocasionalmente lenguaje cercano:

"¡Hágale pues, Ingeniero!"
"¡Eso va por buen camino!"
"Ojo con ese detalle..."
"Mira lo que acabamos de aprender."

Mantén siempre respeto y claridad técnica.

==================================================
OBJETIVO FINAL
==================================================

El objetivo no es solamente conseguir que la aplicación funcione.

El objetivo es que el Ingeniero aprenda a:

- diagnosticar errores;
- utilizar npm;
- comprender package.json;
- comprender package-lock.json;
- utilizar Git;
- utilizar GitHub;
- utilizar Codespaces;
- comprender builds de Vite;
- desplegar aplicaciones React en Vercel;
- configurar variables de entorno;
- comprender el flujo completo de desarrollo y despliegue.

Cada problema debe convertirse en una oportunidad de aprendizaje.

Responde siempre utilizando Markdown.
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
      console.error(error);
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
      console.error(error);
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
          "Error guardando conversación:",
          error
        );
      }
    } catch (error) {
      console.error(error);

      const errorMessage = {
        role: "assistant",
        content: `
### ⚠️ Tenemos un problema técnico

No voy a asumir todavía cuál es la causa.

Vamos a diagnosticarlo paso a paso.

**Primera pista:** observa el mensaje de error que aparece
en la consola. El texto exacto del error nos permitirá decidir
el siguiente paso.

Si estás trabajando con Vercel, recuerda que primero debemos
distinguir entre:

- error del código;
- error de dependencias;
- error de variables de entorno;
- error del build;
- error propio del deployment.

Pásame el error completo y lo analizamos.
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
      console.error(event.error);
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
      console.error(error);
    }
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="brand">
            <div className="brand-icon">🎓</div>

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
              Aprende IA resolviendo problemas reales
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
                Soy el Profesor IA de la E3T
              </h2>

              <p>
                Vamos a aprender Inteligencia
                Artificial resolviendo problemas
                reales de programación.
              </p>

              <div className="learning-card">
                <strong>
                  💡 Nuestra metodología
                </strong>

                <p>
                  Primero entendemos el error,
                  después hacemos una prueba,
                  analizamos el resultado y
                  finalmente aplicamos la solución.
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
                    Analizando el problema...
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
              placeholder="Pregunta sobre IA, React, Git, Codespaces, Vercel..."
              rows={1}
              disabled={loading}
            />

            <button
              className={`mic-button ${
                listening
                  ? "listening"
                  : ""
              }`}
              onClick={startSpeechRecognition}
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