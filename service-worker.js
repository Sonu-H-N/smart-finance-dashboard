<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Smart Finance Dashboard</title>
<link rel="stylesheet" href="style.css">
</head>

<body>

<header>
<h1>💰 Smart Finance Dashboard</h1>
</header>

<div class="container">

<div class="balance-card">
<h2>Your Balance</h2>
<h1 id="balance">₹0</h1>
</div>

<div class="summary">

<div class="income">
<h3>Income</h3>
<p id="income">₹0</p>
</div>

<div class="expense">
<h3>Expense</h3>
<p id="expense">₹0</p>
</div>

</div>

<div class="transaction-form">

<h3>Add Transaction</h3>

<input type="text" id="text" placeholder="Enter description">

<input type="number" id="amount" placeholder="Enter amount">

<button onclick="addTransaction()">Add Transaction</button>

</div>

<div class="history">

<h3>Transaction History</h3>

<ul id="list"></ul>

</div>

</div>

<script src="script.js"></script>

</body>
</html>