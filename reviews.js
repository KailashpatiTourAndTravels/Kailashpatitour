(() => {
  const form = document.getElementById('customer-review-form');
  if (!form) return;
  const endpoint = '/api/reviews';
  const track = document.getElementById('review-track');
  const dots = document.getElementById('review-dots');
  const empty = document.getElementById('review-empty');
  const status = document.getElementById('review-form-status');
  const destination = document.getElementById('review-destination');
  const customWrap = document.getElementById('review-custom-wrap');
  const customInput = document.getElementById('review-custom-destination');
  const customError = document.getElementById('review-custom-error');
  const ratingError = document.getElementById('review-rating-error');
  const ratingInputs = [...form.querySelectorAll('input[name="rating"]')];
  const reviewText = document.getElementById('review-text');
  const statusText = (message, isError = false) => {
    status.textContent = message;
    status.dataset.error = String(isError);
  };

  destination.addEventListener('change', () => {
    const custom = destination.value === 'Other';
    customWrap.hidden = !custom;
    customInput.required = custom;
    customInput.setCustomValidity('');
    customInput.removeAttribute('aria-invalid');
    customError.hidden = true;
    if (!custom) customInput.value = '';
  });
  customInput.addEventListener('input', () => {
    const invalid = customInput.required && customInput.value.trim().length < 2;
    customInput.setCustomValidity(invalid ? 'Please enter the destination.' : '');
    if (invalid) customInput.setAttribute('aria-invalid', 'true');
    else customInput.removeAttribute('aria-invalid');
    customError.hidden = !invalid;
  });
  ratingInputs.forEach(input => input.addEventListener('change', () => {
    const rating = Number(input.value);
    ratingInputs.forEach(star => star.nextElementSibling.classList.toggle('is-selected', Number(star.value) <= rating));
    ratingError.hidden = true;
  }));
  reviewText.addEventListener('input', () => {
    document.getElementById('review-character-count').textContent = new Intl.NumberFormat().format(1000 - reviewText.value.length);
  });

  const makeStars = (rating, className) => {
    const stars = document.createElement('span');
    stars.className = className;
    stars.textContent = '★'.repeat(rating) + '☆'.repeat(5 - rating);
    stars.setAttribute('aria-label', `${rating} out of 5 stars`);
    return stars;
  };

  function renderStats(stats) {
    document.getElementById('review-total').textContent = String(stats.totalReviews);
    const average = document.getElementById('review-average');
    const averageStars = document.getElementById('review-average-stars');
    average.textContent = stats.totalReviews ? Number(stats.averageRating).toFixed(1) + ' / 5' : 'No reviews yet';
    averageStars.textContent = stats.totalReviews ? '★'.repeat(Math.round(stats.averageRating)) + '☆'.repeat(5 - Math.round(stats.averageRating)) : '';
    const distribution = document.getElementById('review-distribution');
    distribution.replaceChildren();
    [5, 4, 3, 2, 1].forEach(rating => {
      const item = stats.distribution[rating] || { count: 0, percentage: 0 };
      const row = document.createElement('div');
      row.className = 'review-distribution-row';
      const label = document.createElement('span');
      label.className = 'review-distribution-label';
      label.textContent = `${rating} ★`;
      const bar = document.createElement('span');
      bar.className = 'review-progress';
      const fill = document.createElement('span');
      fill.style.width = `${item.percentage}%`;
      fill.setAttribute('aria-hidden', 'true');
      bar.setAttribute('role', 'progressbar');
      bar.setAttribute('aria-label', `${rating} star reviews`);
      bar.setAttribute('aria-valuemin', '0');
      bar.setAttribute('aria-valuemax', '100');
      bar.setAttribute('aria-valuenow', String(item.percentage));
      bar.append(fill);
      const percent = document.createElement('span');
      percent.className = 'review-percent';
      percent.textContent = `${item.percentage}%`;
      row.append(label, bar, percent);
      distribution.append(row);
    });
  }

  function renderReviews(reviews) {
    track.replaceChildren();
    dots.replaceChildren();
    empty.hidden = reviews.length > 0;
    reviews.forEach((review, index) => {
      const card = document.createElement('article');
      card.className = 'review-card';
      const top = document.createElement('div');
      top.className = 'review-card-top';
      const avatar = document.createElement('span');
      avatar.className = 'review-avatar';
      avatar.textContent = (review.name || '?').trim().charAt(0).toLocaleUpperCase();
      avatar.setAttribute('aria-hidden', 'true');
      const person = document.createElement('div');
      person.className = 'review-person';
      const name = document.createElement('strong');
      name.textContent = review.name;
      const trip = document.createElement('span');
      trip.textContent = review.destination;
      person.append(name, trip);
      top.append(avatar, person);
      card.append(top, makeStars(Number(review.rating), 'review-card-stars'));
      const text = document.createElement('p');
      text.className = 'review-card-text';
      text.textContent = `“${review.review}”`;
      const date = document.createElement('time');
      date.className = 'review-date';
      date.dateTime = review.submittedAt;
      const parsed = new Date(review.submittedAt);
      date.textContent = Number.isNaN(parsed.valueOf()) ? '' : new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' }).format(parsed);
      card.append(text, date);
      track.append(card);

      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'review-dot';
      dot.setAttribute('aria-label', `Show review ${index + 1}`);
      dot.setAttribute('aria-current', index === 0 ? 'true' : 'false');
      dot.addEventListener('click', () => card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' }));
      dots.append(dot);
    });
    updateCurrentDot();
  }

  function updateCurrentDot() {
    const cards = [...track.children];
    const dotButtons = [...dots.children];
    if (!cards.length) return;
    const index = Math.max(0, Math.min(cards.length - 1, Math.round(track.scrollLeft / Math.max(1, cards[0].getBoundingClientRect().width + 16))));
    dotButtons.forEach((dot, position) => dot.setAttribute('aria-current', position === index ? 'true' : 'false'));
  }

  async function loadReviews() {
    try {
      const response = await fetch(endpoint, { headers: { Accept: 'application/json' }, cache: 'no-store' });
      if (!response.ok) throw new Error('Reviews are temporarily unavailable.');
      const data = await response.json();
      renderStats(data.stats);
      renderReviews(data.reviews);
    } catch {
      const emptyDistribution = { 5: { count: 0, percentage: 0 }, 4: { count: 0, percentage: 0 }, 3: { count: 0, percentage: 0 }, 2: { count: 0, percentage: 0 }, 1: { count: 0, percentage: 0 } };
      renderStats({ totalReviews: 0, averageRating: null, distribution: emptyDistribution });
      renderReviews([]);
      empty.textContent = 'Reviews are temporarily unavailable. Please try again later.';
    }
  }

  document.getElementById('review-prev').addEventListener('click', () => {
    track.scrollBy({ left: -(track.firstElementChild?.getBoundingClientRect().width || track.clientWidth), behavior: 'smooth' });
  });
  document.getElementById('review-next').addEventListener('click', () => {
    track.scrollBy({ left: track.firstElementChild?.getBoundingClientRect().width || track.clientWidth, behavior: 'smooth' });
  });
  track.addEventListener('scroll', updateCurrentDot, { passive: true });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    statusText('');
    const customRequired = destination.value === 'Other';
    customInput.required = customRequired;
    const customInvalid = customRequired && customInput.value.trim().length < 2;
    customInput.setCustomValidity(customInvalid ? 'Please enter the destination.' : '');
    if (customInvalid) customInput.setAttribute('aria-invalid', 'true');
    else customInput.removeAttribute('aria-invalid');
    customError.hidden = !customInvalid;
    const ratingSelected = form.querySelector('input[name="rating"]:checked');
    ratingError.hidden = Boolean(ratingSelected);
    if (!ratingSelected) {
      ratingInputs[0]?.focus();
      return;
    }
    if (customInvalid) {
      customInput.focus();
      form.reportValidity();
      return;
    }
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const reviewDestination = data.get('destination') === 'Other' ? data.get('customDestination') : data.get('destination');
    const button = form.querySelector('[type="submit"]');
    const buttonLabel = button.querySelector('span');
    const buttonIcon = button.querySelector('i');
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    buttonLabel.textContent = 'Submitting…';
    buttonIcon.className = 'fas fa-spinner fa-spin';
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ name: data.get('name'), destination: reviewDestination, rating: data.get('rating'), review: data.get('review'), website: data.get('website') })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Your review could not be submitted.');
      form.reset();
      customWrap.hidden = true;
      customInput.required = false;
      customInput.setCustomValidity('');
      customInput.removeAttribute('aria-invalid');
      customError.hidden = true;
      ratingInputs.forEach(star => star.nextElementSibling.classList.remove('is-selected'));
      document.getElementById('review-character-count').textContent = '1,000';
      statusText('Thank you for sharing your experience! Your review has been submitted and will be published after approval.');
    } catch (error) {
      statusText(error.message || 'Your review could not be submitted. Please try again.', true);
    } finally {
      button.disabled = false;
      button.removeAttribute('aria-busy');
      buttonLabel.textContent = 'Submit Review';
      buttonIcon.className = 'fas fa-paper-plane';
    }
  });

  loadReviews();
})();
