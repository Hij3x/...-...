
import {
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
} from './config.js';

import { createClient } from
  'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true
    }
  }
);

let unlocked = false;
let checking = false;

const css = document.createElement('style');
css.textContent = `
  #pinOverlay {
    position:fixed;
    inset:0;
    z-index:99999;
    background:#f8f5ff;
    display:flex;
    align-items:center;
    justify-content:center;
    padding:20px;
    font-family:system-ui,sans-serif;
  }
  .pinBox {
    background:white;
    padding:28px;
    border-radius:25px;
    width:100%;
    max-width:370px;
    text-align:center;
    box-shadow:0 8px 35px #0001;
  }
  .pinBox h1 { color:#8056d7; }
  .pinBox input {
    width:100%;
    padding:16px;
    font-size:24px;
    text-align:center;
    letter-spacing:12px;
    border:2px solid #ddd;
    border-radius:14px;
    box-sizing:border-box;
  }
  .pinBox button,.pinSettings button {
    padding:14px;
    background:#8056d7;
    color:white;
    border:0;
    border-radius:12px;
    margin-top:12px;
    font-size:16px;
    cursor:pointer;
  }
  .pinBox button { width:100%; }
  .pinError { color:#c0392b; }
  .pinSettings {
    background:white;
    border-radius:20px;
    padding:20px;
    margin:18px 0;
  }
  .pinSettings input {
    padding:12px;
    width:100%;
    box-sizing:border-box;
    border:1px solid #ccc;
    border-radius:10px;
    font-size:18px;
  }
`;
document.head.appendChild(css);

function showPin() {
  if (unlocked || document.getElementById('pinOverlay')) {
    return;
  }

  const overlay = document.createElement('div');
  overlay.id = 'pinOverlay';

  overlay.innerHTML = `
    <div class="pinBox">
      <div style="font-size:60px">🌈</div>
      <h1>Hi Zayd! 👋</h1>
      <p>Enter your secret 4-digit code ⭐</p>
      <form id="childPinForm">
        <input
          id="childPin"
          type="password"
          inputmode="numeric"
          pattern="[0-9]{4}"
          maxlength="4"
          autocomplete="off"
          required
          placeholder="••••"
        >
        <button type="submit">Let's Go! 🚀</button>
      </form>
      <p id="pinMessage" class="pinError"></p>
    </div>
  `;

  document.body.appendChild(overlay);

  document.getElementById('childPinForm')
    .addEventListener('submit', async event => {
      event.preventDefault();

      if (checking) return;
      checking = true;

      const button = event.target.querySelector('button');
      const message = document.getElementById('pinMessage');
      const pin = document.getElementById('childPin').value;

      button.disabled = true;
      message.textContent = 'Checking...';

      try {
        const { data, error } = await supabase.rpc(
          'hd_verify_child_pin',
          { p_pin: pin }
        );

        if (error) throw error;

        if (data === true) {
          unlocked = true;
          overlay.remove();
        } else {
          message.textContent =
            'Wrong code or temporarily locked. Try again later.';
          document.getElementById('childPin').value = '';
        }
      } catch (error) {
        message.textContent = error.message;
      } finally {
        checking = false;
        button.disabled = false;
      }
    });
}

function addParentSettings() {
  if (document.getElementById('childPinSettings')) return;

  const root = document.getElementById('app');
  if (!root || !root.textContent.includes("Zayd’s Progress")) return;

  const panel = document.createElement('section');
  panel.id = 'childPinSettings';
  panel.className = 'pinSettings';

  panel.innerHTML = `
    <h2>🔐 Zayd's PIN Settings</h2>
    <p>Set or change his permanent 4-digit code.</p>
    <form id="setChildPinForm">
      <input
        id="newChildPin"
        type="password"
        inputmode="numeric"
        pattern="[0-9]{4}"
        maxlength="4"
        placeholder="New 4-digit PIN"
        autocomplete="new-password"
        required
      >
      <button type="submit">Save Zayd's PIN</button>
    </form>
    <p id="savePinMessage"></p>
  `;

  root.appendChild(panel);

  panel.querySelector('form').addEventListener(
    'submit', async event => {
      event.preventDefault();

      const pin = panel.querySelector('input').value;
      const message = panel.querySelector('#savePinMessage');

      message.textContent = 'Saving...';

      const { error } = await supabase.rpc(
        'hd_set_child_pin',
        { p_pin: pin }
      );

      message.textContent = error
        ? error.message
        : '✅ PIN saved successfully!';

      if (!error) panel.querySelector('input').value = '';
    }
  );
}

async function updateScreen() {
  const root = document.getElementById('app');
  if (!root) return;

  const { data } = await supabase.auth.getSession();

  if (!data.session) return;

  const text = root.textContent || '';

  if (text.includes("Zayd’s Progress")) {
    document.getElementById('pinOverlay')?.remove();
    addParentSettings();
    return;
  }

  // The original app's paired child dashboard.
  if (
    text.includes('My Star Bank') ||
    text.includes('Star Power!')
  ) {
    showPin();
  }
}

let scheduled = false;
const observer = new MutationObserver(() => {
  if (scheduled) return;
  scheduled = true;

  setTimeout(async () => {
    scheduled = false;
    await updateScreen();
  }, 100);
});

observer.observe(document.body, {
  childList:true,
  subtree:true
});

updateScreen();
