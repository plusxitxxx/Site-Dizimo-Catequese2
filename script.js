/* -------------------
   Util functions
   ------------------- */
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));
const id = () => Math.random().toString(36).slice(2,10);
const nowISO = () => new Date().toISOString();

function formatCurrency(v){
  return v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
}

/* -------------------
   Storage
   ------------------- */
const storage = {
  loadUsers: ()=> JSON.parse(localStorage.getItem('users')||'[]'),
  saveUsers: (u)=> localStorage.setItem('users', JSON.stringify(u)),
  loadDonations: ()=> JSON.parse(localStorage.getItem('donations')||'[]'),
  saveDonations: (d)=> localStorage.setItem('donations', JSON.stringify(d)),
  setCurrent: (u)=> localStorage.setItem('current', JSON.stringify(u)),
  getCurrent: ()=> JSON.parse(localStorage.getItem('current')||'null'),
  clearCurrent: ()=> localStorage.removeItem('current')
};

/* -------------------
   Auth
   ------------------- */
const loginForm = $('#loginForm');
const regForm = $('#regForm');
const authView = $('#authView');
const donateView = $('#donateView');
const adminView = $('#adminView');
const userBadge = $('#userBadge');
const btnLogout = $('#btnLogout');

function show(view){
  [authView, donateView, adminView].forEach(v=>v.style.display='none');
  view.style.display='block';
}

function updateUI(){
  const cur = storage.getCurrent();
  if(cur){
    userBadge.innerText = `👤 ${cur.user}`;
    btnLogout.style.display='inline-block';
    if(cur.user==='admin'){
      show(adminView); renderAdmin();
    } else {
      show(donateView); renderSummary(); renderMyDonations();
    }
  } else {
    userBadge.innerText = '';
    btnLogout.style.display='none';
    show(authView);
  }
}

// Login
$('#btnLogin').addEventListener('click',()=>{
  const u = $('#loginUser').value.trim();
  const p = $('#loginPass').value.trim();
  const users = storage.loadUsers();
  const f = users.find(x=>x.user===u && x.pass===btoa(p));
  if(f){
    storage.setCurrent(f);
    updateUI();
  } else {
    alert('Usuário ou senha inválidos.');
  }
});

// Register
$('#btnRegister').addEventListener('click',()=>{
  const u = $('#regUser').value.trim();
  const p = $('#regPass').value.trim();
  if(!u||!p){ alert('Preencha os campos.'); return; }
  const users = storage.loadUsers();
  if(users.some(x=>x.user===u)){ alert('Usuário já existe.'); return; }
  const newU = {id:id(),user:u,pass:btoa(p)};
  users.push(newU);
  storage.saveUsers(users);
  alert('Registrado com sucesso. Faça login.');
});

// Logout
btnLogout.addEventListener('click',()=>{
  storage.clearCurrent();
  updateUI();
});

/* -------------------
   Donation form
   ------------------- */
const donorName = $('#donorName');
const donorEmail = $('#donorEmail');
const donAmount = $('#donAmount');
const bankSelect = $('#bankSelect');
const methodSelect = $('#methodSelect');
const donMessage = $('#donMessage');
const btnGenerate = $('#btnGenerate');
const paymentDetails = $('#paymentDetails');
const statusMsg = $('#statusMsg');

/* -------------------
   Donation generation
   ------------------- */
btnGenerate.addEventListener('click', ()=> {
  const name = donorName.value.trim() || 'Anônimo';
  const amount = parseFloat(donAmount.value);
  if(!amount || amount<=0){ alert('Informe um valor válido.'); return; }
  const bank = bankSelect.value;
  const method = methodSelect.value;
  const cur = storage.getCurrent();
  const username = cur ? cur.user : 'guest';

  const donation = {
    id: id(), user: username, name, email:donorEmail.value.trim(), amount: +amount.toFixed(2),
    bank, method, message:donMessage.value.trim(), status:'pending', date: nowISO()
  };

  // 🔑 PIX fixo pelo CNPJ
  if(method==='pix'){
    const pixKey = "81.588.873/0003-20"; // CNPJ fixo
    donation.pixKey = pixKey;
    donation.pixPayload = generatePixPayload({
      key: pixKey,
      amount: donation.amount,
      name: donation.name,
      city: 'Cidade'
    });
  }

  const donations = storage.loadDonations();
  donations.unshift(donation);
  storage.saveDonations(donations);

  renderSummary();
  renderMyDonations();
  showPaymentInstructions(donation);

  statusMsg.innerText = 'Pronto — instruções geradas.';
  setTimeout(()=>statusMsg.innerText='', 3500);
});

/* -------------------
   PIX Payload
   ------------------- */
function generatePixPayload({key, amount, name, city}){
  const txid = id();
  return `00020126580014BR.GOV.BCB.PIX01${key.length.toString().padStart(2,'0')}${key}520400005303986540${amount.toFixed(2).replace('.','')}5802BR5910${name.slice(0,10)}600${city.length}${city}62070503${txid}6304`;
}

/* -------------------
   Show payment instructions
   ------------------- */
function showPaymentInstructions(d){
  paymentDetails.innerHTML='';
  if(d.method==='pix'){
    const qr = `https://chart.googleapis.com/chart?cht=qr&chs=300x300&chl=${encodeURIComponent(d.pixPayload)}`;
    paymentDetails.innerHTML = `<div class="qr">
      <img src="${qr}" alt="QR">
      <div>
        <p><strong>Chave PIX (CNPJ):</strong><br><span class="kbd">${d.pixKey}</span></p>
        <p><strong>Valor:</strong> ${formatCurrency(d.amount)}</p>
      </div>
    </div>`;
  } else {
    paymentDetails.innerHTML = `<p class="notice">Método ${d.method} selecionado.<br>Banco: ${d.bank}.<br>Valor: ${formatCurrency(d.amount)}</p>`;
  }
}

/* -------------------
   My donations
   ------------------- */
const myList = $('#myList');
function renderMyDonations(){
  const cur = storage.getCurrent();
  if(!cur || cur.user==='admin'){ myList.innerHTML=''; return; }
  const donations = storage.loadDonations().filter(x=>x.user===cur.user);
  if(!donations.length){ myList.innerHTML='<p class="muted">Nenhuma contribuição registrada.</p>'; return; }
  myList.innerHTML = `<table><tr><th>Data</th><th>Valor</th><th>Status</th></tr>` +
    donations.map(x=>`<tr><td>${x.date.slice(0,10)}</td><td>${formatCurrency(x.amount)}</td><td>${x.status}</td></tr>`).join('')+
    `</table>`;
}

/* -------------------
   Summary
   ------------------- */
const summaryBox = $('#summaryBox');
function renderSummary(){
  const cur = storage.getCurrent();
  if(!cur || cur.user==='admin'){ summaryBox.innerHTML=''; return; }
  const donations = storage.loadDonations().filter(x=>x.user===cur.user);
  const total = donations.reduce((a,b)=>a+b.amount,0);
  summaryBox.innerHTML = `<p>Total ofertado: <strong>${formatCurrency(total)}</strong></p>
    <p>Última oferta: ${donations[0]?formatCurrency(donations[0].amount):'-'}</p>`;
}

/* -------------------
   Admin
   ------------------- */
const adminList = $('#adminList');
function renderAdmin(){
  const donations = storage.loadDonations();
  if(!donations.length){ adminList.innerHTML='<p class="muted">Nenhuma contribuição ainda.</p>'; return; }
  adminList.innerHTML = `<table><tr><th>Usuário</th><th>Nome</th><th>Valor</th><th>Método</th><th>Status</th><th>Ação</th></tr>` +
    donations.map(x=>`<tr>
      <td>${x.user}</td><td>${x.name}</td><td>${formatCurrency(x.amount)}</td>
      <td>${x.method}</td><td>${x.status}</td>
      <td><button class="btn small" onclick="confirmDonation('${x.id}')">Confirmar</button></td>
    </tr>`).join('')+
    `</table>`;
}

function confirmDonation(id){
  const donations = storage.loadDonations();
  const f = donations.find(x=>x.id===id);
  if(f){ f.status='confirmed'; storage.saveDonations(donations); renderAdmin(); }
}

/* -------------------
   Init
   ------------------- */
(function init(){
  let users = storage.loadUsers();
  if(!users.some(x=>x.user==='admin')){
    users.push({id:id(),user:'admin',pass:btoa('admin123')});
    storage.saveUsers(users);
  }
  updateUI();
})();
