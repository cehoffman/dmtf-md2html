// import {rerunner, restartable} from 'cycle-restart';
// import Cyclejs from '@cycle/core';
import {main} from './main';
import {makeDOMDriver} from '@cycle/dom';
import {makeFileReaderDriver} from './file-reader-driver';
// import {makeMarkdownDriver} from './markdown-driver';
import {run} from '@cycle/xstream-run';
// import {run} from '@cycle/core';
// window.Cyclejs = Cyclejs;

// const drivers = {
//   DOM: restartable(makeDOMDriver('body'), {pauseSinksWhileReplaying: false}),
// };

run(main, {
  DOM: makeDOMDriver('body'),
  FileReader: makeFileReaderDriver(),
  Log: msg$ => msg$.addListener({
    /* eslint-disable no-console */
    next: console.log.bind(console, 'LOG:'),
    error: console.error.bind(console, 'ERROR:'),
    complete: console.log.bind(console, 'COMPLETE:'),
    /* eslint-enable no-console */
  }),
  // MarkdownRenderer: makeMarkdownDriver(),
});
// const rerun = rerunner(run);
// rerun(main, drivers);

// if (module && module.hot) {
//   console.log('IN the HOTNESS');
//   module.hot.accept('./main', () => {
//     rerun(main, drivers);
//   });
//   module.hot.accept();
// }
