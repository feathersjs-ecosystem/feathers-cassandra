const setAllowFiltering = () => {
  return async context => {
    if (context.params.query) { context.params.query.$allowFiltering = true; }

    return context;
  };
};

module.exports = {
  before: {
    all: [setAllowFiltering()],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: []
  },

  after: {
    all: [],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: []
  },

  error: {
    all: [],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: []
  }
};
