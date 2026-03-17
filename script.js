let chart;
function deleteTransaction(id){
transactions = transactions.filter(t => t.id !== id);
updateLocalStorage();
showTransactions();
}

function showTransactions(){

const list = document.getElementById("list");
list.innerHTML="";

let income = 0;
let expense = 0;

transactions.forEach(t => {

const li = document.createElement("li");

li.classList.add(t.amount > 0 ? "plus" : "minus");

li.innerHTML = `
${t.text}
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
}

const balance = income + expense;

document.getElementById("income").innerText = "₹" + income;
document.getElementById("expense").innerText = "₹" + Math.abs(expense);
document.getElementById("balance").innerText = "₹" + balance;

function deleteTransaction(id){
transactions = transactions.filter(t => t.id !== id);
updateLocalStorage();
showTransactions();
}

function showTransactions(){

const list = document.getElementById("list");
list.innerHTML="";

let income = 0;
let expense = 0;

transactions.forEach(t => {

const li = document.createElement("li");

li.classList.add(t.amount > 0 ? "plus" : "minus");

li.innerHTML = `
${t.text}
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

}function deleteTransaction(id){
transactions = transactions.filter(t => t.id !== id);
updateLocalStorage();
showTransactions();
}

function showTransactions(){

const list = document.getElementById("list");
list.innerHTML="";

let income = 0;
let expense = 0;

transactions.forEach(t => {

const li = document.createElement("li");

li.classList.add(t.amount > 0 ? "plus" : "minus");

li.innerHTML = `
${t.text}
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

}
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