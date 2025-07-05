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

// 📌 Toggle Dark Mode
toggleDarkMode.onclick = () => {
  document.body.classList.toggle("dark-mode");
  localStorage.setItem(
    "darkMode",
    document.body.classList.contains("dark-mode")
  );
};

// 📌 Add Note
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

// 📌 Render Notes
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

  // Update category filter
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

// 📌 OCR
document.getElementById("ocrInput").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  Tesseract.recognize(file, "eng").then(({ data: { text } }) => {
    text.split("\n").forEach((line) => {
      if (line.trim()) {
        notes.push({
          id: Date.now() + Math.random(),
          text: line.trim(),
          category: "OCR",
          completed: false,
          created: new Date().toISOString(),
        });
      }
    });
    saveNotes();
    renderNotes();
  });
});

// 📸 Use Camera
const video = document.getElementById("video");
const canvas = document.getElementById("canvas");

document.getElementById("cameraBtn").addEventListener("click", () => {
  navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
    video.srcObject = stream;
    setTimeout(() => {
      const ctx = canvas.getContext("2d");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      video.srcObject.getTracks().forEach((track) => track.stop());
      canvas.toBlob((blob) => {
        Tesseract.recognize(blob, "eng").then(({ data: { text } }) => {
          text.split("\n").forEach((line) => {
            if (line.trim()) {
              notes.push({
                id: Date.now() + Math.random(),
                text: line.trim(),
                category: "Camera",
                completed: false,
                created: new Date().toISOString(),
              });
            }
          });
          saveNotes();
          renderNotes();
        });
      });
    }, 2000);
  });
});

// 📌 Browser Notification
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
