let chart;
function deleteTransaction(id){
transactions = transactions.filter(t => t.id !== id);
updateLocalStorage();
showTransactions();
}
const category = document.getElementById("category").value;

const transaction = {
id: Date.now(),
text: text,
amount: amount,
category: category
};

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

lli.innerHTML = `
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
function analyzeSpending(){

let categories = {};

transactions.forEach(t => {
if(t.amount < 0){
categories[t.category] = (categories[t.category] || 0) + Math.abs(t.amount);
}
});

let message = "Good job 👍";

let maxCategory = "";
let maxAmount = 0;

for(let cat in categories){
if(categories[cat] > maxAmount){
maxAmount = categories[cat];
maxCategory = cat;
}
}

if(maxCategory){
message = "⚠️ You spend most on " + maxCategory;
}

document.getElementById("analysis").innerText = message;
}
analyzeSpending();
async function getAIAdvice(){

const analysisText = transactions.map(t => 
`${t.category}: ₹${t.amount}`
).join(", ");

const response = await fetch("https://api.openai.com/v1/chat/completions", {
method: "POST",
headers: {
"Content-Type": "application/json",
"Authorization": "Bearer YOUR_API_KEY"
},
body: JSON.stringify({
model: "gpt-4o-mini",
messages: [
{
role: "user",
content: `Analyze my expenses: ${analysisText} and give financial advice`
}
]
})
});

const data = await response.json();

document.getElementById("analysis").innerText =
data.choices[0].message.content;

}
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