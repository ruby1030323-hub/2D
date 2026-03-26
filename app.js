/**
 * Senior Front-end Developer's Note:
 * 使用 Async/Await 來模擬文字冒險遊戲的時序，
 * 並透過強制 Reflow 技術確保 CSS 動畫能被重複觸發。
 */

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 遊戲狀態
const state = {
    player: { hp: 150, maxHp: 150, atk: 700 },
    boss: { hp: 10000, maxHp: 10000, atk: 35, isStunned: false },
    cooldowns: { rm: 0, ctrlc: 0 },
    isGameOver: false,
    turnLocked: true
};

// 資源網址
const IMAGES = {
    rimuru: 'https://raw.githubusercontent.com/ruby1030323-hub/2D/main/103.png',
    milim: 'https://raw.githubusercontent.com/ruby1030323-hub/2D/main/1032.png'
};

// DOM 快取
const DOM = {
    prologueScreen: document.getElementById('prologue-screen'),
    prologueImg: document.getElementById('prologue-img'),
    prologueText: document.getElementById('prologue-text'),
    gameScreen: document.getElementById('game-screen'),
    log: document.getElementById('log-container'),
    boss: { wrapper: document.getElementById('boss-wrapper'), hpBar: document.getElementById('boss-hp-bar'), hpText: document.getElementById('boss-hp-text') },
    player: { wrapper: document.getElementById('player-wrapper'), hpBar: document.getElementById('player-hp-bar'), hpText: document.getElementById('player-hp-text') },
    btns: { attack: document.getElementById('btn-attack'), rm: document.getElementById('btn-rm'), ctrlc: document.getElementById('btn-ctrlc'), heal: document.getElementById('btn-heal') }
};

// 系統功能：更新 UI
function updateUI() {
    state.player.hp = Math.max(0, Math.min(state.player.maxHp, state.player.hp));
    state.boss.hp = Math.max(0, state.boss.hp);

    const pPct = (state.player.hp / state.player.maxHp) * 100;
    const bPct = (state.boss.hp / state.boss.maxHp) * 100;

    DOM.player.hpBar.style.width = `${pPct}%`;
    DOM.player.hpText.innerText = `${Math.floor(state.player.hp)} / ${state.player.maxHp}`;
    
    DOM.boss.hpBar.style.width = `${bPct}%`;
    DOM.boss.hpText.innerText = `${Math.floor(state.boss.hp)} / ${state.boss.maxHp}`;

    // 更新 CD 狀態
    DOM.btns.rm.innerHTML = `sudo rm -rf /${state.cooldowns.rm > 0 ? `<br>[CD:${state.cooldowns.rm}]` : ''}`;
    DOM.btns.ctrlc.innerHTML = `Ctrl+C${state.cooldowns.ctrlc > 0 ? `<br>[CD:${state.cooldowns.ctrlc}]` : ''}`;
    
    DOM.btns.attack.disabled = state.turnLocked;
    DOM.btns.heal.disabled = state.turnLocked;
    DOM.btns.rm.disabled = state.turnLocked || state.cooldowns.rm > 0;
    DOM.btns.ctrlc.disabled = state.turnLocked || state.cooldowns.ctrlc > 0;
}

// 核心動畫控制
function playAnim(el, name, duration = '0.5s') {
    el.style.animation = 'none';
    void el.offsetWidth; // 強制瀏覽器重繪 (Reflow)
    el.style.animation = `${name} ${duration} forwards`;
}

function writeLog(text, type = 'sys') {
    const div = document.createElement('div');
    div.className = `log-msg log-${type}`;
    div.innerText = `[${new Date().toLocaleTimeString('en-GB', {hour12:false})}] > ${text}`;
    DOM.log.prepend(div);
}

// ================= 前言流程 =================
async function runPrologue() {
    // 階段 1：利姆路加班
    DOM.prologueImg.src = IMAGES.rimuru;
    DOM.prologueImg.className = 'glow-green';
    DOM.prologueImg.style.display = 'block';
    DOM.prologueImg.style.opacity = '1';
    
    await typeText("利姆路正在坦派斯特中央伺服器進行例行維護...\n「呼...這行代碼改完就能去休息了吧。」");
    await sleep(2000);

    // 階段 2：異常發生
    DOM.prologueImg.style.opacity = '0';
    await sleep(1000);
    
    DOM.prologueImg.src = IMAGES.milim;
    DOM.prologueImg.className = 'glow-red-glitch';
    DOM.prologueImg.style.opacity = '1';
    
    await typeText("【致命錯誤：偵測到非授權實體登入】\n「利姆路！聽說你在做很有趣的東西，我也要玩！」\n破壞暴君 蜜莉姆 加入了連線。");
    await sleep(2000);

    // 進入遊戲
    DOM.prologueScreen.style.display = 'none';
    DOM.gameScreen.style.display = 'flex';
    writeLog("初始化戰鬥環境... 成功。", "sys");
    state.turnLocked = false;
    updateUI();
}

async function typeText(text) {
    DOM.prologueText.innerText = "";
    for(let char of text) {
        DOM.prologueText.innerText += char;
        await sleep(40);
    }
}

// ================= 戰鬥邏輯 =================
async function executeAction(action) {
    if (state.turnLocked || state.isGameOver) return;
    state.turnLocked = true;
    const isMobile = window.innerWidth <= 768;

    // 玩家行為
    if (action === 'attack') {
        writeLog("執行 std::attack()...", "sys");
        playAnim(DOM.player.wrapper, isMobile ? 'dash-up' : 'dash-left');
        await sleep(300);
        dealDamage('boss', state.player.atk);
    } 
    else if (action === 'rm') {
        writeLog("警告：正在執行高風險指令 sudo rm -rf /", "dmg");
        playAnim(DOM.player.wrapper, isMobile ? 'dash-up' : 'dash-left');
        await sleep(300);
        dealDamage('boss', state.player.atk * 2.5);
        state.cooldowns.rm = 3; // 冷卻 2 回合 (執行後下回合減 1)
    }
    else if (action === 'ctrlc') {
        writeLog("發送 SIGINT 訊號。蜜莉姆的進程陷入停頓！", "sys");
        dealDamage('boss', 50);
        state.boss.isStunned = true;
        state.cooldowns.ctrlc = 4;
    }
    else if (action === 'heal') {
        writeLog("執行恢復程序 debug_heal()...", "sys");
        state.player.hp += 60;
        updateUI();
    }

    await sleep(1000);
    if (checkEnd()) return;

    // 魔王回合
    await bossTurn();
}

function dealDamage(target, base) {
    const dmg = Math.floor(base * (0.9 + Math.random() * 0.2));
    if (target === 'boss') {
        state.boss.hp -= dmg;
        playAnim(DOM.boss.wrapper, 'glitch-fx');
        writeLog(`蜜莉姆 受損: ${dmg} 點`, "sys");
    } else {
        state.player.hp -= dmg;
        playAnim(DOM.player.wrapper, 'glitch-fx');
        writeLog(`利姆路 系統受損: ${dmg} 點`, "dmg");
    }
    updateUI();
}

async function bossTurn() {
    if (state.boss.isStunned) {
        writeLog("蜜莉姆 的進程處於掛起狀態，本回合無法行動。", "sys");
        state.boss.isStunned = false;
    } else {
        writeLog("蜜莉姆 發動『龍星爆炎 (Dragon Buster)』！", "dmg");
        const isMobile = window.innerWidth <= 768;
        playAnim(DOM.boss.wrapper, isMobile ? 'dash-down' : 'dash-right');
        await sleep(300);
        dealDamage('player', state.boss.atk);
    }

    // 冷卻遞減
    if (state.cooldowns.rm > 0) state.cooldowns.rm--;
    if (state.cooldowns.ctrlc > 0) state.cooldowns.ctrlc--;

    await sleep(800);
    if (checkEnd()) return;

    state.turnLocked = false;
    updateUI();
    writeLog("等待使用者輸入指令...", "sys");
}

function checkEnd() {
    if (state.boss.hp <= 0) {
        writeLog("關鍵進程終止。蜜莉姆 被強制登出！你贏了。", "sys");
        playAnim(DOM.boss.wrapper, 'death-fall', '1.5s');
        state.isGameOver = true;
        return true;
    }
    if (state.player.hp <= 0) {
        writeLog("核心崩潰。利姆路 被格式化了... GAME OVER", "dmg");
        playAnim(DOM.player.wrapper, 'death-fall', '1.5s');
        state.isGameOver = true;
        return true;
    }
    return false;
}

// 啟動
window.onload = runPrologue;