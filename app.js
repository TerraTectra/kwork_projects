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
    this.setCookie('session_user_id', '', -1);
  }

  static setCookie(name, value, days) {
    let expires = "";
    if (days) {
      let date = new Date();
      date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
      expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/";
  }

  static getCookie(name) {
    let nameEQ = name + "=";
    let ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) == ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
  }
}

// ===== DATABASE CONTENT =====
window.BASE_SECTIONS = {
  promotion: {
    title: 'Система повышения',
    content: `
      <h3>Система повышения и поощрений</h3>
      <p><b>СЕРЖАНТСКИЙ СОСТАВ:</b></p>
      <p>Сержантский состав является основой взвода. Повышение происходит на основе балловой системы и активного участия в жизни взвода.</p>
      <h4>[1] Этап: Рекрут -> Рядовой</h4>
      <ul>
        <li>Прохождение базового курса обучения (БКО).</li>
        <li>Сдача регламента оружия и основ субординации.</li>
        <li>Участие в 1 тренировке.</li>
      </ul>
      <h4>[2] Этап: Рядовой -> Капрал</h4>
      <ul>
        <li>Сдача расширенного курса (РКО).</li>
        <li>Участие в 2 патрулях.</li>
        <li>Набор 20 баллов.</li>
      </ul>
      <h4>[3] Этап: Капрал -> Сержант</h4>
      <ul>
        <li>Прохождение сержантской школы.</li>
        <li>Участие в 3 операциях.</li>
        <li>Набор 40 баллов.</li>
      </ul>
      <p><b>СИСТЕМА ПООЩРЕНИЙ:</b></p>
      <ul>
        <li>Благодарность в личное дело: +5 баллов.</li>
        <li>Успешное выполнение спецоперации: +10 баллов.</li>
        <li>Обучение рекрутов: +7 баллов за каждого бойца.</li>
      </ul>
    `
  },
  legal: {
    title: 'Нормативно-правовой блок',
    content: `
      <h3>Нормативно-Правовой Блок ВАР</h3>
      <p><b>ЗОЛОТЫЕ ПРАВИЛА УК:</b></p>
      <ol>
        <li>Приказ командира — закон.</li>
        <li>Ударный клон всегда на страже порядка.</li>
        <li>Соблюдение субординации обязательно для всех.</li>
      </ol>
      <p><b>ВОИНСКИЙ ЭТИКЕТ (ВЭ):</b></p>
      <ul>
        <li>Обращение к старшему только на «Вы» и по званию.</li>
        <li>Приветствие осуществляется воинским салютом.</li>
        <li>Запрещено использование нецензурной лексики.</li>
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
      <ol>
        <li>Разрешено предотвращать нарушения - заломать руки и положить бойца на пол, после вызвать гвардию.</li>
        <li>Разрешено носить форму УК только со 2-го этапа обучения на SP.</li>
        <li>Запрещено носить вооружение в ЗК.</li>
        <li>Запрещено свободное посещение КПЗ для доставки нарушителей.</li>
        <li>R-SP|CT в звании CPL обязуется повыситься до SGT в течение 7 дней.</li>
      </ol>
    `
  },
  ethics: {
    title: 'Этика Ударника',
    content: `
      <h3>Этика Ударного клона</h3>
      <h4>[1] Независимость и объективность</h4>
      <p>Ударный клон должен действовать независимо от внешних влияний.</p>
      <h4>[2] Соблюдение законности</h4>
      <p>Ударный клон должен соблюдать устав и иные документы.</p>
      <h4>[3] Профессионализм</h4>
      <p>Высокий уровень знаний и навыков.</p>
      <h4>[4] Уважение</h4>
      <p>Уважение любого члена формирования, вне зависимости от нарушения.</p>
    `
  },
  hierarchy: {
    title: 'Иерархия и медали',
    content: `
      <h3>Иерархия Ударного взвода</h3>
      <p><b>Рядовой состав:</b> Recruit SP, Private SP, Corporal SP.</p>
      <p><b>Сержантский состав:</b> Sergeant SP, Staff Sergeant SP.</p>
      <p><b>Офицерский состав:</b> Officer SP, Deputy Commander SP, Commander SP, Curator SP.</p>
      <h3>Медали Ударного корпуса</h3>
      <ul>
        <li>🎖️ Медаль «За отвагу»</li>
        <li>🏅 Медаль «За верность»</li>
        <li>⭐ Звезда «Боевая»</li>
      </ul>
    `
  }
};

window.DECREES_DATA = [
  { title: "Постановление №1: О рации", body: "Все бойцы обязаны находиться на основной частоте взвода во время службы." },
  { title: "Постановление №2: О докладах", body: "Доклады о состоянии постов каждые 15 минут." },
  { title: "Постановление №3: О форме", body: "Ношение неуставной формы в ЗК запрещено." }
];

// ===== DATABASE CORE =====
function initializeDatabase() {
  if (!localStorage.getItem(STORAGE_KEY)) {
    const initialDB = {
      users: [
        { id: '76561198000000001', nick: 'Владелец сайта', callsign: 'Site Admin', password: 'admin', role: 'site_admin' }
      ],
      reports: [],
      roles: {}
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initialDB));
  }
}

function getDatabase() {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : { users: [], reports: [], roles: {} };
}

function saveDatabase(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
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

// ===== UI LOGIC =====
function updateUI() {
  const currentUserId = PersistentStorage.getSession();
  const db = getDatabase();
  const user = currentUserId ? db.users.find(u => u.id === currentUserId) : null;
  
  const guestStatus = document.querySelector('.hero-status .status-card');
  const navBase = document.querySelector('[data-nav="base"]');
  const navReports = document.querySelector('[data-nav="reports"]');
  const navCabinet = document.querySelector('[data-nav="cabinet"]');
  const profileBtn = document.getElementById('profileBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const heroButtons = document.querySelector('.hero-buttons');
  const heroSection = document.querySelector('.hero');

  if (user) {
    // Logged in
    if (guestStatus) {
      guestStatus.innerHTML = `
        <div class="status-indicator online"></div>
        <h3>${user.nick}</h3>
        <p>${user.callsign}</p>
        <p>${roleByKey(user.role).title}</p>
      `;
    }
    
    if (navBase) navBase.style.display = 'block';
    if (navReports) navReports.style.display = 'block';
    
    const role = roleByKey(user.role);
    if (navCabinet && role.canEdit) navCabinet.style.display = 'block';
    
    if (profileBtn) profileBtn.hidden = false;
    if (logoutBtn) logoutBtn.hidden = false;
    
    if (heroButtons) {
      heroButtons.innerHTML = `<button class="btn primary" onclick="switchView('base')">Перейти в Базу</button>`;
    }
  } else {
    // Guest
    if (navBase) navBase.style.display = 'none';
    if (navReports) navReports.style.display = 'none';
    if (navCabinet) navCabinet.style.display = 'none';
    if (profileBtn) profileBtn.hidden = true;
    if (logoutBtn) logoutBtn.hidden = true;
  }
}

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
  initializeDatabase();
  updateUI();
  
  // Decrees population
  const decreeList = document.getElementById('decreeList');
  const decreeFullList = document.getElementById('decreeFullList');
  if (decreeList && window.DECREES_DATA) {
    decreeList.innerHTML = window.DECREES_DATA.map(d => `<div class="decree-card"><h3>${d.title}</h3><p>${d.body}</p></div>`).join('');
  }
  if (decreeFullList && window.DECREES_DATA) {
    decreeFullList.innerHTML = window.DECREES_DATA.map(d => `<div class="decree-card"><h3>${d.title}</h3><p>${d.body}</p></div>`).join('');
  }

  // Base Content population
  if (window.BASE_SECTIONS) {
    Object.keys(window.BASE_SECTIONS).forEach(key => {
      const el = document.querySelector(`[data-base-content="${key}"]`);
      if (el) el.innerHTML = window.BASE_SECTIONS[key].content;
    });
  }
});
