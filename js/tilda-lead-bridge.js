/*
==================================================
TILDA LEAD BRIDGE JS

Версия: tilda-lead-bridge-js-080-success-montserrat-duration

ИЗМЕНЕНИЯ:
- убрана техническая строка source из payload заявки.
- убран оптимистичный success-сценарий: успешное состояние показывается только после реального success-ответа от Tilda.
- добавлено кастомное уведомление об успешной отправке внутри фирменного попапа сайта.
- увеличено время отображения кастомного success-сообщения: 2.4s → 4.2s, чтобы пользователь успевал прочитать текст.
- слово «Спасибо!» в кастомном success-сообщении переведено на Montserrat с сохранением текущего размера и веса.
- стандартное окно успеха Tilda скрывается на стороне Tilda Lead Bridge; GitHub-попап показывает собственное сообщение.
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
  var SUCCESS_CLOSE_DELAY = 4200;

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

  function saveInlineStyle(element){
    if(!element || element.hasAttribute('data-ip-lead-original-style')){
      return;
    }

    element.setAttribute('data-ip-lead-original-style', element.getAttribute('style') || '');
  }

  function restoreInlineStyle(element){
    if(!element || !element.hasAttribute('data-ip-lead-original-style')){
      return;
    }

    var originalStyle = element.getAttribute('data-ip-lead-original-style');

    if(originalStyle){
      element.setAttribute('style', originalStyle);
    }else{
      element.removeAttribute('style');
    }

    element.removeAttribute('data-ip-lead-original-style');
  }

  function setElementHiddenForSuccess(element){
    if(!element){
      return;
    }

    saveInlineStyle(element);
    element.style.opacity = '0';
    element.style.visibility = 'hidden';
    element.style.pointerEvents = 'none';
    element.style.transition = 'opacity .22s ease, visibility .22s ease';
  }

  function getSuccessOverlay(form){
    var overlay = form.querySelector('.ip-lead-success');
    var isMobile = window.matchMedia && window.matchMedia('(max-width:767px)').matches;

    if(!overlay){
      overlay = document.createElement('div');
      overlay.className = 'ip-lead-success';
      overlay.setAttribute('aria-live', 'polite');
      overlay.innerHTML = [
        '<div class="ip-lead-success__icon">✓</div>',
        '<div class="ip-lead-success__title">Спасибо!</div>',
        '<div class="ip-lead-success__text">Я скоро свяжусь с вами.</div>'
      ].join('');
      form.appendChild(overlay);
    }

    overlay.style.cssText = [
      'position:absolute',
      'z-index:7',
      'left:' + (isMobile ? 'calc(28 / 350 * 100cqw)' : 'calc(426 / 790 * 100cqw)'),
      'top:' + (isMobile ? 'calc(202 / 350 * 100cqw)' : 'calc(176 / 790 * 100cqw)'),
      'width:' + (isMobile ? 'calc(294 / 350 * 100cqw)' : 'calc(294 / 790 * 100cqw)'),
      'min-height:' + (isMobile ? 'calc(170 / 350 * 100cqw)' : 'calc(190 / 790 * 100cqw)'),
      'display:flex',
      'flex-direction:column',
      'align-items:center',
      'justify-content:center',
      'gap:' + (isMobile ? 'calc(11 / 350 * 100cqw)' : 'calc(12 / 790 * 100cqw)'),
      'color:#fff',
      'text-align:center',
      'font-family:Montserrat,sans-serif',
      'opacity:0',
      'transform:translate3d(0,6px,0)',
      'transition:opacity .34s cubic-bezier(.19,1,.22,1), transform .34s cubic-bezier(.19,1,.22,1)',
      'pointer-events:none'
    ].join(';') + ';';

    var icon = overlay.querySelector('.ip-lead-success__icon');
    var title = overlay.querySelector('.ip-lead-success__title');
    var text = overlay.querySelector('.ip-lead-success__text');

    if(icon){
      icon.style.cssText = [
        'width:' + (isMobile ? 'calc(34 / 350 * 100cqw)' : 'calc(34 / 790 * 100cqw)'),
        'height:' + (isMobile ? 'calc(34 / 350 * 100cqw)' : 'calc(34 / 790 * 100cqw)'),
        'border:1px solid rgba(255,255,255,.62)',
        'border-radius:50%',
        'display:flex',
        'align-items:center',
        'justify-content:center',
        'font-size:' + (isMobile ? 'calc(18 / 350 * 100cqw)' : 'calc(18 / 790 * 100cqw)'),
        'font-weight:600',
        'line-height:1',
        'box-shadow:0 8px 24px rgba(0,0,0,.22)'
      ].join(';') + ';';
    }

    if(title){
      title.style.cssText = [
        'font-family:Montserrat,sans-serif',
        'font-size:' + (isMobile ? 'calc(20 / 350 * 100cqw)' : 'calc(20 / 790 * 100cqw)'),
        'line-height:.95',
        'font-weight:700',
        'letter-spacing:' + (isMobile ? 'calc(.4 / 350 * 100cqw)' : 'calc(.4 / 790 * 100cqw)')
      ].join(';') + ';';
    }

    if(text){
      text.style.cssText = [
        'max-width:100%',
        'font-size:' + (isMobile ? 'calc(15 / 350 * 100cqw)' : 'calc(15 / 790 * 100cqw)'),
        'line-height:1.18',
        'font-weight:400',
        'color:rgba(255,255,255,.88)'
      ].join(';') + ';';
    }

    return overlay;
  }

  function showCustomSuccessMessage(form){
    var heading = form.querySelector('.ip-popup-heading');
    var fields = form.querySelector('.ip-popup-fields');
    var policy = form.querySelector('.ip-popup-policy');
    var overlay = getSuccessOverlay(form);

    form.setAttribute('data-ip-lead-success-active', 'true');

    setElementHiddenForSuccess(heading);
    setElementHiddenForSuccess(fields);
    setElementHiddenForSuccess(policy);

    window.requestAnimationFrame(function(){
      overlay.style.opacity = '1';
      overlay.style.transform = 'translate3d(0,0,0)';
    });
  }

  function restorePopupText(form){
    var heading = form.querySelector('.ip-popup-heading');
    var fields = form.querySelector('.ip-popup-fields');
    var policy = form.querySelector('.ip-popup-policy');
    var overlay = form.querySelector('.ip-lead-success');

    form.removeAttribute('data-ip-lead-success-active');

    restoreInlineStyle(heading);
    restoreInlineStyle(fields);
    restoreInlineStyle(policy);

    if(overlay){
      overlay.remove();
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
      button.disabled = false;
      setButtonText(button, 'Хорошо');
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
      }, SUBMIT_TIMEOUT)
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

      if(form.getAttribute('data-ip-lead-success-active') === 'true'){
        closePopup(form);
        restoreButton(getSubmitButton(form));
        restorePopupText(form);
        return;
      }

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
