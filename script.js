const fileInput = document.getElementById("fileInput");
const dropzone = document.getElementById("dropzone");
const fileBadge = document.getElementById("fileBadge");
const analyzeBtn = document.getElementById("analyzeBtn");
const jobRoleInput = document.getElementById("jobRole");
const previewBox = document.getElementById("previewBox");
const statusText = document.getElementById("status");
const results = document.getElementById("results");

let selectedFile = null;
let resumeText = "";

const roleSkills = {
  "python developer": [
    "python", "django", "flask", "fastapi",
    "sql", "git", "api", "pandas", "numpy"
  ],
  "web developer": [
    "html", "css", "javascript", "react",
    "node.js", "git", "api", "sql"
  ],
  "frontend developer": [
    "html", "css", "javascript", "react",
    "typescript", "git"
  ],
  "backend developer": [
    "python", "java", "node.js", "sql",
    "api", "database", "git", "docker"
  ],
  "java developer": [
    "java", "spring boot", "sql",
    "hibernate", "git", "maven"
  ],
  "data analyst": [
    "python", "sql", "excel", "power bi",
    "tableau", "pandas", "statistics"
  ],
  "software engineer": [
    "python", "java", "c++", "data structures",
    "algorithms", "sql", "git", "testing"
  ]
};

function getExpectedSkills(role) {
  const normalized = role.toLowerCase().trim();

  if (roleSkills[normalized]) {
    return roleSkills[normalized];
  }

  if (normalized.includes("python")) return roleSkills["python developer"];
  if (normalized.includes("frontend")) return roleSkills["frontend developer"];
  if (normalized.includes("backend")) return roleSkills["backend developer"];
  if (normalized.includes("java")) return roleSkills["java developer"];
  if (normalized.includes("data")) return roleSkills["data analyst"];
  if (normalized.includes("web")) return roleSkills["web developer"];

  return roleSkills["software engineer"];
}

// Open file picker
dropzone.addEventListener("click", () => fileInput.click());

fileInput.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (file) handleFile(file);
});

// Drag and drop
dropzone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropzone.classList.add("dragging");
});

dropzone.addEventListener("dragleave", () => {
  dropzone.classList.remove("dragging");
});

dropzone.addEventListener("drop", (event) => {
  event.preventDefault();
  dropzone.classList.remove("dragging");

  const file = event.dataTransfer.files[0];
  if (file) handleFile(file);
});

// Read selected file
async function handleFile(file) {
  const extension = file.name.toLowerCase().slice(file.name.lastIndexOf("."));

  if (![".pdf", ".docx"].includes(extension)) {
    statusText.textContent = "Please choose a PDF or DOCX file.";
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    statusText.textContent = "File must be smaller than 5 MB.";
    return;
  }

  selectedFile = file;
  fileBadge.textContent = file.name;
  statusText.textContent = "Reading resume...";
  previewBox.textContent = "Reading file...";
  results.hidden = true;

  try {
    resumeText = extension === ".pdf"
      ? await readPdf(file)
      : await readDocx(file);

    if (!resumeText.trim()) {
      throw new Error("No readable text found in this file.");
    }

    previewBox.textContent = resumeText.slice(0, 5000);
    statusText.textContent = "Resume loaded successfully. Enter job role.";
  } catch (error) {
    resumeText = "";
    statusText.textContent = error.message;
    previewBox.textContent = "Could not read this file.";
  }
}

// Read PDF
async function readPdf(file) {
  if (!window.pdfjsLib) {
    throw new Error("PDF library not loaded. Check internet connection.");
  }

  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const pages = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    pages.push(content.items.map(item => item.str).join(" "));
  }

  return pages.join("\n");
}

// Read DOCX
async function readDocx(file) {
  if (!window.mammoth) {
    throw new Error("DOCX library not loaded. Check internet connection.");
  }

  const result = await mammoth.extractRawText({
    arrayBuffer: await file.arrayBuffer()
  });

  return result.value;
}

// Analyze button
analyzeBtn.addEventListener("click", () => {
  if (!selectedFile || !resumeText) {
    statusText.textContent = "Please upload a readable resume first.";
    return;
  }

  const role = jobRoleInput.value.trim();

  if (!role) {
    statusText.textContent = "Please enter the target job role.";
    jobRoleInput.focus();
    return;
  }

  runAnalysis(role);
});

function runAnalysis(role) {
  analyzeBtn.disabled = true;
  analyzeBtn.textContent = "Analyzing...";

  setTimeout(() => {
    const text = resumeText.toLowerCase();
    const expected = getExpectedSkills(role);

    const found = expected.filter(skill => text.includes(skill));
    const missing = expected.filter(skill => !text.includes(skill));

    const score = Math.round(
      (found.length / expected.length) * 75 +
      Math.min(resumeText.length / 1200, 1) * 15 +
      (/\b(education|experience|project|skills)\b/i.test(resumeText) ? 10 : 0)
    );

    const finalScore = Math.min(100, score);

    document.getElementById("scoreValue").textContent = finalScore;

    document.getElementById("scoreCircle").style.background =
      `conic-gradient(#10b981 ${finalScore * 3.6}deg, #e2e8f0 ${finalScore * 3.6}deg)`;

    document.getElementById("scoreHeading").textContent =
      finalScore >= 80 ? "Strong keyword match" :
      finalScore >= 55 ? "Good start — room to improve" :
      "Resume needs more role keywords";

    document.getElementById("scoreDescription").textContent =
      `Found ${found.length} of ${expected.length} suggested keywords for ${role}.`;

    document.getElementById("grade").textContent =
      finalScore >= 85 ? "Grade A" :
      finalScore >= 70 ? "Grade B" :
      finalScore >= 50 ? "Grade C" : "Grade D";

    renderTags("foundSkills", found, "tag-found");
    renderTags("missingSkills", missing, "tag-missing");

    renderProgress(found.length, expected.length);
    renderRecommendations(missing, resumeText);

    results.hidden = false;
    statusText.textContent = "Analysis complete. This is a keyword-based demo.";

    analyzeBtn.disabled = false;
    analyzeBtn.textContent = "Analyze Resume";

    results.scrollIntoView({ behavior: "smooth" });
  }, 500);
}

function renderTags(id, items, className) {
  const container = document.getElementById(id);
  container.innerHTML = "";

  if (items.length === 0) {
    container.textContent = "No items found.";
    return;
  }

  items.forEach(item => {
    const span = document.createElement("span");
    span.className = `tag ${className}`;
    span.textContent = item;
    container.appendChild(span);
  });
}

function renderProgress(found, total) {
  const percent = Math.round((found / total) * 100);

  document.getElementById("keywordProgress").innerHTML = `
    <div class="progress-row">
      <div class="progress-label">
        <span>Keyword Match</span>
        <strong>${percent}%</strong>
      </div>
      <div class="progress-track">
        <div class="progress-fill" style="width:${percent}%"></div>
      </div>
    </div>`;
}

function renderRecommendations(missing, text) {
  const list = document.getElementById("recommendations");
  const suggestions = [];

  if (missing.length) {
    suggestions.push(
      "If you have these skills, add relevant examples: " + missing.join(", ")
    );
  }

  if (!/\b(project|projects)\b/i.test(text)) {
    suggestions.push("Add a Projects section.");
  }

  if (!/\b(experience|internship)\b/i.test(text)) {
    suggestions.push("Add internship or practical experience if applicable.");
  }

  if (!/\b(education|qualification)\b/i.test(text)) {
    suggestions.push("Add your Education section.");
  }

  if (!/\b(github|portfolio|linkedin)\b/i.test(text)) {
    suggestions.push("Add portfolio or GitHub links if available.");
  }

  list.innerHTML = "";

  suggestions.forEach(message => {
    const li = document.createElement("li");
    li.textContent = message;
    list.appendChild(li);
  });
}

// Download report
document.getElementById("downloadBtn").addEventListener("click", () => {
  const report = [
    "AI RESUME ANALYZER REPORT",
    "File: " + selectedFile.name,
    "Target role: " + jobRoleInput.value,
    "Demo score: " + document.getElementById("scoreValue").textContent,
    "Grade: " + document.getElementById("grade").textContent,
    "",
    "Detected skills:",
    ...Array.from(document.querySelectorAll("#foundSkills .tag"))
      .map(el => "- " + el.textContent),
    "",
    "Skills to consider:",
    ...Array.from(document.querySelectorAll("#missingSkills .tag"))
      .map(el => "- " + el.textContent),
    "",
    "Recommendations:",
    ...Array.from(document.querySelectorAll("#recommendations li"))
      .map(el => "- " + el.textContent),
    "",
    "Note: This is a keyword-based demo, not a certified ATS score."
  ].join("\n");

  const blob = new Blob([report], {
    type: "text/plain;charset=utf-8"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "resume-analysis-report.txt";
  link.click();

  URL.revokeObjectURL(url);
});