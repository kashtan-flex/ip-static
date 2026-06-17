/*
Версия: phone-mask-js-067-russian-phone-prefix
ИЗМЕНЕНИЯ:
- desktop/mobile: добавлена единая маска телефона для всех попап-форм сайта.
- при фокусе на пустом поле «Телефон» автоматически подставляется префикс +7.
- ввод 8, 7, +7 и вставка номера приводятся к формату +7 (999) 123-45-67.
- логика отправки форм, чекбоксы, success message, меню, видео и Tilda hash-bridge не изменялись.
*/

(function(){
  'use strict';

  var PHONE_SELECTOR = '.ip-popup-form input[type="tel"][name="phone"]';
  var PHONE_PREFIX = '+7 ';
  var MAX_SUBSCRIBER_DIGITS = 10;

  function isPhoneInput(target){
    return Boolean(
      target &&
      target.matches &&
      target.matches(PHONE_SELECTOR)
    );
  }

  function getSubscriberDigits(value){
    var digits = String(value || '').replace(/\D/g, '');

    if(digits.charAt(0) === '7' || digits.charAt(0) === '8'){
      digits = digits.slice(1);
    }

    return digits.slice(0, MAX_SUBSCRIBER_DIGITS);
  }

  function formatPhoneValue(subscriberDigits){
    var digits = String(subscriberDigits || '').slice(0, MAX_SUBSCRIBER_DIGITS);
    var partCode = digits.slice(0, 3);
    var partMiddle = digits.slice(3, 6);
    var partFirst = digits.slice(6, 8);
    var partLast = digits.slice(8, 10);
    var result = PHONE_PREFIX;

    if(!digits){
      return result;
    }

    result = '+7 (' + partCode;

    if(digits.length > 3){
      result += ') ' + partMiddle;
    }

    if(digits.length > 6){
      result += '-' + partFirst;
    }

    if(digits.length > 8){
      result += '-' + partLast;
    }

    return result;
  }

  function moveCaretToEnd(input){
    var position = input.value.length;

    if(typeof input.setSelectionRange !== 'function'){
      return;
    }

    window.requestAnimationFrame(function(){
      try{
        input.setSelectionRange(position, position);
      }catch(error){
        // Некоторые браузеры не дают менять каретку у tel-поля в момент системного автозаполнения.
      }
    });
  }

  function preparePhoneInput(input){
    if(input.dataset.ipPhoneMaskReady === 'true'){
      return;
    }

    input.dataset.ipPhoneMaskReady = 'true';
    input.setAttribute('inputmode', 'tel');
    input.setAttribute('autocomplete', 'tel');
    input.setAttribute('maxlength', '18');
  }

  function applyPhoneMask(input, options){
    var settings = options || {};
    var subscriberDigits = getSubscriberDigits(input.value);

    if(!subscriberDigits && settings.clearEmptyPrefix){
      input.value = '';
      return;
    }

    input.value = formatPhoneValue(subscriberDigits);

    if(settings.moveCaret){
      moveCaretToEnd(input);
    }
  }

  document.addEventListener('focusin', function(event){
    var input = event.target;

    if(!isPhoneInput(input)){
      return;
    }

    preparePhoneInput(input);

    if(!input.value.trim()){
      input.value = PHONE_PREFIX;
      moveCaretToEnd(input);
      return;
    }

    applyPhoneMask(input, { moveCaret:true });
  });

  document.addEventListener('input', function(event){
    var input = event.target;

    if(!isPhoneInput(input)){
      return;
    }

    preparePhoneInput(input);
    applyPhoneMask(input, { moveCaret:true });
  });

  document.addEventListener('paste', function(event){
    var input = event.target;

    if(!isPhoneInput(input)){
      return;
    }

    window.setTimeout(function(){
      preparePhoneInput(input);
      applyPhoneMask(input, { moveCaret:true });
    }, 0);
  });

  document.addEventListener('focusout', function(event){
    var input = event.target;

    if(!isPhoneInput(input)){
      return;
    }

    applyPhoneMask(input, { clearEmptyPrefix:true });
  });
})();
