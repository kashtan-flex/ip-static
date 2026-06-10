(function(){
  'use strict';

  var MOBILE_QUERY = '(max-width: 767px), (pointer: coarse)';
  var isMobile = window.matchMedia && window.matchMedia(MOBILE_QUERY).matches;

  var EXIT_DURATION = isMobile ? 260 : 230;
  var ENTER_DURATION = isMobile ? 420 : 320;
  var MAX_ASSET_WAIT = isMobile ? 1200 : 760;
  var MAX_LOAD_WAIT = isMobile ? 1200 : 680;
  var MIN_ENTER_WAIT = isMobile ? 620 : 260;
  var STABLE_FRAMES = isMobile ? 12 : 5;
  var VIEWPORT_STABLE_FRAMES = isMobile ? 10 : 3;
  var VIEWPORT_STABLE_TIMEOUT = isMobile ? 900 : 320;

  var overlay = null;
  var isTransitioning = false;

  try{
    if('scrollRestoration' in window.history){
      window.history.scrollRestoration = 'manual';
    }
  }catch(error){
    /* noop */
  }

  function getOverlay(){
    overlay = document.querySelector('.ip-page-transition');

    if(overlay){
      overlay.setAttribute('aria-hidden', 'true');
      return overlay;
    }

    overlay = document.createElement('div');
    overlay.className = 'ip-page-transition is-enter';
    overlay.setAttribute('aria-hidden', 'true');
    document.body.appendChild(overlay);

    return overlay;
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

  function waitForWindowLoad(){
    if(document.readyState === 'complete'){
      return Promise.resolve();
    }

    return Promise.race([
      new Promise(function(resolve){
        window.addEventListener('load', resolve, { once:true });
      }),
      waitTimeout(MAX_LOAD_WAIT)
    ]);
  }

  function waitForImages(){
    var images = Array.prototype.slice.call(document.images || []);

    if(!images.length){
      return Promise.resolve();
    }

    var imagePromises = images.map(function(image){
      if(image.complete && image.naturalWidth !== 0){
        return Promise.resolve();
      }

      return new Promise(function(resolve){
        image.addEventListener('load', resolve, { once:true });
        image.addEventListener('error', resolve, { once:true });
      });
    });

    return Promise.race([
      Promise.all(imagePromises),
      waitTimeout(MAX_ASSET_WAIT)
    ]);
  }

  function waitForFonts(){
    if(document.fonts && document.fonts.ready){
      return Promise.race([
        document.fonts.ready.catch(function(){
          return null;
        }),
        waitTimeout(MAX_ASSET_WAIT)
      ]);
    }

    return Promise.resolve();
  }

  function waitForViewportStable(){
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

        if(stableCount >= VIEWPORT_STABLE_FRAMES || Date.now() - startedAt >= VIEWPORT_STABLE_TIMEOUT){
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
    scrollToTopSafely();

    Promise.all([
      waitForDocumentReady(),
      waitForWindowLoad(),
      waitForImages(),
      waitForFonts(),
      waitTimeout(MIN_ENTER_WAIT)
    ]).then(function(){
      return waitForViewportStable();
    }).then(function(){
      return waitFrames(STABLE_FRAMES);
    }).then(function(){
      scrollToTopSafely();
      transitionOverlay.classList.add('is-ready');

      window.setTimeout(function(){
        transitionOverlay.classList.remove('is-enter');
        transitionOverlay.classList.remove('is-ready');
        transitionOverlay.classList.remove('is-active');
        document.documentElement.classList.remove('ip-page-transition-lock');
        isTransitioning = false;
      }, ENTER_DURATION);
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
    }, EXIT_DURATION);
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

  function init(){
    getOverlay();
    bindLinks();
    bindBrowserNavigation();
    revealPage();
  }

  init();

})();
