/*
==================================================
TILDA LEAD BRIDGE JS

Версия: tilda-lead-bridge-js-065-tilda-email-submit

ИЗМЕНЕНИЯ:
- добавлена отправка заявок из собственных попапов GitHub-сайта в родительскую Tilda-страницу через postMessage.
- форма остаётся внутри текущего дизайна сайта, Tilda используется только как почтовый шлюз через скрытую форму.
- SMTP, backend и сторонние сервисы не используются.
- меню, попап-вёрстка, hash-bridge и визуальная логика страниц не изменяются.
==================================================
*/

(function(){
  'use strict';

  var MESSAGE_SUBMIT = 'IP_LEAD_FORM_SUBMIT';
  var MESSAGE_RESULT = 'IP_LEAD_FORM_RESULT';

  var TRUSTED_PARENT_ORIGINS = [
    'https://иванперцев.рф',
    'https://xn--80adblao1bqk4d.xn--p1ai'
  ];

  var TARGET_PARENT_ORIGIN = 'https://xn--80adblao1bqk4d.xn--p1ai';
  var SUBMIT_TIMEOUT = 9000;
  var SUCCESS_CLOSE_DELAY = 1200;

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
      consent: getConsentValue(form),
      source: 'ivan-pertsev-github-iframe'
    };
  }

  function isTrustedParentOrigin(origin){
    return TRUSTED_PARENT_ORIGINS.indexOf(origin) !== -1;
  }

  function clearPendingRequest(){
    if(!pendingRequest){
      return;
    }

    if(pendingRequest.timeoutId){
      window.clearTimeout(pendingRequest.timeoutId);
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
      resetForm(form);

      window.setTimeout(function(){
        closePopup(form);
        restoreButton(button);
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
      }, SUBMIT_TIMEOUT)
    };

    window.parent.postMessage(
      {
        type: MESSAGE_SUBMIT,
        payload: buildPayload(form)
      },
      TARGET_PARENT_ORIGIN
    );
  }

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
