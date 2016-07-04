import docStyle from '!!css!less!./dmtf.less';
import {highlight} from './highlight';
import hljsStyle from '!!css!highlight.js/styles/github.css';
import jsYaml from 'js-yaml';
import marked from 'marked';
import template from 'lodash.template';
import {toc} from './toc';
import wrapper from '!!raw!./template.html';
import xs from 'xstream';

const documentDefaults = {
  DocLang: 'en-US',
  DocConfidentiality: ''
};

const docStatuses = {
  wip: {
    DocStatus: 'Work in Progress',
  },
  draft: {
    DocStatus: 'Draft'
  },
  published: {
    DocStatus: 'Published'
  }
};

export function render({text: md, file}) {
  return xs.create({
    start: function startMarkdownRender(listener) {
      const {attributes, body} = fm(md);
      marked(template(body)(attributes), (err, html) => {
        if (err) {
          return listener.error(err);
        }

        highlight(html).then(toc).then(result => {
          listener.next({
            data: attributes,
            html: template(wrapper)({
              contents: result,
              data: attributes,
              style: `${docStyle}${hljsStyle}`
            }),
            file,
          });
          listener.complete();
        });
      });
    },
    stop: () => {},
  }).remember();
}

function fm(content) {
  const re = /^(?:-{3}(?:\r?\n)([\w\W]+?)-{3})?([\w\W]*)$/;
  const matches = re.exec(content);
  const result = {
    attributes: {
      modified: (new Date()).toISOString().slice(0, 10)
    },
    body: matches[2]
  };

  if (matches[1]) {
    const data = result.attributes;

    Object.assign(data, jsYaml.load(matches[1]));

    // Default to a Work in Progress
    if (!data.status) {
      data.status = 'wip';
    }

    Object.assign(data, documentDefaults, docStatuses[data.status]);

    if (!data.released) {
      data.DocConfidentiality = 'DMTF Confidential';
    }
  }

  return result;
}
