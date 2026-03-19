// Socket.io connection
const socket = io();

// Get token from localStorage

const token = localStorage.getItem("token");

// STUDENT FUNCTIONS

// Add product to cart
document.querySelectorAll(".add-to-cart").forEach(btn => {
  btn.addEventListener("click", async () => {
    if(!token) return alert("Please login first!");
    const productId = btn.dataset.id;
    const res = await fetch(`/student/cart/add/${productId}`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}` }
    });
    const result = await res.json();
    if(result.success) alert("Added to cart!");
  });
});

// Update cart quantity
document.querySelectorAll(".quantity-input").forEach(input => {
  input.addEventListener("change", async () => {
    if(!token) return alert("Please login first!");
    const res = await fetch(`/student/cart/update/${input.dataset.id}`, {
      method: "POST",
      headers: { 
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ quantity: input.value })
    });
    const result = await res.json();
    if(result.success) console.log("Quantity updated");
  });
});

// Checkout cart
const checkoutBtn = document.getElementById("checkoutBtn");
if(checkoutBtn){
  checkoutBtn.addEventListener("click", async () => {
    if(!token) return alert("Please login first!");
    const res = await fetch("/student/cart/checkout", {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}` }
    });
    const result = await res.json();
    if(result.success){
      alert(result.message);
      window.location.reload();
      // Notify admin
      socket.emit("newOrder"); 
    }
  });
}

// Receive real-time "order ready" notifications
socket.on("orderReady", data => {
  alert(`Your order is ready! Order ID: ${data.orderId}`);
});

// ==========================
// ADMIN FUNCTIONS
// ==========================

// Update order status
document.querySelectorAll(".status-select").forEach(select => {
  select.addEventListener("change", async () => {
    if(!token) return alert("Please login first!");
    const res = await fetch(`/admin/orders/status/${select.dataset.id}`, {
      method: "POST",
      headers: { 
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ status: select.value })
    });
    const result = await res.json();
    if(result.success){
      document.getElementById("status-"+select.dataset.id).innerText = select.value;
      alert("Status updated!");
      // If order ready, notify student
      if(select.value === "Ready") socket.emit("orderReady", { orderId: select.dataset.id });
    }
  });
});

// Listen for new orders (live)
socket.on("newOrder", data => {
  alert(`New order received! Order ID: ${data.orderId}`);
  // Optionally: refresh the admin orders table dynamically
});
