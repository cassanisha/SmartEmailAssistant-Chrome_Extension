// ============================
// Inject content.css dynamically
// ============================
const link = document.createElement("link");
link.rel = "stylesheet";
link.type = "text/css";
link.href = chrome.runtime.getURL("content.css");
document.head.appendChild(link);

// ============================
// Categorize button in Gmail sidebar
// ============================
function injectCategorizeButton() {
  if (document.getElementById("smartai-categorize")) return;

  const sidebar = document.querySelector("div[role=navigation]");
  if (!sidebar) return;

  const btn = document.createElement("button");
  btn.id = "smartai-categorize";
  btn.className = "smartai-btn";
  btn.textContent = "📂 Categorize Emails";

  btn.addEventListener("click", () => {
    alert("Categorize clicked! AI would classify emails here.");
  });

  sidebar.appendChild(btn);
}

// ============================
// Add SmartAI buttons to compose/reply editors
// ============================
function injectEditorButtons(editorRoot) {
  if (editorRoot.querySelector(".smartai-toolbar")) return;

  const toolbar = document.createElement("div");
  toolbar.className = "smartai-toolbar";
  editorRoot.style.position = "relative";

  toolbar.innerHTML = `
    <button class="smartai-btn generate-btn">✨ Generate Email</button>
    <button class="smartai-btn reply-btn">🤖 Reply by AI</button>
    <button class="smartai-btn event-btn">📅 Add Event</button>
  `;
  editorRoot.appendChild(toolbar);

  // Attach listeners
  toolbar.querySelector(".generate-btn").addEventListener("click", () => showGeneratePopup(editorRoot));
toolbar.querySelector(".reply-btn").addEventListener("click", () => { generateAIReplyForThread(); });  
toolbar.querySelector(".event-btn").addEventListener("click", () => alert("Add Event here"));
}

// ============================
// Generate Email popup
// ============================
function findActiveComposeBox() {
  return document.querySelector('div[role="textbox"][contenteditable="true"].editable[aria-label="Message Body"]');
}

function showGeneratePopup(editorRoot) {
  if (document.getElementById("smartai-popup")) return;

  const popup = document.createElement("div");
  popup.id = "smartai-popup";
  popup.innerHTML = `
    <div class="smartai-popup-content">
      <h3>Generate Email with AI</h3>
      <textarea id="smartai-input" placeholder="Write your prompt here..."></textarea>
      <label for="smartai-tone">Tone:</label>
      <select id="smartai-tone">
        <option value="formal">Formal</option>
        <option value="friendly">Friendly</option>
        <option value="persuasive">Persuasive</option>
      </select>
      <div class="smartai-actions">
        <button id="smartai-generate">Generate</button>
        <button id="smartai-cancel">Cancel</button>
      </div>
      <div id="smartai-loading" style="display:none;">Generating...</div>
    </div>
  `;
  document.body.appendChild(popup);

  const loading = document.getElementById("smartai-loading");
  const input = document.getElementById("smartai-input");
  const toneSelect = document.getElementById("smartai-tone");

  document.getElementById("smartai-cancel").onclick = () => popup.remove();

  document.getElementById("smartai-generate").onclick = async () => {
    const userPrompt = input.value.trim();
    const tone = toneSelect.value;

    if (!userPrompt) {
      alert("Please enter a prompt");
      return;
    }

    loading.style.display = "block";

    try {
  const res = await fetch("http://localhost:8081/assist/generate-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userPrompt, tone }),
    credentials: "include"
  });

  if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

  const data = await res.json();
  console.log("AI Response:", data);

  const activeCompose = findActiveComposeBox();
  if (activeCompose) {
    activeCompose.focus();

    // Replace content with AI text and convert newlines to <br>
    const htmlContent = (data.content || "").replace(/\n/g, "<br>");
    activeCompose.innerHTML = htmlContent;

    // Move cursor to the end
    const range = document.createRange();
    range.selectNodeContents(activeCompose);
    range.collapse(false);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

  } else {
    console.log("No active compose box found");
  }

  popup.remove();
} catch (err) {
  console.error("Error generating email:", err);
  alert("Failed to generate email. Check console for details.");
} finally {
  loading.style.display = "none";
}
}
}
//======
//reply by ai
//=========
async function generateAIReplyForThread() {
  // Find all email bodies in the thread
  const emailBodies = Array.from( document.querySelectorAll("div.a3s, div.im"))
  .map(div => div.innerText.trim())   // get the text
  .filter(text => text.length > 0);   // remove empty strings


  if (emailBodies.length === 0) return alert("No emails found in this thread");

  // Collect sender names (if available)
  const emailSenders = Array.from(document.querySelectorAll("span[email]"))
    .map(span => span.innerText.trim());

  const threadData = emailBodies.map((body, i) => ({
    sender: emailSenders[i] || "Unknown",
    body
  }));

  const activeCompose = findActiveComposeBox();
  if (!activeCompose) return alert("No active compose box found");

  activeCompose.innerText = "Generating AI reply...";

  try {
    const res = await fetch("http://localhost:8081/assist/reply-ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ thread: threadData })
    });

    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

    const data = await res.json();
    const htmlContent = (data.content || "").replace(/\n/g, "<br>");

    activeCompose.innerHTML = htmlContent;

    // Move cursor to the end
    const range = document.createRange();
    range.selectNodeContents(activeCompose);
    range.collapse(false);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

  } catch (err) {
    console.error("Error generating AI reply:", err);
    alert("Failed to generate AI reply");
  }
}


// ============================
// Observe Gmail DOM for compose/reply
// ============================
const editorObserver = new MutationObserver(() => {
  // Compose windows
  document.querySelectorAll("div[role=dialog]").forEach(dialog => {
    const form = dialog.querySelector("form");
    if (form) injectEditorButtons(form);
  });

  // Inline reply/forward boxes
  document.querySelectorAll("div[aria-label='Message Body']").forEach(replyBox => {
    const container = replyBox.closest("div[role=region]");
    if (container) injectEditorButtons(container);
  });

  // Sidebar categorize button
  injectCategorizeButton();
});

// Start observing Gmail DOM
editorObserver.observe(document.body, { childList: true, subtree: true });


