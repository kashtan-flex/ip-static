/*
Версия: birthday-js-050-desktop-review-arrows
ИЗМЕНЕНИЯ:
- desktop: добавлены стрелки перелистывания назад/вперёд в открытом попапе отзывов.
- закрытие кликом вне карточки отзыва сохранено.
- mobile, меню, попапы форм и галерея не изменялись.
*/
(function(){
  'use strict';

  var DESIGN = {
    desktop:{
      width:1440,
      heroHeight:800,
      pageHeight:1350,
      galleryOpenPageHeight:4111
    },
    breakpoint:767
  };

  var VIDEO_REVEAL_DELAY = 3200;
  var MAGNETIC_STRENGTH = 7;
  var SCROLLTOP_REVEAL_OFFSET = 140;
  var GALLERY_SCROLL_DESIGN_TOP = 790;
  var GALLERY_CLOSE_ANIMATION_DURATION = 760;

  var page = document.querySelector('[data-birthday-page]');
  var stage = document.querySelector('.ip-birthday-stage');

  var menuButton = document.querySelector('.ip-menu-toggle');
  var menuPanel = document.querySelector('.ip-menu-panel');

  var accordions = Array.prototype.slice.call(
    document.querySelectorAll('.ip-accordion')
  );

  var popup = document.querySelector('[data-popup="main"]');

  var popupOpenTriggers = Array.prototype.slice.call(
    document.querySelectorAll('[data-popup-open]')
  );

  var popupCloseTriggers = Array.prototype.slice.call(
    document.querySelectorAll('[data-popup-close]')
  );

  var galleryButton = document.querySelector('[data-birthday-gallery-open]');
  var gallery = document.querySelector('[data-birthday-gallery]');

  var scrollTopButton = document.querySelector('.ip-birthday-scrolltop');

  var galleryLightbox = document.querySelector('[data-gallery-lightbox]');
  var galleryLightboxImage = document.querySelector('[data-gallery-lightbox-image]');
  var galleryLightboxCounter = document.querySelector('[data-gallery-lightbox-counter]');
  var galleryLightboxPrev = document.querySelector('[data-gallery-lightbox-prev]');
  var galleryLightboxNext = document.querySelector('[data-gallery-lightbox-next]');

  var galleryLightboxCloseTriggers = Array.prototype.slice.call(
    document.querySelectorAll('[data-gallery-lightbox-close]')
  );

  var galleryLightboxOpenTriggers = Array.prototype.slice.call(
    document.querySelectorAll('[data-gallery-lightbox-open]')
  );

  var reviewPopup = document.querySelector('[data-review-popup]');
  var reviewPopupCard = document.querySelector('[data-review-popup-card]');

  var reviewCloseTriggers = Array.prototype.slice.call(
    document.querySelectorAll('[data-review-close]')
  );

  var reviewButtons = Array.prototype.slice.call(
    document.querySelectorAll('[data-review-open]')
  );

  var resizeFrame = null;
  var videoRevealTimer = null;
  var scrollSpacer = null;
  var activeGalleryIndex = 0;
  var activeReviewIndex = -1;
  var reviewPrevButton = null;
  var reviewNextButton = null;
  var galleryWheelLocked = false;
  var galleryCloseTimer = null;

  if(!page || !stage){
    return;
  }

  function isMobile(){
    return window.innerWidth <= DESIGN.breakpoint;
  }

  function isTouchDevice(){
    return window.matchMedia('(hover: none), (pointer: coarse)').matches;
  }

  function getViewportHeight(){
    if(window.visualViewport && window.visualViewport.height){
      return window.visualViewport.height;
    }

    return window.innerHeight;
  }

  function isGalleryOpen(){
    return !!(
      gallery &&
      gallery.classList.contains('is-visible')
    );
  }

  function getCurrentPageHeight(){
    if(!isMobile() && isGalleryOpen()){
      return DESIGN.desktop.galleryOpenPageHeight;
    }

    return DESIGN.desktop.pageHeight;
  }

  function ensureScrollSpacer(){
    if(scrollSpacer){
      return scrollSpacer;
    }

    scrollSpacer = document.createElement('div');
    scrollSpacer.setAttribute('data-birthday-scroll-spacer', '');
    scrollSpacer.setAttribute('aria-hidden', 'true');

    scrollSpacer.style.position = 'relative';
    scrollSpacer.style.zIndex = '0';
    scrollSpacer.style.width = '1px';
    scrollSpacer.style.pointerEvents = 'none';
    scrollSpacer.style.opacity = '0';

    page.appendChild(scrollSpacer);

    return scrollSpacer;
  }

  function updateScale(){
    var viewportWidth = window.innerWidth;
    var viewportHeight = getViewportHeight();

    var scale = isMobile()
      ? viewportWidth / DESIGN.desktop.width
      : viewportHeight / DESIGN.desktop.heroHeight;

    var currentPageHeight = getCurrentPageHeight();

    var scaledPageHeight = Math.ceil(
      currentPageHeight * scale
    );

    page.style.setProperty(
      '--birthday-scale',
      scale.toFixed(5)
    );

    page.style.setProperty(
      '--birthday-vh',
      (viewportHeight * 0.01) + 'px'
    );

    page.style.height = viewportHeight + 'px';
    page.style.minHeight = viewportHeight + 'px';
    page.style.overflowX = 'hidden';
    page.style.overflowY = 'auto';

    ensureScrollSpacer().style.height = scaledPageHeight + 'px';

    updateScrollTopVisibility();
  }

  function updateScrollTopVisibility(){
    if(!scrollTopButton){
      return;
    }

    if(isMobile()){
      scrollTopButton.classList.remove('is-visible');
      return;
    }

    var viewportHeight = getViewportHeight();
    var currentPageHeight = getCurrentPageHeight();
    var scaleValue = parseFloat(
      page.style.getPropertyValue('--birthday-scale')
    );

    if(!scaleValue || scaleValue <= 0){
      scaleValue = viewportHeight / DESIGN.desktop.heroHeight;
    }

    var scaledPageHeight = Math.ceil(
      currentPageHeight * scaleValue
    );

    var distanceToBottom = scaledPageHeight - (page.scrollTop + viewportHeight);

    if(distanceToBottom <= SCROLLTOP_REVEAL_OFFSET){
      scrollTopButton.classList.add('is-visible');
      return;
    }

    scrollTopButton.classList.remove('is-visible');
  }

  function getCurrentScaleValue(){
    var scaleValue = parseFloat(
      page.style.getPropertyValue('--birthday-scale')
    );

    if(!scaleValue || scaleValue <= 0){
      scaleValue = getViewportHeight() / DESIGN.desktop.heroHeight;
    }

    return scaleValue;
  }

  function scrollBirthdayToGallery(){
    if(isMobile()){
      return;
    }

    page.scrollTo({
      top:Math.max(0, Math.round(GALLERY_SCROLL_DESIGN_TOP * getCurrentScaleValue())),
      behavior:'smooth'
    });
  }

  function scrollBirthdayToTop(){
    page.scrollTo({
      top:0,
      behavior:'smooth'
    });
  }

  function requestScaleUpdate(){
    if(resizeFrame){
      window.cancelAnimationFrame(resizeFrame);
    }

    resizeFrame = window.requestAnimationFrame(updateScale);
  }

  function revealVideo(){
    if(!page || page.classList.contains('is-video-ready')){
      return;
    }

    page.classList.add('is-video-ready');
  }

  function setupVideoPosterTransition(){
    if(videoRevealTimer){
      window.clearTimeout(videoRevealTimer);
    }

    videoRevealTimer = window.setTimeout(function(){
      revealVideo();
    }, VIDEO_REVEAL_DELAY);
  }

  function resetButtonMagnet(button){
    button.style.setProperty('--button-x', '0px');
    button.style.setProperty('--button-y', '0px');
  }

  function updateButtonMagnet(button, event){
    var rect = button.getBoundingClientRect();

    var relativeX = event.clientX - rect.left;
    var relativeY = event.clientY - rect.top;

    var centerX = rect.width / 2;
    var centerY = rect.height / 2;

    var moveX = ((relativeX - centerX) / centerX) * MAGNETIC_STRENGTH;
    var moveY = ((relativeY - centerY) / centerY) * MAGNETIC_STRENGTH;

    button.style.setProperty('--button-x', moveX.toFixed(2) + 'px');
    button.style.setProperty('--button-y', moveY.toFixed(2) + 'px');
  }

  function setupMagneticButtons(){
    if(isTouchDevice()){
      return;
    }

    var buttons = Array.prototype.slice.call(
      document.querySelectorAll('.ip-birthday-button')
    );

    buttons.forEach(function(button){
      button.addEventListener('mousemove', function(event){
        updateButtonMagnet(button, event);
      });

      button.addEventListener('mouseleave', function(){
        resetButtonMagnet(button);
      });

      button.addEventListener('blur', function(){
        resetButtonMagnet(button);
      });
    });
  }

  function openMenu(){
    if(!menuButton || !menuPanel){
      return;
    }

    menuButton.classList.add('is-open');
    menuPanel.classList.add('is-open');
    menuPanel.style.pointerEvents = 'auto';
  }

  function closeMenu(){
    if(!menuButton || !menuPanel){
      return;
    }

    menuButton.classList.remove('is-open');
    menuPanel.classList.remove('is-open');
    menuPanel.style.pointerEvents = 'none';

    accordions.forEach(function(accordion){
      accordion.classList.remove('is-open');
    });
  }

  function toggleMenu(event){
    if(event){
      event.preventDefault();
      event.stopPropagation();
    }

    if(!menuPanel){
      return;
    }

    if(menuPanel.classList.contains('is-open')){
      closeMenu();
      return;
    }

    openMenu();
  }

  function setupAccordion(accordion){
    var button = accordion.querySelector('.ip-accordion-button');

    if(!button){
      return;
    }

    button.addEventListener('click', function(event){
      event.preventDefault();
      event.stopPropagation();

      accordion.classList.toggle('is-open');
    });
  }

  function openMainPopup(){
    if(!popup){
      return;
    }

    closeMenu();
    closeReviewPopup();

    popup.classList.add('is-open');
    popup.setAttribute('aria-hidden', 'false');

    document.documentElement.classList.add('ip-popup-lock');
    document.body.classList.add('ip-popup-lock');
  }

  function closeMainPopup(){
    if(!popup){
      return;
    }

    popup.classList.remove('is-open');
    popup.setAttribute('aria-hidden', 'true');

    document.documentElement.classList.remove('ip-popup-lock');
    document.body.classList.remove('ip-popup-lock');

    updateScale();
  }

  function setupMainPopupTriggers(){
    popupOpenTriggers.forEach(function(trigger){
      trigger.addEventListener('click', function(event){
        event.preventDefault();
        event.stopPropagation();

        openMainPopup();
      });
    });

    popupCloseTriggers.forEach(function(trigger){
      trigger.addEventListener('click', function(event){
        event.preventDefault();

        closeMainPopup();
      });
    });
  }

  function getReviewOrigin(reviewButton){
    var rect = reviewButton.getBoundingClientRect();

    return {
      x:rect.left + rect.width / 2,
      y:rect.top + rect.height / 2
    };
  }

  function setReviewPopupOrigin(reviewButton){
    if(!reviewPopupCard || !reviewButton){
      return;
    }

    var reviewId =
      reviewButton.getAttribute('data-review-open') ||
      '';

    if(reviewId === 'review-4'){
      reviewPopupCard.style.transformOrigin = '50% 50%';
      return;
    }

    var sourceRect = reviewButton.getBoundingClientRect();

    var sourceX =
      sourceRect.left + sourceRect.width / 2;

    var sourceY =
      sourceRect.top + sourceRect.height / 2;

    var popupWidth =
      reviewPopupCard.offsetWidth ||
      parseFloat(window.getComputedStyle(reviewPopupCard).width) ||
      339;

    var popupHeight =
      reviewPopupCard.offsetHeight ||
      parseFloat(window.getComputedStyle(reviewPopupCard).height) ||
      528;

    var finalLeft =
      (window.innerWidth - popupWidth) / 2;

    var finalTop =
      (window.innerHeight - popupHeight) / 2;

    var originX =
      sourceX - finalLeft;

    var originY =
      sourceY - finalTop;

    reviewPopupCard.style.transformOrigin =
      originX.toFixed(2) + 'px ' + originY.toFixed(2) + 'px';
  }

  function cloneReviewContent(reviewButton){
    if(!reviewPopupCard){
      return;
    }

    var clone = reviewButton.cloneNode(true);

    clone.removeAttribute('data-review-open');
    clone.setAttribute('type', 'button');
    clone.setAttribute('tabindex', '-1');

    reviewPopupCard.innerHTML = '';
    reviewPopupCard.appendChild(clone);
  }

  function normalizeReviewIndex(index){
    if(!reviewButtons.length){
      return -1;
    }

    return (index + reviewButtons.length) % reviewButtons.length;
  }

  function setReviewNavigationState(){
    var hasMultipleReviews = reviewButtons.length > 1;

    if(reviewPrevButton){
      reviewPrevButton.hidden = !hasMultipleReviews;
    }

    if(reviewNextButton){
      reviewNextButton.hidden = !hasMultipleReviews;
    }
  }

  function showReviewByIndex(index, useSourceOrigin){
    var normalizedIndex = normalizeReviewIndex(index);

    if(normalizedIndex < 0){
      return;
    }

    activeReviewIndex = normalizedIndex;

    var nextReviewButton = reviewButtons[activeReviewIndex];

    if(!nextReviewButton){
      return;
    }

    cloneReviewContent(nextReviewButton);

    if(useSourceOrigin){
      setReviewPopupOrigin(nextReviewButton);
    } else if(reviewPopupCard){
      reviewPopupCard.style.transformOrigin = '50% 50%';
    }

    setReviewNavigationState();
  }

  function showAdjacentReview(step){
    if(activeReviewIndex < 0){
      activeReviewIndex = 0;
    }

    showReviewByIndex(activeReviewIndex + step, false);
  }

  function createReviewNavButton(direction){
    var button = document.createElement('button');

    button.type = 'button';
    button.className =
      'ip-review-popup-nav ip-review-popup-nav-' + direction;
    button.setAttribute(
      'aria-label',
      direction === 'prev' ? 'Предыдущий отзыв' : 'Следующий отзыв'
    );
    button.textContent = direction === 'prev' ? '‹' : '›';

    button.addEventListener('click', function(event){
      event.preventDefault();
      event.stopPropagation();

      showAdjacentReview(direction === 'prev' ? -1 : 1);
    });

    return button;
  }

  function ensureReviewNavigation(){
    if(!reviewPopup || reviewPrevButton || reviewNextButton){
      return;
    }

    reviewPrevButton = createReviewNavButton('prev');
    reviewNextButton = createReviewNavButton('next');

    reviewPopup.appendChild(reviewPrevButton);
    reviewPopup.appendChild(reviewNextButton);

    setReviewNavigationState();
  }

  function openReviewPopup(reviewButton){
    if(!reviewPopup || !reviewPopupCard || !reviewButton){
      return;
    }

    closeMenu();
    closeMainPopup();

    ensureReviewNavigation();
    activeReviewIndex = reviewButtons.indexOf(reviewButton);
    showReviewByIndex(activeReviewIndex, true);

    reviewPopup.classList.add('is-open');
    reviewPopup.setAttribute('aria-hidden', 'false');

    document.documentElement.classList.add('ip-popup-lock');
    document.body.classList.add('ip-popup-lock');
  }

  function closeReviewPopup(){
    if(!reviewPopup || !reviewPopupCard){
      return;
    }

    reviewPopup.classList.remove('is-open');
    reviewPopup.setAttribute('aria-hidden', 'true');
    activeReviewIndex = -1;

    window.setTimeout(function(){
      if(!reviewPopup.classList.contains('is-open')){
        reviewPopupCard.innerHTML = '';
      }
    }, 520);

    if(!popup || !popup.classList.contains('is-open')){
      document.documentElement.classList.remove('ip-popup-lock');
      document.body.classList.remove('ip-popup-lock');
    }

    updateScale();
  }

  function setupReviewPopupTriggers(){
    reviewButtons.forEach(function(reviewButton){
      reviewButton.addEventListener('click', function(event){
        event.preventDefault();
        event.stopPropagation();

        openReviewPopup(reviewButton);
      });
    });

    reviewCloseTriggers.forEach(function(trigger){
      trigger.addEventListener('click', function(event){
        event.preventDefault();

        closeReviewPopup();
      });
    });
  }


  function getGalleryLightboxItems(){
    if(!gallery){
      return [];
    }

    return Array.prototype.slice.call(
      gallery.querySelectorAll('.ip-birthday-gallery-item img')
    );
  }

  function normalizeGalleryIndex(index){
    var items = getGalleryLightboxItems();

    if(!items.length){
      return 0;
    }

    if(index < 0){
      return items.length - 1;
    }

    if(index >= items.length){
      return 0;
    }

    return index;
  }

  function updateGalleryLightboxImage(index){
    var items = getGalleryLightboxItems();

    if(!galleryLightboxImage || !items.length){
      return;
    }

    activeGalleryIndex = normalizeGalleryIndex(index);

    var sourceImage = items[activeGalleryIndex];

    galleryLightboxImage.src = sourceImage.currentSrc || sourceImage.src;
    galleryLightboxImage.alt = sourceImage.alt || 'Фотография с дня рождения';

    if(galleryLightboxCounter){
      galleryLightboxCounter.textContent =
        String(activeGalleryIndex + 1).padStart(2, '0') +
        ' / ' +
        String(items.length).padStart(2, '0');
    }
  }

  function openGalleryLightbox(index){
    if(!galleryLightbox || !galleryLightboxImage){
      return;
    }

    closeMenu();
    closeMainPopup();
    closeReviewPopup();

    updateGalleryLightboxImage(index);

    galleryLightbox.classList.add('is-open');
    galleryLightbox.setAttribute('aria-hidden', 'false');

    document.documentElement.classList.add('ip-popup-lock');
    document.body.classList.add('ip-popup-lock');
  }

  function closeGalleryLightbox(){
    if(!galleryLightbox){
      return;
    }

    galleryLightbox.classList.remove('is-open');
    galleryLightbox.setAttribute('aria-hidden', 'true');

    window.setTimeout(function(){
      if(
        galleryLightbox &&
        !galleryLightbox.classList.contains('is-open') &&
        galleryLightboxImage
      ){
        galleryLightboxImage.removeAttribute('src');
        galleryLightboxImage.alt = '';
      }
    }, 380);

    if(
      (!popup || !popup.classList.contains('is-open')) &&
      (!reviewPopup || !reviewPopup.classList.contains('is-open'))
    ){
      document.documentElement.classList.remove('ip-popup-lock');
      document.body.classList.remove('ip-popup-lock');
    }

    updateScale();
  }

  function showPreviousGalleryImage(){
    updateGalleryLightboxImage(activeGalleryIndex - 1);
  }

  function showNextGalleryImage(){
    updateGalleryLightboxImage(activeGalleryIndex + 1);
  }

  function isGalleryLightboxOpen(){
    return !!(
      galleryLightbox &&
      galleryLightbox.classList.contains('is-open')
    );
  }

  function setupGalleryLightboxTriggers(){
    galleryLightboxOpenTriggers.forEach(function(trigger){
      trigger.addEventListener('click', function(event){
        event.preventDefault();
        event.stopPropagation();

        var index = parseInt(
          trigger.getAttribute('data-gallery-index') || '0',
          10
        );

        openGalleryLightbox(index);
      });

      trigger.addEventListener('keydown', function(event){
        if(event.key !== 'Enter' && event.key !== ' '){
          return;
        }

        event.preventDefault();

        var index = parseInt(
          trigger.getAttribute('data-gallery-index') || '0',
          10
        );

        openGalleryLightbox(index);
      });
    });

    galleryLightboxCloseTriggers.forEach(function(trigger){
      trigger.addEventListener('click', function(event){
        event.preventDefault();
        closeGalleryLightbox();
      });
    });

    if(galleryLightboxPrev){
      galleryLightboxPrev.addEventListener('click', function(event){
        event.preventDefault();
        event.stopPropagation();
        showPreviousGalleryImage();
      });
    }

    if(galleryLightboxNext){
      galleryLightboxNext.addEventListener('click', function(event){
        event.preventDefault();
        event.stopPropagation();
        showNextGalleryImage();
      });
    }

    if(galleryLightbox){
      galleryLightbox.addEventListener('click', function(event){
        if(!isGalleryLightboxOpen()){
          return;
        }

        if(event.target && event.target.closest('.ip-gallery-lightbox-image')){
          return;
        }

        event.preventDefault();
        closeGalleryLightbox();
      });

      galleryLightbox.addEventListener('wheel', function(event){
        if(!isGalleryLightboxOpen()){
          return;
        }

        event.preventDefault();

        if(galleryWheelLocked){
          return;
        }

        galleryWheelLocked = true;

        if(event.deltaY > 0 || event.deltaX > 0){
          showNextGalleryImage();
        }else{
          showPreviousGalleryImage();
        }

        window.setTimeout(function(){
          galleryWheelLocked = false;
        }, 360);
      }, { passive:false });
    }
  }

  function openBirthdayGallery(){
    if(!gallery || !galleryButton){
      return;
    }

    if(galleryCloseTimer){
      window.clearTimeout(galleryCloseTimer);
      galleryCloseTimer = null;
    }

    page.classList.remove('is-gallery-closing');
    page.classList.add('is-gallery-open');
    gallery.classList.add('is-visible');
    gallery.setAttribute('aria-hidden', 'false');
    galleryButton.textContent = 'Скрыть фото';

    updateScale();

    window.setTimeout(function(){
      scrollBirthdayToGallery();
    }, 80);
  }

  function closeBirthdayGallery(){
    if(!gallery || !galleryButton){
      return;
    }

    if(galleryCloseTimer){
      window.clearTimeout(galleryCloseTimer);
    }

    page.classList.add('is-gallery-closing');
    gallery.classList.remove('is-visible');
    gallery.setAttribute('aria-hidden', 'true');
    galleryButton.textContent = 'Смотреть фото';

    galleryCloseTimer = window.setTimeout(function(){
      page.classList.remove('is-gallery-open');
      page.classList.remove('is-gallery-closing');
      galleryCloseTimer = null;
      updateScale();
    }, GALLERY_CLOSE_ANIMATION_DURATION);
  }

  function toggleGallery(event){
    if(event){
      event.preventDefault();
    }

    if(!gallery || !galleryButton){
      return;
    }

    if(gallery.classList.contains('is-visible')){
      closeBirthdayGallery();
      return;
    }

    openBirthdayGallery();
  }

  function setupGalleryTrigger(){
    if(!galleryButton){
      return;
    }

    galleryButton.addEventListener('click', toggleGallery);
  }

  function setupDateMask(){
    var activePopup = document.querySelector('[data-popup="main"]');

    if(!activePopup){
      return;
    }

    var dateInput =
      activePopup.querySelector('input[name="date"]') ||
      activePopup.querySelector('.ip-popup-fields input:nth-child(3)');

    if(!dateInput){
      return;
    }

    var form = dateInput.form || activePopup.querySelector('form');
    var errorText = 'Введите корректную дату в формате ДД.ММ.ГГГГ';

    function getDigits(value){
      return String(value || '').replace(/\D/g, '').slice(0, 8);
    }

    function formatDateValue(digits){
      var formatted = '';

      if(digits.length > 0){
        formatted += digits.substring(0, 2);
      }

      if(digits.length >= 3){
        formatted += '.' + digits.substring(2, 4);
      }

      if(digits.length >= 5){
        formatted += '.' + digits.substring(4, 8);
      }

      return formatted;
    }

    function isCompleteDate(value){
      return /^\d{2}\.\d{2}\.\d{4}$/.test(value);
    }

    function isRealDate(value){
      if(!isCompleteDate(value)){
        return false;
      }

      var parts = value.split('.');
      var day = parseInt(parts[0], 10);
      var month = parseInt(parts[1], 10);
      var year = parseInt(parts[2], 10);

      if(year < 1900 || year > 2099){
        return false;
      }

      if(month < 1 || month > 12){
        return false;
      }

      if(day < 1 || day > 31){
        return false;
      }

      var checkedDate = new Date(year, month - 1, day);

      return checkedDate.getFullYear() === year &&
        checkedDate.getMonth() === month - 1 &&
        checkedDate.getDate() === day;
    }

    var lastValidDigits = getDigits(dateInput.value);

    function isValidDatePrefix(digits){
      if(!digits.length){
        return true;
      }

      var firstDayDigit = parseInt(digits.charAt(0), 10);

      if(digits.length >= 1 && (firstDayDigit < 0 || firstDayDigit > 3)){
        return false;
      }

      if(digits.length >= 2){
        var day = parseInt(digits.substring(0, 2), 10);

        if(day < 1 || day > 31){
          return false;
        }
      }

      if(digits.length >= 3){
        var firstMonthDigit = parseInt(digits.charAt(2), 10);

        if(firstMonthDigit < 0 || firstMonthDigit > 1){
          return false;
        }
      }

      if(digits.length >= 4){
        var month = parseInt(digits.substring(2, 4), 10);

        if(month < 1 || month > 12){
          return false;
        }
      }

      if(digits.length >= 5){
        var firstYearDigit = parseInt(digits.charAt(4), 10);

        if(firstYearDigit !== 1 && firstYearDigit !== 2){
          return false;
        }
      }

      if(digits.length >= 6){
        var firstTwoYearDigits = digits.substring(4, 6);

        if(firstTwoYearDigits !== '19' && firstTwoYearDigits !== '20'){
          return false;
        }
      }

      if(digits.length === 8 && !isRealDate(formatDateValue(digits))){
        return false;
      }

      return true;
    }

    function updateValidity(){
      var digits = getDigits(dateInput.value);

      if(!digits.length){
        dateInput.setCustomValidity('');
        return true;
      }

      if(!isValidDatePrefix(digits)){
        dateInput.setCustomValidity(errorText);
        return false;
      }

      if(digits.length === 8 && !isRealDate(formatDateValue(digits))){
        dateInput.setCustomValidity(errorText);
        return false;
      }

      dateInput.setCustomValidity('');
      return true;
    }

    function updateDateValue(){
      var digits = getDigits(dateInput.value);

      if(!isValidDatePrefix(digits)){
        digits = lastValidDigits;
      }else{
        lastValidDigits = digits;
      }

      if(isValidDatePrefix(digits)){
        lastValidDigits = digits;
      }else{
        digits = lastValidDigits;
      }

      dateInput.value = formatDateValue(digits);
      updateValidity();
    }

    dateInput.setAttribute('type', 'text');
    dateInput.setAttribute('placeholder', 'Дата');
    dateInput.setAttribute('inputmode', 'numeric');
    dateInput.setAttribute('maxlength', '10');
    dateInput.setAttribute('autocomplete', 'off');

    dateInput.addEventListener('input', updateDateValue);

    dateInput.addEventListener('paste', function(event){
      event.preventDefault();

      var clipboard = event.clipboardData || window.clipboardData;
      var pastedText = clipboard ? clipboard.getData('text') : '';
      var digits = getDigits(pastedText);

      if(isValidDatePrefix(digits)){
        lastValidDigits = digits;
      }else{
        digits = lastValidDigits;
      }

      dateInput.value = formatDateValue(digits);
      updateValidity();
    });

    dateInput.addEventListener('blur', function(){
      updateDateValue();
    });

    if(form && !form.hasAttribute('data-ip-date-validation')){
      form.setAttribute('data-ip-date-validation', 'true');

      form.addEventListener(
        'submit',
        function(event){
          if(!updateValidity()){
            event.preventDefault();
            dateInput.reportValidity();
          }
        },
        true
      );
    }
  }

  function closeMenuOnUserScroll(){
    if(menuPanel && menuPanel.classList.contains('is-open')){
      closeMenu();
    }
  }

  function setupMenuCloseOnScroll(){
    var lastScrollTop = page.scrollTop || 0;

    page.addEventListener(
      'scroll',
      function(){
        var currentScrollTop = page.scrollTop || 0;

        if(Math.abs(currentScrollTop - lastScrollTop) > 2){
          closeMenuOnUserScroll();
        }

        lastScrollTop = currentScrollTop <= 0
          ? 0
          : currentScrollTop;

        updateScrollTopVisibility();
      },
      { passive:true }
    );

    window.addEventListener(
      'wheel',
      function(event){
        if(menuPanel && menuPanel.contains(event.target)){
          return;
        }

        closeMenuOnUserScroll();
      },
      { passive:true }
    );
  }

  function bindKeyboard(){
    document.addEventListener('keydown', function(event){
      if(isGalleryLightboxOpen()){
        if(event.key === 'Escape'){
          event.preventDefault();
          closeGalleryLightbox();
          return;
        }

        if(event.key === 'ArrowLeft' || event.key === 'ArrowUp'){
          event.preventDefault();
          showPreviousGalleryImage();
          return;
        }

        if(event.key === 'ArrowRight' || event.key === 'ArrowDown'){
          event.preventDefault();
          showNextGalleryImage();
          return;
        }
      }

      if(event.key !== 'Escape'){
        return;
      }

      closeReviewPopup();
      closeMainPopup();
      closeMenu();
    });
  }

  function bindEvents(){
    window.addEventListener(
      'resize',
      requestScaleUpdate,
      { passive:true }
    );

    window.addEventListener(
      'orientationchange',
      function(){
        window.setTimeout(updateScale, 250);
      },
      { passive:true }
    );

    if(window.visualViewport){
      window.visualViewport.addEventListener(
        'resize',
        requestScaleUpdate,
        { passive:true }
      );
    }

    if(menuButton){
      menuButton.addEventListener('click', toggleMenu);
    }

    if(scrollTopButton){
      scrollTopButton.addEventListener('click', scrollBirthdayToTop);
    }

    accordions.forEach(setupAccordion);

    setupVideoPosterTransition();
    setupMainPopupTriggers();
    setupReviewPopupTriggers();
    setupGalleryTrigger();
    setupGalleryLightboxTriggers();
    setupMenuCloseOnScroll();
    setupDateMask();
    setupMagneticButtons();
    bindKeyboard();
  }

  function init(){
    updateScale();
    bindEvents();
  }

  init();

})();