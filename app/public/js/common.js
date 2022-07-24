/* eslint-disable max-params */
/* eslint-disable no-negated-condition */
/*--------------------------------------------------*/
/* swiper slider
/*--------------------------------------------------*/

// const theWrapper = document.getElementById('swiperWrapper');
// if (theWrapper){
//   const mySwiper = new Swiper('.swiper-container', {
//     allowTouchMove: false,
//     freeMode: true,
//     loop: true,
//     slidesPerView: 2,
//     speed: 6000,
//     autoplay: {
//       delay: 0,
//     },
//     on: {
//       slideChangeTransitionStart(){
//         theWrapper.style.transitionTimingFunction = 'linear';
//       }
//     },
//     breakpoints: { // PC時
//       769: {
//         slidesPerView: 4,
//         speed: 10000,
//       },
//     },
//   });
// }

/*--------------------------------------------------*/
/* スムーススクロール [ a.js-trigger ] 箇所
/*--------------------------------------------------*/

const MoveTo = (() => {
  /**
   * Defaults
   * @type {object}
   */
  const defaults = {
    tolerance: 0,
    duration: 1600,
    easing: 'easeOutQuart',
    container: window,
    callback() {},
  };

  /**
   * easeOutQuart Easing Function
   * @param  {number} t - current time
   * @param  {number} b - start value
   * @param  {number} c - change in value
   * @param  {number} d - duration
   * @return {number} - calculated value
   */
  function easeOutQuart(t, b, c, d) {
    t /= d;
    t--;
    return -c * (t * t * t * t - 1) + b;
  }

  /**
   * Merge two object
   *
   * @param  {object} obj1
   * @param  {object} obj2
   * @return {object} merged object
   */
  function mergeObject(obj1, obj2) {
    const obj3 = {};
    Object.keys(obj1).forEach(propertyName => {
      obj3[propertyName] = obj1[propertyName];
    });

    Object.keys(obj2).forEach(propertyName => {
      obj3[propertyName] = obj2[propertyName];
    });
    return obj3;
  }

  /**
   * Converts camel case to kebab case
   * @param  {string} val the value to be converted
   * @return {string} the converted value
   */
  function kebabCase(val) {
    return val.replace(/([A-Z])/g, $1 => {
      return '-' + $1.toLowerCase();
    });
  }

  /**
   * Count a number of item scrolled top
   * @param  {Window|HTMLElement} container
   * @return {number}
   */
  function countScrollTop(container) {
    if (container instanceof HTMLElement) {
      return container.scrollTop;
    }
    return container.pageYOffset;
  }

  /**
   * MoveTo Constructor
   * @param {object} options Options
   * @param {object} easeFunctions Custom ease functions
   */
  // eslint-disable-next-line object-curly-newline
  function MoveTo(options = {}, easeFunctions = {}) {
    this.options = mergeObject(defaults, options);
    // eslint-disable-next-line object-curly-newline
    this.easeFunctions = mergeObject({easeOutQuart}, easeFunctions);
  }

  /**
   * Register a dom element as trigger
   * @param  {HTMLElement} dom Dom trigger element
   * @param  {function} callback Callback function
   * @return {function|void} unregister function
   */
  MoveTo.prototype.registerTrigger = function(dom, callback) {
    if (!dom) {
      return;
    }

    const href = dom.getAttribute('href') || dom.getAttribute('data-target');
    // The element to be scrolled
    const target =
      href && href !== '#'
        ? document.getElementById(href.substring(1))
        : document.body;
    const options = mergeObject(
      this.options,
      _getOptionsFromTriggerDom(dom, this.options),
    );

    if (typeof callback === 'function') {
      options.callback = callback;
    }

    const listener = e => {
      e.preventDefault();
      this.move(target, options);
    };

    dom.addEventListener('click', listener, false);

    return () => dom.removeEventListener('click', listener, false);
  };

  /**
   * Move
   * Scrolls to given element by using easeOutQuart function
   * @param  {HTMLElement|number} target Target element to be scrolled or target position
   * @param  {object} options Custom options
   */
  MoveTo.prototype.move = function(target, options = {}) {
    if (target !== 0 && !target) {
      return;
    }

    options = mergeObject(this.options, options);

    let distance =
      typeof target === 'number' ? target : target.getBoundingClientRect().top;
    const from = countScrollTop(options.container);
    let startTime = null;
    let lastYOffset;
    distance -= options.tolerance;

    // rAF loop
    const loop = currentTime => {
      const currentYOffset = countScrollTop(this.options.container);

      if (!startTime) {
        // To starts time from 1, we subtracted 1 from current time
        // If time starts from 1 The first loop will not do anything,
        // because easing value will be zero
        startTime = currentTime - 1;
      }

      const timeElapsed = currentTime - startTime;

      if (lastYOffset) {
        if (
          (distance > 0 && lastYOffset > currentYOffset) ||
          (distance < 0 && lastYOffset < currentYOffset)
        ) {
          return options.callback(target);
        }
      }
      lastYOffset = currentYOffset;

      const val = this.easeFunctions[options.easing](
        timeElapsed,
        from,
        distance,
        options.duration,
      );

      options.container.scroll(0, val);

      if (timeElapsed < options.duration) {
        window.requestAnimationFrame(loop);
      } else {
        options.container.scroll(0, distance + from);
        options.callback(target);
      }
    };

    window.requestAnimationFrame(loop);
  };

  /**
   * Adds custom ease function
   * @param {string}   name Ease function name
   * @param {function} fn   Ease function
   */
  MoveTo.prototype.addEaseFunction = function(name, fn) {
    this.easeFunctions[name] = fn;
  };

  /**
   * Returns options which created from trigger dom element
   * @param  {HTMLElement} dom Trigger dom element
   * @param  {object} options The instance's options
   * @return {object} The options which created from trigger dom element
   */
  function _getOptionsFromTriggerDom(dom, options) {
    // eslint-disable-next-line object-curly-newline
    const domOptions = {};

    Object.keys(options).forEach(key => {
      const value = dom.getAttribute(`data-mt-${kebabCase(key)}`);
      if (value) {
        domOptions[key] = isNaN(value) ? value : parseInt(value, 10);
      }
    });
    return domOptions;
  }

  return MoveTo;
})();

if (typeof module !== 'undefined') {
  module.exports = MoveTo;
} else {
  window.MoveTo = MoveTo;
}
document.addEventListener('DOMContentLoaded', () => {
  const easeFunctions = {
    easeInQuad(t, b, c, d) {
      t /= d;
      return c * t * t + b;
    },
    easeOutQuad(t, b, c, d) {
      t /= d;
      return -c * t * (t - 2) + b;
    },
  };
  const moveTo = new MoveTo(
    {
      ease: 'easeInQuad',
    },
    easeFunctions,
  );
  const triggers = document.getElementsByClassName('js-trigger');
  for (let i = 0; i < triggers.length; i++) {
    moveTo.registerTrigger(triggers[i]);
  }
});

console.log('☆ common.min.js ☆');
