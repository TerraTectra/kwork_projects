const ROLES = [
  { key: 'guest', title: 'Гость', canEdit: false, canAssign: false },
  { key: 'recruit', title: 'Recruit SP', canEdit: false, canAssign: false },
  { key: 'soldier', title: 'SP (Ударный клон)', canEdit: false, canAssign: false },
  { key: 'officer', title: 'Officer SP', canEdit: false, canAssign: false },
  { key: 'deputy', title: 'Deputy Commander SP', canEdit: true, canAssign: true },
  { key: 'commander', title: 'Commander SP', canEdit: true, canAssign: true },
  { key: 'curator', title: 'Curator SP', canEdit: true, canAssign: true },
  { key: 'site_admin', title: 'Админ сайта', canEdit: true, canAssign: true }
];

const STORAGE_KEY = 'ror_sp_portal_db_v1.1.6';
const SESSION_KEY = 'ror_sp_session_v1.1.6';
const $ = (selector, parent = document) => parent.querySelector(selector);
const roleByKey = (key) => ROLES.find((role) => role.key === key) || ROLES[0];

// ===== PERSISTENT STORAGE SYSTEM =====
class PersistentStorage {
  static setSession(userId) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ userId, timestamp: Date.now() }));
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ userId, timestamp: Date.now() }));
    this.setCookie('session_user_id', userId, 30);
  }

  static getSession() {
    let session = localStorage.getItem(SESSION_KEY);
    if (session) {
      try {
        const data = JSON.parse(session);
        return data.userId;
      } catch (e) {}
    }
    
    session = sessionStorage.getItem(SESSION_KEY);
    if (session) {
      try {
        const data = JSON.parse(session);
        return data.userId;
      } catch (e) {}
    }
    
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

// ===== FULL CONTENT FOR BASE SECTION =====
const BASE_SECTIONS = {
  promotion: {
    title: 'Система повышения и поощрений',
    content: `
      <h3>Система повышения и поощрений взвода Ударных клонов СТ</h3>
      <p><b>Инструкция:</b></p>
      <ol>
        <li>Повышение в нашем взводе осуществляется по мере накопления определенного количества баллов или выполнения конкретных задач.</li>
        <li>Баллы начисляются за участие в тренировках, ивентах, патрулирование и успешное выполнение боевых задач.</li>
        <li>Рапорт о проделанной работе должен быть подан в соответствующий канал Discord до конца недели.</li>
        <li>Решение о повышении принимает командный состав (OFC-SP+).</li>
      </ol>
      <p><b>Сержантский состав:</b></p>
      <ul>
        <li><b>Recruit SP → PVT-SP:</b> Прохождение КМБ, сдача устава и базовых регламентов.</li>
        <li><b>PVT-SP → CPL-SP:</b> 15 баллов, участие в 3 патрулях, отсутствие выговоров.</li>
        <li><b>CPL-SP → SGT-SP:</b> 25 баллов, проведение 2 тренировок для рекрутов, сдача экзамена на знание тактики.</li>
        <li><b>SGT-SP → SSGT-SP:</b> 40 баллов, руководство группой в 2 операциях, рекомендация от OFC-SP.</li>
      </ul>
      <p><b>Уоррент-офицерский состав:</b></p>
      <ul>
        <li><b>SSGT-SP → WO-SP:</b> 60 баллов, сдача расширенного теста на знание законодательства ВАР, 2 недели в звании SSGT.</li>
        <li><b>WO-SP → CWO-SP:</b> 80 баллов, безупречная служба, активное участие в жизни взвода, назначение приказом DEP-SP+.</li>
      </ul>
      <p><b>Поощрения:</b></p>
      <ul>
        <li><b>Медаль «За отвагу»:</b> Выдается за исключительное мужество в бою. Дает +10 баллов к повышению.</li>
        <li><b>Благодарность в личное дело:</b> Выдается за инициативность. Дает +5 баллов.</li>
        <li><b>Снятие устного выговора:</b> За активную работу в течение недели.</li>
      </ul>
    `
  },
  legal: {
    title: 'Нормативно-Правовой Блок ВАР',
    content: `
      <h3>Нормативно - Правовой Блок ВАР (с поправками от 21.03.2026)</h3>
      <p><b>АББРЕВИАТУРА:</b></p>
      <ul>
        <li>ВАР — Великая Армия Республики</li>
        <li>ЗП — Золотые Правила</li>
        <li>ВЭ — Воинский Этикет</li>
        <li>ППвС — Правила поведения в строю</li>
        <li>РНО — Регламент ношения оружия</li>
        <li>ОиПВЕВ — Обязанности и права всех единиц ВАР</li>
        <li>ПС — Постовая служба</li>
        <li>ПА — Правила арсенала</li>
        <li>СВ — Свободное время</li>
        <li>ППБнВО — Правила поведения бойца на военном объекте</li>
        <li>ПВО — Правила военных объектов</li>
        <li>ТБ — Техника безопасности</li>
        <li>МсОД — Места с ограниченным допуском</li>
      </ul>
      <p><b>ЗОЛОТЫЕ ПРАВИЛА (ЗП):</b></p>
      <ol>
        <li>Приказ старшего по званию — закон. Необсуждаем, пока не выполнен.</li>
        <li>Запрещено открывать огонь по своим.</li>
        <li>Запрещено дезертирство и предательство.</li>
        <li>Соблюдение субординации обязательно для всех.</li>
      </ol>
      <p><b>ВОИНСКИЙ ЭТИКЕТ (ВЭ):</b></p>
      <ul>
        <li>Обращение к старшему только на «Вы» и по званию.</li>
        <li>Приветствие осуществляется воинским салютом.</li>
        <li>Запрещено использование нецензурной лексики.</li>
      </ul>
      <p><b>Правила поведения в строю (ППвС):</b></p>
      <ul>
        <li>В строю запрещено: разговаривать, использовать рацию, выходить без разрешения, доставать оружие.</li>
        <li>Опоздавший в строй должен доложить: «Сэр, [Звание] [Позывной] опоздал в строй. Разрешите встать?»</li>
      </ul>
      <p><b>Регламент ношения оружия (РНО):</b></p>
      <ul>
        <li>Оружие должно быть на предохранителе (за спиной/в кобуре), если нет прямой угрозы.</li>
        <li>Использование спецсредств без причины карается выговором.</li>
      </ul>
      <p><b>Обязанности и права всех единиц ВАР:</b></p>
      <ul>
        <li><b>Обязанность:</b> Защита Республики, выполнение приказов, поддержание дисциплины.</li>
        <li><b>Право:</b> На отдых, на получение снаряжения, на подачу рапорта.</li>
      </ul>
      <p><b>ПОРЯДОК ЗАДЕРЖАНИЯ НАРУШИТЕЛЯ:</b></p>
      <ol>
        <li>Потребовать прекратить противоправные действия.</li>
        <li>В случае неподчинения — применить нелетальное оружие (шокер).</li>
        <li>Зачитать права и доставить в карцер.</li>
        <li>Составить рапорт о задержании.</li>
      </ol>
    `
  },
  recruit: {
    title: 'Регламент для рекрута',
    content: `
      <h3>Регламент для рекрута Ударного взвода</h3>
      <p><b>Свод правил для новоприбывших бойцов:</b></p>
      <ol>
        <li>Разрешено предотвращать нарушения - заломать руки и положить бойца на пол, после вызвать гвардию.</li>
        <li>Разрешено носить форму УК только со 2-го этапа обучения на SP.</li>
        <li>Запрещено носить вооружение в ЗК (Примечание: Разрешается ношение второстепенного вооружения).</li>
        <li>Запрещено свободное посещение КПЗ для доставки нарушителей даже при предварительном оповещении Корусантской Гвардии.</li>
        <li>R-SP|CT в звании CPL обязуется повыситься в звании до SGT и пройти обучение на специализацию Ударного Клона (SP) в течение 7 дней с момента поступления в отряд.</li>
        <li>R-SP|CT имеет право присутствовать и наблюдать за задержаниями от полноценных единиц Ударного взвода, оборонять строй во время проведения агит. мероприятий, а также участвовать в слежке за проведением обучения.</li>
      </ol>
    `
  },
  ethics: {
    title: 'Этика Ударного клона',
    content: `
      <h3>Этика Ударного клона</h3>
      <p>Этика Ударного клона играет ключевую роль в обеспечении законности, справедливости и защите прав существ в рамках процессов, а также способствует повышению доверия общества к правоохранительным органам.</p>
      <p><b>Командиром отряда были сформированы основные пункты этики:</b></p>
      <h4>[1] Независимость и объективность</h4>
      <p>Ударный клон должен действовать независимо от внешних влияний и обеспечивать объективность в ходе пресечения преступлений.</p>
      <h4>[2] Соблюдение законности</h4>
      <p>Ударный клон должен соблюдать устав и иные документы, руководствоваться ими при реализации своей деятельности.</p>
      <h4>[3] Профессионализм</h4>
      <p>Ударный клон должен обладать высоким уровнем профессиональных знаний и навыков, постоянно совершенствовать свою квалификацию и следовать этическим стандартам.</p>
      <h4>[4] Уважение</h4>
      <p>Ударный клон должен уважать любого члена формирования, вне зависимости от степени нарушения. Также способствовать наилучшему пониманию клона о своем проступке/преступлении путем предупреждений, разъяснений и иных методов взаимодействия с клоном.</p>
    `
  },
  hierarchy: {
    title: 'Иерархия и медали',
    content: `
      <h3>Иерархия Ударного взвода</h3>
      <p><b>Рядовой состав:</b></p>
      <ul>
        <li>Recruit SP (R-SP) — Рекрут</li>
        <li>Private SP (PVT-SP) — Рядовой</li>
        <li>Corporal SP (CPL-SP) — Младший сержант</li>
      </ul>
      <p><b>Сержантский состав:</b></p>
      <ul>
        <li>Sergeant SP (SGT-SP) — Сержант</li>
        <li>Staff Sergeant SP (SSGT-SP) — Старший сержант</li>
      </ul>
      <p><b>Офицерский состав:</b></p>
      <ul>
        <li>Officer SP (OFC-SP) — Офицер</li>
        <li>Deputy Commander SP (DEP-SP) — Заместитель командира</li>
        <li>Commander SP (CO-SP) — Командир взвода</li>
        <li>Curator SP (CUR-SP) — Куратор</li>
      </ul>
      <h3>Медали Ударного корпуса</h3>
      <ul>
        <li>🎖️ Медаль «За отвагу» — За исключительное мужество в бою</li>
        <li>🏅 Медаль «За верность» — За долгую и безупречную службу</li>
        <li>⭐ Звезда «Боевая» — За участие в боевых операциях</li>
        <li>📜 Грамота благодарности — За инициативность и добросовестность</li>
      </ul>
    `
  }
};

// ===== REPORT GENERATOR DATA =====
const REPORT_TEMPLATES = {
  event: {
    name: 'Обычный рапорт (Событие)',
    template: `Рапорт №[NUMBER]
[1] @
[2] @
[3] В каком событии Вы принимали участие: [EVENT]
[4] [DESCRIPTION]`
  },
  punishment: {
    name: 'Рапорт наказания (ДВ/ДН/СКТ)',
    template: `Рапорт наказания №[NUMBER]
[1] @
[2] @
[3] Тип наказания (ДВ/ДН/СКТ): [TYPE]
[4] @[👮] Ударный Клон
[5] Ссылка на доказательство: [LINK]`
  },
  search: {
    name: 'Подача в розыск',
    template: `Подача в розыск №[NUMBER]
[1] @
[2] @
[3] Причина розыска (Был задержан/Приказ/Прочее): [REASON]
[4] @[👮] Ударный Клон
[5] Ссылка из канала 《📚》доклады-ук: [LINK]`
  },
  reprimand: {
    name: 'Выговор УК',
    template: `Выговор УК №[NUMBER]
[1] @
[2] @
[3] Тип выговора (устный/письменный): [TYPE]
[4] Причина: [REASON]
[5] @[🗒️] Интендант УК`
  }
};

// ===== INITIALIZE DATABASE =====
function initializeDatabase() {
  const existing = localStorage.getItem(STORAGE_KEY);
  if (existing) return;

  const initialData = {
    users: [
      { id: '76561198000000001', nick: 'Admin', callsign: 'ADMIN', password: 'admin', role: 'site_admin' }
    ],
    reports: [],
    roles: {}
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(initialData));
}

function getDatabase() {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : { users: [], reports: [], roles: {} };
}

function saveDatabase(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ===== VIEW MANAGEMENT =====
function showView(viewName) {
  document.querySelectorAll('[data-view]').forEach(v => v.style.display = 'none');
  const view = document.querySelector(`[data-view="${viewName}"]`);
  if (view) view.style.display = 'block';
  
  document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
  document.querySelector(`[data-nav="${viewName}"]`)?.classList.add('active');
}

// ===== AUTHENTICATION =====
function login(steamId, password) {
  const db = getDatabase();
  const user = db.users.find(u => u.id === steamId);
  
  if (!user || user.password !== password) {
    alert('Неверный Steam ID или пароль');
    return false;
  }
  
  PersistentStorage.setSession(steamId);
  return true;
}

function register(steamId, nick, callsign, password) {
  const db = getDatabase();
  
  if (db.users.find(u => u.id === steamId)) {
    alert('Пользователь с таким Steam ID уже существует');
    return false;
  }
  
  db.users.push({
    id: steamId,
    nick: nick,
    callsign: callsign,
    password: password,
    role: 'recruit'
  });
  
  saveDatabase(db);
  PersistentStorage.setSession(steamId);
  return true;
}

function logout() {
  PersistentStorage.clearSession();
  location.reload();
}

// ===== REPORT GENERATION =====
function generateReport(type, data) {
  const template = REPORT_TEMPLATES[type].template;
  let report = template;
  
  const number = Math.floor(Math.random() * 1000);
  report = report.replace('[NUMBER]', number);
  
  Object.keys(data).forEach(key => {
    report = report.replace(`[${key.toUpperCase()}]`, data[key] || '');
  });
  
  return report;
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    alert('Рапорт скопирован в буфер обмена!');
  });
}

// ===== UI INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
  initializeDatabase();
  
  const currentUserId = PersistentStorage.getSession();
  const db = getDatabase();
  const currentUser = currentUserId ? db.users.find(u => u.id === currentUserId) : null;
  
  // Update UI based on auth status
  if (currentUser) {
    document.querySelector('.hero')?.style.display = 'none';
    document.querySelector('.profile-button')?.style.display = 'inline-block';
    document.querySelector('[data-nav="reports"]')?.style.display = 'block';
    document.querySelector('[data-nav="cabinet"]')?.style.display = 'block';
    
    showView('base');
  } else {
    showView('home');
  }
  
  // Modal tabs
  const loginTab = document.querySelector('[data-tab="login"]');
  const registerTab = document.querySelector('[data-tab="register"]');
  
  if (loginTab) {
    loginTab.addEventListener('click', () => {
      document.querySelectorAll('[data-tab-content]').forEach(el => el.style.display = 'none');
      document.querySelector('[data-tab-content="login"]').style.display = 'block';
      document.querySelectorAll('[data-tab]').forEach(el => el.classList.remove('active'));
      loginTab.classList.add('active');
    });
  }
  
  if (registerTab) {
    registerTab.addEventListener('click', () => {
      document.querySelectorAll('[data-tab-content]').forEach(el => el.style.display = 'none');
      document.querySelector('[data-tab-content="register"]').style.display = 'block';
      document.querySelectorAll('[data-tab]').forEach(el => el.classList.remove('active'));
      registerTab.classList.add('active');
    });
  }
  
  // Base section tabs
  document.querySelectorAll('[data-base-tab]').forEach(tab => {
    tab.addEventListener('click', (e) => {
      const tabName = e.target.dataset.baseTab;
      document.querySelectorAll('[data-base-content]').forEach(el => el.style.display = 'none');
      document.querySelector(`[data-base-content="${tabName}"]`).style.display = 'block';
      document.querySelectorAll('[data-base-tab]').forEach(el => el.classList.remove('active'));
      e.target.classList.add('active');
    });
  });
  
  // Profile edit
  document.querySelector('.profile-button')?.addEventListener('click', () => {
    if (currentUser) {
      document.querySelector('[data-modal="profile"]').style.display = 'block';
      document.querySelector('[name="edit-nick"]').value = currentUser.nick;
      document.querySelector('[name="edit-callsign"]').value = currentUser.callsign;
    }
  });
  
  // Report generation
  document.querySelectorAll('[data-report-type]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const type = e.target.dataset.reportType;
      const form = document.querySelector(`[data-report-form="${type}"]`);
      if (form) {
        const inputs = form.querySelectorAll('input, textarea');
        const data = {};
        inputs.forEach(input => {
          data[input.name] = input.value;
        });
        const report = generateReport(type, data);
        copyToClipboard(report);
      }
    });
  });
});
