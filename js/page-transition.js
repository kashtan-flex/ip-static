(function(){
  'use strict';

  var MOBILE_QUERY = '(max-width: 767px), (pointer: coarse)';
  var isMobile = window.matchMedia && window.matchMedia(MOBILE_QUERY).matches;

  var PAGE_KIND = getPageKind();
  var SETTINGS = getSettings(PAGE_KIND, isMobile);

  var overlay = null;
  var isTransitioning = false;

  try{
    if('scrollRestoration' in window.history){
      window.history.scrollRestoration = 'manual';
    }
  }catch(error){
    /* noop */
  }

  function getPageKind(){
    var path = window.location.pathname || '';
    var file = path.split('/').pop() || '';

    if(file === '' || file === 'index.html'){
      return 'home';
    }

    if(file === 'policy.html' || file === 'consent.html'){
      return 'legal';
    }

    return 'default';
  }

  function getSettings(kind, mobile){
    if(kind === 'home'){
      return {
        exitDuration: mobile ? 180 : 170,
        enterDuration: mobile ? 180 : 170,
        maxAssetWait: mobile ? 130 : 90,
        maxFontWait: mobile ? 120 : 90,
        minEnterWait: mobile ? 70 : 45,
        viewportStableFrames: mobile ? 2 : 0,
        viewportStableTimeout: mobile ? 90 : 0,
        stableFrames: mobile ? 3 : 2
      };
    }

    if(kind === 'legal'){
      return {
        exitDuration: mobile ? 190 : 180,
        enterDuration: mobile ? 260 : 220,
        maxAssetWait: mobile ? 300 : 220,
        maxFontWait: mobile ? 240 : 180,
        minEnterWait: mobile ? 180 : 120,
        viewportStableFrames: mobile ? 4 : 0,
        viewportStableTimeout: mobile ? 220 : 0,
        stableFrames: mobile ? 5 : 3
      };
    }

    return {
      exitDuration: mobile ? 185 : 175,
      enterDuration: mobile ? 230 : 205,
      maxAssetWait: mobile ? 240 : 170,
      maxFontWait: mobile ? 200 : 150,
      minEnterWait: mobile ? 130 : 85,
      viewportStableFrames: mobile ? 3 : 0,
      viewportStableTimeout: mobile ? 160 : 0,
      stableFrames: mobile ? 4 : 3
    };
  }

  function getOverlay(){
    overlay = document.querySelector('.ip-page-transition');

    if(overlay){
      overlay.setAttribute('aria-hidden', 'true');
      applyOverlayTiming(overlay);
      return overlay;
    }

    overlay = document.createElement('div');
    overlay.className = 'ip-page-transition is-enter';
    overlay.setAttribute('aria-hidden', 'true');
    applyOverlayTiming(overlay);
    document.body.appendChild(overlay);

    return overlay;
  }

  function applyOverlayTiming(transitionOverlay){
    transitionOverlay.style.setProperty('--ip-page-transition-exit', SETTINGS.exitDuration + 'ms');
    transitionOverlay.style.setProperty('--ip-page-transition-enter', SETTINGS.enterDuration + 'ms');
  }

  function resetOverlay(){
    var transitionOverlay = getOverlay();

    transitionOverlay.classList.remove('is-active');
    transitionOverlay.classList.remove('is-enter');
    transitionOverlay.classList.remove('is-ready');

    document.documentElement.classList.remove('ip-page-transition-lock');

    transitionOverlay.style.opacity = '';
    transitionOverlay.style.visibility = '';

    isTransitioning = false;
  }

  function waitTimeout(delay){
    return new Promise(function(resolve){
      window.setTimeout(resolve, delay);
    });
  }

  function waitFrames(count){
    return new Promise(function(resolve){
      function next(remaining){
        if(remaining <= 0){
          resolve();
          return;
        }

        window.requestAnimationFrame(function(){
          next(remaining - 1);
        });
      }

      next(count);
    });
  }

  function waitForDocumentReady(){
    if(document.readyState === 'interactive' || document.readyState === 'complete'){
      return Promise.resolve();
    }

    return new Promise(function(resolve){
      document.addEventListener('DOMContentLoaded', resolve, { once:true });
    });
  }

  function waitForImages(){
    var images = Array.prototype.slice.call(document.images || []);

    if(!images.length){
      return Promise.resolve();
    }

    var imagePromises = images.map(function(image){
      if(image.complete){
        return Promise.resolve();
      }

      return new Promise(function(resolve){
        image.addEventListener('load', resolve, { once:true });
        image.addEventListener('error', resolve, { once:true });
      });
    });

    return Promise.race([
      Promise.all(imagePromises),
      waitTimeout(SETTINGS.maxAssetWait)
    ]);
  }

  function waitForFonts(){
    if(document.fonts && document.fonts.ready){
      return Promise.race([
        document.fonts.ready.catch(function(){
          return null;
        }),
        waitTimeout(SETTINGS.maxFontWait)
      ]);
    }

    return Promise.resolve();
  }

  function waitForViewportStable(){
    if(!isMobile || !SETTINGS.viewportStableFrames){
      return Promise.resolve();
    }

    return new Promise(function(resolve){
      var stableCount = 0;
      var lastWidth = window.innerWidth;
      var lastHeight = window.innerHeight;
      var startedAt = Date.now();

      function check(){
        var width = window.innerWidth;
        var height = window.innerHeight;

        if(width === lastWidth && height === lastHeight){
          stableCount += 1;
        }else{
          stableCount = 0;
          lastWidth = width;
          lastHeight = height;
        }

        if(stableCount >= SETTINGS.viewportStableFrames || Date.now() - startedAt >= SETTINGS.viewportStableTimeout){
          resolve();
          return;
        }

        window.requestAnimationFrame(check);
      }

      window.requestAnimationFrame(check);
    });
  }

  function scrollToTopSafely(){
    try{
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }catch(error){
      /* noop */
    }
  }

  function revealPage(){
    var transitionOverlay = getOverlay();

    document.documentElement.classList.add('ip-page-transition-lock');

    Promise.all([
      waitForDocumentReady(),
      waitForImages(),
      waitForFonts(),
      waitTimeout(SETTINGS.minEnterWait)
    ]).then(function(){
      return waitForViewportStable();
    }).then(function(){
      return waitFrames(SETTINGS.stableFrames);
    }).then(function(){
      if(PAGE_KIND !== 'home'){
        scrollToTopSafely();
      }

      transitionOverlay.classList.add('is-ready');

      window.setTimeout(function(){
        transitionOverlay.classList.remove('is-enter');
        transitionOverlay.classList.remove('is-ready');
        transitionOverlay.classList.remove('is-active');
        document.documentElement.classList.remove('ip-page-transition-lock');
        isTransitioning = false;
      }, SETTINGS.enterDuration);
    });
  }

  function isModifiedClick(event){
    return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0;
  }

  function normalizeUrl(url){
    var anchor = document.createElement('a');
    anchor.href = url;
    return anchor.href.split('#')[0];
  }

  function isSamePage(url){
    return normalizeUrl(window.location.href) === normalizeUrl(url);
  }

  function shouldSkipLink(link){
    if(!link){
      return true;
    }

    var href = link.getAttribute('href');

    if(!href || href === '#'){
      return true;
    }

    if(href.indexOf('tel:') === 0 || href.indexOf('mailto:') === 0){
      return true;
    }

    if(link.hasAttribute('target')){
      return true;
    }

    if(link.hasAttribute('data-popup-open')){
      return true;
    }

    if(href.charAt(0) === '#'){
      return true;
    }

    if(href.indexOf('.html') === -1 && href.indexOf('/') !== 0){
      return true;
    }

    return false;
  }

  function goToPage(url){
    if(isTransitioning || isSamePage(url)){
      return;
    }

    isTransitioning = true;

    var transitionOverlay = getOverlay();

    transitionOverlay.classList.remove('is-enter');
    transitionOverlay.classList.remove('is-ready');
    transitionOverlay.classList.add('is-active');
    document.documentElement.classList.add('ip-page-transition-lock');

    window.setTimeout(function(){
      window.location.href = url;
    }, SETTINGS.exitDuration);
  }

  function bindLinks(){
    document.addEventListener('click', function(event){
      var link = event.target.closest('a');

      if(isModifiedClick(event) || shouldSkipLink(link)){
        return;
      }

      event.preventDefault();
      goToPage(link.href);
    }, true);
  }

  function bindBrowserNavigation(){
    window.addEventListener('pageshow', function(event){
      if(event.persisted){
        resetOverlay();
      }
    });

    window.addEventListener('popstate', function(){
      window.setTimeout(function(){
        resetOverlay();
      }, 0);
    });
  }


  function bindSocialIconReturnRestore(){
    if(!isMobile){
      return;
    }

    function getMenuPanel(){
      return document.querySelector('.ip-menu-panel');
    }

    function clearSocialFocus(){
      try{
        var active = document.activeElement;

        if(active && active.classList && active.classList.contains('ip-social')){
          active.blur();
        }
      }catch(error){
        /* noop */
      }
    }

    function restoreSocialIconsAfterReturn(){
      var panel = getMenuPanel();

      if(!panel || !panel.classList.contains('is-open')){
        return;
      }

      clearSocialFocus();
      panel.classList.add('is-social-return-restore');
    }

    function observeMenuState(){
      var panel = getMenuPanel();

      if(!panel || !window.MutationObserver){
        return;
      }

      var observer = new MutationObserver(function(){
        if(!panel.classList.contains('is-open')){
          panel.classList.remove('is-social-return-restore');
        }
      });

      observer.observe(panel, {
        attributes:true,
        attributeFilter:['class']
      });
    }

    document.addEventListener('click', function(event){
      var socialLink = event.target.closest && event.target.closest('a.ip-social');

      if(!socialLink){
        return;
      }

      window.setTimeout(function(){
        try{
          socialLink.blur();
        }catch(error){
          /* noop */
        }

        clearSocialFocus();
      }, 0);
    }, true);

    window.addEventListener('pageshow', function(event){
      if(event.persisted){
        restoreSocialIconsAfterReturn();
      }
    });

    window.addEventListener('focus', function(){
      window.setTimeout(restoreSocialIconsAfterReturn, 0);
    });

    document.addEventListener('visibilitychange', function(){
      if(!document.hidden){
        window.setTimeout(restoreSocialIconsAfterReturn, 0);
      }
    });

    observeMenuState();
  }

  function init(){
    getOverlay();
    bindLinks();
    bindBrowserNavigation();
    bindSocialIconReturnRestore();
    revealPage();
  }

  init();

})();
