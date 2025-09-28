const form = document.getElementById("loginForm");
const msg = document.getElementById("msg");
const registerBtn = document.getElementById("registerBtn");

form.addEventListener("submit", async e => {
  e.preventDefault();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  try {
    const res = await fetch("/login", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({email,password})
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    localStorage.setItem("token", data.token);
    window.location = "/index.html";
  } catch(err) {
    msg.innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
  }
});

registerBtn.addEventListener("click", async ()=>{
  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  try {
    const res = await fetch("/register",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({name,email,password})
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    msg.innerHTML = `<div class="alert alert-success">Registered! Please login.</div>`;
  } catch(err){
    msg.innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
  }
});
