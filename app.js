const input = document.getElementById("messageInput");
const messages = document.getElementById("messages");
const welcome = document.getElementById("welcome");

let mode = "chat";
let busy = false;
let chats = JSON.parse(localStorage.getItem("juniorAIChats") || "[]");
let activeId = null;

function saveChats() {
    localStorage.setItem("juniorAIChats", JSON.stringify(chats));
    renderChats();
}

function currentChat() {
    return chats.find(chat => chat.id === activeId);
}

function newChat() {
    activeId = Date.now().toString();

    chats.unshift({
        id: activeId,
        title: "New conversation",
        items: []
    });

    saveChats();
    showMessages();
    input.focus();
}

function home() {
    activeId = null;
    messages.innerHTML = "";
    messages.classList.remove("visible");
    welcome.style.display = "block";
    input.value = "";
    renderChats();
}

function showMessages() {
    welcome.style.display = "none";
    messages.classList.add("visible");
    messages.innerHTML = "";

    const chat = currentChat();

    if (chat) {
        chat.items.forEach(message => {
            addMessage(message.role, message.content, false);
        });
    }
}

function renderChats() {
    const list = document.getElementById("chatList");
    list.innerHTML = "";

    chats.slice(0, 30).forEach(chat => {
        const button = document.createElement("button");

        button.className = "chat-item";
        button.textContent = "✧ " + chat.title;

        if (chat.id === activeId) {
            button.classList.add("active");
        }

        button.onclick = () => {
            activeId = chat.id;
            showMessages();
            renderChats();
        };

        list.appendChild(button);
    });
}

function addMessage(role, content, scroll = true) {
    const row = document.createElement("div");

    row.className = "message " +
        (role === "user" ? "user" : "assistant");

    if (role !== "user") {
        const avatar = document.createElement("div");
        avatar.className = "avatar";
        avatar.textContent = "J";
        row.appendChild(avatar);
    }

    const bubble = document.createElement("div");
    bubble.className = "bubble";

    const parts = String(content).split(/```([\s\S]*?)```/g);

    parts.forEach((part, index) => {
        if (index % 2 === 1) {
            const pre = document.createElement("pre");
            const code = document.createElement("code");

            code.textContent = part.replace(/^\w+\n/, "");

            pre.appendChild(code);
            bubble.appendChild(pre);
        } else {
            bubble.appendChild(
                document.createTextNode(part)
            );
        }
    });

    row.appendChild(bubble);
    messages.appendChild(row);

    if (scroll) {
        row.scrollIntoView({
            behavior: "smooth",
            block: "end"
        });
    }
}

function setMode(newMode) {
    mode = newMode;

    document.getElementById("chatMode")
        .classList.toggle("active", mode === "chat");

    document.getElementById("fixMode")
        .classList.toggle("active", mode === "fix");

    if (mode === "fix") {
        input.placeholder =
            "Paste your code here and let Junior AI fix it...";
    } else {
        input.placeholder = "Message Junior AI...";
    }
}

async function sendMessage() {
    const text = input.value.trim();

    if (!text || busy) return;

    if (!activeId) {
        newChat();
    }

    const chat = currentChat();

    chat.items.push({
        role: "user",
        content: text
    });

    if (chat.items.length === 1) {
        chat.title = text.slice(0, 30);
    }

    addMessage("user", text);

    input.value = "";
    saveChats();

    busy = true;
    document.getElementById("sendBtn").disabled = true;

    const typing = document.createElement("div");

    typing.className = "message assistant";
    typing.innerHTML = `
        <div class="avatar">J</div>
        <div class="bubble">Junior AI is thinking...</div>
    `;

    messages.appendChild(typing);

    try {
        const response = await fetch(
            "/.netlify/functions/chat",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    messages: chat.items.slice(-12),
                    mode: mode
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "AI request failed.");
        }

        const answer = data.reply;

        typing.remove();

        chat.items.push({
            role: "assistant",
            content: answer
        });

        addMessage("assistant", answer);
        saveChats();

    } catch (error) {
        typing.remove();

        addMessage(
            "assistant",
            "Sorry! Junior AI couldn't connect.\n\n" +
            error.message +
            "\n\nCheck your Netlify API key and deployment."
        );

    } finally {
        busy = false;
        document.getElementById("sendBtn").disabled = false;
        input.focus();
    }
}

// BUTTONS

document.getElementById("sendBtn").onclick = sendMessage;

document.getElementById("newChatBtn").onclick = newChat;

document.getElementById("homeBtn").onclick = home;

document.getElementById("chatMode").onclick = () => {
    setMode("chat");
};

document.getElementById("fixMode").onclick = () => {
    setMode("fix");
};

input.addEventListener("keydown", event => {
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
});

// HOME SCREEN CARDS

document.querySelectorAll(".card").forEach(card => {
    card.onclick = () => {
        setMode("chat");
        input.value = card.dataset.prompt;
        sendMessage();
    };
});

renderChats();
