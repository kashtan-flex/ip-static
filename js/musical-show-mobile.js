/*
Версия: musical-show-mobile-js-083-small-gallery-cross
ИЗМЕНЕНИЯ:
- mobile lightbox: fallback-размер крестика закрытия уменьшен с 34×34px до 27×27px.
- mobile lightbox: tap-переключение фото сохранено, свайп-переключение не возвращалось.
- Mobile menu, формы, Tilda Lead Bridge, маска телефона, cookie и видео не изменялись.
*/

(function(){
  'use strict';

  var DESIGN = {
    mobile:{
      width:390,
      height:700,
      stageHeightClosed:2148,
      stageHeightOpened:6372
    },
    breakpoint:767
  };

  var SCROLLTOP_REVEAL_OFFSET = 140;
  var VIDEO_REVEAL_DELAY = 3200;

  var page = document.querySelector('[data-musical-show-mobile-page]');
  var stage = document.querySelector('.ip-musical-show-mobile-content');

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

  var galleryButton = document.querySelector('[data-musical-show-mobile-gallery-open]');
  var gallery = document.querySelector('[data-musical-show-mobile-gallery]');

  var scrollTopButton = document.querySelector('.ip-musical-show-mobile-scrolltop');

  var videoFrame = document.querySelector('[data-musical-show-mobile-video-frame]');
  var videoPoster = document.querySelector('[data-musical-show-mobile-video-poster]');

  var lightbox = document.querySelector('[data-musical-show-mobile-lightbox]');
  var lightboxImage = document.querySelector('[data-musical-show-mobile-lightbox-image]');
  var lightboxCounter = document.querySelector('[data-musical-show-mobile-lightbox-counter]');
  var lightboxCloseButton = document.querySelector('.ip-musical-show-mobile-lightbox-close');
  var lightboxCloseTriggers = Array.prototype.slice.call(
    document.querySelectorAll('[data-musical-show-mobile-lightbox-close]')
  );

  var galleryLightboxItems = Array.prototype.slice.call(
    document.querySelectorAll('[data-musical-show-mobile-lightbox-open]')
  );

  var resizeFrame = null;
  var touchStartY = null;
  var touchStartedInsideMenu = false;
  var videoPosterHidden = false;
  var lightboxIndex = 0;
  var lightboxImages = [];

  var galleryImagesPreloaded = false;
  var galleryPreloadQueue = [];
  var galleryPreloadIndex = 0;
  var galleryPreloadTimer = null;

  function getGalleryImageSource(image){
    if(!image){
      return '';
    }

    return image.currentSrc ||
      image.getAttribute('src') ||
      image.getAttribute('data-src') ||
      '';
  }

  function warmGalleryImage(src){
    if(!src){
      return;
    }

    var preloadImage = new Image();
    preloadImage.decoding = 'async';
    preloadImage.src = src;
  }

  function preloadGalleryImageChunk(chunkSize){
    var loadedInChunk = 0;

    while(
      galleryPreloadIndex < galleryPreloadQueue.length &&
      loadedInChunk < chunkSize
    ){
      warmGalleryImage(galleryPreloadQueue[galleryPreloadIndex]);
      galleryPreloadIndex += 1;
      loadedInChunk += 1;
    }

    if(galleryPreloadIndex >= galleryPreloadQueue.length){
      galleryPreloadTimer = null;
      return;
    }

    galleryPreloadTimer = window.setTimeout(function(){
      preloadGalleryImageChunk(6);
    }, 320);
  }

  function preloadOpenedGalleryImages(){
    if(galleryImagesPreloaded || !isMobile()){
      return;
    }

    galleryImagesPreloaded = true;

    var seenSources = {};
    var images = galleryLightboxItems.map(function(item){
      return item.querySelector('img');
    }).filter(Boolean);

    galleryPreloadQueue = images.map(function(image, index){
      image.setAttribute('loading', 'eager');
      image.setAttribute('decoding', 'async');

      if(index < 8){
        image.setAttribute('fetchpriority', 'high');
      }

      return getGalleryImageSource(image);
    }).filter(function(src){
      if(!src || seenSources[src]){
        return false;
      }

      seenSources[src] = true;
      return true;
    });

    galleryPreloadIndex = 0;

    if(galleryPreloadTimer){
      window.clearTimeout(galleryPreloadTimer);
      galleryPreloadTimer = null;
    }

    preloadGalleryImageChunk(8);
  }


  if(!page || !stage){
    return;
  }

  function isMobile(){
    return window.innerWidth <= DESIGN.breakpoint;
  }

  function getViewportHeight(){
    if(
      window.visualViewport &&
      window.visualViewport.height
    ){
      return window.visualViewport.height;
    }

    return window.innerHeight;
  }

  function updateViewportHeightVariable(){
    var viewportHeight = getViewportHeight();

    document.documentElement.style.setProperty(
      '--musical-show-vh',
      (viewportHeight * 0.01) + 'px'
    );

    document.documentElement.style.setProperty(
      '--musical-show-mobile-vh',
      (viewportHeight * 0.01) + 'px'
    );

    return viewportHeight;
  }

  function updateScrollTopVisibility(){
    if(!scrollTopButton){
      return;
    }

    if(!isMobile()){
      scrollTopButton.classList.remove('is-visible');
      return;
    }

    var scrollTop =
      window.pageYOffset ||
      document.documentElement.scrollTop ||
      0;

    var viewportHeight = getViewportHeight();

    var pageHeight = Math.max(
      document.documentElement.scrollHeight,
      document.body.scrollHeight
    );

    var distanceToBottom = pageHeight - (scrollTop + viewportHeight);

    if(distanceToBottom <= SCROLLTOP_REVEAL_OFFSET){
      scrollTopButton.classList.add('is-visible');
      return;
    }

    scrollTopButton.classList.remove('is-visible');
  }

  function updateScale(){
    var viewportWidth = window.innerWidth;
    var viewportHeight = updateViewportHeightVariable();

    var scale;
    var scaledHeight;

    if(isMobile()){
      scale = Math.max(
        viewportWidth / DESIGN.mobile.width,
        viewportHeight / DESIGN.mobile.height
      );

      var currentStageHeight = page.classList.contains('has-gallery-opened')
        ? DESIGN.mobile.stageHeightOpened
        : DESIGN.mobile.stageHeightClosed;

      scaledHeight = Math.ceil(
        currentStageHeight * scale
      );

      document.documentElement.style.setProperty(
        '--musical-show-mobile-scale',
        scale.toFixed(5)
      );

      document.documentElement.style.setProperty(
        '--musical-show-mobile-page-height',
        scaledHeight + 'px'
      );

      page.style.height = '';
      page.style.minHeight = '';

      document.documentElement.style.height = 'auto';
      document.body.style.height = 'auto';

      document.documentElement.style.overflowX = 'hidden';
      document.body.style.overflowX = 'hidden';

      document.documentElement.style.overflowY = 'auto';
      document.body.style.overflowY = 'auto';

      updateScrollTopVisibility();

      return;
    }

    document.documentElement.style.removeProperty(
      '--musical-show-mobile-scale'
    );

    document.documentElement.style.removeProperty(
      '--musical-show-mobile-page-height'
    );

    page.style.height = '';
    page.style.minHeight = '';

    document.documentElement.style.height = '';
    document.body.style.height = '';

    document.documentElement.style.overflowX = '';
    document.body.style.overflowX = '';

    document.documentElement.style.overflowY = '';
    document.body.style.overflowY = '';

    updateScrollTopVisibility();
  }

  function requestScaleUpdate(){
    if(resizeFrame){
      window.cancelAnimationFrame(resizeFrame);
    }

    resizeFrame = window.requestAnimationFrame(updateScale);
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

  function openPopup(){
    if(!popup){
      return;
    }

    closeMenu();

    popup.classList.add('is-open');
    popup.setAttribute('aria-hidden', 'false');

    document.documentElement.classList.add('ip-popup-lock');
    document.body.classList.add('ip-popup-lock');
  }

  function closePopup(){
    if(!popup){
      return;
    }

    popup.classList.remove('is-open');
    popup.setAttribute('aria-hidden', 'true');

    document.documentElement.classList.remove('ip-popup-lock');
    document.body.classList.remove('ip-popup-lock');

    updateScale();
  }

  function scrollToTop(){
    window.scrollTo({
      top:0,
      behavior:'smooth'
    });
  }

  function setGalleryButtonText(text){
    if(!galleryButton){
      return;
    }

    galleryButton.textContent = text;
  }

  function scrollToElement(element, offset){
    if(!element){
      return;
    }

    var targetTop =
      element.getBoundingClientRect().top +
      (
        window.pageYOffset ||
        document.documentElement.scrollTop ||
        0
      ) -
      offset;

    window.scrollTo({
      top:targetTop,
      behavior:'smooth'
    });
  }

  function openGallery(){
    if(!gallery){
      return;
    }

    page.classList.add('has-gallery-opened');
    updateScale();

    preloadOpenedGalleryImages();

    gallery.classList.add('is-visible');
    gallery.setAttribute('aria-hidden', 'false');
    setGalleryButtonText('Скрыть фото');

    window.requestAnimationFrame(function(){
      scrollToElement(gallery, 24);
    });
  }

  function closeGallery(){
    if(!gallery){
      return;
    }

    gallery.classList.remove('is-visible');
    gallery.setAttribute('aria-hidden', 'true');
    setGalleryButtonText('Смотреть фото');

    window.setTimeout(function(){
      page.classList.remove('has-gallery-opened');
      updateScale();

      window.requestAnimationFrame(function(){
        scrollToElement(document.querySelector('.ip-musical-show-mobile-awards'), 36);
      });
    }, 520);
  }

  function toggleGallery(event){
    if(event){
      event.preventDefault();
      event.stopPropagation();
    }

    if(!gallery){
      return;
    }

    if(page.classList.contains('has-gallery-opened')){
      closeGallery();
      return;
    }

    openGallery();
  }

  function setupPopupTriggers(){
    popupOpenTriggers.forEach(function(trigger){
      trigger.addEventListener('click', function(event){
        event.preventDefault();
        event.stopPropagation();

        openPopup();
      });
    });

    popupCloseTriggers.forEach(function(trigger){
      trigger.addEventListener('click', function(event){
        event.preventDefault();

        closePopup();
      });
    });

    document.addEventListener('keydown', function(event){
      if(event.key === 'Escape'){
        closePhotoLightbox();
        closePopup();
        closeMenu();
        return;
      }

      if(!lightbox || !lightbox.classList.contains('is-open')){
        return;
      }

      if(event.key === 'ArrowRight'){
        event.preventDefault();
        showNextLightboxImage();
        return;
      }

      if(event.key === 'ArrowLeft'){
        event.preventDefault();
        showPrevLightboxImage();
      }
    });
  }

  function closeMenuOnUserScroll(){
    if(menuPanel && menuPanel.classList.contains('is-open')){
      closeMenu();
    }
  }

  function setupMenuCloseOnScroll(){
    var lastScrollTop =
      window.pageYOffset ||
      document.documentElement.scrollTop ||
      0;

    window.addEventListener(
      'scroll',
      function(){
        var currentScrollTop =
          window.pageYOffset ||
          document.documentElement.scrollTop ||
          0;

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

    window.addEventListener(
      'touchstart',
      function(event){
        var touch = event.touches && event.touches[0];

        if(!touch){
          return;
        }

        touchStartY = touch.clientY;

        touchStartedInsideMenu = Boolean(
          menuPanel &&
          menuPanel.contains(event.target)
        );
      },
      { passive:true }
    );

    window.addEventListener(
      'touchmove',
      function(event){
        var touch = event.touches && event.touches[0];

        if(!touch || touchStartY === null){
          return;
        }

        if(touchStartedInsideMenu){
          return;
        }

        if(Math.abs(touch.clientY - touchStartY) > 10){
          closeMenuOnUserScroll();
        }
      },
      { passive:true }
    );

    window.addEventListener(
      'touchend',
      function(){
        touchStartY = null;
        touchStartedInsideMenu = false;
      },
      { passive:true }
    );
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

  function revealVideo(){
    if(
      !page ||
      !videoFrame ||
      !videoPoster ||
      videoPosterHidden ||
      page.classList.contains('is-video-ready')
    ){
      return;
    }

    videoPosterHidden = true;
    page.classList.add('is-video-ready');
  }

  function setupVideoPoster(){
    if(!videoFrame || !videoPoster){
      return;
    }

    window.setTimeout(function(){
      revealVideo();
    }, VIDEO_REVEAL_DELAY);
  }


  function collectLightboxImages(){
    lightboxImages = galleryLightboxItems.map(function(item){
      var image = item.querySelector('img');

      if(!image){
        return null;
      }

      return {
        src:image.getAttribute('src'),
        alt:image.getAttribute('alt') || ''
      };
    }).filter(Boolean);
  }

  function lockLightboxScroll(){
    document.documentElement.classList.add('ip-popup-lock');
    document.body.classList.add('ip-popup-lock');
  }

  function unlockLightboxScroll(){
    if(popup && popup.classList.contains('is-open')){
      return;
    }

    document.documentElement.classList.remove('ip-popup-lock');
    document.body.classList.remove('ip-popup-lock');
  }

  function positionPhotoLightboxClose(){
    if(!lightbox || !lightboxImage || !lightboxCloseButton){
      return;
    }

    if(!lightbox.classList.contains('is-open')){
      return;
    }

    var imageRect = lightboxImage.getBoundingClientRect();
    var closeWidth = lightboxCloseButton.offsetWidth || 27;
    var closeHeight = lightboxCloseButton.offsetHeight || 27;

    if(!imageRect.width || !imageRect.height){
      return;
    }

    lightboxCloseButton.style.display = 'block';
    lightboxCloseButton.style.top = Math.max(12, imageRect.top - closeHeight - 20) + 'px';
    lightboxCloseButton.style.left = (imageRect.right - closeWidth) + 'px';
    lightboxCloseButton.style.right = 'auto';
  }

  function updateLightboxCounter(){
    if(!lightboxCounter || !lightboxImages.length){
      return;
    }

    lightboxCounter.textContent =
      String(lightboxIndex + 1).padStart(2, '0') +
      ' / ' +
      String(lightboxImages.length).padStart(2, '0');
  }

  function updateLightboxImage(){
    if(!lightboxImage || !lightboxImages.length){
      return;
    }

    var imageData = lightboxImages[lightboxIndex];

    lightboxImage.src = imageData.src;
    lightboxImage.alt = imageData.alt;

    updateLightboxCounter();

    window.requestAnimationFrame(function(){
      positionPhotoLightboxClose();
    });
  }

  function openPhotoLightbox(index){
    if(!lightbox || !lightboxImage || !lightboxImages.length){
      return;
    }

    closeMenu();

    lightboxIndex = Math.max(
      0,
      Math.min(index, lightboxImages.length - 1)
    );

    updateLightboxImage();

    lightbox.classList.add('is-open');
    lightbox.setAttribute('aria-hidden', 'false');

    lockLightboxScroll();

    window.requestAnimationFrame(function(){
      positionPhotoLightboxClose();
    });
  }

  function closePhotoLightbox(){
    if(!lightbox){
      return;
    }

    lightbox.classList.remove('is-open');
    lightbox.setAttribute('aria-hidden', 'true');

    if(lightboxImage){
      lightboxImage.removeAttribute('src');
      lightboxImage.removeAttribute('alt');
    }

    if(lightboxCloseButton){
      lightboxCloseButton.style.display = '';
      lightboxCloseButton.style.top = '';
      lightboxCloseButton.style.left = '';
      lightboxCloseButton.style.right = '';
    }

    unlockLightboxScroll();
    updateScale();
  }

  function showNextLightboxImage(){
    if(!lightboxImages.length){
      return;
    }

    lightboxIndex = (lightboxIndex + 1) % lightboxImages.length;
    updateLightboxImage();
  }

  function showPrevLightboxImage(){
    if(!lightboxImages.length){
      return;
    }

    lightboxIndex =
      (lightboxIndex - 1 + lightboxImages.length) %
      lightboxImages.length;

    updateLightboxImage();
  }

  function setupPhotoLightbox(){
    if(!lightbox || !lightboxImage || !galleryLightboxItems.length){
      return;
    }

    collectLightboxImages();

    galleryLightboxItems.forEach(function(item, index){
      item.addEventListener('click', function(event){
        event.preventDefault();
        event.stopPropagation();

        openPhotoLightbox(index);
      });

      item.addEventListener('keydown', function(event){
        if(event.key !== 'Enter' && event.key !== ' '){
          return;
        }

        event.preventDefault();
        event.stopPropagation();

        openPhotoLightbox(index);
      });
    });

    lightboxCloseTriggers.forEach(function(trigger){
      trigger.addEventListener('click', function(event){
        event.preventDefault();
        event.stopPropagation();

        closePhotoLightbox();
      });
    });

    lightboxImage.addEventListener('click', function(event){
      event.preventDefault();
      event.stopPropagation();

      showNextLightboxImage();
    });
  }

  function setupGalleryInitialState(){
    if(!gallery){
      return;
    }

    page.classList.remove('has-gallery-opened');
    gallery.classList.remove('is-visible');
    gallery.setAttribute('aria-hidden', 'true');
    setGalleryButtonText('Смотреть фото');
  }

  function bindEvents(){
    window.addEventListener('resize', requestScaleUpdate);
    window.addEventListener('resize', positionPhotoLightboxClose);

    window.addEventListener('orientationchange', function(){
      window.setTimeout(updateScale, 250);
    });

    if(window.visualViewport){
      window.visualViewport.addEventListener(
        'resize',
        requestScaleUpdate
      );
    }

    if(menuButton){
      menuButton.addEventListener('click', toggleMenu);
    }

    accordions.forEach(setupAccordion);

    setupPopupTriggers();
    setupMenuCloseOnScroll();
    setupDateMask();
    setupVideoPoster();
    setupPhotoLightbox();

    if(lightboxImage){
      lightboxImage.addEventListener('load', positionPhotoLightboxClose);
    }

    if(galleryButton){
      galleryButton.addEventListener('click', toggleGallery);
    }

    if(scrollTopButton){
      scrollTopButton.addEventListener('click', scrollToTop);
    }
  }

  function init(){
    updateScale();
    setupGalleryInitialState();
    bindEvents();
    updateScrollTopVisibility();
  }

  init();

})();