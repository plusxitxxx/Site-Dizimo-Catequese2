/* -------------------
   Utilitários
   ------------------- */
const storage = {
  usersKey: 'of_users_v1',
  donationsKey: 'of_donations_v1',
  currentKey: 'of_current_v1',
  loadUsers(){ return JSON.parse(localStorage.getItem(this.usersKey)||'[]') },
  saveUsers(u){ localStorage.setItem(this.usersKey, JSON.stringify(u||[])) },
  loadDonations(){ return JSON.parse(localStorage.getItem(this.donationsKey)||'[]') },
  saveDonations(d){ localStorage.setItem(this.donationsKey, JSON.stringify(d||[])) },
  setCurrent(u){ localStorage.setItem(this.currentKey, JSON.stringify(u||null)) },
  getCurrent(){ return JSON.parse(localStorage.getItem(this.currentKey)||'null') }
};

function id(){ return 'd_' + Math.random().toString(36).slice(2,10) }
function fmtBRL(v){ return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}) }
function nowISO(){ return new Date().toISOString() }
function shortDate(iso){ const d=new Date(iso); return d.toLocaleString('pt-BR') }

/* -------------------
   Inicialização: criar admin demo se necessário
   ------------------- */
(function init(){
  let users = storage.loadUsers();
  // default admin
  if(!users.find(u=>u.user==='admin')){
    users.push({user:'admin', pass:btoa('admin123'), isAdmin:true, email:'admin@local'});
    storage.saveUsers(users);
  }
  renderUI();
  renderSummary();
})();

/* -------------------
   UI elementos
   ------------------- */
const btnLogin = document.getElementById('btnLogin');
const authPanel = document.getElementById('authPanel');
const actionAuth = document.getElementById('actionAuth');
const toggleRegister = document.getElementById('toggleRegister');
const authTitle = document.getElementById('authTitle');
const authUser = document.getElementById('authUser');
const authPass = document.getElementById('authPass');
const greeting = document.getElementById('greeting');
const adminLink = document.getElementById('adminLink');
const adminSection = document.getElementById('admin');

btnLogin.addEventListener('click', ()=> {
  // open/close auth
  authPanel.style.display = authPanel.style.display === 'none' ? 'block' : 'none';
  authTitle.innerText = 'Entrar';
  actionAuth.innerText = 'Entrar';
});
let isRegisterMode = false;
toggleRegister.addEventListener('click', ()=> {
  isRegisterMode = !isRegisterMode;
  authTitle.innerText = isRegisterMode ? 'Registrar' : 'Entrar';
  actionAuth.innerText = isRegisterMode ? 'Registrar' : 'Entrar';
});

/* Auth actions */
actionAuth.addEventListener('click', ()=>{
  const u = authUser.value.trim();
  const p = authPass.value;
  if(!u || !p){ alert('Preencha usuário e senha.'); return; }
  let users = storage.loadUsers();
  if(isRegisterMode){
    if(users.find(x=>x.user===u)){ alert('Usuário já existe.'); return; }
    users.push({user:u, pass:btoa(p), isAdmin:false, email:''});
    storage.saveUsers(users);
    alert('Registrado com sucesso. Faça login.');
    isRegisterMode=false; authTitle.innerText='Entrar'; actionAuth.innerText='Entrar';
    authUser.value=''; authPass.value='';
    return;
  } else {
    const found = users.find(x=>x.user===u && x.pass===btoa(p));
    if(!found){ alert('Credenciais inválidas.'); return; }
    storage.setCurrent({user:found.user, isAdmin:!!found.isAdmin, email:found.email||''});
    authPanel.style.display='none';
    authUser.value=''; authPass.value='';
    renderUI();
    renderMyDonations();
  }
});

function logout(){
  storage.setCurrent(null);
  renderUI();
}

/* render UI header */
function renderUI(){
  const cur = storage.getCurrent();
  if(cur){
    greeting.innerText = `Olá, ${cur.user}`;
    btnLogin.innerText = 'Sair';
    btnLogin.onclick = ()=> logout();
    document.getElementById('greeting').style.color = '#0b74d1';
    if(cur.isAdmin){ adminLink.style.display='inline-block'; adminSection.style.display='block' } else { adminLink.style.display='none' }
  } else {
    greeting.innerText = 'Olá, visitante';
    btnLogin.innerText = 'Entrar / Registrar';
    btnLogin.onclick = ()=> { authPanel.style.display = authPanel.style.display === 'none' ? 'block' : 'none' };
    adminLink.style.display='none';
    adminSection.style.display='none';
  }
}

/* -------------------
   Donation generation
   ------------------- */
const btnGenerate = document.getElementById('btnGenerate');
const btnClear = document.getElementById('btnClear');
const paymentCard = document.getElementById('paymentCard');
const paymentArea = document.getElementById('paymentArea');
const donorName = document.getElementById('donorName');
const donorEmail = document.getElementById('donorEmail');
const donAmount = document.getElementById('donAmount');
const bankSelect = document.getElementById('bankSelect');
const methodSelect = document.getElementById('methodSelect');
const donMessage = document.getElementById('donMessage');
const statusMsg = document.getElementById('statusMsg');

btnClear.addEventListener('click', ()=> {
  donorName.value=''; donorEmail.value=''; donAmount.value=''; donMessage.value='';
  paymentCard.style.display='none'; paymentArea.innerHTML='';
});
btnGenerate.addEventListener('click', ()=> {
  // validate
  const name = donorName.value.trim() || 'Anônimo';
  const amount = parseFloat(donAmount.value);
  if(!amount || amount<=0){ alert('Informe um valor válido.'); return; }
  const bank = bankSelect.value;
  const method = methodSelect.value;
  // user
  const cur = storage.getCurrent();
  const username = cur ? cur.user : 'guest';
  // create donation object (status pending)
  const donation = {
    id: id(), user: username, name, email:donorEmail.value.trim(), amount: +amount.toFixed(2),
    bank, method, message:donMessage.value.trim(), status:'pending', date: nowISO()
  };
  // If method is pix: create pix key & payload
  if(method==='pix'){
    const pixKey = `${bank.toLowerCase()}-${Math.random().toString(36).slice(2,10)}@exemplo`;
    donation.pixKey = pixKey;
    donation.pixPayload = generatePixPayload({key:pixKey, amount:donation.amount, name:donation.name, city:'Cidade'});
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

/* PIX payload generator */
function generatePixPayload({key, amount, name, city}){
  return `PIX|chave:${key}|valor:${amount.toFixed(2)}|nome:${name}|cidade:${city}`;
}

/* show payment area UI */
function showPaymentInstructions(d){
  paymentArea.innerHTML = '';
  paymentCard.style.display='block';
  const wrap = document.createElement('div');

  wrap.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
      <div>
        <div style="font-weight:800;font-size:1.05rem">${escapeHtml(d.name)}</div>
        <div class="muted">${shortDate(d.date)}</div>
        <div style="margin-top:8px">${escapeHtml(d.message||'')}</div>
      </div>
      <div style="text-align:right">
        <div style="color:var(--muted)">Valor</div>
        <div style="font-size:1.25rem;font-weight:800">${fmtBRL(d.amount)}</div>
        <div style="margin-top:6px" class="muted">${d.bank} · ${d.method.toUpperCase()}</div>
      </div>
    </div>
    <hr style="margin:12px 0;border:none;border-top:1px dashed #eef4ff">
  `;

  const block = document.createElement('div');

  if(d.method==='pix'){
    const payload = encodeURIComponent(d.pixPayload);
    const qrSrc = `https://chart.googleapis.com/chart?cht=qr&chs=300x300&chl=${payload}`;
    block.innerHTML = `
      <div style="display:flex;gap:12px;align-items:center">
        <div class="qr">
          <img src="${qrSrc}" alt="QR Code PIX">
        </div>
        <div style="flex:1">
          <div style="margin-bottom:8px"><strong>Chave PIX:</strong> <span class="kbd">${escapeHtml(d.pixKey)}</span></div>
          <div style="margin-bottom:6px"><strong>Valor:</strong> ${fmtBRL(d.amount)}</div>
          <div style="margin-bottom:6px"><strong>Payload (cópia):</strong><div style="margin-top:6px;padding:8px;background:#fbfdff;border-radius:8px;border:1px solid #eef6ff;font-family:monospace">${escapeHtml(d.pixPayload)}</div></div>
          <div style="display:flex;gap:8px;margin-top:8px">
            <button class="btn" id="btnCopyPix">Copiar PIX</button>
            <button class="btn secondary" id="btnPrintReceipt">Imprimir Recibo</button>
            <button class="btn small" id="btnWhats">Enviar WhatsApp</button>
            <button class="btn small" id="btnMail">Enviar Email</button>
          </div>
        </div>
      </div>
    `;
  } else {
    const acc = getBankDemoInfo(d.bank);
    block.innerHTML = `
      <div>
        <div style="margin-bottom:8px"><strong>Instruções de Transferência</strong></div>
        <div style="margin-bottom:6px">Banco: <strong>${acc.bank}</strong></div>
        <div style="margin-bottom:6px">Agência: <strong>${acc.agency}</strong> — Conta: <strong>${acc.account}</strong></div>
        <div style="margin-bottom:6px">Titular: <strong>${acc.holder}</strong></div>
        <div style="margin-top:8px"><strong>Valor:</strong> ${fmtBRL(d.amount)}</div>
        <div style="display:flex;gap:8px;margin-top:8px">
          <button class="btn" id="btnPrintReceipt">Imprimir Recibo</button>
          <button class="btn small" id="btnWhats">Enviar WhatsApp</button>
          <button class="btn small" id="btnMail">Enviar Email</button>
        </div>
      </div>
    `;
  }

  paymentArea.appendChild(wrap);
  paymentArea.appendChild(block);

  document.getElementById('btnPrintReceipt').addEventListener('click', ()=> { openReceiptWindow(d); });
  document.getElementById('btnWhats').addEventListener('click', ()=> { sendWhatsApp(d); });
  document.getElementById('btnMail').addEventListener('click', ()=> { sendEmail(d); });
  const btnCopy = document.getElementById('btnCopyPix');
  if(btnCopy){
    btnCopy.addEventListener('click', ()=> {
      navigator.clipboard.writeText(d.pixPayload).then(()=> alert('PIX copiado para área de transferência!'));
    });
  }
}

/* bank demo info */
function getBankDemoInfo(bank){
  const demo = {
    'Sicoob': {bank:'Sicoob', agency:'1234', account:'12345-6', holder:'Igreja Exemplo'},
    'Sicredi': {bank:'Sicredi', agency:'1111', account:'98765-4', holder:'Igreja Exemplo'},
    'Nubank': {bank:'Nubank', agency:'0001', account:'77777-8', holder:'Igreja Exemplo'},
    'Inter': {bank:'Inter', agency:'9999', account:'22222-3', holder:'Igreja Exemplo'},
    'PIX': {bank:'PIX', agency:'-', account:'-', holder:'Igreja Exemplo'}
  };
  return demo[bank] || demo['PIX'];
}

/* -------------------
   My donations list render
   ------------------- */
function renderMyDonations(){
  const cur = storage.getCurrent();
  const user = cur ? cur.user : 'guest';
  const all = storage.loadDonations();
  const mine = all.filter(d => d.user===user);
  const area = document.getElementById('myListArea');
  area.innerHTML = '';
  if(mine.length===0){
    area.innerHTML = '<div class="muted">Ainda não há ofertas realizadas por você aqui.</div>';
    return;
  }
  const tbl = document.createElement('table');
  tbl.innerHTML = '<thead><tr><th>Data</th><th>Nome</th><th>Valor</th><th>Status</th><th></th></tr></thead>';
  const tb = document.createElement('tbody');
  mine.forEach(d=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${shortDate(d.date)}</td><td>${escapeHtml(d.name)}</td><td>${fmtBRL(d.amount)}</td><td>${d.status}</td>
      <td style="text-align:right"><button class="btn small" data-id="${d.id}">Recibo</button></td>`;
    tb.appendChild(tr);
  });
  tbl.appendChild(tb);
  area.appendChild(tbl);
  area.querySelectorAll('button[data-id]').forEach(b=>{
    b.addEventListener('click', ()=> {
      const idd = b.getAttribute('data-id');
      const donation = storage.loadDonations().find(x=>x.id===idd);
      openReceiptWindow(donation);
    });
  });
}

/* -------------------
   Receipt window (printable)
   ------------------- */
function openReceiptWindow(d){
  const w = window.open('','_blank','width=800,height=700');
  const html = `
    <html>
    <head>
      <meta charset="utf-8">
      <title>Recibo — ${escapeHtml(d.name)}</title>
      <style>
        body{font-family:Inter,Arial,sans-serif;padding:28px;color:#111}
        .box{max-width:680px;margin:0 auto;border:1px solid #e8eefc;padding:20px;border-radius:12px}
        h2{color:var(--primary, #0b74d1)}
        .row{display:flex;justify-content:space-between;margin:10px 0}
        .muted{color:#6b7280}
        .big{font-weight:800;font-size:1.2rem}
        footer{margin-top:18px;font-size:0.9rem;color:#6b7280}
      </style>
    </head>
    <body>
      <div class="box">
        <h2>Recibo de Oferta / Dízimo</h2>
        <div class="muted">ID: ${d.id}</div>
        <div class="row"><div>Nome:</div><div class="big">${escapeHtml(d.name)}</div></div>
        <div class="row"><div>Valor:</div><div class="big">${fmtBRL(d.amount)}</div></div>
        <div class="row"><div>Método:</div><div>${d.method.toUpperCase()} — ${escapeHtml(d.bank)}</div></div>
        <div class="row"><div>Data:</div><div>${shortDate(d.date)}</div></div>
        <div style="margin-top:12px"><strong>Mensagem:</strong><div style="margin-top:6px">${escapeHtml(d.message||'')}</div></div>
        <footer>Gerado em ${shortDate(new Date().toISOString())} — Este recibo é gerado localmente no navegador.</footer>
      </div>
      <script>window.print()</script>
    </body>
    </html>
  `;
  w.document.write(html);
  w.document.close();
}

/* -------------------
   WhatsApp / Email quick links
   ------------------- */
function sendWhatsApp(d){
  const phone = ''; 
  const text = `Olá.%0AQuero avisar que realizei uma oferta.%0ANome: ${encodeURIComponent(d.name)}%0AValor: ${encodeURIComponent(fmtBRL(d.amount))}%0AData: ${encodeURIComponent(shortDate(d.date))}%0AMensagem: ${encodeURIComponent(d.message||'')}`;
  const url = `https://api.whatsapp.com/send?phone=${phone}&text=${text}`;
  window.open(url,'_blank');
}
function sendEmail(d){
  const subject = encodeURIComponent('Confirmação de Oferta');
  const body = encodeURIComponent(`Olá,\n\nRealizei uma oferta.\n\nNome: ${d.name}\nValor: ${fmtBRL(d.amount)}\nData: ${shortDate(d.date)}\nMensagem: ${d.message||''}\n\nAtenciosamente.`);
  window.open(`mailto:${d.email||''}?subject=${subject}&body=${body}`);
}

/* -------------------
   Admin Panel
   ------------------- */
document.getElementById('btnFilter').addEventListener('click', applyAdminFilters);
document.getElementById('btnClearFilter').addEventListener('click', ()=> {
  document.getElementById('fName').value=''; document.getElementById('fBank').value=''; document.getElementById('fDateFrom').value=''; document.getElementById('fDateTo').value=''; document.getElementById('fStatus').value='';
  applyAdminFilters();
});
document.getElementById('btnExport').addEventListener('click', exportCSV);

function applyAdminFilters(){
  const all = storage.loadDonations();
  let res = all.slice();
  const name = (document.getElementById('fName').value||'').toLowerCase();
  const bank = document.getElementById('fBank').value;
  const df = document.getElementById('fDateFrom').value;
  const dt = document.getElementById('fDateTo').value;
  const status = document.getElementById('fStatus').value;

  if(name) res = res.filter(r=>r.name.toLowerCase().includes(name));
  if(bank) res = res.filter(r=>r.bank===bank);
  if(status) res = res.filter(r=>r.status===status);
  if(df) res = res.filter(r=> new Date(r.date) >= new Date(df+'T00:00:00'));
  if(dt) res = res.filter(r=> new Date(r.date) <= new Date(dt+'T23:59:59'));

  renderAdminTable(res);
}

function renderAdminTable(list){
  const tbody = document.querySelector('#adminTable tbody');
  tbody.innerHTML = '';
  list.forEach(d=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${shortDate(d.date)}</td>
      <td>${escapeHtml(d.name)}</td>
      <td>${fmtBRL(d.amount)}</td>
      <td>${escapeHtml(d.bank)}</td>
      <td>${escapeHtml(d.method)}</td>
      <td>${d.status}</td>
      <td style="text-align:right">
        <button class="btn small" data-id="${d.id}">Recibo</button>
        <button class="btn small secondary" data-act="confirm" data-id="${d.id}">Confirmar</button>
      </td>`;
    tbody.appendChild(tr);
  });
  tbody.querySelectorAll('button[data-id]').forEach(b=>{
    b.addEventListener('click', (ev)=>{
      const idd = b.getAttribute('data-id');
      const act = b.getAttribute('data-act');
      const donation = storage.loadDonations().find(x=>x.id===idd);
      if(act==='confirm'){
        confirmDonation(idd);
      } else {
        openReceiptWindow(donation);
      }
    });
  });
}

/* confirm donation: admin action */
function confirmDonation(idd){
  const cur = storage.getCurrent();
  if(!cur || !cur.isAdmin){ alert('Apenas admin pode confirmar.'); return; }
  let donations = storage.loadDonations();
  const idx = donations.findIndex(x=>x.id===idd);
  if(idx===-1) return;
  donations[idx].status = 'confirmed';
  storage.saveDonations(donations);
  applyAdminFilters();
  renderSummary();
  alert('Doação confirmada.');
}

/* export CSV */
function exportCSV(){
  const data = storage.loadDonations();
  if(!data.length){ alert('Sem dados para exportar.'); return; }
  const header = ['id','date','user','name','email','amount','bank','method','status','message'];
  const rows = data.map(r=> header.map(h=> {
    let v = r[h]===undefined ? '' : String(r[h]);
    return `"${v.replace(/"/g,'""')}"`;
  }).join(','));
  const csv = [header.join(','), ...rows].join('\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download = `ofertas_export_${new Date().toISOString().slice(0,10)}.csv`; a.click();
  URL.revokeObjectURL(url);
}

/* -------------------
   Summary
   ------------------- */
function renderSummary(){
  const all = storage.loadDonations();
  document.getElementById('totalCount').innerText = all.length;
  const total = all.reduce((s,x)=>s + (Number(x.amount)||0),0);
  document.getElementById('totalAmount').innerText = Number(total).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const lastFive = all.slice(0,5);
  const container = document.getElementById('lastFive');
  container.innerHTML = '';
  if(!lastFive.length) { container.innerHTML = '<div class="muted">Sem registros</div>'; return; }
  lastFive.forEach(d=>{
    const el = document.createElement('div');
    el.style.marginBottom='6px';
    el.innerHTML = `<div style="display:flex;justify-content:space-between"><div>${escapeHtml(d.name)}</div><div style="font-weight:800">${fmtBRL(d.amount)}</div></div><div class="muted" style="font-size:0.85rem">${shortDate(d.date)}</div>`;
    container.appendChild(el);
  });
  renderMyDonations();
  applyAdminFilters();
}

/* -------------------
   Helpers
   ------------------- */
function escapeHtml(s){ if(!s) return ''; return s.replace(/[&<>"']/g, function(m){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[m] }) }

/* inicializações */
applyAdminFilters();
renderMyDonations();
