/*global navigate*/
import './spatial-navigation-polyfill.js';
import css from './ui.css';
import { configRead, configWrite } from './config.js';
import updateStyle from './theme.js';
import { showToast } from './ytUI.js';
import modernUI from './modernUI.js';
import { patchResolveCommand } from './resolveCommand.js';

// It just works, okay?
const interval = setInterval(() => {
  const videoElement = document.querySelector('video');
  if (videoElement) {
    execute_once_dom_loaded();
    patchResolveCommand();
    clearInterval(interval);
  }
}, 250);

window.AudioContext = window.AudioContext || window.webkitAudioContext;

const context = new AudioContext();

class Sound {

  url = '';

  buffer = null;

  sources = [];

  constructor(url) {
    this.url = url;
  }

  load() {
    if (!this.url) return Promise.reject(new Error('Missing or invalid URL: ', this.url));

    if (this.buffer) return Promise.resolve(this.buffer);

    return new Promise((resolve, reject) => {
      const request = new XMLHttpRequest();

      request.open('GET', this.url, true);
      request.responseType = 'arraybuffer';

      // Decode asynchronously:

      request.onload = () => {
        context.decodeAudioData(request.response, (buffer) => {
          if (!buffer) {
            console.log(`Sound decoding error: ${this.url}`);

            reject(new Error(`Sound decoding error: ${this.url}`));

            return;
          }

          this.buffer = buffer;

          resolve(buffer);
        });
      };

      request.onerror = (err) => {
        console.log('Sound XMLHttpRequest error:', err);

        reject(err);
      };

      request.send();
    });
  }

  play(volume = 1, time = 0) {
    if (!this.buffer) return;

    // Create a new sound source and assign it the loaded sound's buffer:

    const source = context.createBufferSource();

    source.buffer = this.buffer;

    // Keep track of all sources created, and stop tracking them once they finish playing:

    const insertedAt = this.sources.push(source) - 1;

    source.onended = () => {
      source.stop(0);

      this.sources.splice(insertedAt, 1);
    };

    // Create a gain node with the desired volume:

    const gainNode = context.createGain();

    gainNode.gain.value = volume;

    // Connect nodes:

    source.connect(gainNode).connect(context.destination);

    // Start playing at the desired time:

    source.start(time);
  }
}

function execute_once_dom_loaded() {

  // Add CSS to head.

  const existingStyle = document.querySelector('style[nonce]');
  if (existingStyle) {
    existingStyle.textContent += css;
  } else {
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }

  // Fix UI issues.
  const ui = configRead('enableFixedUI');
  if (ui) {
    try {
      window.tectonicConfig.featureSwitches.isLimitedMemory = false;
      window.tectonicConfig.clientData.legacyApplicationQuality = 'full-animation';
      window.tectonicConfig.featureSwitches.enableAnimations = true;
      window.tectonicConfig.featureSwitches.enableOnScrollLinearAnimation = true;
      window.tectonicConfig.featureSwitches.enableListAnimations = true;
    } catch (e) { }
  }

  // We handle key events ourselves.
  window.__spatialNavigation__.keyMode = 'NONE';

  var ARROW_KEY_CODE = { 37: 'left', 38: 'up', 39: 'right', 40: 'down' };

  var uiContainer = document.createElement('div');
  uiContainer.classList.add('ytaf-ui-container');
  uiContainer.style['display'] = 'none';
  uiContainer.setAttribute('tabindex', 0);
  uiContainer.addEventListener(
      'focus',
      () => console.info('uiContainer focused!'),
      true
  );
  uiContainer.addEventListener(
      'blur',
      () => console.info('uiContainer blured!'),
      true
  );

  uiContainer.addEventListener(
      'keydown',
      (evt) => {
        console.info('uiContainer key event:', evt.type, evt.keyCode, evt);
        if (evt.keyCode !== 404 && evt.keyCode !== 172) {
          if (evt.keyCode in ARROW_KEY_CODE) {
            navigate(ARROW_KEY_CODE[evt.keyCode]);
          } else if (evt.keyCode === 13 || evt.keyCode === 32) {
            // "OK" button
            console.log('OK button pressed');
            const focusedElement = document.querySelector(':focus');
            if (focusedElement.type === 'checkbox') {
              focusedElement.checked = !focusedElement.checked;
              focusedElement.dispatchEvent(new Event('change'));
            }
            evt.preventDefault();
            evt.stopPropagation();
            return;
          } else if (evt.keyCode === 27 && document.querySelector(':focus').type !== 'text') {
            // Back button
            uiContainer.style.display = 'none';
            uiContainer.blur();
          } else if (document.querySelector(':focus').type === 'text' && evt.keyCode === 27) {
            const focusedElement = document.querySelector(':focus');
            focusedElement.value = focusedElement.value.slice(0, -1);
          }


          if (evt.key === 'Enter' || evt.Uc?.key === 'Enter') {
            // If the focused element is a text input, emit a change event.
            if (document.querySelector(':focus').type === 'text') {
              document.querySelector(':focus').dispatchEvent(new Event('change'));
            }
          }
        }
      },
      true
  );

  uiContainer.innerHTML = `
<h1>TizenTubeZx111 Theme Configuration</h1>
<audio controls>
  <source src="https://github.com/kaczy1233/TizenTubeZx/raw/refs/heads/main/dist/loop.wav" type="audio/wav">
  Your browser does not support the audio element.
</audio>
<label for="__barColor">Navigation Bar Color: <input type="text" id="__barColor"/></label>
<label for="__routeColor">Main Content Color: <input type="text" id="__routeColor"/></label>
<div><small>Sponsor segments skipping - https://sponsor.ajay.app</small></div>
`;
  document.querySelector('body').appendChild(uiContainer);

  // var audioSourceEl = document.createElement('source');
  // audioSourceEl.setAttribute('src', 'https://github.com/kaczy1233/TizenTubeZx/raw/refs/heads/main/dist/loop.wav');
  // audioSourceEl.setAttribute('type', 'audio/wav');
  // var audioEl = document.createElement('audio');
  // audioEl.setAttribute('controls');
  // audioEl.setAttribute('autoplay');
  // audioEl.appendChild(audioSourceEl);
  // var audioContainer = document.createElement('div');
  // audioContainer.appendChild(audioEl);
  // document.querySelector('body').appendChild(audioContainer);

  uiContainer.querySelector('#__barColor').value = configRead('focusContainerColor');
  uiContainer.querySelector('#__barColor').addEventListener('change', (evt) => {
    configWrite('focusContainerColor', evt.target.value);
    updateStyle();
  });

  uiContainer.querySelector('#__routeColor').value = configRead('routeColor');
  uiContainer.querySelector('#__routeColor').addEventListener('change', (evt) => {
    configWrite('routeColor', evt.target.value);
    updateStyle();
  });

  var eventHandler = (evt) => {
    // We handle key events ourselves.
    console.info(
        'Key event:',
        evt.type,
        evt.keyCode,
        evt.keyCode,
        evt.defaultPrevented
    );
    if (evt.keyCode == 403) {
      console.info('Taking over!');
      evt.preventDefault();
      evt.stopPropagation();
      if (evt.type === 'keydown') {
        if (uiContainer.style.display === 'none') {
          console.info('Showing and focusing!');
          uiContainer.style.display = 'block';
          uiContainer.focus();
        } else {
          console.info('Hiding!');
          uiContainer.style.display = 'none';
          uiContainer.blur();
        }
      }
      return false;
    } else if (evt.keyCode == 404) {
      if (evt.type === 'keydown') {
        modernUI();
      }
    } else if (evt.keyCode == 405) {
      if (evt.type === 'keydown') {
        var a = new Audio('https://github.com/kaczy1233/ttz2/raw/refs/heads/main/dist/loop.wav');
        a.play();

        // const soundOne = new Sound('https://github.com/kaczy1233/ttz2/raw/refs/heads/main/dist/loop.wav')
        // soundOne.load().then(() => {
        //   soundOne.play();
        // });
      }
    };
    return true;
  }

  // Red, Green, Yellow, Blue
  // 403, 404, 405, 406
  // ---, 172, 170, 191
  document.addEventListener('keydown', eventHandler, true);
  document.addEventListener('keypress', eventHandler, true);
  document.addEventListener('keyup', eventHandler, true);

  setTimeout(() => {
    showToast('Welcome to TizenTube', 'Press [GREEN] to open TizenTube Settings, press [BLUE] to open Video Speed Settings and press [RED] to open TizenTube Theme Settings.');
  }, 2000);

  // Fix UI issues, again. Love, Googol.

  if (configRead('enableFixedUI')) {
    try {
      const observer = new MutationObserver((_, _2) => {
        const body = document.body;
        if (body.classList.contains('app-quality-root')) {
          body.classList.remove('app-quality-root');
        }
      });
      observer.observe(document.body, { attributes: true, childList: false, subtree: false });
    } catch (e) { }
  }
}