import {main} from './main';
import {makeDOMDriver} from '@cycle/dom';
import {makeFileReaderDriver} from './file-reader-driver';
import {run} from '@cycle/xstream-run';

run(main, {
  DOM: makeDOMDriver('body'),
  Fader: stream$ => {
    stream$.addListener({
      next: ({target, opacity}) => {
        const el = typeof target === 'string' ? document.querySelector(target) : target;
        if (el) {
          el.style.opacity = opacity;
        }
      },
      complete: () => {},
      error: () => {},
    });
  },
  FileReader: makeFileReaderDriver(),
  Log: msg$ => msg$.addListener({
    /* eslint-disable no-console */
    next: console.log.bind(console, 'LOG:'),
    error: console.error.bind(console, 'ERROR:'),
    complete: console.log.bind(console, 'COMPLETE:'),
    /* eslint-enable no-console */
  }),
  Visibility: stream$ => {
    stream$.addListener({
      next: ({target, visibility}) => {
        const el = typeof target === 'string' ? document.querySelector(target) : target;
        if (el) {
          el.style.visibility = visibility;
        }
      },
      complete: () => {},
      error: () => {},
    });
  },
});
