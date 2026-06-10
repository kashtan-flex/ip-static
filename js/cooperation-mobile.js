/*
==================================================
COOPERATION MOBILE JS

Версия: cooperation-mobile-js-007-mobile-rider-open-new-tab-v035

ИЗМЕНЕНИЯ:
- mobile riders: райдеры на мобильной версии открываются в новой вкладке/окне, чтобы PDF корректно работали внутри Tilda iframe
- popup date: единая маска ДД.ММ.ГГГГ и проверка реальной календарной даты без изменения дизайна, меню и остальной логики
- файл основан на cooperation-mobile-js-001-initial
- добавлен показ portrait только после начала скролла mobile-страницы
- glow и текст остаются CSS-анимациями при открытии страницы
- высота mobile-страницы повторно рассчитана по фактическому нижнему краю видимого портрета
- scroll-top синхронизирован с финальной длиной страницы
- удалён принудительный fetch/blob-download для PDF-райдеров
- райдеры открываются обычными ссылками в новой вкладке для стабильной работы на iOS/Android
- menu, accordion, popup, date mask и disabled portfolio link не изменялись
- desktop JS не изменялся
==================================================
*/

(function(){
  'use strict';

  var DESIGN = {
    mobile:{
      width:390,
      height:700,
      stageHeight:1030
    },
    breakpoint:767
  };

  var SCROLLTOP_REVEAL_OFFSET = 140;

  var page = document.querySelector('[data-cooperation-mobile-page]');
  var stage = document.querySelector('.ip-cooperation-mobile-content');

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

  var disabledDownloads = Array.prototype.slice.call(
    document.querySelectorAll('.ip-cooperation-mobile-download.is-disabled')
  );


  var scrollTopButton = document.querySelector('.ip-cooperation-mobile-scrolltop');

  var portraitRevealed = false;

  var resizeFrame = null;
  var touchStartY = null;
  var touchStartedInsideMenu = false;

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
      '--cooperation-vh',
      (viewportHeight * 0.01) + 'px'
    );

    document.documentElement.style.setProperty(
      '--cooperation-mobile-vh',
      (viewportHeight * 0.01) + 'px'
    );

    return viewportHeight;
  }


  function revealPortraitOnScroll(){
    if(portraitRevealed || !isMobile()){
      return;
    }

    var scrollTop =
      window.pageYOffset ||
      document.documentElement.scrollTop ||
      0;

    if(scrollTop <= 0){
      return;
    }

    portraitRevealed = true;
    page.classList.add('is-portrait-visible');
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

    if(isMobile()){
      var scale = Math.max(
        viewportWidth / DESIGN.mobile.width,
        viewportHeight / DESIGN.mobile.height
      );

      var scaledHeight = Math.ceil(
        DESIGN.mobile.stageHeight * scale
      );

      document.documentElement.style.setProperty(
        '--cooperation-mobile-scale',
        scale.toFixed(5)
      );

      document.documentElement.style.setProperty(
        '--cooperation-mobile-page-height',
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
      '--cooperation-mobile-scale'
    );

    document.documentElement.style.removeProperty(
      '--cooperation-mobile-page-height'
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
        closePopup();
        closeMenu();
      }
    });

    if(popup){
      var form = popup.querySelector('.ip-popup-form');

      if(form){
        form.addEventListener('submit', function(event){
          event.preventDefault();
        });
      }
    }
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

        revealPortraitOnScroll();
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
          revealPortraitOnScroll();
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

  function setupDisabledDownloads(){
    disabledDownloads.forEach(function(link){
      link.addEventListener('click', function(event){
        event.preventDefault();
        event.stopPropagation();
      });
    });
  }

  function setupFileDownloads(){
    var fileDownloadLinks = Array.prototype.slice.call(
      document.querySelectorAll('[data-cooperation-file-download]')
    );

    fileDownloadLinks.forEach(function(link){
      var href = link.getAttribute('href');

      if(!href){
        return;
      }

      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener noreferrer');

      link.addEventListener('click', function(event){
        var url = new URL(href, window.location.href).href;

        event.preventDefault();
        event.stopPropagation();

        if(typeof link.blur === 'function'){
          link.blur();
        }

        var openedWindow = window.open(url, '_blank', 'noopener,noreferrer');

        if(!openedWindow){
          window.location.href = url;
        }
      });
    });
  }


  function bindEvents(){
    window.addEventListener('resize', requestScaleUpdate);

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
    setupDisabledDownloads();
    setupFileDownloads();
    if(scrollTopButton){
      scrollTopButton.addEventListener('click', scrollToTop);
    }
  }

  function init(){
    updateScale();
    bindEvents();
    updateScrollTopVisibility();
  }

  init();

})();
