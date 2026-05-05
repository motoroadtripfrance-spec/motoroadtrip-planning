(() => {
  'use strict';

  const supabaseUrl = window.MOTOROADTRIP_SUPABASE_URL;
  const supabaseAnonKey = window.MOTOROADTRIP_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('TON-PROJET')) {
    alert("Configuration Supabase manquante : renseigne l'URL et la clé anon dans config.example.js ou config.js.");
  }

  const db = window.supabase.createClient(supabaseUrl, supabaseAnonKey);

  const defaultEventTypes = [
    'Initiation enduro',
    'Initiation trail',
    'Enduro débutant',
    'Enduro intermédiaire plus',
    'Trail',
    'Trail engagé',
    'Quad',
    'Enduro senior',
    'Sortie pépère'
  ];

  const frenchImportHeaders = [
    'Date de début',
    'Date de fin',
    'Guide',
    'Type d’événement',
    'Restaurant jour 1 midi',
    'Restaurant jour 1 soir',
    'Restaurant jour 2 midi',
    'Restaurant jour 2 soir',
    'Restaurant jour 3 midi',
    'Restaurant jour 3 soir',
    'Restaurant jour 4 midi',
    'Restaurant jour 4 soir',
    'Restaurant jour 5 midi',
    'Restaurant jour 5 soir',
    'Gîte',
    'Participant 1',
    'Participant 2',
    'Participant 3',
    'Participant 4',
    'Participant 5',
    'Participant 6',
    'Participant 7',
    'Participant 8',
    'Participant 9',
    'Participant 10',
    'Participant 11',
    'Participant 12',
    'Participant 13',
    'Participant 14',
    'Notes'
  ];

  const frenchToTechnicalHeaders = {
    'Date de début': 'start_date',
    'Date de fin': 'end_date',
    'Guide': 'guide',
    'Type d’événement': 'event_type',
    'Type d\\'événement': 'event_type',
    'Restaurant jour 1 midi': 'restaurant_day1_lunch',
    'Restaurant jour 1 soir': 'restaurant_day1_dinner',
    'Restaurant jour 2 midi': 'restaurant_day2_lunch',
    'Restaurant jour 2 soir': 'restaurant_day2_dinner',
    'Restaurant jour 3 midi': 'restaurant_day3_lunch',
    'Restaurant jour 3 soir': 'restaurant_day3_dinner',
    'Restaurant jour 4 midi': 'restaurant_day4_lunch',
    'Restaurant jour 4 soir': 'restaurant_day4_dinner',
    'Restaurant jour 5 midi': 'restaurant_day5_lunch',
    'Restaurant jour 5 soir': 'restaurant_day5_dinner',
    'Gîte': 'gite',
    'Gite': 'gite',
    'Participant 1': 'participant_1',
    'Participant 2': 'participant_2',
    'Participant 3': 'participant_3',
    'Participant 4': 'participant_4',
    'Participant 5': 'participant_5',
    'Participant 6': 'participant_6',
    'Participant 7': 'participant_7',
    'Participant 8': 'participant_8',
    'Participant 9': 'participant_9',
    'Participant 10': 'participant_10',
    'Participant 11': 'participant_11',
    'Participant 12': 'participant_12',
    'Participant 13': 'participant_13',
    'Participant 14': 'participant_14',
    'Notes': 'notes'
  };


  let currentUser = null;
  let currentProfile = null;
  let guides = [];
  let places = [];
  let events = [];
  let participantsByEvent = {};
  let mealsByEvent = {};
  let initialized = false;
  let isPasswordRecoveryMode = false;

  const byId = (id) => document.getElementById(id);

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function csvEscape(value) {
    const text = String(value ?? '');
    return `"${text.replace(/"/g, '""')}"`;
  }

  function slugify(text) {
    return String(text || '')
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  function parseLocalDate(dateString) {
    if (!dateString) return null;
    const [year, month, day] = String(dateString).split('-').map(Number);
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day, 12, 0, 0, 0);
  }

  function toLocalDateString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function formatDate(dateString) {
    if (!dateString) return '';
    const d = parseLocalDate(dateString);
    if (!d) return '';

    const formatted = d.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }

  function getDatesBetween(startDate, endDate) {
    if (!startDate || !endDate || endDate < startDate) return [];

    const start = parseLocalDate(startDate);
    const end = parseLocalDate(endDate);
    if (!start || !end) return [];

    const dates = [];
    const current = new Date(start);

    while (current <= end) {
      dates.push(toLocalDateString(current));
      current.setDate(current.getDate() + 1);
    }

    return dates;
  }

  function isAdmin() {
    return currentProfile?.role === 'admin';
  }

  function getGuideNameById(id) {
    return guides.find(g => g.id === id)?.name || '';
  }

  function getGuideIdByName(name) {
    return guides.find(g => g.name === name)?.id || '';
  }

  function getPlaceNameById(id) {
    if (!id) return '';
    return places.find(p => p.id === id)?.name || '';
  }


  function hasRecoveryTokenInUrl() {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const query = new URLSearchParams(window.location.search);

    return (
      hash.get('type') === 'recovery' ||
      query.get('type') === 'recovery' ||
      hash.has('access_token') ||
      window.location.hash.includes('access_token=')
    );
  }

  function showResetPasswordScreen() {
    isPasswordRecoveryMode = true;
    byId('loginScreen').style.display = 'none';
    byId('app').style.display = 'none';
    byId('resetPasswordScreen').style.display = 'grid';
  }

  async function updatePasswordFromRecovery() {
    const password = byId('newPasswordReset').value;
    const confirm = byId('confirmPasswordReset').value;
    const errorBox = byId('resetPasswordError');

    errorBox.className = 'login-error';
    errorBox.textContent = '';

    if (!password || password.length < 8) {
      errorBox.textContent = 'Le mot de passe doit contenir au moins 8 caractères.';
      return;
    }

    if (password !== confirm) {
      errorBox.textContent = 'Les deux mots de passe ne correspondent pas.';
      return;
    }

    const { error } = await db.auth.updateUser({ password });

    if (error) {
      errorBox.textContent = error.message || 'Impossible de modifier le mot de passe.';
      return;
    }

    errorBox.className = 'login-error reset-success';
    errorBox.textContent = 'Mot de passe mis à jour. Tu peux maintenant te reconnecter.';

    setTimeout(async () => {
      await db.auth.signOut();
      window.history.replaceState({}, document.title, window.location.pathname);
      byId('resetPasswordScreen').style.display = 'none';
      byId('loginScreen').style.display = 'grid';
      byId('app').style.display = 'none';
      byId('loginPassword').value = '';
      byId('newPasswordReset').value = '';
      byId('confirmPasswordReset').value = '';
      isPasswordRecoveryMode = false;
    }, 1800);
  }

  async function login() {
    byId('loginError').textContent = '';

    const email = byId('loginEmail').value.trim();
    const password = byId('loginPassword').value;

    const { data, error } = await db.auth.signInWithPassword({ email, password });

    if (error) {
      byId('loginError').textContent = 'Identifiant ou mot de passe incorrect.';
      return;
    }

    currentUser = data.user;
    await loadCurrentProfile();
    await showApp();
  }

  async function logout() {
    await db.auth.signOut();
    currentUser = null;
    currentProfile = null;
    byId('app').style.display = 'none';
    byId('loginScreen').style.display = 'grid';
    byId('loginPassword').value = '';
  }

  async function restoreSession() {
    const { data } = await db.auth.getSession();
    if (!data.session?.user) return;

    currentUser = data.session.user;

    if (isPasswordRecoveryMode) {
      return;
    }

    await loadCurrentProfile();
    await showApp();
  }

  async function loadCurrentProfile() {
    const { data, error } = await db
      .from('profiles')
      .select('*')
      .eq('id', currentUser.id)
      .single();

    if (error || !data) {
      alert("Profil introuvable. Vérifie que le profil existe dans Supabase.");
      await logout();
      return;
    }

    currentProfile = data;
  }

  async function showApp() {
    byId('loginScreen').style.display = 'none';
    byId('app').style.display = 'block';

    byId('connectedUserLabel').textContent = isAdmin()
      ? `Connecté : ${currentProfile.full_name} — accès complet`
      : `Connecté : ${currentProfile.full_name} — lecture seule`;

    applyAccessRights();
    buildParticipantInputs();
    refreshEventTypeOptions();
    await loadAllData();
    renderAll();
  }

  function applyAccessRights() {
    const guideMode = !isAdmin();

    byId('formCard').style.display = guideMode ? 'none' : '';
    byId('mainGrid').style.gridTemplateColumns = guideMode ? '1fr' : '430px 1fr';

    document.querySelectorAll('.admin-only').forEach(el => {
      el.style.display = isAdmin() ? 'block' : 'none';
    });
  }

  async function loadAllData() {
    byId('loadingMessage').style.display = '';

    const [
      guidesResult,
      placesResult,
      eventsResult
    ] = await Promise.all([
      db.from('guides').select('*').order('name', { ascending: true }),
      db.from('places').select('*').order('kind', { ascending: true }).order('name', { ascending: true }),
      db.from('events').select('*').order('start_date', { ascending: true })
    ]);

    if (guidesResult.error) throw guidesResult.error;
    if (placesResult.error) throw placesResult.error;
    if (eventsResult.error) throw eventsResult.error;

    guides = guidesResult.data || [];
    places = placesResult.data || [];
    events = eventsResult.data || [];

    const eventIds = events.map(e => e.id);

    if (eventIds.length) {
      const [participantsResult, mealsResult] = await Promise.all([
        db.from('participants').select('*').in('event_id', eventIds).order('name', { ascending: true }),
        db.from('event_meals').select('*').in('event_id', eventIds).order('meal_date', { ascending: true })
      ]);

      if (participantsResult.error) throw participantsResult.error;
      if (mealsResult.error) throw mealsResult.error;

      participantsByEvent = groupBy(participantsResult.data || [], 'event_id');
      mealsByEvent = groupBy(mealsResult.data || [], 'event_id');
    } else {
      participantsByEvent = {};
      mealsByEvent = {};
    }

    byId('loadingMessage').style.display = 'none';
  }

  function groupBy(list, key) {
    return list.reduce((acc, item) => {
      const value = item[key];
      acc[value] ||= [];
      acc[value].push(item);
      return acc;
    }, {});
  }

  function renderAll() {
    refreshGuideOptions();
    renderSelects();
    renderAccountsList();
    renderEvents();
  }

  function refreshGuideOptions() {
    const guideSelect = byId('guide');
    const filterGuide = byId('filterGuide');

    if (guideSelect) {
      const current = guideSelect.value;
      guideSelect.innerHTML = guides.map(guide => `<option value="${guide.id}">${escapeHtml(guide.name)}</option>`).join('');
      if (guides.some(g => g.id === current)) guideSelect.value = current;
    }

    if (filterGuide) {
      const current = filterGuide.value || 'Tous';
      filterGuide.innerHTML = '<option value="Tous">Tous</option>' + guides.map(guide => `<option value="${guide.id}">${escapeHtml(guide.name)}</option>`).join('');
      filterGuide.value = current === 'Tous' || guides.some(g => g.id === current) ? current : 'Tous';
      if (!isAdmin()) {
        filterGuide.value = currentProfile.guide_id;
        filterGuide.disabled = true;
      } else {
        filterGuide.disabled = false;
      }
    }
  }

  function refreshEventTypeOptions() {
    const eventType = byId('eventType');
    const filterType = byId('filterType');

    if (eventType) {
      const current = eventType.value || defaultEventTypes[0];
      eventType.innerHTML = defaultEventTypes.map(type => `<option>${escapeHtml(type)}</option>`).join('');
      eventType.value = defaultEventTypes.includes(current) ? current : defaultEventTypes[0];
    }

    if (filterType) {
      const current = filterType.value || 'Tous';
      filterType.innerHTML = '<option value="Tous">Tous</option>' + defaultEventTypes.map(type => `<option>${escapeHtml(type)}</option>`).join('');
      filterType.value = current === 'Tous' || defaultEventTypes.includes(current) ? current : 'Tous';
    }
  }

  function renderSelects() {
    const restaurants = places.filter(p => p.kind === 'restaurant');
    const gites = places.filter(p => p.kind === 'gite');

    byId('gite').innerHTML = '<option value="">Non défini</option>' + gites.map(g => `<option value="${g.id}">${escapeHtml(g.name)}</option>`).join('');

    byId('restaurantChips').innerHTML = restaurants.map(place => `
      <span class="chip">${escapeHtml(place.name)}<button type="button" data-action="delete-place" data-id="${place.id}">×</button></span>
    `).join('');

    byId('giteChips').innerHTML = gites.map(place => `
      <span class="chip">${escapeHtml(place.name)}<button type="button" data-action="delete-place" data-id="${place.id}">×</button></span>
    `).join('');
  }

  function buildParticipantInputs() {
    const container = byId('participantInputs');
    if (container.children.length) return;

    for (let i = 1; i <= 14; i++) {
      const input = document.createElement('input');
      input.type = 'text';
      input.id = `participant${i}`;
      input.placeholder = `Nom ${i}`;
      container.appendChild(input);
    }
  }

  function restaurantOptions(selectedValue) {
    const restaurants = places.filter(p => p.kind === 'restaurant');

    return '<option value="">Non défini</option>' + restaurants.map(place => {
      const selected = place.id === selectedValue ? 'selected' : '';
      return `<option value="${place.id}" ${selected}>${escapeHtml(place.name)}</option>`;
    }).join('');
  }

  function renderMealPlanning(existingMeals = []) {
    const container = byId('mealPlanning');
    const startDate = byId('startDate').value;
    const endDate = byId('endDate').value;
    const dates = getDatesBetween(startDate, endDate);

    if (!dates.length) {
      container.innerHTML = '<div class="empty" style="padding:18px;">Choisis une date de début et une date de fin pour générer les repas.</div>';
      return;
    }

    container.innerHTML = dates.map(date => {
      const existing = existingMeals.find(meal => meal.meal_date === date || meal.date === date) || {};
      return `
        <div class="meal-day" data-date="${date}">
          <div class="meal-day-title">🍽️ ${formatDate(date)}</div>
          <div class="meal-row">
            <div>
              <label style="margin-top:0;">Midi</label>
              <select class="meal-lunch">${restaurantOptions(existing.lunch_place_id || existing.lunch || '')}</select>
            </div>
            <div>
              <label style="margin-top:0;">Soir</label>
              <select class="meal-dinner">${restaurantOptions(existing.dinner_place_id || existing.dinner || '')}</select>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  function collectMeals() {
    return Array.from(document.querySelectorAll('.meal-day')).map(day => ({
      meal_date: day.dataset.date,
      lunch_place_id: day.querySelector('.meal-lunch').value || null,
      dinner_place_id: day.querySelector('.meal-dinner').value || null
    }));
  }

  function getFilteredEvents() {
    const filterGuide = byId('filterGuide').value;
    const filterType = byId('filterType').value;
    const filterStart = byId('filterStart').value;
    const filterEnd = byId('filterEnd').value;

    return events
      .filter(event => filterGuide === 'Tous' || event.guide_id === filterGuide)
      .filter(event => filterType === 'Tous' || event.event_type === filterType)
      .filter(event => !filterStart || event.end_date >= filterStart)
      .filter(event => !filterEnd || event.start_date <= filterEnd)
      .sort((a, b) => {
        if (a.start_date !== b.start_date) return a.start_date.localeCompare(b.start_date);
        return a.end_date.localeCompare(b.end_date);
      });
  }

  function renderEvents() {
    const filteredEvents = getFilteredEvents();
    const selectedGuide = byId('filterGuide').value;

    const visibleGuides = !isAdmin()
      ? guides.filter(g => g.id === currentProfile.guide_id)
      : (selectedGuide === 'Tous' ? guides : guides.filter(g => g.id === selectedGuide));

    const container = byId('planningColumns');
    container.innerHTML = '';
    container.style.gridTemplateColumns = visibleGuides.length === 1 ? '1fr' : `repeat(${visibleGuides.length}, minmax(280px, 1fr))`;

    visibleGuides.forEach(guide => {
      const guideEvents = filteredEvents.filter(event => event.guide_id === guide.id);
      const column = document.createElement('div');
      column.className = 'guide-column';
      column.innerHTML = `
        <div class="guide-header">
          <h3>${escapeHtml(guide.name)}</h3>
          <span class="badge-count">${guideEvents.length}</span>
        </div>
        ${guideEvents.length ? guideEvents.map(renderEventCard).join('') : '<div class="empty">Aucun événement planifié</div>'}
      `;
      container.appendChild(column);
    });

    updateStats(filteredEvents);
  }

  function renderEventCard(event) {
    const participants = participantsByEvent[event.id] || [];
    const meals = mealsByEvent[event.id] || [];

    return `
      <div class="event-card type-${slugify(event.event_type)}">
        <div class="event-top">
          <div>
            <h4 class="event-title">${escapeHtml(event.event_type)}</h4>
            <div class="event-dates">📅 ${formatDate(event.start_date)} → ${formatDate(event.end_date)}</div>
          </div>
        </div>
        <div class="event-info">
          <div class="meal-list">${renderMeals(meals)}</div>
          <span>🏡 Couchage : <strong>${escapeHtml(getPlaceNameById(event.gite_place_id) || 'Non défini')}</strong></span>
          ${event.notes ? `<span>📝 Note : ${escapeHtml(event.notes)}</span>` : ''}
        </div>
        <div class="participants">
          <strong>Participants : ${participants.length}/14</strong>
          <div class="participants-list">
            ${participants.length ? participants.map(p => `<span class="participant">${escapeHtml(p.name)}</span>`).join('') : '<span class="note">Aucun participant renseigné</span>'}
          </div>
        </div>
        <div class="event-actions">
          ${isAdmin() ? `<button class="btn btn-secondary btn-small" type="button" data-action="edit-event" data-id="${event.id}">Modifier</button>
          <button class="btn btn-danger btn-small" type="button" data-action="delete-event" data-id="${event.id}">Supprimer</button>` : ''}
        </div>
      </div>
    `;
  }

  function renderMeals(meals) {
    if (!meals.length) return '<span>🍽️ Restauration : <strong>Non défini</strong></span>';

    return meals.map(meal => `
      <span>🍽️ ${formatDate(meal.meal_date)} — Midi : <strong>${escapeHtml(getPlaceNameById(meal.lunch_place_id) || 'Non défini')}</strong> / Soir : <strong>${escapeHtml(getPlaceNameById(meal.dinner_place_id) || 'Non défini')}</strong></span>
    `).join('');
  }

  function updateStats(filteredEvents) {
    const visibleIds = filteredEvents.map(e => e.id);
    const participantCount = visibleIds.reduce((sum, id) => sum + (participantsByEvent[id] || []).length, 0);

    byId('totalEvents').textContent = filteredEvents.length;
    byId('totalParticipants').textContent = participantCount;
    byId('totalRestaurants').textContent = places.filter(p => p.kind === 'restaurant').length;
    byId('totalGites').textContent = places.filter(p => p.kind === 'gite').length;
  }

  function showError(message) {
    let errorBox = byId('formError');
    if (!errorBox) {
      errorBox = document.createElement('div');
      errorBox.id = 'formError';
      errorBox.className = 'form-error';
      byId('formCard').insertBefore(errorBox, byId('formTitle'));
    }
    errorBox.textContent = message;
  }

  function clearError() {
    byId('formError')?.remove();
  }

  function validateEvent({ startDate, endDate, guideId, eventType, giteId }) {
    if (!startDate || !endDate) return '❌ Merci de renseigner une date de début et une date de fin.';
    if (endDate < startDate) return '❌ La date de fin ne peut pas être avant la date de début.';
    if (!guideId) return '❌ Merci de sélectionner un guide.';
    if (!eventType) return '❌ Merci de sélectionner un type d’événement.';
    if (!giteId) return '❌ Merci de renseigner un lieu de couchage.';
    return '';
  }

  async function saveEvent() {
    if (!isAdmin()) return;

    clearError();

    const editingId = byId('editingId').value;
    const payload = {
      start_date: byId('startDate').value,
      end_date: byId('endDate').value,
      guide_id: byId('guide').value,
      event_type: byId('eventType').value,
      gite_place_id: byId('gite').value || null,
      notes: byId('notes').value.trim()
    };

    const validationMessage = validateEvent({
      startDate: payload.start_date,
      endDate: payload.end_date,
      guideId: payload.guide_id,
      eventType: payload.event_type,
      giteId: payload.gite_place_id
    });

    if (validationMessage) {
      showError(validationMessage);
      return;
    }

    let eventId = editingId;

    if (editingId) {
      const { error } = await db.from('events').update(payload).eq('id', editingId);
      if (error) return showError(`❌ ${error.message}`);
    } else {
      const { data, error } = await db.from('events').insert(payload).select('id').single();
      if (error) return showError(`❌ ${error.message}`);
      eventId = data.id;
    }

    await db.from('participants').delete().eq('event_id', eventId);
    await db.from('event_meals').delete().eq('event_id', eventId);

    const participants = [];
    for (let i = 1; i <= 14; i++) {
      const value = byId(`participant${i}`)?.value.trim();
      if (value) participants.push({ event_id: eventId, name: value });
    }

    if (participants.length) {
      const { error } = await db.from('participants').insert(participants);
      if (error) return showError(`❌ ${error.message}`);
    }

    const meals = collectMeals().map(meal => ({ event_id: eventId, ...meal }));
    if (meals.length) {
      const { error } = await db.from('event_meals').insert(meals);
      if (error) return showError(`❌ ${error.message}`);
    }

    await notifyGuideEvent(eventId, editingId ? 'updated' : 'created');

    resetForm();
    await loadAllData();
    renderAll();
  }

  function resetForm() {
    clearError();
    byId('editingId').value = '';
    byId('formTitle').textContent = 'Créer un événement';
    byId('startDate').value = '';
    byId('endDate').value = '';
    byId('guide').value = guides[0]?.id || '';
    byId('eventType').value = defaultEventTypes[0];
    byId('gite').value = '';
    byId('notes').value = '';

    for (let i = 1; i <= 14; i++) byId(`participant${i}`).value = '';

    renderMealPlanning();
  }

  async function editEvent(id) {
    if (!isAdmin()) return;

    const event = events.find(e => e.id === id);
    if (!event) return;

    clearError();

    byId('editingId').value = event.id;
    byId('formTitle').textContent = 'Modifier un événement';
    byId('startDate').value = event.start_date;
    byId('endDate').value = event.end_date;
    byId('guide').value = event.guide_id;
    byId('eventType').value = event.event_type;
    byId('gite').value = event.gite_place_id || '';
    byId('notes').value = event.notes || '';

    renderMealPlanning(mealsByEvent[event.id] || []);

    const participants = participantsByEvent[event.id] || [];
    for (let i = 1; i <= 14; i++) byId(`participant${i}`).value = participants[i - 1]?.name || '';

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function deleteEvent(id) {
    if (!isAdmin()) return;
    if (!confirm('Supprimer cet événement ?')) return;

    const { error } = await db.from('events').delete().eq('id', id);
    if (error) return alert(error.message);

    await loadAllData();
    renderAll();
  }

  async function addPlace(kind) {
    if (!isAdmin()) return;

    const inputId = kind === 'restaurant' ? 'newRestaurant' : 'newGite';
    const input = byId(inputId);
    const name = input.value.trim();

    if (!name) return;

    const { error } = await db.from('places').insert({ name, kind });
    if (error) return alert(error.message);

    input.value = '';
    await loadAllData();
    renderAll();
    renderMealPlanning(collectMeals());
  }

  async function deletePlace(id) {
    if (!isAdmin()) return;
    if (!confirm('Supprimer ce lieu ?')) return;

    const { error } = await db.from('places').delete().eq('id', id);
    if (error) return alert("Impossible de supprimer : ce lieu est peut-être déjà utilisé.");

    await loadAllData();
    renderAll();
  }

  async function createGuideAccount() {
    if (!isAdmin()) return;

    const fullName = byId('newGuideName').value.trim();
    const email = byId('newGuideEmail').value.trim().toLowerCase();
    const password = byId('newGuidePassword').value.trim();

    if (!fullName || !email || !password) {
      showError('❌ Merci de renseigner le nom, l’email et le mot de passe.');
      return;
    }

    const { error } = await db.functions.invoke('create-guide-user', {
      body: { email, password, full_name: fullName }
    });

    if (error) {
      showError(`❌ ${error.message || 'Création impossible. Voir README installation.'}`);
      return;
    }

    byId('newGuideName').value = '';
    byId('newGuideEmail').value = '';
    byId('newGuidePassword').value = '';
    clearError();

    await loadAllData();
    renderAll();
  }

  async function resetGuidePassword(profileId) {
    if (!isAdmin()) return;

    const input = document.querySelector(`[data-password-for="${CSS.escape(profileId)}"]`);
    const password = input?.value.trim();

    if (!password) {
      showError('❌ Merci de renseigner un nouveau mot de passe.');
      return;
    }

    const { error } = await db.functions.invoke('reset-guide-password', {
      body: { profile_id: profileId, password }
    });

    if (error) {
      showError(`❌ ${error.message || 'Modification impossible. Voir README installation.'}`);
      return;
    }

    input.value = '';
    clearError();
    alert('Mot de passe mis à jour.');
  }

  async function deleteGuide(profileId, guideId) {
    if (!isAdmin()) return;

    const hasEvents = events.some(event => event.guide_id === guideId);
    if (hasEvents) {
      alert('Ce guide a déjà des événements associés. Supprime ou réattribue d’abord ses événements.');
      return;
    }

    if (!confirm('Supprimer ce guide et son profil ?')) return;

    const { error } = await db.functions.invoke('delete-guide-user', {
      body: { profile_id: profileId }
    });

    if (error) {
      showError(`❌ ${error.message || 'Suppression impossible. Voir README installation.'}`);
      return;
    }

    await loadAllData();
    renderAll();
  }

  async function renderAccountsList() {
    const container = byId('accountsList');
    if (!container || !isAdmin()) return;

    const { data: profiles, error } = await db
      .from('profiles')
      .select('id, email, full_name, role, guide_id')
      .order('full_name', { ascending: true });

    if (error) {
      container.innerHTML = `<div class="form-error">❌ ${escapeHtml(error.message)}</div>`;
      return;
    }

    container.innerHTML = profiles.map(profile => {
      const admin = profile.role === 'admin';
      return `
        <div class="account-card ${admin ? 'account-admin' : ''}">
          <strong>${escapeHtml(profile.full_name)}</strong>
          <small>${admin ? 'Admin — accès complet' : `Email : ${escapeHtml(profile.email)} — lecture seule`}</small>
          ${admin ? '' : `
            <div class="account-actions">
              <input type="text" placeholder="Nouveau mot de passe" data-password-for="${profile.id}" />
              <button class="btn btn-secondary btn-small" type="button" data-action="reset-password" data-profile-id="${profile.id}">Modifier</button>
              <button class="btn btn-danger btn-small" type="button" data-action="delete-guide" data-profile-id="${profile.id}" data-guide-id="${profile.guide_id}">Supprimer</button>
            </div>
          `}
        </div>
      `;
    }).join('');
  }

  function buildCsvExport() {
    const headers = [
      'ID', 'Guide', 'Type événement', 'Date début', 'Date fin', 'Gîte',
      'Date repas', 'Restaurant midi', 'Restaurant soir',
      'Participants', 'Notes'
    ];

    const rows = [headers];

    events.forEach(event => {
      const participants = (participantsByEvent[event.id] || []).map(p => p.name).join(', ');
      const meals = mealsByEvent[event.id]?.length ? mealsByEvent[event.id] : [{ meal_date: '', lunch_place_id: '', dinner_place_id: '' }];

      meals.forEach(meal => {
        rows.push([
          event.id,
          getGuideNameById(event.guide_id),
          event.event_type,
          event.start_date,
          event.end_date,
          getPlaceNameById(event.gite_place_id),
          meal.meal_date,
          getPlaceNameById(meal.lunch_place_id),
          getPlaceNameById(meal.dinner_place_id),
          participants,
          event.notes
        ]);
      });
    });

    return rows.map(row => row.map(csvEscape).join(';')).join('\n');
  }

  function exportCsv() {
    const blob = new Blob(['\ufeff' + buildCsvExport()], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = 'planning-guides-motoroadtrip.csv';
    link.click();

    URL.revokeObjectURL(url);
  }


  function normalizeExcelDate(value) {
    if (!value) return '';

    if (value instanceof Date) {
      return toLocalDateString(value);
    }

    if (typeof value === 'number' && window.XLSX) {
      const parsed = XLSX.SSF.parse_date_code(value);
      if (!parsed) return '';
      return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
    }

    const text = String(value).trim();

    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;

    const frMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (frMatch) {
      const [, day, month, year] = frMatch;
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }

    return '';
  }

  function normalizeName(value) {
    return String(value || '').trim();
  }

  function showImportReport(message, isError = false) {
    let report = byId('importReport');

    if (!report) {
      report = document.createElement('div');
      report.id = 'importReport';
      report.className = 'import-report';
      byId('loadingMessage').insertAdjacentElement('beforebegin', report);
    }

    report.className = isError ? 'import-report error' : 'import-report';
    report.innerHTML = message;
  }

  async function getOrCreatePlace(name, kind) {
    const cleanName = normalizeName(name);
    if (!cleanName || cleanName === '—' || cleanName === '-') return null;

    const existing = places.find(place => place.kind === kind && place.name.toLowerCase() === cleanName.toLowerCase());
    if (existing) return existing.id;

    const { data, error } = await db
      .from('places')
      .insert({ name: cleanName, kind })
      .select('id, name, kind')
      .single();

    if (error) throw error;

    places.push(data);
    return data.id;
  }

  function getGuideIdFromName(name) {
    const cleanName = normalizeName(name);
    const guide = guides.find(g => g.name.toLowerCase() === cleanName.toLowerCase());
    return guide?.id || null;
  }

  function rowHasData(row) {
    return Object.values(row).some(value => String(value ?? '').trim() !== '');
  }


  async function importExcelFile(file) {
    if (!isAdmin()) {
      showImportReport('Import refusé : accès admin requis.', true);
      return;
    }

    if (!window.XLSX) {
      showImportReport('Bibliothèque Excel non chargée. Recharge la page puis réessaie.', true);
      return;
    }

    showImportReport('Vérification du fichier Excel en cours...');

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
    const sheet = workbook.Sheets['Planning'] || workbook.Sheets[workbook.SheetNames[0]];
    const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' }).filter(rowHasData);
    const rows = rawRows.map(mapFrenchRowToTechnical).filter(row => !isExampleRow(row));

    if (!rows.length) {
      showImportReport('Aucune ligne à importer. Vérifie que la ligne exemple a été supprimée et que tu as ajouté au moins un événement.', true);
      return;
    }

    const validations = rows.map((row, index) => validateImportRow(row, index + 2));
    const invalidRows = validations.filter(item => item.errors.length);

    if (invalidRows.length) {
      const errorHtml = invalidRows.slice(0, 20).map(item => (
        `<li><strong>Ligne ${item.rowNumber}</strong> : ${item.errors.map(escapeHtml).join(', ')}</li>`
      )).join('');

      showImportReport(
        `❌ Import bloqué : <strong>${invalidRows.length}</strong> ligne(s) contiennent des erreurs.<ul class="validation-list">${errorHtml}</ul>${invalidRows.length > 20 ? '<br>Seules les 20 premières erreurs sont affichées.' : ''}`,
        true
      );
      return;
    }

    showImportReport(`✅ Vérification réussie : ${rows.length} ligne(s) prêtes à être importées. Import en cours...`);

    let created = 0;
    let notificationsSent = 0;
    const errors = [];

    for (let i = 0; i < rows.length; i++) {
      const rowNumber = i + 2;
      const row = rows[i];

      try {
        const startDate = normalizeExcelDate(row.start_date);
        const endDate = normalizeExcelDate(row.end_date);
        const guideId = getGuideIdFromName(row.guide);
        const eventType = normalizeName(row.event_type);
        const giteId = await getOrCreatePlace(row.gite, 'gite');

        const { data: insertedEvent, error: eventError } = await db
          .from('events')
          .insert({
            start_date: startDate,
            end_date: endDate,
            guide_id: guideId,
            event_type: eventType,
            gite_place_id: giteId,
            notes: normalizeName(row.notes)
          })
          .select('id')
          .single();

        if (eventError) throw eventError;

        const eventId = insertedEvent.id;

        const participants = [];
        for (let p = 1; p <= 14; p++) {
          const participant = normalizeName(row[`participant_${p}`]);
          if (participant) participants.push({ event_id: eventId, name: participant });
        }

        if (participants.length) {
          const { error: participantError } = await db.from('participants').insert(participants);
          if (participantError) throw participantError;
        }

        const mealDates = getDatesBetween(startDate, endDate);
        const meals = [];

        for (let day = 1; day <= mealDates.length; day++) {
          const lunchName = row[`restaurant_day${day}_lunch`];
          const dinnerName = row[`restaurant_day${day}_dinner`];

          const lunchPlaceId = await getOrCreatePlace(lunchName, 'restaurant');
          const dinnerPlaceId = await getOrCreatePlace(dinnerName, 'restaurant');

          meals.push({
            event_id: eventId,
            meal_date: mealDates[day - 1],
            lunch_place_id: lunchPlaceId,
            dinner_place_id: dinnerPlaceId
          });
        }

        if (meals.length) {
          const { error: mealsError } = await db.from('event_meals').insert(meals);
          if (mealsError) throw mealsError;
        }

        const notificationOk = await notifyGuideEvent(eventId, 'created');
        if (notificationOk) notificationsSent++;

        created++;
      } catch (error) {
        errors.push(`Ligne ${rowNumber} : ${escapeHtml(error.message || String(error))}`);
      }
    }

    await loadAllData();
    renderAll();

    const message = [
      `✅ Import terminé : <strong>${created}</strong> événement(s) créé(s).`,
      `📧 Notifications envoyées : <strong>${notificationsSent}</strong>.`,
      errors.length ? `⚠️ Erreurs après validation :<br>${errors.slice(0, 10).join('<br>')}${errors.length > 10 ? '<br>...' : ''}` : ''
    ].filter(Boolean).join('<br>');

    showImportReport(message, Boolean(errors.length && !created));
  }


  function bindEvents() {
    byId('loginButton').addEventListener('click', login);
    byId('updatePasswordButton').addEventListener('click', updatePasswordFromRecovery);
    byId('loginPassword').addEventListener('keydown', event => {
      if (event.key === 'Enter') login();
    });

    byId('logoutButton').addEventListener('click', logout);
    byId('saveEventButton').addEventListener('click', saveEvent);
    byId('resetFormButton').addEventListener('click', resetForm);
    byId('printButton').addEventListener('click', () => window.print());
    byId('exportCsvButton').addEventListener('click', exportCsv);
    byId('exportMatrixButton')?.addEventListener('click', exportImportMatrix);
    byId('importExcelButton')?.addEventListener('click', () => byId('excelImportInput').click());
    byId('excelImportInput')?.addEventListener('change', async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      await importExcelFile(file);
      event.target.value = '';
    });
    byId('createGuideAccountButton').addEventListener('click', createGuideAccount);

    ['filterGuide', 'filterType', 'filterStart', 'filterEnd'].forEach(id => {
      byId(id).addEventListener('change', renderEvents);
    });

    byId('startDate').addEventListener('change', () => renderMealPlanning(collectMeals()));
    byId('endDate').addEventListener('change', () => renderMealPlanning(collectMeals()));

    document.addEventListener('click', event => {
      const button = event.target.closest('[data-action]');
      if (!button) return;

      const action = button.dataset.action;

      if (action === 'edit-event') editEvent(button.dataset.id);
      if (action === 'delete-event') deleteEvent(button.dataset.id);
      if (action === 'add-place') addPlace(button.dataset.kind);
      if (action === 'delete-place') deletePlace(button.dataset.id);
      if (action === 'reset-password') resetGuidePassword(button.dataset.profileId);
      if (action === 'delete-guide') deleteGuide(button.dataset.profileId, button.dataset.guideId);
    });
  }

  function runTests() {
    const mayDates = getDatesBetween('2026-05-01', '2026-05-03');
    console.assert(mayDates.length === 3, 'getDatesBetween doit retourner 3 jours.');
    console.assert(mayDates[0] === '2026-05-01', 'Le premier repas doit être le 01/05/2026.');
    console.assert(mayDates[2] === '2026-05-03', 'Le dernier repas doit être le 03/05/2026.');
    console.assert(!mayDates.includes('2026-04-30'), 'Le 30/04 ne doit jamais apparaître.');
    console.assert(!mayDates.includes('2026-05-04'), 'Le 04/05 ne doit jamais apparaître.');
    console.assert(defaultEventTypes.includes('Quad'), 'Quad doit être présent.');
    console.assert(defaultEventTypes.includes('Enduro senior'), 'Enduro senior doit être présent.');
    console.assert(defaultEventTypes.includes('Sortie pépère'), 'Sortie pépère doit être présent.');
  }

  async function init() {
    if (initialized) return;
    initialized = true;

    buildParticipantInputs();
    refreshEventTypeOptions();
    bindEvents();
    runTests();

    if (hasRecoveryTokenInUrl()) {
      showResetPasswordScreen();
      return;
    }

    await restoreSession();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
