export const PROCESSORS = {
  json: {
    pre: code => {
      if (!isEllipsied(code)) {
        return code;
      }

      // TODO: Preserve comma in post call
      return code.replace(/^\.\.\./, '{').replace(/,?\s*\.\.\.\n?$/, '\n}');
    },
    post: (highlighted, original) => {
      if (!isEllipsied(original)) {
        return highlighted;
      }

      return ['...', ...highlighted.split(/\r?\n/).slice(1, -1), '...'].join('\n');
    }
  },
  http: {
    pre: original => {
      const [http, json] = original.split('\r?\n\r?\n');
      if (!json || !/Content-Type: application\/json/i.test(http)) {
        return original;
      }

      return `${http}\n\n${PROCESSORS.json.pre(json)}`;
    },
    post: (highlighted, original) => {
      const [http, code] = original.split('\r?\n\r?\n');
      if (!json || !/Content-Type: application\/json/i.test(http)) {
        return highlighted;
      }

      const [hhttp, json] = highlighted.split('\r?\n\r?\n');
      return `${hhttp}\n\n${PROCESSORS.json.post(json, code)}`;
    },
  },
  undefined: {pre: code => code, post: code => code},
};

function isEllipsied(code) {
  return /^\.\.\./.test(code);
}

