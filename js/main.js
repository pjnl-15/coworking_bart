/* ============================================================
   BART COWORKING — main.js
   i18n · hamburger · reserve view · form submission
   ============================================================ */

var currentLang = 'es';
var translations = {};

/* ============================================================
   i18n
   ============================================================ */

function getNestedValue(obj, keyPath) {
  return keyPath.split('.').reduce(function(acc, key) {
    return acc !== null && acc !== undefined ? acc[key] : undefined;
  }, obj);
}

function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(function(el) {
    var key = el.getAttribute('data-i18n');
    var value = getNestedValue(translations, key);
    if (value !== undefined) {
      el.textContent = value;
    }
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach(function(el) {
    var key = el.getAttribute('data-i18n-placeholder');
    var value = getNestedValue(translations, key);
    if (value !== undefined) {
      el.placeholder = value;
    }
  });

  refreshBookingForm();
}

function updateActiveLangButton() {
  document.querySelectorAll('.lang-btn').forEach(function(btn) {
    btn.classList.toggle('active', btn.dataset.lang === currentLang);
  });
}

function loadLanguage(lang) {
  fetch('i18n/' + lang + '.json')
    .then(function(res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(function(data) {
      translations = data;
      currentLang = lang;
      document.documentElement.lang = lang;
      applyTranslations();
      updateActiveLangButton();
    })
    .catch(function(err) {
      console.error('[Bart i18n] Failed to load ' + lang + ':', err);
    });
}

document.querySelectorAll('.lang-btn').forEach(function(btn) {
  btn.addEventListener('click', function() {
    var lang = btn.dataset.lang;
    if (lang && lang !== currentLang) {
      loadLanguage(lang);
    }
  });
});

/* ============================================================
   Mobile hamburger
   ============================================================ */

var hamburger = document.getElementById('hamburger');
var mobileMenu = document.getElementById('mobileMenu');

if (hamburger && mobileMenu) {
  hamburger.addEventListener('click', function() {
    var isOpen = mobileMenu.classList.toggle('open');
    hamburger.classList.toggle('open', isOpen);
    hamburger.setAttribute('aria-expanded', String(isOpen));
  });

  mobileMenu.querySelectorAll('a').forEach(function(link) {
    link.addEventListener('click', function() {
      mobileMenu.classList.remove('open');
      hamburger.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
    });
  });

  document.addEventListener('click', function(e) {
    if (!hamburger.contains(e.target) && !mobileMenu.contains(e.target)) {
      mobileMenu.classList.remove('open');
      hamburger.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
    }
  });
}

/* ============================================================
   Reserve view
   ============================================================ */

var reserveView    = document.getElementById('reserveView');
var reserveBack    = document.getElementById('reserveBack');
var reserveForm    = document.getElementById('reserveForm');
var reserveSuccess = document.getElementById('reserveSuccess');
var reserveError   = document.getElementById('reserveError');
var reserveSubmit  = document.getElementById('reserveSubmit');
var reserveSuccessBack = document.getElementById('reserveSuccessBack');

function openReserve() {
  if (!reserveView) return;
  reserveView.classList.add('active');
  reserveView.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  reserveView.scrollTop = 0;
}

function closeReserve() {
  if (!reserveView) return;
  reserveView.classList.remove('active');
  reserveView.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

document.querySelectorAll('[data-action="open-reserve"]').forEach(function(el) {
  el.addEventListener('click', function(e) {
    e.preventDefault();
    if (mobileMenu) {
      mobileMenu.classList.remove('open');
      hamburger && hamburger.classList.remove('open');
    }
    openReserve();
  });
});

if (reserveBack) {
  reserveBack.addEventListener('click', closeReserve);
}

/* Close reserve view when nav logo or menu links are clicked, then scroll to target */
document.querySelectorAll('.nav__logo, .nav__links a, .nav__mobile ul a').forEach(function(el) {
  el.addEventListener('click', function(e) {
    if (!reserveView || !reserveView.classList.contains('active')) return;
    e.preventDefault();
    var href = el.getAttribute('href') || '#inicio';
    closeReserve();
    setTimeout(function() {
      var targetId = href.startsWith('#') ? href : '#inicio';
      var target = document.querySelector(targetId);
      if (target) target.scrollIntoView({ behavior: 'smooth' });
    }, 240);
  });
});

if (reserveSuccessBack) {
  reserveSuccessBack.addEventListener('click', function() {
    closeReserve();
    reserveSuccess.hidden = true;
    reserveForm.hidden = false;
    reserveForm.reset();
    resetBookingFields();
    if (reserveError) reserveError.hidden = true;
  });
}

/* ============================================================
   Booking form — space / modality / hours logic
   ============================================================ */

var spaceSelect    = document.getElementById('r-space');
var modalitySelect = document.getElementById('r-modality');
var hoursRow       = document.getElementById('r-hours-row');
var availNote      = document.getElementById('r-availability-note');

/* Fixed Spanish values for form submission — always readable for Bart */
var modalityConfig = {
  'Mesa Alta Coworking': [
    { value: 'Jornada completa (15€)',        key: 'fullDay_alta' },
    { value: 'Media jornada 4h (8€)',         key: 'halfDay_alta' },
    { value: 'Por horas 10:00-17:00 (4€/h)', key: 'hourly_alta'  }
  ],
  'Mesa Individual': [
    { value: 'Jornada completa (19€)',        key: 'fullDay_ind'  },
    { value: 'Media jornada 4h (10€)',        key: 'halfDay_ind'  },
    { value: 'Por horas 10:00-17:00 (5€/h)', key: 'hourly_ind'   },
    { value: 'Mensual (120€)',                key: 'monthly'      }
  ],
  'Mesa Coworking': [
    { value: 'Jornada completa (15€)',        key: 'fullDay_alta' },
    { value: 'Media jornada 4h (8€)',         key: 'halfDay_alta' },
    { value: 'Por horas 10:00-17:00 (4€/h)', key: 'hourly_alta'  }
  ]
};

var availConfig = {
  'Mesa Alta Coworking': 'mesaAlta',
  'Mesa Individual':     'mesaIndividual',
  'Mesa Coworking':      'mesaCoworking'
};

var hourlyValues = [
  'Por horas 10:00-17:00 (4€/h)',
  'Por horas 10:00-17:00 (5€/h)'
];

function buildModalityOptions(spaceValue) {
  if (!modalitySelect) return;
  var placeholder = getNestedValue(translations, 'reserve.modalityPlaceholder') || 'Selecciona una modalidad';
  modalitySelect.innerHTML = '<option value="" disabled selected>' + placeholder + '</option>';

  var items = modalityConfig[spaceValue] || [];
  items.forEach(function(item) {
    var label = getNestedValue(translations, 'reserve.modality.' + item.key) || item.value;
    var opt = document.createElement('option');
    opt.value = item.value;
    opt.textContent = label;
    modalitySelect.appendChild(opt);
  });

  if (hoursRow) hoursRow.hidden = true;
}

function showAvailability(spaceValue) {
  if (!availNote) return;
  var availKey = availConfig[spaceValue];
  if (!availKey) { availNote.hidden = true; return; }
  var noteLabel = getNestedValue(translations, 'reserve.availabilityNote') || 'Disponibilidad orientativa';
  var availText = getNestedValue(translations, 'reserve.avail.' + availKey) || '';
  availNote.textContent = noteLabel + ': ' + availText;
  availNote.hidden = false;
}

function refreshBookingForm() {
  if (!spaceSelect) return;
  var selectedSpace = spaceSelect.value;

  /* Re-translate space placeholder if nothing selected */
  if (!selectedSpace) {
    var ph = getNestedValue(translations, 'reserve.spacePlaceholder') || 'Selecciona un espacio';
    spaceSelect.querySelector('option[value=""]').textContent = ph;

    var spaceKeys = ['space1', 'space2', 'space3'];
    var opts = spaceSelect.querySelectorAll('option[data-i18n]');
    opts.forEach(function(opt) {
      var k = opt.getAttribute('data-i18n');
      var v = getNestedValue(translations, k);
      if (v) opt.textContent = v;
    });
  }

  if (selectedSpace) {
    buildModalityOptions(selectedSpace);
    showAvailability(selectedSpace);
  }
}

function resetBookingFields() {
  if (modalitySelect) {
    var ph = getNestedValue(translations, 'reserve.modalityPlaceholder') || 'Selecciona una modalidad';
    modalitySelect.innerHTML = '<option value="" disabled selected>' + ph + '</option>';
  }
  if (hoursRow)  hoursRow.hidden  = true;
  if (availNote) availNote.hidden = true;
}

if (spaceSelect) {
  spaceSelect.addEventListener('change', function() {
    var val = spaceSelect.value;
    buildModalityOptions(val);
    showAvailability(val);
  });
}

if (modalitySelect) {
  modalitySelect.addEventListener('change', function() {
    var val = modalitySelect.value;
    if (hoursRow) {
      hoursRow.hidden = hourlyValues.indexOf(val) === -1;
    }
  });
}

/* ============================================================
   Form submission via WhatsApp
   ============================================================ */

if (reserveForm) {
  reserveForm.addEventListener('submit', function(e) {
    e.preventDefault();

    var name      = document.getElementById('r-name').value.trim();
    var email     = document.getElementById('r-email').value.trim();
    var phone     = document.getElementById('r-phone').value.trim();
    var date      = document.getElementById('r-date').value;
    var space     = document.getElementById('r-space').value;
    var modality  = document.getElementById('r-modality').value;
    var message   = document.getElementById('r-message').value.trim();
    const startTime = document.getElementById('r-start-time').value;
    const endTime   = document.getElementById('r-end-time').value;

    const text =
`Hola Bart, quiero hacer una reserva en Bart's Smart Coworking.

RESERVA
Nombre: ${name}
Email: ${email}
Telefono: ${phone}
Fecha: ${date}
Espacio: ${space}
Modalidad: ${modality}
Horario: ${startTime} - ${endTime}${message ? `
Mensaje: ${message}` : ''}`;

    var url = 'https://wa.me/34622059024?text=' + encodeURIComponent(text);
    window.open(url, '_blank');
  });
}

/* ============================================================
   Hero lightbox
   ============================================================ */

var heroThumb           = document.getElementById('heroVideoThumb');
var heroLightbox        = document.getElementById('heroLightbox');
var heroLightboxClose   = document.getElementById('heroLightboxClose');
var heroLightboxBackdrop = document.getElementById('heroLightboxBackdrop');
var heroVideo           = document.getElementById('heroVideo');

function openHeroLightbox() {
  if (!heroLightbox) return;
  heroLightbox.classList.add('open');
  heroLightbox.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  if (heroVideo) heroVideo.play();
}

function closeHeroLightbox() {
  if (!heroLightbox) return;
  heroLightbox.classList.remove('open');
  heroLightbox.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  if (heroVideo) { heroVideo.pause(); heroVideo.currentTime = 0; }
}

if (heroThumb) {
  heroThumb.addEventListener('click', openHeroLightbox);
}
if (heroLightboxClose) {
  heroLightboxClose.addEventListener('click', function(e) {
    e.stopPropagation();
    closeHeroLightbox();
  });
}
if (heroLightboxBackdrop) {
  heroLightboxBackdrop.addEventListener('click', closeHeroLightbox);
}
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape' && heroLightbox && heroLightbox.classList.contains('open')) {
    closeHeroLightbox();
  }
});

/* ============================================================
   Gallery carousel
   ============================================================ */

(function() {
  var viewport = document.getElementById('galleryViewport');
  var track    = document.getElementById('galleryTrack');
  var prevBtn  = document.getElementById('galleryPrev');
  var nextBtn  = document.getElementById('galleryNext');
  var dotsEl   = document.getElementById('galleryDots');

  if (!track || !viewport) return;

  var dots    = dotsEl ? Array.prototype.slice.call(dotsEl.querySelectorAll('.gallery__dot')) : [];
  var total   = track.querySelectorAll('.gallery__slide').length;
  var current = 0;

  function goTo(index) {
    current = (index + total) % total;
    track.style.transform = 'translateX(-' + (current * 100) + '%)';
    dots.forEach(function(dot, i) {
      dot.classList.toggle('gallery__dot--active', i === current);
    });
  }

  if (prevBtn) prevBtn.addEventListener('click', function() { goTo(current - 1); });
  if (nextBtn) nextBtn.addEventListener('click', function() { goTo(current + 1); });

  dots.forEach(function(dot) {
    dot.addEventListener('click', function() {
      goTo(parseInt(dot.getAttribute('data-index'), 10));
    });
  });

  /* Touch swipe */
  var touchStartX = 0;
  var touchStartY = 0;

  viewport.addEventListener('touchstart', function(e) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  viewport.addEventListener('touchend', function(e) {
    var dx = e.changedTouches[0].clientX - touchStartX;
    var dy = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 44) {
      goTo(dx > 0 ? current - 1 : current + 1);
    }
  }, { passive: true });
})();

/* ============================================================
   Init
   ============================================================ */

loadLanguage('es');
