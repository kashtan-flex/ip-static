(function(){
  'use strict';

  const page = document.querySelector('.ip-page-cooperation');
  const menuButton = document.querySelector('.ip-menu-toggle');
  const menuPanel = document.querySelector('.ip-menu-panel');
  const accordions = document.querySelectorAll('.ip-accordion');
  const mainPopup = document.querySelector('[data-popup="main"]');

  if(!page || !menuButton || !menuPanel){
    return;
  }

  const DESIGN = {
    desktop:{ width:1440, height:800 }
  };

  let resizeFrame = null;

  function updateCooperationScale(){
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const scale = Math.min(viewportWidth / DESIGN.desktop.width, viewportHeight / DESIGN.desktop.height);

    page.style.setProperty('--ip-cooperation-scale', scale);
  }

  function requestScaleUpdate(){
    if(resizeFrame){
      cancelAnimationFrame(resizeFrame);
    }

    resizeFrame = requestAnimationFrame(updateCooperationScale);
  }

  function openMenu(){
    menuButton.classList.add('is-open');
    menuPanel.classList.add('is-open');
    menuPanel.style.pointerEvents = 'auto';
  }

  function closeMenu(){
    menuButton.classList.remove('is-open');
    menuPanel.classList.remove('is-open');
    menuPanel.style.pointerEvents = 'none';
  }

  function toggleMenu(){
    menuPanel.classList.contains('is-open') ? closeMenu() : openMenu();
  }

  function openMainPopup(){
    if(!mainPopup){
      return;
    }

    closeMenu();
    mainPopup.classList.add('is-open');
    mainPopup.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('ip-popup-lock');
    document.body.classList.add('ip-popup-lock');
  }

  function closeMainPopup(){
    if(!mainPopup){
      return;
    }

    mainPopup.classList.remove('is-open');
    mainPopup.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('ip-popup-lock');
    document.body.classList.remove('ip-popup-lock');
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

  function setupPopupTriggers(){
    document.addEventListener('click', function(event){
      const target = event.target.closest('a, button, [data-popup-close]');

      if(!target){
        return;
      }

      if(target.hasAttribute('data-popup-close')){
        event.preventDefault();
        closeMainPopup();
        return;
      }

      if(target.matches('[data-popup-open="main"]')){
        event.preventDefault();
        openMainPopup();
        return;
      }

      const text = target.textContent.trim().toLowerCase();

      if(text === 'другое' || text === 'написать'){
        event.preventDefault();
        openMainPopup();
      }
    });

    document.addEventListener('keydown', function(event){
      if(event.key === 'Escape'){
        closeMainPopup();
      }
    });

    if(mainPopup){
      const form = mainPopup.querySelector('.ip-popup-form');

      if(form){
        form.addEventListener('submit', function(event){
          event.preventDefault();
        });
      }
    }
  }

  function setupDisabledDownloads(){
    const disabledLinks = document.querySelectorAll('.ip-cooperation-download.is-disabled');

    disabledLinks.forEach(function(link){
      link.addEventListener('click', function(event){
        event.preventDefault();
      });
    });
  }

  function setupAccordion(accordion){
    const button = accordion.querySelector('.ip-accordion-button');
    const content = accordion.querySelector('.ip-accordion-content');

    if(!button || !content){
      return;
    }

    const isContactsAccordion = button.textContent.trim().toLowerCase().includes('контакты');

    if(!isContactsAccordion){
      button.addEventListener('click', function(){
        accordion.classList.toggle('is-open');
      });

      return;
    }

    const submenu = content.querySelector('.ip-submenu');
    const lines = submenu ? Array.from(submenu.children) : [];

    lines.forEach(function(line){
      line.style.overflow = 'hidden';
      line.style.maxHeight = '0px';
      line.style.transition = 'max-height 620ms cubic-bezier(.19,1,.22,1)';
    });

    function openContactsAccordion(){
      accordion.classList.add('is-open');

      lines.forEach(function(line){
        requestAnimationFrame(function(){
          line.style.maxHeight = line.scrollHeight + 'px';
        });
      });
    }

    function closeContactsAccordion(){
      lines.forEach(function(line){
        line.style.maxHeight = line.scrollHeight + 'px';

        requestAnimationFrame(function(){
          line.style.maxHeight = '0px';
        });
      });

      accordion.classList.remove('is-open');
    }

    button.addEventListener('click', function(){
      accordion.classList.contains('is-open')
        ? closeContactsAccordion()
        : openContactsAccordion();
    });
  }

  updateCooperationScale();
  setupPopupTriggers();
  setupDateMask();
  setupDisabledDownloads();

  window.addEventListener('resize', requestScaleUpdate);

  window.addEventListener('orientationchange', function(){
    setTimeout(updateCooperationScale, 250);
  });

  menuButton.addEventListener('click', toggleMenu);

  window.addEventListener('scroll', function(){
    if(menuPanel.classList.contains('is-open')){
      closeMenu();
    }
  });

  accordions.forEach(setupAccordion);
})();
