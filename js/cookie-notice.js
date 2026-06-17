/*
Версия: cookie-notice-js-059
ИЗМЕНЕНИЯ:
- текст cookie-баннера разделён на три визуальные строки.
- согласие сохраняется локально в браузере, чтобы баннер не появлялся повторно.
- баннер автоматически скрывается, пока открыты меню, попапы, отзывы или lightbox.
*/

(function(){
  'use strict';

  var STORAGE_KEY = 'ip_cookie_notice_accepted';
  var COOKIE_MAX_AGE = 31536000;
  var notice = null;
  var observer = null;

  function canUseStorage(){
    try{
      var testKey = STORAGE_KEY + '_test';
      window.localStorage.setItem(testKey, '1');
      window.localStorage.removeItem(testKey);
      return true;
    }
    catch(error){
      return false;
    }
  }

  function hasAcceptedNotice(){
    if(canUseStorage()){
      return window.localStorage.getItem(STORAGE_KEY) === '1';
    }

    return document.cookie.indexOf(STORAGE_KEY + '=1') !== -1;
  }

  function saveAcceptedNotice(){
    if(canUseStorage()){
      window.localStorage.setItem(STORAGE_KEY, '1');
      return;
    }

    document.cookie = STORAGE_KEY + '=1; Max-Age=' + COOKIE_MAX_AGE + '; Path=/; SameSite=Lax';
  }

  function isInterfaceOverlayOpen(){
    return Boolean(
      document.querySelector('.ip-menu-panel.is-open') ||
      document.querySelector('.ip-popup.is-open') ||
      document.querySelector('.ip-review-popup.is-open') ||
      document.querySelector('.ip-gallery-lightbox.is-open') ||
      document.querySelector('[class*="mobile-lightbox"].is-open')
    );
  }

  function updateNoticeLayer(){
    if(!notice){
      return;
    }

    notice.classList.toggle('is-covered', isInterfaceOverlayOpen());
  }

  function createNotice(){
    notice = document.createElement('aside');
    notice.className = 'ip-cookie-notice';
    notice.setAttribute('role', 'dialog');
    notice.setAttribute('aria-live', 'polite');
    notice.setAttribute('aria-label', 'Уведомление об использовании cookie');

    notice.innerHTML = [
      '<p class="ip-cookie-notice__text">',
        '<span class="ip-cookie-notice__line">Сайт использует cookie для корректной работы страниц и видео.</span>',
        '<span class="ip-cookie-notice__line">Продолжая просмотр, вы соглашаетесь с их использованием.</span>',
        '<a href="./policy.html">Политика обработки персональных данных</a>',
      '</p>',
      '<button class="ip-cookie-notice__button" type="button">Понятно</button>'
    ].join('');

    notice.querySelector('.ip-cookie-notice__button').addEventListener('click', function(){
      saveAcceptedNotice();
      notice.classList.add('is-closing');

      window.setTimeout(function(){
        if(notice && notice.parentNode){
          notice.parentNode.removeChild(notice);
        }

        notice = null;

        if(observer){
          observer.disconnect();
          observer = null;
        }
      }, 300);
    });

    document.body.appendChild(notice);

    window.requestAnimationFrame(function(){
      if(!notice){
        return;
      }

      notice.classList.add('is-visible');
      updateNoticeLayer();
    });
  }

  function setupObserver(){
    if(!window.MutationObserver){
      return;
    }

    observer = new MutationObserver(updateNoticeLayer);
    observer.observe(document.documentElement, {
      subtree:true,
      childList:true,
      attributes:true,
      attributeFilter:['class', 'aria-hidden']
    });
  }

  function initCookieNotice(){
    if(hasAcceptedNotice()){
      return;
    }

    createNotice();
    setupObserver();

    window.addEventListener('resize', updateNoticeLayer, { passive:true });
    window.addEventListener('orientationchange', updateNoticeLayer, { passive:true });
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', initCookieNotice, { once:true });
    return;
  }

  initCookieNotice();
})();
