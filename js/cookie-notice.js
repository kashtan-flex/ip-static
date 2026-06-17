/*
Версия: cookie-notice-js-062
ИЗМЕНЕНИЯ:
- cookie-баннер теперь появляется с единой задержкой на всех страницах сайта.
- показ запускается после загрузки страницы, чтобы баннер не перекрывал стартовые анимации и первый визуальный блок.
- задержка появления увеличена до 3600ms для desktop и mobile.
- логика сохранения согласия, скрытия под меню/попапами/лайтбоксами и текст баннера сохранены.
*/

(function(){
  'use strict';

  var STORAGE_KEY = 'ip_cookie_notice_accepted';
  var COOKIE_MAX_AGE = 31536000;
  var notice = null;
  var observer = null;
  var NOTICE_DELAY = 3600;
  var LOAD_WAIT_TIMEOUT = 6500;
  var loadTimer = null;
  var delayTimer = null;
  var showScheduled = false;

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
        '<span class="ip-cookie-notice__desktop-text">',
          '<span class="ip-cookie-notice__line">Сайт использует cookie для корректной работы страниц и видео.</span>',
          '<span class="ip-cookie-notice__line">Продолжая просмотр, вы соглашаетесь с их использованием.</span>',
          '<a href="./policy.html">Политика обработки персональных данных</a>',
        '</span>',
        '<span class="ip-cookie-notice__mobile-text">',
          '<span class="ip-cookie-notice__mobile-line">Сайт использует cookie для корректной работы</span>',
          '<span class="ip-cookie-notice__mobile-line">страниц и видео. Продолжая просмотр,</span>',
          '<span class="ip-cookie-notice__mobile-line">вы соглашаетесь с их использованием.</span>',
          '<a href="./policy.html">Политика обработки персональных данных</a>',
        '</span>',
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
      }, 650);
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

  function showNotice(){
    if(hasAcceptedNotice() || notice){
      return;
    }

    createNotice();
    setupObserver();

    window.addEventListener('resize', updateNoticeLayer, { passive:true });
    window.addEventListener('orientationchange', updateNoticeLayer, { passive:true });
  }

  function scheduleNotice(){
    if(showScheduled || hasAcceptedNotice()){
      return;
    }

    showScheduled = true;

    if(loadTimer){
      window.clearTimeout(loadTimer);
      loadTimer = null;
    }

    delayTimer = window.setTimeout(showNotice, NOTICE_DELAY);
  }

  function waitForPageLoad(){
    if(hasAcceptedNotice()){
      return;
    }

    if(document.readyState === 'complete'){
      scheduleNotice();
      return;
    }

    window.addEventListener('load', scheduleNotice, { once:true });

    loadTimer = window.setTimeout(function(){
      scheduleNotice();
    }, LOAD_WAIT_TIMEOUT);
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', waitForPageLoad, { once:true });
    return;
  }

  waitForPageLoad();
})();
