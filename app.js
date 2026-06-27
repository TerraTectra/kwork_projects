const ROLES = [
  { key: 'recruit', title: 'Recruit SP', canEdit: false, canAssign: false },
  { key: 'soldier', title: 'SP (Ударный клон)', canEdit: false, canAssign: false },
  { key: 'officer', title: 'Officer SP', canEdit: false, canAssign: false },
  { key: 'deputy', title: 'Deputy Commander SP', canEdit: true, canAssign: true },
  { key: 'commander', title: 'Commander SP', canEdit: true, canAssign: true },
  { key: 'curator', title: 'Curator SP', canEdit: true, canAssign: true },
  { key: 'site_admin', title: 'Админ сайта', canEdit: true, canAssign: true }
];

const STORAGE_KEY = 'ror_sp_portal_db_v1.1.5';
const SESSION_KEY = 'ror_sp_session_v1.1.5';
const $ = (selector) => document.querySelector(selector);
const roleByKey = (key) => ROLES.find((role) => role.key === key) || ROLES[0];

// ===== PERSISTENT STORAGE SYSTEM =====
class PersistentStorage {
  static setSession(userId) {
    // Сохраняем в localStorage
    localStorage.setItem(SESSION_KEY, JSON.stringify({ userId, timestamp: Date.now() }));
    // Также сохраняем в sessionStorage для дополнительной надежности
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ userId, timestamp: Date.now() }));
    // Сохраняем в cookie (на 30 дней)
    this.setCookie('session_user_id', userId, 30);
  }

  static getSession() {
    // Проверяем localStorage
    let session = localStorage.getItem(SESSION_KEY);
    if (session) {
      try {
        const data = JSON.parse(session);
        return data.userId;
      } catch (e) {}
    }
    
    // Проверяем sessionStorage
    session = sessionStorage.getItem(SESSION_KEY);
    if (session) {
      try {
        const data = JSON.parse(session);
        return data.userId;
      } catch (e) {}
    }
    
    // Проверяем cookie
    const cookieUserId = this.getCookie('session_user_id');
    if (cookieUserId) return cookieUserId;
    
    return null;
  }

  static clearSession() {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    this.deleteCookie('session_user_id');
  }

  static setCookie(name, value, days = 30) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = "expires=" + date.toUTCString();
    document.cookie = name + "=" + encodeURIComponent(value) + ";" + expires + ";path=/";
  }

  static getCookie(name) {
    const nameEQ = name + "=";
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      let cookie = cookies[i].trim();
      if (cookie.indexOf(nameEQ) === 0) {
        return decodeURIComponent(cookie.substring(nameEQ.length));
      }
    }
    return null;
  }

  static deleteCookie(name) {
    this.setCookie(name, "", -1);
  }
}

// ===== DATABASE SYSTEM =====
const DECREES_DATA = [
  { id: 1, title: '📵 Постановление №1 — «Рация УК»', body: 'Каждый боец Ударного Взвода обязан во время пребывания на ОВО/ВО находиться в голосовом канале «Рация УК» в ЗКС либо на вспомогательной частоте «Рация УК» на комлинке.<br><br><b>«Связь»</b> — команда, при которой каждый боец обязан зайти на вспомогательную рацию УК. При отсутствии рации — предварительно создать её.<br><br>• Подключиться: F4 → Рация → УК|CT → Пароль: 1687.<br>• Создать: F4 → Рация → Создать канал → Тип: «Приватный», Название: УК|CT, Пароль: 1687.' },
  { id: 2, title: '💥 Постановление №2 — «Выдача штрафбата»', body: 'При многократных нарушениях со стороны бойца CT, неадекватном поведении или тяжких нарушениях Ударный клон имеет право написать заявку о выдаче штрафбата. Заявку одобряет CO-SP, командующий состав формирования и ВК.' },
  { id: 3, title: '🚨 Постановление №3 — «Посторонние лица в казарме CT»', body: 'При нахождении в казарме лиц без полномочий на проход Ударный клон обязан уточнить, с чьего разрешения и с какой целью они находятся в казарме. При неуважительной причине сопроводить на выход, при отказе вызвать гвардию.' },
  { id: 4, title: '📜 Постановление №4 — «Норма докладов»', body: 'Каждый боец обязуется еженедельно выполнять работу:<br>• SOL-SP — 5 докладов в неделю.<br>• OFC-SP — 3 доклада в неделю.<br>• DEP-SP — без нормы, работа по рассмотрению и указанию CO-SP+.<br><br>За невыполнение нормы: 1 неделя — устный выговор; 2 недели подряд — письменный; 3 недели подряд — снятие.' },
  { id: 5, title: '🎁 Постановление №5 — «Поощрение за работу»', body: 'Каждый боец имеет право запросить поощрение в канале «#《🏅》поощрения» за проделанную работу по системе повышения и поощрений Ударного взвода.' },
  { id: 6, title: '⚔️ Постановление №6 — «О недопустимости нарушений Устава бойцами УК»', body: 'При нарушении Устава бойцами УК разрешено выдавать только ДН — напоминание пункта Устава. При заключении бойца УК в КПЗ он получает письменный выговор внутри структуры УК.' },
  { id: 7, title: '🪶 Постановление №7 — «Актуальность таблицы»', body: 'При изменении звания, должности, позывного или основной формы в личном деле боец обязан отписать в канал «#《📝》состав-sp» в течение 3 дней.' },
  { id: 8, title: '🖥️ Постановление №8 — «Подача рапортов»', body: 'Все доклады из канала «#《⚖️》наказания» должны сразу дублироваться в канал Ударных Клонов «#👮🏻│дв-скт-передачи».' },
  { id: 9, title: '⛳ Постановление №9 — «Об увольнительных»', body: 'Каждый боец имеет право запросить увольнение в канале «#《⛳》увольнение-sp» в соответствии с 5 Директивой CT.' },
  { id: 10, title: '🚷 Постановление №10 — «О выговорах»', body: 'За неисполнение постановлений, приказов и предписаний каждый боец подлежит санкциям: устным и письменным выговорам.' },
  { id: 11, title: '👁️ Постановление №11 — «О должностных обязанностях»', body: 'Регламентирует права и обязанности Куратора, Командира, Заместителя, Офицеров и Рядового состава Ударного Взвода.' }
];

const FULL_CONTENT = {
  upgrade: `
    <h3>Система повышения и поощрений</h3>
    <p><b>Инструкция:</b> Повышение происходит на основе проделанной работы, зафиксированной в рапортах и докладах. Для перехода на следующий ранг необходимо выполнить установленные нормы.</p>
    <h4>Сержантский состав:</h4>
    <ul>
      <li><b>R-SP → SOL-SP:</b> Пройти обучение, сдать регламенты, отстоять испытательный срок.</li>
      <li><b>SOL-SP → SGT-SP:</b> Выполнение еженедельной нормы (5 докладов), участие в 3 операциях, отсутствие выговоров.</li>
      <li><b>SGT-SP → SSGT-SP:</b> 10 докладов, 5 операций, 1 рекомендация от OFC-SP+.</li>
    </ul>
    <h4>Уоррент-офицерский состав:</h4>
    <ul>
      <li><b>SSGT-SP → WO-SP:</b> 15 докладов, 7 операций, прохождение офицерского теста.</li>
    </ul>
    <h4>Поощрения:</h4>
    <p>За активную службу, предотвращение крупных нарушений и помощь командованию бойцы могут получить внеочередное звание или медали. Медали дают бонусы к репутации и приоритет при назначении на должности.</p>`,
  legal: `
    <h3>Нормативно-Правовой Блок ВАР</h3>
    <h4>🔴 Золотые правила (ЗП):</h4>
    <ol>
      <li>Приказ командира — закон для подчиненного.</li>
      <li>Ударный клон — образец дисциплины и выправки.</li>
      <li>Оружие применяется только в случае крайней необходимости или по приказу.</li>
      <li>Запрещено обсуждать приказы в присутствии посторонних.</li>
    </ol>
    <h4>⚪ Воинский этикет (ВЭ):</h4>
    <p>Соблюдение субординации, вежливое обращение к старшим по званию и гражданским лицам. Обращение только по званию или "Сэр/Мэм". Приветствие старшего состава обязательно.</p>
    <h4>🔵 Регламент ношения оружия (РНО):</h4>
    <p>Оружие должно быть на предохранителе в мирное время. Запрещено бесцельное размахивание или стрельба в воздух. В жилых блоках оружие должно быть зачехлено.</p>
    <h4>🟤 Постовая служба (ПС):</h4>
    <p>Боец на посту обязан быть бдительным, не отвлекаться на посторонние разговоры и докладывать о ситуации каждые 10-15 минут.</p>`,
  recruit: `
    <h3>Регламент для рекрута</h3>
    <p>Свод правил для новоприбывших бойцов:</p>
    <ol>
      <li>Разрешено предотвращать нарушения — заломать руки и положить бойца на пол, после вызвать гвардию.</li>
      <li>Разрешено носить форму УК только со 2-го этапа обучения на SP.</li>
      <li>Запрещено носить вооружение в ЗК (Примечание: Разрешается ношение второстепенного вооружения).</li>
      <li>Запрещено свободное посещение КПЗ для доставки нарушителей даже при предварительном оповещении КГ.</li>
      <li>R-SP|CT в звании CPL обязуется повыситься до SGT и пройти обучение в течение 7 дней.</li>
      <li>R-SP|CT имеет право присутствовать и наблюдать за задержаниями, оборонять строй и участвовать в слежке.</li>
    </ol>`,
  ethics: `
    <h3>Этика Ударного клона</h3>
    <p>Этика Ударного клона играет ключевую роль в обеспечении законности и защиты прав существ в рамках процессов.</p>
    <ol>
      <li><b>Независимость и объективность:</b> Действовать независимо от внешних влияний.</li>
      <li><b>Соблюдение законности:</b> Соблюдать устав и иные документы, руководствоваться ими.</li>
      <li><b>Профессионализм:</b> Обладать высоким уровнем знаний и навыков, постоянно совершенствоваться.</li>
      <li><b>Уважение:</b> Уважать любого члена формирования, вне зависимости от степени нарушения. Способствовать пониманию клоном своего проступка.</li>
    </ol>`,
  reprimands: `
    <h3>Система выговоров УК</h3>
    <ol>
      <li>Выговоры подразделяются на: "Устный" и "Письменный".</li>
      <li>2 устных = 1 письменному.</li>
      <li>При получении 3-ех письменных, боец исключается из взвода.</li>
      <li>Право на выдачу любых выговоров имеют OFC-SP+.</li>
      <li>Снятие выговоров происходит через DEP-SP+, либо через канал 《🏅》поощрения.</li>
    </ol>`
};

let db = loadDb();
let currentView = 'home';

function loadDb() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return createInitialDb();
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse DB:', e);
    return createInitialDb();
  }
}

function createInitialDb() {
  return {
    users: [
      { id: 'admin-id', steamId: '76561198000000001', nickname: 'Владелец сайта', callsign: 'Site Admin', role: 'site_admin', password: 'admin' }
    ],
    blocks: {
      hierarchy: { title: 'Иерархия', body: 'Куратор — без приписки\nКомандир УК — CO-SP | CT\nЗам. Командира УК — DEP-SP | CT\nОфицер УК — OFC-SP | CT\nСолдат УК — SOL-SP | CT\nРекрут УК — R-SP | CT' },
      medals: { title: 'Медали', body: 'Высшая преданность делу, Щит Отечества, За мужество и честь, Ударный клон месяца, Оперативная служба, Верность долгу, Победитель преступности, За отличие в службе, Верность Уставу, Первоклассник, Защитник правопорядка.' },
      forms: { title: 'Формы', body: 'SP: DC-15LE, Westar-M5, DP-23, DC-17, Dual DC-17, Clone Shield, термальная граната, крюк-кошка, парализатор, наручники, броня 300.\nMED-SP: Westar-M5, DC-17, Bacta Injector, Bacta Grenade, броня 125.\nPR-SP: DC-19LE, Westar-M5, DP-23, Dual DC-17, JT-12, броня 300.' }
    }
  };
}

function saveDb() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch (e) {
    console.error('Failed to save DB:', e);
  }
}

function currentUser() {
  const userId = PersistentStorage.getSession();
  return db.users.find(u => u.id === userId) || null;
}

function switchView(view) {
  currentView = view;
  render();
  window.scrollTo(0, 0);
}

function renderNav() {
  const user = currentUser();
  const nav = $('#mainNav');
  let html = `<a href="javascript:void(0)" class="nav-link ${currentView === 'home' ? 'active' : ''}" onclick="switchView('home')">Главная</a>`;
  html += `<a href="javascript:void(0)" class="nav-link ${currentView === 'decrees' ? 'active' : ''}" onclick="switchView('decrees')">Постановления</a>`;
  
  if (user) {
    html += `<a href="javascript:void(0)" class="nav-link ${currentView === 'database' ? 'active' : ''}" onclick="switchView('database')">База</a>`;
    html += `<a href="javascript:void(0)" class="nav-link ${currentView === 'reports' ? 'active' : ''}" onclick="switchView('reports')">Рапорты</a>`;
    const role = roleByKey(user.role);
    if (role.canAssign) {
      html += `<a href="javascript:void(0)" class="nav-link ${currentView === 'command' ? 'active' : ''}" onclick="switchView('command')">Кабинет КМД</a>`;
    }
  }
  
  nav.innerHTML = html;
  $('#logoutBtn').hidden = !user;
}

const VIEWS = {
  home: () => {
    const user = currentUser();
    return `
      <section class="hero shell">
        <div class="hero-copy">
          <p class="eyebrow">Закрытый портал · CT Legion</p>
          <h1>Рота ударных клонов</h1>
          <p class="lead">${user ? `Профиль <b>${user.nickname}</b> подключён. Добро пожаловать на службу.` : 'Для неавторизованного бойца открыт только путь новичка. Зарегистрируйся через Steam, чтобы получить личный кабинет и доступ к базе.'}</p>
          <div class="hero-actions">
            ${user ? `<button class="btn primary" onclick="switchView('database')">Перейти в Базу</button>` : `
              <button class="btn primary" id="openLoginBtn">Войти в профиль</button>
              <button class="btn secondary" id="openRegisterBtn">Регистрация</button>
            `}
          </div>
        </div>
        <aside class="status-card">
          <span class="status-dot ${user ? 'online' : ''}"></span>
          <p class="eyebrow">Статус</p>
          <h2>${user ? user.nickname : 'Гость'}</h2>
          <p>${user ? user.callsign : 'Доступ ограничен'}</p>
          ${user ? `<p><b>${roleByKey(user.role).title}</b></p>` : ''}
        </aside>
      </section>
      <section class="shell section">
        <div class="section-heading"><h2>Путь новичка</h2></div>
        <div class="path-grid">
          <article class="card step"><span>01</span><h3>Познакомься</h3><p>Ударный взвод CT поддерживает порядок и дисциплину на сервере Rise of Republic.</p></article>
          <article class="card step"><span>02</span><h3>Рация</h3><p>F4 → Рация → УК|CT. Пароль: 1687.</p></article>
          <article class="card step"><span>03</span><h3>Регистрация</h3><p>Создай профиль, чтобы видеть регламенты и писать рапорты.</p></article>
        </div>
      </section>`;
  },
  decrees: () => `
    <section class="shell section">
      <div class="section-heading">
        <h2>Постановления</h2>
        <a href="https://sites.google.com/view/riseoftherepublicdiscovery/устав-вар?authuser=0" target="_blank" class="btn secondary" style="margin-top:10px">📜 Устав ВАР (Внешняя ссылка)</a>
      </div>
      <div class="decree-list">
        ${DECREES_DATA.map(d => `<article class="decree"><h3>${d.title}</h3><p>${d.body}</p></article>`).join('')}
      </div>
    </section>`,
  database: () => `
    <section class="shell section">
      <div class="section-heading"><h2>База данных</h2></div>
      <div class="content-stack">
        <article class="card content-card">${FULL_CONTENT.upgrade}</article>
        <article class="card content-card">${FULL_CONTENT.legal}</article>
        <article class="card content-card">${FULL_CONTENT.recruit}</article>
        <article class="card content-card">${FULL_CONTENT.ethics}</article>
        <article class="card content-card">${FULL_CONTENT.reprimands}</article>
        <article class="card content-card"><h3>Иерархия</h3><p>${db.blocks.hierarchy.body.replaceAll('\n', '<br>')}</p></article>
        <article class="card content-card"><h3>Медали</h3><p>${db.blocks.medals.body.replaceAll('\n', '<br>')}</p></article>
        <article class="card content-card"><h3>Формы</h3><p>${db.blocks.forms.body.replaceAll('\n', '<br>')}</p></article>
        <article class="card content-card"><h3>Внешние ресурсы</h3><p><a href="https://docs.google.com/spreadsheets/d/1yFM2jvgQBz7SfKeudbbXErFdQx9J6ZhAxbVudufKg0U/edit?gid=1466119767#gid=1466119767" target="_blank" class="btn ghost">📊 Таблица состава УК</a></p></article>
      </div>
    </section>`,
  reports: () => `
    <section class="shell section">
      <div class="section-heading"><h2>Генератор рапортов</h2></div>
      <div class="report-tabs">
        <button class="tab-btn active" onclick="switchReportTab('event')">Событие</button>
        <button class="tab-btn" onclick="switchReportTab('punish')">Наказание</button>
        <button class="tab-btn" onclick="switchReportTab('wanted')">Розыск</button>
        <button class="tab-btn" onclick="switchReportTab('reprimand')">Выговор УК</button>
      </div>
      <div id="reportFormContainer" class="card" style="margin-top:20px; padding:20px;">
        <!-- Динамическая форма -->
      </div>
      <div id="reportOutput" class="card" style="margin-top:20px; padding:20px; display:none; background: #1a1a1a; border: 1px solid #333;">
        <h4 style="margin-bottom:10px">Результат (скопировано в буфер):</h4>
        <pre id="reportPre" style="white-space: pre-wrap; font-family: monospace; color: #00ff00;"></pre>
      </div>
    </section>`,
  command: () => `
    <section class="shell section">
      <div class="section-heading"><h2>Управление составом</h2></div>
      <div id="usersList"></div>
    </section>`
};

// Report Generator Logic
let currentReportTab = 'event';
const REPORT_TEMPLATES = {
  event: {
    title: 'Рапорт об участии в событии',
    fields: [
      { id: 'num', label: 'Номер рапорта', type: 'number', placeholder: 'Напр. 1' },
      { id: 'event', label: 'В каком событии принимали участие', type: 'text' }
    ],
    gen: (d, user) => `Рапорт №${d.num}\n[1] @\n[2] @.\n[3] ${d.event}\n[4]`
  },
  punish: {
    title: 'Формуляр дела (ДВ/ДН/СКТ)',
    fields: [
      { id: 'num', label: 'Номер дела', type: 'number' },
      { id: 'violator', label: 'IDN | Name (Нарушителя)', type: 'text' },
      { id: 'rules', label: 'Нарушенные пункты Устава', type: 'text' },
      { id: 'punish', label: 'Какое наказание выдано', type: 'text' },
      { id: 'proof', label: 'Доказательства (ссылки)', type: 'text' }
    ],
    gen: (d, user) => `Дело №${d.num}\n[1] ${user.callsign} | ${user.nickname}\n[2] ${d.violator}\n[3] ${d.rules}\n[4] ${d.punish}\n[5] ${d.proof}`
  },
  wanted: {
    title: 'Подача в розыск',
    fields: [
      { id: 'target', label: 'IDN | Rank | Name (Разыскиваемого)', type: 'text' },
      { id: 'rules', label: 'Нарушенные пункты', type: 'text' },
      { id: 'proof', label: 'Доказательства', type: 'text' }
    ],
    gen: (d, user) => `[1] ${user.callsign} | ${user.nickname}\n[2] ${d.target}\n[3] ${d.rules}\n[4] @[👮] Ударный Клон\n[5] ${d.proof}`
  },
  reprimand: {
    title: 'Выдача выговора УК',
    fields: [
      { id: 'target', label: 'Кого наказываем (Пинг/Ник)', type: 'text' },
      { id: 'type', label: 'Тип (Устный/Письменный)', type: 'text' },
      { id: 'reason', label: 'Причина', type: 'text' }
    ],
    gen: (d, user) => `[1] @\n[2] ${d.target}\n[3] ${d.type}\n[4] ${d.reason}\n[5] @[🗒️] Интендант УК`
  }
};

function switchReportTab(tab) {
  currentReportTab = tab;
  document.querySelectorAll('.report-tabs .tab-btn').forEach(b => b.classList.toggle('active', b.innerText.toLowerCase().includes(tab === 'event' ? 'событие' : tab === 'punish' ? 'наказание' : tab === 'wanted' ? 'розыск' : 'выговор')));
  renderReportForm();
}

function renderReportForm() {
  const container = $('#reportFormContainer');
  if (!container) return;
  const tpl = REPORT_TEMPLATES[currentReportTab];
  let html = `<h3>${tpl.title}</h3><form id="genForm" style="display:grid; gap:15px; margin-top:15px;">`;
  tpl.fields.forEach(f => {
    html += `<div><label>${f.label}</label><input type="${f.type}" id="f_${f.id}" required style="width:100%; padding:8px; background:#222; border:1px solid #444; color:white; border-radius:4px;"></div>`;
  });
  html += `<button type="submit" class="btn primary">Сгенерировать и скопировать</button></form>`;
  container.innerHTML = html;
  
  $('#genForm').onsubmit = (e) => {
    e.preventDefault();
    const data = {};
    tpl.fields.forEach(f => data[f.id] = $(`#f_${f.id}`).value);
    const result = tpl.gen(data, currentUser());
    $('#reportPre').textContent = result;
    $('#reportOutput').style.display = 'block';
    navigator.clipboard.writeText(result);
    alert('Скопировано в буфер обмена!');
  };
}

function render() {
  renderNav();
  const app = $('#appContent');
  app.innerHTML = VIEWS[currentView] ? VIEWS[currentView]() : VIEWS.home();
  
  if (currentView === 'home' && !currentUser()) {
    $('#openLoginBtn').onclick = () => { switchTab('login'); $('#steamModal').showModal(); };
    $('#openRegisterBtn').onclick = () => { switchTab('register'); $('#steamModal').showModal(); };
  }
  if (currentView === 'reports') renderReportForm();
  if (currentView === 'command') renderUsersList();
}

function renderUsersList() {
  const container = $('#usersList');
  if (!container) return;
  container.innerHTML = db.users.map(u => `
    <div class="user-row" style="display:flex; justify-content:space-between; align-items:center; padding:10px; border-bottom:1px solid #333;">
      <div><b>${u.nickname}</b> (${u.callsign})<br><small>${u.steamId}</small></div>
      <select onchange="updateUserRole('${u.id}', this.value)">
        ${ROLES.map(r => `<option value="${r.key}" ${u.role === r.key ? 'selected' : ''}>${r.title}</option>`).join('')}
      </select>
    </div>`).join('');
}

function updateUserRole(userId, newRole) {
  const user = db.users.find(u => u.id === userId);
  if (user) {
    user.role = newRole;
    saveDb();
    alert('Роль обновлена');
  }
}

function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.toggle('active', c.id === `${tab}Tab`));
}

document.querySelectorAll('.tab-btn').forEach(b => b.onclick = () => switchTab(b.dataset.tab));
$('#closeModal').onclick = () => $('#steamModal').close();

$('#loginForm').onsubmit = (e) => {
  e.preventDefault();
  const data = new FormData(e.target);
  const user = db.users.find(u => u.steamId === data.get('steamId') && u.password === data.get('password'));
  if (user) {
    PersistentStorage.setSession(user.id);
    $('#steamModal').close();
    switchView('home');
  } else { alert('Неверные данные'); }
};

$('#steamForm').onsubmit = (e) => {
  e.preventDefault();
  const data = new FormData(e.target);
  const steamId = data.get('steamId');
  if (db.users.find(u => u.steamId === steamId)) return alert('Steam ID занят');
  const newUser = { id: Date.now().toString(), steamId, nickname: data.get('nickname'), callsign: data.get('callsign'), password: data.get('password'), role: 'recruit' };
  db.users.push(newUser);
  saveDb();
  PersistentStorage.setSession(newUser.id);
  $('#steamModal').close();
  switchView('home');
};

$('#logoutBtn').onclick = () => { 
  PersistentStorage.clearSession();
  switchView('home'); 
};

$('#resetDemo').onclick = () => { 
  if (confirm('Удалить все данные?')) { 
    localStorage.removeItem(STORAGE_KEY);
    PersistentStorage.clearSession();
    db = createInitialDb(); 
    switchView('home'); 
  } 
};

// Инициализация при загрузке страницы
window.addEventListener('load', () => {
  render();
});
