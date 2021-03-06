
(function () {
  Vue.component('vue-item', {
    props: ['jsondata', 'theme'],
    template: '#item-template'
  })

  Vue.component('vue-outer', {
    props: ['jsondata', 'isend', 'path', 'theme'],
    template: '#outer-template'
  })

  Vue.component('vue-expand', {
    props: [],
    template: '#expand-template'
  })

  Vue.component('vue-val', {
    props: ['field', 'val', 'isend', 'path', 'theme'],
    template: '#val-template'
  })

  Vue.use({
    install: function (Vue, options) {

      // 判断数据类型
      Vue.prototype.getTyp = function (val) {
        return toString.call(val).split(']')[0].split(' ')[1]
      }

      // 判断是否是对象或者数组，以对下级进行渲染
      Vue.prototype.isObjectArr = function (val) {
        return ['Object', 'Array'].indexOf(this.getTyp(val)) > -1
      }

      // 折叠
      Vue.prototype.fold = function ($event) {
        var target = Vue.prototype.expandTarget($event)
        target.siblings('svg').show()
        target.hide().parent().siblings('.expand-view').hide()
        target.parent().siblings('.fold-view').show()
      }
      // 展开
      Vue.prototype.expand = function ($event) {
        var target = Vue.prototype.expandTarget($event)
        target.siblings('svg').show()
        target.hide().parent().siblings('.expand-view').show()
        target.parent().siblings('.fold-view').hide()
      }

      //获取展开折叠的target
      Vue.prototype.expandTarget = function ($event) {
        switch($event.target.tagName.toLowerCase()) {
          case 'use':
            return $($event.target).parent()
          case 'label':
            return $($event.target).closest('.fold-view').siblings('.expand-wraper').find('.icon-square-plus').first()
          default:
            return $($event.target)
        }
      }

      // 格式化值
      Vue.prototype.formatVal = function (val) {
        switch(Vue.prototype.getTyp(val)) {
          case 'String':
            return '"' + val + '"'
          case 'Null':
            return 'null'
          default:
            return val
        }
      }

      // 判断值是否是链接
      Vue.prototype.isaLink = function (val) {
        return /^((https|http|ftp|rtsp|mms)?:\/\/)[^\s]+/.test(val)
      }

      // 计算对象的长度
      Vue.prototype.objLength = function (obj) {
        return Object.keys(obj).length
      }

      /**渲染 JSON key:value 项
       * @author TommyLemon
       * @param val
       * @param key
       * @return {boolean}
       */
      Vue.prototype.onRenderJSONItem = function (val, key, path) {
        if (isSingle || key == null) {
          return true
        }
        if (key == '_$_this_$_') {
          // return true
          return false
        }

        try {
          if (val instanceof Array) {
            if (val[0] instanceof Object && (val[0] instanceof Array == false) && JSONObject.isArrayKey(key)) {
              // alert('onRenderJSONItem  key = ' + key + '; val = ' + JSON.stringify(val))

              var ckey = key.substring(0, key.lastIndexOf('[]'));

              var aliaIndex = ckey.indexOf(':');
              var objName = aliaIndex < 0 ? ckey : ckey.substring(0, aliaIndex);

              var firstIndex = objName.indexOf('-');
              var firstKey = firstIndex < 0 ? objName : objName.substring(0, firstIndex);

              for (var i = 0; i < val.length; i++) {
                var cPath = (StringUtil.isEmpty(path, false) ? '' : path + '/') + key;

                if (JSONObject.isTableKey(firstKey)) {
                  // var newVal = JSON.parse(JSON.stringify(val[i]))

                  var newVal = {}
                  for (var k in val[i]) {
                    newVal[k] = val[i][k] //提升性能
                    delete val[i][k]
                  }

                  val[i]._$_this_$_ = JSON.stringify({
                    path: cPath + '/' + i,
                    table: firstKey
                  })

                  for (var k in newVal) {
                    val[i][k] = newVal[k]
                  }
                }
                else {
                  this.onRenderJSONItem(val[i], '' + i, cPath);
                }

                // this.$children[i]._$_this_$_ = key
                // alert('this.$children[i]._$_this_$_ = ' + this.$children[i]._$_this_$_)
              }
            }
          }
          else if (val instanceof Object) {
            var aliaIndex = key.indexOf(':');
            var objName = aliaIndex < 0 ? key : key.substring(0, aliaIndex);

            // var newVal = JSON.parse(JSON.stringify(val))

            var newVal = {}
            for (var k in val) {
              newVal[k] = val[k] //提升性能
              delete val[k]
            }

            val._$_this_$_ = JSON.stringify({
              path: (StringUtil.isEmpty(path, false) ? '' : path + '/') + key,
              table: JSONObject.isTableKey(objName) ? objName : null
            })

            for (var k in newVal) {
              val[k] = newVal[k]
            }

            // val = Object.assign({ _$_this_$_: objName }, val) //解决多显示一个逗号 ,

            // this._$_this_$_ = key  TODO  不影响 JSON 的方式，直接在组件读写属性
            // alert('this._$_this_$_ = ' + this._$_this_$_)
          }


        } catch (e) {
          alert('onRenderJSONItem  try { ... } catch (e) {\n' + e.message)
        }

        return true

      }


      /**显示 Response JSON 的注释
       * @author TommyLemon
       * @param val
       * @param key
       * @param $event
       */
      Vue.prototype.setResponseHint = function (val, key, $event) {
        console.log('setResponseHint')
        this.$refs.responseKey.setAttribute('data-hint', isSingle ? '' : this.getResponseHint(val, key, $event));
      }
      /**获取 Response JSON 的注释
       * 方案一：
       * 拿到父组件的 key，逐层向下传递
       * 问题：拿不到爷爷组件 "Comment[]": [ { "id": 1, "content": "content1" }, { "id": 2 }... ]
       *
       * 方案二：
       * 改写 jsonon 的 refKey 为 key0/key1/.../refKey
       * 问题：遍历，改 key；容易和特殊情况下返回的同样格式的字段冲突
       *
       * 方案三：
       * 改写 jsonon 的结构，val 里加 .path 或 $.path 之类的隐藏字段
       * 问题：遍历，改 key；容易和特殊情况下返回的同样格式的字段冲突
       *
       * @author TommyLemon
       * @param val
       * @param key
       * @param $event
       */
      Vue.prototype.getResponseHint = function (val, key, $event) {
        // alert('setResponseHint  key = ' + key + '; val = ' + JSON.stringify(val))

        var s = ''

        try {

          var path = null
          var table = null
          var column = null
          if (val instanceof Object && (val instanceof Array == false)) {

            var parent = $event.currentTarget.parentElement.parentElement
            var valString = parent.textContent

            // alert('valString = ' + valString)

            var i = valString.indexOf('"_$_this_$_":  "')
            if (i >= 0) {
              valString = valString.substring(i + '"_$_this_$_":  "'.length)
              i = valString.indexOf('}"')
              if (i >= 0) {
                valString = valString.substring(0, i + 1)
                // alert('valString = ' + valString)
                var _$_this_$_ = JSON.parse(valString) || {}
                path = _$_this_$_.path
                table = _$_this_$_.table
              }


              var aliaIndex = key == null ? -1 : key.indexOf(':');
              var objName = aliaIndex < 0 ? key : key.substring(0, aliaIndex);

              if (JSONObject.isTableKey(objName)) {
                table = objName
              }
              else if (JSONObject.isTableKey(table)) {
                column = key
              }

              // alert('path = ' + path + '; table = ' + table + '; column = ' + column)
            }
          }
          else {
            var parent = $event.currentTarget.parentElement.parentElement
            var valString = parent.textContent

            // alert('valString = ' + valString)

            var i = valString.indexOf('"_$_this_$_":  "')
            if (i >= 0) {
              valString = valString.substring(i + '"_$_this_$_":  "'.length)
              i = valString.indexOf('}"')
              if (i >= 0) {
                valString = valString.substring(0, i + 1)
                // alert('valString = ' + valString)
                var _$_this_$_ = JSON.parse(valString) || {}
                path = _$_this_$_.path
                table = _$_this_$_.table
              }
            }

            if (val instanceof Array && JSONObject.isArrayKey(key)) {
              var key2 = key == null ? null : key.substring(0, key.lastIndexOf('[]'));

              var aliaIndex = key2 == null ? -1 : key2.indexOf(':');
              var objName = aliaIndex < 0 ? key2 : key2.substring(0, aliaIndex);

              var firstIndex = objName == null ? -1 : objName.indexOf('-');
              var firstKey = firstIndex < 0 ? objName : objName.substring(0, firstIndex);

              // alert('key = ' + key + '; firstKey = ' + firstKey + '; firstIndex = ' + firstIndex)
              if (JSONObject.isTableKey(firstKey)) {
                table = firstKey

                var s0 = '';
                if (firstIndex > 0) {
                  objName = objName.substring(firstIndex + 1);
                  firstIndex = objName.indexOf('-');
                  column = firstIndex < 0 ? objName : objName.substring(0, firstIndex)

                  var c = CodeUtil.getCommentFromDoc(docObj == null ? null : docObj['[]'], table, column, App.getMethod(), App.database, true); // this.getResponseHint({}, table, $event
                  s0 = column + (StringUtil.isEmpty(c, true) ? '' : ': ' + c)
                }

                var c = CodeUtil.getCommentFromDoc(docObj == null ? null : docObj['[]'], table, null, App.getMethod(), App.database, true);
                s = (StringUtil.isEmpty(path) ? '' : path + '/') + key + ' 中 '
                  + (
                    StringUtil.isEmpty(c, true) ? '' : table + ': '
                      + c + ((StringUtil.isEmpty(s0, true) ? '' : '  -  ' + s0) )
                  );

                return s;
              }
              //导致 key[] 的 hint 显示为  key[]key[]   else {
              //   s = (StringUtil.isEmpty(path) ? '' : path + '/') + key
              // }
            }
            else {
              if (JSONObject.isTableKey(table)) {
                column = key
              }
              // alert('path = ' + path + '; table = ' + table + '; column = ' + column)
            }
          }
          // alert('setResponseHint  table = ' + table + '; column = ' + column)

          var c = CodeUtil.getCommentFromDoc(docObj == null ? null : docObj['[]'], table, column, App.getMethod(), App.database, true);

          s += (StringUtil.isEmpty(path) ? '' : path + '/') + (StringUtil.isEmpty(column) ? (StringUtil.isEmpty(table) ? key : table) : column) + (StringUtil.isEmpty(c, true) ? '' : ': ' + c)
        }
        catch (e) {
          s += '\n' + e.message
        }

        return s;
      }

    }
  })



  var initJson = {}

// 主题 [key, String, Number, Boolean, Null, link-link, link-hover]
  var themes = [
    ['#92278f', '#3ab54a', '#25aae2', '#f3934e', '#f34e5c', '#717171'],
    ['rgb(19, 158, 170)', '#cf9f19', '#ec4040', '#7cc500', 'rgb(211, 118, 126)', 'rgb(15, 189, 170)'],
    ['#886', '#25aae2', '#e60fc2', '#f43041', 'rgb(180, 83, 244)', 'rgb(148, 164, 13)'],
    ['rgb(97, 97, 102)', '#cf4c74', '#20a0d5', '#cd1bc4', '#c1b8b9', 'rgb(25, 8, 174)']
  ]




// APIJSON <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

  var REQUEST_TYPE_PARAM = 'PARAM'
  var REQUEST_TYPE_FORM = 'FORM'
  var REQUEST_TYPE_JSON = 'JSON'

  var RANDOM_REAL = 'RANDOM_REAL'
  var RANDOM_REAL_IN = 'RANDOM_REAL_IN'
  var RANDOM_INT = 'RANDOM_INT'
  var RANDOM_NUM = 'RANDOM_NUM'
  var RANDOM_STR = 'RANDOM_STR'
  var RANDOM_IN = 'RANDOM_IN'

  var ORDER_REAL = 'ORDER_REAL'
  var ORDER_INT = 'ORDER_INT'
  var ORDER_IN = 'ORDER_IN'

  var ORDER_MAP = {}

  //TODO 实际请求后填值? 每次请求，还是一次加载一页缓存起来？
  function randomReal(table, key, count) {
    var json = {
      count: count,
      from: table
    }
    json[table] = {
      '@column': key,
      '@order': 'random()'
    }
    return json
  }
  function randomInt(min, max) {
    return Math.round(randomNum(min, max));
  }
  function randomNum(min, max, precision) {
    // 0 居然也会转成  Number.MIN_SAFE_INTEGER ！！！
    // start = start || Number.MIN_SAFE_INTEGER
    // end = end || Number.MAX_SAFE_INTEGER

    if (min == null) {
      min = Number.MIN_SAFE_INTEGER
    }
    if (max == null) {
      max = Number.MAX_SAFE_INTEGER
    }
    if (precision == null) {
      precision = 2
    }

    return + ((max - min)*Math.random() + min).toFixed(precision);
  }

  function randomStr(minLength, maxLength, availableChars) {
    return 'Ab_Cd' + randomNum();
  }
  function randomIn(...args) {
    return args == null || args.length <= 0 ? null : args[randomInt(0, args.length - 1)];
  }

  //TODO 实际请求后填值? 每次请求，还是一次加载一页缓存起来？
  function orderReal(index, table, key, order) {
    var json = {
      count: 1,
      page: index,
      from: table
    }
    json[table] = {
      '@column': key,
      '@order': order || (key + '+')
    }
    return json
  }
  function orderInt(index, min, max) {
    if (min == null) {
      min = Number.MIN_SAFE_INTEGER
    }
    if (max == null) {
      max = Number.MAX_SAFE_INTEGER
    }
    return min + index%(max - min + 1)
  }
  function orderIn(index, ...args) {
    // alert('orderIn  index = ' + index + '; args = ' + JSON.stringify(args));
    index = index || 0;
    return args == null || args.length <= index ? null : args[index];
  }

  function getOrderIndex(randomId, lineKey, argCount) {
    // alert('randomId = ' + randomId + '; lineKey = ' + lineKey + '; argCount = ' + argCount);
    // alert('ORDER_MAP = ' + JSON.stringify(ORDER_MAP, null, '  '));

    if (randomId == null) {
      randomId = 0;
    }
    if (ORDER_MAP == null) {
      ORDER_MAP = {};
    }
    if (ORDER_MAP[randomId] == null) {
      ORDER_MAP[randomId] = {};
    }

    var orderIndex = ORDER_MAP[randomId][lineKey];
    // alert('orderIndex = ' + orderIndex)

    if (orderIndex == null || orderIndex < -1) {
      orderIndex = -1;
    }

    orderIndex ++
    orderIndex = argCount == null || argCount <= 0 ? orderIndex : orderIndex%argCount;
    ORDER_MAP[randomId][lineKey] = orderIndex;

    // alert('orderIndex = ' + orderIndex)
    // alert('ORDER_MAP = ' + JSON.stringify(ORDER_MAP, null, '  '));
    return orderIndex;
  }
  //这些全局变量不能放在data中，否则会报undefined错误

  var baseUrl
  var inputted
  var handler
  var docObj
  var doc
  var output

  var isSingle = true

  var doneCount

// APIJSON >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

  var App = new Vue({
    el: '#app',
    data: {
      baseview: 'formater',
      view: 'output',
      jsoncon: JSON.stringify(initJson),
      jsonhtml: initJson,
      compressStr: '',
      error: {},
      requestVersion: 3,
      requestCount: 1,
      urlComment: ': Integer  //计算数组长度',
      historys: [],
      history: {name: '请求0'},
      remotes: [],
      locals: [],
      testCases: [],
      randoms: [],
      randomSubs: [],
      accounts: [
        {
          'isLoggedIn': false,
          'name': '测试账号1',
          'phone': '13000082001',
          'password': '123456'
        },
        {
          'isLoggedIn': false,
          'name': '测试账号2',
          'phone': '13000082002',
          'password': '123456'
        },
        {
          'isLoggedIn': false,
          'name': '测试账号3',
          'phone': '13000082003',
          'password': '123456'
        }
      ],
      currentAccountIndex: 0,
      tests: { '-1':{}, '0':{}, '1':{}, '2': {} },
      crossProcess: '交叉账号:已关闭',
      testProcess: '机器学习:已关闭',
      randomTestTitle: '随机测试 Random Test',
      testRandomCount: 1,
      testRandomProcess: '',
      compareColor: '#0000',
      isDelayShow: false,
      isSaveShow: false,
      isExportShow: false,
      isExportRandom: false,
      isTestCaseShow: false,
      isHeaderShow: false,
      isRandomShow: true,
      isRandomListShow: false,
      isRandomSubListShow: false,
      isRandomEditable: false,
      isLoginShow: false,
      isConfigShow: false,
      isDeleteShow: false,
      currentDocItem: {},
      currentRemoteItem: {},
      currentRandomItem: {},
      isAdminOperation: false,
      loginType: 'login',
      isExportRemote: false,
      isRegister: false,
      isCrossEnabled: false,
      isMLEnabled: false,
      isDelegateEnabled: false,
      isLocalShow: false,
      exTxt: {
        name: 'APIJSON测试',
        button: '保存',
        index: 0
      },
      themes: themes,
      checkedTheme: 0,
      isExpand: true,
      User: {
        id: 0,
        name: '',
        head: ''
      },
      Privacy: {
        id: 0,
        balance: null //点击更新提示需要判空 0.00
      },
      type: '',
      types: [ REQUEST_TYPE_JSON ],
      host: 'apijson/demo/server/MathUtil/', // 'apijson/demo/server/DemoFunction/',
      branch: 'countArray',
      database: 'MYSQL',// 'POSTGRESQL',
      schema: 'sys',
      server: 'http://apijson.cn:8081',  //apijson.org:8000
      // server: 'http://47.74.39.68:9090',  // apijson.org
      project: 'http://apijson.cn:8081',  //apijson.org:8000
      language: 'Java',
      header: {}
    },
    methods: {

      // 全部展开
      expandAll: function () {
        if (App.view != 'code') {
          alert('请先获取正确的JSON Response！')
          return
        }

        $('.icon-square-min').show()
        $('.icon-square-plus').hide()
        $('.expand-view').show()
        $('.fold-view').hide()

        App.isExpand = true;
      },

      // 全部折叠
      collapseAll: function () {
        if (App.view != 'code') {
          alert('请先获取正确的JSON Response！')
          return
        }

        $('.icon-square-min').hide()
        $('.icon-square-plus').show()
        $('.expand-view').hide()
        $('.fold-view').show()

        App.isExpand = false;
      },

      // diff
      diffTwo: function () {
        var oldJSON = {}
        var newJSON = {}
        App.view = 'code'
        try {
          oldJSON = jsonlint.parse(App.jsoncon)
        } catch (ex) {
          App.view = 'error'
          App.error = {
            msg: '原 JSON 解析错误\r\n' + ex.message
          }
          return
        }

        try {
          newJSON = jsonlint.parse(App.jsoncon)
        } catch (ex) {
          App.view = 'error'
          App.error = {
            msg: '新 JSON 解析错误\r\n' + ex.message
          }
          return
        }

        var base = difflib.stringAsLines(JSON.stringify(oldJSON, '', 4))
        var newtxt = difflib.stringAsLines(JSON.stringify(newJSON, '', 4))
        var sm = new difflib.SequenceMatcher(base, newtxt)
        var opcodes = sm.get_opcodes()
        $('#diffoutput').empty().append(diffview.buildView({
          baseTextLines: base,
          newTextLines: newtxt,
          opcodes: opcodes,
          baseTextName: '原 JSON',
          newTextName: '新 JSON',
          contextSize: 2,
          viewType: 0
        }))
      },

      baseViewToDiff: function () {
        App.baseview = 'diff'
        App.diffTwo()
      },

      // 回到格式化视图
      baseViewToFormater: function () {
        App.baseview = 'formater'
        App.view = 'code'
        App.showJsonView()
      },

      // 根据json内容变化格式化视图
      showJsonView: function () {
        if (App.baseview === 'diff') {
          return
        }
        try {
          if (this.jsoncon.trim() === '') {
            App.view = 'empty'
          } else {
            App.view = 'code'

            if (isSingle) {
              App.jsonhtml = jsonlint.parse(this.jsoncon)
            }
            else {
              App.jsonhtml = Object.assign({
                _$_this_$_: JSON.stringify({
                  path: null,
                  table: null
                })
              }, jsonlint.parse(this.jsoncon))
            }

          }
        } catch (ex) {
          App.view = 'error'
          App.error = {
            msg: ex.message
          }
        }
      },


      showUrl: function (isAdminOperation, branchUrl) {
        if (StringUtil.isEmpty(this.host, true)) {  //显示(可编辑)URL Host
          if (isAdminOperation != true) {
            baseUrl = this.getBaseUrl()
          }
          vUrl.value = (isAdminOperation ? App.server : baseUrl) + branchUrl
        }
        else {  //隐藏(固定)URL Host
          if (isAdminOperation) {
            this.host = App.server
          }
          vUrl.value = branchUrl
        }

        vUrlComment.value = isSingle || StringUtil.isEmpty(App.urlComment, true)
          ? '' : vUrl.value + App.urlComment;
      },

      //设置基地址
      setBaseUrl: function () {
        if (StringUtil.isEmpty(this.host, true) != true) {
          return
        }
        // 重新拉取文档
        var bu = this.getBaseUrl()
        if (baseUrl != bu) {
          baseUrl = bu;
          // doc = null //这个是本地的数据库字典及非开放请求文档
          this.saveCache('', 'URL_BASE', baseUrl)

          //已换成固定的管理系统URL

          // this.remotes = []

          // var index = baseUrl.indexOf(':') //http://localhost:8080
          // App.server = (index < 0 ? baseUrl : baseUrl.substring(0, baseUrl)) + ':9090'

        }
      },
      getUrl: function () {
        var url = StringUtil.get(this.host) + new String(vUrl.value)
        return url.replace(/ /g, '')
      },
      //获取基地址
      getBaseUrl: function () {
        var url = new String(vUrl.value).trim()
        var length = this.getBaseUrlLength(url)
        url = length <= 0 ? '' : url.substring(0, length)
        return url == '' ? URL_BASE : url
      },
      //获取基地址长度，以://后的第一个/分割baseUrl和method
      getBaseUrlLength: function (url_) {
        var url = StringUtil.trim(url_)
        var index = url.indexOf(' ')
        if (index >= 0) {
          return index + 1
        }

        index = url.lastIndexOf('/')
        return index < 0 ? 0 : index + 1
      },
      //获取操作方法
      getMethod: function (url) {
        url = url || new String(vUrl.value).trim()
        var index = url.lastIndexOf('/')
        url = index <= 0 ? url : url.substring(index + 1)
        return StringUtil.trim(url.startsWith('/') ? url.substring(1) : url)
      },
      //获取操作方法
      getClass: function (url) {
        url = url || this.getUrl()
        var index = url.lastIndexOf('/')
        if (index <= 0) {
          throw new Error('必须要有类名！完整的 URL 必须符合格式 package/Class/method ！')
        }
        url = url.substring(0, index)
        index = url.lastIndexOf('/')
        var clazz = StringUtil.trim(index < 0 ? url : url.substring(index + 1))
        if (App.language == 'Java' || App.language == 'JavaScript' || App.language == 'TypeScript') {
          if (/[A-Z]{0}[A-Za-z0-9_]/.test(clazz) != true) {
            alert('类名 ' + clazz + ' 不符合规范！')
          }
        }
        return clazz
      },
      //获取操作方法
      getPackage: function (url) {
        url = url || this.getUrl()
        var index = url.lastIndexOf('/')
        if (index <= 0) {
          throw new Error('必须要有类名！完整的 URL 必须符合格式 package/Class/method ！')
        }
        url = url.substring(0, index)
        index = url.lastIndexOf('/')
        return StringUtil.trim(index < 0 ? '' : url.substring(0, index))
      },
      //获取请求的tag
      getTag: function () {
        var req = null;
        try {
          req = this.getRequest(vInput.value);
        } catch (e) {
          log('main.getTag', 'try { req = this.getRequest(vInput.value); \n } catch (e) {\n' + e.message)
        }
        return req == null ? null : req.tag
      },

      getRequest: function (json, defaultValue) {
        var s = App.toDoubleJSON(json, defaultValue);
        if (StringUtil.isEmpty(s, true)) {
          return defaultValue
        }
        try {
          return jsonlint.parse(s);
        }
        catch (e) {
          log('main.getRequest', 'try { return jsonlint.parse(s); \n } catch (e) {\n' + e.message)
          log('main.getRequest', 'return jsonlint.parse(App.removeComment(s));')
          return jsonlint.parse(App.removeComment(s));
        }
      },
      getHeader: function (text) {
        var header = {}
        var hs = StringUtil.isEmpty(text, true) ? null : StringUtil.split(text, '\n')

        if (hs != null && hs.length > 0) {
          var item
          for (var i = 0; i < hs.length; i++) {
            item = hs[i]
            var index = item.indexOf('//') //这里只支持单行注释，不用 removeComment 那种带多行的去注释方式
            var item2 = index < 0 ? item : item.substring(0, index)
            item2 = item2.trim()
            if (item2.length <= 0) {
              continue;
            }

            index = item2.indexOf(':')
            if (index <= 0) {
              throw new Error('请求头 Request Header 输入错误！请按照每行 key:value 的格式输入，不要有多余的换行或空格！'
                + '\n错误位置: 第 ' + (i + 1) + ' 行'
                + '\n错误文本: ' + item)
            }
            header[StringUtil.trim(item2.substring(0, index))] = item2.substring(index + 1, item2.length)
          }
        }

        return header
      },

      // 显示保存弹窗
      showSave: function (show) {
        if (show) {
          if (App.isTestCaseShow) {
            alert('请先输入请求内容！')
            return
          }

          var tag = App.getTag()
          App.history.name = App.getMethod() + (StringUtil.isEmpty(tag, true) ? '' : ' ' + tag) + ' ' + App.formatTime() //不自定义名称的都是临时的，不需要时间太详细
        }
        App.isSaveShow = show
      },

      // 显示导出弹窗
      showExport: function (show, isRemote, isRandom) {
        if (show) {
          if (isRemote) { //共享测试用例
            App.isExportRandom = isRandom
            if (App.isTestCaseShow) {
              alert('请先输入请求内容！')
              return
            }
            if (App.view != 'code') {
              alert('请先测试请求，确保是正确可用的！')
              return
            }
            if (isRandom) {
              App.exTxt.name = '随机配置 ' + App.formatDateTime()
            }
            else {
              var tag = App.getTag()
              App.exTxt.name = App.getMethod() + (StringUtil.isEmpty(tag, true) ? '' : ' ' + tag)
            }
          }
          else { //下载到本地
            if (App.isTestCaseShow) { //文档
              App.exTxt.name = 'APIJSON自动化文档 ' + App.formatDateTime()
            }
            else if (App.view == 'markdown' || App.view == 'output') {
              var suffix
              switch (App.language) {
                case 'Java':
                  suffix = '.java';
                  break;
                case 'Swift':
                  suffix = '.swift';
                  break;
                case 'Kotlin':
                  suffix = '.kt';
                  break;
                case 'Objective-C':
                  suffix = '.h';
                  break;
                case 'C#':
                  suffix = '.cs';
                  break;
                case 'PHP':
                  suffix = '.php';
                  break;
                case 'Go':
                  suffix = '.go';
                  break;
                //以下都不需要解析，直接用左侧的 JSON
                case 'JavaScript':
                  suffix = '.js';
                  break;
                case 'TypeScript':
                  suffix = '.ts';
                  break;
                case 'Python':
                  suffix = '.py';
                  break;
                default:
                  suffix = '.java';
                  break;
              }

              App.exTxt.name = 'User' + suffix
              alert('自动生成模型代码，可填类名后缀:\n'
                + 'Java.java, Kotlin.kt, Swift.swift, Objective-C.h, Objective-C.m,'
                + '\nTypeScript.ts, JavaScript.js, C#.cs, PHP.php, Python.py, Go.go');
            }
            else {
              App.exTxt.name = 'APIJSON测试 ' + App.getMethod() + ' ' + App.formatDateTime()
            }
          }
        }
        App.isExportShow = show
        App.isExportRemote = isRemote
      },

      // 显示配置弹窗
      showConfig: function (show, index) {
        App.isConfigShow = false
        if (index == 3 || index == 4 || index == 5 || index == 10) {
          App.showTestCase(false, false)
        }

        if (show) {
          App.exTxt.button = index == 10 ? '上传' : '切换'
          App.exTxt.index = index
          switch (index) {
            case 0:
            case 1:
            case 2:
            case 6:
            case 7:
            case 8:
            case 10:
              App.exTxt.name = index == 0 ? App.database : (index == 1 ? App.schema : (index == 2
                ? App.language : (index == 6 ? App.server : (index == 8 ? App.project : '/method/list'))))
              App.isConfigShow = true

              if (index == 0) {
                alert('可填数据库:\nMYSQL,POSTGRESQL,SQLSERVER,ORACLE')
              }
              else if (index == 2) {
                alert('自动生成代码，可填语言:\nJava,Kotlin,Swift,Objective-C,\nTypeScript,JavaScript,C#,PHP,Python,Go')
              }
              else if (index == 7) {
                alert('多个类型用 , 隔开，可填类型:\nPARAM(对应GET),FORM(对应POST),JSON(对应POST)')
              }
              else if (index == 10) {
                vInput.value = App.getCache(App.project, 'request4MethodList') || '{'
                  + '\n    "sync": false,  //同步到数据库'
                  + '\n    "package": "' + App.getPackage() + '",  //包名，不填默认全部'
                  + '\n    "class": "' + App.getClass() + '"  //类名，不填默认全部'
                  + '\n}'
                App.onChange(false)
                App.request(false, REQUEST_TYPE_JSON, App.project + App.exTxt.name
                  , App.getRequest(vInput.value), App.getHeader(vHeader.value))
              }
              break
            case 3:
              App.host = App.getBaseUrl()
              App.showUrl(false, new String(vUrl.value).substring(App.host.length)) //没必要导致必须重新获取 Response，App.onChange(false)
              App.remotes = null
              break
            case 4:
              App.isHeaderShow = show
              App.saveCache('', 'isHeaderShow', show)
              break
            case 5:
              App.isRandomShow = show
              App.saveCache('', 'isRandomShow', show)
              break
            case 9:
              App.isDelegateEnabled = show
              App.saveCache('', 'isDelegateEnabled', show)
              break
          }
        }
        else if (index == 3) {
          var host = StringUtil.get(App.host)
          var branch = new String(vUrl.value)
          App.host = ''
          vUrl.value = host + branch //保证 showUrl 里拿到的 baseUrl = App.host (http://apijson.cn:8080/put /balance)
          App.setBaseUrl() //保证自动化测试等拿到的 baseUrl 是最新的
          App.showUrl(false, branch) //没必要导致必须重新获取 Response，App.onChange(false)
          App.remotes = null
        }
        else if (index == 4) {
          App.isHeaderShow = show
          App.saveCache('', 'isHeaderShow', show)
        }
        else if (index == 5) {
          App.isRandomShow = show
          App.saveCache('', 'isRandomShow', show)
        }
        else if (index == 9) {
          App.isDelegateEnabled = show
          App.saveCache('', 'isDelegateEnabled', show)
        }
      },

      // 显示删除弹窗
      showDelete: function (show, item, index, isRandom) {
        this.isDeleteShow = show
        this.isDeleteRandom = isRandom
        this.exTxt.name = '请输入' + (isRandom ? '随机配置' : '接口') + '名来确认'
        if (isRandom) {
          this.currentRandomItem = Object.assign(item, {
            index: index
          })
        }
        else {
          this.currentDocItem = Object.assign(item, {
            index: index
          })
        }
      },

      // 删除接口文档
      deleteDoc: function () {
        var isDeleteRandom = this.isDeleteRandom
        var item = (isDeleteRandom ? this.currentRandomItem : this.currentDocItem) || {}
        var doc = (isDeleteRandom ? item.Random : item.Method) || {}

        var type = isDeleteRandom ? '随机配置' : '方法'
        if (doc.id == null) {
          alert('未选择' + type + '或' + type + '不存在！')
          return
        }
        var nameKey = isDeleteRandom ? 'name' : 'method'
        if (doc[nameKey] != this.exTxt.name) {
          alert('输入的' + type + '名和要删除的' + type + '名不匹配！')
          return
        }

        this.showDelete(false, {})

        this.isTestCaseShow = false
        this.isRandomListShow = false

        var url = this.server + '/delete'
        var req = isDeleteRandom ? {
          format: false,
          'Random': {
            'id': doc.id
          },
          'tag': 'Random'
        } : {
          format: false,
          'Method': {
            'id': doc.id
          },
          'tag': 'Method'
        }
        this.request(true, REQUEST_TYPE_JSON, url, req, {}, function (url, res, err) {
          App.onResponse(url, res, err)

          var rpObj = res.data || {}

          if (isDeleteRandom) {
            if (rpObj.Random != null && rpObj.Random.code == CODE_SUCCESS) {
              if (((item.Random || {}).toId || 0) <= 0) {
                App.randoms.splice(item.index, 1)
              }
              else {
                App.randomSubs.splice(item.index, 1)
              }
              // App.showRandomList(true, App.currentRemoteItem)
            }
          } else {
            if (rpObj.Method != null && rpObj.Method.code == CODE_SUCCESS) {
              App.remotes.splice(item.index, 1)
              App.showTestCase(true, App.isLocalShow)
            }
          }
        })
      },

      // 保存当前的JSON
      save: function () {
        if (App.history.name.trim() === '') {
          Helper.alert('名称不能为空！', 'danger')
          return
        }
        var val = {
          name: App.history.name,
          detail: App.history.name,
          type: App.type,
          package: this.getPackage(),
          class: this.getClass(),
          method: this.getMethod(),
          request: inputted,
          header: vHeader.value,
          random: vRandom.value
        }
        var key = String(Date.now())
        localforage.setItem(key, val, function (err, value) {
          Helper.alert('保存成功！', 'success')
          App.showSave(false)
          val.key = key
          App.historys.push(val)
        })
      },

      // 清空本地历史
      clearLocal: function () {
        this.locals.splice(0, this.locals.length) //UI无反应 this.locals = []
        this.saveCache('', 'locals', [])
      },

      // 删除已保存的
      remove: function (item, index, isRemote, isRandom) {
        if (isRemote == null || isRemote == false) { //null != false
          localforage.removeItem(item.key, function () {
            App.historys.splice(index, 1)
          })
        } else {
          if (this.isLocalShow) {
            this.locals.splice(index, 1)
            return
          }

          if (isRandom && (((item || {}).Random || {}).id || 0) <= 0) {
            this.randomSubs.splice(index, 1)
            return
          }

          this.showDelete(true, item, index, isRandom)
        }
      },

      // 根据随机测试用例恢复数据
      restoreRandom: function (item) {
        this.currentRandomItem = item
        this.isRandomListShow = false
        this.isRandomSubListShow = false
        var random = (item || {}).Random || {}
        this.randomTestTitle = random.name
        this.testRandomCount = random.count
        vRandom.value = StringUtil.get(random.config)
      },
      // 根据测试用例/历史记录恢复数据
      restoreRemoteAndTest: function (item) {
        this.restoreRemote(item, true)
      },
      // 根据测试用例/历史记录恢复数据
      restoreRemote: function (item, test) {
        this.currentRemoteItem = item
        this.restore((item || {}).Method, true, test)
      },
      // 根据历史恢复数据
      restore: function (item, isRemote, test) {
        item = item || {}
        localforage.getItem(item.key || '', function (err, value) {

          App.type = item.type;
          App.urlComment =  ': ' + item.type + CodeUtil.getComment(StringUtil.get(item.detail), false, '  ');
          App.requestVersion = item.version;

          var host = StringUtil.get(App.host)
          var url = item.package + '/' + item.class + '/' + item.method
          if (url.startsWith(host.trim())) {
            var branch = url.substring(host.endsWith(' ') ? host.length - 1 : host.length)
            vUrl.value = branch
          }
          else {
            App.host = ''
            vUrl.value = url
          }
          vUrlComment.value = isSingle || StringUtil.isEmpty(App.urlComment, true)
            ? '' : vUrl.value + App.urlComment;


          App.showTestCase(false, App.isLocalShow)
          vInput.value = StringUtil.get(item.request)
          vHeader.value = StringUtil.get(item.header)
          vRandom.value = StringUtil.get(item.random)
          App.onChange(false)

          if (isRemote) {
            App.randoms = []
            App.showRandomList(App.isRandomListShow, item)
          }
          if (test) {
            App.send()
          }
        })
      },

      // 获取所有保存的json
      listHistory: function () {
        localforage.iterate(function (value, key, iterationNumber) {
          if (key[0] !== '#') {
            value.key = key
            App.historys.push(value)
          }
          if (key === '#theme') {
            // 设置默认主题
            App.checkedTheme = value
          }
        })
      },

      // 导出文本
      exportTxt: function () {
        App.isExportShow = false

        if (App.isExportRemote == false) { //下载到本地

          if (App.isTestCaseShow) { //文档
            saveTextAs('# ' + App.exTxt.name + '\n主页: https://github.com/TommyLemon/APIJSON'
              + '\n\nBASE_URL: ' + this.getBaseUrl()
              + '\n\n\n## 测试用例(Markdown格式，可用工具预览) \n\n' + App.getDoc4TestCase()
              + '\n\n\n\n\n\n\n\n## 文档(Markdown格式，可用工具预览) \n\n' + doc
              , App.exTxt.name + '.txt')
          }
          else if (App.view == 'markdown' || App.view == 'output') { //model
            var clazz = StringUtil.trim(App.exTxt.name)

            var txt = '' //配合下面 +=，实现注释判断，一次全生成，方便测试
            if (clazz.endsWith('.java')) {
              txt += CodeUtil.parseJavaBean(docObj, clazz.substring(0, clazz.length - 5), App.database)
            }
            else if (clazz.endsWith('.swift')) {
              txt += CodeUtil.parseSwiftStruct(docObj, clazz.substring(0, clazz.length - 6), App.database)
            }
            else if (clazz.endsWith('.kt')) {
              txt += CodeUtil.parseKotlinDataClass(docObj, clazz.substring(0, clazz.length - 3), App.database)
            }
            else if  (clazz.endsWith('.h')) {
              txt += CodeUtil.parseObjectiveCEntityH(docObj, clazz.substring(0, clazz.length - 2), App.database)
            }
            else if  (clazz.endsWith('.m')) {
              txt += CodeUtil.parseObjectiveCEntityM(docObj, clazz.substring(0, clazz.length - 2), App.database)
            }
            else if  (clazz.endsWith('.cs')) {
              txt += CodeUtil.parseCSharpEntity(docObj, clazz.substring(0, clazz.length - 3), App.database)
            }
            else if  (clazz.endsWith('.php')) {
              txt += CodeUtil.parsePHPEntity(docObj, clazz.substring(0, clazz.length - 4), App.database)
            }
            else if  (clazz.endsWith('.go')) {
              txt += CodeUtil.parseGoEntity(docObj, clazz.substring(0, clazz.length - 3), App.database)
            }
            else if  (clazz.endsWith('.js')) {
              txt += CodeUtil.parseJavaScriptEntity(docObj, clazz.substring(0, clazz.length - 3), App.database)
            }
            else if  (clazz.endsWith('.ts')) {
              txt += CodeUtil.parseTypeScriptEntity(docObj, clazz.substring(0, clazz.length - 3), App.database)
            }
            else if (clazz.endsWith('.py')) {
              txt += CodeUtil.parsePythonEntity(docObj, clazz.substring(0, clazz.length - 3), App.database)
            }
            else {
              alert('请正确输入对应语言的类名后缀！')
            }

            if (StringUtil.isEmpty(txt, true)) {
              alert('找不到 ' + clazz + ' 对应的表！请检查数据库中是否存在！\n如果不存在，请重新输入存在的表；\n如果存在，请刷新网页后重试。')
              return
            }
            saveTextAs(txt, clazz)
          }
          else {
            var res = JSON.parse(App.jsoncon)
            res = this.removeDebugInfo(res)

            var s = ''
            switch (App.language) {
              case 'Java':
                s += '(Java):\n\n' + CodeUtil.parseJavaResponse('', res, 0, false, ! isSingle)
                break;
              case 'Swift':
                s += '(Swift):\n\n' + CodeUtil.parseSwiftResponse('', res, 0, isSingle)
                break;
              case 'Kotlin':
                s += '(Kotlin):\n\n' + CodeUtil.parseKotlinResponse('', res, 0, false, ! isSingle)
                break;
              case 'Objective-C':
                s += '(Objective-C):\n\n' + CodeUtil.parseObjectiveCResponse('', res, 0)
                break;
              case 'C#':
                s += '(C#):\n\n' + CodeUtil.parseCSharpResponse('', res, 0)
                break;
              case 'PHP':
                s += '(PHP):\n\n' + CodeUtil.parsePHPResponse('', res, 0, isSingle)
                break;
              case 'Go':
                s += '(Go):\n\n' + CodeUtil.parseGoResponse('', res, 0)
                break;
              case 'JavaScript':
                s += '(JavaScript):\n\n' + CodeUtil.parseJavaScriptResponse('', res, 0, isSingle)
                break;
              case 'TypeScript':
                s += '(TypeScript):\n\n' + CodeUtil.parseTypeScriptResponse('', res, 0, isSingle)
                break;
              case 'Python':
                s += '(Python):\n\n' + CodeUtil.parsePythonResponse('', res, 0, isSingle)
                break;
              default:
                s += ':\n没有生成代码，可能生成代码(封装,解析)的语言配置错误。 \n';
                break;
            }

            saveTextAs('# ' + App.exTxt.name + '\n主页: https://github.com/TommyLemon/APIJSON'
              + '\n\n\nURL: ' + StringUtil.get(vUrl.value)
              + '\n\n\nHeader:\n' + StringUtil.get(vHeader.value)
              + '\n\n\nRequest:\n' + StringUtil.get(vInput.value)
              + '\n\n\nResponse:\n' + StringUtil.get(App.jsoncon)
              + '\n\n\n## 解析 Response 的代码' + s
              , App.exTxt.name + '.txt')
          }
        }
        else { //上传到远程服务器
          var id = App.User == null ? null : App.User.id
          if (id == null || id <= 0) {
            alert('请先登录！')
            return
          }
          var isExportRandom = App.isExportRandom
          var did = ((App.currentRemoteItem || {}).Method || {}).id
          if (isExportRandom && did == null) {
            alert('请先共享测试用例！')
            return
          }

          App.isTestCaseShow = false;

          var currentAccount = App.accounts[App.currentAccountIndex];
          var currentResponse = StringUtil.isEmpty(App.jsoncon, true) ? {} : App.removeDebugInfo(JSON.parse(App.jsoncon));

          var code = currentResponse.code;
          var thrw = currentResponse.throw;
          delete currentResponse.code; //code必须一致
          delete currentResponse.throw; //throw必须一致

          var isML = App.isMLEnabled;
          var stddObj = isML ? JSONResponse.updateStandard({}, currentResponse) : {};
          stddObj.code = code;
          stddObj.throw = thrw;
          currentResponse.code = code;
          currentResponse.throw = thrw;

          var url = App.server + '/post'
          var req = isExportRandom ? {
            format: false,
            'Random': {
              toId: 0,
              documentId: did,
              count: App.requestCount,
              name: App.exTxt.name,
              config: vRandom.value
            },
            'TestRecord': {
              'userId': App.User.id,
              'response': JSON.stringify(currentResponse),
              'standard': isML ? JSON.stringify(stddObj) : null
            },
            'tag': 'Random'
          } : {
            format: false,
            'Method': {
              'userId': App.User.id,
              'testAccountId': currentAccount.isLoggedIn ? currentAccount.id : null,
              'method': App.getMethod(),
              'detail': App.exTxt.name,
              'type': (currentResponse.type || App.type) || null,
              'genericType': (currentResponse.type || App.type) || null,
              'class': App.getClass(),
              'package': App.getPackage(),
              'request': App.toDoubleJSON(inputted)
            },
            'TestRecord': {
              'randomId': 0,
              'userId': App.User.id,
              'response': JSON.stringify(currentResponse),
              'standard': isML ? JSON.stringify(stddObj) : null
            },
            'tag': 'Method'
          }

          App.request(true, REQUEST_TYPE_JSON, url, req, {}, function (url, res, err) {
            App.onResponse(url, res, err)

            var rpObj = res.data || {}

            if (isExportRandom) {
              if (rpObj.Random != null && rpObj.Random.code == CODE_SUCCESS) {
                App.randoms = []
                App.showRandomList(true, (App.currentRemoteItem || {}).Method)
              }
            }
            else {
              if (rpObj.Method != null && rpObj.Method.code == CODE_SUCCESS) {
                App.remotes = []
                App.showTestCase(true, false)
              }
            }
          })
        }
      },

      // 保存配置
      saveConfig: function () {
        App.isConfigShow = App.exTxt.index == 10

        switch (App.exTxt.index) {
          case 0:
            App.database = App.exTxt.name
            App.saveCache('', 'database', App.database)

            doc = null
            var item = App.accounts[App.currentAccountIndex]
            item.isLoggedIn = false
            App.onClickAccount(App.currentAccountIndex, item)
            break
          case 1:
            App.schema = App.exTxt.name
            App.saveCache('', 'schema', App.schema)

            doc = null
            var item = App.accounts[App.currentAccountIndex]
            item.isLoggedIn = false
            App.onClickAccount(App.currentAccountIndex, item)
            break
          case 2:
            App.language = App.exTxt.name
            App.saveCache('', 'language', App.language)

            doc = null
            App.onChange(false)
            break
          case 6:
            App.server = App.exTxt.name
            App.saveCache('', 'server', App.server)
            App.logout(true)
            break
          case 7:
            App.types = StringUtil.split(App.exTxt.name)
            App.saveCache('', 'types', App.types)
            break
          case 8:
            App.project = App.exTxt.name
            App.saveCache('', 'project', App.project)

            var c = App.currentAccountIndex == null ? -1 : App.currentAccountIndex
            var item = App.accounts == null ? null : App.accounts[c]
            if (item != null) {
              item.isLoggedIn = ! item.isLoggedIn
              App.onClickAccount(c, item)
            }
            break
          case 10:
            App.saveCache(App.project, 'request4MethodList', vInput.value)
            App.request(false, REQUEST_TYPE_JSON, App.project + App.exTxt.name, App.getRequest(vInput.value), App.getHeader(vHeader.value), function (url, res, err) {
              if (App.isSyncing) {
                alert('正在同步，请等待完成')
                return
              }
              App.isSyncing = true
              App.onResponse(url, res, err)

              var classList = (res.data || {}).classList
              if (classList == null) { // || apis.length <= 0) {
                alert('没有查到 Project 文档！请开启跨域代理，并检查 URL 是否正确！')
                return
              }

              App.uploadTotal = 0
              App.uploadDoneCount = 0
              App.uploadFailCount = 0

              for (var i in classList) {
                try {
                  App.sync2DB(classList[i])
                } catch (e) {
                  App.uploadFailCount ++
                  App.exTxt.button = 'All:' + App.uploadTotal + '\nDone:' + App.uploadDoneCount + '\nFail:' + App.uploadFailCount
                }
              }

            })
            break
        }
      },

      /**同步到数据库
       * @param classItem
       * @param callback
       */
      sync2DB: function(classItem) {
        if (classItem == null) {
          App.log('postApi', 'classItem == null  >> return')
          return
        }

        var methodList = classItem.methodList || []
        App.uploadTotal += methodList.length
        App.exTxt.button = 'All:' + App.uploadTotal + '\nDone:' + App.uploadDoneCount + '\nFail:' + App.uploadFailCount

        var currentAccount = App.accounts[App.currentAccountIndex]
        var classArgs = App.getArgs4Sync(classItem.parameterTypeList)

        var methodItem
        for (var k = 0; k < methodList.length; k++) {
          methodItem = methodList[k]
          if (methodItem == null || methodItem.name == null) {
            App.uploadFailCount ++
            App.exTxt.button = 'All:' + App.uploadTotal + '\nDone:' + App.uploadDoneCount + '\nFail:' + App.uploadFailCount
            continue
          }

          App.request(true, REQUEST_TYPE_JSON, App.server + '/post', {
            format: false,
            'Method': {
              'userId': App.User.id,
              'testAccountId': currentAccount.isLoggedIn ? currentAccount.id : null,
              'package': classItem.package == null ? null : classItem.package.replace(/[.]/g, '/'),
              'class': classItem.name,
              'method': methodItem.name,
              'classArgs': classArgs,
              'genericClassArgs': App.getArgs4Sync(classItem.genericParameterTypeList),
              'methodArgs': App.getArgs4Sync(methodItem.parameterTypeList),
              'genericMethodArgs': App.getArgs4Sync(methodItem.genericParameterTypeList),
              'type': methodItem.returnType == null ? null : methodItem.returnType.replace(/[.]/g, '/'),
              'genericType': methodItem.genericReturnType == null ? null : methodItem.genericReturnType.replace(/[.]/g, '/'),
              'static': methodItem.static ? 1 : 0,
              'exceptions': methodItem.exceptionTypeList == null ? null : methodItem.exceptionTypeList.replace(/[.]/g, '/').join(),
              'genericExceptions': methodItem.genericExceptionTypeList == null ? null : methodItem.genericExceptionTypeList.replace(/[.]/g, '/').join(),
              'detail': methodItem.name
            },
            'TestRecord': {
              'documentId@': '/Method/id',
              'randomId': 0,
              'userId': App.User.id,
              'response': ''
            },
            'tag': 'Method'
          }, {}, function (url, res, err) {
            App.onResponse(url, res, err)
            if (res.data != null && res.data.Method != null && res.data.Method.code == CODE_SUCCESS) {
              App.uploadDoneCount ++
            } else {
              App.uploadFailCount ++
            }

            App.exTxt.button = 'All:' + App.uploadTotal + '\nDone:' + App.uploadDoneCount + '\nFail:' + App.uploadFailCount
            if (App.uploadDoneCount + App.uploadFailCount >= App.uploadTotal) {
              alert('导入完成')
              App.isSyncing = false
              App.showTestCase(false, false)
              App.remotes = []
              var branch = vUrl.value
              vUrl.value = StringUtil.get(App.host) + branch
              App.host = ''
              App.showUrl(false, branch)
              App.showTestCase(true, false)
            }

          })
        }

      },

      getArgs4Sync: function (typeList) {
        if (typeList == null) {
          return null
        }


        var args = []
        for (var l = 0; l < typeList.length; l++) {

          var type = typeList[l] == null ? null : typeList[l].replace(/[.]/g, '/')
          var value = App.mockValue4Type(type);

          args.push({
            type: type,
            value: value
          })
        }
        return args
      },

      mockValue4Type: function (type) {
        type = StringUtil.trim(type)
        if (type == '') {
          return
        }

        switch (type) {
          case 'Boolean':
          case 'boolean':
            return randomInt(0, 1) == 1
          case 'Number':
          case 'Double':
          case 'Float':
          case 'double':
          case 'float':
            return randomNum(-100, 200, randomInt(0, 2))
          case 'Long':
          case 'long':
            return randomInt(-100, 200)
          case 'Integer':
          case 'int':
            return randomInt(-10, 20)
          case 'String':
          case 'CharSequence':
            return randomStr(0, 5)
        }

        var ct = ''
        if (type.endsWith('[]')) {
          return null //除了 null，其它任何类型的值都不行 argument type mismatch   ct = type.substring(0, type.length - 2)
        }
        else {
          var index = type.indexOf('<')
          if (index >= 0) {
            type = type.substring(0, index).trim();
            ct = type.substring(index + 1, type.lastIndexOf('>')).trim()
          }
        }

        if (type.endsWith('[]') || type.endsWith('List') || type.endsWith('Array') || type.endsWith('Set') || type.endsWith('Collection')) {
          var size = randomInt(0, 10)
          var arr = []
          for (var i = 0; i < size; i ++) {
            var v = App.mockValue4Type(ct)
            if (v != null) {
              arr.push(v)
            }
          }
          return arr
        }

        if (type.endsWith('Map') || type.endsWith('Table') || type.endsWith('JSONObject')) {
          var size = randomInt(0, 10)

          var index = ct.indexOf(',')
          var lct = index < 0 ? 'String' : ct.substring(0, index).trim()
          var rct = index < 0 ? ct : ct.substring(index + 1).trim()

          var obj = {}
          for (var i = 0; i < size; i ++) {
            obj[this.mockValue4Type(lct), this.mockValue4Type(rct)]
          }
          return obj
        }

        if (type.endsWith('Decimal')) {
          return this.mockValue4Type('Number')
        }

        return type == 'Object' || type == 'java.lang.Object' ? null : {}
      },

      // 切换主题
      switchTheme: function (index) {
        this.checkedTheme = index
        localforage.setItem('#theme', index)
      },


      // APIJSON <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

      //格式化日期
      formatDate: function (date) {
        if (date == null) {
          date = new Date()
        }
        return date.getFullYear() + '-' + App.fillZero(date.getMonth() + 1) + '-' + App.fillZero(date.getDate())
      },
      //格式化时间
      formatTime: function (date) {
        if (date == null) {
          date = new Date()
        }
        return App.fillZero(date.getHours()) + ':' + App.fillZero(date.getMinutes())
      },
      formatDateTime: function (date) {
        if (date == null) {
          date = new Date()
        }
        return App.formatDate(date) + ' ' + App.formatTime(date)
      },
      //填充0
      fillZero: function (num, n) {
        if (num == null) {
          num = 0
        }
        if (n == null || n <= 0) {
          n = 2
        }
        var len = num.toString().length;
        while(len < n) {
          num = "0" + num;
          len++;
        }
        return num;
      },






      onClickAccount: function (index, item, callback) {
        if (this.currentAccountIndex == index) {
          if (item == null) {
            if (callback != null) {
              callback(false)
            }
          }
          else {
            this.setRememberLogin(item.remember)
            vAccount.value = item.phone
            vPassword.value = item.password

            if (item.isLoggedIn) {
              //logout FIXME 没法自定义退出，浏览器默认根据url来管理session的
              this.logout(false, function (url, res, err) {
                App.onResponse(url, res, err)

                item.isLoggedIn = false
                App.saveCache(App.getBaseUrl(), 'currentAccountIndex', App.currentAccountIndex)
                App.saveCache(App.getBaseUrl(), 'accounts', App.accounts)

                if (callback != null) {
                  callback(false)
                }
              });
            }
            else {
              //login
              this.login(false, function (url, res, err) {
                App.onResponse(url, res, err)

                item.isLoggedIn = true

                var data = res.data || {}
                var user = data.code == CODE_SUCCESS ? data.user : null
                if (user == null) {
                  if (callback != null) {
                    callback(false)
                  }
                }
                else {
                  item.name = user.name
                  item.remember = data.remember

                  App.saveCache(App.getBaseUrl(), 'currentAccountIndex', App.currentAccountIndex)
                  App.saveCache(App.getBaseUrl(), 'accounts', App.accounts)

                  if (callback != null) {
                    callback(true)
                  }
                }
              });
            }

          }

          return;
        }

        //退出当前账号
        var c = this.currentAccountIndex
        var it = c == null || this.accounts == null ? null : this.accounts[c];
        if (it != null) { //切换 BASE_URL后 it = undefined 导致UI操作无法继续
          it.isLoggedIn = false  //异步导致账号错位 this.onClickAccount(c, this.accounts[c])
        }

        //切换到这个tab
        this.currentAccountIndex = index

        //目前还没做到同一标签页下测试账号切换后，session也跟着切换，所以干脆每次切换tab就重新登录
        if (item != null) {
          item.isLoggedIn = false
          this.onClickAccount(index, item, callback)
        }
        else {
          if (callback != null) {
            callback(false)
          }
        }
      },

      removeAccountTab: function () {
        if (App.accounts.length <= 1) {
          alert('至少要 1 个测试账号！')
          return
        }

        App.accounts.splice(App.currentAccountIndex, 1)
        if (App.currentAccountIndex >= App.accounts.length) {
          App.currentAccountIndex = App.accounts.length - 1
        }

        App.saveCache(App.getBaseUrl(), 'currentAccountIndex', App.currentAccountIndex)
        App.saveCache(App.getBaseUrl(), 'accounts', App.accounts)
      },
      addAccountTab: function () {
        App.showLogin(true, false)
      },


      //显示远程的测试用例文档
      showTestCase: function (show, isLocal) {
        App.isTestCaseShow = show
        App.isLocalShow = isLocal

        vOutput.value = show ? '' : (output || '')
        App.showDoc()

        if (isLocal) {
          App.testCases = App.locals || []
          return
        }
        App.testCases = App.remotes || []

        if (show) {
          var testCases = App.testCases
          var allCount = testCases == null ? 0 : testCases.length
          if (allCount > 0) {
            var accountIndex = (App.accounts[App.currentAccountIndex] || {}).isLoggedIn ? App.currentAccountIndex : -1
            App.currentAccountIndex = accountIndex  //解决 onTestResponse 用 -1 存进去， handleTest 用 currentAccountIndex 取出来为空

            var tests = App.tests[String(accountIndex)] || {}
            if (tests != null && $.isEmptyObject(tests) != true) {
              for (var i = 0; i < allCount; i++) {
                var item = testCases[i]
                if (item == null) {
                  continue
                }
                var d = item.Method || {}
                App.compareResponse(allCount, testCases, i, item, (tests[d.id] || {})[0], false, accountIndex, true)
              }
            }
            return;
          }
          App.isTestCaseShow = false

          var host = StringUtil.get(App.host);
          var pkg = App.getPackage()

          var packagePrefix = ''
          var classPrefix = ''
          if (host.length > pkg.length) {
            packagePrefix = pkg
            classPrefix = host.substring(pkg.length)
            var index = classPrefix.indexOf('/')
            if (index == 0) {
              classPrefix = classPrefix.substring(1)
              index = classPrefix.indexOf('/')
            }
            if (index >= 0) {
              classPrefix = classPrefix.substring(0, index)
            }
            classPrefix = classPrefix.trim()
          }
          packagePrefix = packagePrefix.trim()

          var req = {
            format: false,
            '[]': {
              'count': 0,
              'Method': {
                '@order': 'date-',
                'userId{}': [0, App.User.id],
                'arguments()': 'getMethodArguments(genericMethodArgs)',
                'defination()': 'getMethodDefination(method,arguments,type,exceptions,null)',
                'request()': 'getMethodRequest()',
                'package$': StringUtil.isEmpty(packagePrefix) ? null : packagePrefix + '%',
                'class$': StringUtil.isEmpty(classPrefix) ? null : classPrefix + '%',
              },
              'TestRecord': {
                'documentId@': '/Method/id',
                'randomId': 0,
                '@order': 'date-',
                '@column': 'id,userId,documentId,response' + (App.isMLEnabled ? ',standard' : ''),
                'userId': App.User.id,
                '@having': App.isMLEnabled ? 'json_length(standard)>0' : null
              }
            },
            '@role': 'LOGIN'
          }

          App.onChange(false)
          App.request(true, REQUEST_TYPE_JSON, App.server + '/get', req, {}, function (url, res, err) {
            App.onResponse(url, res, err)

            var rpObj = res.data

            if (rpObj != null && rpObj.code === CODE_SUCCESS) {
              App.isTestCaseShow = true
              App.isLocalShow = false
              App.testCases = App.remotes = rpObj['[]']
              vOutput.value = show ? '' : (output || '')
              App.showDoc()

              //App.onChange(false)
            }
          })
        }
      },

      //显示远程的随机配置文档
      showRandomList: function (show, item, isSub) {
        this.isRandomEditable = false
        this.isRandomListShow = show && ! isSub
        this.isRandomSubListShow = show && isSub
        if (! isSub) {
          this.randomSubs = []
        }

        vOutput.value = show ? '' : (output || '')
        this.showDoc()

        this.randoms = this.randoms || []

        if (show && this.isRandomShow && this.randoms.length <= 0 && item != null && item.id != null) {
          this.isRandomListShow = false

          var url = App.server + '/get'
          var req = {
            '[]': {
              'count': 0,
              'Random': {
                'toId': 0,
                'documentId': item.id,
                '@order': "date-"
              },
              'TestRecord': {
                'randomId@': '/Random/id',
                '@order': 'date-'
              },
              '[]': {
                'count': 0,
                'Random': {
                  'toId@': '[]/Random/id',
                  'documentId': item.id,
                  '@order': "date-"
                },
                'TestRecord': {
                  'randomId@': '/Random/id',
                  '@order': 'date-'
                }
              }
            }
          }

          this.onChange(false)
          this.request(true, REQUEST_TYPE_JSON, url, req, {}, function (url, res, err) {
            App.onResponse(url, res, err)

            var rpObj = res.data

            if (rpObj != null && rpObj.code === CODE_SUCCESS) {
              App.isRandomListShow = ! isSub
              App.isRandomSubListShow = isSub
              if (isSub) {
                if (App.currentRandomItem == null) {
                  App.currentRandomItem = {}
                }
                App.randomSubs = App.currentRandomItem.subs = App.currentRandomItem['[]'] = rpObj['[]']
              }
              else {
                App.randoms = rpObj['[]']
              }

              vOutput.value = show ? '' : (output || '')
              App.showDoc()

              //App.onChange(false)
            }
          })
        }
      },


      // 设置文档
      showDoc: function () {
        if (this.setDoc(doc) == false) {
          this.getDoc(function (d) {
            App.setDoc(d);
          });
        }
      },


      saveCache: function (url, key, value) {
        var cache = this.getCache(url);
        cache[key] = value
        localStorage.setItem('UnitAuto:' + url, JSON.stringify(cache))
      },
      getCache: function (url, key) {
        var cache = localStorage.getItem('UnitAuto:' + url)
        try {
          cache = JSON.parse(cache)
        } catch(e) {
          App.log('login  App.send >> try { cache = JSON.parse(cache) } catch(e) {\n' + e.message)
        }
        cache = cache || {}
        return key == null ? cache : cache[key]
      },

      /**登录确认
       */
      confirm: function () {
        switch (App.loginType) {
          case 'login':
            App.login(App.isAdminOperation)
            break
          case 'register':
            App.register(App.isAdminOperation)
            break
          case 'forget':
            App.resetPassword(App.isAdminOperation)
            break
        }
      },

      showLogin(show, isAdmin) {
        App.isLoginShow = show
        App.isAdminOperation = isAdmin

        if (show != true) {
          return
        }

        var user = isAdmin ? App.User : null //add account   App.accounts[App.currentAccountIndex]

        // alert("showLogin  isAdmin = " + isAdmin + "; user = \n" + JSON.stringify(user, null, '    '))

        if (user == null) {
          user = {
            phone: 13000082001,
            password: 123456
          }
        }

        this.setRememberLogin(user.remember)
        vAccount.value = user.phone
        vPassword.value = user.password
      },

      setRememberLogin(remember) {
        vRemember.checked = remember || false
      },

      /**登录
       */
      login: function (isAdminOperation, callback) {
        App.isLoginShow = false

        const req = {
          type: 0, // 登录方式，非必须 0-密码 1-验证码
          phone: vAccount.value,
          password: vPassword.value,
          version: 1, // 全局默认版本号，非必须
          remember: vRemember.checked,
          format: false,
          defaults: {
            '@database': App.database,
            '@schema': App.schema
          }
        }

        if (isAdminOperation) {
          App.request(isAdminOperation, REQUEST_TYPE_JSON, App.server + '/login', req, {}, function (url, res, err) {
            if (callback) {
              callback(url, res, err)
              return
            }

            var rpObj = res.data || {}

            if (rpObj.code != CODE_SUCCESS) {
              alert('登录失败，请检查网络后重试。\n' + rpObj.msg + '\n详细信息可在浏览器控制台查看。')
            }
            else {
              var user = rpObj.user || {}

              if (user.id > 0) {
                user.remember = rpObj.remember
                user.phone = req.phone
                user.password = req.password
                App.User = user
              }

              //保存User到缓存
              App.saveCache(App.server, 'User', user)

              if (App.currentAccountIndex == null || App.currentAccountIndex < 0) {
                App.currentAccountIndex = 0
              }
              var item = App.accounts[App.currentAccountIndex]
              item.isLoggedIn = false
              App.onClickAccount(App.currentAccountIndex, item) //自动登录测试账号
            }

          })
        }
        else {
          if (callback == null) {
            var item
            for (var i in App.accounts) {
              item = App.accounts[i]
              if (item != null && req.phone == item.phone) {
                alert(req.phone +  ' 已在测试账号中！')
                // App.currentAccountIndex = i
                item.remember = vRemember.checked
                App.onClickAccount(i, item)
                return
              }
            }
          }

          App.showTestCase(false, App.isLocalShow)
          App.onChange(false)
          App.request(isAdminOperation, REQUEST_TYPE_JSON, App.project + '/login', req, {}, function (url, res, err) {
            if (callback) {
              callback(url, res, err)
              return
            }

            App.onResponse(url, res, err)

            //由login按钮触发，不能通过callback回调来实现以下功能
            var data = res.data || {}
            if (data.code == CODE_SUCCESS) {
              var user = data.user || {}
              App.accounts.push( {
                isLoggedIn: true,
                id: user.id,
                name: user.name,
                phone: req.phone,
                password: req.password,
                remember: data.remember
              })
              App.currentAccountIndex = App.accounts.length - 1

              App.saveCache(App.getBaseUrl(), 'currentAccountIndex', App.currentAccountIndex)
              App.saveCache(App.getBaseUrl(), 'accounts', App.accounts)
            }
          })
        }
      },

      /**注册
       */
      register: function (isAdminOperation) {
        App.showUrl(isAdminOperation, '/register')
        vInput.value = JSON.stringify(
          {
            Privacy: {
              phone: vAccount.value,
              _password: vPassword.value
            },
            User: {
              name: 'APIJSONUser'
            },
            verify: vVerify.value
          },
          null, '    ')
        App.showTestCase(false, false)
        App.onChange(false)
        App.send(isAdminOperation, function (url, res, err) {
          App.onResponse(url, res, err)

          var rpObj = res.data

          if (rpObj != null && rpObj.code === CODE_SUCCESS) {
            alert('注册成功')

            var privacy = rpObj.Privacy || {}

            vAccount.value = privacy.phone
            App.loginType = 'login'
          }
        })
      },

      /**重置密码
       */
      resetPassword: function (isAdminOperation) {
        App.showUrl(isAdminOperation, '/put/password')
        vInput.value = JSON.stringify(
          {
            verify: vVerify.value,
            Privacy: {
              phone: vAccount.value,
              _password: vPassword.value
            }
          },
          null, '    ')
        App.showTestCase(false, App.isLocalShow)
        App.onChange(false)
        App.send(isAdminOperation, function (url, res, err) {
          App.onResponse(url, res, err)

          var rpObj = res.data

          if (rpObj != null && rpObj.code === CODE_SUCCESS) {
            alert('重置密码成功')

            var privacy = rpObj.Privacy || {}

            vAccount.value = privacy.phone
            App.loginType = 'login'
          }
        })
      },

      /**退出
       */
      logout: function (isAdminOperation, callback) {
        var req = {}

        if (isAdminOperation) {
          // alert('logout  isAdminOperation  this.saveCache(App.server, User, {})')
          this.saveCache(App.server, 'User', {})
        }

        // alert('logout  isAdminOperation = ' + isAdminOperation + '; url = ' + url)
        if (isAdminOperation) {
          this.request(isAdminOperation, REQUEST_TYPE_JSON, App.server + '/logout', req, {}, function (url, res, err) {
            if (callback) {
              callback(url, res, err)
              return
            }

            // alert('logout  clear admin ')

            App.clearUser()
            App.onResponse(url, res, err)
            App.showTestCase(false, App.isLocalShow)
          })
        }
        else {
          this.showTestCase(false, App.isLocalShow)
          this.onChange(false)
          this.request(isAdminOperation, REQUEST_TYPE_JSON, App.project + '/logout', req, {}, callback)
        }
      },

      /**获取验证码
       */
      getVerify: function (isAdminOperation) {
        App.showUrl(isAdminOperation, '/post/verify')
        var type = App.loginType == 'login' ? 0 : (App.loginType == 'register' ? 1 : 2)
        vInput.value = JSON.stringify(
          {
            type: type,
            phone: vAccount.value
          },
          null, '    ')
        App.showTestCase(false, App.isLocalShow)
        App.onChange(false)
        App.send(isAdminOperation, function (url, res, err) {
          App.onResponse(url, res, err)

          var data = res.data || {}
          var obj = data.code == CODE_SUCCESS ? data.verify : null
          var verify = obj == null ? null : obj.verify
          if (verify != null) { //FIXME isEmpty校验时居然在verify=null! StringUtil.isEmpty(verify, true) == false) {
            vVerify.value = verify
          }
        })
      },

      /**获取当前用户
       */
      getCurrentUser: function (isAdminOperation, callback) {
        App.showUrl(isAdminOperation, '/gets')
        vInput.value = JSON.stringify(
          {
            Privacy: {
              id: App.User.id
            },
            tag: 'Privacy'
          },
          null, '    ')
        App.showTestCase(false, App.isLocalShow)
        App.onChange(false)
        App.send(isAdminOperation, function (url, res, err) {
          if (callback) {
            callback(url, res, err)
            return
          }

          App.onResponse(url, res, err)
          if (isAdminOperation) {
            var data = res.data || {}
            if (data.code == CODE_SUCCESS && data.Privacy != null) {
              App.Privacy = data.Privacy
            }
          }
        })
      },

      clearUser: function () {
        App.User.id = 0
        App.Privacy = {}
        App.remotes = []
        App.saveCache(App.server, 'User', App.User) //应该用lastBaseUrl,baseUrl应随watch输入变化重新获取
      },

      /**计时回调
       */
      onHandle: function (before) {
        this.isDelayShow = false
        if (inputted != before) {
          clearTimeout(handler);
          return;
        }

        App.view = 'output';
        vComment.value = '';
        vUrlComment.value = '';
        vOutput.value = 'resolving...';

        //格式化输入代码
        try {
          try {
            this.header = this.getHeader(vHeader.value)
          } catch (e2) {
            this.isHeaderShow = true
            vHeader.select()
            throw new Error(e2.message)
          }

          before = App.toDoubleJSON(before);
          log('onHandle  before = \n' + before);

          var afterObj;
          var after;
          try {
            afterObj = jsonlint.parse(before);
            after = JSON.stringify(afterObj, null, "    ");
            before = after;
          }
          catch (e) {
            log('main.onHandle', 'try { return jsonlint.parse(before); \n } catch (e) {\n' + e.message)
            log('main.onHandle', 'return jsonlint.parse(App.removeComment(before));')

            try {
              afterObj = jsonlint.parse(App.removeComment(before));
              after = JSON.stringify(afterObj, null, "    ");
            } catch (e2) {
              throw new Error('请求 JSON 格式错误！请检查并编辑请求！\n\n如果JSON中有注释，请 手动删除 或 点击左边的 \'/" 按钮 来去掉。\n\n' + e2.message)
            }
          }

          //关键词let在IE和Safari上不兼容
          var code = '';
          // try {
          //   code = this.getCode(after); //必须在before还是用 " 时使用，后面用会因为解析 ' 导致失败
          // } catch(e) {
          //   code = '\n\n\n建议:\n使用其它浏览器，例如 谷歌Chrome、火狐FireFox 或者 微软Edge， 因为这样能自动生成请求代码.'
          //     + '\nError:\n' + e.message + '\n\n\n';
          // }

          if (isSingle) {
            if (before.indexOf('"') >= 0) {
              before = before.replace(/"/g, "'");
            }
          }
          else {
            if (before.indexOf("'") >= 0) {
              before = before.replace(/'/g, '"');
            }
          }

          vInput.value = before;
          vSend.disabled = false;
          vOutput.value = output = 'OK，请点击 [运行方法] 按钮来测试。[点击这里查看视频教程](http://i.youku.com/apijson)' + code;


          App.showDoc()

          // try {
          var m = App.getMethod();
          var c = isSingle ? '' : CodeUtil.parseComment(after, docObj == null ? null : docObj['[]'], m, App.database)

          if (isSingle != true && afterObj.tag == null) {
            m = m == null ? 'GET' : m.toUpperCase()
            if (['GETS', 'HEADS', 'POST', 'PUT', 'DELETE'].indexOf(m) >= 0) {
              c += ' ! 非开放请求必须设置 tag ！例如 "tag": "User"'
            }
          }
          vComment.value = c
          vUrlComment.value = isSingle || StringUtil.isEmpty(App.urlComment, true)
            ? '' : vUrl.value + App.urlComment;

          onScrollChanged()
          onURLScrollChanged()
          // } catch (e) {
          //   log('onHandle   try { vComment.value = CodeUtil.parseComment >> } catch (e) {\n' + e.message);
          // }
        } catch(e) {
          log(e)
          vSend.disabled = true

          App.view = 'error'
          App.error = {
            msg: e.message
          }
        }
      },


      /**输入内容改变
       */
      onChange: function (delay) {
        this.setBaseUrl();
        inputted = new String(vInput.value);
        vComment.value = '';
        vUrlComment.value = '';

        clearTimeout(handler);

        this.isDelayShow = delay;

        handler = setTimeout(function () {
          App.onHandle(inputted);
        }, delay ? 2*1000 : 0);
      },

      /**单双引号切换
       */
      transfer: function () {
        isSingle = ! isSingle;

        this.isTestCaseShow = false

        // // 删除注释 <<<<<<<<<<<<<<<<<<<<<
        //
        // var input = this.removeComment(vInput.value);
        // if (vInput.value != input) {
        //   vInput.value = input
        // }
        //
        // // 删除注释 >>>>>>>>>>>>>>>>>>>>>

        this.onChange(false);
      },

      /**获取显示的请求类型名称
       */
      getTypeName: function (type) {
        var ts = this.types
        var t = type || REQUEST_TYPE_JSON
        if (ts == null || ts.indexOf(REQUEST_TYPE_FORM) < 0 || ts.indexOf(REQUEST_TYPE_JSON) < 0) {
          return t == REQUEST_TYPE_PARAM ? 'GET' : 'POST'
        }
        return t
      },
      /**请求类型切换
       */
      changeType: function () {
        var count = this.types == null ? 0 : this.types.length
        if (count > 1) {
          var index = this.types.indexOf(this.type)
          index++;
          this.type = this.types[index % count]
        }

        this.onChange(false);
      },

      /**
       * 删除注释
       */
      removeComment: function (json) {
        var reg = /("([^\\\"]*(\\.)?)*")|('([^\\\']*(\\.)?)*')|(\/{2,}.*?(\r|\n))|(\/\*(\n|.)*?\*\/)/g // 正则表达式
        try {
          return new String(json).replace(reg, function(word) { // 去除注释后的文本
            return /^\/{2,}/.test(word) || /^\/\*/.test(word) ? "" : word;
          })
        } catch (e) {
          log('transfer  delete comment in json >> catch \n' + e.message);
        }
        return json;
      },

      showAndSend: function (branchUrl, req, isAdminOperation, callback) {
        App.showUrl(isAdminOperation, branchUrl)
        vInput.value = JSON.stringify(req, null, '    ')
        App.showTestCase(false, App.isLocalShow)
        App.onChange(false)
        App.send(isAdminOperation, callback)
      },

      /**发送请求
       */
      send: function(isAdminOperation, callback) {
        if (this.isTestCaseShow) {
          alert('请先输入请求内容！')
          return
        }

        if (StringUtil.isEmpty(App.host, true)) {
          // if (StringUtil.get(vUrl.value).startsWith('http://') != true && StringUtil.get(vUrl.value).startsWith('https://') != true) {
          //   alert('URL 缺少 http:// 或 https:// 前缀，可能不完整或不合法，\n可能使用同域的 Host，很可能访问出错！')
          // }
        }
        else {
          if (StringUtil.get(vUrl.value).indexOf('://') >= 0) {
            alert('URL Host 已经隐藏(固定) 为 \n' + App.host + ' \n将会自动在前面补全，导致 URL 不合法访问出错！\n如果要改 Host，右上角设置 > 显示(编辑)URL Host')
          }
        }

        this.onHandle(vInput.value)

        clearTimeout(handler)

        var header
        try {
          header = this.getHeader(vHeader.value)
        } catch (e) {
          // alert(e.message)
          return
        }

        var req = this.getRequest(vInput.value)

        var url = this.getUrl()

        var httpReq = {
          "package": req.package || App.getPackage(url),
          "class": req.class || App.getClass(url),
          "classArgs": req.classArgs,
          "method": req.method || App.getMethod(url),
          "methodArgs": req.methodArgs,
          "static": req.static
        }

        vOutput.value = "requesting... \nURL = " + url
        this.view = 'output';


        this.setBaseUrl()
        this.request(isAdminOperation, REQUEST_TYPE_JSON, this.project + '/method/invoke', httpReq, isAdminOperation ? {} : header, callback)

        this.locals = this.locals || []
        if (this.locals.length >= 1000) { //最多1000条，太多会很卡
          this.locals.splice(999, this.locals.length - 999)
        }
        var method = App.getMethod()
        this.locals.unshift({
          'Method': {
            'userId': App.User.id,
            'name': App.formatDateTime() + (StringUtil.isEmpty(req.tag, true) ? '' : ' ' + req.tag),
            'method': App.getMethod(url),
            'class': App.getClass(url),
            'package': App.getPackage(url),
            'type': App.type,
            'url': '/' + method,
            'request': JSON.stringify(req, null, '    '),
            'header': vHeader.value
          }
        })
        App.saveCache('', 'locals', this.locals)
      },

      //请求
      request: function (isAdminOperation, type, url, req, header, callback) {
        type = type || REQUEST_TYPE_JSON

        // axios.defaults.withcredentials = true
        axios({
          method: (type == REQUEST_TYPE_PARAM ? 'get' : 'post'),
          url: (isAdminOperation == false && this.isDelegateEnabled ? (this.server + '/delegate?$_delegate_url=') : '' ) + StringUtil.noBlank(url),
          params: (type == REQUEST_TYPE_JSON ? null : req),
          data: (type == REQUEST_TYPE_JSON ? req : null),
          headers: header,
          withCredentials: type == REQUEST_TYPE_JSON
        })
          .then(function (res) {
            res = res || {}
            // if ((res.config || {}).method == 'options') {
            //   return
            // }
            log('send >> success:\n' + JSON.stringify(res, null, '    '))

            //未登录，清空缓存
            if (res.data != null && res.data.code == 407) {
              // alert('request res.data != null && res.data.code == 407 >> isAdminOperation = ' + isAdminOperation)
              if (isAdminOperation) {
                // alert('request App.User = {} App.server = ' + App.server)

                App.clearUser()
              }
              else {
                // alert('request App.accounts[App.currentAccountIndex].isLoggedIn = false ')

                if (App.accounts[App.currentAccountIndex] != null) {
                  App.accounts[App.currentAccountIndex].isLoggedIn = false
                }
              }
            }

            if (callback != null) {
              callback(url, res, null)
              return
            }
            App.onResponse(url, res, null)
          })
          .catch(function (err) {
            log('send >> error:\n' + err)
            if (callback != null) {
              callback(url, {}, err)
              return
            }
            App.onResponse(url, {}, err)
          })
      },


      /**请求回调
       */
      onResponse: function (url, res, err) {
        if (res == null) {
          res = {}
        }
        log('onResponse url = ' + url + '\nerr = ' + err + '\nres = \n' + JSON.stringify(res))
        if (err != null) {
          vOutput.value = "Response:\nurl = " + url + "\nerror = " + err.message;
        }
        else {
          var data = res.data || {}
          if (isSingle && data.code == CODE_SUCCESS) { //不格式化错误的结果
            data = JSONResponse.formatObject(data);
          }
          App.jsoncon = JSON.stringify(data, null, '    ');
          App.view = 'code';
          vOutput.value = '';
        }
      },


      /**处理按键事件
       * @param event
       */
      doOnKeyUp: function (event, item, isRandom) {
        var keyCode = event.keyCode ? event.keyCode : (event.which ? event.which : event.charCode);
        if (keyCode == 13) { // enter
          if (! isRandom) {
            this.send(false);
            return
          }

          var r = item == null ? null : item.Random
          if (r == null || r.id == null) {
            alert('请选择有效的选项！item.Random.id == null !')
            return
          }

          //修改 Random 的 count
          this.request(true, REQUEST_TYPE_JSON, this.server + '/put', {
            Random: {
              id: r.id,
              count: r.count,
              name: r.name
            },
            tag: 'Random'
          }, vHeader.value, function (url, res, err) {

            var isOk = (res.data || {}).code == CODE_SUCCESS

            var msg = isOk ? '' : ('\nmsg: ' + StringUtil.get((res.data || {}).msg))
            if (err != null) {
              msg += '\nerr: ' + err.msg
            }
            alert('修改次数' + (isOk ? '成功' :  '失败')
              + '！\nname: ' + r.name + '\ncount: ' + r.count
              + msg
            )

            App.isRandomEditable = ! isOk
          })
        }
        else {
          if (isRandom) {
            this.isRandomEditable = true
            return
          }

          this.urlComment = '';
          this.requestVersion = '';
          this.onChange(true);
        }
      },


      /**转为请求代码
       * @param rq
       */
      getCode: function (rq) {
        var s = '\n\n\n### 请求代码(自动生成) \n';
        switch (App.language) {
          case 'Java':
            s += '\n#### <= Android-Java: 同名变量需要重命名'
              + ' \n ```java \n'
              + StringUtil.trim(CodeUtil.parseJava(null, JSON.parse(rq), 0, isSingle))
              + '\n ``` \n注：' + (isSingle ? '用了 APIJSON 的 JSONRequest 类，也可使用其它类封装，只要 JSON 有序就行\n' : 'LinkedHashMap&lt;&gt;() 可替换为 fastjson 中的 JSONObject(true) 等有序JSON构造方法\n');
            break;
          case 'Swift':
            s += '\n#### <= iOS-Swift: 空对象用 [ : ]'
              + '\n ```swift \n'
              + CodeUtil.parseSwift(null, JSON.parse(rq), 0)
              + '\n ``` \n注：对象 {} 用 ["key": value]，数组 [] 用 [value0, value1]\n';
            break;
          case 'Kotlin':
            s += '\n#### <= Android-Kotlin: 空对象用 HashMap&lt;String, Any&gt;()，空数组用 ArrayList&lt;Any&gt;()\n'
              + '```kotlin \n'
              + CodeUtil.parseKotlin(null, JSON.parse(rq), 0)
              + '\n ``` \n注：对象 {} 用 mapOf("key": value)，数组 [] 用 listOf(value0, value1)\n';
            break;
          case 'Objective-C':
            s += '\n#### <= iOS-Objective-C \n ```objective-c \n'
              + CodeUtil.parseObjectiveC(null, JSON.parse(rq))
              + '\n ```  \n';
            break;
          case 'C#':
            s += '\n#### <= Unity3D-C\#: 键值对用 {"key", value}' +
              '\n ```csharp \n'
              + CodeUtil.parseCSharp(null, JSON.parse(rq), 0)
              + '\n ``` \n注：对象 {} 用 new JObject{{"key", value}}，数组 [] 用 new JArray{value0, value1}\n';
            break;
          case 'PHP':
            s += '\n#### <= Web-PHP: 空对象用 (object) ' + (isSingle ? '[]' : 'array()')
              + ' \n ```php \n'
              + CodeUtil.parsePHP(null, JSON.parse(rq), 0, isSingle)
              + '\n ``` \n注：对象 {} 用 ' + (isSingle ? '[\'key\' => value]' : 'array("key" => value)') + '，数组 [] 用 ' + (isSingle ? '[value0, value1]\n' : 'array(value0, value1)\n');
            break;
          case 'Go':
            s += '\n#### <= Web-Go: 对象 key: value 会被强制排序，每个 key: value 最后都要加逗号 ","'
              + ' \n ```go \n'
              + CodeUtil.parseGo(null, JSON.parse(rq), 0)
              + '\n ``` \n注：对象 {} 用 map[string]interface{} {"key": value}，数组 [] 用 []interface{} {value0, value1}\n';
            break;
          //以下都不需要解析，直接用左侧的 JSON
          case 'JavaScript':
          case 'TypeScript':
          case 'Python':
            break;
          default:
            s += '\n没有生成代码，可能生成代码(封装,解析)的语言配置错误。\n';
            break;
        }
        s += '\n#### <= Web-JavaScript/TypeScript/Python: 和左边的请求 JSON 一样 \n';

        s += '\n\n#### 开放源码 '
          + '\nAPIJSON 接口工具: https://github.com/TommyLemon/UnitAuto '
          + '\nAPIJSON 官方文档: https://github.com/vincentCheng/apijson-doc '
          + '\nAPIJSON 英文文档: https://github.com/ruoranw/APIJSONdocs '
          + '\nAPIJSON 官方网站: https://github.com/APIJSON/apijson.org '
          + '\nAPIJSON -Java版: https://github.com/TommyLemon/APIJSON '
          + '\nAPIJSON - C# 版: https://github.com/liaozb/APIJSON.NET '
          + '\nAPIJSON - PHP版: https://github.com/qq547057827/apijson-php '
          + '\nAPIJSON -Node版: https://github.com/kevinaskin/apijson-node '
          + '\nAPIJSON - Go 版: https://github.com/crazytaxi824/APIJSON '
          + '\nAPIJSON -Python: https://github.com/zhangchunlin/uliweb-apijson '
          + '\n感谢热心的作者们的贡献，GitHub 右上角点 ⭐Star 支持下他们吧 ^_^';

        return s;
      },


      /**显示文档
       * @param d
       **/
      setDoc: function (d) {
        if (d == null) { //解决死循环 || d == '') {
          return false;
        }
        doc = d;
        vOutput.value += (
          '\n\n\n## 包和类文档\n自动查数据库表和字段属性来生成 \n\n' + d
          + '<h3 align="center">简介</h3>'
          + '<p align="center">本站为 UnitAuto-自动化单元测试平台'
          + '<br>提供 方法和文档托管、机器学习自动化测试、自动生成文档 等服务'
          + '<br>由 <a href="https://github.com/TommyLemon/UnitAuto" target="_blank">UnitAuto(前端网页工具)</a>, <a href="https://github.com/APIJSON/APIJSON" target="_blank">APIJSON(后端接口服务)</a> 等提供技术支持'
          + '<br>遵循 <a href="http://www.apache.org/licenses/LICENSE-2.0" target="_blank">Apache-2.0 开源协议</a>'
          + '<br>Copyright &copy; 2016-2019 Tommy Lemon</p>'
        );

        App.view = 'markdown';
        markdownToHTML(vOutput.value);
        return true;
      },


      /**
       * 获取文档
       */
      getDoc: function (callback) {

        App.request(false, REQUEST_TYPE_JSON, this.server + '/get', {
          format: false,
          '@database': App.database,
          '@schema': App.schema,
          '[]': {
            'count': 0,
            'Method': {
              '@column': 'DISTINCT package',
              '@order': 'package+'
            },
            'Method[]': {
              'count': 0,
              'Method:group': {
                'package@': '[]/Method/package',
                '@column': 'DISTINCT class',
                '@order': 'class+',
                '@having': 'length(class)>0'
              },
              'Method': {
                'package@': '[]/Method/package',
                'class@': '/Method:group/class',
                '@column': 'class,genericClassArgs',
                '@order': 'class+',
                'arguments()': "getMethodArguments(genericClassArgs)",
              }
            }
          }
        }, {}, function (url, res, err) {
          if (err != null || res == null || res.data == null) {
            log('getDoc  err != null || res == null || res.data == null >> return;');
            return;
          }

//      log('getDoc  docRq.responseText = \n' + docRq.responseText);
          docObj = res.data;

          //转为文档格式
          var doc = '';
          var item;

          //[] <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
          var list = docObj == null ? null : docObj['[]'];
          if (list != null) {
            log('getDoc  [] = \n' + format(JSON.stringify(list)));

            var table;
            var columnList;
            var column;
            for (var i = 0; i < list.length; i++) {
              item = list[i];

              //Table
              table = item == null ? null : item.Method
              if (table == null) {
                continue;
              }
              log('getDoc [] for i=' + i + ': table = \n' + format(JSON.stringify(table)));

              var pkg = table.package

              doc += '### ' + (i + 1) + '. ' + pkg

              columnList = item['Method[]'];
              if (columnList == null) {
                continue;
              }
              log('getDoc [] for ' + i + ': columnList = \n' + format(JSON.stringify(columnList)));

              var name;
              for (var j = 0; j < columnList.length; j++) {
                column = (columnList[j] || {});
                name = column == null ? null : column.class;
                if (name == null) {
                  continue;
                }

                log('getDoc [] for j=' + j + ': column = \n' + format(JSON.stringify(column)));

                doc += '\n' + (j + 1) + ') ' + name + '(' + StringUtil.get(column.arguments) + ')';

              }

              doc += '\n\n\n';

            }

          }

          //[] >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>


          App.onChange(false);

          callback(doc);

//      log('getDoc  callback(doc); = \n' + doc);
        });

      },

      toDoubleJSON: function (json, defaultValue) {
        if (StringUtil.isEmpty(json)) {
          return defaultValue == null ? '{}' : JSON.stringify(defaultValue)
        }
        else if (json.indexOf("'") >= 0) {
          json = json.replace(/'/g, '"');
        }
        return json;
      },

      /**转为Markdown格式
       * @param s
       * @return {*}
       */
      toMD: function (s) {
        if (s == null) {
          s = '';
        }
        else {
          //无效
          s = s.replace(/\|/g, '\|');
          s = s.replace(/\n/g, ' <br /> ');
        }

        return s;
      },

      /**处理请求结构
       * @param obj
       * @param tag
       * @return {*}
       */
      getStructure: function (obj, tag) {
        if (obj == null) {
          return null;
        }

        log('getStructure  tag = ' + tag + '; obj = \n' + format(JSON.stringify(obj)));

        if (obj instanceof Array) {
          for (var i = 0; i < obj.length; i++) {
            obj[i] = this.getStructure(obj[i]);
          }
        }
        else if (obj instanceof Object) {
          var v;
          var nk;
          for (var k in obj) {
            if (k == null || k == '' || k == 'INSERT' || k == 'REMOVE' || k == 'REPLACE' || k == 'UPDATE') {
              delete obj[k];
              continue;
            }

            v = obj[k];
            if (v == null) {
              delete obj[k];
              continue;
            }

            if (k == 'DISALLOW') {
              nk = '不能传';
            }
            else if (k == 'NECESSARY') {
              nk = '必须传';
            }
            else if (k == 'UNIQUE') {
              nk = '不重复';
            }
            else if (k == 'VERIFY') {
              nk = '满足条件';
            }
            else if (k == 'TYPE') {
              nk = '满足类型';
            }
            else {
              nk = null;
            }

            if (v instanceof Object) {
              v = this.getStructure(v);
            }
            else if (v === '!') {
              v = '非必须传的字段';
            }

            if (nk != null) {
              obj[nk] = v;
              delete obj[k];
            }
          }
        }

        log('getStructure  return obj; = \n' + format(JSON.stringify(obj)));

        if (tag != null) {
          //补全省略的Table
          if (this.isTableKey(tag) && obj[tag] == null) {
            log('getStructure  isTableKey(tag) && obj[tag] == null >>>>> ');
            var realObj = {};
            realObj[tag] = obj;
            obj = realObj;
            log('getStructure  realObj = \n' + JSON.stringify(realObj));
          }
          obj.tag = tag; //补全tag
        }

        return obj;
      },

      /**判断key是否为表名，用CodeUtil里的同名函数会在Safari上报undefined
       * @param key
       * @return
       */
      isTableKey: function (key) {
        log('isTableKey  typeof key = ' + (typeof key));
        if (key == null) {
          return false;
        }
        return /^[A-Z][A-Za-z0-9_]*$/.test(key);
      },

      log: function (msg) {
        // App.log('Main.  ' + msg)
      },

      getDoc4TestCase: function () {
        var list = App.remotes || []
        var doc = ''
        var item
        for (var i = 0; i < list.length; i ++) {
          item = list[i] == null ? null : list[i].Method
          if (item == null || item.method == null) {
            continue
          }
          doc += '\n\n#### ' + item.method  + '    ' + item.defination
          doc += '\n```json\n' + item.request + '\n```\n'
        }
        return doc
      },

      enableCross: function (enable) {
        this.isCrossEnabled = enable
        this.crossProcess = enable ? '交叉账号:已开启' : '交叉账号:已关闭'
        this.saveCache(App.server, 'isCrossEnabled', enable)
      },

      enableML: function (enable) {
        this.isMLEnabled = enable
        this.testProcess = enable ? '机器学习:已开启' : '机器学习:已关闭'
        this.saveCache(App.server, 'isMLEnabled', enable)
        this.remotes = null
        this.showTestCase(true, false)
      },

      /**随机测试，动态替换键值对
       * @param show
       */
      onClickTestRandom: function () {
        this.testRandom(! this.isRandomListShow && ! this.isRandomSubListShow, this.isRandomListShow, this.isRandomSubListShow)
      },
      testRandom: function (show, testList, testSubList, limit) {
        this.isRandomEditable = false
        if (testList != true && testSubList != true) {
          this.testRandomProcess = ''
          this.testRandomWithText(show, null)
        }
        else {
          var baseUrl = StringUtil.trim(this.getBaseUrl())
          if (baseUrl == '') {
            alert('请先输入有效的URL！')
            return
          }
          //开放测试
          // if (baseUrl.indexOf('/apijson.cn') >= 0 || baseUrl.indexOf('/39.108.143.172') >= 0) {
          //   alert('请把URL改成你自己的！\n例如 http://localhost:8080')
          //   return
          // }
          if (baseUrl.indexOf('/apijson.org') >= 0) {
            alert('请把URL改成 http://apijson.cn:8080 或 你自己的！\n例如 http://localhost:8080')
            return
          }

          const list = (testSubList ? this.randomSubs : this.randoms) || []
          var allCount = list.length
          doneCount = 0

          if (allCount <= 0) {
            alert('请先获取随机配置\n点击[查看列表]按钮')
            return
          }
          this.testRandomProcess = '正在测试: ' + 0 + '/' + allCount

          if (testSubList) {
            this.resetCount(this.currentRandomItem)
          }

          var json = this.getRequest(vInput.value) || {}
          var url = this.getUrl()
          var header = this.getHeader(vHeader.value)

          ORDER_MAP = {}  //重置

          for (var i = 0; i < (limit != null ? limit : list.length); i ++) {  //limit限制子项测试个数
            const item = list[i]
            const random = item == null ? null : item.Random
            if (random == null || random.name == null) {
              doneCount ++
              continue
            }
            this.log('test  random = ' + JSON.stringify(random, null, '  '))

            const index = i

            const itemAllCount = random.count || 0
            allCount += (itemAllCount - 1)

            this.testRandomSingle(show, false, itemAllCount > 1 && ! testSubList, item, this.type, url, json, header, function (url, res, err) {

              doneCount ++
              App.testRandomProcess = doneCount >= allCount ? '' : ('正在测试: ' + doneCount + '/' + allCount)
              try {
                App.onResponse(url, res, err)
                App.log('test  App.request >> res.data = ' + JSON.stringify(res.data, null, '  '))
              } catch (e) {
                App.log('test  App.request >> } catch (e) {\n' + e.message)
              }

              App.compareResponse(allCount, list, index, item, res.data, true, App.currentAccountIndex, false, err)
            })
          }
        }
      },
      /**随机测试，动态替换键值对
       * @param show
       * @param callback
       */
      testRandomSingle: function (show, testList, testSubList, item, type, url, json, header, callback) {
        item = item || {}
        var random = item.Random = item.Random || {}
        var subs = item['[]'] || []
        var existCount = subs.length
        subs = existCount <= 0 ? subs : JSON.parse(JSON.stringify(subs))

        var count = random.count || 0

        for (var i = 0; i < count; i ++) {
          // var constConfig = i < existCount ? ((subs[i] || {}).Random || {}).config : this.getRandomConstConfig(random.config, random.id) //第1遍，把 key : expression 改为 key : value
          // var constJson = this.getRandomJSON(JSON.parse(JSON.stringify(json)), constConfig, random.id) //第2遍，用新的 random config 来修改原 json

          var rawConfig = testSubList && i < existCount ? ((subs[i] || {}).Random || {}).config : random.config
          var result = this.parseRandom(
            JSON.parse(JSON.stringify(json)), rawConfig, random.id
            , ! testSubList, testSubList && i >= existCount, testSubList && i >= existCount
          )

          if (testSubList) {  //在原来已上传的基础上，生成新的
            if (i >= existCount) {
              subs.push({
                Random: {
                  id: -i - 1, //表示未上传
                  toId: random.id == null ? 1 : random.id,  // 1 为了没选择测试用例时避免用 toId 判断子项错误
                  userId: random.userId,
                  documentId: random.documentId,
                  count: 1,
                  name: result.name || 'Temp ' + i,
                  config: result.config
                },
                //不再需要，因为子项里前面一部分就是已上传的，而且这样更准确，交互更直观
                // TestRecord: {  //解决子项始终没有对比标准
                //   id: 0, //不允许子项撤回 tr.id, //表示未上传
                //   userId: random.userId,
                //   documentId: random.documentId,
                //   testAccountId: tr.testAccountId,
                //   randomId: -i - 1,
                //   response: tr.response,
                //   standard: tr.standard,
                //   date: tr.date,
                //   compare: tr.compare
                // }
              })
            }
          }
          else {
            var cb = function (url, res, err) {
              if (callback != null) {
                callback(url, res, err, random)
              }
              else {
                App.onResponse(url, res, err)
              }
            };

            var constJson = result.json
            if (show == true) {
              vInput.value = JSON.stringify(constJson, null, '    ');
              this.send(false, cb);
            }
            else {
              var httpReq = {
                "package": constJson.package || App.getPackage(url),
                "class": constJson.class || App.getClass(url),
                "classArgs": constJson.classArgs,
                "method": constJson.method || App.getMethod(url),
                "methodArgs": constJson.methodArgs,
                "static": constJson.static
              }
              this.request(false, REQUEST_TYPE_JSON, this.project + '/method/invoke', httpReq, header, cb);
            }
          }
        }

        if (testSubList) {
          this.randomSubs = subs
          if (this.isRandomListShow == true) {
            this.resetCount(item)
            item.subs = subs
          }
          this.testRandom(false, false, true, count)
        }
      },

      resetCount: function (randomItem) {
        if (randomItem == null) {
          App.log('resetCount  randomItem == null >> return')
          return
        }
        randomItem.totalCount = 0
        randomItem.whiteCount = 0
        randomItem.greenCount = 0
        randomItem.blueCount = 0
        randomItem.orangeCount = 0
        randomItem.redCount = 0
      },

      /**随机测试，动态替换键值对
       * @param show
       * @param callback
       */
      testRandomWithText: function (show, callback) {
        try {
          var count = this.testRandomCount || 0;
          this.isRandomSubListShow = count > 1;
          this.testRandomSingle(show, false, this.isRandomSubListShow, {
              Random: {
                toId: 0, // ((this.currentRandomItem || {}).Random || {}).id || 0,
                userId: (this.User || {}).id,
                count: count,
                name: this.randomTestTitle,
                config: vRandom.value
              }
            },
            this.type, this.getUrl(), this.getRequest(vInput.value), this.getHeader(vHeader.value), callback
          )
        }
        catch (e) {
          log(e)
          vSend.disabled = true

          App.view = 'error'
          App.error = {
            msg: e.message
          }

          this.isRandomShow = true
          vRandom.select()
        }
      },

      /**
       *  与 getRandomJSON 合并，返回一个
       *  {
       *    name: 'long 1, long 2', // 自动按 type0 value0, type1, value1 格式
       *    config: {}, //const config
       *    json: {} //const json
       *  }
       */
      /**随机测试，动态替换键值对
       * @param show
       * @param callback
       */
      parseRandom: function (json, config, randomId, generateJSON, generateConfig, generateName) {
        var lines = config == null ? null : config.trim().split('\n')
        if (lines == null || lines.length <= 0) {
          return null;
        }

        randomId = randomId || 0;
        var randomName = ''
        var constConfig = '' //TODO 改为 [{ "rawPath": "User/id", "replacePath": "User/id@", "replaceValue": "RANDOM_INT(1, 10)", "isExpression": true }] ?

        var json = json || {};

        // alert('< json = ' + JSON.stringify(json, null, '    '))

        var line;

        var path; // User/id
        var key; // id
        var value; // RANDOM_DATABASE

        var index;
        var pathKeys;
        var customizeKey;

        for (var i = 0; i < lines.length; i ++) {
          line = lines[i] || '';

          // remove comment
          index = line.indexOf('//');
          if (index >= 0) {
            line = line.substring(0, index).trim();
          }
          if (line.length <= 0) {
            continue;
          }

          // path User/id  key id@
          index = line.indexOf(' : '); //APIJSON Table:alias 前面不会有空格 //致后面就接 { 'a': 1} 报错 Unexpected token ':'   lastIndexOf(' : '); // indexOf(' : '); 可能会有 Comment:to
          var p_k = line.substring(0, index);
          var bi = p_k.indexOf(' ');
          path = bi < 0 ? p_k : p_k.substring(0, bi);

          pathKeys = path.split('/')
          if (pathKeys == null || pathKeys.length <= 0) {
            throw new Error('随机测试 第 ' + i + ' 行格式错误！字符 ' + path + ' 不符合 JSON 路径的格式 key0/key1/../targetKey !' +
              '\n每个随机变量配置都必须按照 key0/key1/../targetKey replaceKey : value  //注释 的格式！其中 replaceKey 可省略。');
          }

          var lastKeyInPath = pathKeys[pathKeys.length - 1]
          customizeKey = bi > 0;
          key = customizeKey ? p_k.substring(bi + 1) : lastKeyInPath;
          if (key == null || key.trim().length <= 0) {
            throw new Error('随机测试 第 ' + i + ' 行格式错误！字符 ' + key + ' 不是合法的 JSON key!' +
              '\n每个随机变量配置都必须按照 key0/key1/../targetKey replaceKey : value  //注释 的格式！其中 replaceKey 可省略。');
          }

          // value RANDOM_REAL
          value = line.substring(index + ' : '.length);

          if (value == RANDOM_REAL) {
            value = 'randomReal(JSONResponse.getTableName(pathKeys[pathKeys.length - 2]), "' + key + '", 1)';
            if (customizeKey != true) {
              key += '@';
            }
          }
          else if (value == RANDOM_REAL_IN) {
            value = 'randomReal(JSONResponse.getTableName(pathKeys[pathKeys.length - 2]), "' + key + '", null)';
            if (customizeKey != true) {
              key += '{}@';
            }
          }
          else if (value == ORDER_REAL) {
            value = 'orderReal(' +
              getOrderIndex(
                randomId
                , line.substring(0, line.indexOf(' : '))
                , 0
              ) + ', JSONResponse.getTableName(pathKeys[pathKeys.length - 2]), "' + key + '")';
            if (customizeKey != true) {
              key += '@';
            }
          }
          else {
            var start = value.indexOf('(');
            var end = value.lastIndexOf(')');

            //支持 1, "a" 这种原始值
            // if (start < 0 || end <= start) {  //(1) 表示原始值  start*end <= 0 || start >= end) {
            //   throw new Error('随机测试 第 ' + i + ' 行格式错误！字符 ' + value + ' 不是合法的随机函数!');
            // }

            if (start > 0 && end > start) {
              var fun = value.substring(0, start);
              if (fun == RANDOM_INT) {
                value = 'randomInt' + value.substring(start);
              }
              else if (fun == RANDOM_NUM) {
                value = 'randomNum' + value.substring(start);
              }
              else if (fun == RANDOM_STR) {
                value = 'randomStr' + value.substring(start);
              }
              else if (fun == RANDOM_IN) {
                value = 'randomIn' + value.substring(start);
              }
              else if (fun == ORDER_INT || fun == ORDER_IN) {
                value = (fun == ORDER_INT ? 'orderInt' : 'orderIn') + '(' + getOrderIndex(
                    randomId
                    , line.substring(0, line.indexOf(' : '))
                    , fun == ORDER_INT ? 0 : StringUtil.split(value.substring(start + 1, end)).length
                  ) + ',' + value.substring(start + 1);
              }
            }

          }

          try {
            var val = eval(value)

            if (generateConfig) {
              var configVal;
              if (val instanceof Object) {
                configVal = JSON.stringify(val);
              }
              else if (typeof val == 'string') {
                configVal = '"' + val + '"';
              }
              else {
                configVal = val
              }
              constConfig += ((i <= 0 ? '' : ' \n') + p_k + ' : ' + configVal);
            }

            if (generateName) {
              var valStr;
              if (val instanceof Array) {
                valStr = '[' + val.length + ']';
              }
              else if (val instanceof Object) {
                valStr = '{...}';
              }
              else if (typeof val == 'boolean') {
                valStr = '' + val;
              }
              else {
                valStr = new String(val);
                if (valStr.length > 13) {
                  valStr = valStr.substring(0, 5) + '...';
                }
              }
              randomName += ((i <= 0 ? '' : ', ') + valStr);
            }

            if (generateJSON) {
              //先按照单行简单实现
              //替换 JSON 里的键值对 key: value
              var parent = json;
              var current = null;
              for (var j = 0; j < pathKeys.length - 1; j ++) {
                current = parent[pathKeys[j]]
                if (current == null) {
                  current = parent[pathKeys[j]] = {}
                }
                if (parent instanceof Object == false) {
                  throw new Error('随机测试 第 ' + i + ' 行格式错误！路径 ' + path + ' 中' +
                    ' pathKeys[' + j + '] = ' + pathKeys[j] + ' 在实际请求 JSON 内对应的值不是对象 {} !');
                }
                parent = current;
              }

              if (current == null) {
                current = json;
              }
              // alert('< current = ' + JSON.stringify(current, null, '    '))

              if (current.hasOwnProperty(key) == false) {
                delete current[lastKeyInPath];
              }

              current[key] = val;
            }

          }
          catch (e) {
            throw new Error('第 ' + i + ' 行随机配置 key : value 后的 value 不合法！ \nerr: ' + e.message)
          }

          // alert('> current = ' + JSON.stringify(current, null, '    '))
        }

        return {
          name: randomName,
          config: constConfig,
          json: json
        }
      },


      /**回归测试
       * 原理：
       1.遍历所有上传过的测试用例（URL+请求JSON）
       2.逐个发送请求
       3.对比同一用例的先后两次请求结果，如果不一致，就在列表中标记对应的用例(× 蓝黄红色下载(点击下载两个文件) √)。
       4.如果这次请求结果正确，就把请求结果保存到和公司开发环境服务器的APIJSON Server，并取消标记

       compare: 新的请求与上次请求的对比结果
       0-相同，无颜色；
       1-对象新增字段或数组新增值，绿色；
       2-值改变，蓝色；
       3-对象缺少字段/整数变小数，黄色；
       4-code/值类型 改变，红色；
       */
      test: function (isRandom, accountIndex) {
        var accounts = this.accounts || []
        // alert('test  accountIndex = ' + accountIndex)
        var isCrossEnabled = this.isCrossEnabled
        if (accountIndex == null) {
          accountIndex = -1 //isCrossEnabled ? -1 : 0
        }
        if (isCrossEnabled) {
          var isCrossDone = accountIndex >= accounts.length
          this.crossProcess = isCrossDone ? (isCrossEnabled ? '交叉账号:已开启' : '交叉账号:已关闭') : ('交叉账号: ' + (accountIndex + 1) + '/' + accounts.length)
          if (isCrossDone) {
            alert('已完成账号交叉测试: 退出登录状态 和 每个账号登录状态')
            return
          }
        }

        var baseUrl = StringUtil.trim(App.getBaseUrl())
        if (baseUrl == '') {
          alert('请先输入有效的URL！')
          return
        }
        //开放测试
        // if (baseUrl.indexOf('/apijson.cn') >= 0 || baseUrl.indexOf('/39.108.143.172') >= 0) {
        //   alert('请把URL改成你自己的！\n例如 http://localhost:8080')
        //   return
        // }
        if (baseUrl.indexOf('/apijson.org') >= 0) {
          alert('请把URL改成 http://apijson.cn:8080 或 你自己的！\n例如 http://localhost:8080')
          return
        }

        const list = App.remotes || []
        const allCount = list.length
        doneCount = 0

        if (allCount <= 0) {
          alert('请先获取测试用例文档\n点击[查看共享]图标按钮')
          return
        }

        if (isCrossEnabled) {
          if (accountIndex < 0 && accounts[this.currentAccountIndex] != null) {  //退出登录已登录的账号
            accounts[this.currentAccountIndex].isLoggedIn = true
          }
          var index = accountIndex < 0 ? this.currentAccountIndex : accountIndex
          this.onClickAccount(index, accounts[index], function (isLoggedIn) {
            App.showTestCase(true, false)
            App.startTest(list, allCount, isRandom, accountIndex)
          })
        }
        else {
          App.startTest(list, allCount, isRandom, accountIndex)
        }
      },

      startTest: function (list, allCount, isRandom, accountIndex) {
        this.testProcess = '正在测试: ' + 0 + '/' + allCount

        for (var i = 0; i < allCount; i++) {
          const item = list[i]
          const document = item == null ? null : item.Method
          if (document == null || document.method == null) {
            doneCount++
            continue
          }
          App.log('test  document = ' + JSON.stringify(document, null, '  '))

          const index = i

          var header = null
          try {
            header = App.getHeader(document.header)
          } catch (e) {
            App.log('test  for ' + i + ' >> try { header = App.getHeader(document.header) } catch (e) { \n' + e.message)
          }

          var httpReq = null
          if (StringUtil.isEmpty(document.request, true)) {
            httpReq = {
              "package": document.package,
              "class": document.class,
              "classArgs": App.getRequest(document.classArgs, []),
              "method": document.method,
              "methodArgs": App.getRequest(document.methodArgs, []),
              "static": document.static
            }
          }
          else {
            httpReq = App.getRequest(document.request)
            if (httpReq.package == null) {
              httpReq.package = document.package
            }
            if (httpReq.class == null) {
              httpReq.class = document.class
            }
            if (httpReq.method == null) {
              httpReq.method = document.method
            }
            if (httpReq.classArgs == null) {
              httpReq.classArgs = App.getRequest(document.classArgs, [])
            }
            if (httpReq.methodArgs == null) {
              httpReq.methodArgs = App.getRequest(document.methodArgs, [])
            }
          }

          App.request(false, REQUEST_TYPE_JSON, App.project + '/method/invoke', httpReq, header, function (url, res, err) {

            try {
              App.onResponse(url, res, err)
              App.log('test  App.request >> res.data = ' + JSON.stringify(res.data, null, '  '))
            } catch (e) {
              App.log('test  App.request >> } catch (e) {\n' + e.message)
            }

            App.compareResponse(allCount, list, index, item, res.data, isRandom, accountIndex, false, err)
          })
        }
      },

      compareResponse: function (allCount, list, index, item, response, isRandom, accountIndex, justRecoverTest, err) {
        var it = item || {} //请求异步
        var d = (isRandom ? App.currentRemoteItem.Method : it.Method) || {} //请求异步
        var r = isRandom ? it.Random : null //请求异步
        var tr = it.TestRecord || {} //请求异步


        if (err != null) {
          tr.compare = {
            code: JSONResponse.COMPARE_ERROR, //请求出错
            msg: '请求出错！',
            path: err.message + '\n\n'
          }
        }
        else {
          var standardKey = App.isMLEnabled != true ? 'response' : 'standard'
          var standard = StringUtil.isEmpty(tr[standardKey], true) ? null : JSON.parse(tr[standardKey])

          var rsp = JSON.parse(JSON.stringify(App.removeDebugInfo(response) || {}))
          rsp.methodArgs = JSONResponse.array2object(rsp.methodArgs, 'methodArgs', ['methodArgs'], true)

          tr.compare = JSONResponse.compareResponse(standard, rsp, '', App.isMLEnabled, null, ['call()[]']) || {}
        }

        App.onTestResponse(allCount, list, index, it, d, r, tr, response, tr.compare || {}, isRandom, accountIndex, justRecoverTest);
      },

      onTestResponse: function(allCount, list, index, it, d, r, tr, response, cmp, isRandom, accountIndex, justRecoverTest) {
        tr = tr || {}
        tr.compare = cmp;

        it = it || {}
        it.compareType = tr.compare.code;
        it.hintMessage = tr.compare.path + '  ' + tr.compare.msg;
        switch (it.compareType) {
          case JSONResponse.COMPARE_ERROR:
            it.compareColor = 'red'
            it.compareMessage = '请求出错！'
            break;
          case JSONResponse.COMPARE_NO_STANDARD:
            it.compareColor = 'green'
            it.compareMessage = '确认正确后点击[对的，纠正]'
            break;
          case JSONResponse.COMPARE_KEY_MORE:
            it.compareColor = 'green'
            it.compareMessage = '新增字段/新增值'
            break;
          case JSONResponse.COMPARE_VALUE_CHANGE:
            it.compareColor = 'blue'
            it.compareMessage = '值改变'
            break;
          case JSONResponse.COMPARE_KEY_LESS:
            it.compareColor = 'orange'
            it.compareMessage = '缺少字段/整数变小数'
            break;
          case JSONResponse.COMPARE_TYPE_CHANGE:
            it.compareColor = 'red'
            it.compareMessage = 'code/throw/值类型 改变'
            break;
          default:
            it.compareColor = 'white'
            it.compareMessage = '查看结果'
            break;
        }

        if (isRandom) {
          r = r || {}
          it.Random = r

          this.updateToRandomSummary(it, 1)
        }
        else {
          it.Method = d
        }
        it.TestRecord = tr

        Vue.set(list, index, it)

        if (justRecoverTest) {
          return
        }

        doneCount ++
        this.testProcess = doneCount >= allCount ? (this.isMLEnabled ? '机器学习:已开启' : '机器学习:已关闭') : '正在测试: ' + doneCount + '/' + allCount

        this.log('doneCount = ' + doneCount + '; d.name = ' + (isRandom ? r.name : d.name) + '; it.compareType = ' + it.compareType)

        var documentId = isRandom ? r.documentId : d.id
        if (this.tests == null) {
          this.tests = {}
        }
        if (this.tests[String(accountIndex)] == null) {
          this.tests[String(accountIndex)] = {}
        }

        var tests = this.tests[String(accountIndex)] || {}
        var t = tests[documentId]
        if (t == null) {
          t = tests[documentId] = {}
        }
        t[isRandom ? (r.id > 0 ? r.id : (r.toId + '' + r.id)) : 0] = response

        this.tests[String(accountIndex)] = tests
        this.log('tests = ' + JSON.stringify(tests, null, '    '))
        // this.showTestCase(true)

        if (doneCount >= allCount && this.isCrossEnabled && isRandom != true) {
          // alert('onTestResponse  accountIndex = ' + accountIndex)
          this.test(false, accountIndex + 1)
        }
      },

      //更新父级总览数据
      updateToRandomSummary: function (item, change) {
        var random = item == null || change == null ? null : item.Random
        var toId = random == null ? null : random.toId
        if (toId != null && toId > 0) {

          for (var i in App.randoms) {

            var toIt = App.randoms[i]
            if (toIt != null && toIt.Random != null && toIt.Random.id == toId) {

              var toRandom = toIt.Random
              var id = toRandom == null ? 0 : toRandom.id
              var count = id == null || id <= 0 ? 0 : toRandom.count
              if (count != null && count > 1) {
                var key = item.compareColor + 'Count'
                if (toIt[key] == null) {
                  toIt[key] = 0
                }
                toIt[key] += change
                if (toIt[key] < 0) {
                  toIt[key] = 0
                }

                if (toIt.totalCount == null) {
                  toIt.totalCount = 0
                }
                toIt.totalCount += change
                if (toIt.totalCount < 0) {
                  toIt.totalCount = 0
                }
              }

              Vue.set(App.randoms, i, toIt)

              break;
            }

          }
        }
      },

      /**移除调试字段
       * @param obj
       */
      removeDebugInfo: function (obj) {
        if (obj != null) {
          delete obj["trace"]
          delete obj["sql:generate|cache|execute|maxExecute"]
          delete obj["depth:count|max"]
          delete obj["time:start|duration|end"]
        }
        return obj
      },

      /**
       * @param index
       * @param item
       */
      downloadTest: function (index, item, isRandom) {
        item = item || {}
        var document;
        if (isRandom) {
          document = App.currentRemoteItem || {}
        }
        else {
          document = item.Method = item.Method || {}
        }
        var random = isRandom ? item.Random : null
        var testRecord = item.TestRecord = item.TestRecord || {}

        saveTextAs(
          '# APIJSON自动化回归测试-前\n主页: https://github.com/TommyLemon/APIJSON'
          + '\n\n接口名称: \n' + document.method
          + '\n返回结果: \n' + JSON.stringify(JSON.parse(testRecord.response || '{}'), null, '    ')
          , '测试：' + document.method + '-前.txt'
        )

        /**
         * 浏览器不允许连续下载，saveTextAs也没有回调。
         * 在第一个文本里加上第二个文本的信息？
         * beyond compare会把第一个文件的后面一段与第二个文件匹配，
         * 导致必须先删除第一个文件内的后面与第二个文件重复的一段，再重新对比。
         */
        setTimeout(function () {
          var tests = App.tests[String(App.currentAccountIndex)] || {}
          saveTextAs(
            '# APIJSON自动化回归测试-后\n主页: https://github.com/TommyLemon/APIJSON'
            + '\n\n接口名称: \n' + document.method
            + '\n返回结果: \n' + JSON.stringify(tests[document.id][isRandom ? random.id : 0] || {}, null, '    ')
            , '测试：' + document.method + '-后.txt'
          )


          if (StringUtil.isEmpty(testRecord.standard, true) == false) {
            setTimeout(function () {
              saveTextAs(
                '# APIJSON自动化回归测试-标准\n主页: https://github.com/TommyLemon/APIJSON'
                + '\n\n接口名称: \n' + document.method
                + '\n测试结果: \n' + JSON.stringify(testRecord.compare || '{}', null, '    ')
                + '\n测试标准: \n' + JSON.stringify(JSON.parse(testRecord.standard || '{}'), null, '    ')
                , '测试：' + document.method + '-标准.txt'
              )
            }, 5000)
          }

        }, 5000)

      },

      /**
       * @param index
       * @param item
       */
      handleTest: function (right, index, item, isRandom) {
        item = item || {}
        var random = item.Random = item.Random || {}
        var document;
        if (isRandom) {
          if ((random.count || 0) > 1) {
            this.restoreRandom(item)
            this.randomSubs = (item.subs || item['[]']) || []
            this.isRandomSubListShow = true
            return
          }

          document = this.currentRemoteItem || {}
        }
        else {
          document = item.Method = item.Method || {}
        }
        var testRecord = item.TestRecord = item.TestRecord || {}

        var tests = this.tests[String(this.currentAccountIndex)] || {}
        var currentResponse = (tests[isRandom ? random.documentId : document.id] || {})[
          isRandom ? (random.id > 0 ? random.id : (random.toId + '' + random.id)) : 0
        ] || {}

        const list = isRandom ? (random.toId == null || random.toId <= 0 ? this.randoms : this.randomSubs) : this.testCases

        var isBefore = item.showType == 'before'
        if (right != true) {
          item.showType = isBefore ? 'after' : 'before'
          Vue.set(list, index, item);

          var res = isBefore ? JSON.stringify(currentResponse) : testRecord.response

          this.view = 'code'
          this.jsoncon = res || ''
        }
        else {
          var url

          if (isBefore) { //撤回原来错误提交的校验标准
            url = this.server + '/delete'
            const req = {
              TestRecord: {
                id: testRecord.id, //TODO 权限问题？ item.userId,
              },
              tag: 'TestRecord'
            }

            this.request(true, REQUEST_TYPE_JSON, url, req, {}, function (url, res, err) {
              App.onResponse(url, res, err)

              var data = res.data || {}
              if (data.code != CODE_SUCCESS && testRecord!= null && testRecord.id != null) {
                alert('撤回最新的校验标准 异常：\n' + data.msg)
                return
              }

              if (isRandom) {
                App.updateToRandomSummary(item, -1)
              }
              item.compareType = JSONResponse.COMPARE_NO_STANDARD
              item.compareMessage = '查看结果'
              item.compareColor = 'white'
              item.hintMessage = '没有校验标准！'
              item.TestRecord = null

              App.updateTestRecord(0, list, index, item, currentResponse, isRandom)
            })
          }
          else { //上传新的校验标准
            // if (isRandom && random.id <= 0) {
            //   alert('请先上传这个配置！')
            //   App.currentRandomItem = random
            //   App.showExport(true, false, true)
            //   return
            // }


            var standard = StringUtil.isEmpty(testRecord.standard, true) ? null : JSON.parse(testRecord.standard);
            var code = currentResponse.code;
            var thrw = currentResponse.throw;
            delete currentResponse.code; //code必须一致
            delete currentResponse.throw; //throw必须一致

            var rsp = JSON.parse(JSON.stringify(currentResponse || {}))
            rsp.methodArgs = JSONResponse.array2object(rsp.methodArgs, 'methodArgs', ['methodArgs'], true)

            var isML = this.isMLEnabled;
            var stddObj = isML ? JSONResponse.updateStandard(standard || {}, rsp, ['call()[]']) : {};
            stddObj.code = code;
            currentResponse.code = code;
            stddObj.throw = thrw;
            currentResponse.throw = thrw;

            const isNewRandom = isRandom && random.id <= 0

            //TODO 先检查是否有重复名称的！让用户确认！
            // if (isML != true) {
            url = this.server + '/post'
            const req = {
              Random: isNewRandom != true ? null : {
                toId: random.toId,
                userId: App.User.id,
                documentId: random.documentId,
                name: random.name,
                count: random.count,
                config: random.config
              },
              TestRecord: {
                userId: App.User.id, //TODO 权限问题？ item.userId,
                documentId: isNewRandom ? null : (isRandom ? random.documentId : document.id),
                randomId: isRandom && ! isNewRandom ? random.id : null,
                'randomId@': isNewRandom ? '/Random/id' : null,
                compare: JSON.stringify(testRecord.compare || {}),
                response: JSON.stringify(currentResponse || {}),
                standard: isML ? JSON.stringify(stddObj) : null
              },
              tag: isNewRandom ? 'Random' : 'TestRecord'
            }
            // }
            // else {
            //   url = App.server + '/post/testrecord/ml'
            //   req = {
            //     documentId: document.id
            //   }
            // }

            this.request(true, REQUEST_TYPE_JSON, url, req, {}, function (url, res, err) {
              App.onResponse(url, res, err)

              var data = res.data || {}
              if (data.code != CODE_SUCCESS) {
                if (isML) {
                  alert('机器学习更新标准 异常：\n' + data.msg)
                }
              }
              else {
                if (isRandom) {
                  App.updateToRandomSummary(item, -1)
                }

                item.compareType = JSONResponse.COMPARE_EQUAL
                item.compareMessage = '查看结果'
                item.compareColor = 'white'
                item.hintMessage = '结果正确'
                var testRecord = item.TestRecord || {}
                testRecord.compare = {
                  code: 0,
                  msg: '结果正确'
                }
                testRecord.response = JSON.stringify(currentResponse)
                // testRecord.standard = stdd

                if (isRandom) {
                  var r = req == null ? null : req.Random
                  if (r != null && (data.Random || {}).id != null) {
                    r.id = data.Random.id
                    item.Random = r
                  }
                  if ((data.TestRecord || {}).id != null) {
                    testRecord.id = data.TestRecord.id
                    if (r != null) {
                      testRecord.randomId = r.id
                    }
                  }
                }
                item.TestRecord = testRecord


                //
                // if (! isNewRandom) {
                //   if (isRandom) {
                //     App.showRandomList(true, App.currentRemoteItem)
                //   }
                //   else {
                //     App.showTestCase(true, false)
                //   }
                // }

                App.updateTestRecord(0, list, index, item, currentResponse, isRandom)
              }

            })

          }
        }
      },

      updateTestRecord: function (allCount, list, index, item, response, isRandom) {
        item = item || {}
        var doc = (isRandom ? item.Random : item.Method) || {}

        this.request(true, REQUEST_TYPE_JSON, this.server + '/get', {
          TestRecord: {
            documentId: isRandom ? doc.documentId : doc.id,
            randomId: isRandom ? doc.id : null,
            '@order': 'date-',
            '@column': 'id,userId,documentId,randomId,response' + (App.isMLEnabled ? ',standard' : ''),
            '@having': App.isMLEnabled ? 'json_length(standard)>0' : null
          }
        }, {}, function (url, res, err) {
          App.onResponse(url, res, err)

          var data = (res || {}).data || {}
          if (data.code != CODE_SUCCESS) {
            alert('获取最新的校验标准 异常：\n' + data.msg)
            return
          }

          item.TestRecord = data.TestRecord
          App.compareResponse(allCount, list, index, item, response, isRandom, App.currentAccountIndex, true, err);
        })
      },

      //显示详细信息, :data-hint :data, :hint 都报错，只能这样
      setRequestHint(index, item, isRandom, isClass) {
        item = item || {}
        var d = item == null ? null : (isRandom ? item.Random : item.Method);
        // this.$refs[isRandom ? 'randomTexts' : (isClass ? 'testCaseClassTexts' : 'testCaseMethodTexts')][index]
        //   .setAttribute('data-hint', r == null ? '' : (isRandom ? r : JSON.stringify(this.getRequest(isClass ? r.classArgs : r.methodArgs), null, ' ')));

        if (isRandom) {
          var toId = (d == null ? null : d.toId) || 0
          this.$refs[toId <= 0 ? 'randomTexts' : 'randomSubTexts'][index].setAttribute('data-hint', (d || {}).config == null ? '' : d.config);
        }
        else {
          var args = (this.getRequest(d.request) || [])[isClass ? 'classArgs' : 'methodArgs']

          var s = '('
          if (args != null) {
            for (var i in args) {
              var val = (args[i] || {}).value
              s += (i <= 0 ? '' : ', ') + (val == null ? 'null' : JSON.stringify(val, null, ' '))
            }
          }
          s += ')'
          this.$refs[isClass ? 'testCaseClassTexts' : 'testCaseMethodTexts'][index].setAttribute('data-hint', s);
        }
      },

      //显示详细信息, :data-hint :data, :hint 都报错，只能这样
      setTestHint(index, item, isRandom) {
        item = item || {};
        var toId = isRandom ? ((item.Random || {}).toId || 0) : 0;
        var h = item.hintMessage;
        this.$refs[isRandom ? (toId <= 0 ? 'testRandomResultButtons' : 'testRandomSubResultButtons') : 'testResultButtons'][index].setAttribute('data-hint', h || '');
      },

// APIJSON >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

    },
    watch: {
      jsoncon: function () {
        App.showJsonView()
      }
    },
    computed: {
      theme: function () {
        var th = this.themes[this.checkedTheme]
        var result = {}
        var index = 0;
        ['key', 'String', 'Number', 'Boolean', 'Null', 'link-link'].forEach(function(key) {
          result[key] = th[index]
          index++
        })
        return result
      }
    },
    created () {
      try { //可能URL_BASE是const类型，不允许改，这里是初始化，不能出错
        var url = this.getCache('', 'URL_BASE')
        if (StringUtil.isEmpty(url, true) == false) {
          URL_BASE = url
        }
        var branch = this.getCache('', 'branch')
        if (StringUtil.isEmpty(branch, true) == false) {
          this.branch = branch
        }
        var database = this.getCache('', 'database')
        if (StringUtil.isEmpty(database, true) == false) {
          this.database = database
        }
        var schema = this.getCache('', 'schema')
        if (StringUtil.isEmpty(schema, true) == false) {
          this.schema = schema
        }
        var language = this.getCache('', 'language')
        if (StringUtil.isEmpty(language, true) == false) {
          this.language = language
        }
        var types = this.getCache('', 'types')
        if (types != null && types.length > 0) {
          this.types = types
        }
        var server = this.getCache('', 'server')
        if (StringUtil.isEmpty(server, true) == false) {
          this.server = server
        }
        var project = this.getCache('', 'project')
        if (StringUtil.isEmpty(project, true) == false) {
          this.project = project
        }

        this.locals = this.getCache('', 'locals') || []

        this.isDelegateEnabled = this.getCache('', 'isDelegateEnabled') || this.isDelegateEnabled
        this.isHeaderShow = this.getCache('', 'isHeaderShow') || this.isHeaderShow
        this.isRandomShow = this.getCache('', 'isRandomShow') || this.isRandomShow
      } catch (e) {
        console.log('created  try { ' +
          '\nvar url = this.getCache(, url) ...' +
          '\n} catch (e) {\n' + e.message)
      }
      try { //这里是初始化，不能出错
        var accounts = this.getCache(URL_BASE, 'accounts')
        if (accounts != null) {
          this.accounts = accounts
          this.currentAccountIndex = this.getCache(URL_BASE, 'currentAccountIndex')
        }
      } catch (e) {
        console.log('created  try { ' +
          '\nvar accounts = this.getCache(URL_BASE, accounts)' +
          '\n} catch (e) {\n' + e.message)
      }

      try { //可能URL_BASE是const类型，不允许改，这里是初始化，不能出错
        this.User = this.getCache(this.server, 'User') || {}
        this.isCrossEnabled = this.getCache(this.server, 'isCrossEnabled') || this.isCrossEnabled
        this.isMLEnabled = this.getCache(this.server, 'isMLEnabled') || this.isMLEnabled
        this.crossProcess = this.isCrossEnabled ? '交叉账号:已开启' : '交叉账号:已关闭'
        this.testProcess = this.isMLEnabled ? '机器学习:已开启' : '机器学习:已关闭'
      } catch (e) {
        console.log('created  try { ' +
          '\nthis.User = this.getCache(this.server, User) || {}' +
          '\n} catch (e) {\n' + e.message)
      }


      //无效，只能在index里设置 vUrl.value = this.getCache('', 'URL_BASE')
      this.listHistory()
      this.transfer()
    }
  })
})()
