let transactions = JSON.parse(localStorage.getItem("transactions")) || [];

function updateLocalStorage(){
localStorage.setItem("transactions", JSON.stringify(transactions));
}

function addTransaction(){

const text = document.getElementById("text").value;
const amount = Number(document.getElementById("amount").value);

if(text === "" || amount === ""){
alert("Please enter details");
return;
}

const transaction = {
id: Date.now(),
text: text,
amount: amount
};

transactions.push(transaction);

updateLocalStorage();
showTransactions();

document.getElementById("text").value="";
document.getElementById("amount").value="";
}

function showTransactions(){

const list = document.getElementById("list");
list.innerHTML="";

let income = 0;
let expense = 0;

transactions.forEach(t => {

const li = document.createElement("li");

li.innerHTML = `
${t.text}
<span>₹${t.amount}</span>
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

showTransactions();