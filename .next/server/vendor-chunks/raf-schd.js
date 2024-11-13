"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "vendor-chunks/raf-schd";
exports.ids = ["vendor-chunks/raf-schd"];
exports.modules = {

/***/ "(ssr)/./node_modules/raf-schd/dist/raf-schd.esm.js":
/*!****************************************************!*\
  !*** ./node_modules/raf-schd/dist/raf-schd.esm.js ***!
  \****************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (__WEBPACK_DEFAULT_EXPORT__)\n/* harmony export */ });\nvar rafSchd = function rafSchd(fn) {\n  var lastArgs = [];\n  var frameId = null;\n\n  var wrapperFn = function wrapperFn() {\n    for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {\n      args[_key] = arguments[_key];\n    }\n\n    lastArgs = args;\n\n    if (frameId) {\n      return;\n    }\n\n    frameId = requestAnimationFrame(function () {\n      frameId = null;\n      fn.apply(void 0, lastArgs);\n    });\n  };\n\n  wrapperFn.cancel = function () {\n    if (!frameId) {\n      return;\n    }\n\n    cancelAnimationFrame(frameId);\n    frameId = null;\n  };\n\n  return wrapperFn;\n};\n\n/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (rafSchd);\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHNzcikvLi9ub2RlX21vZHVsZXMvcmFmLXNjaGQvZGlzdC9yYWYtc2NoZC5lc20uanMiLCJtYXBwaW5ncyI6Ijs7OztBQUFBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBLHdFQUF3RSxhQUFhO0FBQ3JGO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7QUFDTDs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQSxpRUFBZSxPQUFPLEVBQUMiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9uZXh0anMvLi9ub2RlX21vZHVsZXMvcmFmLXNjaGQvZGlzdC9yYWYtc2NoZC5lc20uanM/MWU4YiJdLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgcmFmU2NoZCA9IGZ1bmN0aW9uIHJhZlNjaGQoZm4pIHtcbiAgdmFyIGxhc3RBcmdzID0gW107XG4gIHZhciBmcmFtZUlkID0gbnVsbDtcblxuICB2YXIgd3JhcHBlckZuID0gZnVuY3Rpb24gd3JhcHBlckZuKCkge1xuICAgIGZvciAodmFyIF9sZW4gPSBhcmd1bWVudHMubGVuZ3RoLCBhcmdzID0gbmV3IEFycmF5KF9sZW4pLCBfa2V5ID0gMDsgX2tleSA8IF9sZW47IF9rZXkrKykge1xuICAgICAgYXJnc1tfa2V5XSA9IGFyZ3VtZW50c1tfa2V5XTtcbiAgICB9XG5cbiAgICBsYXN0QXJncyA9IGFyZ3M7XG5cbiAgICBpZiAoZnJhbWVJZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGZyYW1lSWQgPSByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoZnVuY3Rpb24gKCkge1xuICAgICAgZnJhbWVJZCA9IG51bGw7XG4gICAgICBmbi5hcHBseSh2b2lkIDAsIGxhc3RBcmdzKTtcbiAgICB9KTtcbiAgfTtcblxuICB3cmFwcGVyRm4uY2FuY2VsID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICghZnJhbWVJZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNhbmNlbEFuaW1hdGlvbkZyYW1lKGZyYW1lSWQpO1xuICAgIGZyYW1lSWQgPSBudWxsO1xuICB9O1xuXG4gIHJldHVybiB3cmFwcGVyRm47XG59O1xuXG5leHBvcnQgZGVmYXVsdCByYWZTY2hkO1xuIl0sIm5hbWVzIjpbXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(ssr)/./node_modules/raf-schd/dist/raf-schd.esm.js\n");

/***/ })

};
;