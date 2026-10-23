document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('travel-enquiry-form');
  if (!form) return;

  const states = [
    'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal',
    'Andaman and Nicobar Islands','Chandigarh','Dadra and Nagar Haveli and Daman and Diu','Delhi','Jammu and Kashmir','Ladakh','Lakshadweep','Puducherry'
  ];
  const stateSelect = document.getElementById('enquiry-state');
  const destinationStep = document.getElementById('destination-step');
  const datesStep = document.getElementById('dates-step');
  const contactStep = document.getElementById('contact-step');
  const destinationGrid = document.getElementById('destination-grid');
  const destinationEmpty = document.getElementById('destination-empty');
  const destinationSearch = document.getElementById('destination-search');
  const startInput = document.getElementById('travel-start');
  const endInput = document.getElementById('travel-end');
  const duration = document.getElementById('trip-duration');
  const dateError = document.getElementById('date-error');
  const submitButton = document.getElementById('enquiry-submit');
  const status = document.getElementById('enquiry-status');
  const phone = document.getElementById('customer-phone');
  let destinations = [];
  let requestId = crypto.randomUUID();
  let submitting = false;
  let submitted = false;

  const today = new Intl.DateTimeFormat('en-CA', {timeZone: 'Asia/Kolkata'}).format(new Date());
  startInput.min = today;
  endInput.min = today;
  states.forEach(name => stateSelect.add(new Option(name, name)));

  const getSelectedDestination = () => destinations.find(place => place.id === form.elements.destinationId?.value);
  const normalizedPhone = () => phone.value.replace(/[\s().-]/g, '');
  const validPhone = () => /^\+[1-9]\d{7,14}$/.test(normalizedPhone());
  const datesValid = () => Boolean(startInput.value && endInput.value && startInput.value >= today && endInput.value >= startInput.value);
  const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

  function updateProgress() {
    const dateOk = datesValid();
    const rawTravelers = document.getElementById('travellers').value;
    const travelersOk = !rawTravelers || (Number(rawTravelers) >= 1 && Number(rawTravelers) <= 100);
    const emailInput = document.getElementById('customer-email');
    const emailOk = !emailInput.value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value.trim());
    const valid = Boolean(getSelectedDestination() && dateOk && document.getElementById('customer-name').value.trim().length >= 2 &&
      validPhone() && emailOk &&
      travelersOk && document.getElementById('contact-consent').checked && !form.elements.website.value && !submitting && !submitted);
    submitButton.disabled = !valid;
    if (phone.value && !validPhone()) document.getElementById('phone-error').textContent = 'Enter a valid WhatsApp number with country code, such as +91 98765 43210.';
    else document.getElementById('phone-error').textContent = '';
    if (rawTravelers && !travelersOk) document.getElementById('travellers').setCustomValidity('Enter a number from 1 to 100.');
    else document.getElementById('travellers').setCustomValidity('');
    document.getElementById('travellers-error').textContent = rawTravelers && !travelersOk ? 'Enter a traveller count from 1 to 100.' : '';
    emailInput.setCustomValidity(emailOk ? '' : 'Enter a valid email address or leave it blank.');
    document.getElementById('email-error').textContent = emailInput.value && !emailOk ? 'Enter a valid email address or leave it blank.' : '';
  }

  function clearDependentFields() {
    submitted = false;
    form.querySelectorAll('input[name="destinationId"]').forEach(input => { input.checked = false; });
    startInput.value = '';
    endInput.value = '';
    duration.textContent = '';
    dateError.textContent = '';
    endInput.min = today;
    form.querySelectorAll('#customer-name, #customer-phone, #customer-email, #travellers, #requirements').forEach(input => { input.value = ''; });
    document.getElementById('contact-consent').checked = false;
    document.getElementById('phone-error').textContent = '';
    document.getElementById('email-error').textContent = '';
    document.getElementById('travellers-error').textContent = '';
    destinationSearch.value = '';
    datesStep.hidden = true;
    contactStep.hidden = true;
    status.textContent = '';
    status.className = 'enquiry-status';
    updateProgress();
  }

  function renderDestinationChoices() {
    const state = stateSelect.value;
    const query = destinationSearch.value.trim().toLocaleLowerCase();
    const matches = destinations.filter(place => place.state === state &&
      [place.name, ...(place.aliases || []), ...(place.categories || []), ...(place.tags || []), place.description].filter(Boolean).join(' ').toLocaleLowerCase().includes(query));
    destinationGrid.innerHTML = matches.map(place => {
      const image = place.image_url
        ? `<img src="${escapeHTML(place.image_url)}" alt="${escapeHTML(place.image_alt || `Scenery at ${place.name}`)}" loading="lazy" decoding="async">`
        : '<span class="destination-placeholder" aria-hidden="true"><i class="fas fa-map-marked-alt"></i></span>';
      const category = (place.categories || []).slice(0, 2).map(value => `<span class="destination-category">${escapeHTML(value.replace(/[-_]/g, ' '))}</span>`).join('');
      return `<label class="destination-choice"><input type="radio" name="destinationId" value="${escapeHTML(place.id)}" required><span class="destination-choice-card">${image}<span class="destination-choice-copy"><strong>${escapeHTML(place.name)}</strong><span class="destination-choice-location">${escapeHTML([place.city, place.district, place.state].filter(Boolean).join(', '))}</span><span class="destination-choice-description">${escapeHTML(place.description)}</span><span class="destination-categories">${category}</span></span></span></label>`;
    }).join('');
    destinationEmpty.hidden = matches.length > 0;
    destinationGrid.hidden = matches.length === 0;
    if (!matches.length) destinationEmpty.innerHTML = destinations.some(place => place.state === state)
      ? 'No matching destination. Try another name or alias.'
      : `We don’t have a verified destination for ${state} yet. Please call <a href="tel:+919135839746">9135839746</a> and our team can discuss your trip.`;
  }

  stateSelect.addEventListener('change', () => {
    clearDependentFields();
    destinationGrid.innerHTML = '';
    destinationStep.hidden = !stateSelect.value;
    if (stateSelect.value) renderDestinationChoices();
  });
  destinationSearch.addEventListener('input', renderDestinationChoices);
  destinationGrid.addEventListener('change', event => {
    if (event.target.name !== 'destinationId') return;
    startInput.value = '';
    endInput.value = '';
    duration.textContent = '';
    dateError.textContent = '';
    datesStep.hidden = false;
    contactStep.hidden = true;
    datesStep.scrollIntoView({behavior: 'smooth', block: 'nearest'});
    updateProgress();
  });

  function validateDates() {
    const start = startInput.value;
    const end = endInput.value;
    endInput.min = start || today;
    if (!start || !end) {
      dateError.textContent = '';
      duration.textContent = '';
      contactStep.hidden = true;
      updateProgress();
      return;
    }
    if (start < today || end < start) {
      dateError.textContent = end < start ? 'End date cannot be earlier than the start date.' : 'Choose today or a future date.';
      duration.textContent = '';
      contactStep.hidden = true;
      updateProgress();
      return;
    }
    const dayCount = Math.round((new Date(`${end}T00:00:00`) - new Date(`${start}T00:00:00`)) / 86400000) + 1;
    dateError.textContent = '';
    duration.textContent = `${dayCount} ${dayCount === 1 ? 'day' : 'days'} trip`;
    contactStep.hidden = false;
    updateProgress();
  }
  startInput.addEventListener('change', validateDates);
  endInput.addEventListener('change', validateDates);

  form.addEventListener('input', updateProgress);
  form.addEventListener('change', updateProgress);
  form.addEventListener('submit', async event => {
    event.preventDefault();
    updateProgress();
    if (submitButton.disabled || !form.reportValidity()) return;
    const place = getSelectedDestination();
    if (!place) return;
    submitting = true;
    status.textContent = 'Submitting your enquiry…';
    updateProgress();
    const payload = {
      requestId,
      state: stateSelect.value,
      destinationId: place.id,
      startDate: startInput.value,
      endDate: endInput.value,
      name: document.getElementById('customer-name').value.trim(),
      phone: normalizedPhone(),
      email: document.getElementById('customer-email').value.trim(),
      travellers: document.getElementById('travellers').value ? Number(document.getElementById('travellers').value) : null,
      requirements: document.getElementById('requirements').value.trim(),
      consent: document.getElementById('contact-consent').checked,
      website: form.elements.website.value
    };
    try {
      const response = await fetch('/api/enquiries', {
        method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload)
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (result.fields?.phone) document.getElementById('phone-error').textContent = result.fields.phone;
        if (result.fields?.startDate || result.fields?.endDate) dateError.textContent = result.fields.startDate || result.fields.endDate;
        throw new Error(result.error || 'We could not submit your enquiry. Please try again.');
      }
      requestId = crypto.randomUUID();
      submitted = true;
      status.className = 'enquiry-status success';
      status.textContent = `Thank you for choosing Kailashpati Tour & Travels! Your travel enquiry has been submitted successfully. Our team will contact you to discuss your trip details and quotation. Reference: ${result.reference}.`;
      if (result.notificationStatus !== 'sent' && result.whatsappFallbackUrl) {
        const fallback = document.createElement('a');
        fallback.className = 'btn btn-whatsapp fallback-whatsapp';
        fallback.href = result.whatsappFallbackUrl;
        fallback.target = '_blank';
        fallback.rel = 'noopener noreferrer';
        fallback.textContent = 'Send enquiry to our WhatsApp';
        const note = document.createElement('p');
        note.className = 'field-help';
        note.textContent = 'Your enquiry is saved. This will open WhatsApp with a message to our team; press Send in WhatsApp to deliver it.';
        status.append(note, fallback);
      } else if (result.notificationStatus !== 'sent') {
        const note = document.createElement('p');
        note.className = 'field-help';
        note.textContent = 'Your enquiry is saved. Our team notification is not configured yet.';
        status.append(note);
      }
      submitButton.disabled = true;
    } catch (error) {
      status.className = 'enquiry-status error';
      status.textContent = `${error.message} Your details are still here; you can retry.`;
    } finally {
      submitting = false;
      updateProgress();
    }
  });

  fetch('/data/destinations.published.json')
    .then(response => { if (!response.ok) throw new Error('Destination data unavailable'); return response.json(); })
    .then(data => { destinations = Array.isArray(data) ? data.filter(place => place.verification_status === 'verified') : []; })
    .catch(() => { destinations = []; });
});
