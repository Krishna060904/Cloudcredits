const token = localStorage.getItem("token");
if (!token) window.location = "/login.html";

const headers = {"Content-Type":"application/json","Authorization":"Bearer "+token};
const tasksGrid = document.getElementById("tasksGrid");
const taskForm = document.getElementById("taskForm");
const taskModal = new bootstrap.Modal(document.getElementById("taskModal"));
let showArchived = false;

// Load tasks
async function loadTasks() {
  const res = await fetch(`/tasks?archived=${showArchived?1:0}`, {headers});
  const tasks = await res.json();
  tasksGrid.innerHTML = "";
  tasks.forEach(t=>{
    const col = document.createElement("div");
    col.className="col-12 col-md-6";
    col.innerHTML=`
      <div class="card p-3">
        <h5>${t.title}</h5>
        <p>${t.description||""}</p>
        <small>Priority: ${t.priority}, Due: ${t.due_date||"-"}, Recurrence: ${t.recurrence}</small>
        <div class="mt-2">
          <button class="btn btn-sm btn-outline-primary edit">Edit</button>
          <button class="btn btn-sm ${t.status==="complete"?"btn-secondary":"btn-success"} toggle">${t.status==="complete"?"Mark Pending":"Mark Complete"}</button>
          <button class="btn btn-sm ${showArchived?"btn-warning restore":"btn-danger delete"}">${showArchived?"Restore":"Archive"}</button>
        </div>
      </div>`;
    col.querySelector(".edit").onclick=()=>openEdit(t);
    col.querySelector(".toggle").onclick=()=>toggleStatus(t);
    col.querySelector(showArchived?".restore":".delete").onclick=()=>archiveTask(t);
    tasksGrid.appendChild(col);
  });
}

function openEdit(t){
  document.getElementById("taskId").value=t.id;
  document.getElementById("taskTitle").value=t.title;
  document.getElementById("taskDesc").value=t.description||"";
  document.getElementById("taskPriority").value=t.priority;
  document.getElementById("taskDue").value=t.due_date||"";
  document.getElementById("taskTags").value=t.tags||"";
  document.getElementById("taskRecurrence").value=t.recurrence||"none";
  document.getElementById("taskStatus").value=t.status;
  taskModal.show();
}

taskForm.onsubmit=async e=>{
  e.preventDefault();
  const id=document.getElementById("taskId").value;
  const payload={
    title:document.getElementById("taskTitle").value,
    description:document.getElementById("taskDesc").value,
    priority:document.getElementById("taskPriority").value,
    due_date:document.getElementById("taskDue").value,
    tags:document.getElementById("taskTags").value,
    recurrence:document.getElementById("taskRecurrence").value,
    status:document.getElementById("taskStatus").value
  };
  await fetch(id?`/task/${id}`:"/task",{method:id?"PUT":"POST",headers,body:JSON.stringify(payload)});
  taskModal.hide(); loadTasks();
};

async function toggleStatus(t){
  const newStatus=t.status==="complete"?"pending":"complete";
  await fetch(`/task/${t.id}`,{method:"PUT",headers,body:JSON.stringify({status:newStatus})});
  loadTasks();
}
async function archiveTask(t){
  if(showArchived){
    await fetch(`/task/${t.id}`,{method:"PUT",headers,body:JSON.stringify({archived:0})});
  } else {
    await fetch(`/task/${t.id}`,{method:"DELETE",headers});
  }
  loadTasks();
}

// Toggle archive view
document.getElementById("toggleArchive").onclick=()=>{
  showArchived=!showArchived;
  document.getElementById("toggleArchive").textContent=showArchived?"Show Active":"Show Archived";
  loadTasks();
};

// Logout
document.getElementById("logoutBtn").onclick=()=>{
  localStorage.removeItem("token");
  window.location="/login.html";
};

// Theme toggle
const themeToggle=document.getElementById("themeToggle");
themeToggle.onclick=()=>{
  if(document.body.classList.contains("light-mode")){
    document.body.classList.replace("light-mode","dark-mode");
    themeToggle.textContent="☀️ Light Mode";
  } else {
    document.body.classList.replace("dark-mode","light-mode");
    themeToggle.textContent="🌙 Dark Mode";
  }
};

loadTasks();
