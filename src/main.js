// import {a, div, h1, h2, p, strong} from '@cycle/dom';
import {dropZone, instructions} from './styles.css';
import {basename} from 'path';
import {div} from '@cycle/dom';
import dropUntil from 'xstream/extra/dropUntil';
import fromEvent from 'xstream/extra/fromEvent';
import {render} from './markdown-driver';
import {saveAs} from 'filesaver.js';
import template from 'lodash.template';
import wrapper from '!!raw!./page.html';
import xs from 'xstream';

export function main(sources) {
  return view(model(intent(sources)));
}

function killEvent(evt) {
  evt.dataTransfer.dropEffect = 'copy';
  evt.stopPropagation();
  evt.preventDefault();
  return evt;
}

function insertOrUpdate({data, html, name}) {
  return function generate(node) {
    node.elm.innerHTML = html;

    let blob = new Blob([template(wrapper)({contents: html, data})]);
    saveAs(blob, `${basename(name, '.md')}.html`);
  };
}

function intent({DOM, FileReader}) {
  const root$ = DOM.select(':root');

  const fileDropped$ = xs.merge(
    root$.events('dragover'),
    root$.events('drop'),
  ).map(killEvent).filter(({type}) => type === 'drop');

  const fileLoaded$ = FileReader.map(stream$ => stream$.last()).flatten();

  const hide$ = root$.events('transitionend')
  .filter(({propertyName}) => 'opacity')
  .map(({target}) => target)
  .filter(({style: {opacity}}) => opacity === '0');

  const dragEnter$ = fromEvent(document, 'dragenter');
  const dragLeave$ = DOM.select(`.${dropZone}`)
  .events('dragleave')
  .compose(dropUntil(fileDropped$));

  return {
    dragEnter$,
    dragLeave$,
    fileDropped$,
    fileLoaded$,
    hide$,
  };
}

function model({dragEnter$, dragLeave$, fileDropped$, fileLoaded$, hide$}) {
  const contentOpacity$ = xs.merge(fileLoaded$.mapTo(1), fileDropped$.mapTo(0));

  const dropZoneOpacity$ = xs.merge(
    dragEnter$.mapTo(1),
    dragLeave$.mapTo(0),
    fileDropped$.mapTo(0),
  );

  const file$ = fileDropped$.map(({dataTransfer: {files}}) => files[0]);

  const markdown$ = fileLoaded$.map(render).flatten();

  return {
    contentOpacity$,
    dropZoneOpacity$,
    file$,
    hide$,
    markdown$,
  };
}

function view({contentOpacity$, dropZoneOpacity$, file$, hide$, markdown$}) {
  const view$ = markdown$.map(({data, html, file: {name}}) => {
    return div('#dmtf', {
      hook: {
        insert: insertOrUpdate({data, html, name}),
        update: insertOrUpdate({data, html, name}),
      },
      style: {transition: 'opacity 0.6s, visibility 0.6s'},
    });
  })
  .startWith(div('#dmtf'))
  .map(rendered => {
    return div([
      rendered,
      div(`.${dropZone}`, {
        style: {
          opacity: '0',
          transition: 'opacity 0.6s, visibility 0.6s',
          delayed: {opacity: '1'}
        },
      }, [
        div(`.${instructions}`, 'Drop to process'),
      ]),
    ]);
  });

  const fadeInOut$ = xs.merge(
    contentOpacity$.map(val => ({target: '#dmtf', opacity: val})),
    dropZoneOpacity$.map(val => ({target: `.${dropZone}`, opacity: val})),
  );

  return {
    DOM: view$,
    Fader: fadeInOut$,
    FileReader: file$,
    Visibility: xs.merge(
      hide$.map(target => ({target, visibility: 'hidden'})),
      fadeInOut$
      .filter(({opacity}) => opacity)
      .map(({target}) => ({target, visibility: 'visible'})),
    ),
  };
}
