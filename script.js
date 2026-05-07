let transactions = JSON.parse(localStorage.getItem("transactions")) || [];
let chart;

// Protect page
if(localStorage.getItem("loggedIn") !== "true"){
window.location.href = "login.html";
}

// ADD TRANSACTION
function addTransaction(){

const text = document.getElementById("text").value;
const amount = Number(document.getElementById("amount").value);
const category = document.getElementById("category").value;

if(text === "" || amount === ""){
alert("Enter details");
return;
}

const transaction = {
id: Date.now(),
text,
amount,
category
};

transactions.push(transaction);
updateLocalStorage();
showTransactions();

document.getElementById("text").value="";
document.getElementById("amount").value="";
}

// DELETE
function deleteTransaction(id){
transactions = transactions.filter(t => t.id !== id);
updateLocalStorage();
showTransactions();
}

// LOCAL STORAGE
function updateLocalStorage(){
localStorage.setItem("transactions", JSON.stringify(transactions));
}

// SHOW
function showTransactions(){

const list = document.getElementById("list");
list.innerHTML="";

let income = 0;
let expense = 0;

transactions.forEach(t => {

const li = document.createElement("li");
li.classList.add(t.amount > 0 ? "plus" : "minus");

li.innerHTML = `
${t.text} (${t.category})
<span>₹${t.amount}</span>
<button onclick="deleteTransaction(${t.id})">❌</button>
`;

list.appendChild(li);

if(t.amount > 0){
income += t.amount;
}else{
expense += t.amount;
}

});

const balance = income + expense;

document.getElementById("income").innerText = "₹" + income;
document.getElementById("expense").innerText = "₹" + Math.abs(expense);
document.getElementById("balance").innerText = "₹" + balance;

updateChart(income, Math.abs(expense));
analyzeSpending();
}

// CHART
function updateChart(income, expense){
const ctx = document.getElementById("financeChart").getContext("2d");

if(chart){
chart.destroy();
}

chart = new Chart(ctx, {
type: "pie",
data: {
labels: ["Income", "Expense"],
datasets: [{
data: [income, expense],
backgroundColor: ["#22c55e", "#ef4444"]
}]
}
});
}

// AI ANALYSIS
function analyzeSpending(){

let categories = {};

transactions.forEach(t => {
if(t.amount < 0){
categories[t.category] = (categories[t.category] || 0) + Math.abs(t.amount);
}
});

let maxCategory = "";
let maxAmount = 0;

for(let cat in categories){
if(categories[cat] > maxAmount){
maxAmount = categories[cat];
maxCategory = cat;
}
}

document.getElementById("analysis").innerText =
maxCategory ? "⚠️ You spend most on " + maxCategory : "Good job 👍";
}

// THEME (run after load)
window.onload = function(){

const toggleBtn = document.getElementById("themeToggle");

toggleBtn.addEventListener("click", () => {

document.body.classList.toggle("light");

if(document.body.classList.contains("light")){
toggleBtn.innerText = "☀️";
localStorage.setItem("theme", "light");
}else{
toggleBtn.innerText = "🌙";
localStorage.setItem("theme", "dark");
}

});

// Load saved theme
if(localStorage.getItem("theme") === "light"){
document.body.classList.add("light");
toggleBtn.innerText = "☀️";
}

showTransactions();
};

// LOGOUT
function logout(){
localStorage.removeItem("loggedIn");
window.location.href = "login.html";
}

// PDF
async function downloadPDF(){

const { jsPDF } = window.jspdf;
const doc = new jsPDF();

let y = 10;

doc.text("Smart Finance Report", 20, y);
y += 10;

let income = 0;
let expense = 0;

transactions.forEach(t => {
if(t.amount > 0) income += t.amount;
else expense += t.amount;
});

const balance = income + expense;

doc.text(`Balance: ₹${balance}`, 20, y); y+=10;
doc.text(`Income: ₹${income}`, 20, y); y+=10;
doc.text(`Expense: ₹${Math.abs(expense)}`, 20, y); y+=10;

transactions.forEach(t => {
doc.text(`${t.text} (${t.category}) ₹${t.amount}`, 20, y);
y+=8;
});

doc.save("Finance_Report.pdf");
}
import Dashboard from "./pages/Dashboard";

function App() {
  return (
    <div>
      <Dashboard />
    </div>
  );
}

export default App;
import { useState } from "react";

function Dashboard() {

const [transactions, setTransactions] = useState([]);

const addTransaction = () => {
  alert("Transaction Added");
};

return (
<div>

<h1>💰 Smart Finance Dashboard</h1>

<input type="text" placeholder="Description" />
<input type="number" placeholder="Amount" />

<button onClick={addTransaction}>
Add Transaction
</button>

</div>
);

}

export default Dashboard;