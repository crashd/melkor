"use strict";


var debug = require('debug')('melkor-controller'),
  waigo = require('waigo');

var pageModel = waigo.load('model/page'),
  waigoForm = waigo.load('support/forms/form'),
  Form = waigoForm.Form,
  FormValidationError = waigoForm.FormValidationError;


/**
 * Show editor to create a new page
 */
exports.new = function*(next) {
  debug('New page');

  var form = Form.new('page');

  if ('new' !== this.params.page) {
    form.fields.title.value = this.params.page;
  }

  yield this.render('new', {
    nav: 'new',
    form: form
  });
};



/**
 * Create new page.
 */
exports.create = function*(next) {
  debug('Create page');

  var form = Form.new('page');

  try {
    yield form.setValues(this.request.body);
    yield form.validate();

    var title = form.fields.title.value;

    var pageSlug = yield pageModel.save(
      this.app.config.wikiFolder,
      null,
      {
        title: form.fields.title.value,
        body: form.fields.body.value,
        commitMsg: form.fields.comment.value
      }
    );

    this.response.redirect('/' + pageSlug);

  } catch (err) {
    if (err instanceof FormValidationError) {
      this.status = err.status;

      yield this.render('new', {
        nav: 'new',
        form: form,
        error: err
      });
    } else {
      throw err;
    }
  }
};



/**
 * Show page editor
 */
exports.edit = function*(next) {
  debug('Edit page');

  var pageData = yield pageModel.load(this.app.config.wikiFolder, this.params.page);

  var form = Form.new('page');
  form.fields.title.value = pageData.title;
  form.fields.body.value = pageData.body;

  yield this.render('edit', {
    page: this.params.page,
    form: form
  });
};




/**
 * Update page
 */
exports.update = function*(next) {
  debug('Update page');

  var form = Form.new('page');

  try {
    yield form.setValues(this.request.body);
    yield form.validate();

    var pageSlug = yield pageModel.save(
      this.app.config.wikiFolder,
      this.params.page,
      {
        title: form.fields.title.value,
        body: form.fields.body.value,
        commitMsg: form.fields.comment.value
      }
    );

    this.response.redirect('/' + pageSlug);

  } catch (err) {
    if (err instanceof FormValidationError) {
      this.status = err.status;

      yield this.render('edit', {
        page: this.params.page,
        form: form,
        error: err
      });
    } else {
      throw err;
    }
  }
};





/**
 * Delete a page.
 */
exports.delete = function*(next) {
  debug('Delete page');

  var page = this.params.page;

  yield pageModel.delete(this.app.config.wikiFolder, this.params.page);

  this.response.redirect('/');
};





/**
 * Show a page.
 */
exports.show = function*(next) {
  debug('Show page');

  var page = this.params.page || (this.params.page = 'home');

  var data = null;
  try {
    data = yield pageModel.load(this.app.config.wikiFolder, page);
  } catch (err) {
    // if page not found then create a new page
    if (err instanceof pageModel.PageNotFoundError) {
      return yield exports.new.call(this, next);
    } else {
      throw err;
    }
  }

  data.body = yield this.app.toMarkdown(data.body || '');

  data.nav = page;

  yield this.render('show', data);
};





/**
 * Show index of all pages.
 */
exports.index = function*(next) {
  debug('Show index');

  var pages = yield pageModel.index(this.app.config.wikiFolder);

  var sortByModified = ('modified' === this.query.sort);

  // newest first
  pages.sort(function(a, b) {
    if (sortByModified) {
      return b.ts - a.ts;
    } else {
      return a.name > b.name;
    }
  });


  yield this.render('index', {
    nav: 'index',
    pages: pages,
    sort: sortByModified ? 'modified' : 'name'
  });
};
