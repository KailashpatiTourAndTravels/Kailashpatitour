(() => {
  const loginPanel = document.getElementById('login-panel');
  const dashboardPanel = document.getElementById('dashboard-panel');
  const loginForm = document.getElementById('admin-login-form');
  const loginMessage = document.getElementById('login-message');
  const counts = document.getElementById('admin-counts');
  const list = document.getElementById('admin-list');
  const endpoint = '/api/reviews-admin';

  async function callApi(action, values = {}) {
    const response = await fetch(endpoint, {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ action, ...values })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'The request could not be completed.');
    return result;
  }

  function showLogin(message = '') {
    loginPanel.hidden = false;
    dashboardPanel.hidden = true;
    loginMessage.textContent = message;
  }

  function render(data) {
    loginPanel.hidden = true;
    dashboardPanel.hidden = false;
    counts.replaceChildren();
    [['Pending', data.counts.pending], ['Approved', data.counts.approved], ['Rejected', data.counts.rejected], ['Total', data.counts.total]].forEach(([label, number]) => {
      const card = document.createElement('div'); card.className = 'admin-count';
      const strong = document.createElement('strong'); strong.textContent = String(number);
      const text = document.createElement('span'); text.textContent = `${label} reviews`;
      card.append(strong, text); counts.append(card);
    });
    list.replaceChildren();
    if (!data.reviews.length) {
      const empty = document.createElement('p'); empty.className = 'admin-empty'; empty.textContent = 'No customer reviews have been submitted yet.'; list.append(empty); return;
    }
    data.reviews.forEach(review => {
      const card = document.createElement('article'); card.className = 'admin-review';
      const head = document.createElement('div'); head.className = 'admin-review-head';
      const info = document.createElement('div');
      const name = document.createElement('h3'); name.textContent = review.name;
      const meta = document.createElement('div'); meta.className = 'admin-review-meta';
      const submitted = new Date(review.submittedAt);
      meta.textContent = `${review.destination} · ${Number.isNaN(submitted.valueOf()) ? '' : submitted.toLocaleString()}`;
      const stars = document.createElement('div'); stars.className = 'admin-stars'; stars.setAttribute('aria-label', `${review.rating} out of 5 stars`); stars.textContent = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
      info.append(name, meta, stars);
      const badge = document.createElement('span'); badge.className = `admin-status ${review.status}`; badge.textContent = review.status;
      head.append(info, badge);
      const text = document.createElement('p'); text.textContent = review.review;
      const actions = document.createElement('div');
      actions.className = 'admin-actions';
      if (review.status !== 'approved') actions.append(actionButton('Approve', 'approve', review.id));
      if (review.status !== 'rejected') actions.append(actionButton('Reject', 'reject', review.id));
      actions.append(actionButton('Delete', 'delete', review.id));
      card.append(head, text, actions);
      list.append(card);
    });
  }

  function actionButton(label, action, id) {
    const button = document.createElement('button');
    button.type = 'button'; button.textContent = label; button.className = action;
    button.addEventListener('click', async () => {
      if (action === 'delete' && !window.confirm('Permanently delete this customer review?')) return;
      button.disabled = true;
      try { await callApi(action, { id }); await refresh(); }
      catch (error) { window.alert(error.message); button.disabled = false; }
    });
    return button;
  }

  async function refresh() {
    try { render(await callApi('list')); }
    catch (error) {
      if (/authentication required/i.test(error.message)) showLogin();
      else window.alert(error.message);
    }
  }

  loginForm.addEventListener('submit', async event => {
    event.preventDefault(); loginMessage.textContent = '';
    const password = new FormData(loginForm).get('password');
    const button = loginForm.querySelector('button'); button.disabled = true;
    try { await callApi('login', { password }); loginForm.reset(); await refresh(); }
    catch (error) { loginMessage.textContent = error.message; }
    finally { button.disabled = false; }
  });
  document.getElementById('admin-refresh').addEventListener('click', refresh);
  document.getElementById('admin-logout').addEventListener('click', async () => {
    try { await callApi('logout'); } finally { showLogin('Signed out.'); }
  });
  refresh();
})();
