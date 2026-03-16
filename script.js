let balance = 0;
let income = 0;
let expense = 0;

function addTransaction(){

const text = document.getElementById("text").value;
const amount = Number(document.getElementById("amount").value);

const list = document.getElementById("list");

const li = document.createElement("li");

li.innerHTML = text + " <span>₹" + amount + "</span>";

list.appendChild(li);

if(amount > 0){
income += amount;
}else{
expense += amount;
}

balance = income + expense;

document.getElementById("income").innerText = "₹" + income;
document.getElementById("expense").innerText = "₹" + Math.abs(expense);
document.getElementById("balance").innerText = "₹" + balance;

document.getElementById("text").value="";
document.getElementById("amount").value="";
}