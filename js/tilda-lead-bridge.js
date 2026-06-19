/*
==================================================
TILDA LEAD BRIDGE JS

Версия: tilda-lead-bridge-js-076-stable-success-ux

ИЗМЕНЕНИЯ:
- убрана техническая строка source из payload заявки.
- добавлен оптимистичный success-сценарий: пользователь не ждёт технический ответ Tilda дольше необходимого.
- при успешной отправке внутри нашего попапа показывается собственный текст «Спасибо! Я скоро свяжусь с вами.».
- отправка в Tilda через postMessage сохранена: Tilda остаётся почтовым шлюзом через скрытую форму.
- сохранена маска телефона +7 (___) ___-__-__ для всех попап-форм.
- меню, cookie-баннер, видео, hash-bridge и визуальная верстка попапов не изменяются.
==================================================
*/

(function(){
  'use strict';

  var MESSAGE_SUBMIT = 'IP_LEAD_FORM_SUBMIT';
  var MESSAGE_RESULT = 'IP_LEAD_FORM_RESULT';

  var TRUSTED_PARENT_ORIGINS = normalizeOriginList([
    'https://иванперцев.рф',
    'https://xn--80adblao1bqk4d.xn--p1ai',
    'https://www.иванперцев.рф',
    'https://www.xn--80adblao1bqk4d.xn--p1ai',
    'https://millionth-employable-skating.tilda.ws',
    'https://project25835926.tilda.ws'
  ]);

  var SUBMIT_TIMEOUT = 9000;
  var OPTIMISTIC_SUCCESS_DELAY = 900;
  var SUCCESS_CLOSE_DELAY = 1450;

  var pendingRequest = null;

  var PAGE_META = {
    'index.html': {
      page: 'Главная',
      event_type: 'home'
    },
    '': {
      page: 'Главная',
      event_type: 'home'
    },
    'biography.html': {
      page: 'Биография',
      event_type: 'biography'
    },
    'wedding.html': {
      page: 'Свадьба',
      event_type: 'wedding'
    },
    'corporate.html': {
      page: 'Корпоратив',
      event_type: 'corporate'
    },
    'birthday.html': {
      page: 'День рождения',
      event_type: 'birthday'
    },
    'graduation.html': {
      page: 'Выпускной',
      event_type: 'graduation'
    },
    'musical-show.html': {
      page: 'Музыкальное шоу',
      event_type: 'musical-show'
    },
    'cooperation.html': {
      page: 'Сотрудничество',
      event_type: 'cooperation'
    },
    'policy.html': {
      page: 'Политика обработки персональных данных',
      event_type: 'policy'
    },
    'consent.html': {
      page: 'Согласие на обработку персональных данных',
      event_type: 'consent'
    }
  };

  function normalizePhoneDigits(value){
    var digits = String(value || '').replace(/\D/g, '');

    if(digits.charAt(0) === '7' || digits.charAt(0) === '8'){
      digits = digits.slice(1);
    }

    return digits.slice(0, 10);
  }

  function formatPhoneValue(value){
    var digits = normalizePhoneDigits(value);
    var result = '';

    if(!digits){
      return '';
    }

    result = '+7';

    if(digits.length > 0){
      result += ' (' + digits.slice(0, 3);
    }

    if(digits.length >= 3){
      result += ')';
    }

    if(digits.length > 3){
      result += ' ' + digits.slice(3, 6);
    }

    if(digits.length > 6){
      result += '-' + digits.slice(6, 8);
    }

    if(digits.length > 8){
      result += '-' + digits.slice(8, 10);
    }

    return result;
  }

  function isPhoneField(field){
    if(!field || !field.matches){
      return false;
    }

    return field.matches('input[name="phone"], input[type="tel"]');
  }

  function moveCaretToEnd(field){
    if(!field || typeof field.setSelectionRange !== 'function'){
      return;
    }

    var length = field.value.length;

    try{
      field.setSelectionRange(length, length);
    }catch(error){
      /* Некоторые мобильные браузеры не разрешают менять caret у type="tel". */
    }
  }

  function applyPhoneMask(field){
    if(!isPhoneField(field)){
      return;
    }

    var formattedValue = formatPhoneValue(field.value);

    if(field.value !== formattedValue){
      field.value = formattedValue;
    }

    moveCaretToEnd(field);
  }

  function preparePhoneField(field){
    if(!isPhoneField(field) || field.getAttribute('data-ip-phone-mask-ready') === 'true'){
      return;
    }

    field.setAttribute('data-ip-phone-mask-ready', 'true');
    field.setAttribute('inputmode', 'tel');
    field.setAttribute('autocomplete', 'tel');
    field.setAttribute('maxlength', '18');

    if(field.value){
      applyPhoneMask(field);
    }
  }

  function preparePhoneFields(root){
    var scope = root && root.querySelectorAll ? root : document;
    var fields = scope.querySelectorAll('input[name="phone"], input[type="tel"]');

    fields.forEach(function(field){
      preparePhoneField(field);
    });
  }

  function initPhoneMask(){
    preparePhoneFields(document);

    document.addEventListener('focusin', function(event){
      if(!isPhoneField(event.target)){
        return;
      }

      preparePhoneField(event.target);
    });

    document.addEventListener('input', function(event){
      if(!isPhoneField(event.target)){
        return;
      }

      applyPhoneMask(event.target);
    });

    document.addEventListener('blur', function(event){
      if(!isPhoneField(event.target)){
        return;
      }

      applyPhoneMask(event.target);
    }, true);

    if('MutationObserver' in window){
      var observer = new MutationObserver(function(mutations){
        mutations.forEach(function(mutation){
          mutation.addedNodes.forEach(function(node){
            if(!node || node.nodeType !== 1){
              return;
            }

            if(isPhoneField(node)){
              preparePhoneField(node);
              return;
            }

            preparePhoneFields(node);
          });
        });
      });

      observer.observe(document.documentElement, {
        childList: true,
        subtree: true
      });
    }
  }

  function getPageFileName(){
    var path = window.location.pathname || '';
    var parts = path.split('/');

    return parts[parts.length - 1] || '';
  }

  function getPageMeta(){
    var fileName = getPageFileName();

    return PAGE_META[fileName] || {
      page: document.title || fileName || 'Страница сайта',
      event_type: fileName.replace(/\.html$/i, '') || 'unknown'
    };
  }

  function normalizeText(value){
    return value == null ? '' : String(value).trim();
  }

  function getFieldValue(form, selector){
    var field = form.querySelector(selector);

    if(!field){
      return '';
    }

    return normalizeText(field.value);
  }

  function getConsentValue(form){
    var checkbox = form.querySelector('.ip-popup-policy input[type="checkbox"], input[type="checkbox"]');

    return checkbox && checkbox.checked ? 'Да' : 'Нет';
  }

  function getPopup(form){
    return form.closest('[data-popup="main"], .ip-popup');
  }

  function getSubmitButton(form){
    return form.querySelector('.ip-popup-submit, button[type="submit"], input[type="submit"]');
  }

  function setButtonText(button, text){
    if(!button){
      return;
    }

    if(!button.hasAttribute('data-ip-original-text')){
      button.setAttribute('data-ip-original-text', normalizeText(button.textContent || button.value || 'Отправить'));
    }

    if(button.tagName === 'INPUT'){
      button.value = text;
    }else{
      button.textContent = text;
    }
  }

  function restoreButton(button){
    if(!button){
      return;
    }

    var originalText = button.getAttribute('data-ip-original-text') || 'Отправить';

    button.disabled = false;

    if(button.tagName === 'INPUT'){
      button.value = originalText;
    }else{
      button.textContent = originalText;
    }
  }

  function getPopupTextElement(form){
    var popup = getPopup(form);

    return popup ? popup.querySelector('.ip-popup-text') : null;
  }

  function showCustomSuccessMessage(form){
    var textElement = getPopupTextElement(form);

    if(!textElement){
      return;
    }

    if(!textElement.hasAttribute('data-ip-original-html')){
      textElement.setAttribute('data-ip-original-html', textElement.innerHTML);
    }

    textElement.innerHTML = '<strong>Спасибо!</strong><span>Я скоро свяжусь с вами.</span>';
  }

  function restorePopupText(form){
    var textElement = getPopupTextElement(form);

    if(!textElement || !textElement.hasAttribute('data-ip-original-html')){
      return;
    }

    textElement.innerHTML = textElement.getAttribute('data-ip-original-html');
  }

  function closePopup(form){
    var popup = getPopup(form);

    if(!popup){
      return;
    }

    var closeButton = popup.querySelector('[data-popup-close]');

    if(closeButton){
      closeButton.click();
      return;
    }

    popup.classList.remove('is-open');
    popup.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('ip-popup-lock');
    document.body.classList.remove('ip-popup-lock');
  }

  function resetForm(form){
    if(!form){
      return;
    }

    form.reset();

    var consent = form.querySelector('.ip-popup-policy input[type="checkbox"], input[type="checkbox"]');

    if(consent){
      consent.checked = true;
    }
  }

  function buildPayload(form){
    var pageMeta = getPageMeta();

    return {
      name: getFieldValue(form, '[name="name"]'),
      phone: getFieldValue(form, '[name="phone"]'),
      date: getFieldValue(form, '[name="date"]'),
      page: pageMeta.page,
      event_type: pageMeta.event_type,
      consent: getConsentValue(form)
    };
  }

  function normalizeOrigin(origin){
    if(!origin){
      return '';
    }

    try{
      return new URL(origin).origin;
    }catch(error){
      return String(origin || '').replace(/\/$/, '');
    }
  }

  function normalizeOriginList(origins){
    var result = [];

    origins.forEach(function(origin){
      var normalizedOrigin = normalizeOrigin(origin);

      if(normalizedOrigin && result.indexOf(normalizedOrigin) === -1){
        result.push(normalizedOrigin);
      }
    });

    return result;
  }

  function isTrustedParentOrigin(origin){
    var normalizedOrigin = normalizeOrigin(origin);

    return normalizedOrigin && TRUSTED_PARENT_ORIGINS.indexOf(normalizedOrigin) !== -1;
  }

  function getParentTargetOrigins(){
    var referrerOrigin = normalizeOrigin(document.referrer);
    var targetOrigins = [];

    if(referrerOrigin && isTrustedParentOrigin(referrerOrigin)){
      targetOrigins.push(referrerOrigin);
    }

    TRUSTED_PARENT_ORIGINS.forEach(function(origin){
      if(targetOrigins.indexOf(origin) === -1){
        targetOrigins.push(origin);
      }
    });

    return targetOrigins;
  }

  function postLeadMessage(payload){
    var message = {
      type: MESSAGE_SUBMIT,
      payload: payload
    };
    var parentWindow = window.parent;

    getParentTargetOrigins().forEach(function(origin){
      try{
        parentWindow.postMessage(message, origin);
      }catch(error){
        console.warn('[Tilda Lead Bridge] postMessage failed for origin:', origin, error);
      }
    });
  }

  function getSubmitFormFromTarget(target){
    var submitButton = target && target.closest ? target.closest('.ip-popup-submit, button[type="submit"], input[type="submit"]') : null;

    if(!submitButton){
      return null;
    }

    var form = submitButton.form || submitButton.closest('form');

    if(!form || !form.classList || !form.classList.contains('ip-popup-form')){
      return null;
    }

    return form;
  }

  function clearPendingRequest(){
    if(!pendingRequest){
      return;
    }

    if(pendingRequest.timeoutId){
      window.clearTimeout(pendingRequest.timeoutId);
    }

    if(pendingRequest.optimisticSuccessId){
      window.clearTimeout(pendingRequest.optimisticSuccessId);
    }

    pendingRequest = null;
  }

  function finishRequest(status, message){
    if(!pendingRequest){
      return;
    }

    var request = pendingRequest;
    var form = request.form;
    var button = request.button;

    clearPendingRequest();

    if(status === 'success'){
      setButtonText(button, 'Отправлено');
      showCustomSuccessMessage(form);
      resetForm(form);

      window.setTimeout(function(){
        closePopup(form);
        restoreButton(button);
        restorePopupText(form);
      }, SUCCESS_CLOSE_DELAY);

      return;
    }

    console.warn('[Tilda Lead Bridge]', message || 'Lead submit error.');
    setButtonText(button, 'Попробуйте ещё раз');

    window.setTimeout(function(){
      restoreButton(button);
    }, 1600);
  }

  function submitLead(form){
    var button = getSubmitButton(form);

    if(pendingRequest){
      return;
    }

    if(!form.checkValidity()){
      form.reportValidity();
      return;
    }

    if(!window.parent || window.parent === window){
      console.warn('[Tilda Lead Bridge] Parent Tilda window was not found.');
      return;
    }

    if(button){
      button.disabled = true;
      setButtonText(button, 'Отправка...');
    }

    pendingRequest = {
      form: form,
      button: button,
      timeoutId: window.setTimeout(function(){
        finishRequest('error', 'Tilda response timeout.');
      }, SUBMIT_TIMEOUT),
      optimisticSuccessId: window.setTimeout(function(){
        finishRequest('success', 'Optimistic success after postMessage.');
      }, OPTIMISTIC_SUCCESS_DELAY)
    };

    postLeadMessage(buildPayload(form));
  }

  initPhoneMask();

  document.addEventListener(
    'click',
    function(event){
      var form = getSubmitFormFromTarget(event.target);

      if(!form){
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      submitLead(form);
    },
    true
  );

  document.addEventListener(
    'submit',
    function(event){
      var form = event.target;

      if(!form || !form.classList || !form.classList.contains('ip-popup-form')){
        return;
      }

      event.preventDefault();
      submitLead(form);
    },
    true
  );

  window.addEventListener('message', function(event){
    var data = event.data || {};

    if(!isTrustedParentOrigin(event.origin)){
      return;
    }

    if(!data || data.type !== MESSAGE_RESULT){
      return;
    }

    finishRequest(data.status, data.message);
  });
})();
