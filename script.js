// Thêm API KEY và URL
const API_KEY = window.API_KEY;
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

// === BIẾN TOÀN CỤC ===
const messagesContainer = document.getElementById("chat");
const userInput = document.getElementById("input");
const sendButton = document.getElementById("sendButton");
const menuIcon = document.getElementById("menuIcon");
const sidebarMenu = document.getElementById("sidebarMenu");
const chatContainer = document.getElementById("chatContainer");
const chatListContainer = document.getElementById("chatList");
const imagePreviewContainer = document.getElementById("imagePreviewContainer");
const fileUploadInput = document.getElementById("fileUpload");
const sidebarOverlay = document.getElementById("sidebarOverlay");
const chatSearch = document.getElementById("chatSearch");
const newChatBtn = document.getElementById("newChatBtn");
const userAvatar = document.getElementById("userAvatar");
const userMenu = document.getElementById("userMenu");

let conversationMemory = [];
// *** SỬA TÍNH NĂNG: Lịch sử sẽ được tải sau khi đăng nhập ***
let chatHistory = [];
let currentUserEmail = null; // Thêm email của user hiện tại
let currentChatId = null;
let selectedFile = null;

// === PROMPT HƯỚNG DẪN (ĐÃ CHỈNH SỬA) ===
const HEALTH_GUIDELINES = `
Bạn là một trợ lý AI chuyên về tư vấn sức khỏe. Nhiệm vụ của bạn là cung cấp thông tin một cách cẩn trọng, đồng cảm và chuyên nghiệp.

--- ⭐️ QUY TẮC XỬ LÝ HÌNH ẢNH (Rất quan trọng) ⭐️ ---

**1. ƯU TIÊN HÀNG ĐẦU:**
Luôn phân tích hình ảnh được cung cấp, ngay cả khi người dùng không đặt câu hỏi.

**2. NẾU ẢNH LIÊN QUAN ĐẾN Y TẾ:**
Nếu hình ảnh **liên quan trực tiếp đến y tế** (ví dụ: vỉ thuốc, chai thuốc, tên thuốc, đơn thuốc, triệu chứng da liễu): Bạn **PHẢI** thực hiện phân tích chuyên sâu. Cố gắng xác định:
- **Tên thuốc** (nếu có thể đọc)
- **Hoạt chất chính** (thành phần)
- **Công dụng** (thường dùng để trị bệnh gì)
- **Tác dụng phụ thường gặp** (nếu biết)
- **Cảnh báo** (ví dụ: "Không tự ý sử dụng", "Cần có chỉ định của bác sĩ")

**3. NẾU ẢNH KHÔNG LIÊN QUAN ĐẾN Y TẾ:**
Nếu hình ảnh **không liên quan đến y tế** (ví dụ: công nghệ, động vật, đồ vật...):
- Hãy mô tả ngắn gọn nội dung ảnh (ví dụ: "Đây là hình ảnh về...").
- Sau đó, lập tức nhắc lại rằng bạn là trợ lý sức khỏe và sẵn sàng tư vấn về chủ đề y tế.

--- HƯỚNG DẪN CHUNG ---
Bạn CÓ THỂ sử dụng emoji (icon) 💡, 🩺, 🧑‍⚕️ một cách hợp lý. Bạn NÊN sử dụng Markdown (ví dụ: **từ quan trọng**) để nhấn mạnh. Trình bày câu trả lời rõ ràng, dễ đọc, ngắt dòng hợp lý.

Sử dụng cấu trúc sau nếu phù hợp:

💡 **Tổng quan về vấn đề:**
[Giải thích ngắn gọn]

🩺 **Phân tích hoặc Gợi ý:**
**1.** [Lời khuyên 1]
**2.** [Lời khuyên 2]

🧑‍⚕️ **LƯU Ý QUAN TRỌNG:**
(Chỉ thêm nếu đưa ra lời khuyên y tế) "Thông tin này chỉ mang tính chất tham khảo. Bạn nên tham khảo ý kiến của bác sĩ hoặc chuyên gia y tế để được chẩn đoán và tư vấn chính xác."
`.trim();

// === XÁC THỰC NGƯỜI DÙNG (SỬA) ===
function checkAuth() {
  const session = JSON.parse(localStorage.getItem("healthSession"));
  if (!session) {
    window.location.href = "login.html";
    return null;
  }
  // *** SỬA TÍNH NĂNG: Lưu lại email user khi xác thực ***
  currentUserEmail = session.email;
  return session;
}

// === HIỂN THỊ THÔNG TIN USER ===
function displayUserInfo(session) {
  if (!session) return;

  const userNameEl = document.getElementById("userName");
  const userEmailEl = document.getElementById("userEmail");

  if (userNameEl) userNameEl.textContent = session.name;
  if (userEmailEl) userEmailEl.textContent = session.email;
  if (userAvatar) {
    const initials = session.name
      .split(" ")
      .slice(0, 2)
      .map((n) => n[0])
      .join("")
      .toUpperCase();
    userAvatar.textContent = initials;
  }
}

// === QUẢN LÝ LỊCH SỬ CHO TỪNG USER (TÍNH NĂNG MỚI) ===

// Hàm tải lịch sử của user hiện tại
function loadUserHistory() {
  if (!currentUserEmail) return;
  const allHistories = JSON.parse(
    localStorage.getItem("allUserChatHistories") || "{}"
  );
  // Tải lịch sử của user này, nếu không có thì dùng mảng rỗng
  chatHistory = allHistories[currentUserEmail] || [];
}

// Hàm lưu lịch sử của user hiện tại
function saveUserHistory() {
  if (!currentUserEmail) return;
  const allHistories = JSON.parse(
    localStorage.getItem("allUserChatHistories") || "{}"
  );
  allHistories[currentUserEmail] = chatHistory;
  localStorage.setItem("allUserChatHistories", JSON.stringify(allHistories));
}

// === GỌI API GEMINI (PHIÊN BẢN NÂNG CẤP - CÓ NHẬN BIẾT THỜI GIAN) ===
async function callGemini() {
  // *** TÍNH NĂNG MỚI: Lấy thời gian thực từ trình duyệt ***
  const now = new Date();
  const formattedTime = now.toLocaleString("vi-VN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh", // Luôn dùng giờ Việt Nam (GMT+7)
  });

  // Ghép bối cảnh thời gian vào hướng dẫn
  const fullGuidelines = `
    ${HEALTH_GUIDELINES}

    ---
    **Bối cảnh thời gian hiện tại (do trình duyệt cung cấp):**
    Hôm nay là: ${formattedTime} (GMT+7).
    Nếu người dùng hỏi về thời gian, hãy sử dụng thông tin này để trả lời.
  `.trim();
  // *** KẾT THÚC TÍNH NĂNG MỚI ***

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        // Gửi toàn bộ lịch sử chat
        contents: conversationMemory,

        // Gửi hướng dẫn hệ thống (ĐÃ BAO GỒM THỜI GIAN THỰC)
        system_instruction: {
          parts: [{ text: fullGuidelines }],
        },
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(
        `Lỗi API ${res.status}: ${err.error?.message || "Không xác định"}`
      );
    }

    const data = await res.json();
    return (
      data.candidates?.[0]?.content?.parts?.[0]?.text || "Không có phản hồi."
    );
  } catch (error) {
    console.error("Lỗi gọi API:", error);

    // Đây là câu trả lời thân thiện khi API bị lỗi (ví dụ: do Rate Limit)
    return "Rất tiếc, tôi đang gặp sự cố kết nối. Bạn vui lòng thử lại sau một lát nhé.";
  }
}

async function getAIReply(
  userPrompt,
  imageBase64 = null,
  imageMimeType = null
) {
  // 1. Tạo phần tin nhắn của người dùng
  const userMemoryPart = {
    role: "user",
    parts: [{ text: userPrompt || "[Người dùng gửi ảnh]" }],
  };

  // Thêm ảnh nếu có
  if (imageBase64 && userPrompt) {
    userMemoryPart.parts = [
      { text: userPrompt },
      { inline_data: { mime_type: imageMimeType, data: imageBase64 } },
    ];
  } else if (imageBase64) {
    userMemoryPart.parts = [
      { inline_data: { mime_type: imageMimeType, data: imageBase64 } },
    ];
  }

  // 2. Thêm tin nhắn mới vào lịch sử
  conversationMemory.push(userMemoryPart);

  // 3. Gọi callGemini (không cần tham số, nó sẽ tự đọc conversationMemory)
  const reply = await callGemini();

  // 4. Lưu phản hồi của AI vào lịch sử
  conversationMemory.push({ role: "model", parts: [{ text: reply }] });

  // Cắt bớt lịch sử
  if (conversationMemory.length > 10) {
    conversationMemory = conversationMemory.slice(-10);
  }

  return reply;
}

// === GỬI TIN NHẮN ===
async function sendMsg() {
  const text = userInput.value.trim();
  if (!text && !selectedFile) return;

  toggleSendButton(false);
  userInput.disabled = true;

  addMessage(text, "user", selectedFile?.dataUrl || null);
  const base64Data = selectedFile ? selectedFile.dataUrl.split(",")[1] : null;
  const mimeType = selectedFile?.file.type || null;

  userInput.value = "";
  removeImagePreview();

  const aiBubble = addMessage("", "ai", null, true);

  try {
    const response = await getAIReply(text, base64Data, mimeType);
    updateAIMessage(aiBubble, response);
  } catch (error) {
    updateAIMessage(aiBubble, `Lỗi: ${error.message}`);
  }

  saveCurrentChat(); // Đã sửa để lưu cho từng user
  userInput.disabled = false;
  userInput.focus();
  toggleSendButton(userInput.value.trim().length > 0 || selectedFile != null);
}

// === QUẢN LÝ GIAO DIỆN CHAT (Giữ nguyên) ===
function addMessage(text, sender, imageUrl = null, isLoading = false) {
  const div = document.createElement("div");

  if (sender === "user") {
    div.className = "msg-user mb-4 flex flex-col items-end";
    const imageHtml = imageUrl
      ? `<img src="${imageUrl}" class="max-w-[60dvw] md:max-w-xs rounded-lg shadow-sm ${
          text ? "mb-2" : ""
        }" alt="Ảnh người dùng">`
      : "";
    const textHtml = text
      ? `<div class="bubble-user max-w-[85%] rounded-2xl rounded-br-none bg-gradient-to-br from-emerald-500 to-emerald-600 px-4 py-3 text-sm text-white shadow-md">
           ${text.replace(/\n/g, "<br>")}
         </div>`
      : "";
    div.innerHTML = imageHtml + textHtml;
  } else {
    // AI
    div.className = "msg-bot mb-4 flex items-start gap-3";
    const content = isLoading
      ? `<div class="flex gap-1.5 p-2"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>`
      : text.replace(/\n/g, "<br>");

    div.innerHTML = `
      <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-md">
        <i class="fa-solid fa-user-doctor text-white"></i>
      </div>
      <div class="bubble-bot max-w-[85%] rounded-2xl rounded-tl-none bg-white px-4 py-3 text-sm text-slate-800 shadow-sm border border-emerald-100">
        ${content}
      </div>`;
  }

  messagesContainer.appendChild(div);
  scrollToBottom();
  return sender === "ai" ? div.querySelector(".bubble-bot") : null;
}

function updateAIMessage(bubble, text) {
  if (bubble) {
    const formattedText = text
      .replace(/\n/g, "<br>")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>");

    bubble.innerHTML = formattedText;
    scrollToBottom();
  }
}

// === HÀM HỖ TRỢ (Giữ nguyên) ===
function scrollToBottom() {
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}
function toggleSendButton(enabled) {
  sendButton.disabled = !enabled;
}
function handleKey(e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    if (!sendButton.disabled) {
      sendMsg();
    }
  }
}
function handleFile(e) {
  const file = e.target.files[0];
  if (!file || !file.type.startsWith("image/")) {
    if (file) alert("Chỉ chấp nhận file ảnh!");
    fileUploadInput.value = "";
    return;
  }
  const reader = new FileReader();
  reader.onload = (ev) => {
    selectedFile = { file, dataUrl: ev.target.result };
    imagePreviewContainer.innerHTML = `
      <div class="relative group">
        <img src="${ev.target.result}" class="h-10 w-10 rounded-md object-cover">
        <button onclick="removeImagePreview(event)" class="absolute -top-2 -right-2 h-5 w-5 bg-black bg-opacity-70 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <i class="fa-solid fa-xmark text-xs"></i>
        </button>
      </div>`;
    toggleSendButton(true);
  };
  reader.readAsDataURL(file);
}
function removeImagePreview(e) {
  if (e) e.preventDefault();
  selectedFile = null;
  imagePreviewContainer.innerHTML = "";
  fileUploadInput.value = "";
  toggleSendButton(userInput.value.trim().length > 0);
}
function setupQuickActions() {
  document.querySelectorAll(".quick-action").forEach((btn) => {
    btn.addEventListener("click", () => {
      const prompt = btn.textContent.trim().substring(2);
      userInput.value = prompt;
      toggleSendButton(true);
      userInput.focus();
      sendMsg();
    });
  });
}

// === SIDEBAR & LỊCH SỬ CHAT ===

// *** SỬA GIAO DIỆN: Sửa hàm toggleSidebar ***
// Giờ đây nó sẽ thêm/xóa padding vào BODY,
// làm cho cửa sổ chat tự động co lại và căn giữa.
function toggleSidebar(forceClose = false) {
  const hidden = sidebarMenu.classList.contains("-translate-x-full");
  if (forceClose || !hidden) {
    // ---- ĐÓNG SIDEBAR ----
    sidebarMenu.classList.add("-translate-x-full");
    sidebarOverlay.classList.add("hidden");
    document.body.classList.remove("md:pl-[280px]"); // Xóa padding
  } else {
    // ---- MỞ SIDEBAR ----
    sidebarMenu.classList.remove("-translate-x-full");
    sidebarOverlay.classList.remove("hidden");
    document.body.classList.add("md:pl-[280px]"); // Thêm padding
  }
}
// *** KẾT THÚC SỬA GIAO DIỆN ***

function toggleUserMenu(e) {
  e.stopPropagation();
  document.querySelectorAll(".chat-menu").forEach((menu) => {
    menu.classList.add("hidden");
  });
  userMenu.classList.toggle("hidden");
}

// *** SỬA TÍNH NĂNG: Cập nhật hàm logout ***
function logout() {
  saveUserHistory(); // Lưu lịch sử lần cuối trước khi thoát
  localStorage.removeItem("healthSession");
  currentUserEmail = null; // Xóa user hiện tại
  chatHistory = []; // Xóa lịch sử khỏi bộ nhớ
  window.location.href = "login.html";
}

// --- NÂNG CẤP LỊCH SỬ CHAT (Giữ nguyên giao diện) ---

function renderChatList() {
  const searchTerm = chatSearch.value.toLowerCase();
  chatHistory.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return b.id - a.id;
  });

  chatListContainer.innerHTML =
    '<h3 class="text-xs font-semibold uppercase tracking-wide text-emerald-600 mb-2 px-2">Lịch sử</h3>';

  const filteredHistory = chatHistory.filter((c) =>
    c.name.toLowerCase().includes(searchTerm)
  );

  if (filteredHistory.length === 0) {
    chatListContainer.innerHTML +=
      '<p class="text-xs text-slate-500 px-3">Chưa có lịch sử chat.</p>';
    return;
  }

  filteredHistory.forEach((c) => {
    const isActive = c.id === currentChatId;
    chatListContainer.innerHTML += `
    <div class="relative group" title="${c.name}">
      <div 
        class="flex items-center justify-between gap-3 rounded-lg p-3 cursor-pointer transition-all ${
          isActive ? "bg-emerald-100" : "hover:bg-emerald-50"
        }"
        onclick="loadChat(${c.id})"
      >
        <span class="flex-shrink-0 w-5 text-center">
          ${
            c.pinned
              ? '<i class="fa-solid fa-thumbtack text-emerald-600 text-sm"></i>'
              : '<i class="fa-regular fa-message text-slate-500 text-sm"></i>'
          }
        </span>
        <span class="flex-1 text-sm ${
          isActive ? "font-medium text-emerald-800" : "text-slate-700"
        } truncate">
          ${c.name}
        </span>
        <button 
          class="kebab-btn -mr-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-200 ${
            isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          } transition-opacity" 
          onclick="toggleChatMenu(event, ${c.id})"
        >
          <i class="fa-solid fa-ellipsis-vertical text-sm"></i>
        </button>
      </div>
      <div 
        id="menu-${c.id}"
        class="chat-menu absolute right-4 top-11 z-20 hidden min-w-[160px] rounded-lg bg-white p-1.5 shadow-xl ring-1 ring-black ring-opacity-5"
      >
        <button 
          class="flex w-full items-center gap-2.5 rounded px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100" 
          onclick="pinChat(event, ${c.id})"
        >
          <i class="fa-solid fa-thumbtack w-4 text-center text-slate-500"></i>
          <span>${c.pinned ? "Bỏ ghim" : "Ghim"}</span>
        </button>
        <button 
          class="flex w-full items-center gap-2.5 rounded px-3 py-1.5 text-left text-sm text-red-600 hover:bg-red-50" 
          onclick="deleteChat(event, ${c.id})"
        >
          <i class="fa-solid fa-trash w-4 text-center"></i>
          <span>Xóa</span>
        </button>
      </div>
    </div>
    `;
  });
}

function toggleChatMenu(e, id) {
  e.stopPropagation();
  document.querySelectorAll(".chat-menu").forEach((menu) => {
    if (menu.id !== `menu-${id}`) {
      menu.classList.add("hidden");
    }
  });
  userMenu.classList.add("hidden");
  const menu = document.getElementById(`menu-${id}`);
  menu.classList.toggle("hidden");
}

// *** SỬA TÍNH NĂNG: Cập nhật hàm pinChat ***
function pinChat(e, id) {
  e.stopPropagation();
  const chat = chatHistory.find((c) => c.id === id);
  if (chat) {
    chat.pinned = !chat.pinned;
    saveUserHistory(); // Thay vì lưu vào localStorage cũ
    renderChatList();
  }
  document.getElementById(`menu-${id}`).classList.add("hidden");
}

// *** SỬA TÍNH NĂNG: Cập nhật hàm deleteChat ***
function deleteChat(e, id) {
  e.stopPropagation();

  chatHistory = chatHistory.filter((c) => c.id !== id);
  saveUserHistory(); // Thay vì lưu vào localStorage cũ

  if (currentChatId === id) {
    newChat();
  } else {
    renderChatList();
  }

  const menu = document.getElementById(`menu-${id}`);
  if (menu) {
    menu.classList.add("hidden");
  }
}

// --- KẾT THÚC NÂNG CẤP LỊCH SỬ CHAT ---

// *** SỬA TÍNH NĂNG: Cập nhật hàm saveCurrentChat ***
function saveCurrentChat() {
  const firstUserMsg = messagesContainer.querySelector(".msg-user");
  if (!firstUserMsg) return;

  const content = messagesContainer.innerHTML;
  const memory = conversationMemory;

  if (currentChatId) {
    const chat = chatHistory.find((c) => c.id === currentChatId);
    if (chat) {
      chat.content = content;
      chat.memory = memory;
    }
  } else {
    const name =
      firstUserMsg
        .querySelector(".bubble-user")
        ?.textContent.substring(0, 40) ||
      (firstUserMsg.querySelector("img") ? "Hình ảnh" : "Chat mới");

    const newChat = {
      id: Date.now(),
      name: name + (name.length === 40 ? "..." : ""),
      content,
      memory,
      pinned: false,
    };
    chatHistory.push(newChat);
    currentChatId = newChat.id;
  }

  saveUserHistory(); // Thay vì lưu vào localStorage cũ
  renderChatList();
}

function newChat() {
  currentChatId = null;
  conversationMemory = [];
  messagesContainer.innerHTML = `
    <div class="msg-bot mb-4 flex items-start gap-3">
      <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-md">
        <i class="fa-solid fa-user-doctor text-white"></i>
      </div>
      <div class="bubble-bot max-w-[85%] rounded-2xl rounded-tl-none bg-white px-4 py-3 text-sm text-slate-800 shadow-sm border border-emerald-100">
        <p><strong>Xin chào! 👋</strong></p>
        <p>Tôi là trợ lý AI chuyên về tư vấn sức khỏe. Bạn cần hỗ trợ gì hôm nay?</p>
      </div>
    </div>`;
  removeImagePreview();
  userInput.value = "";
  toggleSendButton(false);
  toggleSidebar(true);
  renderChatList();
}

function loadChat(id) {
  const chat = chatHistory.find((c) => c.id === id);
  if (!chat) {
    console.error("Không tìm thấy chat!");
    return;
  }

  currentChatId = chat.id;
  messagesContainer.innerHTML = chat.content;
  conversationMemory = chat.memory || [];

  removeImagePreview();
  userInput.value = "";
  toggleSendButton(false);
  toggleSidebar(true);
  renderChatList();
  scrollToBottom();
}

// === KHỞI TẠO ỨNG DỤNG ===
document.addEventListener("DOMContentLoaded", () => {
  // *** SỬA TÍNH NĂNG: Thay đổi thứ tự khởi tạo ***

  // 1. Kiểm tra đăng nhập và lấy email user
  const session = checkAuth();
  if (!session) return;

  // 2. Hiển thị thông tin user
  displayUserInfo(session);

  // 3. Tải lịch sử của user này
  loadUserHistory();

  // 4. Gắn các sự kiện
  sendButton.addEventListener("click", sendMsg);
  userInput.addEventListener("keydown", handleKey);
  userInput.addEventListener("input", () =>
    toggleSendButton(userInput.value.trim().length > 0 || selectedFile != null)
  );
  fileUploadInput.addEventListener("change", handleFile);

  menuIcon.addEventListener("click", () => toggleSidebar(false));
  sidebarOverlay.addEventListener("click", () => toggleSidebar(true));
  newChatBtn.addEventListener("click", newChat);
  chatSearch.addEventListener("input", renderChatList);
  userAvatar.addEventListener("click", toggleUserMenu);

  document.addEventListener("click", (e) => {
    if (!userMenu.contains(e.target) && !userAvatar.contains(e.target)) {
      userMenu.classList.add("hidden");
    }
    const clickedOnKebab = e.target.closest(".kebab-btn");
    const clickedOnChatMenu = e.target.closest(".chat-menu");
    if (!clickedOnKebab && !clickedOnChatMenu) {
      document.querySelectorAll(".chat-menu").forEach((menu) => {
        menu.classList.add("hidden");
      });
    }
  });

  setupQuickActions();

  // 5. Tải cuộc chat đầu tiên
  if (chatHistory.length > 0) {
    chatHistory.sort((a, b) => b.id - a.id);
    loadChat(chatHistory[0].id);
  } else {
    newChat();
  }

  // 6. Render danh sách lịch sử
  renderChatList();
});
