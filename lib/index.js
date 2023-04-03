'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.Targets = exports.createTarget = undefined;

var _fsExtra = require('fs-extra');

var _path = require('path');

var _webpack = require('webpack');

var _webpackSources = require('webpack-sources');

var _globby = require('globby');

var _globby2 = _interopRequireDefault(_globby);

var _lodash = require('lodash');

var _MultiEntryPlugin = require('webpack/lib/MultiEntryPlugin');

var _MultiEntryPlugin2 = _interopRequireDefault(_MultiEntryPlugin);

var _SingleEntryPlugin = require('webpack/lib/SingleEntryPlugin');

var _SingleEntryPlugin2 = _interopRequireDefault(_SingleEntryPlugin);

var _FunctionModulePlugin = require('webpack/lib/FunctionModulePlugin');

var _FunctionModulePlugin2 = _interopRequireDefault(_FunctionModulePlugin);

var _NodeSourcePlugin = require('webpack/lib/node/NodeSourcePlugin');

var _NodeSourcePlugin2 = _interopRequireDefault(_NodeSourcePlugin);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i]; return arr2; } else { return Array.from(arr); } }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const CommonsChunkPlugin = _webpack.optimize.CommonsChunkPlugin;

let COMPILE_TYPE = 'miniprogram';

const deprecated = function deprecated(obj, key, adapter, explain) {
	if (deprecated.warned.has(key)) {
		return;
	}
	const val = obj[key];
	if (typeof val === 'undefined') {
		return;
	}
	deprecated.warned.add(key);
	adapter(val);
	console.warn('[WXAppPlugin]', explain);
};
deprecated.warned = new Set();

const WX_NPM = 'miniprogram_npm';

const stripExt = path => {
	var _parse = (0, _path.parse)(path);

	const dir = _parse.dir,
	      name = _parse.name;

	return (0, _path.join)(dir, name);
};

const createTarget = exports.createTarget = function createTarget(name) {
	const miniProgramTarget = compiler => {
		const options = compiler.options;

		compiler.apply(new _webpack.JsonpTemplatePlugin(options.output), new _FunctionModulePlugin2.default(options.output), new _NodeSourcePlugin2.default(options.node), new _webpack.LoaderTargetPlugin('web'));
	};

	// eslint-disable-next-line no-new-func
	const creater = new Function(`var t = arguments[0]; return function ${name}(c) { return t(c); }`);
	return creater(miniProgramTarget);
};

const Targets = exports.Targets = {
	Wechat: createTarget('Wechat'),
	Alipay: createTarget('Alipay'),
	Baidu: createTarget('Baidu')
};

class WXAppPlugin {
	constructor() {
		let options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

		this.try = handler => (() => {
			var _ref = _asyncToGenerator(function* (arg, callback) {
				try {
					yield handler(arg);
					callback();
				} catch (err) {
					callback(err);
				}
			});

			return function (_x2, _x3) {
				return _ref.apply(this, arguments);
			};
		})();

		this.options = (0, _lodash.defaults)(options || {}, {
			clear: true,
			include: [],
			exclude: [],
			dot: false, // Include `.dot` files
			extensions: ['.js'],
			commonModuleName: 'common.js',
			enforceTarget: true,
			assetsChunkName: '__assets_chunk_name__'
			// base: undefined,
		});

		deprecated(this.options, 'scriptExt', val => this.options.extensions.unshift(val), 'Option `scriptExt` is deprecated. Please use `extensions` instead');

		deprecated(this.options, 'forceTarge', val => this.options.enforceTarget = val, 'Option `forceTarge` is deprecated. Please use `enforceTarget` instead');

		this.options.extensions = (0, _lodash.uniq)([].concat(_toConsumableArray(this.options.extensions), ['.js']));
		this.options.include = [].concat(this.options.include);
		this.options.exclude = [].concat(this.options.exclude);
	}

	apply(compiler) {
		var _this = this;

		const clear = this.options.clear;

		let isFirst = true;

		this.enforceTarget(compiler);

		compiler.plugin('run', this.try((() => {
			var _ref2 = _asyncToGenerator(function* (compiler) {
				yield _this.run(compiler);
			});

			return function (_x4) {
				return _ref2.apply(this, arguments);
			};
		})()));

		compiler.plugin('watch-run', this.try((() => {
			var _ref3 = _asyncToGenerator(function* (compiler) {
				yield _this.run(compiler.compiler);
			});

			return function (_x5) {
				return _ref3.apply(this, arguments);
			};
		})()));

		compiler.plugin('emit', this.try((() => {
			var _ref4 = _asyncToGenerator(function* (compilation) {
				if (clear && isFirst) {
					isFirst = false;
					yield _this.clear(compilation);
				}

				yield _this.toEmitTabBarIcons(compilation);
			});

			return function (_x6) {
				return _ref4.apply(this, arguments);
			};
		})()));

		compiler.plugin('after-emit', this.try((() => {
			var _ref5 = _asyncToGenerator(function* (compilation) {
				yield _this.toAddTabBarIconsDependencies(compilation);
			});

			return function (_x7) {
				return _ref5.apply(this, arguments);
			};
		})()));
	}

	enforceTarget(compiler) {
		const enforceTarget = this.options.enforceTarget;
		const options = compiler.options;


		if (enforceTarget) {
			const target = options.target;

			if (target !== Targets.Wechat && target !== Targets.Alipay) {
				options.target = Targets.Wechat;
			}
			if (!options.node || options.node.global) {
				options.node = options.node || {};
				options.node.global = false;
			}
		}
	}

	getBase(compiler) {
		var _options = this.options;
		const base = _options.base,
		      extensions = _options.extensions;

		if (base) {
			return (0, _path.resolve)(base);
		}

		const compilerOptions = compiler.options;
		const context = compilerOptions.context,
		      entry = compilerOptions.entry;


		const getEntryFromCompiler = () => {
			if (typeof entry === 'string') {
				return entry;
			}

			const extRegExpStr = extensions.map(ext => ext.replace(/\./, '\\.')).map(ext => `(${ext})`).join('|');

			const appJSRegExp = new RegExp(`\\bapp(${extRegExpStr})?$`);
			const findAppJS = arr => arr.find(path => appJSRegExp.test(path));

			if (Array.isArray(entry)) {
				return findAppJS(entry);
			}
			if (typeof entry === 'object') {
				for (const key in entry) {
					if (!entry.hasOwnProperty(key)) {
						continue;
					}

					const val = entry[key];
					if (typeof val === 'string') {
						return val;
					}
					if (Array.isArray(val)) {
						return findAppJS(val);
					}
				}
			}
		};

		const entryFromCompiler = getEntryFromCompiler();

		if (entryFromCompiler) {
			return (0, _path.dirname)(entryFromCompiler);
		}

		return context;
	}

	getTabBarIcons(tabBar) {
		var _this2 = this;

		return _asyncToGenerator(function* () {
			const tabBarIcons = new Set();
			const tabBarList = tabBar.list || [];
			for (const tabBarItem of tabBarList) {
				if (tabBarItem.iconPath) {
					tabBarIcons.add(tabBarItem.iconPath);
				}
				if (tabBarItem.selectedIconPath) {
					tabBarIcons.add(tabBarItem.selectedIconPath);
				}
			}

			_this2.tabBarIcons = tabBarIcons;
		})();
	}

	toEmitTabBarIcons(compilation) {
		var _this3 = this;

		return _asyncToGenerator(function* () {
			const emitIcons = [];
			_this3.tabBarIcons.forEach(function (iconPath) {
				const iconSrc = (0, _path.resolve)(_this3.base, iconPath);
				const toEmitIcon = (() => {
					var _ref6 = _asyncToGenerator(function* () {
						const iconStat = yield (0, _fsExtra.stat)(iconSrc);
						const iconSource = yield (0, _fsExtra.readFile)(iconSrc);
						compilation.assets[iconPath] = {
							size: function () {
								return iconStat.size;
							},
							source: function () {
								return iconSource;
							}
						};
					});

					return function toEmitIcon() {
						return _ref6.apply(this, arguments);
					};
				})();
				emitIcons.push(toEmitIcon());
			});
			yield Promise.all(emitIcons);
		})();
	}

	toAddTabBarIconsDependencies(compilation) {
		const fileDependencies = compilation.fileDependencies;

		this.tabBarIcons.forEach(iconPath => {
			if (!~fileDependencies.indexOf(iconPath)) {
				fileDependencies.push(iconPath);
			}
		});
	}

	getEntryResource() {
		var _this4 = this;

		return _asyncToGenerator(function* () {
			var _resources;

			const appJSONFile = (0, _path.resolve)(_this4.base, 'app.json');
			const projectJSONFile = (0, _path.resolve)(_this4.base, '..', 'project.config.json');

			var _ref7 = yield (0, _fsExtra.readJson)(appJSONFile),
			    _ref7$pages = _ref7.pages;

			const pages = _ref7$pages === undefined ? [] : _ref7$pages;
			var _ref7$subPackages = _ref7.subPackages;
			const subPackages = _ref7$subPackages === undefined ? [] : _ref7$subPackages;
			var _ref7$tabBar = _ref7.tabBar;
			const tabBar = _ref7$tabBar === undefined ? {} : _ref7$tabBar;
			var _ref7$usingComponents = _ref7.usingComponents;
			const usingComponents = _ref7$usingComponents === undefined ? {} : _ref7$usingComponents;

			var _ref8 = yield (0, _fsExtra.readJson)(projectJSONFile);

			const compileType = _ref8.compileType;

			COMPILE_TYPE = compileType;

			const components = new Set();

			// 新特性 app.json 全局引用自定义组件
			for (const relativeComponent of (0, _lodash.values)(usingComponents)) {
				if (relativeComponent.indexOf('plugin://') === 0) continue;
				const path = yield _this4.getComponentPath(relativeComponent);
				!path && console.warn(`[${relativeComponent}] 路径不存在`);
				const component = (0, _path.relative)(_this4.base, path);
				if (components.has(component)) continue;
				components.add(component);
				yield _this4.getComponents(components, path);
			}

			for (const page of pages) {
				yield _this4.getComponents(components, (0, _path.resolve)(_this4.base, page));
			}

			for (const subPackage of subPackages) {
				const root = subPackage.root;
				var _subPackage$pages = subPackage.pages;
				const pages = _subPackage$pages === undefined ? [] : _subPackage$pages;


				yield Promise.all(pages.map((() => {
					var _ref9 = _asyncToGenerator(function* (page) {
						return _this4.getComponents(components, (0, _path.resolve)(_this4.base, (0, _path.join)(root, page)));
					});

					return function (_x8) {
						return _ref9.apply(this, arguments);
					};
				})()));
			}

			_this4.getTabBarIcons(tabBar);

			let resources = ['app'];
			if (COMPILE_TYPE === 'plugin') {
				resources.push('index');
			}
			resources = (_resources = resources).concat.apply(_resources, _toConsumableArray(pages).concat(_toConsumableArray(subPackages.map(function (v) {
				return v.pages.map(function (w) {
					return (0, _path.join)(v.root, w);
				});
			})), _toConsumableArray(components)));

			return resources;
		})();
	}

	getComponents(components, instance) {
		var _this5 = this;

		return _asyncToGenerator(function* () {
			var _ref10 = (yield (0, _fsExtra.readJson)(`${instance}.json`).catch(function (err) {
				return err && err.code !== 'ENOENT' && console.error(err);
			})) || {},
			    _ref10$usingComponent = _ref10.usingComponents;

			const usingComponents = _ref10$usingComponent === undefined ? {} : _ref10$usingComponent;

			const componentBase = (0, _path.parse)(instance).dir;
			for (const relativeComponent of (0, _lodash.values)(usingComponents)) {
				if (relativeComponent.indexOf('plugin://') === 0) continue;
				const path = yield _this5.getComponentPath(relativeComponent, [componentBase]);
				!path && console.warn(`[${relativeComponent}] 路径不存在`);
				const component = (0, _path.relative)(_this5.base, path);
				if (components.has(component)) continue;
				components.add(component);
				yield _this5.getComponents(components, path);
			}
		})();
	}

	getFileType(path) {
		return _asyncToGenerator(function* () {
			if (!(0, _fsExtra.existsSync)(path)) return '';
			const fileState = yield (0, _fsExtra.stat)(path);
			if (fileState.isFile()) return 'file';
			if (fileState.isDirectory()) return 'dir';
			return 'unkown';
		})();
	}

	getComponentPath(path) {
		var _arguments = arguments,
		    _this6 = this;

		return _asyncToGenerator(function* () {
			let extra = _arguments.length > 1 && _arguments[1] !== undefined ? _arguments[1] : [];

			const roots = [].concat(_toConsumableArray(extra), [_this6.base, (0, _path.resolve)(_this6.base, WX_NPM)]);
			for (const root of roots) {
				let fullPath = (0, _path.resolve)(root, path);
				let type = yield _this6.getFileType(fullPath);
				if (type === 'file') {
					const file = (0, _path.parse)(fullPath);
					return (0, _path.resolve)(file.dir, file.name);
				} else if (type === 'dir' || type === '') {
					for (const ext of _this6.options.extensions.filter(function (v) {
						return !!v;
					})) {
						fullPath = type === 'dir' ? (0, _path.resolve)(fullPath, 'index' + ext) : fullPath + ext;
						type = yield _this6.getFileType(fullPath);
						if (type === 'file') {
							const file = (0, _path.parse)(fullPath);
							return (0, _path.resolve)(file.dir, file.name);
						}
					}
				}
			}
			return '';
		})();
	}

	getFullScriptPath(path) {
		const base = this.base,
		      extensions = this.options.extensions;

		for (const ext of extensions) {
			const fullPath = (0, _path.resolve)(base, path + ext);
			if ((0, _fsExtra.existsSync)(fullPath)) {
				return fullPath;
			}
		}
	}

	clear(compilation) {
		return _asyncToGenerator(function* () {
			const path = compilation.options.output.path;

			yield (0, _fsExtra.remove)(path);
		})();
	}

	addEntries(compiler, entries, chunkName) {
		compiler.apply(new _MultiEntryPlugin2.default(this.base, entries, chunkName));
	}

	compileAssets(compiler) {
		var _this7 = this;

		return _asyncToGenerator(function* () {
			var _options2 = _this7.options;
			const include = _options2.include,
			      exclude = _options2.exclude,
			      dot = _options2.dot,
			      assetsChunkName = _options2.assetsChunkName,
			      extensions = _options2.extensions,
			      entryResources = _this7.entryResources;


			compiler.plugin('compilation', function (compilation) {
				compilation.plugin('before-chunk-assets', function () {
					const assetsChunkIndex = compilation.chunks.findIndex(function (_ref11) {
						let name = _ref11.name;
						return name === assetsChunkName;
					});
					if (assetsChunkIndex > -1) {
						compilation.chunks.splice(assetsChunkIndex, 1);
					}
				});
			});

			const patterns = entryResources.map(function (resource) {
				return `${resource}.*`;
			}).concat(include);

			const entries = yield (0, _globby2.default)(patterns, {
				cwd: _this7.base,
				nodir: true,
				realpath: true,
				ignore: [].concat(_toConsumableArray(extensions.map(function (ext) {
					return `**/*${ext}`;
				})), _toConsumableArray(exclude)),
				dot
			});

			_this7.addEntries(compiler, entries, assetsChunkName);
		})();
	}

	getChunkResourceRegExp() {
		if (this._chunkResourceRegex) {
			return this._chunkResourceRegex;
		}

		const extensions = this.options.extensions;

		const exts = extensions.map(ext => ext.replace(/\./g, '\\.')).map(ext => `(${ext}$)`).join('|');
		return new RegExp(exts);
	}

	applyCommonsChunk(compiler) {
		const commonModuleName = this.options.commonModuleName,
		      entryResources = this.entryResources;


		const scripts = entryResources.map(this.getFullScriptPath.bind(this));

		compiler.apply(new CommonsChunkPlugin({
			name: stripExt(commonModuleName),
			minChunks: (_ref12) => {
				let resource = _ref12.resource;

				if (resource) {
					const regExp = this.getChunkResourceRegExp();
					return regExp.test(resource) && scripts.indexOf(resource) < 0;
				}
				return false;
			}
		}));
	}

	addScriptEntry(compiler, entry, name) {
		compiler.plugin('make', (compilation, callback) => {
			const dep = _SingleEntryPlugin2.default.createDependency(entry, name);
			compilation.addEntry(this.base, dep, name, callback);
		});
	}

	compileScripts(compiler) {
		this.applyCommonsChunk(compiler);
		this.entryResources.filter(resource => resource !== 'app').forEach(resource => {
			const fullPath = this.getFullScriptPath(resource);
			this.addScriptEntry(compiler, fullPath, resource);
		});
	}

	toModifyTemplate(compilation) {
		const commonModuleName = this.options.commonModuleName;
		const target = compilation.options.target;

		const commonChunkName = stripExt(commonModuleName);
		const globalVar = target.name === 'Alipay' ? 'my' : 'wx';

		// inject chunk entries
		compilation.chunkTemplate.plugin('render', (core, _ref13) => {
			let name = _ref13.name;

			if (this.entryResources.indexOf(name) >= 0) {
				const relativePath = (0, _path.relative)((0, _path.dirname)(name), `./${commonModuleName}`);
				const posixPath = relativePath.replace(/\\/g, '/');
				const source = core.source();

				// eslint-disable-next-line max-len
				let injectContent = `; function webpackJsonp() { require("./${posixPath}"); ${globalVar}.webpackJsonp.apply(null, arguments); }`;
				if (COMPILE_TYPE === 'plugin' && name === 'index') {
					injectContent = `; function webpackJsonp() { require("./${posixPath}"); module.exports = ${globalVar}.webpackJsonp.apply(null, arguments); }`;
				}

				if (source.indexOf(injectContent) < 0) {
					const concatSource = new _webpackSources.ConcatSource(core);
					concatSource.add(injectContent);
					return concatSource;
				}
			}
			return core;
		});

		// replace `window` to `global` in common chunk
		compilation.mainTemplate.plugin('bootstrap', (source, chunk) => {
			const windowRegExp = new RegExp('window', 'g');
			if (chunk.name === commonChunkName) {
				return source.replace(windowRegExp, globalVar);
			}
			return source;
		});

		// override `require.ensure()`
		compilation.mainTemplate.plugin('require-ensure', () => 'throw new Error("Not chunk loading available");');
	}

	run(compiler) {
		var _this8 = this;

		return _asyncToGenerator(function* () {
			_this8.base = _this8.getBase(compiler);
			_this8.entryResources = yield _this8.getEntryResource();
			compiler.plugin('compilation', _this8.toModifyTemplate.bind(_this8));
			_this8.compileScripts(compiler);
			yield _this8.compileAssets(compiler);
		})();
	}
}
exports.default = WXAppPlugin;
