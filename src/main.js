import '!!style!raw!highlight.js/styles/github.css';
import '!!style!raw!less!./dmtf.css';
// import {a, div, h1, h2, p, strong} from '@cycle/dom';
import {dropZone, instructions} from './styles.css';
import {basename} from 'path';
import {createToC} from './toc';
import {div} from '@cycle/dom';
import dropUntil from 'xstream/extra/dropUntil';
import fromEvent from 'xstream/extra/fromEvent';
import hljs from 'highlight.js';
import {render} from './markdown-driver';
import {saveAs} from 'filesaver.js';
import template from 'lodash.template';
import wrapper from 'raw!./template.html';
import xs from 'xstream';

export function main({DOM, FileReader, MarkdownRenderer}) {
  const root$ = DOM.select(':root');
  const drops$ = xs.merge(
    root$.events('dragover'),
    root$.events('drop'),
  ).map(killEvent).filter(({type}) => type === 'drop');

  const file$ = drops$.map(({dataTransfer: {files}}) => files[0]);
  const html$ = FileReader.map(stream$ =>
    stream$.last().map(render).flatten()
  ).flatten();

  const display$ = html$.map(({data, html, file: {name}}) => {
    const wrapped = template(wrapper)({contents: html, data});
    return div('#dmtf', {
      hook: {
        insert: insertOrUpdate(wrapped, name),
        update: insertOrUpdate(wrapped, name),
      },
      style: {transition: 'opacity 0.6s'},
    });
  })
  .startWith(div('#dmtf'))
  .map(rendered => {
    return div([
      rendered,
      div(`.${dropZone}`, {
        style: {opacity: '0', transition: 'opacity 0.6s', delayed: {opacity: '1'}},
      }, [
        div(`.${instructions}`, 'Drop to process'),
      ]),
    ]);
  });

  xs.merge(
    // Start with overlay present
    fromEvent(document, 'dragenter').startWith(null).mapTo(1),
    // Register leave after first drop has occurred
    DOM.select(`.${dropZone}`).events('dragleave').compose(dropUntil(drops$)).mapTo(0),
    drops$.mapTo(0),
  )
  .addListener({
    next: value => {
      const drop = document.querySelector(`.${dropZone}`);
      drop && (drop.style.opacity = value);
    },
    error: () => {},
    complete: () => {},
  });

  xs.merge(html$.mapTo(1), file$.mapTo(0))
  .addListener({
    next: value => {
      const dmtf = document.getElementById('dmtf');
      dmtf && (dmtf.style.opacity = value);
    },
    error: () => {},
    complete: () => {},
  });

  return {
    DOM: display$,
    FileReader: file$,
    // Log: xs.merge(
      // dragEvents$.map(killEvent).map(evt => `Killed ${evt.type}`),
      // drops$.map(evt => evt.dataTransfer.files),
      // FileReader.flatten(),
    // ),
    // MarkdownRenderer: FileReader.flatten(),
    // DOM: xs.of('<div>Blah2</div>')
  };
}

function killEvent(evt) {
  evt.dataTransfer.dropEffect = 'copy';
  evt.stopPropagation();
  evt.preventDefault();
  return evt;
}

function insertOrUpdate(html, name) {
  return function generate(node) {
    node.elm.innerHTML = html;
    let toc = node.elm.querySelector('#toc');
    let body = node.elm.querySelector('#wrapper');
    toc.innerHTML = '';
    createToC(toc, body);

    for (let block of [...body.querySelectorAll('pre code')]) {
      if (/lang-/.test(block.getAttribute('class'))) {
        hljs.highlightBlock(block);
      }
    }

    let blob = new Blob([document.firstElementChild.outerHTML]);
    saveAs(blob, `${basename(name, '.md')}.html`);
  };
}
