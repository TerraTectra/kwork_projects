const ROLES = [
  { key: 'recruit', title: 'Рекрут', canEdit: false, canAssign: false },
  { key: 'soldier', title: 'Солдат УК', canEdit: false, canAssign: false },
  { key: 'officer', title: 'Офицер УК', canEdit: false, canAssign: false },
  { key: 'deputy', title: 'Зам. Командира УК', canEdit: true, canAssign: true },
  { key: 'commander', title: 'Командир УК / КМД', canEdit: true, canAssign: true },
  { key: 'curator', title: 'Куратор', canEdit: true, canAssign: true },
  { key: 'site_admin', title: 'Админ сайта', canEdit: true, canAssign: true }
];

const DEFAULT_BLOCKS = {
  decrees: {
    title: 'Постановления',
    body: `📵 Постановление №1 — «Рация УК»\nКаждый боец Ударного Взвода обязан во время пребывания на ОВО/ВО находиться в голосовом канале «Рация УК» в ЗКС либо на вспомогательной частоте «Рация УК» на комлинке. Команда «Связь» означает обязательное подключение к вспомогательной рации УК.\n\n💥 Постановление №2 — «Выдача штрафбата»\nПри многократных нарушениях со стороны бойца CT Ударный клон имеет право написать заявку о выдаче штрафбата. Заявку одобряет CO-SP, командующий состав формирования и ВК.\n\n🚨 Постановление №3 — «Посторонние лица в казарме CT»\nПри нахождении в казарме лиц без полномочий Ударный клон обязан уточнить разрешение и цель нахождения, при отказе покинуть казарму — вызвать гвардию.\n\n📜 Постановление №4 — «Норма докладов»\nSOL-SP — 5 докладов в неделю. OFC-SP — 3 доклада в неделю. DEP-SP — без нормы, работа по указанию CO-SP+.\n\n🎁 Постановление №5 — «Поощрение за работу»\nБоец может запросить поощрение в «#《🏅》поощрения» за проделанную работу.\n\n⚔️ Постановление №6 — «О нарушениях Устава бойцами УК»\nПри нарушении Устава бойцами УК разрешено выдавать только ДН. ДВ прочим бойцам УК выдают только OFC-SP+.\n\n🪶 Постановление №7 — «Актуальность таблицы»\nПри изменении звания, должности, позывного или формы боец отписывает в «#《📝》состав-sp».\n\n🖥️ Постановление №8 — «Подача рапортов»\nДоклады из «#《⚖️》наказания» дублируются в «#👮🏻│дв-скт-передачи».\n\n⛳ Постановление №9 — «Об увольнительных»\nУвольнение запрашивается в «#《⛳》увольнение-sp» и дублируется при заявке на отпуск.\n\n🚷 Постановление №10 — «О выговорах»\nЗа неисполнение постановлений, приказов и предписаний выдаются устные или письменные выговоры.\n\n👁️ Постановление №11 — «О должностных обязанностях»\nКуратор, Командир, Заместитель, Офицер, SP и Recruit SP действуют по своим правам и обязанностям.`
  },
  documents: {
    title: 'Документы',
    body: 'Система повышения и поощрений, таблица состава, нормативно-правовой блок ВАР, регламент для рекрута Ударного взвода и этика Ударного клона хранятся как обязательная база для бойцов. В боевой версии их можно хранить в БД и редактировать через кабинет КМД.'
  },
  hierarchy: {
    title: 'Иерархия',
    body: 'Куратор — без приписки. Командир УК — CO - SP | CT. Зам. Командира УК — DEP- SP | CT. Офицер УК — OFC- SP | CT. Солдат УК — SOL - SP | CT. Рекрут УК — R - SP | CT.'
  },
  medals: {
    title: 'Медали Ударного корпуса',
    body: 'Высшая преданность делу, Щит Отечества, За мужество и честь, Ударный клон месяца, Оперативная служба, Верность долгу, Победитель преступности, За отличие в службе, Верность Уставу, Первоклассник, Защитник правопорядка.'
  },
  forms: {
    title: 'Формы',
    body: 'SP: DC-15LE, Westar-M5, DP-23, DC-17, Dual DC-17, Clone Shield, термальная граната, крюк-кошка, парализатор, наручники, броня 300. MED-SP: Westar-M5, DC-17, Bacta Injector, Bacta Grenade, броня 125. PR-SP: DC-19LE, Westar-M5, DP-23, Dual DC-17, JT-12, броня 300.'
  }
};

const STORAGE_KEY = 'ror_sp_portal_db_v1';
const $ = (selector) => document.querySelector(selector);
const roleByKey = (key) => ROLES.find((role) => role.key === key) || ROLES[0];

function createDatabase() {
  return {
    currentUserId: null,
    users: [
      { id: 'owner', steamId: '76561198000000001', nickname: 'Владелец сайта', callsign: 'Site Admin', role: 'site_admin' }
    ],
    blocks: DEFAULT_BLOCKS
  };
}

function loadDb() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return createDatabase();
  try {
    const db = JSON.parse(raw);
    db.blocks = { ...DEFAULT_BLOCKS, ...db.blocks };
    return db;
  } catch {
    return createDatabase();
  }
}

function saveDb() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

let db = loadDb();

function currentUser() {
  return db.users.find((user) => user.id === db.currentUserId) || null;
}

function permissions() {
  const user = currentUser();
  return user ? roleByKey(user.role) : { canEdit: false, canAssign: false, title: 'Гость' };
}

function registerUser({ steamId, nickname, callsign }) {
  const existing = db.users.find((user) => user.steamId === steamId);
  if (existing) {
    existing.nickname = nickname;
    existing.callsign = callsign;
    db.currentUserId = existing.id;
  } else {
    const user = { id: crypto.randomUUID(), steamId, nickname, callsign, role: 'recruit' };
    db.users.push(user);
    db.currentUserId = user.id;
  }
  saveDb();
  render();
}

function renderProfile() {
  const user = currentUser();
  const card = $('#profileCard');
  const lead = $('#heroLead');
  $('#logoutBtn').hidden = !user;
  document.querySelectorAll('.auth-only').forEach((node) => node.hidden = !user);
  document.querySelectorAll('.locked-only').forEach((node) => node.hidden = Boolean(user));

  if (!user) {
    card.innerHTML = '<span class="status-dot"></span><p class="eyebrow">Статус</p><h2>Гость</h2><p>Доступ: только раздел «Путь новичка».</p>';
    lead.textContent = 'Для неавторизованного бойца открыт только путь новичка. Зарегистрируйся через Steam, чтобы получить личный кабинет и доступ по роли.';
    return;
  }

  const role = roleByKey(user.role);
  lead.textContent = `Профиль ${user.nickname} подключён. Роль: ${role.title}. Доступ выдан согласно иерархии портала.`;
  card.innerHTML = `<span class="status-dot online"></span><p class="eyebrow">Авторизован</p><h2>${user.nickname}</h2><p>${user.callsign}</p><p><b>${role.title}</b></p>`;
}

function renderDatabase() {
  const user = currentUser();
  if (!user) return;
  const role = roleByKey(user.role);
  $('#currentUserData').innerHTML = `
    <dt>Steam ID</dt><dd>${user.steamId}</dd>
    <dt>Ник</dt><dd>${user.nickname}</dd>
    <dt>Позывной</dt><dd>${user.callsign}</dd>
    <dt>Роль</dt><dd>${role.title}</dd>
    <dt>Права</dt><dd>${role.canEdit ? 'Редактирование блоков' : 'Только просмотр'}${role.canAssign ? ' + выдача ролей' : ''}</dd>`;
  $('#roleList').innerHTML = ROLES.map((item) => `<li><b>${item.title}</b> — ${item.canEdit ? 'может редактировать' : 'просмотр'}${item.canAssign ? ', может выдавать роли' : ''}</li>`).join('');
}

function renderEditor() {
  const canEdit = permissions().canEdit;
  const select = $('#sectionSelect');
  const editor = $('#sectionEditor');
  $('#editPermission').textContent = canEdit ? 'Разрешено' : 'Только просмотр';
  select.innerHTML = Object.entries(db.blocks).map(([key, block]) => `<option value="${key}">${block.title}</option>`).join('');
  const selected = select.value || Object.keys(db.blocks)[0];
  editor.value = db.blocks[selected].body;
  editor.disabled = !canEdit;
  $('#saveSection').disabled = !canEdit;
}

function renderUsers() {
  const canAssign = permissions().canAssign;
  $('#rolePermission').textContent = canAssign ? 'Разрешено' : 'Нет прав';
  $('#usersList').innerHTML = db.users.map((user) => `
    <div class="user-row">
      <div><b>${user.nickname}</b><small>${user.callsign} · ${user.steamId}</small></div>
      <select data-user-id="${user.id}" ${canAssign ? '' : 'disabled'}>
        ${ROLES.map((role) => `<option value="${role.key}" ${role.key === user.role ? 'selected' : ''}>${role.title}</option>`).join('')}
      </select>
    </div>`).join('');
}

function renderBlocks() {
  $('#contentBlocks').innerHTML = `
    <div class="section-heading"><p class="eyebrow">Закрытые материалы</p><h2>Содержимое портала</h2><p>Эти блоки можно менять через кабинет КМД при наличии прав.</p></div>
    <div class="content-grid">
      ${Object.values(db.blocks).map((block) => `<article class="card content-card"><h3>${block.title}</h3><p>${block.body.replaceAll('\n', '</p><p>')}</p></article>`).join('')}
    </div>`;
}

function render() {
  renderProfile();
  if (currentUser()) {
    renderDatabase();
    renderEditor();
    renderUsers();
    renderBlocks();
  }
}

$('#openSteamModal').addEventListener('click', () => $('#steamModal').showModal());
$('#openSteamModal2').addEventListener('click', () => $('#steamModal').showModal());
$('#steamForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  registerUser({ steamId: form.get('steamId').trim(), nickname: form.get('nickname').trim(), callsign: form.get('callsign').trim() });
  $('#steamModal').close();
});
$('#logoutBtn').addEventListener('click', () => { db.currentUserId = null; saveDb(); render(); });
$('#resetDemo').addEventListener('click', () => { localStorage.removeItem(STORAGE_KEY); db = createDatabase(); render(); });
$('#sectionSelect').addEventListener('change', (event) => { $('#sectionEditor').value = db.blocks[event.target.value].body; });
$('#saveSection').addEventListener('click', () => {
  if (!permissions().canEdit) return;
  db.blocks[$('#sectionSelect').value].body = $('#sectionEditor').value;
  saveDb();
  renderBlocks();
});
$('#usersList').addEventListener('change', (event) => {
  if (!permissions().canAssign || !event.target.matches('select[data-user-id]')) return;
  const user = db.users.find((item) => item.id === event.target.dataset.userId);
  user.role = event.target.value;
  saveDb();
  render();
});

render();
