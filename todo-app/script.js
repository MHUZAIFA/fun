let notes = JSON.parse(localStorage.getItem("notes")) || [];

const noteForm = document.getElementById("noteForm");
const noteInput = document.getElementById("noteInput");
const categoryInput = document.getElementById("categoryInput");
const reminderInput = document.getElementById("reminderInput");
const notesList = document.getElementById("notesList");
const filterCategory = document.getElementById("filterCategory");
const sortNotes = document.getElementById("sortNotes");
const toggleDarkMode = document.getElementById("toggleDarkMode");

document.body.classList.toggle(
  "dark-mode",
  localStorage.getItem("darkMode") === "true"
);

// Toggle Dark Mode
toggleDarkMode.onclick = () => {
  document.body.classList.toggle("dark-mode");
  localStorage.setItem(
    "darkMode",
    document.body.classList.contains("dark-mode")
  );
};

// Add Note
noteForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const note = {
    id: Date.now(),
    text: noteInput.value,
    category: categoryInput.value.trim(),
    completed: false,
    created: new Date().toISOString(),
    reminder: reminderInput.value,
  };
  notes.push(note);
  saveNotes();
  renderNotes();
  setReminder(note);
  noteForm.reset();
});

// Render Notes
function renderNotes() {
  notesList.innerHTML = "";
  const filter = filterCategory.value;
  const sortBy = sortNotes.value;

  let filteredNotes = notes.filter((n) => !filter || n.category === filter);

  if (sortBy === "newest") {
    filteredNotes.sort((a, b) => new Date(b.created) - new Date(a.created));
  } else {
    filteredNotes.sort((a, b) => new Date(a.created) - new Date(b.created));
  }

  const categories = new Set();
  filteredNotes.forEach((note) => {
    categories.add(note.category);

    const li = document.createElement("li");
    li.className = note.completed ? "completed" : "";
    li.innerHTML = `
      <strong>${note.category || "Uncategorized"}</strong>: ${note.text}
      <br />
      <button onclick="toggleComplete(${note.id})">✅</button>
      <button onclick="deleteNote(${note.id})">❌</button>
    `;
    notesList.appendChild(li);
  });

  // Update filter dropdown
  filterCategory.innerHTML = `<option value="">All Categories</option>`;
  categories.forEach((c) => {
    filterCategory.innerHTML += `<option value="${c}">${c}</option>`;
  });
}

function toggleComplete(id) {
  const note = notes.find((n) => n.id === id);
  if (note) {
    note.completed = !note.completed;
    saveNotes();
    renderNotes();
  }
}

function deleteNote(id) {
  notes = notes.filter((n) => n.id !== id);
  saveNotes();
  renderNotes();
}

function saveNotes() {
  localStorage.setItem("notes", JSON.stringify(notes));
}

// OCR Upload
document.getElementById("ocrInput").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  Tesseract.recognize(file, "eng", {
    logger: (m) => console.log(m),
  })
    .then(({ data: { text } }) => {
      const lines = text
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 3);
      if (lines.length === 0) return alert("No valid text found.");

      lines.forEach((line) => {
        notes.push({
          id: Date.now() + Math.random(),
          text: line,
          category: "OCR",
          completed: false,
          created: new Date().toISOString(),
        });
      });
      saveNotes();
      renderNotes();
    })
    .catch((err) => {
      console.error("OCR error:", err);
      alert("OCR failed.");
    });
});

// Camera OCR
const video = document.getElementById("video");
const canvas = document.getElementById("canvas");

document.getElementById("cameraBtn").addEventListener("click", async () => {
  try {
    let stream;
    try {
      // Try to use exact rear camera
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { exact: "environment" } },
        audio: false,
      });
    } catch (error) {
      // Fallback if "exact" fails (e.g., on desktop or unsupported device)
      console.warn("Exact back camera not available, falling back to ideal...");
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
    }

    video.srcObject = stream;

    setTimeout(() => {
      const ctx = canvas.getContext("2d");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      stream.getTracks().forEach((track) => track.stop());

      canvas.toBlob((blob) => {
        Tesseract.recognize(blob, "eng", {
          logger: (m) => console.log(m),
        })
          .then(({ data: { text } }) => {
            const lines = text
              .split("\n")
              .map((l) => l.trim())
              .filter((l) => l.length > 3);
            if (lines.length === 0) return alert("No valid text found.");

            lines.forEach((line) => {
              notes.push({
                id: Date.now() + Math.random(),
                text: line,
                category: "Camera",
                completed: false,
                created: new Date().toISOString(),
              });
            });
            saveNotes();
            renderNotes();
          })
          .catch((err) => {
            console.error("OCR error:", err);
            alert("OCR failed.");
          });
      });
    }, 2000);
  } catch (err) {
    console.error("Camera access error:", err);
    alert("Camera not available or permission denied.");
  }
});

// Reminders
function setReminder(note) {
  if (note.reminder) {
    const reminderTime = new Date(note.reminder).getTime();
    const now = Date.now();
    if (reminderTime > now) {
      const delay = reminderTime - now;
      setTimeout(() => {
        if (Notification.permission === "granted") {
          new Notification("Reminder", { body: note.text });
        }
      }, delay);
    }
  }
}

if (Notification.permission !== "granted") {
  Notification.requestPermission();
}

renderNotes();
