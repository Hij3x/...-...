
import {
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
} from './config.js';

import {
  createClient
} from 'https://esm.sh/@supabase/supabase-js@2';

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

function addPinSettings() {
  const root = document.getElementById('app');

  if (!root) return;

  // Only show inside the Parent Dashboard.
  if (!root.textContent.includes("Zayd’s Progress")) {
    return;
  }

  if (document.getElementById('pinSettingsPanel')) {
    return;
  }

  const panel = document.createElement('div');

  panel.id = 'pinSettingsPanel';
  panel.className = 'card';

  panel.innerHTML = `
    <h3>🔐 Zayd's Permanent PIN</h3>

    <p class="small">
      Set or change Zayd's 4-digit PIN.
      He can use it to connect a new device.
    </p>

    <form id="permanentPinForm">
      <label class="label">
        New 4-digit PIN

        <input
          class="field"
          type="password"
          name="pin"
          inputmode="numeric"
          maxlength="4"
          pattern="[0-9]{4}"
          autocomplete="new-password"
          required
        >
      </label>

      <button class="btn full" type="submit">
        Save PIN 🔐
      </button>
    </form>

    <p id="pinSaveStatus" class="small"></p>
  `;

  root.appendChild(panel);

  panel.querySelector('form').addEventListener(
    'submit',
    async event => {
      event.preventDefault();

      const form = event.currentTarget;
      const pin = new FormData(form).get('pin');
      const status = panel.querySelector(
        '#pinSaveStatus'
      );

      status.textContent = 'Saving...';

      try {
        const { data, error } =
          await supabase.rpc(
            'hd_set_child_pin',
            { p_pin: pin }
          );

        if (error) throw error;

        if (data !== true) {
          throw new Error('PIN was not saved.');
        }

        status.textContent =
          '✅ PIN saved successfully!';

        form.reset();

      } catch (error) {
        status.textContent =
          '❌ ' + error.message;
      }
    }
  );
}

let scheduled = false;

const observer = new MutationObserver(() => {
  if (scheduled) return;

  scheduled = true;

  setTimeout(() => {
    scheduled = false;
    addPinSettings();
  }, 100);
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

addPinSettings();
