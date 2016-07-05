import {main} from './main';
import {makeDOMDriver} from '@cycle/dom';
import {makeFileReaderDriver} from './file-reader-driver';
import {run} from '@cycle/xstream-run';
import {saveAs} from 'filesaver.js';

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
  FileWriter: msg$ => msg$.addListener({
    next: ({name, content}) => {
      saveAs(content, name);
    },
    complete: () => {},
    error: () => {},
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
