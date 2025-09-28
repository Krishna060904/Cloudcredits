// frontend/script.js
(async function () {
  const projectGrid = document.getElementById("projectGrid");
  const PROJECTS_ENDPOINT = "/projects"; // primary endpoint (backend route)
  const PROJECTS_JSON = "/projects.json"; // fallback static file

  function showMessage(text) {
    projectGrid.innerHTML = `<div class="col-12"><div class="alert alert-info">${text}</div></div>`;
  }

  function createCard(p, i) {
    const col = document.createElement("div");
    col.className = "col-md-6 col-lg-4";

    col.innerHTML = `
      <div class="card h-100 shadow-sm project-card" data-index="${i}">
        <img src="${p.image || 'https://via.placeholder.com/800x450?text=Project'}" class="card-img-top project-img" alt="${p.title}">
        <div class="card-body d-flex flex-column">
          <h5 class="card-title">${p.title || "Untitled"}</h5>
          <p class="card-text">${(p.description || "").slice(0, 120)}${(p.description || "").length > 120 ? "..." : ""}</p>
          <div class="mt-auto">
            <button class="btn btn-sm btn-primary view-more">View More</button>
            ${p.repo ? `<a class="btn btn-sm btn-outline-secondary ms-2" href="${p.repo}" target="_blank">Repo</a>` : ""}
          </div>
        </div>
      </div>
    `;

    // image fallback
    const imgEl = col.querySelector("img");
    imgEl.onerror = () => {
      imgEl.onerror = null;
      imgEl.src = "https://via.placeholder.com/800x450?text=Image+not+available";
      imgEl.classList.add("placeholder");
    };

    // view more -> open modal (if modal exists)
    const btn = col.querySelector(".view-more");
    btn.addEventListener("click", () => {
      const modal = document.getElementById("projectModal");
      if (!modal) {
        alert(p.title + "\n\n" + (p.description || ""));
        return;
      }
      document.getElementById("modalTitle").textContent = p.title || "";
      const modalImg = document.getElementById("modalImg");
      modalImg.src = p.image || "https://via.placeholder.com/1200x600?text=No+image";
      modalImg.onerror = () => modalImg.src = "https://via.placeholder.com/1200x600?text=No+image";
      document.getElementById("modalDesc").textContent = p.description || "";
      document.getElementById("modalRepo").href = p.repo || "#";
      document.getElementById("modalLive").href = p.live || "#";
      const bsModal = new bootstrap.Modal(modal);
      bsModal.show();
    });

    return col;
  }

  async function fetchProjects() {
    // try /projects first, then fallback to /projects.json
    let res, projects;
    try {
      res = await fetch(PROJECTS_ENDPOINT);
      if (!res.ok) throw new Error(`no route /projects (${res.status})`);
      projects = await res.json();
      return projects;
    } catch (errPrimary) {
      console.warn("Primary /projects failed:", errPrimary.message);
      // fallback to static projects.json
      try {
        res = await fetch(PROJECTS_JSON);
        if (!res.ok) throw new Error(`projects.json status ${res.status}`);
        projects = await res.json();
        return projects;
      } catch (errFallback) {
        console.error("Fallback projects.json failed:", errFallback.message);
        throw new Error("Could not load projects (tried /projects and /projects.json). Check server or file.");
      }
    }
  }

  // load and render
  try {
    showMessage("Loading projects...");
    const projects = await fetchProjects();
    if (!projects || projects.length === 0) {
      showMessage("No projects found. Add project entries to backend/projects.json or enable /projects route.");
      return;
    }
    projectGrid.innerHTML = "";
    projects.forEach((p, i) => projectGrid.appendChild(createCard(p, i)));
  } catch (err) {
    console.error(err);
    showMessage("Failed to load projects — check console and confirm backend route or projects.json file.");
  }
})();
