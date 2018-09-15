'use strict'

Object.defineProperty(exports, '__esModule', {
  value: true
})

exports.default = function () {
  var idProp = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'id'
  var url = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'http://localhost:3030/todos'

  var firstId = void 0

  it('POST', function () {
    this.slow(200)
    var body = { [idProp]: 1, text: 'first todo', complete: false }

    return _requestPromise2.default.post({ url: url, json: true, body: body }).then(function (todo) {
      var body = { [idProp]: 2, text: 'second todo', complete: false }

      firstId = todo[idProp];
      (0, _chai.expect)(todo[idProp]).to.exist;
      (0, _chai.expect)(todo.text).to.equal('first todo')

      return _requestPromise2.default.post({ url: url, json: true, body: body })
    }).then(function (todo) {
      var body = { [idProp]: 3, text: 'third todo', complete: false };

      (0, _chai.expect)(todo.text).to.equal('second todo')

      return _requestPromise2.default.post({ url: url, json: true, body: body })
    }).then(function (todo) {
      return (0, _chai.expect)(todo.text).to.equal('third todo')
    })
  })

  describe('GET /', function () {
    it('GET / with default pagination', function () {
      return (0, _requestPromise2.default)({
        url: url,
        json: true,
      }).then(function (page) {
        (0, _chai.expect)(page.total).to.equal(3);
        (0, _chai.expect)(page.limit).to.equal(2);
        (0, _chai.expect)(page.data.length).to.equal(2)
      })
    })

    it('GET / with filter', function () {
      return (0, _requestPromise2.default)({
        url: url,
        json: true,
        qs: { text: 'second todo' }
      }).then(function (page) {
        (0, _chai.expect)(page.total).to.equal(1);
        (0, _chai.expect)(page.limit).to.equal(2);
        (0, _chai.expect)(page.data.length).to.equal(1);
        (0, _chai.expect)(page.data[0].text).to.equal('second todo')
      })
    })
  })

  it('GET /id', function () {
    return (0, _requestPromise2.default)({ url: url + '/' + firstId, json: true }).then(function (todo) {
      (0, _chai.expect)(todo[idProp]).to.equal(firstId);
      (0, _chai.expect)(todo.text).to.equal('first todo')
    })
  })

  it('PATCH', function () {
    return _requestPromise2.default.patch({
      url: url + '/' + firstId,
      json: true,
      body: { complete: true }
    }).then(function (todo) {
      (0, _chai.expect)(todo[idProp]).to.equal(firstId);
      (0, _chai.expect)(todo.text).to.equal('first todo');
      (0, _chai.expect)(todo.complete).to.be.ok
    })
  })

  it('DELETE /id', function () {
    return _requestPromise2.default.post({
      url: url,
      json: true,
      body: { [idProp]: 4, text: 'to delete', complete: false }
    }).then(function (todo) {
      return _requestPromise2.default.del({ url: url + '/' + todo[idProp], json: true }).then(function (todo) {
        return (0, _chai.expect)(todo.text).to.equal('to delete')
      })
    })
  })
}

var _chai = require('chai')

var _requestPromise = require('request-promise')

var _requestPromise2 = _interopRequireDefault(_requestPromise)

function _interopRequireDefault (obj) { return obj && obj.__esModule ? obj : { default: obj } }

module.exports = exports['default']
/* eslint-disable no-unused-expressions */
